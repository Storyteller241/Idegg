<template>
  <div class="app-container">
    <!-- 登录页面 -->
    <Login v-show="!isLoggedIn" @login-success="handleLoginSuccess" />

    <!-- 主应用 -->
    <div v-show="isLoggedIn" class="main-app">
    <!-- 3D 场景层 -->
    <div class="scene-layer">
      <TresCanvas
        :key="sceneKey"
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

        <!-- Idea 蛋池 - 渲染所有蛋，key 使用蛋池ID+蛋ID确保切换时强制重新渲染 -->
        <IdeaEgg
          v-for="idea in renderIdeas"
          :key="`${currentPoolId}-${idea.id}`"
          ref="eggRefs"
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
      
      <!-- 加载中提示 -->
      <div v-if="poolLoading" class="scene-loading-overlay">
        <div class="loading-spinner"></div>
        <span class="loading-text">加载中...</span>
      </div>
      
      <!-- 空状态提示 -->
      <div v-else-if="currentPool && ideas.length === 0 && !isSwitchingPool" class="scene-empty-overlay">
        <div class="empty-icon">🥚</div>
        <span class="empty-text">空空如也</span>
        <span class="empty-hint">这个蛋池还没有 Idea</span>
      </div>
    </div>

    <!-- UI 覆盖层 -->
    <div class="ui-overlay">
      <!-- 左上角搜索和蛋池标识 -->
      <div class="top-left-section">
        <!-- 搜索图标 -->
        <div 
          class="search-icon-btn"
          @mouseenter="isSearchHovered = true"
          @mouseleave="isSearchHovered = false"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          
          <!-- hover 展开的搜索框 -->
          <transition name="search-expand">
            <div v-if="isSearchHovered" class="search-expand-wrapper">
              <t-input
                v-model="searchKeyword"
                placeholder="搜索 Idea..."
                size="large"
                clearable
                autofocus
                class="search-expand-input"
              />
            </div>
          </transition>
        </div>
            <!-- 切换蛋池按钮 - 仅当有多个蛋池时显示 -->
    <div
      v-if="isLoggedIn && pools.length > 1"
      class="pool-switch-btn"
      @click="showPoolSwitchDrawer = true"
      title="切换蛋池"
    >
      <span class="pool-icon">{{ currentPool?.type === 'public' ? '🌐' : '🔒' }}</span>
      <span class="pool-name-short">{{ currentPool?.name?.slice(0, 2) || '蛋池' }}</span>
    </div>
        
        <!-- 当前蛋池名称 / 切换中状态 -->
        <!-- <div v-if="isSwitchingPool" class="pool-status-text switching">
          <span class="loading-dot"></span>
          切换中...
        </div>
        <div v-else-if="currentPool" class="pool-status-text active">
          <span class="pool-icon-small">{{ currentPool.type === 'public' ? '🌐' : '🔒' }}</span>
          {{ currentPool.name }}
        </div>
        <div v-else class="pool-status-text">
          未选择蛋池
        </div> -->
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
            <!-- 功能1：创建蛋池 - 最上方 -->
            <div 
              key="createPool" 
              class="fab-item" 
              title="创建蛋池"
              :style="{ transform: 'translate(-70px, -70px)' }"
              @click="showCreatePoolDialog = true"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="16"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
            </div>
            <!-- 功能2：分析（占位）- 左上 -->
            <div 
              key="analyze" 
              class="fab-item" 
              title="AI分析"
              :style="{ transform: 'translate(-100px, -25px)' }"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
              </svg>
            </div>
            <!-- 功能3：协作（占位）- 左下 -->
            <div 
              key="collab" 
              class="fab-item" 
              title="协作"
              :style="{ transform: 'translate(-100px, 25px)' }"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
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

    <!-- 创建蛋池弹窗 -->
    <t-dialog
      v-model:visible="showCreatePoolDialog"
      header="创建新蛋池"
      :width="480"
      :close-on-overlay-click="true"
      :destroy-on-close="true"
      class="glass-dialog"
    >
      <div class="dialog-content">
        <t-input
          v-model="newPoolName"
          placeholder="请输入蛋池名称..."
          size="large"
          clearable
          class="dialog-input"
        />
        <div class="pool-type-hint">
          私有蛋池：只有被邀请的成员才能查看，每人最多可创建 3 个
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <t-button theme="default" variant="outline" size="large" @click="showCreatePoolDialog = false">
            取消
          </t-button>
          <t-button theme="primary" size="large" @click="handleCreatePool">
            创建
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
      class="user-avatar"
      v-if="isLoggedIn"
      @click="showProfileDrawer = true"
    />


    <!-- 个人中心抽屉 -->
    <UserProfileDrawer
      v-model:visible="showProfileDrawer"
      @logout="handleLogout"
    />

    <!-- 切换蛋池抽屉 -->
    <t-drawer
      v-model:visible="showPoolSwitchDrawer"
      header="切换蛋池"
      :width="320"
      :close-on-overlay-click="true"
      class="pool-drawer"
    >
      <div class="pool-list">
        <div
          v-for="pool in pools"
          :key="pool.id"
          class="pool-list-item"
          :class="{ 'pool-list-item-active': pool.id === currentPoolId }"
          @click="switchToPool(pool.id); showPoolSwitchDrawer = false"
        >
          <div class="pool-item-info">
            <span class="pool-item-icon">{{ pool.type === 'public' ? '🌐' : '🔒' }}</span>
            <div class="pool-item-details">
              <div class="pool-item-name">{{ pool.name }}</div>
              <div class="pool-item-meta">
                <span class="pool-item-type">{{ pool.type === 'public' ? '公共' : '私人' }}</span>
                <span v-if="pool.is_owner" class="pool-item-owner">创建者</span>
              </div>
            </div>
          </div>
          <div v-if="pool.id === currentPoolId" class="pool-item-check">✓</div>
        </div>
      </div>
    </t-drawer>

    </div>
  </div>
  
  <!-- 全局 iOS 风格 Tooltip -->
  <Teleport to="body">
    <Transition name="tooltip-fade">
      <div 
        v-if="tooltip.visible" 
        class="ios-tooltip-wrapper"
        :style="tooltipPosition"
      >
        <div class="ios-tooltip">
          <div class="ios-tooltip-content">
            <div class="ios-tooltip-title">{{ tooltip.data?.title || '未命名' }}</div>
            <div class="ios-tooltip-meta">创建者: {{ tooltip.data?.creator || '未知' }}</div>
            <div 
              class="ios-tooltip-status" 
              :style="{ color: tooltip.data?.color || '#999' }"
            >
              {{ tooltip.data?.statusText || '未知状态' }}
            </div>
          </div>
          <div class="ios-tooltip-arrow"></div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { TresCanvas, useTresContext } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'
