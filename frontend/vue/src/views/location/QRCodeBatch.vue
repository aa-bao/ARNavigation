<template>
  <div class="page-shell">
    <section class="page-hero">
      <div>
        <p class="hero-kicker">QR Asset Output</p>
        <h1>二维码批量生成</h1>
        <p class="hero-text">集中生成导航节点二维码，用于院内导引张贴与快速分发。</p>
      </div>
      <div class="hero-summary">
        <span>已选节点 {{ selectedNodes.length }}</span>
        <span class="summary-divider"></span>
        <span>已生成 {{ qrResults.length }}</span>
      </div>
    </section>

    <el-card class="panel-card actions-card" shadow="never">
      <template #header>
        <div class="panel-header">
          <div>
            <p class="panel-kicker">Batch Actions</p>
            <h2>批量操作</h2>
          </div>
        </div>
      </template>

      <div class="actions-container">
        <el-button type="primary" @click="selectAllNodes">
          <el-icon><Select /></el-icon>
          全选当前页
        </el-button>
        <el-button @click="clearSelection">
          <el-icon><Close /></el-icon>
          清空选择
        </el-button>
        <el-button type="success" :disabled="selectedNodes.length === 0" @click="batchGenerateQRCodes">
          <el-icon><DocumentCopy /></el-icon>
          批量生成
        </el-button>
        <el-button type="warning" :disabled="selectedNodes.length === 0" @click="batchDownloadQRCodes">
          <el-icon><Download /></el-icon>
          批量下载
        </el-button>
      </div>
    </el-card>

    <el-card class="panel-card table-card" shadow="never">
      <template #header>
        <div class="panel-header">
          <div>
            <p class="panel-kicker">Node Selection</p>
            <h2>节点列表</h2>
          </div>
          <span class="header-summary">从当前节点资料中选择需要生成二维码的条目。</span>
        </div>
      </template>

      <el-table
        ref="tableRef"
        :data="tableData"
        style="width: 100%"
        v-loading="loading"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="节点 ID" width="92" />
        <el-table-column prop="nodeCode" label="节点编码" min-width="140">
          <template #default="{ row }">
            <span class="code-text">{{ row.nodeCode }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="nodeName" label="节点名称" min-width="160" />
        <el-table-column prop="floor" label="楼层" width="100">
          <template #default="{ row }">
            <el-tag effect="plain">{{ row.floor }} 楼</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="nodeType" label="节点类型" width="130">
          <template #default="{ row }">
            <el-tag :type="getNodeTypeTagType(row.nodeType)" effect="plain">
              {{ getNodeTypeLabel(row.nodeType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="generateSingleQRCode(row)">生成二维码</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <el-card v-if="qrResults.length > 0" class="panel-card results-card" shadow="never">
      <template #header>
        <div class="panel-header">
          <div>
            <p class="panel-kicker">Generated Assets</p>
            <h2>生成结果</h2>
          </div>
          <el-button type="primary" @click="downloadAllQRCodes">
            <el-icon><Download /></el-icon>
            下载全部
          </el-button>
        </div>
      </template>

      <div class="qr-results-grid">
        <div v-for="result in qrResults" :key="result.nodeCode" class="qr-result-item">
          <div class="qr-preview-wrapper">
            <img :src="result.qrDataUrl" class="qr-preview-image" alt="二维码预览">
          </div>
          <div class="qr-result-info">
            <div class="result-info-item">
              <span class="result-label">节点编码</span>
              <span class="result-value">{{ result.nodeCode }}</span>
            </div>
            <div class="result-info-item">
              <span class="result-label">节点名称</span>
              <span class="result-value">{{ result.nodeName }}</span>
            </div>
          </div>
          <div class="qr-result-actions">
            <el-button type="primary" @click="downloadSingleQRCode(result)">
              <el-icon><Download /></el-icon>
              下载
            </el-button>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import QRCode from 'qrcode'
import { Close, DocumentCopy, Download, Select } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { TableInstance } from 'element-plus'
import { getLocationList, NodeType } from '@/api/location'
import type { HospitalNode } from '@/api/location'

const nodeTypeList = [
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

const loading = ref(false)
const nodes = ref<HospitalNode[]>([])
const selectedNodes = ref<HospitalNode[]>([])
const qrResults = ref<{ nodeCode: string; nodeName: string; qrDataUrl: string }[]>([])
const tableRef = ref<TableInstance>()

const pagination = ref({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

const tableData = computed(() => {
  const start = (pagination.value.currentPage - 1) * pagination.value.pageSize
  const end = start + pagination.value.pageSize
  return nodes.value.slice(start, end)
})

const getNodeTypeLabel = (type: string) => {
  const found = nodeTypeList.find(item => item.value === type)
  return found ? found.label : type
}

const getNodeTypeTagType = (type: string) => {
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

const loadNodes = async () => {
  loading.value = true
  try {
    const response = await getLocationList()
    const items = Array.isArray(response) ? response : []
    nodes.value = items
      .filter(node => node?.nodeCode)
      .sort((left, right) => {
        const leftCode = left.nodeCode ?? ''
        const rightCode = right.nodeCode ?? ''
        return leftCode.localeCompare(rightCode)
      })
    pagination.value.total = nodes.value.length
    clearSelection()
  } catch (error) {
    console.error('加载节点列表失败:', error)
    ElMessage.error('加载节点列表失败')
  } finally {
    loading.value = false
  }
}

const handleSelectionChange = (rows: HospitalNode[]) => {
  selectedNodes.value = rows
}

const selectAllNodes = async () => {
  await nextTick()
  tableRef.value?.clearSelection()
  tableData.value.forEach(row => tableRef.value?.toggleRowSelection(row, true))
}

const clearSelection = () => {
  tableRef.value?.clearSelection()
  selectedNodes.value = []
}

const upsertResult = (result: { nodeCode: string; nodeName: string; qrDataUrl: string }) => {
  const index = qrResults.value.findIndex(item => item.nodeCode === result.nodeCode)
  if (index >= 0) {
    qrResults.value[index] = result
  } else {
    qrResults.value.push(result)
  }
}

const createQrDataUrl = async (node: HospitalNode) => {
  const qrContent = JSON.stringify({
    nodeCode: node.nodeCode,
    name: node.nodeName,
    type: 'hospital_node'
  })

  const canvas = document.createElement('canvas')
  await QRCode.toCanvas(canvas, qrContent, {
    width: 220,
    margin: 2
  })

  return canvas.toDataURL('image/png')
}

const generateSingleQRCode = async (node: HospitalNode) => {
  loading.value = true
  try {
    const qrDataUrl = await createQrDataUrl(node)
    upsertResult({
      nodeCode: node.nodeCode,
      nodeName: node.nodeName,
      qrDataUrl
    })
    ElMessage.success('二维码生成成功')
  } catch (error) {
    console.error('二维码生成失败:', error)
    ElMessage.error('二维码生成失败')
  } finally {
    loading.value = false
  }
}

const batchGenerateQRCodes = async () => {
  if (selectedNodes.value.length === 0) {
    ElMessage.warning('请先选择要生成二维码的节点')
    return
  }

  loading.value = true
  try {
    const results = await Promise.all(
      selectedNodes.value.map(async node => ({
        nodeCode: node.nodeCode,
        nodeName: node.nodeName,
        qrDataUrl: await createQrDataUrl(node)
      }))
    )

    results.forEach(upsertResult)
    ElMessage.success(`已生成 ${results.length} 个二维码`)
  } catch (error) {
    console.error('批量生成二维码失败:', error)
    ElMessage.error('批量生成二维码失败')
  } finally {
    loading.value = false
  }
}

const downloadSingleQRCode = (result: { nodeCode: string; nodeName: string; qrDataUrl: string }) => {
  const link = document.createElement('a')
  link.download = `${result.nodeCode}_${result.nodeName}_qrcode.png`
  link.href = result.qrDataUrl
  link.click()
  ElMessage.success('下载成功')
}

const batchDownloadQRCodes = async () => {
  if (selectedNodes.value.length === 0) {
    ElMessage.warning('请先选择要下载的节点')
    return
  }

  loading.value = true
  try {
    for (const node of selectedNodes.value) {
      const qrDataUrl = await createQrDataUrl(node)
      downloadSingleQRCode({
        nodeCode: node.nodeCode,
        nodeName: node.nodeName,
        qrDataUrl
      })
      await new Promise(resolve => setTimeout(resolve, 180))
    }
  } catch (error) {
    console.error('批量下载失败:', error)
    ElMessage.error('批量下载失败')
  } finally {
    loading.value = false
  }
}

const downloadAllQRCodes = async () => {
  if (qrResults.value.length === 0) {
    ElMessage.warning('当前没有可下载的二维码')
    return
  }

  loading.value = true
  try {
    for (const result of qrResults.value) {
      downloadSingleQRCode(result)
      await new Promise(resolve => setTimeout(resolve, 180))
    }
  } catch (error) {
    console.error('下载全部二维码失败:', error)
    ElMessage.error('下载全部二维码失败')
  } finally {
    loading.value = false
  }
}

const handleSizeChange = (size: number) => {
  pagination.value.pageSize = size
  pagination.value.currentPage = 1
  clearSelection()
}

const handleCurrentChange = (page: number) => {
  pagination.value.currentPage = page
  clearSelection()
}

onMounted(() => {
  loadNodes()
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
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #2f6f9f;
}

.page-hero h1,
.panel-header h2 {
  margin: 10px 0 0;
  font-family: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif;
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

.actions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

:deep(.el-button) {
  border-radius: 0;
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

.qr-results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 18px;
}

.qr-result-item {
  padding: 20px;
  border: 1px solid rgba(91, 109, 122, 0.12);
  background: rgba(255, 255, 255, 0.76);
}

.qr-preview-wrapper {
  display: flex;
  justify-content: center;
  padding: 16px;
  border: 1px solid rgba(91, 109, 122, 0.08);
  background: #ffffff;
}

.qr-preview-image {
  width: 154px;
  height: 154px;
}

.qr-result-info {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid rgba(91, 109, 122, 0.12);
}

.result-info-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 14px;
}

.result-info-item:last-child {
  margin-bottom: 0;
}

.result-label {
  color: #66737d;
}

.result-value {
  color: #1f2a33;
  font-weight: 600;
  text-align: right;
  word-break: break-all;
}

.qr-result-actions {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 900px) {
  .page-hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .hero-summary {
    flex-wrap: wrap;
  }
}
</style>
