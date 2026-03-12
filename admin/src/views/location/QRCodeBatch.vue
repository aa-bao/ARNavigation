<template>
  <div class="qr-batch-container">
    <el-card class="page-header">
      <template #header>
        <div class="header-content">
          <h2>批量二维码生成</h2>
        </div>
      </template>
    </el-card>

    <el-card class="batch-actions">
      <div class="actions-container">
        <el-button type="primary" @click="selectAllNodes">
          <el-icon><Select /></el-icon>
          全选
        </el-button>
        <el-button @click="clearSelection">
          <el-icon><Close /></el-icon>
          取消选择
        </el-button>
        <el-button
          type="success"
          :disabled="selectedNodes.length === 0"
          @click="batchGenerateQRCodes"
        >
          <el-icon><DocumentCopy /></el-icon>
          批量生成
        </el-button>
        <el-button
          type="warning"
          :disabled="selectedNodes.length === 0"
          @click="batchDownloadQRCodes"
        >
          <el-icon><Download /></el-icon>
          批量下载
        </el-button>
      </div>
    </el-card>

    <el-card class="nodes-table">
      <el-table
        :data="tableData"
        v-model:selection="selectedNodes"
        style="width: 100%"
        border
        stripe
        v-loading="loading"
      >
        <el-table-column type="selection" width="55"></el-table-column>
        <el-table-column prop="id" label="节点ID" width="80"></el-table-column>
        <el-table-column prop="nodeCode" label="节点编码" min-width="120">
          <template #default="scope">
            <span class="code-text">{{ scope.row.nodeCode }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="nodeName" label="节点名称" min-width="150">
          <template #default="scope">
            <span class="name-text">{{ scope.row.nodeName }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="floor" label="楼层" width="80">
          <template #default="scope">
            {{ scope.row.floor }}楼
          </template>
        </el-table-column>
        <el-table-column prop="nodeType" label="节点类型" width="120">
          <template #default="scope">
            <el-tag :type="getNodeTypeTagType(scope.row.nodeType)">
              {{ getNodeTypeLabel(scope.row.nodeType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="scope">
            <el-button type="primary" size="small" @click="generateSingleQRCode(scope.row)">
              生成二维码
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="pagination.currentPage"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </el-card>

    <el-card class="qr-results" v-if="qrResults.length > 0">
      <template #header>
        <div class="header-content">
          <h3>生成结果</h3>
          <el-button type="primary" @click="downloadAllQRCodes">
            <el-icon><Download /></el-icon>
            全部下载
          </el-button>
        </div>
      </template>
      <div class="qr-results-grid">
        <div class="qr-result-item" v-for="result in qrResults" :key="result.nodeCode">
          <div class="qr-preview-wrapper">
            <img :src="result.qrDataUrl" class="qr-preview-image" alt="QR Code">
          </div>
          <div class="qr-result-info">
            <div class="result-info-item">
              <span class="result-label">节点编码:</span>
              <span class="result-value">{{ result.nodeCode }}</span>
            </div>
            <div class="result-info-item">
              <span class="result-label">节点名称:</span>
              <span class="result-value">{{ result.nodeName }}</span>
            </div>
          </div>
          <div class="qr-result-actions">
            <el-button type="primary" size="small" @click="downloadSingleQRCode(result)">
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
import { ref, onMounted, computed } from 'vue'
import QRCode from 'qrcode'
import { Select, Close, DocumentCopy, Download } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { HospitalNode } from '@/api/location'
import { NodeType } from '@/api/location'

// 节点类型列表
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

// 表格数据
const mockLocationList = ref<HospitalNode[]>([])

// 状态
const loading = ref(false)
const nodes = ref<HospitalNode[]>([])
const selectedNodes = ref<HospitalNode[]>([])
const qrResults = ref<{
  nodeCode: string
  nodeName: string
  qrDataUrl: string
}[]>([])

// 分页
const pagination = ref({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

// 表格数据（分页）
const tableData = computed(() => {
  const start = (pagination.value.currentPage - 1) * pagination.value.pageSize
  const end = start + pagination.value.pageSize
  return nodes.value.slice(start, end)
})

// 获取节点类型标签
const getNodeTypeLabel = (type: string) => {
  const found = nodeTypeList.find(t => t.value === type)
  return found ? found.label : type
}

// 获取节点类型标签颜色
const getNodeTypeTagType = (type: string) => {
  const tagTypes: Record<string, any> = {
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

// 初始化模拟数据
const initMockData = () => {
  const types = Object.values(NodeType)
  const names = ['大厅', '挂号处', '内科诊室', '外科诊室', '药房', '卫生间', '电梯间', '楼梯间', '入口', '护士站', '检查室', '病房']

  for (let i = 1; i <= 30; i++) {
    mockLocationList.value.push({
      id: i,
      nodeCode: `NODE${String(i).padStart(3, '0')}`,
      nodeName: `${names[i % names.length]}${i}`,
      floor: Math.floor(Math.random() * 5) + 1,
      xCoordinate: Math.round(Math.random() * 1000) / 10,
      yCoordinate: Math.round(Math.random() * 1000) / 10,
      nodeType: types[i % types.length],
      description: `这是${names[i % names.length]}${i}的详细描述信息`,
      createdAt: '2024-01-01 10:00:00',
      updatedAt: '2024-01-01 10:00:00'
    })
  }

  nodes.value = [...mockLocationList.value]
  pagination.value.total = nodes.value.length
}

// 全选
const selectAllNodes = () => {
  selectedNodes.value = [...nodes.value]
}

// 取消选择
const clearSelection = () => {
  selectedNodes.value = []
}

// 生成单个二维码
const generateSingleQRCode = async (node: HospitalNode) => {
  loading.value = true
  try {
    const qrContent = JSON.stringify({
      nodeCode: node.nodeCode,
      name: node.nodeName,
      type: 'hospital_node'
    })

    const canvas = document.createElement('canvas')
    canvas.width = 200
    canvas.height = 200
    await QRCode.toCanvas(canvas, qrContent, {
      width: 200,
      height: 200,
      margin: 2
    })

    const existingIndex = qrResults.value.findIndex(item => item.nodeCode === node.nodeCode)
    const qrDataUrl = canvas.toDataURL('image/png')

    if (existingIndex !== -1) {
      qrResults.value[existingIndex] = {
        nodeCode: node.nodeCode,
        nodeName: node.nodeName,
        qrDataUrl
      }
    } else {
      qrResults.value.push({
        nodeCode: node.nodeCode,
        nodeName: node.nodeName,
        qrDataUrl
      })
    }

    ElMessage.success('二维码生成成功')
  } catch (error) {
    console.error('二维码生成失败:', error)
    ElMessage.error('二维码生成失败')
  } finally {
    loading.value = false
  }
}

// 批量生成二维码
const batchGenerateQRCodes = async () => {
  if (selectedNodes.value.length === 0) {
    ElMessage.warning('请先选择要生成二维码的地点')
    return
  }

  loading.value = true
  try {
    const generatePromises = selectedNodes.value.map(async (node) => {
      const qrContent = JSON.stringify({
        nodeCode: node.nodeCode,
        name: node.nodeName,
        type: 'hospital_node'
      })

      const canvas = document.createElement('canvas')
      canvas.width = 200
      canvas.height = 200
      await QRCode.toCanvas(canvas, qrContent, {
        width: 200,
        height: 200,
        margin: 2
      })

      return {
        nodeCode: node.nodeCode,
        nodeName: node.nodeName,
        qrDataUrl: canvas.toDataURL('image/png')
      }
    })

    const results = await Promise.all(generatePromises)

    // 更新结果列表，避免重复
    results.forEach(result => {
      const existingIndex = qrResults.value.findIndex(item => item.nodeCode === result.nodeCode)
      if (existingIndex !== -1) {
        qrResults.value[existingIndex] = result
      } else {
        qrResults.value.push(result)
      }
    })

    ElMessage.success(`成功生成 ${results.length} 个二维码`)
  } catch (error) {
    console.error('批量生成二维码失败:', error)
    ElMessage.error('二维码生成失败')
  } finally {
    loading.value = false
  }
}

// 下载单个二维码
const downloadSingleQRCode = (result: any) => {
  const link = document.createElement('a')
  link.download = `${result.nodeCode}_${result.nodeName}_qrcode.png`
  link.href = result.qrDataUrl
  link.click()
  ElMessage.success('下载成功')
}

// 批量下载二维码
const batchDownloadQRCodes = async () => {
  if (selectedNodes.value.length === 0) {
    ElMessage.warning('请先选择要下载的地点')
    return
  }

  loading.value = true
  try {
    for (const node of selectedNodes.value) {
      const qrContent = JSON.stringify({
        nodeCode: node.nodeCode,
        name: node.nodeName,
        type: 'hospital_node'
      })

      const canvas = document.createElement('canvas')
      canvas.width = 200
      canvas.height = 200
      await QRCode.toCanvas(canvas, qrContent, {
        width: 200,
        height: 200,
        margin: 2
      })

      const link = document.createElement('a')
      link.download = `${node.nodeCode}_${node.nodeName}_qrcode.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    ElMessage.success(`成功下载 ${selectedNodes.value.length} 个二维码`)
  } catch (error) {
    console.error('批量下载失败:', error)
    ElMessage.error('下载失败')
  } finally {
    loading.value = false
  }
}

// 全部下载
const downloadAllQRCodes = async () => {
  if (qrResults.value.length === 0) {
    ElMessage.warning('暂无二维码可下载')
    return
  }

  loading.value = true
  try {
    for (const result of qrResults.value) {
      const link = document.createElement('a')
      link.download = `${result.nodeCode}_${result.nodeName}_qrcode.png`
      link.href = result.qrDataUrl
      link.click()
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    ElMessage.success(`成功下载 ${qrResults.value.length} 个二维码`)
  } catch (error) {
    console.error('全部下载失败:', error)
    ElMessage.error('下载失败')
  } finally {
    loading.value = false
  }
}

const handleSizeChange = (size: number) => {
  pagination.value.pageSize = size
  pagination.value.currentPage = 1
}

const handleCurrentChange = (page: number) => {
  pagination.value.currentPage = page
}

onMounted(() => {
  initMockData()
})
</script>

<style scoped>
.qr-batch-container {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content h2 {
  margin: 0;
  color: #303133;
}

.batch-actions {
  margin-bottom: 20px;
}

.actions-container {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

.nodes-table {
  margin-bottom: 20px;
}

:deep(.el-table) {
  background-color: white;
}

.code-text {
  color: #409eff;
  font-weight: 500;
}

.name-text {
  color: #303133;
  font-weight: 500;
}

:deep(.el-pagination) {
  margin-top: 20px;
  text-align: right;
}

.qr-results {
  margin-top: 30px;
}

.qr-results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.qr-result-item {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
}

.qr-preview-wrapper {
  margin-bottom: 15px;
  padding: 15px;
  background: #fafafa;
  border-radius: 8px;
  display: inline-block;
}

.qr-preview-image {
  width: 150px;
  height: 150px;
}

.qr-result-info {
  text-align: left;
  margin-bottom: 15px;
  padding: 10px;
  background-color: #f5f7fa;
  border-radius: 8px;
}

.result-info-item {
  display: flex;
  margin-bottom: 6px;
  font-size: 14px;
}

.result-info-item:last-child {
  margin-bottom: 0;
}

.result-label {
  width: 70px;
  font-weight: bold;
  color: #606266;
  margin-right: 8px;
}

.result-value {
  color: #303133;
  flex: 1;
  word-break: break-all;
}

.qr-result-actions {
  display: flex;
  justify-content: center;
}
</style>
