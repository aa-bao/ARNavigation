<template>
  <div class="qr-code-card">
    <div class="qr-code-container">
      <div class="qr-code-wrapper">
        <canvas ref="qrCanvas" width="200" height="200"></canvas>
      </div>
      <div class="qr-info">
        <div class="info-item">
          <span class="label">节点编码:</span>
          <span class="value">{{ nodeCode }}</span>
        </div>
        <div class="info-item">
          <span class="label">节点名称:</span>
          <span class="value">{{ nodeName }}</span>
        </div>
      </div>
      <div class="qr-actions">
        <el-button type="primary" @click="downloadQRCode">
          <el-icon><Download /></el-icon>
          下载PNG
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import QRCode from 'qrcode'
import { Download } from '@element-plus/icons-vue'

interface Props {
  nodeCode: string
  nodeName: string
}

const props = defineProps<Props>()

const qrCanvas = ref<HTMLCanvasElement | null>(null)

const generateQRCode = async () => {
  if (!qrCanvas.value) return

  const qrContent = JSON.stringify({
    nodeCode: props.nodeCode,
    name: props.nodeName,
    type: 'hospital_node'
  })

  try {
    await QRCode.toCanvas(qrCanvas.value, qrContent, {
      width: 200,
      height: 200,
      margin: 2,
      colorDark: '#000000',
      colorLight: '#ffffff'
    })
  } catch (error) {
    console.error('二维码生成失败:', error)
  }
}

const downloadQRCode = () => {
  if (!qrCanvas.value) return

  const link = document.createElement('a')
  link.download = `${props.nodeCode}_${props.nodeName}_qrcode.png`
  link.href = qrCanvas.value.toDataURL('image/png')
  link.click()
}

watch(() => [props.nodeCode, props.nodeName], () => {
  generateQRCode()
})

onMounted(() => {
  generateQRCode()
})
</script>

<style scoped>
.qr-code-card {
  max-width: 300px;
  margin: 0 auto;
}

.qr-code-container {
  text-align: center;
  padding: 20px;
}

.qr-code-wrapper {
  margin-bottom: 20px;
  padding: 20px;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  display: inline-block;
}

.qr-info {
  text-align: left;
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 8px;
}

.info-item {
  display: flex;
  margin-bottom: 8px;
}

.info-item:last-child {
  margin-bottom: 0;
}

.label {
  width: 80px;
  font-weight: bold;
  color: #606266;
  margin-right: 10px;
}

.value {
  color: #303133;
  flex: 1;
  word-break: break-all;
}

.qr-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}
</style>
