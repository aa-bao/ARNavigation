import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { adminLogin, fetchCurrentUser as fetchCurrentUserApi, requestLogout } from '@/api/user'
import type { AuthUserInfo, LoginRequest } from '@/types/user'
import {
  AUTH_CHANGED_EVENT,
  clearAuthSession,
  getStoredToken,
  getStoredUserInfo,
  setAuthSession
} from '@/utils/auth'

export const useUserStore = defineStore('user', () => {
  const token = ref<string | null>(getStoredToken())
  const userInfo = ref<AuthUserInfo | null>(getStoredUserInfo())
  const isLoggedIn = computed(() => !!token.value)

  const syncAuthState = () => {
    token.value = getStoredToken()
    userInfo.value = getStoredUserInfo()
  }

  if (typeof window !== 'undefined') {
    window.addEventListener(AUTH_CHANGED_EVENT, syncAuthState)
  }

  const login = async (payload: LoginRequest) => {
    const response = await adminLogin(payload)
    setAuthSession(response.token, response.userInfo)
    syncAuthState()
    return response
  }

  const fetchCurrentUser = async () => {
    const response = await fetchCurrentUserApi()
    userInfo.value = response
    if (token.value) {
      setAuthSession(token.value, response)
    }
    return response
  }

  const logout = async () => {
    try {
      await requestLogout()
    } finally {
      clearAuthSession()
      syncAuthState()
    }
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    login,
    fetchCurrentUser,
    logout
  }
})
