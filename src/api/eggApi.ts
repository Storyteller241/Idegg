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
    // 401/403 表示 token 过期或无效，清除登录态
    if (response.status === 401 || response.status === 403) {
      const userStore = useUserStore()
      userStore.logout()
    }
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
  membership_type?: 'owner' | 'member' | 'public' // 我创建的 / 我加入的 / 公共
}

// 分类的蛋池列表
export interface CategorizedPools {
  my_created: EggPool[]
  my_joined: EggPool[]
  public: EggPool[]
}

// API 方法
export const eggApi = {
  // 获取所有蛋（需要认证，带时间戳防缓存）
  getEggs(): Promise<EggData[]> {
    return request<EggData[]>(`/get-eggs?t=${Date.now()}`, {}, true)
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

  // 获取蛋池列表（包含分类数据）
  getPools(): Promise<{ status: string; data: EggPool[]; categorized: CategorizedPools }> {
    return request<{ status: string; data: EggPool[]; categorized: CategorizedPools }>('/pools', {}, true)
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

  // ========== AI 分析接口 ==========

  // 获取缓存的 AI 分析结果
  getCachedAnalysis(eggId: number): Promise<{
    status: string
    data: {
      content: string
      created_at: string
      is_stale: boolean
    } | null
  }> {
    return request<{ status: string; data: { content: string; created_at: string; is_stale: boolean } | null }>(
      `/eggs/${eggId}/analysis`, {}, true
    )
  },

  /**
   * AI 分析蛋 - SSE 流式输出
   * @param eggId 蛋的 ID
   * @param onChunk 每收到一段文字时的回调
   * @param onDone 完成时的回调
   * @param onError 错误时的回调
   * @returns AbortController，可用于取消请求
   */
  analyzeEgg(
    eggId: number,
    onChunk: (text: string) => void,
    onDone: () => void,
    onError: (error: string) => void
  ): AbortController {
    const controller = new AbortController()
    const userStore = useUserStore()
    const token = userStore.token

    fetch(`${API_BASE_URL}/eggs/${eggId}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: '请求失败' }))
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error('无法读取响应流')

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // 解析 SSE 数据
          const lines = buffer.split('\n')
          buffer = lines.pop() || '' // 保留不完整的行

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim()

              if (data === '[DONE]') {
                onDone()
                return
              }

              try {
                const parsed = JSON.parse(data)
                if (parsed.content) {
                  onChunk(parsed.content)
                }
                if (parsed.error) {
                  onError(parsed.error)
                  return
                }
              } catch {
                // 解析失败，跳过
              }
            }
          }
        }

        onDone()
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          onError(error.message || 'AI 分析请求失败')
        }
      })

    return controller
  },
}
