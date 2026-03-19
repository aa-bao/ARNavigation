import { getMapOptionByKey, MAP_OPTIONS, MAP_RANGE, MAP_VIEW_TYPES } from '@/constants/maps'

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))

const toNumber = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export const getFloorMapOption = (floor: number | string | null | undefined) =>
  MAP_OPTIONS.find(item => item.type === MAP_VIEW_TYPES.FLOOR && item.floor === Number(floor)) ?? null

export const projectPlanarPointToMap = ({
  x,
  y,
  floor,
  key
}: {
  x: number | string | null | undefined
  y: number | string | null | undefined
  floor?: number | string | null
  key?: string
}) => {
  const option = key ? getMapOptionByKey(key) : getFloorMapOption(floor)
  const pointX = toNumber(x)
  const pointY = toNumber(y)

  if (!option || option.type !== MAP_VIEW_TYPES.FLOOR || pointX === null || pointY === null) {
    return null
  }

  const normalizedX = (pointX - MAP_RANGE.minX) / (MAP_RANGE.maxX - MAP_RANGE.minX)
  const normalizedY = (pointY - MAP_RANGE.minY) / (MAP_RANGE.maxY - MAP_RANGE.minY)

  return {
    leftPercent: clamp(normalizedX) * 100,
    topPercent: (1 - clamp(normalizedY)) * 100
  }
}
