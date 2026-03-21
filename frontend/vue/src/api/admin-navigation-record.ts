import { del, get } from '@/utils/request'
import { unwrapApiResult } from './common'
import type {
  AdminNavigationRecordListPayload,
  AdminNavigationRecordQuery,
  UserId
} from '@/types/user'

export const getAdminNavigationRecordList = async (
  params?: AdminNavigationRecordQuery
): Promise<AdminNavigationRecordListPayload> => {
  const response = await get('/admin/navigation-records/list', params)
  return unwrapApiResult<AdminNavigationRecordListPayload>(response)
}

export const deleteAdminNavigationRecord = async (id: number): Promise<void> => {
  const response = await del(`/admin/navigation-records/${id}`)
  unwrapApiResult(response)
}

export const deleteAdminNavigationRecordsByUser = async (userId: UserId): Promise<number> => {
  const response = await del(`/admin/navigation-records/user/${userId}`)
  const data = unwrapApiResult<{ deletedCount: number }>(response)
  return data.deletedCount || 0
}
