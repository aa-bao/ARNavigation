import { get, post, put, upload } from '@/utils/request'
import { unwrapApiResult } from './common'
import type { AuthUserInfo, LoginRequest, LoginResponse } from '@/types/user'

interface AvatarUploadResponse {
  avatarUrl: string
}

export const adminLogin = async (payload: LoginRequest): Promise<LoginResponse> => {
  const response = await post('/user/admin/login', payload)
  return unwrapApiResult<LoginResponse>(response)
}

export const fetchCurrentUser = async (): Promise<AuthUserInfo> => {
  const response = await get('/user/info')
  return unwrapApiResult<AuthUserInfo>(response)
}

export const requestLogout = async (): Promise<void> => {
  const response = await post('/user/logout')
  unwrapApiResult(response)
}

export const uploadUserAvatar = async (file: File): Promise<AvatarUploadResponse> => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await upload('/user/avatar', formData)
  return unwrapApiResult<AvatarUploadResponse>(response)
}

export const updateMyAvatar = async (avatarUrl: string): Promise<AuthUserInfo> => {
  const response = await put('/user/profile/avatar', { avatarUrl })
  return unwrapApiResult<AuthUserInfo>(response)
}
