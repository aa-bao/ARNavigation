<template>
  <div class="qrcode-management">
    <el-card>
      <template #header>
        <div class="card-header">
          <span class="title">二维码管理</span>
        </div>
      </template>
      <el-empty description="请从地点管理页面生成二维码" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped lang="scss">
.qrcode-management {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.card-header .title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}
</style>
