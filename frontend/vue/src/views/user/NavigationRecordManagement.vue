<template>
  <div class="page-shell">
    <section class="page-hero">
      <div>
        <p class="hero-kicker">Navigation History Control</p>
        <h1>导航记录管理</h1>
        <p class="hero-text">按用户或关键字检索导航历史，支持删除单条记录和清空指定用户记录。</p>
      </div>
    </section>

    <el-card class="panel-card filters-card" shadow="never">
      <template #header>
        <div class="panel-header">
          <div>
            <p class="panel-kicker">筛选条件</p>
            <h2>检索导航记录</h2>
          </div>
        </div>
      </template>

      <el-form :inline="true" :model="query" class="search-form">
        <el-form-item label="用户ID">
          <el-input-number v-model="query.userId" :min="1" :step="1" :precision="0" controls-position="right" />
        </el-form-item>
        <el-form-item label="关键字">
          <el-input v-model="query.keyword" placeholder="用户名 / 昵称 / 点位名称 / 点位编码" clearable />
        </el-form-item>
        <el-form-item class="action-group">
          <el-button type="primary" :icon="Search" @click="fetchRecords">搜索</el-button>
          <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="panel-card table-card" shadow="never">
      <template #header>
        <div class="panel-header table-header-wrap">
          <div>
            <p class="panel-kicker">User Navigation Timeline</p>
            <h2>记录列表</h2>
          </div>
          <div class="header-summary">
            <span>总计 {{ total }} 条</span>
          </div>
        </div>
      </template>

      <el-table :data="records" v-loading="loading" style="width: 100%">
        <el-table-column prop="id" label="记录ID" width="90" />
        <el-table-column prop="userId" label="用户ID" width="90" />
        <el-table-column prop="username" label="用户名" min-width="120" />
        <el-table-column prop="nickname" label="昵称" min-width="120" />
        <el-table-column prop="nodeId" label="点位ID" width="90" />
        <el-table-column prop="nodeCode" label="点位编码" min-width="120" />
        <el-table-column prop="nodeName" label="点位名称" min-width="160" />
        <el-table-column prop="floor" label="楼层" width="80" />
        <el-table-column prop="lastNavigatedAt" label="最近导航时间" min-width="180">
          <template #default="{ row }">{{ formatDate(row.lastNavigatedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="danger" :icon="Delete" @click="handleDeleteOne(row.id)">删除记录</el-button>
            <el-button link type="warning" @click="handleDeleteByUser(row.userId)">清空该用户</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="fetchRecords"
          @size-change="fetchRecords"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Refresh, Search } from '@element-plus/icons-vue'
import {
  deleteAdminNavigationRecord,
  deleteAdminNavigationRecordsByUser,
  getAdminNavigationRecordList
} from '@/api/admin-navigation-record'
import { getErrorMessage } from '@/utils/request'
import type { AdminNavigationRecord } from '@/types/user'

const loading = ref(false)
const records = ref<AdminNavigationRecord[]>([])
const total = ref(0)

const query = reactive({
  keyword: '',
  userId: undefined as number | undefined,
  page: 1,
  pageSize: 10
})

const fetchRecords = async () => {
  loading.value = true
  try {
    const data = await getAdminNavigationRecordList(query)
    records.value = data.records
    total.value = data.total
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '获取导航记录失败'))
  } finally {
    loading.value = false
  }
}

const resetFilters = async () => {
  query.keyword = ''
  query.userId = undefined
  query.page = 1
  await fetchRecords()
}

const handleDeleteOne = async (id: number) => {
  try {
    await ElMessageBox.confirm('确认删除这条导航记录吗？', '删除确认', { type: 'warning' })
    await deleteAdminNavigationRecord(id)
    ElMessage.success('删除成功')
    await fetchRecords()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(getErrorMessage(error, '删除失败'))
    }
  }
}

const handleDeleteByUser = async (userId: number) => {
  try {
    await ElMessageBox.confirm(`确认清空用户 ${userId} 的全部导航记录吗？`, '清空确认', { type: 'warning' })
    const count = await deleteAdminNavigationRecordsByUser(userId)
    ElMessage.success(`已删除 ${count} 条记录`)
    await fetchRecords()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(getErrorMessage(error, '清空失败'))
    }
  }
}

const formatDate = (value?: string) => {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false })
}

onMounted(() => {
  void fetchRecords()
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

.table-header-wrap {
  align-items: flex-start;
}

.header-summary {
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

.action-group {
  margin-left: auto;
}

:deep(.table-card .el-table) {
  --el-table-header-bg-color: rgba(47, 111, 159, 0.05);
  --el-table-row-hover-bg-color: rgba(47, 111, 159, 0.04);
  background: transparent;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

@media (max-width: 900px) {
  .page-hero,
  .panel-header,
  .table-header-wrap {
    flex-direction: column;
    align-items: flex-start;
  }

  .action-group {
    margin-left: 0;
  }
}
</style>
