import axios from 'axios'
import type { AxiosError } from 'axios'
import router from '@/router'
import { clearAuthSession, getStoredToken } from './auth'

const request = axios.create({
  baseURL: 'http://localhost:8080/api',
  timeout: 10000
})

export const API_BASE_URL = 'http://localhost:8080/api'
export const API_ORIGIN = new URL(API_BASE_URL).origin

export const getErrorMessage = (
  error: unknown,
  fallback = '请求失败，请稍后重试'
): string => {
  const axiosError = error as AxiosError<{ message?: string; data?: Record<string, string> }>
  const responseData = axiosError.response?.data

  if (responseData?.message) {
    return responseData.message
  }

  if (responseData?.data) {
    const firstMessage = Object.values(responseData.data)[0]
    if (firstMessage) {
      return firstMessage
    }
  }

  return axiosError.message || fallback
}

request.interceptors.request.use(config => {
  const token = getStoredToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

request.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response?.status === 401) {
      clearAuthSession()
      if (router.currentRoute.value.path !== '/login') {
        void router.push('/login')
      }
    }
    return Promise.reject(error)
  }
)

export const get = (url: string, params?: unknown) => request.get(url, { params })
export const post = (url: string, data?: unknown) => request.post(url, data)
export const put = (url: string, data?: unknown) => request.put(url, data)
export const upload = (url: string, data: FormData) => request.post(url, data)
export const del = (url: string) => request.delete(url)

export const resolveAssetUrl = (value?: string | null, version?: string | number): string => {
  if (!value) return ''
  const rawUrl = /^https?:\/\//i.test(value)
    ? value
    : `${API_ORIGIN}${value.startsWith('/') ? value : `/${value}`}`

  if (version === undefined || version === null || version === '') {
    return rawUrl
  }

  const separator = rawUrl.includes('?') ? '&' : '?'
  return `${rawUrl}${separator}v=${encodeURIComponent(String(version))}`
}

export default request
