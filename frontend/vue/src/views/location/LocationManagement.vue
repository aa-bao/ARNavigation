<template>
  <div class="page-shell">
    <section class="page-hero">
      <div>
        <p class="hero-kicker">Location Registry</p>
        <h1>地点管理</h1>
        <p class="hero-text">维护院内导航节点、楼层坐标与业务类型，支持搜索、批量导入导出和二维码生成。</p>
      </div>
      <div class="hero-actions">
        <el-button type="success" plain @click="triggerImport">导入 CSV</el-button>
        <el-button type="info" plain @click="handleExportCsv">导出 CSV</el-button>
        <el-button type="primary" @click="handleAdd">新增地点</el-button>
        <input ref="fileInputRef" type="file" accept=".csv" class="hidden-input" @change="handleImportCsv" />
      </div>
    </section>

    <el-card class="panel-card filters-card" shadow="never">
      <template #header>
        <div class="panel-header">
          <div>
            <p class="panel-kicker">筛选条件</p>
            <h2>检索节点资料</h2>
          </div>
        </div>
      </template>

      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="节点名称">
          <el-input v-model="searchForm.nodeName" placeholder="输入节点名称" clearable @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item label="节点类型">
          <el-select v-model="searchForm.nodeType" placeholder="选择节点类型" clearable>
            <el-option label="全部" value="" />
            <el-option v-for="type in nodeTypeList" :key="type.value" :label="type.label" :value="type.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="楼层">
          <el-select v-model="searchForm.floor" placeholder="选择楼层" clearable>
            <el-option label="全部" value="" />
            <el-option v-for="floor in floorList" :key="floor" :label="`${floor} 楼`" :value="floor" />
          </el-select>
        </el-form-item>
        <el-form-item class="action-group">
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="panel-card table-card" shadow="never">
      <template #header>
        <div class="panel-header">
          <div>
            <p class="panel-kicker">Node Register</p>
            <h2>地点列表</h2>
          </div>
          <div class="header-summary">
            <span>共 {{ pagination.total }} 个节点</span>
          </div>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" style="width: 100%">
        <el-table-column prop="id" label="节点 ID" width="92" />
        <el-table-column prop="nodeCode" label="节点编码" width="140" />
        <el-table-column prop="nodeName" label="节点名称" min-width="160" />
        <el-table-column prop="floor" label="楼层" width="100" align="center">
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
        <el-table-column label="坐标" width="180">
          <template #default="{ row }">
            <span>{{ row.xCoordinate }}, {{ row.yCoordinate }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="180" show-overflow-tooltip />
        <el-table-column label="操作" width="280" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" :icon="Edit" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="danger" :icon="Delete" @click="handleDelete(row)">删除</el-button>
            <el-button link type="success" :icon="Picture" @click="handleGenerateQRCode(row)">二维码</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑地点' : '新增地点'"
      width="640px"
      class="location-dialog"
      :close-on-click-modal="false"
      @close="handleDialogClose"
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-position="top" class="edit-form">
        <div class="form-grid">
          <el-form-item label="节点编码" prop="nodeCode">
            <el-input v-model="formData.nodeCode" placeholder="输入节点编码" />
          </el-form-item>
          <el-form-item label="节点名称" prop="nodeName">
            <el-input v-model="formData.nodeName" placeholder="输入节点名称" />
          </el-form-item>
          <el-form-item label="楼层" prop="floor">
            <el-select v-model="formData.floor" placeholder="选择楼层">
              <el-option v-for="floor in floorList" :key="floor" :label="`${floor} 楼`" :value="floor" />
            </el-select>
          </el-form-item>
          <el-form-item label="节点类型" prop="nodeType">
            <el-select v-model="formData.nodeType" placeholder="选择节点类型">
              <el-option v-for="type in nodeTypeList" :key="type.value" :label="type.label" :value="type.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="X 坐标" prop="xCoordinate">
            <el-input-number v-model="formData.xCoordinate" :precision="2" :step="0.1" :min="0" />
          </el-form-item>
          <el-form-item label="Y 坐标" prop="yCoordinate">
            <el-input-number v-model="formData.yCoordinate" :precision="2" :step="0.1" :min="0" />
          </el-form-item>
        </div>

        <el-form-item label="描述" prop="description">
          <el-input v-model="formData.description" type="textarea" :rows="3" placeholder="输入描述信息" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="deleteDialogVisible" title="删除确认" width="420px">
      <div class="delete-confirm">
        <el-icon class="warning-icon"><WarningFilled /></el-icon>
        <span>确定要删除该地点吗？此操作不可恢复。</span>
      </div>
      <template #footer>
        <el-button @click="deleteDialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="deleteLoading" @click="confirmDelete">删除</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="qrDialogVisible" title="节点二维码" width="420px">
      <div class="qrcode-wrapper">
        <div ref="qrCodeRef" class="qrcode"></div>
        <p class="qrcode-tip">扫码后可直达对应导航节点。</p>
      </div>
      <template #footer>
        <el-button @click="qrDialogVisible = false">关闭</el-button>
        <el-button type="primary" :icon="Download" @click="handleDownloadQRCode">下载二维码</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, type FormInstance } from 'element-plus'
