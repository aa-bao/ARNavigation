import { get, post, put } from '@/utils/request'
import { unwrapApiResult } from './common'
import type {
  AdminUserCreatePayload,
  AdminUserListPayload,
  AdminUserQuery,
  AdminUserRecord,
  AdminUserUpdatePayload,
  UserId,
  UserStatus
} from '@/types/user'

export const getAdminUserList = async (params?: AdminUserQuery): Promise<AdminUserListPayload> => {
  const response = await get('/admin/users/list', params)
  return unwrapApiResult<AdminUserListPayload>(response)
}

export const createAdminUser = async (payload: AdminUserCreatePayload): Promise<AdminUserRecord> => {
  const response = await post('/admin/users', payload)
  return unwrapApiResult<AdminUserRecord>(response)
}

export const updateAdminUser = async (
  id: UserId,
  payload: AdminUserUpdatePayload
): Promise<AdminUserRecord> => {
  const response = await put(`/admin/users/${id}`, payload)
  return unwrapApiResult<AdminUserRecord>(response)
}

export const updateAdminUserStatus = async (
  id: UserId,
  status: UserStatus
): Promise<AdminUserRecord> => {
  const response = await put(`/admin/users/${id}/status`, { status })
  return unwrapApiResult<AdminUserRecord>(response)
}

export const resetAdminUserPassword = async (id: UserId, newPassword = '123456'): Promise<void> => {
  const response = await put(`/admin/users/${id}/password/reset`, { newPassword })
  unwrapApiResult(response)
}

export const changeAdminUserPassword = async (id: UserId, newPassword: string): Promise<void> => {
  const response = await put(`/admin/users/${id}/password`, { newPassword })
  unwrapApiResult(response)
}
