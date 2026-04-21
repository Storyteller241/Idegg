import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface User {
  id: number
  username: string
  avatar?: string | null
  created_at: string
}

export const useUserStore = defineStore('user', () => {
  // State
  const token = ref<string>(localStorage.getItem('idegg_token') || '')
  const user = ref<User | null>(null)
  const isLoading = ref(false)
  
  // Getters
  const isLoggedIn = computed(() => !!token.value && !!user.value)
  
  // Actions
  const setToken = (newToken: string) => {
    token.value = newToken
    localStorage.setItem('idegg_token', newToken)
  }
  
  const setUser = (userData: User | null) => {
    user.value = userData
    if (userData) {
      localStorage.setItem('idegg_user', JSON.stringify(userData))
    } else {
      localStorage.removeItem('idegg_user')
    }
  }
  
  const clearAuth = () => {
    token.value = ''
    user.value = null
    localStorage.removeItem('idegg_token')
    localStorage.removeItem('idegg_user')
  }
  
  // 初始化时从 localStorage 恢复
  const initFromStorage = () => {
    const storedToken = localStorage.getItem('idegg_token')
    const storedUser = localStorage.getItem('idegg_user')
    
    if (storedToken) {
      token.value = storedToken
    }
    
    if (storedUser) {
      try {
        user.value = JSON.parse(storedUser)
      } catch {
        user.value = null
      }
    }
  }
  
  // 登出
  const logout = () => {
    clearAuth()
  }
  
  return {
    token,
    user,
    isLoading,
    isLoggedIn,
    setToken,
    setUser,
    clearAuth,
    initFromStorage,
    logout
  }
})