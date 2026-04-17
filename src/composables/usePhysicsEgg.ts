import { ref, onUnmounted } from 'vue'
import * as CANNON from 'cannon-es'
import { createEggBody, getWorld } from './usePhysics'
import type { Idea } from '@/types'

/**
 * 物理蛋的 composable
 * 将 Three.js 的 TresMesh 与 Cannon.js 的刚体绑定
 */
export function usePhysicsEgg(idea: Idea) {
  const position = ref<[number, number, number]>([...idea.position])
  // 四元数旋转 [x, y, z, w]
  const rotation = ref<[number, number, number, number]>([0, 0, 0, 1])

  let body: CANNON.Body | null = null

  // 初始化物理体
  const init = () => {
    // 生成位置：Y 轴设为 8（从高处掉落）
    const dropPosition: [number, number, number] = [
      idea.position[0] + (Math.random() - 0.5) * 0.5, // X 略微随机偏移
      8, // 从高处掉落
      idea.position[2] + (Math.random() - 0.5) * 0.5, // Z 略微随机偏移
    ]

    body = createEggBody(dropPosition)

    // 添加初始扰动：随机旋转
    const randomRotation = new CANNON.Quaternion()
    randomRotation.setFromEuler(
      Math.random() * Math.PI, // 随机 X 轴旋转
      Math.random() * Math.PI, // 随机 Y 轴旋转
      Math.random() * Math.PI  // 随机 Z 轴旋转
    )
    body.quaternion.copy(randomRotation)

    // 添加初始扰动：微小的水平力（velocity）
    // 这样落地时重心不稳，会产生滚动趋势
    body.velocity.set(
      (Math.random() - 0.5) * 0.5,  // X 方向微小速度 (-0.25 到 0.25)
      0,                            // Y 方向初始为 0（自由落体）
      (Math.random() - 0.5) * 0.5   // Z 方向微小速度 (-0.25 到 0.25)
    )

    // 添加初始角速度，让蛋旋转起来
    body.angularVelocity.set(
      (Math.random() - 0.5) * 2,  // X 轴角速度
      (Math.random() - 0.5) * 2,  // Y 轴角速度
      (Math.random() - 0.5) * 2   // Z 轴角速度
    )

    // 监听物理体的位置变化
    body.addEventListener('collide', () => {
      // 碰撞时的回调，可以用来播放音效等
    })
  }

  // 同步物理体到渲染
  const sync = () => {
    if (!body) return

    position.value = [body.position.x, body.position.y, body.position.z]
    // 四元数旋转 [x, y, z, w]
    rotation.value = [
      body.quaternion.x,
      body.quaternion.y,
      body.quaternion.z,
      body.quaternion.w,
    ]
  }

  // 每帧同步
  const startSync = () => {
    const loop = () => {
      sync()
      requestAnimationFrame(loop)
    }
    loop()
  }

  // 清理
  const destroy = () => {
    if (body && getWorld()) {
      getWorld()?.removeBody(body)
      body = null
    }
  }

  onUnmounted(() => {
    destroy()
  })

  return {
    position,
    rotation,
    init,
    startSync,
    destroy,
  }
}
