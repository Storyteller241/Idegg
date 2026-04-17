<template>
  <div class="app-container">
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
          <TresPlaneGeometry :args="[50, 50]" />
          <TresMeshStandardMaterial
            :color="'#a1c6e7'"
            :roughness="0.8"
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

        <!-- Idea 蛋池 -->
        <IdeaEgg
          v-for="idea in ideas"
          :key="idea.id"
          :idea-data="idea"
          @click="handleEggClick(idea)"
        />
        
        <!-- 轨道控制器 -->
        <OrbitControls
          enable-damping
          :damping-factor="0.05"
          :min-distance="5"
          :max-distance="40"
        />
      </TresCanvas>
    </div>

    <!-- UI 覆盖层 -->
    <div class="ui-overlay">
      <!-- 顶部输入区 -->
      <div class="input-section">
        <div class="input-wrapper">
          <t-input
            v-model="newIdeaTitle"
            placeholder="输入你的 Idea，按回车创建..."
            size="large"
            clearable
            @enter="handleCreateIdea"
          />
        </div>
      </div>

      <!-- 右上角提示 -->
      <div class="hint-text">
        已创建 {{ ideas.length }} 个 Idea
      </div>
    </div>

    <!-- Idea 详情弹窗 -->
    <IdeaDetailCard
      v-if="selectedIdea"
      v-model:visible="detailVisible"
      :idea="selectedIdea"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { TresCanvas } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'
import IdeaEgg from './components/three/IdeaEgg.vue'
import IdeaDetailCard from './components/ui/IdeaDetailCard.vue'
import { initPhysics, destroyPhysics } from './composables/usePhysics'
import type { Idea } from './types'

// Canvas 配置
const canvasConfig = {
  alpha: true,
  antialias: true,
  shadows: true,
  clearColor: '#F5F5F7' // 深蓝色背景，比纯黑更柔和，能看清远处
}

// 状态
const newIdeaTitle = ref('')
const ideas = ref<Idea[]>([])
const detailVisible = ref(false)
const selectedIdea = ref<Idea | null>(null)

// 初始化物理世界
onMounted(() => {
  initPhysics()
})

onUnmounted(() => {
  destroyPhysics()
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
const handleCreateIdea = () => {
  const title = newIdeaTitle.value.trim()
  if (!title) return
  
  const idea: Idea = {
    id: generateId(),
    title: title,
    createTime: Date.now(),
    position: generateRandomPosition()
  }
  
  ideas.value.push(idea)
  newIdeaTitle.value = ''
}

// 点击蛋
const handleEggClick = (idea: Idea) => {
  selectedIdea.value = idea
  detailVisible.value = true
}
</script>

<style lang="less" scoped>
.app-container {
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

.input-section {
  pointer-events: auto;
  display: flex;
  justify-content: center;
  padding-top: 20px;
}

.input-wrapper {
  width: 400px;
  background: rgba(20, 20, 20, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  padding: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.hint-text {
  position: absolute;
  top: 24px;
  right: 24px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  pointer-events: auto;
}
</style>
