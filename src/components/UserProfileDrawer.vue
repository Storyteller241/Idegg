<template>
  <t-drawer
    v-model:visible="visible"
    :footer="false"
    :size="420"
    class="profile-drawer"
    @close="handleClose"
  >
    <template #header>
      <div class="drawer-header">
        <span class="header-title">个人中心</span>
      </div>
    </template>

    <div class="drawer-content">
      <!-- 头像区域 -->
      <div class="avatar-section">
        <div class="avatar-wrapper">
          <t-upload
            v-model="avatarFile"
            :action="uploadAction"
            :headers="uploadHeaders"
            :before-upload="beforeAvatarUpload"
            :on-success="handleAvatarSuccess"
            :on-fail="handleAvatarFail"
            :show-image="false"
            :auto-upload="true"
            theme="custom"
            accept="image/*"
            name="avatar"
          >
            <div class="avatar-display">
              <img v-if="profile.avatar" :src="avatarUrl" alt="avatar" />
              <div v-else class="avatar-placeholder">
                {{ profile.username ? profile.username.charAt(0).toUpperCase() : 'U' }}
              </div>
              <div class="avatar-overlay">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                <span>点击更换</span>
              </div>
            </div>
          </t-upload>
          <div class="avatar-tip">支持 JPG、PNG 格式，最大 5MB</div>
        </div>
      </div>

      <!-- 基础信息 -->
      <div class="section">
        <h3 class="section-title">基础信息</h3>
        <div class="form-item">
          <label>用户名</label>
          <t-input
            v-model="form.username"
            placeholder="请输入用户名"
            size="large"
            clearable
          />
        </div>
      </div>

      <!-- 修改密码 -->
      <div class="section">
        <h3 class="section-title">
          修改密码
          <t-switch v-model="showPasswordForm" size="small" />
        </h3>
        <transition name="fade-slide">
          <div v-show="showPasswordForm" class="password-form">
            <div class="form-item">
              <label>当前密码</label>
              <t-input
                v-model="form.currentPassword"
                type="password"
                placeholder="请输入当前密码"
                size="large"
              />
            </div>
            <div class="form-item">
              <label>新密码</label>
              <t-input
                v-model="form.newPassword"
                type="password"
                placeholder="请输入新密码（至少6位）"
                size="large"
              />
            </div>
            <div class="form-item">
              <label>确认新密码</label>
              <t-input
                v-model="form.confirmPassword"
                type="password"
                placeholder="请再次输入新密码"
                size="large"
              />
            </div>
          </div>
        </transition>
      </div>

      <!-- 核心画像 -->
      <div class="section">
        <h3 class="section-title">核心画像</h3>
        <t-alert theme="info" message="完善资料将提升 AI 分析的精准度" class="profile-tip" />

        <div class="form-item">
          <label>技术栈</label>
          <t-tag-input
            v-model="form.skills"
            placeholder="输入技术栈，如 Vue 3, Golang, Three.js"
            size="large"
            clearable
            :max="10"
          />
        </div>

        <div class="form-item">
          <label>个人能力描述</label>
          <t-textarea
            v-model="form.bio"
            placeholder="描述你擅长的领域..."
            :autosize="{ minRows: 4, maxRows: 8 }"
          />
        </div>
      </div>

      <!-- 底部操作区 -->
      <div class="drawer-footer">
        <t-button
          theme="default"
          variant="outline"
          size="large"
          class="logout-btn"
          @click="handleLogout"
        >
          退出登录
        </t-button>
        <t-button
          theme="primary"
          size="large"
          :loading="isSaving"
          @click="handleSave"
        >
          保存修改
        </t-button>
      </div>
    </div>
  </t-drawer>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted, computed } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import { useUserStore } from '../stores/user'
import { getUserProfile, updateUserProfile, type UserProfile } from '../api/userProfileApi'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'logout': []
}>()

const userStore = useUserStore()

// 本地 visible 状态
const visible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

// 用户资料
const profile = ref<UserProfile>({
  id: 0,
  username: '',
  avatar: null,
  skills: [],
  bio: null,
  created_at: '',
  updated_at: ''
})

