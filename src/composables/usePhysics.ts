import { onMounted, onUnmounted } from 'vue'
import * as CANNON from 'cannon-es'

// 物理世界实例
let world: CANNON.World | null = null
let animationId: number | null = null

// 物理材质
let eggMaterial: CANNON.Material | null = null
let groundMaterial: CANNON.Material | null = null

// 初始化物理世界
export function initPhysics() {
  if (world) return world

  world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.81, 0), // 重力向下
    allowSleep: true, // 启用休眠机制
  })

  // 配置世界级别的阻尼（空气阻力）
  world.defaultContactMaterial.contactEquationStiffness = 1e7
  world.defaultContactMaterial.contactEquationRelaxation = 3

  // 创建物理材质
  eggMaterial = new CANNON.Material('egg')
  groundMaterial = new CANNON.Material('ground')

  // 蛋与地面的接触材质：低摩擦、中等弹性
  const eggGroundContact = new CANNON.ContactMaterial(
    eggMaterial,
    groundMaterial,
    {
      friction: 0.1,        // 低摩擦力，让蛋能滚动
      restitution: 0.4,     // 中等弹性，轻微弹跳
      contactEquationStiffness: 1e8,
      contactEquationRelaxation: 3,
    }
  )
  world.addContactMaterial(eggGroundContact)

  // 蛋与蛋的接触材质
  const eggEggContact = new CANNON.ContactMaterial(
    eggMaterial,
    eggMaterial,
    {
      friction: 0.15,
      restitution: 0.35,
    }
  )
  world.addContactMaterial(eggEggContact)

  // 创建地面
  createGround()

  // 启动物理循环
  startPhysicsLoop()

  return world
}

// 创建地面
function createGround() {
  if (!world) return

  const groundBody = new CANNON.Body({
    type: CANNON.Body.STATIC,
    shape: new CANNON.Plane(),
    material: groundMaterial || undefined,
  })
  groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
  groundBody.position.set(0, -2, 0) // 地面在 y = -2
  world.addBody(groundBody)

  // 创建边界墙（防止蛋滚太远）
  const wallHeight = 2
  const wallThickness = 0.5
  const wallDistance = 10

  // 后墙
  const backWall = new CANNON.Body({
    type: CANNON.Body.STATIC,
    shape: new CANNON.Box(new CANNON.Vec3(15, wallHeight, wallThickness)),
  })
  backWall.position.set(0, 0, -wallDistance)
  world.addBody(backWall)

  // 前墙
  const frontWall = new CANNON.Body({
    type: CANNON.Body.STATIC,
    shape: new CANNON.Box(new CANNON.Vec3(15, wallHeight, wallThickness)),
  })
  frontWall.position.set(0, 0, wallDistance)
  world.addBody(frontWall)

  // 左墙
  const leftWall = new CANNON.Body({
    type: CANNON.Body.STATIC,
    shape: new CANNON.Box(new CANNON.Vec3(wallThickness, wallHeight, 15)),
  })
  leftWall.position.set(-wallDistance, 0, 0)
  world.addBody(leftWall)

  // 右墙
  const rightWall = new CANNON.Body({
    type: CANNON.Body.STATIC,
    shape: new CANNON.Box(new CANNON.Vec3(wallThickness, wallHeight, 15)),
  })
  rightWall.position.set(wallDistance, 0, 0)
  world.addBody(rightWall)
}

// 创建蛋的物理体
export function createEggBody(position: [number, number, number]): CANNON.Body {
  if (!world) {
    throw new Error('Physics world not initialized')
  }

  // 使用椭球体来模拟拉长的蛋
  // 创建一个球体，但在 Y 轴方向拉长
  const shape = new CANNON.Sphere(1)
  
  const body = new CANNON.Body({
    mass: 1, // 质量为 1kg
    shape: shape,
    position: new CANNON.Vec3(...position),
    material: eggMaterial || undefined,
  })

  // 添加阻尼（空气阻力），让蛋能自然停止
  body.linearDamping = 0.01   // 线性阻尼，减缓平移速度
  body.angularDamping = 0.1   // 角阻尼，减缓旋转速度

  // 启用睡眠模式优化性能
  body.allowSleep = true
  body.sleepSpeedLimit = 0.05  // 速度低于此值时进入休眠
  body.sleepTimeLimit = 0.3    // 持续低于速度阈值的时间

  world.addBody(body)
  return body
}

// 启动物理循环
function startPhysicsLoop() {
  const timeStep = 1 / 60

  const tick = () => {
    if (world) {
      world.step(timeStep)
    }
    animationId = requestAnimationFrame(tick)
  }

  tick()
}

// 销毁物理世界
export function destroyPhysics() {
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
  world = null
}

// 获取物理世界实例
export function getWorld() {
  return world
}
