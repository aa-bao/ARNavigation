import type { HospitalNode } from '@/api/location'
import type { AdminUserRecord } from '@/types/user'

export interface DashboardSourceData {
  nodes: HospitalNode[]
  users: AdminUserRecord[]
}

export interface DashboardDistributionRow {
  dimension: string
  label: string
  count: number
  ratio: string
}

export interface DashboardRecentNodeRow extends HospitalNode {
  createdAtText: string
}

export interface DashboardRecentUserRow extends AdminUserRecord {
  createdAtText: string
}