import {
  Delete,
  Download,
  Edit,
  Picture,
  Refresh,
  Search,
  WarningFilled
} from '@element-plus/icons-vue'
import QRCode from 'qrcode'
import {
  NodeType,
  createLocation,
  deleteLocation,
  getLocationList,
  updateLocation,
  type HospitalNode,
  type Location
} from '@/api/location'
import { useOperationLog } from '@/composables/useOperationLog'
import { useUserStore } from '@/stores/user'
import { getErrorMessage } from '@/utils/request'

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
const userStore = useUserStore()
const { add: addLog } = useOperationLog()

const floorList = [-3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

const searchForm = reactive({
  nodeName: '',
  nodeType: '',
  floor: '' as number | string
})

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0
})

const loading = ref(false)
const submitLoading = ref(false)
const deleteLoading = ref(false)
const dialogVisible = ref(false)
const deleteDialogVisible = ref(false)
const qrDialogVisible = ref(false)
const isEdit = ref(false)
const currentRow = ref<HospitalNode | null>(null)
const qrCodeRef = ref<HTMLElement>()
const fileInputRef = ref<HTMLInputElement>()

const formRef = ref<FormInstance>()
const formData = reactive<HospitalNode>({
  nodeCode: '',
  nodeName: '',
  floor: 1,
  xCoordinate: 0,
  yCoordinate: 0,
  nodeType: NodeType.NORMAL,
  description: ''
})

const formRules = {
  nodeCode: [
    { required: true, message: '请输入节点编码', trigger: 'blur' },
    {
      pattern: /^[a-zA-Z0-9_-]+$/,
      message: '节点编码只能包含字母、数字、下划线和短横线',
      trigger: 'blur'
    }
  ],
  nodeName: [
    { required: true, message: '请输入节点名称', trigger: 'blur' },
    { min: 2, max: 50, message: '节点名称长度应为 2 到 50 个字符', trigger: 'blur' }
  ],
  floor: [{ required: true, message: '请选择楼层', trigger: 'change' }],
  xCoordinate: [{ required: true, message: '请输入 X 坐标', trigger: 'blur' }],
  yCoordinate: [{ required: true, message: '请输入 Y 坐标', trigger: 'blur' }],
  nodeType: [{ required: true, message: '请选择节点类型', trigger: 'change' }]
}

const getOperatorName = () => userStore.userInfo?.nickname || userStore.userInfo?.username || '管理员'
const logAction = (module: 'location' | 'qrcode', action: string, target: string, detail?: string) => {
  void addLog({
    module,
    action,
    target,
    detail,
    operator: getOperatorName()
  })
}

const allLocationList = ref<HospitalNode[]>([])

const loadLocations = async () => {
  loading.value = true
  try {
    const rows = await getLocationList()
    allLocationList.value = rows || []
    pagination.total = allLocationList.value.length
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '加载地点数据失败'))
    allLocationList.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