import { MessagePlugin } from 'tdesign-vue-next'
import { useUserStore } from './stores/user'
import * as THREE from 'three'
import Login from './components/Login.vue'
import UserAvatar from './components/UserAvatar.vue'
import UserProfileDrawer from './components/UserProfileDrawer.vue'
import IdeaEgg from './components/three/IdeaEgg.vue'
import IdeaDetailCard from './components/ui/IdeaDetailCard.vue'
import { initPhysics, destroyPhysics } from './composables/usePhysics'
import { eggApi, type EggPool } from './api/eggApi'
import type { Idea } from './types'

// Tooltip 数据接口
interface TooltipData {
  title: string
  creator: string
  statusText: string
  color: string
  screenX: number
  screenY: number
}

// 全局 Tooltip 状态
const tooltip = ref<{
  visible: boolean
  data: TooltipData | null
}>({
  visible: false,
  data: null
})

// 计算 tooltip 位置
const tooltipPosition = computed(() => {
  if (!tooltip.value.data) return {}
  const { screenX, screenY } = tooltip.value.data
  // 在蛋的上方显示，偏移 20px
  return {
    left: `${screenX}px`,
    top: `${screenY - 20}px`,
    transform: 'translate(-50%, -100%)'
  }
})

// 显示 tooltip 的方法
const showTooltip = (data: TooltipData) => {
  tooltip.value.data = data
  tooltip.value.visible = true
}

