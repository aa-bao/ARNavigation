<template>
  <div class="page-shell">
    <section class="page-hero">
      <div>
        <p class="hero-kicker">Hospital Map</p>
        <h1>医院地图预览</h1>
        <p class="hero-text">直接使用节点与边数据绘制楼层图，用于校验坐标、连线和点位分布。</p>
      </div>
      <div class="hero-summary">
        <span>当前楼层 {{ activeFloorOption.title }}</span>
        <span class="summary-divider"></span>
        <span>节点 {{ scene.nodes.length }}</span>
        <span class="summary-divider"></span>
        <span>边 {{ scene.edges.length }}</span>
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
            <span class="filter-label">楼层</span>
            <div class="chip-row">
              <button
                v-for="option in MAP_FLOOR_OPTIONS"
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

          <div class="filter-block">
            <span class="filter-label">边线显示</span>
            <el-switch v-model="showEdges" />
          </div>

          <div class="filter-block">
            <span class="filter-label">楼层摘要</span>
            <div class="summary-pills">
              <span v-for="item in floorSummary" :key="item.floor" class="summary-pill">
                {{ item.floor }}F {{ item.count }}
              </span>
            </div>
          </div>
        </div>
      </el-card>

      <el-card class="panel-card stage-card" shadow="never">
        <template #header>
          <div class="panel-header">
            <div>
              <p class="panel-kicker">Scene</p>
              <h2>{{ activeFloorOption.title }}</h2>
            </div>
            <span class="header-summary">SVG 数据驱动绘制</span>
          </div>
        </template>

        <div v-loading="loading" class="stage-shell">
          <div v-if="errorText" class="empty-copy">{{ errorText }}</div>

          <svg
            v-else
            class="map-stage"
            :viewBox="`0 0 ${scene.width} ${scene.height}`"
            role="img"
            aria-label="医院楼层地图"
          >
            <rect class="map-board" x="0" y="0" :width="scene.width" :height="scene.height" rx="28" />

            <g class="grid-layer">
              <line v-for="x in scene.gridX" :key="`x-${x}`" :x1="x" y1="72" :x2="x" y2="588" />
              <line v-for="y in scene.gridY" :key="`y-${y}`" x1="88" :y1="y" x2="872" :y2="y" />
            </g>

            <g v-if="showEdges" class="edge-layer">
              <line
                v-for="edge in scene.edges"
                :key="edge.id"
                :x1="edge.x1"
                :y1="edge.y1"
                :x2="edge.x2"
                :y2="edge.y2"
              />
            </g>

            <g class="node-layer">
              <g
                v-for="node in filteredNodes"
                :key="node.id"
                class="node-group"
                :class="{ active: selectedNode?.id === node.raw.id }"
                @click="selectedNode = node.raw"
              >
                <circle :cx="node.renderX" :cy="node.renderY" r="8" :fill="node.color" />
                <circle :cx="node.renderX" :cy="node.renderY" r="14" class="node-ring" />
                <text :x="node.renderX" :y="node.renderY - 18" text-anchor="middle">{{ node.label }}</text>
              </g>
            </g>
          </svg>
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
        <div v-else class="empty-copy">点击地图中的点位查看节点详情。</div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { getLocationEdges, getLocationList, NodeType, type HospitalNode, type HospitalEdge } from '@/api/location'
import { MAP_FLOOR_OPTIONS, getFloorOptionByKey, getNodeTypeMeta } from '@/constants/maps'
import { buildMapScene } from '@/utils/mapProjector'

const keyword = ref('')
const selectedType = ref('')
const activeKey = ref('1F')
const showEdges = ref(true)
const selectedNode = ref<HospitalNode | null>(null)
const loading = ref(false)
const errorText = ref('')
const nodes = ref<HospitalNode[]>([])
const edges = ref<HospitalEdge[]>([])

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

const activeFloorOption = computed(() => getFloorOptionByKey(activeKey.value))

const scene = computed(() =>
  buildMapScene({
    floor: activeFloorOption.value.floor,
    nodes: nodes.value,
    edges: edges.value
  })
)

