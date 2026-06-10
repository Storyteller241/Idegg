<template>
  <t-dialog
    v-model:visible="visible"
    header="好友"
    :width="420"
    :close-on-overlay-click="true"
    :destroy-on-close="false"
    class="friend-dialog glass-dialog"
  >
    <div class="friend-container">
      <!-- 标签页切换 -->
      <div class="tab-header">
        <div
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-item"
          :class="{ active: currentTab === tab.key }"
          @click="currentTab = tab.key"
        >
          <span class="tab-label">{{ tab.label }}</span>
          <span v-if="tab.badge && tab.badge > 0" class="tab-badge">{{ tab.badge }}</span>
        </div>
      </div>

      <!-- 好友列表 -->
      <div v-show="currentTab === 'friends'" class="tab-content">
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
        </div>
        <div v-else-if="friends.length === 0" class="empty-state">
          <div class="empty-icon">👥</div>
          <div class="empty-text">还没有好友</div>
          <div class="empty-hint">去搜索添加好友吧</div>
        </div>
        <div v-else class="friend-list">
          <div v-for="friend in friends" :key="friend.id" class="friend-item">
            <div class="friend-avatar">
              <img v-if="friend.avatar" :src="friend.avatar" :alt="friend.username" />
              <div v-else class="avatar-placeholder">{{ friend.username.charAt(0).toUpperCase() }}</div>
            </div>
            <div class="friend-info">
              <div class="friend-name">{{ friend.username }}</div>
            </div>
            <t-button theme="default" variant="text" size="small" class="delete-btn" @click="handleDeleteFriend(friend.id)">
              删除
            </t-button>
          </div>
        </div>
      </div>

      <!-- 好友申请 -->
      <div v-show="currentTab === 'pending'" class="tab-content">
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
        </div>
        <div v-else-if="pendingRequests.length === 0" class="empty-state">
          <div class="empty-icon">📭</div>
          <div class="empty-text">暂无好友申请</div>
        </div>
        <div v-else class="request-list">
          <div v-for="request in pendingRequests" :key="request.id" class="request-item">
            <div class="friend-avatar">
              <img v-if="request.from_avatar" :src="request.from_avatar" :alt="request.from_username" />
              <div v-else class="avatar-placeholder">{{ request.from_username.charAt(0).toUpperCase() }}</div>
            </div>
            <div class="friend-info">
              <div class="friend-name">{{ request.from_username }}</div>
              <div class="request-time">{{ formatTime(request.created_at) }}</div>
            </div>
            <div class="request-actions">
              <t-button theme="primary" size="small" @click="handleAccept(request.id)">接受</t-button>
              <t-button theme="default" variant="outline" size="small" @click="handleReject(request.id)">拒绝</t-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 搜索用户 -->
      <div v-show="currentTab === 'search'" class="tab-content">
        <div class="search-box">
          <t-input
            v-model:value="searchKeyword"
            placeholder="搜索用户名..."
            size="large"
            clearable
            @enter="handleSearch"
          >
            <template #prefix-icon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="search-icon">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </template>
          </t-input>
          <t-button theme="primary" size="large" :loading="searching" @click="handleSearch">搜索</t-button>
        </div>

        <div v-if="searching" class="loading-state">
          <div class="spinner"></div>
        </div>
        <div v-else-if="searchResults.length === 0 && hasSearched" class="empty-state">
          <div class="empty-icon">🔍</div>
          <div class="empty-text">未找到用户</div>
        </div>
        <div v-else class="user-list">
          <div v-for="user in searchResults" :key="user.id" class="user-item">
            <div class="friend-avatar">
              <img v-if="user.avatar" :src="user.avatar" :alt="user.username" />
              <div v-else class="avatar-placeholder">{{ user.username.charAt(0).toUpperCase() }}</div>
            </div>
            <div class="friend-info">
              <div class="friend-name">{{ user.username }}</div>
            </div>
            <t-button theme="primary" size="small" :loading="applyingId === user.id" @click="handleApply(user.id)">
              添加
            </t-button>
          </div>
        </div>
      </div>
    </div>
  </t-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import { friendApi, type SearchUser, type FriendRequest, type Friend } from '../api/friendApi'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const visible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

// 标签页
const currentTab = ref<'friends' | 'pending' | 'search'>('friends')
const tabs = computed(() => [
  { key: 'friends' as const, label: '好友', badge: 0 },
  { key: 'pending' as const, label: '申请', badge: pendingRequests.value.length },
  { key: 'search' as const, label: '搜索', badge: 0 }
])

// 数据
const friends = ref<Friend[]>([])
const pendingRequests = ref<FriendRequest[]>([])
const loading = ref(false)

// 搜索
const searchKeyword = ref('')
const searchResults = ref<SearchUser[]>([])
const searching = ref(false)
const hasSearched = ref(false)
const applyingId = ref<number | null>(null)