// 隐藏 tooltip 的方法
const hideTooltip = () => {
  tooltip.value.visible = false
}

// Raycaster 用于检测鼠标悬停
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
let cameraRef: THREE.Camera | null = null
let sceneRef: THREE.Scene | null = null

// 获取 TresJS 上下文
const { camera, scene } = useTresContext ? useTresContext() : { camera: ref(null), scene: ref(null) }

// 监听鼠标移动，检测 hover
const handleMouseMove = (event: MouseEvent) => {
  if (!cameraRef || !sceneRef || !isLoggedIn.value) return
  
  // 计算鼠标在归一化设备坐标中的位置
  const rect = (event.target as HTMLElement).getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  
  // 更新 raycaster
  raycaster.setFromCamera(mouse, cameraRef)
  
  // 获取所有蛋的 Mesh（需要遍历场景找到所有蛋）
  const eggMeshes: THREE.Object3D[] = []
  sceneRef.traverse((child) => {
    // 蛋的 Mesh 有特定的 userData 标识
    if (child.userData?.isEgg) {
      eggMeshes.push(child)
    }
  })
  
  // 检测相交
  const intersects = raycaster.intersectObjects(eggMeshes, false)
  
  if (intersects.length > 0) {
    const hitObject = intersects[0].object
    const eggData = hitObject.userData?.eggData
    
    if (eggData) {
      // 计算屏幕坐标
      const vector = new THREE.Vector3()
      hitObject.getWorldPosition(vector)
      vector.y += 1.5 // 蛋上方
      
      vector.project(cameraRef)
      
      const screenX = (vector.x * 0.5 + 0.5) * rect.width + rect.left
      const screenY = (-(vector.y * 0.5) + 0.5) * rect.height + rect.top
      
      // 显示 tooltip
      showTooltip({
        title: eggData.title,
        creator: eggData.creator || '未知',
        statusText: getStatusText(eggData.eggStatus),
        color: eggData.displayColor || '#FFFFFF',
        screenX,
        screenY
      })
    }
  } else {
    hideTooltip()
  }
}

// 获取状态文本
const getStatusText = (status?: string) => {
  switch (status) {
    case 'fresh': return '状态: 新鲜'
    case 'aging': return '状态:  aging'
    case 'spoiled': return '状态: 变质'
    case 'incubated': return '状态: 孵化中'
    default: return '状态: 未知'
  }
}

// 监听 camera 和 scene 变化
watch(camera, (newCamera) => {
  if (newCamera) cameraRef = newCamera
}, { immediate: true })

watch(scene, (newScene) => {
  if (newScene) {
    sceneRef = newScene
    // 添加鼠标移动监听
    setTimeout(() => {
      const canvas = document.querySelector('.scene-layer canvas') as HTMLCanvasElement | null
      if (canvas) {
        canvas.addEventListener('mousemove', handleMouseMove as EventListener)
      }
    }, 100)
  }
}, { immediate: true })

// 清理事件监听
onUnmounted(() => {
  const canvas = document.querySelector('.scene-layer canvas') as HTMLCanvasElement | null
  if (canvas) {
    canvas.removeEventListener('mousemove', handleMouseMove as EventListener)
  }
})

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
  // 加载蛋池列表和蛋数据
  loadPools()
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
const isSearchHovered = ref(false)
const addDialogVisible = ref(false)
const showProfileDrawer = ref(false)
const showPoolSwitchDrawer = ref(false)

