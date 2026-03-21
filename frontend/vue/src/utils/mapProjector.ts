import type { HospitalEdge, HospitalNode } from '@/api/location'
import { getMarkerMeta, getNodeTypeMeta, MAP_RANGE, MAP_VIEWPORT } from '@/constants/maps'

export interface MapNodeView {
  id: number | string
  raw: HospitalNode
  x: number
  y: number
  renderX: number
  renderY: number
  color: string
  label: string
}

export interface MapEdgeView {
  id: number | string
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface MapMarkerView {
  id: string
  kind: 'CURRENT' | 'DESTINATION' | 'SEGMENT_END'
  label: string
  color: string
  renderX: number
  renderY: number
  raw: HospitalNode
}

export interface MapSceneView {
  width: number
  height: number
  nodes: MapNodeView[]
  edges: MapEdgeView[]
  markers: MapMarkerView[]
  routePath: string
  gridX: number[]
  gridY: number[]
}

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))

const toNumber = (value: unknown) => {
  const parsed = Number(value)
  if (Number.isFinite(parsed)) {
    return parsed
  }

  if (typeof value === 'string') {
    const matched = value.match(/-?\d+(\.\d+)?/)
    if (matched) {
      const extracted = Number(matched[0])
      return Number.isFinite(extracted) ? extracted : null
    }
  }

  return null
}

const resolveNodeFloor = (node: Partial<HospitalNode> | null | undefined) => {
  const floor = toNumber(node?.floor)
  return floor === null ? null : floor
}

export const resolveNodeCoordinates = (node: Partial<HospitalNode> | null | undefined) => ({
  x: toNumber((node as Record<string, unknown> | null | undefined)?.planarX ?? node?.xCoordinate),
  y: toNumber((node as Record<string, unknown> | null | undefined)?.planarY ?? node?.yCoordinate)
})

export const projectPlanarPoint = (x: unknown, y: unknown) => {
  const pointX = toNumber(x)
  const pointY = toNumber(y)
  if (pointX === null || pointY === null) {
    return null
  }

  const { width, height, padding } = MAP_VIEWPORT
  const normalizedX = clamp((pointX - MAP_RANGE.minX) / (MAP_RANGE.maxX - MAP_RANGE.minX))
  const normalizedY = clamp((pointY - MAP_RANGE.minY) / (MAP_RANGE.maxY - MAP_RANGE.minY))
  const drawableWidth = width - padding.left - padding.right
  const drawableHeight = height - padding.top - padding.bottom

  return {
    x: pointX,
    y: pointY,
    renderX: padding.left + normalizedX * drawableWidth,
    renderY: padding.top + (1 - normalizedY) * drawableHeight
  }
}

export const buildMapMarker = (
  node: HospitalNode | null | undefined,
  kind: 'CURRENT' | 'DESTINATION' | 'SEGMENT_END'
): MapMarkerView | null => {
  if (!node) {
    return null
  }

  const projection = projectPlanarPoint(resolveNodeCoordinates(node).x, resolveNodeCoordinates(node).y)
  const floor = resolveNodeFloor(node)
  if (!projection || floor === null) {
    return null
  }

  const meta = getMarkerMeta(kind)

  return {
    id: `${kind}-${node.id ?? node.nodeCode ?? node.nodeName}`,
    kind,
    label: node.nodeName || meta.label,
    color: meta.color,
    renderX: projection.renderX,
    renderY: projection.renderY,
    raw: node
  }
}

const buildGrid = (count: number, start: number, size: number) =>
  Array.from({ length: count + 1 }, (_, index) => start + (size / count) * index)

export const buildMapScene = ({
  floor,
  nodes,
  edges,
  routePoints = [],
  markerNodes = {}
}: {
  floor: number
  nodes: HospitalNode[]
  edges: HospitalEdge[]
  routePoints?: Array<Partial<HospitalNode>>
  markerNodes?: Partial<Record<'CURRENT' | 'DESTINATION' | 'SEGMENT_END', HospitalNode | null>>
}): MapSceneView => {
  const floorNodes = nodes.filter(node => resolveNodeFloor(node) === floor)
  const nodeViews = floorNodes
    .map((node) => {
      const projection = projectPlanarPoint(resolveNodeCoordinates(node).x, resolveNodeCoordinates(node).y)
      if (!projection) {
        return null
      }

      return {
        id: node.id ?? node.nodeCode ?? `${node.nodeName}-${floor}`,
        raw: node,
        x: projection.x,
        y: projection.y,
        renderX: projection.renderX,
        renderY: projection.renderY,
        color: getNodeTypeMeta(node.nodeType).color,
        label: node.nodeName
      } satisfies MapNodeView
    })
    .filter(Boolean) as MapNodeView[]

  const nodeMap = new Map<number | string, MapNodeView>()
  nodeViews.forEach((node) => {
    nodeMap.set(node.id, node)
  })

  const edgeViews = edges
    .map((edge) => {
      const from = nodeMap.get(edge.fromNodeId)
      const to = nodeMap.get(edge.toNodeId)
      if (!from || !to) {
        return null
      }

      return {
        id: edge.id ?? `${edge.fromNodeId}-${edge.toNodeId}`,
        x1: from.renderX,
        y1: from.renderY,
        x2: to.renderX,
        y2: to.renderY
      } satisfies MapEdgeView
    })
    .filter(Boolean) as MapEdgeView[]

  const markerViews = (Object.entries(markerNodes) as Array<[MapMarkerView['kind'], HospitalNode | null | undefined]>)
    .map(([kind, node]) => {
      if (!node || resolveNodeFloor(node) !== floor) {
        return null
      }
      return buildMapMarker(node, kind)
    })
    .filter(Boolean) as MapMarkerView[]

  const routePath = routePoints
    .filter(point => resolveNodeFloor(point as HospitalNode) === floor)
    .map((point) => {
      const coordinates = resolveNodeCoordinates(point as HospitalNode)
      return projectPlanarPoint(coordinates.x, coordinates.y)
    })
    .filter(Boolean)
    .map(point => `${point!.renderX},${point!.renderY}`)
    .join(' ')

  const { width, height, padding } = MAP_VIEWPORT
  const drawableWidth = width - padding.left - padding.right
  const drawableHeight = height - padding.top - padding.bottom

  return {
    width,
    height,
    nodes: nodeViews,
    edges: edgeViews,
    markers: markerViews,
    routePath,
    gridX: buildGrid(6, padding.left, drawableWidth),
    gridY: buildGrid(6, padding.top, drawableHeight)
  }
}
