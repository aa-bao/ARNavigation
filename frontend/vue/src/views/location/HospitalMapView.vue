<template>
  <div class="page-shell">
    <section class="page-hero">
      <div>
        <p class="hero-kicker">Hospital Map</p>
        <h1>医院地图预览</h1>
        <p class="hero-text">校验楼层底图与数据库坐标的一致性，快速查看点位分布和节点详情。</p>
      </div>
      <div class="hero-summary">
        <span>当前视图 {{ activeOption?.title || '-' }}</span>
        <span class="summary-divider"></span>
        <span>节点 {{ filteredNodes.length }}</span>
      </div>
    </section>

    <div class="layout-grid">
      <el-card class="panel-card filters-card" shadow="never">
        <template #header>
          <div class="panel-header">
            <div>
              <p class="panel-kicker">Filters</p>
              <h2>筛选条件</h2>
            </div>
          </div>
        </template>

        <div class="filter-stack">
          <div class="filter-block">
            <span class="filter-label">地图视图</span>
            <div class="chip-row">
              <button
                v-for="option in mapOptions"
                :key="option.key"
                class="chip"
                :class="{ active: option.key === activeKey }"
                @click="activeKey = option.key"
              >
                {{ option.key }}
              </button>
            </div>
          </div>

          <div class="filter-block">
            <span class="filter-label">搜索节点</span>
            <el-input v-model="keyword" placeholder="输入节点名称或编码" clearable />
          </div>

          <div class="filter-block">
            <span class="filter-label">节点类型</span>
            <el-select v-model="selectedType" placeholder="全部类型" clearable>
              <el-option label="全部类型" value="" />
              <el-option v-for="type in typeOptions" :key="type.value" :label="type.label" :value="type.value" />
            </el-select>
          </div>
        </div>
      </el-card>

      <el-card class="panel-card stage-card" shadow="never">
        <template #header>
          <div class="panel-header">
            <div>
              <p class="panel-kicker">Preview Stage</p>
              <h2>{{ activeOption?.title || '地图预览' }}</h2>
            </div>
            <span class="header-summary">{{ overviewHint }}</span>
          </div>
        </template>

        <div class="stage-shell">
          <img :src="activeOption?.imageUrl" class="stage-image" alt="地图预览" />

          <div v-if="!isOverview" class="marker-layer">
            <button
              v-for="node in projectedNodes"
              :key="node.id"
              class="map-marker"
              :class="{ active: selectedNode?.id === node.raw.id }"
              :style="{ left: `${node.leftPercent}%`, top: `${node.topPercent}%` }"
              @click="selectedNode = node.raw"
            >
              <span class="marker-dot"></span>
              <span class="marker-copy">{{ node.raw.nodeName }}</span>
            </button>
          </div>

          <div v-else class="overview-copy">
            <p>3D 总览仅供楼层关系参考，不做精确点位叠加。</p>
            <ul>
              <li v-for="item in floorSummary" :key="item.floor">{{ item.floor }}F：{{ item.count }} 个节点</li>
            </ul>
          </div>
        </div>
      </el-card>

      <el-card class="panel-card detail-card" shadow="never">
        <template #header>
          <div class="panel-header">
            <div>
              <p class="panel-kicker">Node Detail</p>
              <h2>节点详情</h2>
            </div>
          </div>
        </template>

        <div v-if="selectedNode" class="detail-list">
          <div class="detail-item"><span>节点 ID</span><strong>{{ selectedNode.id }}</strong></div>
          <div class="detail-item"><span>节点编码</span><strong>{{ selectedNode.nodeCode }}</strong></div>
          <div class="detail-item"><span>节点名称</span><strong>{{ selectedNode.nodeName }}</strong></div>
          <div class="detail-item"><span>楼层</span><strong>{{ selectedNode.floor }}F</strong></div>
          <div class="detail-item"><span>X 坐标</span><strong>{{ selectedNode.xCoordinate }}</strong></div>
          <div class="detail-item"><span>Y 坐标</span><strong>{{ selectedNode.yCoordinate }}</strong></div>
          <div class="detail-item"><span>节点类型</span><strong>{{ typeLabel(selectedNode.nodeType) }}</strong></div>
          <div class="detail-copy">{{ selectedNode.description || '暂无描述' }}</div>
        </div>
        <div v-else class="empty-copy">点击地图上的点位查看节点详情。</div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getLocationList, NodeType, type HospitalNode } from '@/api/location'
import { getFloorMapOption, projectPlanarPointToMap } from '@/utils/mapProjector'
import { MAP_OPTIONS, MAP_VIEW_TYPES, getMapOptionByKey } from '@/constants/maps'

const keyword = ref('')
const selectedType = ref('')
const activeKey = ref('1F')
const selectedNode = ref<HospitalNode | null>(null)
const nodes = ref<HospitalNode[]>([])

