<template>
  <div class="page-shell">
    <section class="page-hero">
      <div>
        <p class="hero-kicker">Operations Overview</p>
        <h1>后台数据看板</h1>
        <p class="hero-text">汇总导航节点与后台账号的核心状态，帮助快速查看规模、分布和最近新增记录。</p>
      </div>
      <div class="hero-summary">
        <span>节点与用户数据联动</span>
        <span class="summary-divider"></span>
        <span>{{ lastRefreshText }}</span>
      </div>
    </section>

    <div v-loading="loading" class="dashboard-content">
      <el-row :gutter="12" class="stats-row">
        <el-col v-for="stat in statCards" :key="stat.key" :xs="12" :sm="12" :md="8" :lg="4">
          <el-card class="stat-card" shadow="never">
            <p class="stat-label">{{ stat.label }}</p>
            <strong class="stat-value">{{ stat.value }}</strong>
            <span class="stat-note">{{ stat.note }}</span>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="16" class="panel-grid">
        <el-col :xs="24" :lg="12">
          <el-card class="panel-card" shadow="never">
            <template #header>
              <div class="panel-header">
                <div>
                  <p class="panel-kicker">Node Distribution</p>
                  <h2>节点类型分布</h2>
                </div>
                <span class="header-summary">共 {{ nodeSummary.total }} 个节点，覆盖 {{ nodeSummary.floorCount }} 个楼层</span>
              </div>
            </template>

            <el-table :data="nodeDistributionRows" class="summary-table" style="width: 100%">
              <el-table-column prop="dimension" label="维度" width="110" />
              <el-table-column prop="label" label="类型" min-width="160" />
              <el-table-column prop="count" label="数量" width="100" align="right" />
              <el-table-column prop="ratio" label="占比" width="100" align="right" />
            </el-table>
          </el-card>
        </el-col>

        <el-col :xs="24" :lg="12">
          <el-card class="panel-card" shadow="never">
            <template #header>
              <div class="panel-header">
                <div>
                  <p class="panel-kicker">User Distribution</p>
                  <h2>用户类型 / 状态分布</h2>
                </div>
                <span class="header-summary">共 {{ userSummary.total }} 个账号</span>
              </div>
            </template>

            <el-table :data="userDistributionRows" class="summary-table" style="width: 100%">
              <el-table-column prop="dimension" label="维度" width="110" />
              <el-table-column prop="label" label="分类" min-width="160" />
              <el-table-column prop="count" label="数量" width="100" align="right" />
              <el-table-column prop="ratio" label="占比" width="100" align="right" />
            </el-table>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="16" class="panel-grid">
        <el-col :xs="24" :lg="12">
          <el-card class="panel-card" shadow="never">
            <template #header>
              <div class="panel-header">
                <div>
                  <p class="panel-kicker">Recent Nodes</p>
                  <h2>最近创建的节点</h2>
                </div>
                <span class="header-summary">按创建时间倒序，最多 5 条</span>
              </div>
            </template>

            <el-table :data="recentNodes" class="summary-table" style="width: 100%">
              <el-table-column prop="nodeName" label="节点名称" min-width="160" show-overflow-tooltip />
              <el-table-column prop="nodeCode" label="节点编码" width="140" show-overflow-tooltip />
              <el-table-column prop="floor" label="楼层" width="90" align="center">
                <template #default="{ row }">{{ row.floor }} 楼</template>
              </el-table-column>
              <el-table-column prop="nodeType" label="类型" width="130">
                <template #default="{ row }">
                  <el-tag :type="getNodeTagType(row.nodeType)" effect="plain">
                    {{ getNodeTypeLabel(row.nodeType) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="createdAtText" label="创建时间" min-width="170" />
            </el-table>
          </el-card>
        </el-col>

        <el-col :xs="24" :lg="12">
          <el-card class="panel-card" shadow="never">
            <template #header>
              <div class="panel-header">
                <div>
                  <p class="panel-kicker">Recent Users</p>
                  <h2>最近创建的用户</h2>
                </div>
                <span class="header-summary">按创建时间倒序，最多 5 条</span>
              </div>
            </template>

            <el-table :data="recentUsers" class="summary-table" style="width: 100%">
              <el-table-column prop="username" label="用户名" min-width="140" show-overflow-tooltip />
              <el-table-column prop="nickname" label="昵称" min-width="140" show-overflow-tooltip />
              <el-table-column prop="userType" label="类型" width="110">
                <template #default="{ row }">
                  <el-tag effect="plain">{{ row.userType === 'ADMIN' ? '管理员' : '微信用户' }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="status" label="状态" width="110">
                <template #default="{ row }">
                  <el-tag :type="row.status === 'ENABLED' ? 'success' : 'info'" effect="plain">
                    {{ row.status === 'ENABLED' ? '启用' : '停用' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="createdAtText" label="创建时间" min-width="170" />
            </el-table>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getErrorMessage } from '@/utils/request'
import { fetchDashboardSourceData } from '@/api/dashboard'
import { NodeType, type HospitalNode } from '@/api/location'
import type { AdminUserRecord } from '@/types/user'
import type {
  DashboardDistributionRow,
  DashboardRecentNodeRow,
  DashboardRecentUserRow
} from '@/types/dashboard'

const nodeTypeDefinitions = [
  { value: NodeType.ENTRANCE, label: '入口' },
  { value: NodeType.NORMAL, label: '普通节点' },
  { value: NodeType.ELEVATOR, label: '电梯' },
  { value: NodeType.STAIR, label: '楼梯' },
  { value: NodeType.TOILET, label: '卫生间' },
  { value: NodeType.PHARMACY, label: '药房' },
  { value: NodeType.REGISTRATION, label: '挂号' },
  { value: NodeType.CLINIC, label: '诊室' },
  { value: NodeType.EXAMINATION, label: '检查室' },
  { value: NodeType.NURSE_STATION, label: '护士站' },
  { value: NodeType.BEDROOM, label: '病房' }
]

const nodes = ref<HospitalNode[]>([])
const users = ref<AdminUserRecord[]>([])
const loading = ref(false)
const lastRefreshText = ref('尚未加载')

const formatNumber = (value: number) => new Intl.NumberFormat('zh-CN').format(value)

const formatRatio = (count: number, total: number) => {
  if (total <= 0) return '0%'
  return `${((count / total) * 100).toFixed(1).replace(/\.0$/, '')}%`
}

const parseCreatedAt = (value?: string) => {
  if (!value) return null
  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? null : timestamp
}

const sortByCreatedAtDesc = <T extends { createdAt?: string }>(items: T[]) => {
  return items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const leftTime = parseCreatedAt(left.item.createdAt)
      const rightTime = parseCreatedAt(right.item.createdAt)

      if (leftTime !== null && rightTime !== null) {
        return rightTime - leftTime
      }
      if (leftTime !== null) return -1
      if (rightTime !== null) return 1
      return left.index - right.index
    })
    .map(entry => entry.item)
}

const formatCreatedAt = (value?: string) => {
  if (!value) return '-'
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) return value
  return new Date(timestamp).toLocaleString('zh-CN', { hour12: false })
}

const getNodeTypeLabel = (type: string) => {
  const found = nodeTypeDefinitions.find(item => item.value === type)
  return found ? found.label : type
}

const getNodeTagType = (type: string) => {
  const tagTypes: Record<string, '' | 'success' | 'info' | 'warning' | 'danger' | 'primary'> = {
    [NodeType.ENTRANCE]: 'success',
    [NodeType.NORMAL]: 'info',
    [NodeType.ELEVATOR]: 'warning',
    [NodeType.STAIR]: 'warning',
    [NodeType.TOILET]: 'danger',
    [NodeType.PHARMACY]: 'success',
    [NodeType.REGISTRATION]: 'primary',
    [NodeType.CLINIC]: 'primary',
    [NodeType.EXAMINATION]: 'primary',
    [NodeType.NURSE_STATION]: 'success',
    [NodeType.BEDROOM]: 'info'
  }

  return tagTypes[type] || ''
}

const nodeSummary = computed(() => ({
  total: nodes.value.length,
  floorCount: new Set(nodes.value.map(item => item.floor)).size
}))

const userSummary = computed(() => ({
  total: users.value.length,
  adminCount: users.value.filter(item => item.userType === 'ADMIN').length,
  wechatCount: users.value.filter(item => item.userType === 'WECHAT').length,
  enabledCount: users.value.filter(item => item.status === 'ENABLED').length
}))

const statCards = computed(() => [
  {
    key: 'node-total',
    label: '节点总数',
    value: formatNumber(nodeSummary.value.total),
    note: '全部导航节点'
  },
  {
    key: 'floor-count',
    label: '楼层数',
    value: formatNumber(nodeSummary.value.floorCount),
    note: '按节点楼层去重'
  },
  {
    key: 'user-total',
    label: '用户总数',
    value: formatNumber(userSummary.value.total),
    note: '后台账号总量'
  },
  {
    key: 'admin-total',
    label: '管理员数',
    value: formatNumber(userSummary.value.adminCount),
    note: 'userType = ADMIN'
  },
  {
    key: 'wechat-total',
    label: '微信用户数',
    value: formatNumber(userSummary.value.wechatCount),
    note: 'userType = WECHAT'
  },
  {
    key: 'enabled-total',
    label: '启用用户数',
    value: formatNumber(userSummary.value.enabledCount),
    note: 'status = ENABLED'
  }
])

const nodeDistributionRows = computed<DashboardDistributionRow[]>(() => {
  const total = nodes.value.length
  const counts = new Map<string, number>()

  for (const node of nodes.value) {
    counts.set(node.nodeType, (counts.get(node.nodeType) || 0) + 1)
  }

  return nodeTypeDefinitions
    .map(item => ({
      dimension: '节点类型',
      label: item.label,
      count: counts.get(item.value) || 0,
      ratio: formatRatio(counts.get(item.value) || 0, total)
    }))
    .filter(row => row.count > 0)
})

const userDistributionRows = computed<DashboardDistributionRow[]>(() => {
  const total = users.value.length
  const adminCount = userSummary.value.adminCount
  const wechatCount = userSummary.value.wechatCount
  const enabledCount = userSummary.value.enabledCount
  const disabledCount = total - enabledCount

  return [
    {
      dimension: '用户类型',
      label: '管理员',
      count: adminCount,
      ratio: formatRatio(adminCount, total)
    },
    {
      dimension: '用户类型',
      label: '微信用户',
      count: wechatCount,
      ratio: formatRatio(wechatCount, total)
    },
    {
      dimension: '用户状态',
      label: '启用',
      count: enabledCount,
      ratio: formatRatio(enabledCount, total)
    },
    {
      dimension: '用户状态',
      label: '停用',
      count: disabledCount,
      ratio: formatRatio(disabledCount, total)
    }
  ]
})

const recentNodes = computed<DashboardRecentNodeRow[]>(() =>
  sortByCreatedAtDesc(nodes.value)
    .slice(0, 5)
    .map(item => ({
      ...item,
      createdAtText: formatCreatedAt(item.createdAt)
    }))
)

const recentUsers = computed<DashboardRecentUserRow[]>(() =>
  sortByCreatedAtDesc(users.value)
    .slice(0, 5)
    .map(item => ({
      ...item,
      createdAtText: formatCreatedAt(item.createdAt)
    }))
)

const loadDashboard = async () => {
  loading.value = true
  try {
    const data = await fetchDashboardSourceData()
    nodes.value = data.nodes
    users.value = data.users
    lastRefreshText.value = `最后刷新：${new Date().toLocaleString('zh-CN', { hour12: false })}`
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '加载后台看板失败'))
    nodes.value = []
    users.value = []
    lastRefreshText.value = '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadDashboard()
})
</script>

