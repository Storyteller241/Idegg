import { ref, onMounted, onUnmounted } from 'vue'
import * as CANNON from 'cannon-es'
import { createEggBody, getWorld } from './usePhysics'
import type { Idea } from '@/types'

/**
 * 物理蛋的 composable
 * 将 Three.js 的 TresMesh 与 Cannon.js 的刚体绑定
 */
export function usePhysicsEgg(idea: Idea) {
  const position = ref<[number, number, number]>([0, 0, 0])
  let body: CANNON.Body | null = null
  let rafId: number | null = null
  let isDestroyed = false
  let basePosition: [number, number, number] = [0, 0, 0]
  let originalMass = 1

  // 同步物理体到渲染
  const sync = () => {
    if (!body || isDestroyed) return
    // 动态或静态都同步位置
    position.value = [body.position.x, body.position.y, body.position.z]
  }

  // 启动同步循环
  const startSync = () => {
    const loop = () => {
      sync()
      if (!isDestroyed) {
        rafId = requestAnimationFrame(loop)
      }
    }
    loop()
  }

  // 获取基础位置（用于悬浮动画）
  const getBasePosition = () => basePosition

  // 设置位置（用于悬浮动画）
  const setPosition = (pos: [number, number, number]) => {
    position.value = pos
    if (body) {
      body.position.set(pos[0], pos[1], pos[2])
    }
  }

  // 销毁物理体
  const destroy = () => {
    isDestroyed = true
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    if (body && getWorld()) {
      getWorld()?.removeBody(body)
      body = null
    }
  }

  // 暂停物理（用于匹配搜索时悬浮）
  const pausePhysics = () => {
    if (!body || isDestroyed) return
    // 保存当前质量，设为静态（质量为0），脱离重力
    if (body.mass > 0) {
      originalMass = body.mass
    }
    body.mass = 0
    body.updateMassProperties()
    body.velocity.set(0, 0, 0)
    body.angularVelocity.set(0, 0, 0)
    body.sleep()
  }

  // 设为传感器模式（用于悬浮期间不顶飞其他蛋）
  const setSensor = (isSensor: boolean) => {
    if (!body || isDestroyed) return
    // 传感器模式：参与碰撞检测但不产生响应（不会推开其他物体）
    body.collisionResponse = !isSensor
  }

  // 恢复物理（从不匹配状态恢复时调用，从当前位置受重力掉落）
  const resumePhysics = () => {
    if (!body || isDestroyed) return
    // 恢复为动态物体，恢复碰撞响应
    body.mass = originalMass
    body.updateMassProperties()
    body.collisionResponse = true
    body.wakeUp()
  }

  onMounted(() => {
    if (isDestroyed) return
    
    const world = getWorld()
    if (!world) return

    // 生成位置：Y 轴设为 6（从高处掉落）
    const dropPosition: [number, number, number] = [
      idea.position[0] + (Math.random() - 0.5) * 0.5,
      6,
      idea.position[2] + (Math.random() - 0.5) * 0.5,
    ]

    try {
      body = createEggBody(dropPosition)
      originalMass = body.mass
      basePosition = [...dropPosition]

      // 添加初始扰动：随机旋转
      const randomRotation = new CANNON.Quaternion()
      randomRotation.setFromEuler(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      )
      body.quaternion.copy(randomRotation)

      // 添加初始扰动：微小的水平力
      body.velocity.set(
        (Math.random() - 0.5) * 0.5,
        0,
        (Math.random() - 0.5) * 0.5
      )

      // 添加初始角速度
      body.angularVelocity.set(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      )

      startSync()
    } catch (e) {
      console.error('Failed to create egg body:', e)
    }
  })

  onUnmounted(() => {
    destroy()
  })

  return { position, pausePhysics, resumePhysics, setSensor, getBasePosition, setPosition, destroy }
}