const filteredNodes = computed(() => {
  const normalizedKeyword = keyword.value.trim().toLowerCase()
  return scene.value.nodes.filter((node) => {
    const matchesKeyword = !normalizedKeyword
      || node.raw.nodeName.toLowerCase().includes(normalizedKeyword)
      || node.raw.nodeCode.toLowerCase().includes(normalizedKeyword)
    const matchesType = !selectedType.value || node.raw.nodeType === selectedType.value
    return matchesKeyword && matchesType
  })
})

const floorSummary = computed(() =>
  MAP_FLOOR_OPTIONS.map(option => ({
    floor: option.floor,
    count: nodes.value.filter(node => node.floor === option.floor).length
  }))
)

const typeLabel = (value: string) => getNodeTypeMeta(value).label

const loadData = async () => {
  loading.value = true
  errorText.value = ''
  try {
    const [nodeList, edgeList] = await Promise.all([
      getLocationList(),
      getLocationEdges()
    ])
    nodes.value = nodeList
    edges.value = edgeList
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '地图数据加载失败'
  } finally {
    loading.value = false
  }
}

watch(activeKey, () => {
  if (selectedNode.value?.floor !== activeFloorOption.value.floor) {
    selectedNode.value = null
  }
})

onMounted(() => {
  void loadData()
})
</script>

<style scoped>
.page-shell {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-hero {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 28px 32px;
  border-radius: 28px;
  background:
    radial-gradient(circle at top left, rgba(32, 77, 112, 0.18), transparent 34%),
    linear-gradient(135deg, #f9f4e8 0%, #f2f7f7 100%);
}

.hero-kicker,
.panel-kicker {
  margin: 0 0 8px;
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #2f6f9f;
}

.page-hero h1,
.panel-header h2 {
  margin: 0;
  color: #1f2a33;
}

.hero-text {
  max-width: 680px;
  margin: 10px 0 0;
  color: #5f6d76;
  line-height: 1.75;
}

.hero-summary {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  align-self: flex-start;
  padding: 14px 18px;
  border: 1px solid rgba(47, 111, 159, 0.18);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: #38556a;
  font-size: 13px;
}

.summary-divider {
  width: 1px;
  height: 16px;
  background: rgba(56, 85, 106, 0.18);
}

.layout-grid {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr) 280px;
  gap: 24px;
}

.panel-card {
  border: 1px solid rgba(91, 109, 122, 0.12);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.88);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
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
  color: #5f6d76;
  font-size: 13px;
  font-weight: 600;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.chip {
  min-width: 72px;
  padding: 10px 16px;
  border: 0;
  border-radius: 999px;
  background: #edf2f4;
  color: #4c5d68;
  cursor: pointer;
  transition: all 0.2s ease;
}

.chip.active {
  background: linear-gradient(135deg, #0f766e 0%, #2563eb 100%);
  color: #fff;
}

.summary-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.summary-pill {
  padding: 8px 12px;
  border-radius: 999px;
  background: #f5f7f9;
  color: #475569;
  font-size: 12px;
}

.header-summary {
  color: #64748b;
  font-size: 13px;
}

.stage-shell {
  min-height: 680px;
}

.map-stage {
  width: 100%;
  max-height: 680px;
}

.map-board {
  fill: #f7fbff;
  stroke: rgba(47, 111, 159, 0.18);
  stroke-width: 1.5;
}

.grid-layer line {
  stroke: rgba(148, 163, 184, 0.16);
  stroke-width: 1;
}

.edge-layer line {
  stroke: rgba(36, 67, 94, 0.46);
  stroke-width: 5;
  stroke-linecap: round;
}

.node-group {
  cursor: pointer;
}

.node-ring {
  fill: rgba(255, 255, 255, 0.78);
  stroke: rgba(15, 23, 42, 0.08);
  stroke-width: 1;
}

.node-group text {
  fill: #344556;
  font-size: 16px;
  font-weight: 600;
}

.node-group.active .node-ring {
  stroke: #0f172a;
  stroke-width: 2;
}

.detail-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
  color: #475569;
}

.detail-item strong {
  color: #1f2a33;
  text-align: right;
}

.detail-copy,
.empty-copy {
  color: #64748b;
  line-height: 1.7;
}

@media (max-width: 1320px) {
  .layout-grid {
    grid-template-columns: 1fr;
  }

  .stage-shell {
    min-height: 0;
  }
}

@media (max-width: 900px) {
  .page-hero {
    flex-direction: column;
  }
}
</style>
