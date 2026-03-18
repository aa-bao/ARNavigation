<template>
  <div class="page-shell">
    <section class="page-hero">
      <div>
        <p class="hero-kicker">User Access Control</p>
        <h1>用户管理</h1>
        <p class="hero-text">维护后台管理员与小程序用户账号，支持搜索、编辑、启停用和密码修改。</p>
      </div>
      <div class="hero-actions">
        <el-button type="primary" :icon="Plus" @click="openCreateDialog">新建用户</el-button>
      </div>
    </section>

    <el-card class="panel-card filters-card" shadow="never">
      <template #header>
        <div class="panel-header">
          <div>
            <p class="panel-kicker">筛选条件</p>
            <h2>检索用户资料</h2>
          </div>
        </div>
      </template>

      <el-form :inline="true" :model="query" class="search-form">
        <el-form-item label="关键词">
          <el-input v-model="query.keyword" placeholder="用户名 / 昵称 / 手机号 / openid" clearable />
        </el-form-item>
        <el-form-item label="身份">
          <el-select v-model="query.userType" clearable placeholder="全部">
            <el-option label="管理员" value="ADMIN" />
            <el-option label="微信用户" value="WECHAT" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" clearable placeholder="全部">
            <el-option label="启用" value="ENABLED" />
            <el-option label="停用" value="DISABLED" />
          </el-select>
        </el-form-item>
        <el-form-item class="action-group">
          <el-button type="primary" :icon="Search" @click="fetchUsers">搜索</el-button>
          <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="panel-card table-card" shadow="never">
      <template #header>
        <div class="panel-header">
          <div>
            <p class="panel-kicker">User Register</p>
            <h2>用户列表</h2>
          </div>
          <div class="header-summary">
            <span>共 {{ total }} 个用户</span>
          </div>
        </div>
      </template>

      <el-table :data="records" v-loading="loading" style="width: 100%">
        <el-table-column prop="id" label="用户 ID" width="92" />
        <el-table-column label="头像" width="92">
          <template #default="{ row }">
            <el-avatar :key="getAvatarKey(row.id, row.avatarUrl)" :size="40" :src="resolveAvatar(row.avatarUrl)">
              {{ (row.nickname || row.username).slice(0, 1).toUpperCase() }}
            </el-avatar>
          </template>
        </el-table-column>
        <el-table-column prop="username" label="用户名" min-width="140" />
        <el-table-column prop="nickname" label="昵称" min-width="160" />
        <el-table-column prop="userType" label="身份" width="120">
          <template #default="{ row }">
            <el-tag effect="plain">{{ row.userType === 'ADMIN' ? '管理员' : '微信用户' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="row.status === 'ENABLED' ? 'success' : 'info'" effect="plain">
              {{ row.status === 'ENABLED' ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="手机号" min-width="140" />
        <el-table-column prop="openid" label="OpenID" min-width="180" show-overflow-tooltip />
        <el-table-column prop="lastLoginAt" label="最近登录" min-width="180">
          <template #default="{ row }">
            {{ formatDate(row.lastLoginAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" min-width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" :icon="Edit" @click="openEditDialog(row)">编辑</el-button>
            <el-button
              link
              :type="row.status === 'ENABLED' ? 'warning' : 'success'"
              :icon="SwitchButton"
              @click="toggleStatus(row)"
            >
              {{ row.status === 'ENABLED' ? '停用' : '启用' }}
            </el-button>
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
          @current-change="fetchUsers"
          @size-change="fetchUsers"
        />
      </div>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新建用户' : '编辑用户'"
      width="640px"
      class="user-dialog"
      :close-on-click-modal="false"
      @closed="resetForm"
    >
      <el-form ref="formRef" :model="formModel" :rules="rules" label-position="top" class="edit-form">
        <div class="form-grid">
          <el-form-item label="用户名" prop="username">
            <el-input v-model="formModel.username" :disabled="dialogMode === 'edit'" />
          </el-form-item>
          <el-form-item label="昵称" prop="nickname">
            <el-input v-model="formModel.nickname" />
          </el-form-item>
          <el-form-item label="手机号">
            <el-input v-model="formModel.phone" />
          </el-form-item>
          <el-form-item label="身份" prop="userType">
            <el-select v-model="formModel.userType">
              <el-option label="管理员" value="ADMIN" />
              <el-option label="微信用户" value="WECHAT" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态" prop="status">
            <el-select v-model="formModel.status">
              <el-option label="启用" value="ENABLED" />
              <el-option label="停用" value="DISABLED" />
            </el-select>
          </el-form-item>
          <el-form-item v-if="passwordVisible" class="form-span-2" :label="dialogMode === 'create' ? '密码' : '新密码'" prop="password">
            <el-input v-model="formModel.password" type="password" show-password />
          </el-form-item>
        </div>

        <el-form-item label="头像">
          <div class="avatar-field">
            <el-avatar
              :key="getAvatarKey(formModel.username || 'form', formModel.avatarUrl)"
              :size="72"
              :src="resolveAvatar(formModel.avatarUrl)"
            >
              {{ (formModel.nickname || formModel.username || 'U').slice(0, 1).toUpperCase() }}
            </el-avatar>
            <div class="avatar-actions">
              <el-upload
                :show-file-list="false"
                accept="image/png,image/jpeg,image/webp"
                :http-request="handleAvatarUpload"
              >
                <el-button type="primary" plain :loading="avatarUploading">上传头像</el-button>
              </el-upload>
              <span class="avatar-tip">支持 png、jpg、webp，大小不超过 5MB</span>
            </div>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules, type UploadRequestOptions } from 'element-plus'
import { Edit, Plus, Refresh, Search, SwitchButton } from '@element-plus/icons-vue'
import {
  createAdminUser,
  getAdminUserList,
  updateAdminUser,
  updateAdminUserStatus
} from '@/api/admin-user'
import { uploadUserAvatar } from '@/api/user'
import { useUserStore } from '@/stores/user'
import { getErrorMessage, resolveAssetUrl } from '@/utils/request'
import type {
  AdminUserCreatePayload,
  AdminUserRecord,
  AdminUserUpdatePayload,
  UserStatus,
  UserType
} from '@/types/user'

type DialogMode = 'create' | 'edit'

const userStore = useUserStore()
const loading = ref(false)
const submitLoading = ref(false)
const avatarUploading = ref(false)
const avatarVersion = ref(Date.now())
const dialogVisible = ref(false)
const dialogMode = ref<DialogMode>('create')
const records = ref<AdminUserRecord[]>([])
const total = ref(0)
const editingRow = ref<AdminUserRecord | null>(null)
const formRef = ref<FormInstance>()

const query = reactive({
  keyword: '',
  userType: '' as '' | UserType,
  status: '' as '' | UserStatus,
  page: 1,
  pageSize: 10
})

const createDefaultForm = () => ({
  username: '',
  nickname: '',
  phone: '',
  avatarUrl: '',
  password: '',
  userType: 'ADMIN' as UserType,
  status: 'ENABLED' as UserStatus
})

const formModel = reactive(createDefaultForm())

const passwordVisible = computed(() => formModel.userType === 'ADMIN')

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
  userType: [{ required: true, message: '请选择身份', trigger: 'change' }],
  password: [
    {
      validator: (_rule, value, callback) => {
        if (formModel.userType !== 'ADMIN') {
          callback()
          return
        }
        if (dialogMode.value === 'create' && !value) {
          callback(new Error('请输入密码'))
          return
        }
        if (dialogMode.value === 'edit' && editingRow.value?.userType !== 'ADMIN' && !value) {
          callback(new Error('请输入密码'))
          return
        }
        if (value && value.length < 6) {
          callback(new Error('密码至少 6 位'))
          return
        }
        callback()
      },
      trigger: 'blur'
    }
  ]
}

const resolveAvatar = (value?: string) => resolveAssetUrl(value, avatarVersion.value)
const bumpAvatarVersion = () => {
  avatarVersion.value = Date.now()
}
const getAvatarKey = (id: string | number, value?: string) => `${id}-${value || 'empty'}-${avatarVersion.value}`

const formatDate = (value?: string) => {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false })
}

const resetForm = () => {
  Object.assign(formModel, createDefaultForm())
  editingRow.value = null
  avatarUploading.value = false
  bumpAvatarVersion()
  formRef.value?.clearValidate()
}

const fetchUsers = async () => {
  loading.value = true
  try {
    const data = await getAdminUserList(query)
    records.value = data.records
    total.value = data.total
    bumpAvatarVersion()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '获取用户列表失败'))
  } finally {
    loading.value = false
  }
}

const resetFilters = async () => {
  query.keyword = ''
  query.userType = ''
  query.status = ''
  query.page = 1
  await fetchUsers()
}

const openCreateDialog = () => {
  dialogMode.value = 'create'
  resetForm()
  dialogVisible.value = true
}

const openEditDialog = (row: AdminUserRecord) => {
  dialogMode.value = 'edit'
  editingRow.value = row
  Object.assign(formModel, {
    username: row.username,
    nickname: row.nickname,
    phone: row.phone || '',
    avatarUrl: row.avatarUrl || '',
    password: '',
    userType: row.userType,
    status: row.status
  })
  bumpAvatarVersion()
  dialogVisible.value = true
}

const handleAvatarUpload = async (options: UploadRequestOptions) => {
  avatarUploading.value = true
  try {
    const result = await uploadUserAvatar(options.file as File)
    formModel.avatarUrl = result.avatarUrl
    bumpAvatarVersion()
    options.onSuccess?.(result as never)
    ElMessage.success('头像上传成功')
  } catch (error) {
    options.onError?.(error as never)
    ElMessage.error(getErrorMessage(error, '头像上传失败'))
  } finally {
    avatarUploading.value = false
  }
}

const refreshSelfAvatarIfNeeded = async () => {
  if (editingRow.value?.id && editingRow.value.id === userStore.userInfo?.id) {
    await userStore.fetchCurrentUser()
  }
}

const submitForm = async () => {
  await formRef.value?.validate()
  submitLoading.value = true
  try {
    if (dialogMode.value === 'create') {
      const payload: AdminUserCreatePayload = {
        username: formModel.username.trim(),
        nickname: formModel.nickname.trim(),
        phone: formModel.phone.trim() || undefined,
        avatarUrl: formModel.avatarUrl || undefined,
        password: formModel.password,
        userType: formModel.userType,
        status: formModel.status
      }
      await createAdminUser(payload)
      ElMessage.success('创建成功')
    } else if (editingRow.value) {
      const payload: AdminUserUpdatePayload = {
        nickname: formModel.nickname.trim(),
        phone: formModel.phone.trim() || undefined,
        avatarUrl: formModel.avatarUrl || undefined,
        userType: formModel.userType,
        password: formModel.password || undefined,
        status: formModel.status
      }
      await updateAdminUser(editingRow.value.id, payload)
      await refreshSelfAvatarIfNeeded()
      ElMessage.success('更新成功')
    }

    dialogVisible.value = false
    await fetchUsers()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '保存失败'))
  } finally {
    submitLoading.value = false
  }
}

const toggleStatus = async (row: AdminUserRecord) => {
  const nextStatus: UserStatus = row.status === 'ENABLED' ? 'DISABLED' : 'ENABLED'
  try {
    await ElMessageBox.confirm(`确认${nextStatus === 'ENABLED' ? '启用' : '停用'} ${row.nickname || row.username}？`, '状态变更', {
      type: 'warning'
    })
    await updateAdminUserStatus(row.id, nextStatus)
    ElMessage.success('状态已更新')
    await fetchUsers()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(getErrorMessage(error, '更新状态失败'))
    }
  }
}

onMounted(() => {
  void fetchUsers()
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
  font-family: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif;
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
  display: grid;
  gap: 8px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 16px;
}

.form-span-2 {
  grid-column: 1 / -1;
}

.avatar-field {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 6px 0;
}

.avatar-actions {
  display: grid;
  gap: 8px;
}

.avatar-tip {
  color: #7b8790;
  font-size: 12px;
}

@media (max-width: 900px) {
  .page-hero,
  .panel-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .action-group {
    margin-left: 0;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-span-2 {
    grid-column: auto;
  }
}
</style>
