<template>
    
  <div class="login-container" :class="{ 'login-success': isLoggingIn }">
    <!-- 纯白背景层 -->
    <div class="pure-bg"></div>

    <!-- 磨砂玻璃遮罩层（背景） -->
    <div class="glass-bg" :class="{ 'slide-down': isLoggingIn }"></div>

    <!-- 内容层：蛋 + 登录卡片 -->
    <div class="content-layer" :class="{ 'slide-down': isLoggingIn }">
      <!-- 左侧 3D 蛋 -->
      <div class="egg-section">
        <div class="egg-canvas-wrapper">
          <TresCanvas v-bind="canvasConfig" window-size>
            <!-- 场景相机 -->
            <TresPerspectiveCamera :position="[0, 1.5, 6]" :look-at="[0, 0, 0]" :fov="45" />

            <!-- 环境光 -->
            <TresAmbientLight :intensity="1.0" />

            <!-- 主光源 -->
            <TresDirectionalLight :position="[5, 10, 7]" :intensity="1.2" cast-shadow />

            <!-- 补光 -->
            <TresPointLight :position="[-5, 5, 5]" :intensity="0.6" color="#ffffff" />

            <!-- 底部阴影平面 -->
            <TresMesh :position="[0, -2.2, 0]" :rotation="[-Math.PI / 2, 0, 0]" receive-shadow>
              <TresPlaneGeometry :args="[6, 6]" />
              <TresMeshBasicMaterial :color="'#FFFFFF'" transparent :opacity="0" />
            </TresMesh>
            <TresMesh 
  :position="[-2, -2.1, 0]" 
  :rotation="[-Math.PI / 2, 0, 0]" 
  receive-shadow
>
  <TresPlaneGeometry :args="[2.2, 2.2]" /> 
  
  <TresMeshBasicMaterial 
    :color="'#000000'" 
    transparent 
    :opacity="0.08"   :depthWrite="false" :blending="2"       >
    </TresMeshBasicMaterial>
</TresMesh>

            <!-- 阴影渲染器用的虚拟阴影平面 -->
            <TresMesh :position="[-2, -2.2, 0]" :rotation="[-Math.PI / 2, 0, 0]" receive-shadow>
  <TresCircleGeometry :args="[1.2, 64]" /> <TresShadowMaterial :opacity="0.1" />
</TresMesh>

<TresMesh 
  ref="eggMesh" 
  :position="[-2, 0, 0]" 
  :scale="[0.8, 1.05, 0.8]" 
  cast-shadow
>
  <TresSphereGeometry :args="[1, 64, 64]" /> <TresMeshPhysicalMaterial 
    :color="'#FFFFFF'" 
    :roughness="0.05" 
    :metalness="0.1" 
    :clearcoat="1"
    :clearcoatRoughness="0.05" 
    :reflectivity="1" 
  />
</TresMesh>

            <!-- 轨道控制器 -->
            <OrbitControls enable-damping :damping-factor="0.05" :min-distance="4" :max-distance="10"
              :auto-rotate="isSpinning" :auto-rotate-speed="spinSpeed" :enable-zoom="false" :enable-pan="false" />
          </TresCanvas>
        </div>
        <!-- 底部 CSS 阴影 -->
        <!-- <div class="egg-shadow"></div> -->
      </div>

      <!-- 右侧登录卡片 -->
      <div class="login-section">
        <div class="login-card">
          <t-tabs v-model="activeTab" class="login-tabs">
            <t-tab-panel value="login" label="登录">
              <div class="tab-content">
                <t-input v-model="loginForm.username" placeholder="请输入用户名" size="large" clearable class="form-input">
                  <template #prefix-icon>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="input-icon">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </template>
                </t-input>

                <t-input v-model="loginForm.password" type="password" placeholder="请输入密码" size="large" clearable
                  class="form-input" @enter="handleLogin">
                  <template #prefix-icon>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="input-icon">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </template>
                </t-input>

                <div class="form-options">
                  <t-checkbox v-model="rememberAccount">记住账号</t-checkbox>
                </div>

                <t-button theme="primary" size="large" block :loading="isLoading" @click="handleLogin"
                  class="submit-btn">
                  登录
                </t-button>
              </div>
            </t-tab-panel>

            <t-tab-panel value="register" label="注册">
              <div class="tab-content">
                <t-input v-model="registerForm.username" placeholder="请输入用户名" size="large" clearable
                  class="form-input">
                  <template #prefix-icon>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="input-icon">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </template>
                </t-input>

                <t-input v-model="registerForm.password" type="password" placeholder="请输入密码（至少6位）" size="large"
                  clearable class="form-input">
                  <template #prefix-icon>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="input-icon">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </template>
                </t-input>

                <t-input v-model="registerForm.confirmPassword" type="password" placeholder="请确认密码" size="large"
                  clearable class="form-input" @enter="handleRegister">
                  <template #prefix-icon>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="input-icon">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </template>
                </t-input>

                <t-button theme="primary" size="large" block :loading="isLoading" @click="handleRegister"
                  class="submit-btn">
                  注册
                </t-button>
              </div>
            </t-tab-panel>
          </t-tabs>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, shallowRef } from 'vue'
