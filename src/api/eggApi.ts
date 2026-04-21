// API 接口封装
import { useUserStore } from '../stores/user'

const API_BASE_URL = 'http://101.133.231.222:3000/api'
// const API_BASE_URL = 'http://localhost:3000/api'

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
}