// ========== 蛋池相关状态 ==========
const pools = ref<EggPool[]>([])
const currentPoolId = ref<number | null>(null)
const currentPool = computed(() => pools.value.find(p => p.id === currentPoolId.value))
// 计算用户创建的私人蛋池数量
const privatePoolCount = computed(() => 
  pools.value.filter(p => p.type === 'private' && p.is_owner).length
)
const showCreatePoolDialog = ref(false)
const newPoolName = ref('')
const newPoolType = ref<'private'>('private')
const isLoadingPools = ref(false)

// 加载蛋池列表
const loadPools = async () => {
  if (!isLoggedIn.value) return
  
  isLoadingPools.value = true
  try {
    const result = await eggApi.getPools()
    pools.value = result.data
    
    // 如果没有选择当前蛋池，默认选择公共蛋池
    if (!currentPoolId.value && pools.value.length > 0) {
      const publicPool = pools.value.find(p => p.type === 'public')
      const targetPoolId = publicPool?.id || pools.value[0].id
      await switchToPool(targetPoolId)
    }
  } catch (error: any) {
    console.error('加载蛋池列表失败:', error)
  } finally {
    isLoadingPools.value = false
  }
}

// 切换蛋池 - 丝滑过渡
const handlePoolChange = async (poolId: number | null) => {
  if (poolId === currentPoolId.value) return
  await switchToPool(poolId)
}

// 丝滑切换到指定蛋池
const isSwitchingPool = ref(false)
const poolLoading = ref(false)
const sceneKey = ref(0)

const switchToPool = async (poolId: number | null) => {
  if (isSwitchingPool.value) return
  if (poolId === currentPoolId.value && ideas.value.length > 0) return
  
  isSwitchingPool.value = true
  poolLoading.value = true
  
  try {
    // 1. 更新 sceneKey 强制重新渲染整个 3D 场景
    sceneKey.value++
    
    // 2. 清理物理世界和数据
    destroyPhysics()
    ideas.value = []
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // 3. 重新初始化物理世界
    initPhysics()
    
    // 4. 更新当前蛋池ID
    currentPoolId.value = poolId
    
    // 4. 加载新蛋池数据
    if (poolId) {
      await loadEggsByPool(poolId)
    } else {
      await loadEggs()
    }
  } catch (error: any) {
    console.error('切换蛋池失败:', error)
    // 403 错误自动跳回公共蛋池
    if (error.message?.includes('403') || error.message?.includes('无权访问')) {
      MessagePlugin.error('无权访问该蛋池，自动跳回公共蛋池')
      const publicPool = pools.value.find(p => p.type === 'public')
      if (publicPool && publicPool.id !== poolId) {
        await switchToPool(publicPool.id)
      }
    }
  } finally {
    isSwitchingPool.value = false
    poolLoading.value = false
  }
}

