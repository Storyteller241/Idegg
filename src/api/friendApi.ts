// 好友系统 API
import { useUserStore } from '../stores/user'

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api`

// 统一请求封装
async function request<T>(url: string, options?: RequestInit, auth: boolean = false): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

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

// 用户搜索结果
export interface SearchUser {
  id: number
  username: string
  avatar: string | null
  created_at: string
}

// 好友申请
export interface FriendRequest {
  id: number
  from_user_id: number
  from_username: string
  from_avatar: string | null
  to_user_id: number
  status: 0 | 1 | 2 // 0:申请中, 1:已接受, 2:已拒绝
  created_at: string
}

// 好友
export interface Friend {
  id: number
  username: string
  avatar: string | null
  created_at: string
}

// API 方法
export const friendApi = {
  // 搜索用户
  searchUsers(keyword: string): Promise<{ status: string; data: SearchUser[] }> {
    return request<{ status: string; data: SearchUser[] }>(`/users/search?q=${encodeURIComponent(keyword)}`, {}, true)
  },

  // 发送好友申请
  applyFriend(toUserId: number): Promise<{ status: string; message: string }> {
    return request('/friends/apply', {
      method: 'POST',
      body: JSON.stringify({ to_user_id: toUserId }),
    }, true)
  },

  // 获取待处理的好友申请（别人发给我的）
  getPendingRequests(): Promise<{ status: string; data: FriendRequest[] }> {
    return request<{ status: string; data: FriendRequest[] }>('/friends/pending', {}, true)
  },

  // 处理好友申请（接受/拒绝）
  handleRequest(requestId: number, action: 'accept' | 'reject'): Promise<{ status: string; message: string }> {
    return request('/friends/handle', {
      method: 'POST',
      body: JSON.stringify({ request_id: requestId, action }),
    }, true)
  },

  // 获取好友列表
  getFriends(): Promise<{ status: string; data: Friend[] }> {
    return request<{ status: string; data: Friend[] }>('/friends', {}, true)
  },

  // 删除好友
  deleteFriend(friendId: number): Promise<{ status: string; message: string }> {
    return request(`/friends/${friendId}`, {
      method: 'DELETE',
    }, true)
  },
}
