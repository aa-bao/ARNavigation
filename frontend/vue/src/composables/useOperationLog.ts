import { ref } from 'vue'
import { clearAdminOperationLogs, createAdminOperationLog, getAdminOperationLogList } from '@/api/admin-log'
import type {
  AdminOperationLogRecord,
  AdminOperationLogQuery,
  OperationLogFilter,
  OperationLogInput
} from '@/types/operation-log'
import { toLogPayload } from '@/utils/operation-log'

const MAX_FETCH_SIZE = 500

const buildQuery = (query: OperationLogFilter = {}): AdminOperationLogQuery => ({
  page: 1,
  pageSize: MAX_FETCH_SIZE,
  module: query.module,
  keyword: query.keyword,
  startTime: query.startTime ? String(query.startTime) : undefined,
  endTime: query.endTime ? String(query.endTime) : undefined
})

export function useOperationLog() {
  const logs = ref<AdminOperationLogRecord[]>([])

  const refresh = async (query: OperationLogFilter = {}) => {
    const response = await getAdminOperationLogList(buildQuery(query))
    logs.value = response.records || []
    return logs.value
  }

  const add = async (input: OperationLogInput) => {
    const payload = toLogPayload(input)
    return createAdminOperationLog(payload)
  }

  const list = async () => refresh()

  const filter = async (query: OperationLogFilter = {}) => {
    return refresh(query)
  }

  const clear = async () => {
    await clearAdminOperationLogs()
    logs.value = []
  }

  const exportLogs = async (query: OperationLogFilter = {}) => {
    const records = await filter(query)
    return JSON.stringify(records, null, 2)
  }

  return {
    logs,
    add,
    list,
    filter,
    clear,
    export: exportLogs,
    refresh
  }
}
