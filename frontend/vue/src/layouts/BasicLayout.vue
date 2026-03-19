<template>
  <el-container class="app-shell">
    <el-aside width="248px" class="app-sidebar">
      <div class="sidebar-head">
        <p class="sidebar-kicker">Hospital Navigation Console</p>
        <h1 class="sidebar-title">ARHospital</h1>
        <p class="sidebar-text">院内导航、点位资料、二维码资产与用户权限管理后台。</p>
      </div>

      <el-menu :default-active="activeMenu" class="sidebar-menu" router>
        <el-menu-item index="/users">
          <el-icon><User /></el-icon>
          <span>用户管理</span>
        </el-menu-item>
        <el-menu-item index="/">
          <el-icon><Location /></el-icon>
          <span>地点管理</span>
        </el-menu-item>
        <el-menu-item index="/qrcode-batch">
          <el-icon><Picture /></el-icon>
          <span>二维码批量生成</span>
        </el-menu-item>
        <el-menu-item index="/hospital-map">
          <el-icon><MapLocation /></el-icon>
          <span>医院地图</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container class="app-main-shell">
      <el-header class="app-header">
        <div class="header-meta">
          <span class="meta-index">02</span>
          <div>
            <p class="meta-kicker">Administrative Workspace</p>
            <h2>{{ pageTitle }}</h2>
          </div>
        </div>

        <div class="user-info">
          <el-dropdown @command="handleCommand">
            <span class="user-link">
              <el-avatar :key="userAvatar" class="user-avatar" :size="42" :src="userAvatar">
                {{ userInitial }}
              </el-avatar>
              <span class="user-copy">
                <strong>{{ userName }}</strong>
                <small>{{ identityLabel }}</small>
              </span>
              <el-icon class="arrow-icon"><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="app-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowDown, Location, MapLocation, Picture, User } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { resolveAssetUrl } from '@/utils/request'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const activeMenu = computed(() => route.path)

const pageTitle = computed(() => {
  if (route.path === '/qrcode-batch') return '二维码批量生成'
  if (route.path === '/hospital-map') return '医院地图'
  if (route.path === '/users') return '用户管理'
  return '地点管理'
})

const userName = computed(() => userStore.userInfo?.nickname || userStore.userInfo?.username || '管理员')
const userAvatar = computed(() =>
  resolveAssetUrl(userStore.userInfo?.avatarUrl, userStore.userInfo?.avatarUrl || userStore.userInfo?.id)
)
const userInitial = computed(() => userName.value.slice(0, 1).toUpperCase())
const identityLabel = computed(() => (userStore.userInfo?.userType === 'WECHAT' ? '微信用户' : '管理员'))

const handleCommand = async (command: string) => {
  if (command !== 'logout') return
  await userStore.logout()
  ElMessage.success('已退出登录')
  await router.push('/login')
}
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  background: #f3eee4;
}

.app-sidebar {
  display: flex;
  flex-direction: column;
  padding: 28px 20px 24px;
  border-right: 1px solid rgba(91, 109, 122, 0.16);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.46), rgba(255, 255, 255, 0)),
    #f7f2e8;
}

.sidebar-head {
  padding: 10px 12px 28px;
}

.sidebar-kicker,
.meta-kicker {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #2f6f9f;
}

.sidebar-title {
  margin: 14px 0 10px;
  font-family: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Georgia, serif;
  font-size: 34px;
  line-height: 1;
  color: #1f2a33;
}

.sidebar-text {
  margin: 0;
  color: #66737d;
  line-height: 1.8;
  font-size: 14px;
}

.sidebar-menu {
  border-right: none;
  background: transparent;
}

:deep(.sidebar-menu .el-menu-item) {
  height: 48px;
  margin: 6px 0;
  border: 1px solid transparent;
  color: #4d5b66;
}

:deep(.sidebar-menu .el-menu-item.is-active) {
  background: #fffdfa;
  color: #204d70;
  border-color: rgba(47, 111, 159, 0.24);
}

.app-main-shell {
  min-width: 0;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 88px;
  padding: 0 28px;
  border-bottom: 1px solid rgba(91, 109, 122, 0.14);
  background: rgba(255, 252, 247, 0.84);
}

.header-meta {
  display: flex;
  align-items: center;
  gap: 16px;
}

.meta-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid rgba(47, 111, 159, 0.22);
  border-radius: 999px;
  color: #204d70;
}

.header-meta h2 {
  margin: 8px 0 0;
  font-size: 26px;
  font-weight: 600;
  color: #1f2a33;
}

.user-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border: 1px solid rgba(91, 109, 122, 0.14);
  background: rgba(255, 255, 255, 0.72);
  cursor: pointer;
}

.user-avatar {
  background: #204d70;
  color: #fff;
}

.user-copy {
  display: flex;
  flex-direction: column;
}

.user-copy strong {
  font-size: 14px;
}

.user-copy small {
  color: #7b8790;
  font-size: 11px;
}

@media (max-width: 980px) {
  .app-shell {
    flex-direction: column;
  }
}
</style>
