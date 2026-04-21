// Idea 数据结构
export interface Idea {
  id: string
  dbId?: number  // 数据库ID
  title: string
  content?: string
  createTime: number
  position: [number, number, number]
  status: 'active' | 'broken'
  displayColor?: string  // 后端返回的颜色
  eggStatus?: string     // 后端返回的状态
}

// 人类评分数据
export interface HumanRating {
  score: number          // 当前用户的评分（如果已评）
  average: number | null // 平均分
  count: number          // 评分人数
  hasRated: boolean      // 当前用户是否已评分
}

// 蛋的颜色状态
export enum EggColorState {
  Fresh = '#FFFFFF',     // 新鲜 - 纯白
  Aging = '#FFFFE0',     // 成熟中 - 淡黄
  Spoiled = '#556B2F'    // 过期 - 墨绿
}

// 3D 位置
export type Position = [number, number, number]