const typeOptions = [
  { value: NodeType.ENTRANCE, label: '入口' },
  { value: NodeType.NORMAL, label: '普通节点' },
  { value: NodeType.ELEVATOR, label: '电梯' },
  { value: NodeType.STAIR, label: '楼梯' },
  { value: NodeType.TOILET, label: '卫生间' },
  { value: NodeType.PHARMACY, label: '药房' },
  { value: NodeType.REGISTRATION, label: '挂号' },
  { value: NodeType.CLINIC, label: '诊室' },
  { value: NodeType.EXAMINATION, label: '检查区' },
  { value: NodeType.NURSE_STATION, label: '护士站' },
  { value: NodeType.BEDROOM, label: '病房' }
]

const mapOptions = MAP_OPTIONS

const activeOption = computed(() => getMapOptionByKey(activeKey.value) ?? MAP_OPTIONS[0])
const isOverview = computed(() => activeOption.value?.type === MAP_VIEW_TYPES.OVERVIEW)

const typeLabel = (value: string) => typeOptions.find(item => item.value === value)?.label || value

const filteredNodes = computed(() => {
  const normalizedKeyword = keyword.value.trim().toLowerCase()
  return nodes.value.filter((node) => {
    const matchesKeyword = !normalizedKeyword
      || node.nodeName.toLowerCase().includes(normalizedKeyword)
      || node.nodeCode.toLowerCase().includes(normalizedKeyword)
    const matchesType = !selectedType.value || node.nodeType === selectedType.value
    const matchesFloor = isOverview.value || node.floor === activeOption.value?.floor
    return matchesKeyword && matchesType && matchesFloor
  })
})

const projectedNodes = computed(() => {
  if (isOverview.value) {
    return []
  }

  return filteredNodes.value
    .map((node) => {
      const projection = projectPlanarPointToMap({
        x: node.xCoordinate,
        y: node.yCoordinate,
        floor: node.floor
      })
      if (!projection) {
        return null
      }

      return {
        id: `${node.id}-${node.nodeCode}`,
        leftPercent: projection.leftPercent,
        topPercent: projection.topPercent,
        raw: node
      }
    })
    .filter(Boolean) as Array<{ id: string; leftPercent: number; topPercent: number; raw: HospitalNode }>
})

const floorSummary = computed(() =>
  [1, 2, 3].map((floor) => ({
    floor,
    count: nodes.value.filter(node => node.floor === floor).length
  }))
)

const overviewHint = computed(() =>
  isOverview.value
    ? '总览视图只显示楼层摘要。'
    : `当前楼层 ${activeOption.value?.floor}F，点击点位可查看节点详情。`
)

onMounted(async () => {
  const response = await getLocationList()
  nodes.value = response
  selectedNode.value = response[0] ?? null
  const defaultFloor = getFloorMapOption(response[0]?.floor ?? 1)
  if (defaultFloor) {
    activeKey.value = defaultFloor.key
  }
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

.layout-grid {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr) 320px;
  gap: 18px;
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

.filter-stack {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.filter-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.filter-label {
  color: #31404a;
  font-size: 13px;
  font-weight: 600;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  min-width: 72px;
  padding: 10px 14px;
  border: 1px solid rgba(91, 109, 122, 0.14);
  background: rgba(255, 255, 255, 0.76);
  color: #52606b;
  cursor: pointer;
}

.chip.active {
  border-color: rgba(47, 111, 159, 0.3);
  background: #fffdfa;
  color: #204d70;
}

.stage-shell {
  position: relative;
}

.stage-image {
  width: 100%;
  display: block;
  border: 1px solid rgba(91, 109, 122, 0.12);
  background: #ffffff;
}

.marker-layer {
  position: absolute;
  inset: 0;
}

.map-marker {
  position: absolute;
  transform: translate(-50%, -50%);
  border: none;
  background: transparent;
  cursor: pointer;
}

.marker-dot {
  display: block;
  width: 16px;
  height: 16px;
  border-radius: 999px;
  border: 3px solid #fff;
  background: #2f6f9f;
  box-shadow: 0 0 0 6px rgba(47, 111, 159, 0.14);
}

.map-marker.active .marker-dot {
  background: #c1661a;
  box-shadow: 0 0 0 8px rgba(193, 102, 26, 0.16);
}

.marker-copy {
  display: inline-block;
  margin-top: 8px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.92);
  color: #22303a;
  font-size: 12px;
  white-space: nowrap;
}

.overview-copy {
  padding-top: 16px;
  color: #66737d;
  line-height: 1.8;
}

.overview-copy ul {
  padding-left: 18px;
}

.detail-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: #52606b;
  font-size: 13px;
}

.detail-item strong {
  color: #1f2a33;
  text-align: right;
}

.detail-copy,
.empty-copy {
  color: #66737d;
  line-height: 1.8;
}

@media (max-width: 1320px) {
  .layout-grid {
    grid-template-columns: 1fr;
  }
}
</style>