// 加载指定蛋池的蛋
const loadEggsByPool = async (poolId: number) => {
  try {
    poolLoading.value = true
    const eggs = await eggApi.getEggsByPool(poolId)
    
    // 空数据处理 - 显示"空空如也"
    if (!eggs || eggs.length === 0) {
      ideas.value = []
      return
    }
    
    // 转换数据库格式为前端格式
    ideas.value = eggs.map(egg => ({
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
  } catch (error: any) {
    console.error('加载蛋池蛋数据失败:', error)
    ideas.value = []
    throw error
  } finally {
    poolLoading.value = false
  }
}

// 创建蛋池（只能是私有蛋池，每人最多3个）
const handleCreatePool = async () => {
  const name = newPoolName.value.trim()
  if (!name) {
    MessagePlugin.warning('请输入蛋池名称')
    return
  }
  
  // 检查私有蛋池数量限制（最多3个）
  if (privatePoolCount.value >= 3) {
    MessagePlugin.warning('每人最多只能创建3个私有蛋池')
    return
  }
  
  try {
    // 固定创建私有蛋池
    const result = await eggApi.createPool(name, 'private')
    MessagePlugin.success('蛋池创建成功')
    showCreatePoolDialog.value = false
    newPoolName.value = ''
    // 刷新蛋池列表
    await loadPools()
    // 自动切换到新创建的蛋池
    if (result.data?.id) {
      await switchToPool(result.data.id)
    }
  } catch (error: any) {
    MessagePlugin.error(error.message || '创建蛋池失败')
  }
}

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

  // 如果没有选中蛋池，尝试选择第一个
  if (!currentPoolId.value && pools.value.length > 0) {
    currentPoolId.value = pools.value[0].id
  }

  // 如果仍然没有蛋池，提示创建蛋池
  if (!currentPoolId.value) {
    MessagePlugin.warning('请先创建一个蛋池')
    addDialogVisible.value = false
    showCreatePoolDialog.value = true
    return
  }

  const position = generateRandomPosition()

  try {
    // 先保存到数据库
    const result = await eggApi.addEgg({
      name: title,
      color: '#FFFFFF',
      pos_x: position[0],
      pos_y: 6, // 从高处掉落
      pos_z: position[2],
      pool_id: currentPoolId.value, // 指定当前选中的蛋池
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

// 场景加载中覆盖层
.scene-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(4px);
  z-index: 5;
  pointer-events: none;
  
  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255, 255, 255, 0.2);
    border-top-color: #00c8ff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  
  .loading-text {
    margin-top: 12px;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.8);
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

// 场景空状态覆盖层
.scene-empty-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 5;
  pointer-events: none;
  
  .empty-icon {
    font-size: 64px;
    opacity: 0.5;
    animation: float 3s ease-in-out infinite;
  }
  
  .empty-text {
    margin-top: 16px;
    font-size: 18px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.6);
  }
  
  .empty-hint {
    margin-top: 8px;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.4);
  }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
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
// 顶部区域（蛋池选择 + 搜索）
.top-section {
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding-top: 20px;
}

// 蛋池选择区域
.pool-section {
  pointer-events: auto;
  display: flex;
  justify-content: center;
  width: 100%;
}

.pool-display {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  color: #333;
  
  .pool-icon-large {
    font-size: 18px;
  }
  
  .current-pool-name {
    font-size: 14px;
    font-weight: 500;
    color: #333;
  }
}

.pool-selector {
  display: flex;
  gap: 12px;
  align-items: center;
  width: 400px;
  :deep(.t-popup) {
    background-color: #fff;
  }
  :deep(.t-popup__content) {
    background-color: #fff;
  }
  :deep(.t-select__dropdown-inner) {
       background-color: #fff;
    }
  :deep(.t-select) {
    flex: 1;
    
    .t-input {
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      color: #333;
      
      &:hover, &.t-is-focused {
        background: rgba(255, 255, 255, 0.25);
      }
    }
    
    .t-input__inner {
      color: #333;
    }

  }

  .t-button {
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #333;
    border-radius: 12px;
    
    &:hover {
      background: rgba(255, 255, 255, 0.25);
    }
  }
}

.pool-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pool-icon {
  font-size: 16px;
}

.pool-name {
  flex: 1;
}

.pool-badge {
  font-size: 11px;
  color: #00c8ff;
  background: rgba(0, 200, 255, 0.1);
  padding: 2px 8px;
  border-radius: 10px;
}

// 蛋池类型选择器样式
.pool-type-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}

.pool-type-label {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.6);
}

.pool-type-hint {
  margin-top: 8px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.5);
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
}

.search-section {
  pointer-events: auto;
  display: flex;
  justify-content: center;
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

// 左上角搜索区域
.top-left-section {
  position: absolute;
  top: 24px;
  left: 24px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  z-index: 100;
  pointer-events: auto;
}

// 搜索图标按钮
.search-icon-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
  position: relative;
  
  svg {
    width: 20px;
    height: 20px;
    color: rgba(0, 0, 0, 0.6);
  }
  
  &:hover {
    background: rgba(255, 255, 255, 1);
    box-shadow: 0 6px 30px rgba(0, 0, 0, 0.4);
  }
}

