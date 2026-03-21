export const MAP_RANGE = Object.freeze({
  minX: -8,
  maxX: 48,
  minY: -20,
  maxY: 35
})

export const MAP_VIEWPORT = Object.freeze({
  width: 960,
  height: 660,
  padding: Object.freeze({
    top: 72,
    right: 88,
    bottom: 72,
    left: 88
  })
})

export const MAP_FLOOR_OPTIONS = Object.freeze([
  { key: '1F', floor: 1, title: '1F 平面图' },
  { key: '2F', floor: 2, title: '2F 平面图' },
  { key: '3F', floor: 3, title: '3F 平面图' }
])

export const NODE_TYPE_META = Object.freeze({
  ENTRANCE: { label: '入口', color: '#059669' },
  NORMAL: { label: '普通节点', color: '#64748b' },
  ELEVATOR: { label: '电梯', color: '#2563eb' },
  STAIR: { label: '楼梯', color: '#d97706' },
  TOILET: { label: '卫生间', color: '#dc2626' },
  PHARMACY: { label: '药房', color: '#7c3aed' },
  REGISTRATION: { label: '挂号', color: '#0f766e' },
  CLINIC: { label: '诊室', color: '#db2777' },
  EXAMINATION: { label: '检查区', color: '#be123c' },
  NURSE_STATION: { label: '护士站', color: '#0891b2' },
  BEDROOM: { label: '病房', color: '#1d4ed8' }
})

export const MARKER_META = Object.freeze({
  CURRENT: { label: '当前位置', color: '#2563eb' },
  DESTINATION: { label: '目的地', color: '#dc2626' },
  SEGMENT_END: { label: '下一校准点', color: '#d97706' }
})

export const getFloorOptionByKey = (key: string) =>
  MAP_FLOOR_OPTIONS.find(item => item.key === key) ?? MAP_FLOOR_OPTIONS[0]

export const getFloorOption = (floor: number | string | null | undefined) =>
  MAP_FLOOR_OPTIONS.find(item => item.floor === Number(floor)) ?? null

export const getNodeTypeMeta = (type: string | null | undefined) =>
  NODE_TYPE_META[type as keyof typeof NODE_TYPE_META] ?? NODE_TYPE_META.NORMAL

export const getMarkerMeta = (kind: string | null | undefined) =>
  MARKER_META[kind as keyof typeof MARKER_META] ?? MARKER_META.CURRENT