// 加载好友列表
const loadFriends = async () => {
  loading.value = true
  try {
    const result = await friendApi.getFriends()
    friends.value = result.data
  } catch (error: any) {
    console.error('加载好友列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 加载待处理申请
const loadPendingRequests = async () => {
  loading.value = true
  try {
    const result = await friendApi.getPendingRequests()
    pendingRequests.value = result.data
  } catch (error: any) {
    console.error('加载好友申请失败:', error)
  } finally {
    loading.value = false
  }
}

// 搜索用户
const handleSearch = async () => {
  if (!searchKeyword.value.trim()) {
    MessagePlugin.warning('请输入搜索关键词')
    return
  }
  searching.value = true
  hasSearched.value = true
  try {
    const result = await friendApi.searchUsers(searchKeyword.value.trim())
    searchResults.value = result.data
  } catch (error: any) {
    MessagePlugin.error(error.message || '搜索失败')
  } finally {
    searching.value = false
  }
}

// 发送好友申请
const handleApply = async (userId: number) => {
  applyingId.value = userId
  try {
    await friendApi.applyFriend(userId)
    MessagePlugin.success('好友申请已发送')
    // 从搜索结果中移除
    searchResults.value = searchResults.value.filter(u => u.id !== userId)
  } catch (error: any) {
    MessagePlugin.error(error.message || '发送申请失败')
  } finally {
    applyingId.value = null
  }
}

// 接受申请
const handleAccept = async (requestId: number) => {
  try {
    await friendApi.handleRequest(requestId, 'accept')
    MessagePlugin.success('已接受好友申请')
    pendingRequests.value = pendingRequests.value.filter(r => r.id !== requestId)
    // 刷新好友列表
    loadFriends()
  } catch (error: any) {
    MessagePlugin.error(error.message || '操作失败')
  }
}

// 拒绝申请
const handleReject = async (requestId: number) => {
  try {
    await friendApi.handleRequest(requestId, 'reject')
    MessagePlugin.success('已拒绝好友申请')
    pendingRequests.value = pendingRequests.value.filter(r => r.id !== requestId)
  } catch (error: any) {
    MessagePlugin.error(error.message || '操作失败')
  }
}

// 删除好友
const handleDeleteFriend = async (friendId: number) => {
  try {
    await friendApi.deleteFriend(friendId)
    MessagePlugin.success('已删除好友')
    friends.value = friends.value.filter(f => f.id !== friendId)
  } catch (error: any) {
    MessagePlugin.error(error.message || '删除失败')
  }
}

// 格式化时间
const formatTime = (timeStr: string) => {
  const date = new Date(timeStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  return date.toLocaleDateString()
}

// 监听标签页切换
watch(currentTab, (tab) => {
  if (tab === 'friends') {
    loadFriends()
  } else if (tab === 'pending') {
    loadPendingRequests()
  }
})

// 监听弹窗显示
watch(() => props.visible, (show) => {
  if (show) {
    currentTab.value = 'friends'
    loadFriends()
    loadPendingRequests()
  }
})
</script>

<style lang="less" scoped>
.friend-container {
  min-height: 400px;
  max-height: 500px;
  display: flex;
  flex-direction: column;
}

// 标签页头部
.tab-header {
  display: flex;
  gap: 8px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  margin-bottom: 16px;
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: rgba(0, 0, 0, 0.03);

  &:hover {
    background: rgba(0, 0, 0, 0.06);
  }

  &.active {
    background: linear-gradient(135deg, rgba(0, 200, 255, 0.15), rgba(0, 150, 255, 0.1));
    border: 1px solid rgba(0, 200, 255, 0.3);
  }
}

.tab-label {
  font-size: 14px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.7);
}

.tab-badge {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background: #ff4d4f;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
}

// 标签页内容
.tab-content {
  flex: 1;
  overflow-y: auto;
}

// 加载状态
.loading-state {
  display: flex;
  justify-content: center;
  padding: 40px 0;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-top-color: #00c8ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

// 空状态
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  font-size: 16px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.6);
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.4);
}

// 好友列表
.friend-list, .request-list, .user-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.friend-item, .request-item, .user-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 12px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.05);
  }
}

// 头像
.friend-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: linear-gradient(135deg, #00c8ff, #0096ff);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}

// 好友信息
.friend-info {
  flex: 1;
  min-width: 0;
}

.friend-name {
  font-size: 15px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.85);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.request-time {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.4);
  margin-top: 2px;
}

// 操作按钮
.request-actions {
  display: flex;
  gap: 8px;
}

.delete-btn {
  color: rgba(0, 0, 0, 0.4) !important;

  &:hover {
    color: #ff4d4f !important;
  }
}

// 搜索框
.search-box {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;

  :deep(.t-input) {
    flex: 1;
    background: rgba(0, 0, 0, 0.03);
    border-color: rgba(0, 0, 0, 0.1);
    border-radius: 10px;

    &:hover, &.t-is-focused {
      background: rgba(0, 0, 0, 0.05);
      border-color: rgba(0, 200, 255, 0.5);
    }
  }

  :deep(.t-button) {
    border-radius: 10px;
  }
}

.search-icon {
  width: 18px;
  height: 18px;
  color: rgba(0, 0, 0, 0.4);
}
</style>