import { TresCanvas, useRenderLoop } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'
import { MessagePlugin } from 'tdesign-vue-next'
import { useUserStore } from '../stores/user'
import * as userApi from '../api/userApi'

const emit = defineEmits<{
  loginSuccess: []
}>()

const userStore = useUserStore()

// 3D 配置
const canvasConfig = {
  alpha: true,
  antialias: true,
  shadows: true,
  clearColor: '#FFFFFF',
  shadowMap: {
    enabled: true,
    type: 2 // PCFSoftShadowMap
  }
}

// 蛋的引用和动画
const eggMesh = shallowRef<any>(null)
const isShaking = ref(true)
const isSpinning = ref(false)
const spinSpeed = ref(3)
const isLoggingIn = ref(false)

// 登录/注册表单
const activeTab = ref('login')
const isLoading = ref(false)
const rememberAccount = ref(false)

const loginForm = ref({
  username: '',
  password: ''
})

const registerForm = ref({
  username: '',
  password: '',
  confirmPassword: ''
})

// 破壳晃动动画
let shakeStartTime = 0
const SHAKE_DURATION = 300
const SHAKE_INTERVAL = 2000
const SHAKE_ANGLE = 0.15

const { onLoop } = useRenderLoop()

onLoop(() => {
  if (!eggMesh.value || isLoggingIn.value) return

  if (isShaking.value) {
    const now = Date.now()
    const timeSinceLastShake = now - shakeStartTime

    if (timeSinceLastShake >= SHAKE_INTERVAL) {
      shakeStartTime = now
    }

    if (timeSinceLastShake < SHAKE_DURATION) {
      const progress = timeSinceLastShake / SHAKE_DURATION
      const shakeProgress = Math.sin(progress * Math.PI)
      const rotationZ = shakeProgress * SHAKE_ANGLE * Math.sin(progress * Math.PI * 4)
      eggMesh.value.rotation.z = rotationZ
      const rotationY = shakeProgress * SHAKE_ANGLE * 0.3 * Math.cos(progress * Math.PI * 3)
      eggMesh.value.rotation.y = rotationY
    } else {
      eggMesh.value.rotation.z = 0
      eggMesh.value.rotation.y = 0
    }
  }
})

// 处理登录
const handleLogin = async () => {
  const { username, password } = loginForm.value

  if (!username.trim() || !password.trim()) {
    MessagePlugin.error('请输入用户名和密码')
    return
  }

  isLoading.value = true

  try {
    const result = await userApi.login({ username: username.trim(), password })

    if (result.token && result.user) {
      if (rememberAccount.value) {
        localStorage.setItem('idegg_remembered_username', username.trim())
      } else {
        localStorage.removeItem('idegg_remembered_username')
      }

      userStore.setToken(result.token)
      userStore.setUser(result.user)

      handleLoginSuccess()
    }
  } catch (error: any) {
    MessagePlugin.error(error.message || '登录失败')
  } finally {
    isLoading.value = false
  }
}

// 处理注册
const handleRegister = async () => {
  const { username, password, confirmPassword } = registerForm.value

  if (!username.trim() || !password.trim()) {
    MessagePlugin.error('请输入用户名和密码')
    return
  }

  if (password.length < 6) {
    MessagePlugin.error('密码长度至少6个字符')
    return
  }

  if (password !== confirmPassword) {
    MessagePlugin.error('两次输入的密码不一致')
    return
  }

  isLoading.value = true

  try {
    const result = await userApi.register({ username: username.trim(), password })

    MessagePlugin.success(result.message || '注册成功')

    activeTab.value = 'login'
    loginForm.value.username = username.trim()
    registerForm.value = { username: '', password: '', confirmPassword: '' }
  } catch (error: any) {
    MessagePlugin.error(error.message || '注册失败')
  } finally {
    isLoading.value = false
  }
}

// 登录成功动画
const handleLoginSuccess = () => {
  isShaking.value = false
  isSpinning.value = true
  spinSpeed.value = 20

  isLoggingIn.value = true

  setTimeout(() => {
    emit('loginSuccess')
  }, 1000)
}

// 初始化
onMounted(() => {
  const rememberedUsername = localStorage.getItem('idegg_remembered_username')
  if (rememberedUsername) {
    loginForm.value.username = rememberedUsername
    rememberAccount.value = true
  }

  shakeStartTime = Date.now()
})
</script>