// 表单数据
const form = reactive({
  username: '',
  avatar: '',
  skills: [] as string[],
  bio: '',
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// 是否显示密码表单
const showPasswordForm = ref(false)
const isSaving = ref(false)
const isLoading = ref(false)

// 头像上传相关
const avatarFile = ref([])
const API_BASE_URL = 'http://101.133.231.222:3000'

// 上传配置
const uploadAction = computed(() => `${API_BASE_URL}/api/user/upload-avatar`)
const uploadHeaders = computed(() => ({
  'Authorization': `Bearer ${userStore.token}`
}))

// 头像完整 URL
const avatarUrl = computed(() => {
  if (!profile.value.avatar) return ''
  if (profile.value.avatar.startsWith('http')) return profile.value.avatar
  return `${API_BASE_URL}${profile.value.avatar}`
})

// 上传前校验
const beforeAvatarUpload = (file: File) => {
  const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png'
  if (!isJpgOrPng) {
    MessagePlugin.error('只支持 JPG 或 PNG 格式的图片')
    return false
  }
  const isLt5M = file.size / 1024 / 1024 < 5
  if (!isLt5M) {
    MessagePlugin.error('图片大小不能超过 5MB')
    return false
  }
  return true
}

// 上传成功
const handleAvatarSuccess = (context: { response: { status: string; avatarUrl: string; message?: string } }) => {
  const result = context.response
  if (result.status === 'success') {
    const newAvatarUrl = result.avatarUrl
    profile.value.avatar = newAvatarUrl
    form.avatar = newAvatarUrl
    
    // 更新 Pinia 中的用户信息
    if (userStore.user) {
      userStore.setUser({
        ...userStore.user,
        avatar: newAvatarUrl
      })
    }
    
    MessagePlugin.success('头像上传成功')
    avatarFile.value = []
  } else {
    MessagePlugin.error(result.message || '上传失败')
  }
}

// 上传失败
const handleAvatarFail = ({ e }: { e: { target: { response: string; responseText?: string } } }) => {
  console.error('上传失败:', e)
  let message = '上传失败'
  try {
    const error = JSON.parse(e.target.response)
    message = error.message || message
  } catch {
    message = e.target?.responseText || message
  }
  MessagePlugin.error(message)
  avatarFile.value = []
}

// 加载用户资料
const loadProfile = async () => {
  if (!userStore.token) return

  isLoading.value = true
  try {
    const data = await getUserProfile()
    profile.value = data

    // 同步到表单
    form.username = data.username
    form.avatar = data.avatar || ''
    form.skills = data.skills || []
    form.bio = data.bio || ''
  } catch (error: any) {
    MessagePlugin.error(error.message || '加载资料失败')
  } finally {
    isLoading.value = false
  }
}

// 保存资料
const handleSave = async () => {
  // 验证密码
  if (showPasswordForm.value) {
    if (form.newPassword || form.confirmPassword || form.currentPassword) {
      if (!form.currentPassword) {
        MessagePlugin.error('请输入当前密码')
        return
      }
      if (!form.newPassword) {
        MessagePlugin.error('请输入新密码')
        return
      }
      if (form.newPassword.length < 6) {
        MessagePlugin.error('新密码长度至少6个字符')
        return
      }
      if (form.newPassword !== form.confirmPassword) {
        MessagePlugin.error('两次输入的新密码不一致')
        return
      }
    }
  }

  // 验证用户名
  if (!form.username.trim()) {
    MessagePlugin.error('用户名不能为空')
    return
  }
  if (form.username.length < 3 || form.username.length > 50) {
    MessagePlugin.error('用户名长度应在3-50个字符之间')
    return
  }

  isSaving.value = true

  try {
    const updateData: Parameters<typeof updateUserProfile>[0] = {
      username: form.username.trim(),
      avatar: form.avatar || undefined,
      skills: form.skills,
      bio: form.bio || undefined
    }

    // 如果修改了密码
    if (showPasswordForm.value && form.newPassword) {
      updateData.currentPassword = form.currentPassword
      updateData.newPassword = form.newPassword
    }

    await updateUserProfile(updateData)

    // 更新 store 中的用户名
    if (userStore.user && form.username !== userStore.user.username) {
      userStore.setUser({ ...userStore.user, username: form.username.trim() })
    }

    MessagePlugin.success('资料保存成功')

    // 清空密码字段
    form.currentPassword = ''
    form.newPassword = ''
    form.confirmPassword = ''
    showPasswordForm.value = false

    // 刷新资料
    await loadProfile()
  } catch (error: any) {
    MessagePlugin.error(error.message || '保存失败')
  } finally {
    isSaving.value = false
  }
}

// 退出登录
const handleLogout = () => {
  userStore.logout()
  emit('logout')
  visible.value = false
  MessagePlugin.success('已退出登录')
}

// 关闭抽屉
const handleClose = () => {
  // 清空密码字段
  form.currentPassword = ''
  form.newPassword = ''
  form.confirmPassword = ''
  showPasswordForm.value = false
}

// 监听 visible 变化，打开时加载资料
watch(() => props.visible, (newVal) => {
  if (newVal) {
    loadProfile()
  }
})

onMounted(() => {
  if (props.visible) {
    loadProfile()
  }
})
</script>

<style lang="less" scoped>
.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-title {
  font-size: 20px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
}

.drawer-content {
  padding: 8px 4px;
}

// 头像区域
.avatar-section {
  display: flex;
  justify-content: center;
  margin-bottom: 32px;
}

.avatar-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.avatar-display {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
  background: linear-gradient(135deg, #00c8ff, #0096ff);
  box-shadow: 0 8px 24px rgba(0, 150, 255, 0.25);
  position: relative;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: all 0.3s ease;
  }

  &:hover {
    .avatar-overlay {
      opacity: 1;
    }

    img {
      filter: brightness(0.7);
    }
  }
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  font-weight: 600;
  color: #fff;
}

.avatar-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: rgba(0, 0, 0, 0.4);
  opacity: 0;
  transition: all 0.3s ease;

  svg {
    color: #fff;
  }

  span {
    font-size: 12px;
    color: #fff;
    font-weight: 500;
  }
}

.avatar-tip {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.4);
  text-align: center;
}

