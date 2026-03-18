import type { AuthUserInfo } from '@/types/user'

export const AUTH_TOKEN_KEY = 'token'
export const AUTH_USER_INFO_KEY = 'userInfo'
export const AUTH_CHANGED_EVENT = 'admin-auth-changed'

const isBrowser = typeof window !== 'undefined'

const emitAuthChanged = () => {
  if (isBrowser) {
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT))
  }
}

const parseUserInfo = (raw: string | null): AuthUserInfo | null => {
  if (!raw) return null

  try {
    return JSON.parse(raw) as AuthUserInfo
  } catch {
    return null
  }
}

export const getStoredToken = (): string | null => {
  if (!isBrowser) return null
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

export const getStoredUserInfo = (): AuthUserInfo | null => {
  if (!isBrowser) return null
  return parseUserInfo(localStorage.getItem(AUTH_USER_INFO_KEY))
}

export const setAuthSession = (token: string, userInfo: AuthUserInfo | null) => {
  if (!isBrowser) return
  localStorage.setItem(AUTH_TOKEN_KEY, token)
  if (userInfo) {
    localStorage.setItem(AUTH_USER_INFO_KEY, JSON.stringify(userInfo))
  } else {
    localStorage.removeItem(AUTH_USER_INFO_KEY)
  }
  emitAuthChanged()
}

export const clearAuthSession = () => {
  if (!isBrowser) return
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(AUTH_USER_INFO_KEY)
  emitAuthChanged()
}