// 展开的搜索框容器
.search-expand-wrapper {
  position: absolute;
  left: 50px;
  top: 0;
  width: 300px;
}

// 展开搜索框的输入样式
.search-expand-input {
  :deep(.t-input) {
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
    
    .t-input__inner {
      color: #333;
    }
    
    &::placeholder {
      color: rgba(0, 0, 0, 0.4);
    }
    
    &:hover, &.t-is-focused {
      background: rgba(255, 255, 255, 0.25);
    }
  }
}

// 搜索展开动画
.search-expand-enter-active,
.search-expand-leave-active {
  transition: all 0.3s ease;
}

.search-expand-enter-from,
.search-expand-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

// 蛋池状态提示文字
.pool-status-text {
  font-size: 12px;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.3s ease;
  
  &.active {
    background: rgba(0, 200, 255, 0.2);
    border: 1px solid rgba(0, 200, 255, 0.3);
  }
  
  &.switching {
    background: rgba(255, 200, 0, 0.2);
    border: 1px solid rgba(255, 200, 0, 0.3);
  }
  
  .pool-icon-small {
    font-size: 10px;
  }
  
  .loading-dot {
    width: 6px;
    height: 6px;
    background: #ffc800;
    border-radius: 50%;
    animation: pulse 1s infinite;
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}

.hint-text {
  position: absolute;
  top: 24px;
  right: 100px;
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

// 磨砂弹窗样式 - 白色磨砂基调
::deep(.glass-dialog) {
  .t-dialog__wrap {
    background: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(8px);
  }
  
  .t-dialog__position {
    padding: 20px;
  }
  
  .t-dialog {
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(30px);
    -webkit-backdrop-filter: blur(30px);
    border: 1px solid rgba(255, 255, 255, 0.5);
    border-radius: 20px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  }
  
  .t-dialog__header {
    color: rgba(0, 0, 0, 0.85);
    font-size: 18px;
    font-weight: 600;
    padding: 20px 24px 16px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  }
  
  .t-dialog__body {
    padding: 24px;
    color: rgba(0, 0, 0, 0.65);
  }
  
  .t-dialog__footer {
    padding: 16px 24px 20px;
    border-top: 1px solid rgba(0, 0, 0, 0.08);
    
    .t-button {
      border-radius: 10px;
      
      &--variant-outline {
        background: rgba(255, 255, 255, 0.6);
        border-color: rgba(0, 0, 0, 0.15);
        color: rgba(0, 0, 0, 0.7);
        
        &:hover {
          background: rgba(255, 255, 255, 0.9);
          border-color: rgba(0, 0, 0, 0.25);
          color: rgba(0, 0, 0, 0.85);
        }
      }
      
      &--theme-primary {
        background: linear-gradient(135deg, #00c8ff, #0096ff);
        border: none;
        color: #fff;
        
        &:hover {
          background: linear-gradient(135deg, #00d4ff, #00a8ff);
          box-shadow: 0 4px 15px rgba(0, 150, 255, 0.4);
        }
      }
    }
  }
  
  .t-dialog__close {
    color: rgba(0, 0, 0, 0.4);
    
    &:hover {
      color: rgba(0, 0, 0, 0.7);
      background: rgba(0, 0, 0, 0.05);
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
    background: rgba(0, 0, 0, 0.03);
    border-color: rgba(0, 0, 0, 0.1);
    color: rgba(0, 0, 0, 0.85);
    border-radius: 10px;
    
    &::placeholder {
      color: rgba(0, 0, 0, 0.35);
    }
    
    &:hover {
      background: rgba(0, 0, 0, 0.05);
      border-color: rgba(0, 0, 0, 0.15);
    }
    
    &:focus {
      border-color: rgba(0, 200, 255, 0.6);
      background: rgba(255, 255, 255, 0.8);
      box-shadow: 0 0 0 3px rgba(0, 200, 255, 0.1);
    }
  }
}

.dialog-textarea {
  :deep(.t-textarea__inner) {
    background: rgba(0, 0, 0, 0.03);
    border-color: rgba(0, 0, 0, 0.1);
    color: rgba(0, 0, 0, 0.85);
    resize: none;
    border-radius: 10px;
    
    &::placeholder {
      color: rgba(0, 0, 0, 0.35);
    }
    
    &:hover {
      background: rgba(0, 0, 0, 0.05);
      border-color: rgba(0, 0, 0, 0.15);
    }
    
    &:focus {
      border-color: rgba(0, 200, 255, 0.6);
      background: rgba(255, 255, 255, 0.8);
      box-shadow: 0 0 0 3px rgba(0, 200, 255, 0.1);
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

// 切换蛋池按钮（固定在头像下方）
.pool-switch-btn {
  position: fixed;
  left: 24px;
  top: 100px;
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  pointer-events: auto;
  z-index: 99;
  transition: all 0.3s ease;
  
  .pool-icon {
    font-size: 14px;
    line-height: 1;
  }
  
  .pool-name-short {
    font-size: 10px;
    color: rgba(41, 49, 63, 0.8);
    margin-top: 2px;
    max-width: 36px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  &:hover {
    background: rgba(255, 255, 255, 0.25);
    box-shadow: 0 6px 30px rgba(0, 0, 0, 0.2);
    transform: translateY(-50%) scale(1.05);
  }
}
.user-avatar {
    z-index:1000;
}

// 蛋池抽屉样式 - 白色磨砂基调
.pool-drawer {
  :deep(.t-drawer__content) {
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(30px);
    -webkit-backdrop-filter: blur(30px);
    border-left: 1px solid rgba(255, 255, 255, 0.5);
  }
  
  :deep(.t-drawer__header) {
    color: rgba(0, 0, 0, 0.85);
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    font-weight: 600;
  }
  
  :deep(.t-drawer__close-btn) {
    color: rgba(0, 0, 0, 0.4);
    
    &:hover {
      color: rgba(0, 0, 0, 0.7);
      background: rgba(0, 0, 0, 0.05);
    }
  }
}

.pool-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pool-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.9);
    border-color: rgba(0, 0, 0, 0.15);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
  }
  
  &.pool-list-item-active {
    background: linear-gradient(135deg, rgba(0, 200, 255, 0.15), rgba(0, 150, 255, 0.1));
    border-color: rgba(0, 200, 255, 0.4);
    box-shadow: 0 4px 15px rgba(0, 150, 255, 0.15);
  }
}

.pool-item-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pool-item-icon {
  font-size: 20px;
}

.pool-item-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pool-item-name {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
}

.pool-item-meta {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.5);
}

.pool-item-owner {
  color: #0096ff;
  font-weight: 500;
}

.pool-item-check {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #00c8ff, #0096ff);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #fff;
}

// ========== iOS 风格 Tooltip 样式 ==========
.ios-tooltip-wrapper {
  position: fixed;
  z-index: 9999;
  pointer-events: none;
}

.ios-tooltip {
  position: relative;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 12px;
  padding: 12px 16px;
  box-shadow: 
    0 4px 20px rgba(0, 0, 0, 0.3),
    0 0 0 0.5px rgba(255, 255, 255, 0.1) inset;
  min-width: 140px;
  max-width: 200px;
}

.ios-tooltip-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ios-tooltip-title {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  line-height: 1.3;
}

.ios-tooltip-meta {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.3;
}

.ios-tooltip-status {
  font-size: 12px;
  font-weight: 500;
  line-height: 1.3;
  margin-top: 2px;
}

.ios-tooltip-arrow {
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid rgba(0, 0, 0, 0.8);
}

// Tooltip 动画
.tooltip-fade-enter-active,
.tooltip-fade-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.tooltip-fade-enter-from,
.tooltip-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -90%) scale(0.95);
}

.tooltip-fade-enter-to,
.tooltip-fade-leave-from {
  opacity: 1;
  transform: translate(-50%, -100%) scale(1);
}

</style>