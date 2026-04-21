<template>
  <div class="app-container">
    <!-- 登录页面 -->
    <Login v-show="!isLoggedIn" @login-success="handleLoginSuccess" />

    <!-- 主应用 -->
    <div v-show="isLoggedIn" class="main-app">
    <!-- 3D 场景层 -->
    <div class="scene-layer">
      <TresCanvas
        v-bind="canvasConfig"
        window-size
      >
        <!-- 场景相机 -->
        <TresPerspectiveCamera
          :position="[0, 8, 20]"
          :look-at="[0, 0, 0]"
          :fov="45"
        />
        
        <!-- 环境光 -->
        <TresAmbientLight :intensity="0.6" />
        
        <!-- 主光源 -->
        <TresDirectionalLight
          :position="[5, 15, 7]"
          :intensity="1"
          cast-shadow
        />
        
        <!-- 辅助光源 -->
        <TresPointLight
          :position="[-5, 5, -5]"
          :intensity="0.5"
          color="#00ffff"
        />

        <!-- 地面（可视化） - 旋转90度使其水平 -->
        <TresMesh :position="[0, -2, 0]" :rotation="[-Math.PI / 2, 0, 0]" receive-shadow>
  <TresCircleGeometry :args="[25, 64]" /> 
  
  <TresMeshStandardMaterial
    :color="'#a1c6e7'"
    :roughness="0.8"
    :side="2" 
  />
</TresMesh>

        <!-- 边界墙（防止蛋滚太远） -->
        <TresMesh :position="[0, -1, -10]">
          <TresBoxGeometry :args="[30, 2, 0.5]" />
          <TresMeshBasicMaterial :color="'#0a0a0a'" transparent :opacity="0" />
        </TresMesh>
        <TresMesh :position="[0, -1, 10]">
          <TresBoxGeometry :args="[30, 2, 0.5]" />
          <TresMeshBasicMaterial :color="'#0a0a0a'" transparent :opacity="0" />
        </TresMesh>
        <TresMesh :position="[-10, -1, 0]">
          <TresBoxGeometry :args="[0.5, 2, 30]" />
          <TresMeshBasicMaterial :color="'#0a0a0a'" transparent :opacity="0" />
        </TresMesh>
        <TresMesh :position="[10, -1, 0]">
          <TresBoxGeometry :args="[0.5, 2, 30]" />
          <TresMeshBasicMaterial :color="'#0a0a0a'" transparent :opacity="0" />
        </TresMesh>

        <!-- Idea 蛋池 - 渲染所有蛋，搜索过滤在组件内部处理 -->
        <IdeaEgg
          v-for="idea in renderIdeas"
          :key="idea.id"
          :idea-data="idea"
          :search-keyword="searchKeyword"
          @click="handleEggClick(idea)"
          @animation-complete="handleAnimationComplete"
        />
        
        <!-- 轨道控制器 -->
        <OrbitControls
          enable-damping
          :damping-factor="0.05"
          :min-distance="5"
          :max-distance="40"
          :min-polar-angle="0"
          :max-polar-angle="Math.PI / 2 - 0.1"
        />
      </TresCanvas>
    </div>

    <!-- UI 覆盖层 -->
    <div class="ui-overlay">
      <!-- 顶部搜索区 -->
      <div class="search-section">
        <div class="search-wrapper">
          <t-input
            v-model="searchKeyword"
            placeholder="搜索 Idea..."
            size="large"
            clearable
          >
            <template #prefix-icon>
              <svg class="search-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </template>
          </t-input>
        </div>
      </div>

      <!-- 右上角提示 -->
      <div class="hint-text">
        已创建 {{ ideas.length }} 个 Idea
      </div>

      <!-- 右侧功能按钮组 -->
      <div 
        class="fab-container"
        @mouseenter="isFabHovered = true"
        @mouseleave="isFabHovered = false"
      >
        <!-- 扇形展开的功能按钮 -->
        <transition-group name="fan">
          <template v-if="isFabHovered">
            <!-- 功能1：分析（占位）- 最上方 -->
            <div 
              key="analyze" 
              class="fab-item" 
              title="AI分析"
              :style="{ transform: 'translate(-70px, -70px)' }"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
              </svg>
            </div>
            <!-- 功能2：协作（占位）- 左上 -->
            <div 
              key="collab" 
              class="fab-item" 
              title="协作"
              :style="{ transform: 'translate(-100px, -25px)' }"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <!-- 功能3：统计（占位）- 左下 -->
            <div 
              key="stats" 
              class="fab-item" 
              title="统计"
              :style="{ transform: 'translate(-100px, 25px)' }"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
            </div>
            <!-- 功能4：新增Idea - 最下方 -->
            <div 
              key="add" 
              class="fab-item fab-item-primary" 
              title="新增Idea" 
              @click="showAddDialog"
              :style="{ transform: 'translate(-70px, 70px)' }"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </div>
          </template>
        </transition-group>
        
        <!-- 主圆形按钮 -->
        <div class="fab-main" :class="{ 'fab-main-active': isFabHovered }">
          <svg class="fab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </div>
      </div>
    </div>

    <!-- 新增 Idea 弹窗 -->
    <t-dialog
      v-model:visible="addDialogVisible"
      header="新增 Idea"
      :width="480"
      :close-on-overlay-click="true"
      :destroy-on-close="true"
      class="glass-dialog"
    >
      <div class="dialog-content">
        <t-input
          v-model="newIdeaTitle"
          placeholder="请输入 Idea 标题..."
          size="large"
          clearable
          class="dialog-input"
        />
        <t-textarea
          v-model="newIdeaContent"
          placeholder="描述一下你的想法...（可选）"
          :autosize="{ minRows: 4, maxRows: 8 }"
          class="dialog-textarea"
        />
      </div>
      <template #footer>
        <div class="dialog-footer">
          <t-button theme="default" variant="outline" size="large" @click="addDialogVisible = false">
            取消
          </t-button>
          <t-button theme="primary" size="large" @click="handleCreateIdea">
            确认
          </t-button>
        </div>
      </template>
    </t-dialog>

    <!-- Idea 详情弹窗 -->
    <IdeaDetailCard
      v-model:visible="detailVisible"
      :idea="selectedIdea"
      @break="handleBreakIdea"
    />

    <!-- 用户头像 -->
    <UserAvatar
      v-if="isLoggedIn"
      @click="showProfileDrawer = true"
    />

    <!-- 个人中心抽屉 -->
    <UserProfileDrawer
      v-model:visible="showProfileDrawer"
      @logout="handleLogout"
    />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { TresCanvas } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'
