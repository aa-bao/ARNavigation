<template>
  <div class="login-shell">
    <div class="login-grid">
      <section class="brand-panel">
        <div class="brand-rail">
          <span class="rail-index">01</span>
          <span class="rail-label">院内管理入口</span>
        </div>

        <div class="brand-copy">
          <p class="eyebrow">医院导航管理平台</p>
          <h1>ARHospital<br />管理端</h1>
          <p class="brand-text">
            用于院内导航数据、点位资源、二维码内容及用户权限的统一后台入口。
          </p>
        </div>
      </section>

      <section class="form-panel">
        <div class="form-frame">
          <div class="form-header">
            <p class="panel-kicker">Secure Access</p>
            <h2>管理员登录</h2>
            <p class="panel-text">请输入账号密码进入管理后台。</p>
          </div>

          <el-form ref="formRef" :model="loginForm" :rules="rules" label-position="top" class="login-form">
            <el-form-item label="用户名" prop="username">
              <el-input v-model="loginForm.username" placeholder="输入用户名" size="large" />
            </el-form-item>
            <el-form-item label="密码" prop="password">
              <el-input
                v-model="loginForm.password"
                type="password"
                placeholder="输入密码"
                show-password
                size="large"
              />
            </el-form-item>
            <el-form-item class="submit-row">
              <el-button type="primary" :loading="loading" class="login-button" @click="handleLogin">
                登录系统
              </el-button>
            </el-form-item>
          </el-form>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { getErrorMessage } from '@/utils/request'
import type { LoginRequest } from '@/types/user'

const router = useRouter()
const userStore = useUserStore()
const formRef = ref<FormInstance>()
const loading = ref(false)

const loginForm = reactive<LoginRequest>({
  username: '',
  password: ''
})

const rules: FormRules<LoginRequest> = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const handleLogin = async () => {
  await formRef.value?.validate()
  loading.value = true

  try {
    await userStore.login(loginForm)
    ElMessage.success('登录成功')
    await router.push('/')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '登录失败，请重试'))
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-shell {
  min-height: 100vh;
  padding: 28px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.42), rgba(255, 255, 255, 0) 22%),
    linear-gradient(90deg, rgba(47, 111, 159, 0.06) 1px, transparent 1px),
    linear-gradient(rgba(47, 111, 159, 0.04) 1px, transparent 1px),
    #f4f0e8;
  background-size: auto, 120px 120px, 120px 120px, auto;
}

.login-grid {
  min-height: calc(100vh - 56px);
  display: grid;
  grid-template-columns: minmax(320px, 1.1fr) minmax(380px, 520px);
  border: 1px solid rgba(91, 109, 122, 0.2);
  background: rgba(255, 253, 249, 0.62);
}

.brand-panel,
.form-panel {
  padding: 56px;
}

.brand-panel {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border-right: 1px solid rgba(91, 109, 122, 0.2);
}

.brand-rail,
.eyebrow,
.panel-kicker {
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: #2f6f9f;
  font-size: 11px;
}

.rail-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  margin-right: 14px;
  border: 1px solid rgba(91, 109, 122, 0.35);
  border-radius: 999px;
}

.brand-copy h1,
.form-header h2 {
  font-family: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Georgia, serif;
  color: #1f2a33;
}

.brand-copy h1 {
  margin: 20px 0 18px;
  font-size: clamp(48px, 6vw, 76px);
  line-height: 0.94;
}

.brand-text,
.panel-text {
  color: #63717d;
  line-height: 1.8;
}

.form-panel {
  display: flex;
  align-items: center;
  justify-content: center;
}

.form-frame {
  width: min(100%, 420px);
  padding: 40px;
  border: 1px solid rgba(91, 109, 122, 0.16);
  background: rgba(255, 252, 247, 0.94);
}

.login-form {
  margin-top: 28px;
}

.login-button {
  width: 100%;
  min-height: 50px;
  border-radius: 0;
  background: linear-gradient(180deg, #2f6f9f, #204d70);
}

@media (max-width: 980px) {
  .login-grid {
    grid-template-columns: 1fr;
  }
}
</style>
