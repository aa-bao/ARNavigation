export interface ApiResult<T> {
  code?: number
  message?: string
  data?: T
  timestamp?: number
}

const isApiResult = <T>(value: unknown): value is ApiResult<T> => {
  return !!value && typeof value === 'object' && 'data' in value
}

export const unwrapApiResult = <T>(response: unknown): T => {
  if (isApiResult<T>(response)) {
    if (typeof response.code === 'number' && response.code !== 200) {
      throw new Error(response.message || '请求失败')
    }

    return response.data as T
  }

  return response as T
}
