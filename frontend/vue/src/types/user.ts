export type UserId = number

export type UserStatus = 'ENABLED' | 'DISABLED'

export type UserType = 'ADMIN' | 'WECHAT'

export interface AuthUserInfo {
  id: UserId
  username: string
  nickname: string
  avatarUrl?: string
  phone?: string
  userType: UserType
  status: UserStatus
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  userInfo: AuthUserInfo
}

export interface AdminUserRecord {
  id: UserId
  username: string
  nickname: string
  avatarUrl?: string
  phone?: string
  openid?: string
  userType: UserType
  status: UserStatus
  lastLoginAt?: string
  createdAt?: string
}

export interface AdminUserListPayload {
  records: AdminUserRecord[]
  total: number
}

export interface AdminUserQuery {
  keyword?: string
  userType?: UserType | ''
  status?: UserStatus | ''
  page?: number
  pageSize?: number
}

export interface AdminUserCreatePayload {
  username: string
  nickname: string
  password: string
  phone?: string
  avatarUrl?: string
  userType: UserType
  status: UserStatus
}

export interface AdminUserUpdatePayload {
  nickname: string
  phone?: string
  avatarUrl?: string
  userType: UserType
  password?: string
  status: UserStatus
}

export interface AdminNavigationRecord {
  id: number
  userId: UserId
  username?: string
  nickname?: string
  nodeId: number
  nodeCode?: string
  nodeName?: string
  floor?: number
  nodeType?: string
  description?: string
  lastNavigatedAt?: string
  updatedAt?: string
}

export interface AdminNavigationRecordListPayload {
  records: AdminNavigationRecord[]
  total: number
}

export interface AdminNavigationRecordQuery {
  page?: number
  pageSize?: number
  keyword?: string
  userId?: number
}