<style scoped>
.page-shell {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 20px;
  padding: 12px 4px 4px;
}

.hero-kicker,
.panel-kicker {
  margin: 0;
  color: #2f6f9f;
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.page-hero h1,
.panel-header h2 {
  margin: 10px 0 0;
  font-family: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Georgia, serif;
  font-weight: 600;
  color: #1f2a33;
}

.page-hero h1 {
  font-size: 42px;
}

.hero-text {
  margin: 14px 0 0;
  color: #66737d;
  line-height: 1.8;
}

.hero-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #66737d;
  font-size: 13px;
}

.summary-divider {
  width: 42px;
  height: 1px;
  background: rgba(91, 109, 122, 0.18);
}

.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stats-row,
.panel-grid {
  margin: 0;
}

.stat-card {
  height: 100%;
  border: 1px solid rgba(91, 109, 122, 0.14);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(255, 252, 247, 0.92)),
    #fffaf3;
}

.stat-label {
  margin: 0;
  color: #6f7c86;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.stat-value {
  display: block;
  margin-top: 16px;
  color: #1f2a33;
  font-size: 28px;
  line-height: 1;
}

.stat-note {
  display: block;
  margin-top: 8px;
  color: #7a8790;
  font-size: 12px;
}

.panel-card {
  border: 1px solid rgba(91, 109, 122, 0.14);
  background: rgba(255, 252, 247, 0.92);
}

:deep(.panel-card .el-card__header) {
  padding: 20px 24px;
  border-bottom: 1px solid rgba(91, 109, 122, 0.12);
  background: rgba(255, 255, 255, 0.42);
}

:deep(.panel-card .el-card__body) {
  padding: 24px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.header-summary {
  color: #697680;
  font-size: 13px;
}

:deep(.summary-table .el-table__inner-wrapper::before) {
  height: 0;
}

:deep(.summary-table .el-table) {
  --el-table-header-bg-color: rgba(47, 111, 159, 0.05);
  --el-table-row-hover-bg-color: rgba(47, 111, 159, 0.04);
  background: transparent;
}

:deep(.summary-table .el-table th.el-table__cell) {
  color: #52606b;
  font-weight: 600;
}

:deep(.el-tag) {
  border-radius: 0;
}

@media (max-width: 900px) {
  .page-hero,
  .panel-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