const tableData = computed(() => {
  let list = [...allLocationList.value]

  if (searchForm.nodeName) {
    list = list.filter(item => item.nodeName.includes(searchForm.nodeName))
  }
  if (searchForm.nodeType) {
    list = list.filter(item => item.nodeType === searchForm.nodeType)
  }
  if (searchForm.floor !== '') {
    list = list.filter(item => item.floor === Number(searchForm.floor))
  }

  pagination.total = list.length
  const start = (pagination.current - 1) * pagination.pageSize
  const end = start + pagination.pageSize
  return list.slice(start, end)
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

const handleSearch = () => {
  pagination.current = 1
}

const handleReset = () => {
  searchForm.nodeName = ''
  searchForm.nodeType = ''
  searchForm.floor = ''
  pagination.current = 1
}

const handleAdd = () => {
  isEdit.value = false
  currentRow.value = null
  resetForm()
  dialogVisible.value = true
}

const handleEdit = (row: HospitalNode) => {
  isEdit.value = true
  currentRow.value = row
  Object.assign(formData, {
    nodeCode: row.nodeCode,
    nodeName: row.nodeName,
    floor: row.floor,
    xCoordinate: row.xCoordinate,
    yCoordinate: row.yCoordinate,
    nodeType: row.nodeType,
    description: row.description || ''
  })
  dialogVisible.value = true
}

const handleDelete = (row: HospitalNode) => {
  currentRow.value = row
  deleteDialogVisible.value = true
}

const confirmDelete = async () => {
  if (!currentRow.value?.id) return

  deleteLoading.value = true
  try {
    await deleteLocation(currentRow.value.id)
    logAction('location', '删除地点', currentRow.value.nodeCode, currentRow.value.nodeName)
    ElMessage.success('删除成功')
    deleteDialogVisible.value = false
    await loadLocations()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '删除失败'))
  } finally {
    deleteLoading.value = false
  }
}

const handleGenerateQRCode = async (row: HospitalNode) => {
  currentRow.value = row
  qrDialogVisible.value = true

  await new Promise(resolve => setTimeout(resolve, 100))

  if (!qrCodeRef.value) return
  qrCodeRef.value.innerHTML = ''

  const qrData = JSON.stringify({
    id: row.id,
    nodeCode: row.nodeCode,
    nodeName: row.nodeName,
    floor: row.floor
  })

  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256

  try {
    await QRCode.toCanvas(canvas, qrData, { width: 256 })
    qrCodeRef.value.appendChild(canvas)
    logAction('qrcode', '生成二维码', row.nodeCode, row.nodeName)
  } catch {
    ElMessage.error('二维码生成失败')
  }
}

const handleDownloadQRCode = () => {
  if (!qrCodeRef.value) return

  const canvas = qrCodeRef.value.querySelector('canvas')
  if (!canvas) return

  const link = document.createElement('a')
  link.download = `${currentRow.value?.nodeCode || 'qrcode'}.png`
  link.href = canvas.toDataURL()
  link.click()
  logAction('qrcode', '下载二维码', currentRow.value?.nodeCode || 'qrcode')
  ElMessage.success('下载成功')
}

const buildPayload = (row: HospitalNode): Location => ({
  nodeCode: row.nodeCode.trim(),
  nodeName: row.nodeName.trim(),
  floor: Number(row.floor),
  xCoordinate: Number(row.xCoordinate),
  yCoordinate: Number(row.yCoordinate),
  nodeType: row.nodeType,
  description: row.description || ''
})

const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async valid => {
    if (!valid) return

    submitLoading.value = true
    try {
      const payload = buildPayload(formData)
      if (isEdit.value && currentRow.value?.id) {
        await updateLocation(currentRow.value.id, payload)
        logAction('location', '编辑地点', payload.nodeCode, payload.nodeName)
        ElMessage.success('更新成功')
      } else {
        await createLocation(payload)
        logAction('location', '新增地点', payload.nodeCode, payload.nodeName)
        ElMessage.success('新增成功')
      }

      dialogVisible.value = false
      await loadLocations()
    } catch (error) {
      ElMessage.error(getErrorMessage(error, '保存失败'))
    } finally {
      submitLoading.value = false
    }
  })
}

const parseCsv = (text: string): HospitalNode[] => {
  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)

  if (lines.length < 2) return []

  const header = lines[0].split(',').map(item => item.trim())
  const expected = ['nodeCode', 'nodeName', 'floor', 'xCoordinate', 'yCoordinate', 'nodeType', 'description']
  if (expected.some((key, index) => header[index] !== key)) {
    throw new Error('CSV 表头不正确，请使用导出模板')
  }

  return lines.slice(1).map((line, rowIndex) => {
    const cells = line.split(',')
    if (cells.length < 6) {
      throw new Error(`第 ${rowIndex + 2} 行字段不足`)
    }

    const nodeType = cells[5]?.trim() as NodeType
    if (!nodeTypeList.some(item => item.value === nodeType)) {
      throw new Error(`第 ${rowIndex + 2} 行节点类型非法: ${cells[5]}`)
    }

    return {
      nodeCode: (cells[0] || '').trim(),
      nodeName: (cells[1] || '').trim(),
      floor: Number(cells[2]),
      xCoordinate: Number(cells[3]),
      yCoordinate: Number(cells[4]),
      nodeType,
      description: (cells[6] || '').trim()
    }
  })
}

