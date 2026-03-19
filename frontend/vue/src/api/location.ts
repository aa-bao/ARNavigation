import { get, post, put, del } from '@/utils/request'

interface ApiResult<T> {
  code?: number
  message?: string
  data?: T
  success?: boolean
  timestamp?: number
}

// 定义Location接口类型
export interface Location {
  id?: number
  nodeCode: string
  nodeName: string
  floor: number
  xCoordinate: number
  yCoordinate: number
  nodeType: string
  description: string
  qrCodeUrl?: string
  isActive?: number
  createdAt?: string
  updatedAt?: string
}

// 医院节点类型别名，用于兼容现有代码
export type HospitalNode = Location

// 地点类型枚举
export enum NodeType {
  ENTRANCE = 'ENTRANCE',
  NORMAL = 'NORMAL',
  ELEVATOR = 'ELEVATOR',
  STAIR = 'STAIR',
  TOILET = 'TOILET',
  PHARMACY = 'PHARMACY',
  REGISTRATION = 'REGISTRATION',
  CLINIC = 'CLINIC',
  EXAMINATION = 'EXAMINATION',
  NURSE_STATION = 'NURSE_STATION',
  BEDROOM = 'BEDROOM'
}

// 获取地点列表
export async function getLocationList(params?: any): Promise<HospitalNode[]> {
  const response = await get('/navigation/nodes', params)

  if (Array.isArray(response)) {
    return response
  }

  const result = response as ApiResult<HospitalNode[]>
  return Array.isArray(result?.data) ? result.data : []
}

// 根据code获取地点
export function getLocationByCode(code: string) {
  return get(`/navigation/nodes/${code}`)
}

// 创建地点
export function createLocation(data: Location) {
  return post('/navigation/node', data)
}

// 更新地点
export function updateLocation(id: number, data: Location) {
  return put(`/navigation/node/${id}`, data)
}

// 删除地点
export function deleteLocation(id: number) {
  return del(`/navigation/node/${id}`)
}

// 获取节点类型列表
export function getNodeTypes() {
  return get('/navigation/nodeTypes')
}
