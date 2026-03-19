import floor1Image from '@/assets/maps/Hospital_Layout_Floor_1.png'
import floor2Image from '@/assets/maps/Hospital_Layout_Floor_2.png'
import floor3Image from '@/assets/maps/Hospital_Layout_Floor_3.png'
import overviewImage from '@/assets/maps/hospital_3d_layout.png'

export const MAP_RANGE = Object.freeze({
  minX: -8,
  maxX: 48,
  minY: -20,
  maxY: 35
})

export const MAP_VIEW_TYPES = Object.freeze({
  FLOOR: 'floor',
  OVERVIEW: 'overview'
})

const DEFAULT_PLOT_AREA = Object.freeze({
  left: 0.16,
  right: 0.815,
  top: 0.165,
  bottom: 0.835
})

export const MAP_OPTIONS = [
  { key: '1F', floor: 1, type: MAP_VIEW_TYPES.FLOOR, title: '1F 平面图', imageUrl: floor1Image, plotArea: DEFAULT_PLOT_AREA },
  { key: '2F', floor: 2, type: MAP_VIEW_TYPES.FLOOR, title: '2F 平面图', imageUrl: floor2Image, plotArea: DEFAULT_PLOT_AREA },
  { key: '3F', floor: 3, type: MAP_VIEW_TYPES.FLOOR, title: '3F 平面图', imageUrl: floor3Image, plotArea: DEFAULT_PLOT_AREA },
  { key: '3D', floor: null, type: MAP_VIEW_TYPES.OVERVIEW, title: '3D 总览', imageUrl: overviewImage }
] as const

export const getMapOptionByKey = (key: string) =>
  MAP_OPTIONS.find(item => item.key === key) ?? null
