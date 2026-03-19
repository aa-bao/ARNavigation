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

export const MAP_OPTIONS = [
  { key: '1F', floor: 1, type: MAP_VIEW_TYPES.FLOOR, title: '1F 平面图', imageUrl: floor1Image },
  { key: '2F', floor: 2, type: MAP_VIEW_TYPES.FLOOR, title: '2F 平面图', imageUrl: floor2Image },
  { key: '3F', floor: 3, type: MAP_VIEW_TYPES.FLOOR, title: '3F 平面图', imageUrl: floor3Image },
  { key: '3D', floor: null, type: MAP_VIEW_TYPES.OVERVIEW, title: '3D 总览', imageUrl: overviewImage }
] as const

export const getMapOptionByKey = (key: string) =>
  MAP_OPTIONS.find(item => item.key === key) ?? null
