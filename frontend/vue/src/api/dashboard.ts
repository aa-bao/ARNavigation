import { getAdminUserList } from '@/api/admin-user'
import { getLocationList } from '@/api/location'
import type { DashboardSourceData } from '@/types/dashboard'
import type { AdminUserRecord } from '@/types/user'

const DEFAULT_PAGE_SIZE = 100
const MAX_PAGE_COUNT = 100

export const fetchAllAdminUsers = async (): Promise<AdminUserRecord[]> => {
  const records: AdminUserRecord[] = []
  let page = 1
  let total = Number.POSITIVE_INFINITY

  while (records.length < total && page <= MAX_PAGE_COUNT) {
    const response = await getAdminUserList({
      page,
      pageSize: DEFAULT_PAGE_SIZE
    })

    const pageRecords = Array.isArray(response.records) ? response.records : []
    records.push(...pageRecords)

    if (page === 1) {
      total = typeof response.total === 'number' ? response.total : pageRecords.length
    }

    if (pageRecords.length === 0) {
      break
    }

    page += 1
  }

  return records.slice(0, Number.isFinite(total) ? total : records.length)
}

export const fetchDashboardSourceData = async (): Promise<DashboardSourceData> => {
  const [nodes, users] = await Promise.all([getLocationList(), fetchAllAdminUsers()])
  return {
    nodes: Array.isArray(nodes) ? nodes : [],
    users
  }
}