// 分区样式
.section {
  margin-bottom: 28px;
  padding-bottom: 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);

  &:last-of-type {
    border-bottom: none;
  }
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.75);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.profile-tip {
  color: #000;
  margin-bottom: 16px;
  background: rgba(0, 150, 255, 0.08);
  border-color: rgba(0, 150, 255, 0.2);
  :deep(.t-alert__description) {
    color: #0000007b !important;
}
}


// 表单项
.form-item {
  margin-bottom: 16px;
  :deep(.t-input__inner) {
    font-size: 14px;
    color: rgb(0, 0, 0);
  }

  &:last-child {
    margin-bottom: 0;
  }

  label {
    display: block;
    font-size: 14px;
    color: rgba(0, 0, 0, 0.6);
    margin-bottom: 8px;
  }
}

// 密码表单动画
.password-form {
  overflow: hidden;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
  max-height: 300px;
  opacity: 1;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  max-height: 0;
  opacity: 0;
}

// 底部操作区
.drawer-footer {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  gap: 12px;
}

.logout-btn {
  color: #ff4d4f;
  border-color: rgba(255, 77, 79, 0.3);

  &:hover {
    color: #ff7875;
    border-color: rgba(255, 77, 79, 0.5);
    background: rgba(255, 77, 79, 0.05);
  }
}
</style>

<style lang="less">
// 抽屉全局样式覆盖
.profile-drawer {
  .t-drawer__content {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }

  .t-drawer__header {
    background-color: #c0d9ff !important;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    padding: 20px 24px;
  }

  .t-drawer__body {
    background-color: #fff;
    padding: 24px;
  }

  .t-drawer__close-btn {
    color: rgba(0, 0, 0, 0.45);

    &:hover {
      color: rgba(0, 0, 0, 0.75);
      background: rgba(0, 0, 0, 0.05);
    }
  }
}
</style>
