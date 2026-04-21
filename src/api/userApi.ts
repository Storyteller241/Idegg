import type { User } from '../stores/user'

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api`

export interface LoginData {
  username: string
  password: string
}

export interface RegisterData {
  username: string
  password: string
}

export interface ApiResponse<T = unknown> {
  status: string
  message?: string
  data?: T
  token?: string
  user?: User
}

// 登录
export const login = async (data: LoginData): Promise<ApiResponse> => {
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
  
  const result = await response.json()
  
  if (!response.ok) {
    throw new Error(result.message || '登录失败')
  }
  
  return result
}

// 注册
export const register = async (data: RegisterData): Promise<ApiResponse> => {
  const response = await fetch(`${API_BASE_URL}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
  
  const result = await response.json()
  
  if (!response.ok) {
    throw new Error(result.message || '注册失败')
  }
  
  return result
}

// 获取当前用户信息（需要token）
export const getCurrentUser = async (token: string): Promise<ApiResponse> => {
  const response = await fetch(`${API_BASE_URL}/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  const result = await response.json()
  
  if (!response.ok) {
    throw new Error(result.message || '获取用户信息失败')
  }
  
  return result
}