<template>
  <el-container class="app-container">
    <el-header class="app-header">
      <div class="header-content">
        <h1 class="logo">VRHospital Admin</h1>
        <div class="user-info" v-if="userStore.isLoggedIn">
          <el-dropdown @command="handleCommand">
            <span class="user-link">
              <el-avatar :size="32" :src="userStore.userInfo?.avatar" />
              {{ userStore.userInfo?.username || '用户' }}
              <el-icon class="el-icon--right"><arrow-down /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人中心</el-dropdown-item>
                <el-dropdown-item command="settings">设置</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </el-header>
    <el-container>
      <el-aside width="200px" class="app-sidebar">
        <el-menu
          :default-active="activeMenu"
          class="sidebar-menu"
          router
          background-color="#304156"
          text-color="#bfcbd9"
          active-text-color="#409eff"
        >
          <el-menu-item index="/">
            <el-icon><location /></el-icon>
            <span>地点管理</span>
          </el-menu-item>
          <el-menu-item index="/qrcode-batch">
            <el-icon><picture /></el-icon>
            <span>二维码批量生成</span>
          </el-menu-item>
        </el-menu>
      </el-aside>
      <el-main class="app-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ArrowDown, Location } from '@element-plus/icons-vue'

const userStore = useUserStore()
const route = useRoute()

const activeMenu = computed(() => route.path)

const handleCommand = (command: string) => {
  switch (command) {
    case 'profile':
      console.log('个人中心')
      break
    case 'settings':
      console.log('设置')
      break
    case 'logout':
      userStore.logout()
      break
  }
}
</script>

<style scoped>
.app-container {
  height: 100vh;
}

.app-header {
  background-color: #ffffff;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  padding: 0 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
}

.logo {
  margin: 0;
  font-size: 20px;
  color: #303133;
}

.user-info {
  display: flex;
  align-items: center;
}

.user-link {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: #606266;
  font-size: 14px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 4px;
  transition: all 0.3s;
}

.user-link:hover {
  background-color: #f5f7fa;
  color: #409eff;
}

.app-sidebar {
  background-color: #304156;
  box-shadow: 2px 0 8px rgba(0, 21, 41, 0.1);
}

.sidebar-menu {
  border-right: none;
  height: 100%;
}

.app-main {
  background-color: #f0f2f5;
  padding: 20px;
  overflow: auto;
}
</style>
