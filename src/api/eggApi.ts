// API 接口封装
import { useUserStore } from '../stores/user'

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api`

// 统一请求封装
async function request<T>(url: string, options?: RequestInit, auth: boolean = false): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // 如果需要认证，添加 token
  if (auth) {
    const userStore = useUserStore()
    if (userStore.token) {
      headers['Authorization'] = `Bearer ${userStore.token}`
    }
  }

  const response = await fetch(`${API_BASE_URL}${url}`, {
    headers,
    ...options,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: '请求失败' }))
    throw new Error(error.message || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}

// 评论数据接口
export interface Comment {
  id: number
  content: string
  created_at: string
  user_id: number
  username: string
  avatar: string | null
}

// 蛋的数据接口
export interface EggData {
  id?: number
  user_id?: number
  pool_id?: number
  name: string
  color: string
  pos_x: number
  pos_y: number
  pos_z: number
  created_at?: string
  status?: string
  displayColor?: string
  hours_age?: number
  // 创建者信息
  creator_name?: string
  creator_avatar?: string | null
  // 人类评分信息
  human_score_avg?: string | null
  human_rating_count?: number
  user_has_rated?: boolean
  user_rating?: number | null
}

// 蛋池数据接口
export interface EggPool {
  id: number
  name: string
  type: 'public' | 'private'
  owner_id: number
  owner_name?: string
  created_at: string
  is_owner?: boolean
}

// API 方法
export const eggApi = {
  // 获取所有蛋
  getEggs(): Promise<EggData[]> {
    return request<EggData[]>('/get-eggs')
  },

  // 新增蛋（需要认证）
  addEgg(data: EggData): Promise<{ status: string; id: number }> {
    return request('/add-egg', {
      method: 'POST',
      body: JSON.stringify(data),
    }, true)
  },

  // 获取单个蛋详情（可选认证，用于获取 user_has_rated 字段）
  getEggDetail(id: number): Promise<{ status: string; data: EggData }> {
    return request<{ status: string; data: EggData }>(`/egg/${id}`, {}, true)
  },

  // 删除蛋（需要认证）
  deleteEgg(id: number): Promise<{ status: string; message: string }> {
    return request(`/egg/${id}`, {
      method: 'DELETE',
    }, true)
  },

  // 添加评论（需要认证）
  addComment(eggId: number, content: string): Promise<{ status: string; message: string; commentId: number }> {
    return request(`/egg/${eggId}/comment`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }, true)
  },

  // 获取评论列表
  getComments(eggId: number): Promise<{ status: string; data: Comment[] }> {
    return request<{ status: string; data: Comment[] }>(`/egg/${eggId}/comments`)
  },

  // 删除评论（需要认证，只能删除自己的评论）
  deleteComment(commentId: number): Promise<{ status: string; message: string }> {
    return request(`/comment/${commentId}`, {
      method: 'DELETE',
    }, true)
  },

  // 对蛋进行评分（需要认证）
  rateEgg(eggId: number, score: number): Promise<{
    status: string;
    message: string;
    data: {
      ratingId: number
      score: number
      human_score_avg: string
      human_rating_count: number
    }
  }> {
    return request(`/eggs/${eggId}/rate`, {
      method: 'POST',
      body: JSON.stringify({ score }),
    }, true)
  },

  // ========== 蛋池 (Pool) 相关接口 ==========

  // 获取蛋池列表
  getPools(): Promise<{ status: string; data: EggPool[] }> {
    return request<{ status: string; data: EggPool[] }>('/pools', {}, true)
  },

  // 创建蛋池
  createPool(name: string, type: 'public' | 'private'): Promise<{
    status: string;
    message: string;
    data: {
      id: number
      name: string
      type: string
      owner_id: number
    }
  }> {
    return request('/pools', {
      method: 'POST',
      body: JSON.stringify({ name, type }),
    }, true)
  },

  // 邀请用户加入蛋池
  inviteToPool(poolId: number, username: string): Promise<{
    status: string;
    message: string;
    data: {
      pool_id: number
      user_id: number
      username: string
    }
  }> {
    return request(`/pools/${poolId}/invite`, {
      method: 'POST',
      body: JSON.stringify({ username }),
    }, true)
  },

  // 获取蛋池成员列表
  getPoolMembers(poolId: number): Promise<{
    status: string;
    data: Array<{
      id: number
      username: string
      avatar: string | null
      joined_at: string
      is_owner: boolean
    }>
  }> {
    return request(`/pools/${poolId}/members`, {}, true)
  },

  // 离开蛋池
  leavePool(poolId: number): Promise<{ status: string; message: string }> {
    return request(`/pools/${poolId}/members`, {
      method: 'DELETE',
    }, true)
  },

  // 获取指定蛋池的蛋列表（带时间戳防止缓存）
  getEggsByPool(poolId: number): Promise<EggData[]> {
    return request<EggData[]>(`/get-eggs?pool_id=${poolId}&t=${Date.now()}`, {}, true)
  },
}
