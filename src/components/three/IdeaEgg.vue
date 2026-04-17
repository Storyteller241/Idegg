<template>
  <TresGroup :position="position">
    <!-- 主蛋体 - Y轴拉长的球体 -->
    <TresMesh
      ref="eggMesh"
      :scale="[1, 1.25, 1]"
      cast-shadow
      receive-shadow
      @click="handleClick"
      @pointer-over="handleHover"
      @pointer-leave="handleLeave"
    >
      <TresSphereGeometry :args="[1, 32, 32]" />
      <TresMeshStandardMaterial
        :color="eggColor"
        :roughness="0.3"
        :metalness="0.1"
        :emissive="isHovered ? eggColor : '#000000'"
        :emissive-intensity="isHovered ? 0.3 : 0"
      />
    </TresMesh>
  </TresGroup>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import * as CANNON from 'cannon-es'
import type { Idea } from '@/types'
import { usePhysicsEgg } from '@/composables/usePhysicsEgg'

// Props
interface Props {
  ideaData: Idea
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  click: [idea: Idea]
}>()

// 状态
const isHovered = ref(false)
const eggMesh = ref<any>(null)

// 物理系统
const { position, rotation, init, startSync } = usePhysicsEgg(props.ideaData)

// 初始化物理体并同步
onMounted(() => {
  init()
  startSync()
})

// 监听四元数旋转变化，应用到 mesh
watch(rotation, (newRotation) => {
  // 四元数 [x, y, z, w] 转换为欧拉角
  if (eggMesh.value && newRotation) {
    const quaternion = new CANNON.Quaternion(
      newRotation[0],
      newRotation[1],
      newRotation[2],
      newRotation[3]
    )
    // 转换为欧拉角
    const euler = new CANNON.Vec3()
    quaternion.toEuler(euler)
    eggMesh.value.rotation.set(euler.x, euler.y, euler.z)
  }
}, { deep: true })

// 根据创建时间计算颜色
const eggColor = computed(() => {
  const now = Date.now()
  const age = now - props.ideaData.createTime
  const oneMinute = 60 * 1000
  const fiveMinutes = 5 * 60 * 1000

  if (age < oneMinute) {
    return '#FFFFFF'
  } else if (age < fiveMinutes) {
    return '#FFFFE0'
  } else {
    return '#556B2F'
  }
})

// 事件处理
const handleClick = () => {
  emit('click', props.ideaData)
}

const handleHover = () => {
  isHovered.value = true
}

const handleLeave = () => {
  isHovered.value = false
}
</script>
