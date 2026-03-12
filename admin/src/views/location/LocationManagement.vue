<template>
  <div class="location-management">
    <el-card class="search-card">
      <template #header>
        <div class="card-header">
          <span class="title">搜索筛选</span>
        </div>
      </template>
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="节点名称">
          <el-input
            v-model="searchForm.nodeName"
            placeholder="请输入节点名称"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="节点类型">
          <el-select v-model="searchForm.nodeType" placeholder="请选择节点类型" clearable>
            <el-option label="全部" value="" />
            <el-option
              v-for="type in nodeTypeList"
              :key="type.value"
              :label="type.label"
              :value="type.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="楼层">
          <el-select v-model="searchForm.floor" placeholder="请选择楼层" clearable>
            <el-option label="全部" value="" />
            <el-option
              v-for="floor in floorList"
              :key="floor"
              :label="`${floor}楼`"
              :value="floor"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <span class="title">地点列表</span>
          <el-button type="primary" :icon="Plus" @click="handleAdd">新增地点</el-button>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" border stripe style="width: 100%">
        <el-table-column prop="id" label="节点ID" width="80" />
        <el-table-column prop="nodeCode" label="节点编码" width="120" />
        <el-table-column prop="nodeName" label="节点名称" min-width="150" />
        <el-table-column prop="floor" label="楼层" width="80" align="center">
          <template #default="{ row }">
            <el-tag type="info">{{ row.floor }}楼</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="nodeType" label="类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getNodeTypeTagType(row.nodeType)">
              {{ getNodeTypeLabel(row.nodeType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="坐标(X,Y)" width="140">
          <template #default="{ row }">
            <span>{{ row.xCoordinate }}, {{ row.yCoordinate }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="150" show-overflow-tooltip />
        <el-table-column label="操作" width="260" fixed="right" align="center">
          <template #default="{ row }">
            <el-button type="primary" size="small" :icon="Edit" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button type="danger" size="small" :icon="Delete" @click="handleDelete(row)">
              删除
            </el-button>
            <el-button type="success" size="small" :icon="Picture" @click="handleGenerateQRCode(row)">
              二维码
            </el-button>
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

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑地点' : '新增地点'"
      width="600px"
      :close-on-click-modal="false"
      @close="handleDialogClose"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
        class="form"
      >
        <el-form-item label="节点编码" prop="nodeCode">
          <el-input v-model="formData.nodeCode" placeholder="请输入节点编码" />
        </el-form-item>
        <el-form-item label="节点名称" prop="nodeName">
          <el-input v-model="formData.nodeName" placeholder="请输入节点名称" />
        </el-form-item>
        <el-form-item label="楼层" prop="floor">
          <el-select v-model="formData.floor" placeholder="请选择楼层" style="width: 100%">
            <el-option
              v-for="floor in floorList"
              :key="floor"
              :label="`${floor}楼`"
              :value="floor"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="X坐标" prop="xCoordinate">
          <el-input-number
            v-model="formData.xCoordinate"
            :precision="2"
            :step="0.1"
            :min="0"
            style="width: 100%"
            placeholder="请输入X坐标"
          />
        </el-form-item>
        <el-form-item label="Y坐标" prop="yCoordinate">
          <el-input-number
            v-model="formData.yCoordinate"
            :precision="2"
            :step="0.1"
            :min="0"
            style="width: 100%"
            placeholder="请输入Y坐标"
          />
        </el-form-item>
        <el-form-item label="节点类型" prop="nodeType">
          <el-select v-model="formData.nodeType" placeholder="请选择节点类型" style="width: 100%">
            <el-option
              v-for="type in nodeTypeList"
              :key="type.value"
              :label="type.label"
              :value="type.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="请输入描述"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 删除确认对话框 -->
    <el-dialog
      v-model="deleteDialogVisible"
      title="删除确认"
      width="400px"
    >
      <div class="delete-confirm">
        <el-icon class="warning-icon" color="#e6a23c"><Warning /></el-icon>
        <span>确定要删除该地点吗？此操作不可恢复！</span>
      </div>
      <template #footer>
        <el-button @click="deleteDialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="deleteLoading" @click="confirmDelete">确定删除</el-button>
      </template>
    </el-dialog>

    <!-- 二维码对话框 -->
    <el-dialog
      v-model="qrDialogVisible"
      title="二维码"
      width="400px"
    >
      <div class="qrcode-wrapper">
        <div ref="qrCodeRef" class="qrcode"></div>
        <p class="qrcode-tip">使用微信小程序扫描该二维码进行导航</p>
      </div>
      <template #footer>
        <el-button @click="qrDialogVisible = false">关闭</el-button>
        <el-button type="primary" :icon="Download" @click="handleDownloadQRCode">下载二维码</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { get, post, put, del } from '@/utils/request'
import { ElMessage } from 'element-plus'
import { Search, Refresh, Plus, Edit, Delete, Picture, Warning, Download } from '@element-plus/icons-vue'
import QRCode from 'qrcode'
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

// 楼层列表
const floorList = [-3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

// 搜索表单
const searchForm = reactive({
  nodeName: '',
  nodeType: '',
  floor: '' as number | string
})

// 分页
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0
})

// 状态
const loading = ref(false)
const submitLoading = ref(false)
const deleteLoading = ref(false)
const dialogVisible = ref(false)
const deleteDialogVisible = ref(false)
const qrDialogVisible = ref(false)
const isEdit = ref(false)
const currentRow = ref<HospitalNode | null>(null)

// 表单相关
const formRef = ref()
const formData = reactive<HospitalNode>({
  nodeCode: '',
  nodeName: '',
  floor: 1,
  xCoordinate: 0,
  yCoordinate: 0,
  nodeType: NodeType.NORMAL,
  description: ''
})

// 表单验证规则
const formRules = {
  nodeCode: [
    { required: true, message: '请输入节点编码', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_-]+$/, message: '节点编码只能包含字母、数字、下划线和短横线', trigger: 'blur' }
  ],
  nodeName: [
    { required: true, message: '请输入节点名称', trigger: 'blur' },
    { min: 2, max: 50, message: '节点名称长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  floor: [
    { required: true, message: '请选择楼层', trigger: 'change' }
  ],
  xCoordinate: [
    { required: true, message: '请输入X坐标', trigger: 'blur' }
  ],
  yCoordinate: [
    { required: true, message: '请输入Y坐标', trigger: 'blur' }
  ],
  nodeType: [
    { required: true, message: '请选择节点类型', trigger: 'change' }
  ]
}

// 真实数据
const locationList = ref<HospitalNode[]>([])
const allLocationList = ref<HospitalNode[]>([]) // 用于前端筛选

// 从后端加载数据
const loadLocations = async () => {
  loading.value = true
  try {
    const res = await get('/location/list', { page: 1, pageSize: 100 })
    locationList.value = res.data || res || []
    allLocationList.value = [...locationList.value]
    pagination.total = allLocationList.value.length
  } catch (error: any) {
    console.error('加载数据失败:', error)
    ElMessage.error(error.message || '加载数据失败')
    // 失败时使用空数组
    locationList.value = []
    allLocationList.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

// 表格数据 - 基于后端数据，支持前端筛选
const tableData = computed(() => {
  let list = [...allLocationList.value]

  // 筛选
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

  // 分页
  const start = (pagination.current - 1) * pagination.pageSize
  const end = start + pagination.pageSize
  return list.slice(start, end)
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

// 搜索
const handleSearch = () => {
  pagination.current = 1
}

// 重置
const handleReset = () => {
  searchForm.nodeName = ''
  searchForm.nodeType = ''
  searchForm.floor = ''
  pagination.current = 1
}

// 新增
const handleAdd = () => {
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

// 编辑
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

// 删除
const handleDelete = (row: HospitalNode) => {
  currentRow.value = row
  deleteDialogVisible.value = true
}

// 确认删除
const confirmDelete = async () => {
  deleteLoading.value = true
  try {
    // 调用后端删除API
    await del(`/navigation/node/${currentRow.value!.id}`)
    ElMessage.success('删除成功')
    deleteDialogVisible.value = false
    // 重新加载数据
    await loadLocations()
  } catch (error: any) {
    console.error('删除失败:', error)
    ElMessage.error(error.message || '删除失败')
  } finally {
    deleteLoading.value = false
  }
}

// 生成二维码
const qrCodeRef = ref<HTMLElement>()
const handleGenerateQRCode = async (row: HospitalNode) => {
  currentRow.value = row
  qrDialogVisible.value = true

  // 等待DOM更新
  await new Promise(resolve => setTimeout(resolve, 100))

  if (qrCodeRef.value) {
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
    } catch (error: any) {
      console.error(error)
    }
  }
}

// 下载二维码
const handleDownloadQRCode = () => {
  if (qrCodeRef.value) {
    const canvas = qrCodeRef.value.querySelector('canvas')
    if (canvas) {
      const link = document.createElement('a')
      link.download = `${currentRow.value?.nodeCode || 'qrcode'}.png`
      link.href = canvas.toDataURL()
      link.click()
      ElMessage.success('下载成功')
    }
  }
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid: boolean) => {
    if (valid) {
      submitLoading.value = true
      try {
        if (isEdit.value && currentRow.value && currentRow.value.id) {
          // 更新 - 调用后端API
          await put(`/navigation/node/${currentRow.value.id}`, formData)
          ElMessage.success('更新成功')
        } else {
          // 新增 - 调用后端API
          await post('/navigation/node', formData)
          ElMessage.success('新增成功')
        }

        dialogVisible.value = false
        // 重新加载数据
        await loadLocations()
      } catch (error: any) {
        console.error('操作失败:', error)
        ElMessage.error(error.message || '操作失败')
      } finally {
        submitLoading.value = false
      }
    }
  })
}

// 重置表单
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

// 关闭对话框
const handleDialogClose = () => {
  resetForm()
}

// 分页改变
const handleSizeChange = (size: number) => {
  pagination.pageSize = size
}

const handleCurrentChange = (page: number) => {
  pagination.current = page
}

// 初始化
onMounted(() => {
  loadLocations()
})
</script>

<style scoped>
.location-management {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.search-card,
.table-card {
  margin-bottom: 20px;
  border-radius: 8px;

  :deep(.el-card__header) {
    background-color: #fafafa;
    padding: 15px 20px;
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }
}

.search-form {
  margin-bottom: 0;

  :deep(.el-form-item) {
    margin-bottom: 0;
  }
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.form {
  padding-right: 20px;
}

.delete-confirm {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 0;
  gap: 10px;

  .warning-icon {
    font-size: 24px;
  }
}

.qrcode-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;

  .qrcode {
    padding: 20px;
    background: #fff;
    border: 1px solid #e8e8e8;
    border-radius: 4px;
  }

  .qrcode-tip {
    margin-top: 15px;
    color: #909399;
    font-size: 14px;
  }
}
</style>
