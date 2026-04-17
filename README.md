# Idea Egg Space - 3D 创意协作空间

一个极简、大气的 3D Idea 协作空间。核心隐喻是 "Idea 蛋"，通过代码驱动的材质变化来展示点子的生命周期。

## 技术栈

- **前端框架**: Vue 3 (Composition API) + TypeScript
- **构建工具**: Vite
- **3D 引擎**: TresJS (Vue 生态下的 Three.js 封装)
- **UI 组件**: TDesign (tdesign-vue-next)
- **样式**: Less

## 项目结构

```
/Users/amdd/Desktop/idea/
├── src/
│   ├── components/
│   │   ├── three/          # 3D 相关组件
│   │   │   └── IdeaEgg.vue    # Idea 蛋 3D 组件
│   │   └── ui/             # 业务 UI 组件
│   │       └── IdeaDetailCard.vue  # Idea 详情弹窗
│   ├── hooks/              # 逻辑封装
│   │   ├── useEggAnimation.ts    # 蛋动画 Hook
│   │   └── useIdeaStore.ts       # Idea 状态管理
│   ├── services/           # 服务层
│   │   └── aiService.ts    # AI 模拟接口
│   ├── styles/             # 全局样式
│   │   └── global.less     # 全局 Less 样式
│   ├── types/              # 类型定义
│   │   └── index.ts        # 全局类型定义
│   ├── App.vue             # 根组件
│   ├── main.ts             # 入口文件
│   └── vite-env.d.ts       # Vite 类型声明
├── index.html              # HTML 模板
├── package.json            # 项目依赖
├── tsconfig.json           # TypeScript 配置
├── tsconfig.node.json      # Node 端 TS 配置
└── vite.config.ts          # Vite 配置
```

## 核心功能

### 1. IdeaEgg.vue (3D 组件)

几何体: `SphereGeometry`，通过 scale 属性在 Y 轴拉长 `[1, 1.25, 1]`

**状态与材质:**

| Level | 状态 | 颜色 | Roughness |
|-------|------|------|-----------|
| 0 | Fresh (新鲜) | `#FFFFFF` | 0.1 |
| 1 | Aging (成熟中) | `#FFFFFF` → `#FFFFE0` 插值 | 0.3 |
| 2 | Spoiled (过期) | `#556B2F` (墨绿) | 0.8 |
| 3 | Incubated (已孵化) | `#FFFFFF` + 青色线框 | 0.2 |

### 2. AI 分析模块

位于 `src/services/aiService.ts`，当前为 Mock 实现：

- 点击"分析"延迟 1.5 秒模拟网络请求
- 随机返回 `feasibilityScore` (0-100) 和 `tags`
- 预留标记: `// TODO: Integrate SiliconFlow API`

### 3. 状态管理

`useIdeaStore` 管理 Idea 的：
- 创建、读取、删除
- 自动状态更新（根据时间）
- localStorage 持久化
- AI 分析触发

## 启动项目

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 生产构建
npm run build

# 预览生产构建
npm run preview
```

## 开发规范

- **Zero-Assets**: 严禁使用任何外部图片、贴图或 .obj 模型
- **Shader-Free**: 优先使用 Three.js 标准材质属性
- **TypeScript**: 所有数据接口必须有严格的 interface 定义
- **组件解耦**: 控制每个组件代码量，保持简洁

## 物理效果

使用 **Cannon.js** 物理引擎实现蛋的掉落和堆积效果：

### 物理参数优化

- **重力**: `[0, -9.81, 0]` 模拟真实重力
- **碰撞体**: 每个蛋有球形碰撞体，会互相碰撞
- **地面**: 静态平面，防止蛋无限掉落
- **边界墙**: 四面隐形墙，防止蛋滚出视野

### 材质与阻尼

- **摩擦力 (Friction)**: `0.1` - 低摩擦让蛋能滚动
- **弹性 (Restitution)**: `0.4` - 中等弹性，轻微弹跳
- **线性阻尼 (Linear Damping)**: `0.01` - 减缓平移速度
- **角阻尼 (Angular Damping)**: `0.1` - 减缓旋转速度

### 初始扰动

每个新蛋生成时具有：
- **随机旋转**: 初始随机角度，落地时重心不稳
- **微小水平速度**: X/Z 轴随机速度 (-0.25 到 0.25)
- **初始角速度**: 让蛋旋转着落下

### 休眠机制

- **Sleep Speed Limit**: `0.05` - 速度低于此值进入休眠
- **Sleep Time Limit**: `0.3` - 持续低于阈值的时间
- **Allow Sleep**: 停止运动后自动休眠，节省性能

## 待实现功能

- [ ] Socket.io 协作同步
- [ ] SiliconFlow API 接入
- [ ] 朋友 Idea 边缘发光效果
- [ ] 更多交互动画
