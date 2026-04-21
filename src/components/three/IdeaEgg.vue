<template>
  <!-- 完整的蛋 -->
  <TresGroup v-if="!isBroken" :position="position">
    <TresMesh
      ref="eggMeshRef"
      :scale="[1, 1.25, 1]"
      cast-shadow
      receive-shadow
      :user-data="eggUserData"
      @click="emit('click', ideaData)"
      @pointer-over="handlePointerOver"
      @pointer-leave="handlePointerLeave"
    >
      <TresSphereGeometry :args="[1, 32, 32]" />
      <TresMeshStandardMaterial
        :color="eggColor"
        :roughness="0.3"
        :metalness="0.1"
        :emissive="emissiveColor"
        :emissive-intensity="emissiveIntensity"
      />
    </TresMesh>
    <!-- 搜索高亮光环 -->
    <TresMesh v-if="isMatched" :scale="[1.15, 1.4, 1.15]">
      <TresSphereGeometry :args="[1, 32, 32]" />
      <TresMeshBasicMaterial
        :color="'#00FFFF'"
        transparent
        :opacity="0.3"
        wireframe
      />
    </TresMesh>
  </TresGroup>

  <!-- 碎片效果 -->
  <TresGroup v-else>
    <TresMesh
      v-for="(fragment, index) in fragments"
      :key="index"
      :position="fragment.position"
      :scale="fragment.scale"
    >
      <TresTetrahedronGeometry :args="[0.3, 0]" />
      <TresMeshBasicMaterial
        :color="eggColor"
        :transparent="true"
        :opacity="fragment.opacity"
      />
    </TresMesh>
  </TresGroup>
</template>

<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import * as THREE from 'three'
import type { Idea } from '@/types'
import { usePhysicsEgg } from '@/composables/usePhysicsEgg'

interface Props {
  ideaData: Idea
  searchKeyword?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  click: [idea: Idea]
  animationComplete: [ideaId: string]
}>()

const isHovered = ref(false)
const isBroken = ref(false)
const eggMeshRef = ref<THREE.Mesh | null>(null)

// 设置 userData 供 Raycaster 识别
const eggUserData = computed(() => ({
  isEgg: true,
  eggData: {
    id: props.ideaData.id,
    title: props.ideaData.title,
    creator: (props.ideaData as any).creator_name || '未知',
    eggStatus: props.ideaData.eggStatus,
    displayColor: props.ideaData.displayColor || eggColor.value
  }
}))

// 监听 mesh 创建，设置 userData
watch(eggMeshRef, (mesh) => {
  if (mesh) {
    mesh.userData = eggUserData.value
  }
}, { immediate: true })

// 指针进入处理
const handlePointerOver = () => {
  isHovered.value = true
}

// 指针离开处理
const handlePointerLeave = () => {
  isHovered.value = false
}

const { position, pausePhysics, resumePhysics, setSensor, setPosition, destroy } = usePhysicsEgg(props.ideaData)

// 悬浮动画
let floatRafId: number | null = null
let startTime: number | null = null
let stablePosition: [number, number, number] | null = null

const startFloatAnimation = () => {
  if (floatRafId) return
  startTime = Date.now()

  const animate = () => {
    const elapsed = Date.now() - (startTime || 0)
    // 2秒周期上下浮动，从 stablePosition 开始浮动
    const progress = (elapsed % 2000) / 2000
    const floatY = Math.sin(progress * Math.PI * 2) * 0.5 // 浮动幅度 0.5

    const basePos = stablePosition || position.value
    setPosition([basePos[0], basePos[1] + floatY, basePos[2]])

    floatRafId = requestAnimationFrame(animate)
  }
  animate()
}

const stopFloatAnimation = () => {
  if (floatRafId) {
    cancelAnimationFrame(floatRafId)
    floatRafId = null
  }
}

// 判断是否匹配搜索（仅在有搜索词时才算匹配）
const isMatched = computed(() => {
  if (!props.searchKeyword?.trim()) return false
  return props.ideaData.title.toLowerCase().includes(props.searchKeyword!.toLowerCase())
})

