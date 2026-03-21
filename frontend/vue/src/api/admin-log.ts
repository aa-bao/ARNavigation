import { del, get, post } from '@/utils/request'
import { unwrapApiResult } from './common'
import type {
  AdminOperationLogCreatePayload,
  AdminOperationLogListPayload,
  AdminOperationLogQuery
} from '@/types/operation-log'

export const createAdminOperationLog = async (payload: AdminOperationLogCreatePayload) => {
  const response = await post('/admin/logs', payload)
  return unwrapApiResult(response)
}

export const getAdminOperationLogList = async (params?: AdminOperationLogQuery): Promise<AdminOperationLogListPayload> => {
  const response = await get('/admin/logs/list', params)
  return unwrapApiResult<AdminOperationLogListPayload>(response)
}

export const clearAdminOperationLogs = async (): Promise<void> => {
  const response = await del('/admin/logs/clear')
  unwrapApiResult(response)
}