const triggerImport = () => {
  fileInputRef.value?.click()
}

const handleImportCsv = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  try {
    const text = await file.text()
    const rows = parseCsv(text)
    if (rows.length === 0) {
      ElMessage.warning('CSV 无有效数据')
      return
    }

    loading.value = true
    let success = 0
    const errors: string[] = []

    for (const [index, row] of rows.entries()) {
      try {
        if (!row.nodeCode || !row.nodeName || Number.isNaN(row.floor) || Number.isNaN(row.xCoordinate) || Number.isNaN(row.yCoordinate)) {
          throw new Error('必填字段为空或格式不正确')
        }
        await createLocation(buildPayload(row))
        success += 1
      } catch (error) {
        errors.push(`第 ${index + 2} 行: ${getErrorMessage(error, '导入失败')}`)
      }
    }

    await loadLocations()
    if (errors.length === 0) {
      logAction('location', '导入CSV', file.name, `成功=${success}`)
      ElMessage.success(`导入成功，共 ${success} 条`)
    } else {
      logAction('location', '导入CSV', file.name, `成功=${success}, 失败=${errors.length}`)
      ElMessage.warning(`导入完成，成功 ${success} 条，失败 ${errors.length} 条`)
      console.warn('CSV 导入失败明细:', errors)
    }
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '解析 CSV 失败'))
  } finally {
    loading.value = false
  }
}

const handleExportCsv = () => {
  const header = 'nodeCode,nodeName,floor,xCoordinate,yCoordinate,nodeType,description'
  const rows = allLocationList.value.map(item => {
    const safeDescription = (item.description || '').replace(/,/g, '，').replace(/\r?\n/g, ' ')
    return [
      item.nodeCode,
      item.nodeName,
      item.floor,
      item.xCoordinate,
      item.yCoordinate,
      item.nodeType,
      safeDescription
    ].join(',')
  })

  const csv = [header, ...rows].join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `location-export-${Date.now()}.csv`
  link.click()
  URL.revokeObjectURL(url)
  logAction('location', '导出CSV', '地点数据', `共${allLocationList.value.length}条`)
  ElMessage.success('CSV 导出成功')
}

const resetForm = () => {
  formData.nodeCode = ''
  formData.nodeName = ''
  formData.floor = 1
  formData.xCoordinate = 0
  formData.yCoordinate = 0
  formData.nodeType = NodeType.NORMAL
  formData.description = ''
  formRef.value?.resetFields()
}

const handleDialogClose = () => {
  resetForm()
}

const handleSizeChange = (size: number) => {
  pagination.pageSize = size
}

const handleCurrentChange = (page: number) => {
  pagination.current = page
}

onMounted(() => {
  void loadLocations()
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

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.hidden-input {
  display: none;
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

.search-form {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
}

:deep(.search-form .el-form-item) {
  margin-bottom: 0;
}

.search-form :deep(.el-select) {
  min-width: 140px;
}

.search-form :deep(.el-input) {
  min-width: 220px;
}

.action-group {
  margin-left: auto;
}

:deep(.el-input__wrapper),
:deep(.el-select__wrapper),
:deep(.el-textarea__inner),
:deep(.el-input-number),
:deep(.el-input-number .el-input__wrapper) {
  border-radius: 0;
  box-shadow: none;
}

:deep(.el-button) {
  border-radius: 0;
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

.edit-form {
  padding-top: 4px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}

:deep(.edit-form .el-form-item) {
  margin-bottom: 20px;
}

:deep(.edit-form .el-input-number) {
  width: 100%;
}

.delete-confirm {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0 16px;
  color: #31404a;
}

.warning-icon {
  font-size: 24px;
  color: #c67c21;
}

.qrcode-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 8px 0 18px;
}

.qrcode {
  padding: 20px;
  background: #ffffff;
  border: 1px solid rgba(91, 109, 122, 0.12);
}

.qrcode-tip {
  margin: 0;
  text-align: center;
  color: #66737d;
  line-height: 1.7;
}

@media (max-width: 900px) {
  .page-hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
