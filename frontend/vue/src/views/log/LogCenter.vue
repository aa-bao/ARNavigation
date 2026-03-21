<template>
  <div class="page-shell">
    <section class="page-hero">
      <div>
        <p class="hero-kicker">Audit Trail</p>
        <h1>操作日志中心</h1>
        <p class="hero-text">记录用户、地点、二维码与系统动作，支持筛选、分页、清空和 JSON 导出。</p>
      </div>
      <div class="hero-actions">
        <el-button :icon="Delete" @click="handleClear">清空日志</el-button>
        <el-button type="primary" :icon="Download" @click="handleExport">导出 JSON</el-button>
      </div>
    </section>

    <el-card class="panel-card filters-card" shadow="never">
      <template #header>
        <div class="panel-header">
          <div>
            <p class="panel-kicker">筛选条件</p>
            <h2>检索日志记录</h2>
          </div>
          <div class="header-summary">
            <span>当前筛选 {{ total }} 条</span>
          </div>
        </div>
      </template>

      <el-form :inline="true" :model="filters" class="search-form">
        <el-form-item label="模块">
          <el-select v-model="filters.module" clearable placeholder="全部">
            <el-option v-for="item in moduleOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>

        <el-form-item label="关键字">
          <el-input v-model="filters.keyword" placeholder="动作 / 对象 / 详情 / 操作者" clearable @keyup.enter="handleSearch" />
        </el-form-item>

        <el-form-item label="时间范围">
          <el-date-picker
            v-model="filters.timeRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            clearable
          />
        </el-form-item>

        <el-form-item class="action-group">
          <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="panel-card table-card" shadow="never">
      <template #header>
        <div class="panel-header">
          <div>
            <p class="panel-kicker">Log Register</p>
            <h2>日志列表</h2>
          </div>
          <div class="header-summary">
            <span>共 {{ total }} 条</span>
          </div>
        </div>
      </template>

      <el-table :data="records" v-loading="loading" style="width: 100%">
        <el-table-column prop="createdAt" label="时间" width="180">
          <template #default="{ row }">{{ formatOperationLogTimestamp(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column prop="module" label="模块" width="120">
          <template #default="{ row }">
            <el-tag :type="getModuleTagType(row.module)" effect="plain">{{ getModuleLabel(row.module) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="action" label="动作" min-width="140" show-overflow-tooltip />
        <el-table-column prop="target" label="对象" min-width="140" show-overflow-tooltip />
        <el-table-column prop="detail" label="详情" min-width="260" show-overflow-tooltip />
        <el-table-column prop="operatorName" label="操作者" width="140" show-overflow-tooltip />
        <el-table-column prop="id" label="ID" min-width="120" show-overflow-tooltip />
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="loadData"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Download, Refresh, Search } from '@element-plus/icons-vue'
import { clearAdminOperationLogs, getAdminOperationLogList } from '@/api/admin-log'
import { downloadJsonFile, formatOperationLogTimestamp } from '@/utils/operation-log'
import {
  OPERATION_LOG_MODULE_LABELS,
  OPERATION_LOG_MODULE_OPTIONS,
  type AdminOperationLogRecord,
  type OperationLogModule
} from '@/types/operation-log'
import { getErrorMessage } from '@/utils/request'

const moduleOptions = OPERATION_LOG_MODULE_OPTIONS
const moduleTagTypes: Record<OperationLogModule, '' | 'success' | 'info' | 'warning' | 'danger' | 'primary'> = {
  user: 'primary',
  location: 'success',
  qrcode: 'warning',
  system: 'info'
}

const loading = ref(false)
const total = ref(0)
const records = ref<AdminOperationLogRecord[]>([])

const filters = reactive({
  module: '' as '' | OperationLogModule,
  keyword: '',
  timeRange: [] as [Date, Date] | []
})

const pagination = reactive({
  currentPage: 1,
  pageSize: 20
})

const buildQuery = (exportMode = false) => {
  const [start, end] = filters.timeRange || []
  return {
    page: exportMode ? 1 : pagination.currentPage,
    pageSize: exportMode ? 500 : pagination.pageSize,
    module: filters.module || undefined,
    keyword: filters.keyword || undefined,
    startTime: start ? String(start.getTime()) : undefined,
    endTime: end ? String(end.getTime()) : undefined
  }
}

const getModuleLabel = (module: OperationLogModule) => OPERATION_LOG_MODULE_LABELS[module]
const getModuleTagType = (module: OperationLogModule) => moduleTagTypes[module]

const loadData = async () => {
  loading.value = true
  try {
    const result = await getAdminOperationLogList(buildQuery())
    records.value = result.records || []
    total.value = result.total || 0
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '加载日志失败'))
  } finally {
    loading.value = false
  }
}

const handleSearch = async () => {
  pagination.currentPage = 1
  await loadData()
}

const handleReset = async () => {
  filters.module = ''
  filters.keyword = ''
  filters.timeRange = []
  pagination.currentPage = 1
  await loadData()
}

const handleSizeChange = async () => {
  pagination.currentPage = 1
  await loadData()
}

const handleClear = async () => {
  if (total.value === 0) {
    ElMessage.info('当前没有可清空的日志')
    return
  }

  try {
    await ElMessageBox.confirm('确认清空全部操作日志？此操作不可恢复。', '清空日志', {
      type: 'warning',
      confirmButtonText: '清空',
      cancelButtonText: '取消'
    })
    await clearAdminOperationLogs()
    ElMessage.success('日志已清空')
    pagination.currentPage = 1
    await loadData()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(getErrorMessage(error, '清空日志失败'))
    }
  }
}

const handleExport = async () => {
  try {
    const result = await getAdminOperationLogList(buildQuery(true))
    const fileName = `operation-logs-${new Date().toISOString().slice(0, 10)}.json`
    downloadJsonFile(fileName, result.records || [])
    ElMessage.success('已导出 JSON 文件')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '导出失败'))
  }
}

onMounted(() => {
  void loadData()
})
</script>

<style scoped>
.page-shell {
  display: grid;
  gap: 20px;
}

.page-hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 20px;
  padding: 12px 4px 4px;
}

.hero-actions {
  display: flex;
  align-items: flex-start;
  gap: 8px;
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

.hero-text {
  margin: 0;
  color: #63717d;
}

.panel-card {
  border: 1px solid rgba(91, 109, 122, 0.14);
  background: rgba(255, 252, 247, 0.92);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.panel-header h2 {
  margin: 10px 0 0;
  font-size: 24px;
  color: #1f2a33;
}

.header-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #6f7c86;
  font-size: 13px;
}

.search-form {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 0;
}

.search-form :deep(.el-form-item) {
  margin-right: 16px;
  margin-bottom: 0;
}

.search-form :deep(.el-select),
.search-form :deep(.el-date-editor) {
  min-width: 180px;
}

.search-form :deep(.el-input) {
  min-width: 260px;
}

.action-group {
  margin-left: auto;
}

:deep(.table-card .el-table) {
  --el-table-header-bg-color: rgba(47, 111, 159, 0.05);
  --el-table-row-hover-bg-color: rgba(47, 111, 159, 0.04);
  background: transparent;
}

:deep(.table-card .el-table th.el-table__cell) {
  color: #52606b;
  font-weight: 600;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

@media (max-width: 900px) {
  .page-hero,
  .panel-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .hero-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .action-group {
    margin-left: 0;
  }
}
</style>