import { useUserStore } from './stores/user'
import Login from './components/Login.vue'
import UserAvatar from './components/UserAvatar.vue'
import UserProfileDrawer from './components/UserProfileDrawer.vue'
import IdeaEgg from './components/three/IdeaEgg.vue'
import IdeaDetailCard from './components/ui/IdeaDetailCard.vue'
import { initPhysics, destroyPhysics } from './composables/usePhysics'
import { eggApi } from './api/eggApi'
import type { Idea } from './types'

const userStore = useUserStore()

// 登录状态
const isLoggedIn = ref(false)

// 初始化时检查登录状态
onMounted(() => {
  userStore.initFromStorage()
  isLoggedIn.value = userStore.isLoggedIn

  // 如果已登录，初始化物理世界并加载蛋数据
  if (isLoggedIn.value) {
    initPhysics()
    loadEggs()
  }
})

// 登录成功处理
const handleLoginSuccess = () => {
  isLoggedIn.value = true
  // 初始化物理世界
  initPhysics()
  loadEggs()
}

// Canvas 配置
const canvasConfig = {
  alpha: true,
  antialias: true,
  shadows: true,
  clearColor: '#F5F5F7'
}

// 状态
const newIdeaTitle = ref('')
const newIdeaContent = ref('')
const searchKeyword = ref('')
const ideas = ref<Idea[]>([])
const detailVisible = ref(false)
const selectedIdea = ref<Idea | null>(null)
const isFabHovered = ref(false)
const addDialogVisible = ref(false)
const showProfileDrawer = ref(false)

// 显示新增弹窗
const showAddDialog = () => {
  addDialogVisible.value = true
  newIdeaTitle.value = ''
  newIdeaContent.value = ''
}

// 渲染所有 ideas（包括 broken 状态的，由 IdeaEgg 组件内部处理破碎动画）
const renderIdeas = computed(() => {
  return ideas.value
})

