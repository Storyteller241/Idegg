// Idea 数据结构（简化版）
export interface Idea {
  id: string
  title: string
  createTime: number
  position: [number, number, number]
}

// 蛋的颜色状态
export enum EggColorState {
  Fresh = '#FFFFFF',     // 新鲜 - 纯白
  Aging = '#FFFFE0',     // 成熟中 - 淡黄
  Spoiled = '#556B2F'    // 过期 - 墨绿
}

// 3D 位置
export type Position = [number, number, number]