<style lang="less" scoped>
.login-container {
  width: 100vw;
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1000;
  overflow: hidden;
}

// 纯白背景
.pure-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #FFFFFF;
  z-index: 1;
}

// 磨砂玻璃背景层
.glass-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
  background: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  transition: transform 1s cubic-bezier(0.4, 0, 0.2, 1);

  &.slide-down {
    transform: translateY(100%);
  }
}

// 内容层（蛋 + 登录卡片）
.content-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 80px;
  padding: 0 10%;
  transition: transform 1s cubic-bezier(0.4, 0, 0.2, 1);

  &.slide-down {
    transform: translateY(100%);
  }
}

// 左侧蛋区域
// 找到 .egg-section，确保它占满左侧
.egg-section {
  flex: 1.5; // 让左侧稍微宽一点
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative; 
  height: 100%; // 撑满高度
}

// 找到 .egg-canvas-wrapper，让它占满父容器，不要写死 200px
.egg-canvas-wrapper {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

// 找到 .egg-shadow，调整位置使其对准蛋的新位置 (-2 在 3D 里对应屏幕偏左)
// .egg-shadow {
//   width: 120px; // 缩小阴影
//   height: 20px;
//   background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.1) 0%, transparent 70%);
//   border-radius: 50%;
//   position: absolute;
//   bottom: 25%; // 根据实际视觉调整
//   left: 35%;   // 调整到左侧对准蛋
//   filter: blur(5px);
//   animation: shadowPulse 2s ease-in-out infinite;
// }

// .egg-canvas-wrapper {
//   width: 200px;
//   height: 200px;
//   position: relative;
// }

// CSS 底部阴影
// .egg-shadow {
//   width: 180px;
//   height: 30px;
//   background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.15) 0%, rgba(0, 0, 0, 0.05) 50%, transparent 70%);
//   border-radius: 50%;
//   margin-top: -20px;
//   filter: blur(8px);
//   animation: shadowPulse 2s ease-in-out infinite;
// }

@keyframes shadowPulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }

  50% {
    transform: scale(0.95);
    opacity: 0.8;
  }
}

// 右侧登录区域
.login-section {
  flex: 1;
  display: flex;
  justify-content: center;
  max-width: 450px;
}

// 登录卡片 - 白色磨砂质感
.login-card {
  width: 100%;
  max-width: 420px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 48px 40px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.08),
    0 0 0 1px rgba(255, 255, 255, 0.8) inset;
  border: 1px solid rgba(255, 255, 255, 0.9);
}

.tab-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-top: 28px;
}

.form-input {
  :deep(.t-input) {
    background: rgba(255, 255, 255, 0.95);
    border-color: rgba(0, 0, 0, 0.08);
    border-radius: 12px;
    height: 50px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

    &:hover,
    &:focus {
      border-color: rgba(0, 150, 255, 0.4);
      background: #FFFFFF;
      box-shadow: 0 4px 12px rgba(0, 150, 255, 0.1);
    }

    .t-input__prefix {
      margin-right: 12px;
    }
    .t-input__inner {
        color: #333
    }
  }
}

.input-icon {
  width: 20px;
  height: 20px;
  color: rgba(0, 0, 0, 0.35);
}

.form-options {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  margin-top: 4px;

  :deep(.t-checkbox__label) {
    color: rgba(0, 0, 0, 0.55);
    font-size: 14px;
  }
}

.submit-btn {
  height: 50px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 500;
  background: linear-gradient(135deg, #00c8ff, #0096ff);
  border: none;
  margin-top: 8px;
  box-shadow: 0 4px 16px rgba(0, 150, 255, 0.25);

  &:hover {
    background: linear-gradient(135deg, #00d4ff, #00a8ff);
    box-shadow: 0 6px 24px rgba(0, 150, 255, 0.35);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
}

// 标签页样式
:deep(.login-tabs) {
    background-color: #fff;
  .t-tabs__nav-container {
    background-color: #fff;
    background: transparent;
  }

  .t-tabs__nav-item {
    font-size: 20px;
    font-weight: 600;
    color: rgba(0, 0, 0, 0.35);
    padding: 12px 28px;
    transition: all 0.3s ease;

    &:hover {
      color: rgba(0, 0, 0, 0.55);
    }

    &.t-is-active {
      color: #0096ff;
    }
  }

  .t-tabs__bar {
    background: linear-gradient(90deg, #00c8ff, #0096ff);
    height: 3px;
    border-radius: 2px;
  }

  .t-tabs__content {
    margin-top: 0;
    background-color: #fff;
  }
}
</style>