// 加载已有蛋数据
const loadEggs = async () => {
  try {
    const eggs = await eggApi.getEggs()
    console.log('从数据库加载蛋:', eggs)

    // 转换数据库格式为前端格式
    const loadedIdeas: Idea[] = eggs.map(egg => ({
      id: `egg-${egg.id}`,
      dbId: Number(egg.id),
      title: egg.name,
      content: '',
      createTime: new Date(egg.created_at || Date.now()).getTime(),
      position: [Number(egg.pos_x), Number(egg.pos_y), Number(egg.pos_z)] as [number, number, number],
      status: 'active',
      displayColor: egg.displayColor,
      eggStatus: egg.status
    }))

    ideas.value.push(...loadedIdeas)
  } catch (error) {
    console.error('加载蛋数据失败:', error)
  }
}

onUnmounted(() => {
  if (isLoggedIn.value) {
    destroyPhysics()
  }
})

// 生成随机位置（在平面上）
const generateRandomPosition = (): [number, number, number] => {
  const angle = Math.random() * Math.PI * 2
  const radius = 2 + Math.random() * 4
  const x = Math.cos(angle) * radius
  const z = Math.sin(angle) * radius
  return [x, 0, z]
}

// 生成唯一 ID
const generateId = (): string => {
  return `idea-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

// 创建 Idea
const handleCreateIdea = async () => {
  const title = newIdeaTitle.value.trim()
  if (!title) return

  const position = generateRandomPosition()

  try {
    // 先保存到数据库
    const result = await eggApi.addEgg({
      name: title,
      color: '#FFFFFF',
      pos_x: position[0],
      pos_y: 6, // 从高处掉落
      pos_z: position[2],
    })

    console.log('数据库保存结果:', result)

    // 再添加到本地渲染
    const idea: Idea = {
      id: generateId(),
      dbId: Number(result.id),  // 保存数据库ID，确保是数字类型
      title: title,
      content: newIdeaContent.value.trim(),
      createTime: Date.now(),
      position: position,
      status: 'active'
    }

    ideas.value.push(idea)
    newIdeaTitle.value = ''
    newIdeaContent.value = ''
    addDialogVisible.value = false
  } catch (error) {
    console.error('保存失败:', error)
    // 可以在这里添加错误提示
  }
}

// 点击蛋
const handleEggClick = async (idea: Idea) => {
  selectedIdea.value = idea
  detailVisible.value = true

  // 如果有数据库ID，获取详情
  if (idea.dbId) {
    try {
      const result = await eggApi.getEggDetail(idea.dbId)
      console.log('蛋详情:', result.data)
      // 可以在这里更新 idea 的详细信息
    } catch (error) {
      console.error('获取详情失败:', error)
    }
  }
}

// 打碎蛋 - 改变状态触发动画并删除数据库记录
const handleBreakIdea = async (idea: Idea) => {
  console.log('打碎蛋:', idea.id, 'dbId:', idea.dbId)

  // 先调用删除接口
  if (idea.dbId) {
    try {
      const result = await eggApi.deleteEgg(idea.dbId)
      console.log('删除结果:', result)
    } catch (error) {
      console.error('删除失败:', error)
      // 即使删除失败也继续前端动画
    }
  } else {
    console.warn('该蛋没有数据库ID，跳过数据库删除')
  }

  // 再触发前端破碎动画
  const target = ideas.value.find(i => i.id === idea.id)
  if (target) {
    target.status = 'broken'
  }
}

// 动画结束后从数组中删除
const handleAnimationComplete = (ideaId: string) => {
  const index = ideas.value.findIndex(i => i.id === ideaId)
  if (index > -1) {
    ideas.value.splice(index, 1)
  }
}

// 处理登出
const handleLogout = () => {
  isLoggedIn.value = false
  ideas.value = []
  destroyPhysics()
}
</script>

<style lang="less" scoped>
.app-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.main-app {
  width: 100%;
  height: 100%;
  position: relative;
}

.scene-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.ui-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
  pointer-events: none;
  padding: 24px;
}

// 搜索区域
.search-section {
  pointer-events: auto;
  display: flex;
  justify-content: center;
  padding-top: 20px;
}

.search-wrapper {
  width: 400px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 12px;
  padding: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  :deep(.t-input) {
    background-color: transparent;
    border: none;
  }
    :deep(.t-input--focused) {
    box-shadow: none;
  }
  :deep(.t-input__inner) {
    color: #333;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.25);
    box-shadow: 0 6px 40px rgba(0, 0, 0, 0.15);
  }

  .search-icon-svg {
    width: 20px;
    height: 20px;
    color: rgba(255, 255, 255, 0.7);
  }
}

.hint-text {
  position: absolute;
  top: 24px;
  right: 24px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  pointer-events: auto;
}

// FAB 悬浮按钮容器
.fab-container {
  position: fixed;
  right: 40px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  z-index: 100;
  width: 60px;
  height: 60px;
}

// 扇形展开的按钮组容器
.fab-menu {
  position: absolute;
  right: 30px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  pointer-events: none;
}

// 扇形展开的按钮
.fab-item {
  position: absolute;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  pointer-events: auto;
  right: 0;
  top: 50%;
  margin-top: -22px;
  
  svg {
    width: 18px;
    height: 18px;
    color: rgba(255, 255, 255, 0.9);
    transition: all 0.3s ease;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.25);
    box-shadow: 0 6px 30px rgba(0, 0, 0, 0.2);
    
    svg {
      color: #fff;
    }
  }
}

// 主要功能按钮（新增）
.fab-item-primary {
  background: linear-gradient(135deg, rgba(0, 200, 255, 0.3), rgba(0, 150, 255, 0.3));
  border-color: rgba(0, 200, 255, 0.4);
  
  &:hover {
    background: linear-gradient(135deg, rgba(0, 200, 255, 0.5), rgba(0, 150, 255, 0.5));
  }
}

// 扇形动画 - 从中心向左上扇形展开
.fan-enter-active,
.fan-leave-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.fan-enter-from,
.fan-leave-to {
  opacity: 0;
  transform: translateX(0) translateY(0) scale(0.3);
}

// 主按钮
.fab-main {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
  position: relative;
  z-index: 10;
  
  .fab-icon {
    width: 28px;
    height: 28px;
    color: #fff;
  }

  &:hover,
  &.fab-main-active {
    background: rgba(255, 255, 255, 0.3);
    box-shadow: 0 6px 40px rgba(0, 0, 0, 0.2);
  }
}

// 磨砂弹窗样式
::deep(.glass-dialog) {
  .t-dialog__wrap {
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
  }
  
  .t-dialog__position {
    padding: 20px;
  }
  
  .t-dialog {
    background: rgba(30, 30, 40, 0.85);
    backdrop-filter: blur(30px);
    -webkit-backdrop-filter: blur(30px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 16px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  }
  
  .t-dialog__header {
    color: #fff;
    font-size: 18px;
    font-weight: 500;
    padding: 20px 24px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .t-dialog__body {
    padding: 24px;
  }
  
  .t-dialog__footer {
    padding: 16px 24px 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    
    .t-button {
      border-radius: 8px;
      
      &--variant-outline {
        background: transparent;
        border-color: rgba(255, 255, 255, 0.3);
        color: rgba(255, 255, 255, 0.8);
        
        &:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.5);
        }
      }
      
      &--theme-primary {
        background: linear-gradient(135deg, #00c8ff, #0096ff);
        border: none;
        
        &:hover {
          background: linear-gradient(135deg, #00d4ff, #00a8ff);
        }
      }
    }
  }
  
  .t-dialog__close {
    color: rgba(255, 255, 255, 0.6);
    
    &:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.1);
    }
  }
}

.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dialog-input {
  :deep(.t-input) {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.15);
    color: #fff;
    
    &::placeholder {
      color: rgba(255, 255, 255, 0.4);
    }
    
    &:focus {
      border-color: rgba(0, 200, 255, 0.5);
      background: rgba(255, 255, 255, 0.12);
    }
  }
}

.dialog-textarea {
  :deep(.t-textarea__inner) {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.15);
    color: #fff;
    resize: none;
    
    &::placeholder {
      color: rgba(255, 255, 255, 0.4);
    }
    
    &:focus {
      border-color: rgba(0, 200, 255, 0.5);
      background: rgba(255, 255, 255, 0.12);
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
::deep(.t-input__inner) {
    color: #000 !important;
}
</style>