import { useUserStore } from '../stores/user'

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api`

export interface UserProfile {
  id: number
  username: string
  avatar: string | null
  skills: string[]
  bio: string | null
  created_at: string
  updated_at: string
}

export interface UpdateProfileData {
  username?: string
  avatar?: string
  skills?: string[]
  bio?: string
  currentPassword?: string
  newPassword?: string
}

export interface ApiResponse<T = unknown> {
  status: string
  message?: string
  data?: T
}

// 获取用户资料
export const getUserProfile = async (): Promise<UserProfile> => {
  const userStore = useUserStore()

  const response = await fetch(`${API_BASE_URL}/user/profile`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${userStore.token}`
    }
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || '获取用户资料失败')
  }

  return result.data
}

// 更新用户资料
export const updateUserProfile = async (data: UpdateProfileData): Promise<ApiResponse> => {
  const userStore = useUserStore()

  const response = await fetch(`${API_BASE_URL}/user/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userStore.token}`
    },
    body: JSON.stringify(data)
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || '更新资料失败')
  }

  return result
}