// 监听匹配状态变化
watch(isMatched, (matched) => {
  if (matched) {
    // 匹配：记录当前位置，暂停物理，设为传感器模式，开始悬浮
    stablePosition = [...position.value]
    pausePhysics()
    setSensor(true)
    startFloatAnimation()
  } else {
    // 不匹配：停止动画，恢复物理（从当前悬浮位置受重力掉落）
    stopFloatAnimation()
    setSensor(false)
    resumePhysics()
  }
})

// 组件卸载时清理
onUnmounted(() => {
  stopFloatAnimation()
})

// 发光颜色
const emissiveColor = computed(() => {
  if (isMatched.value) return '#00FFFF'
  if (isHovered.value) return eggColor.value
  return '#000000'
})

// 发光强度
const emissiveIntensity = computed(() => {
  if (isMatched.value) return 0.5
  if (isHovered.value) return 0.3
  return 0
})

// 碎片数据
const fragments = ref<Array<{
  position: [number, number, number]
  velocity: [number, number, number]
  scale: number
  opacity: number
}>>([])

// 计算蛋颜色 - 优先使用后端返回的颜色
const eggColor = computed(() => {
  // 如果后端返回了 displayColor，直接使用
  if (props.ideaData.displayColor) {
    return props.ideaData.displayColor
  }
  // 否则根据创建时间计算（本地创建的蛋）
  const age = Date.now() - props.ideaData.createTime
  const days = age / (1000 * 60 * 60 * 24) // 转换为天

  if (days >= 5) return '#2B2B2B' // 发黑臭
  if (days >= 4) return '#4E7C3E' // 绿了
  if (days >= 3) return '#A2AD4A' // 黄绿色
  if (days >= 2) return '#FFD700' // 黄色
  return '#FFFFFF' // 一天内白色
})

// 监听状态变化
watch(() => props.ideaData.status, (newStatus) => {
  if (newStatus === 'broken' && !isBroken.value) {
    breakEgg()
  }
})

// 打碎蛋
const breakEgg = () => {
  isBroken.value = true
  
  // 停止悬浮动画
  stopFloatAnimation()
  
  // 销毁物理体（防止碎片动画期间物理体还在运动）
  destroy()
  
  // 播放音效（预留）
  playCrushSound()
  
  // 生成 4-6 个碎片
  const fragmentCount = 4 + Math.floor(Math.random() * 3)
  const currentPos = position.value
  
  fragments.value = Array.from({ length: fragmentCount }, () => ({
    position: [currentPos[0], currentPos[1], currentPos[2]] as [number, number, number],
    velocity: [
      (Math.random() - 0.5) * 0.15,
      Math.random() * 0.15 + 0.05,
      (Math.random() - 0.5) * 0.15
    ] as [number, number, number],
    scale: 0.5 + Math.random() * 0.5,
    opacity: 1
  }))
  
  // 启动碎片动画
  animateFragments()
}

// 动画预留
const playCrushSound = () => {
  // TODO: 添加碎裂音效
}

// 碎片动画
const animateFragments = () => {
  const startTime = Date.now()
  const duration = 2000 // 2秒
  
  const animate = () => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    
    // 更新每个碎片
    fragments.value = fragments.value.map(fragment => {
      // 位置更新（速度 * 时间）
      const newPos: [number, number, number] = [
        fragment.position[0] + fragment.velocity[0],
        fragment.position[1] + fragment.velocity[1],
        fragment.position[2] + fragment.velocity[2]
      ]
      
      // 重力影响
      fragment.velocity[1] -= 0.005
      
      // 渐隐和缩小
      const newOpacity = 1 - progress
      const newScale = fragment.scale * (1 - progress * 0.5)
      
      return {
        ...fragment,
        position: newPos,
        opacity: newOpacity,
        scale: newScale
      }
    })
    
    if (progress < 1) {
      requestAnimationFrame(animate)
    } else {
      // 动画完成，通知父组件删除
      emit('animationComplete', props.ideaData.id)
    }
  }
  
  animate()
}
</script>
