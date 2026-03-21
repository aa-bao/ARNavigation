export type OperationLogModule = 'user' | 'location' | 'qrcode' | 'system'

export interface OperationLogEntry {
  id: string
  timestamp: string
  module: OperationLogModule
  action: string
  target: string
  detail: string
  operator: string
}

export interface AdminOperationLogRecord {
  id: number
  operatorUserId?: number
  operatorName: string
  module: OperationLogModule
  action: string
  target?: string
  detail?: string
  ip?: string
  userAgent?: string
  createdAt: string
}

export interface AdminOperationLogListPayload {
  records: AdminOperationLogRecord[]
  total: number
}

export interface AdminOperationLogQuery {
  page?: number
  pageSize?: number
  module?: OperationLogModule | ''
  keyword?: string
  startTime?: string
  endTime?: string
}

export interface OperationLogInput {
  module: OperationLogModule
  action: string
  target: string
  detail?: string | Record<string, unknown> | null
  operator?: string
}

export interface AdminOperationLogCreatePayload {
  module: OperationLogModule
  action: string
  target?: string
  detail?: string
  ip?: string
  userAgent?: string
}

export interface OperationLogFilter {
  module?: OperationLogModule | ''
  keyword?: string
  startTime?: number
  endTime?: number
}

export const OPERATION_LOG_MODULE_OPTIONS = [
  { value: 'user', label: '用户' },
  { value: 'location', label: '地点' },
  { value: 'qrcode', label: '二维码' },
  { value: 'system', label: '系统' }
] as const

export const OPERATION_LOG_MODULE_LABELS: Record<OperationLogModule, string> = {
  user: '用户',
  location: '地点',
  qrcode: '二维码',
  system: '系统'
}
