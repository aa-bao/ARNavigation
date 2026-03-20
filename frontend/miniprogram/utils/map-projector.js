import {
  getMarkerStyle,
  getNodeTypeStyle,
  MAP_COORDINATE_RANGE,
  MAP_VIEWPORT
} from '../services/map-data.js';

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const toNumber = (value) => {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) {
    return parsed;
  }

  if (typeof value === 'string') {
    const matched = value.match(/-?\d+(\.\d+)?/);
    if (matched) {
      const extracted = Number(matched[0]);
      return Number.isFinite(extracted) ? extracted : null;
    }
  }

  return null;
};

export const resolveNodeFloor = (node = {}) => {
  const floor = toNumber(node.floor ?? node.floorNumber);
  return floor === null ? null : floor;
};

export const resolveNodeCoordinates = (node = {}) => ({
  x: toNumber(
    node.planarX
    ?? node.xCoordinate
    ?? node.xcoordinate
    ?? node.x_coordinate
    ?? node.coordinates?.x
    ?? node.x
  ),
  y: toNumber(
    node.planarY
    ?? node.yCoordinate
    ?? node.ycoordinate
    ?? node.y_coordinate
    ?? node.coordinates?.y
    ?? node.y
  )
});

export const projectPlanarPoint = (x, y) => {
  return projectPlanarPointWithBounds(x, y, MAP_COORDINATE_RANGE);
};

export const projectPlanarPointWithBounds = (x, y, bounds = MAP_COORDINATE_RANGE) => {
  const pointX = toNumber(x);
  const pointY = toNumber(y);
  if (pointX === null || pointY === null) {
    return null;
  }

  const { width, height, padding } = MAP_VIEWPORT;
  const spanX = Math.max((bounds.maxX - bounds.minX), 1);
  const spanY = Math.max((bounds.maxY - bounds.minY), 1);
  const normalizedX = clamp((pointX - bounds.minX) / spanX);
  const normalizedY = clamp((pointY - bounds.minY) / spanY);
  const drawableWidth = width - padding.left - padding.right;
  const drawableHeight = height - padding.top - padding.bottom;

  return {
    x: pointX,
    y: pointY,
    renderX: padding.left + normalizedX * drawableWidth,
    renderY: padding.top + (1 - normalizedY) * drawableHeight
  };
};

export const buildMapMarker = (node, markerType) => {
  if (!node) {
    return null;
  }

  const floor = resolveNodeFloor(node);
  const coordinates = resolveNodeCoordinates(node);
  const projection = projectPlanarPoint(coordinates.x, coordinates.y);
  if (!projection || floor === null) {
    return null;
  }

  return {
    id: `${markerType}-${node.nodeCode || node.nodeId || node.id || node.nodeName || 'unknown'}`,
    markerType,
    floor,
    nodeName: node.nodeName || node.name || '未命名点位',
    nodeCode: node.nodeCode || '',
    description: node.description || '',
    color: getMarkerStyle(markerType).color,
    renderX: projection.renderX,
    renderY: projection.renderY,
    raw: node
  };
};

const deriveFloorBounds = (points = []) => {
  const valid = points.filter((point) => Number.isFinite(point?.x) && Number.isFinite(point?.y));
  if (!valid.length) {
    return MAP_COORDINATE_RANGE;
  }

  const minX = Math.min(...valid.map((point) => point.x));
  const maxX = Math.max(...valid.map((point) => point.x));
  const minY = Math.min(...valid.map((point) => point.y));
  const maxY = Math.max(...valid.map((point) => point.y));

  const spanX = Math.max(maxX - minX, 18);
  const spanY = Math.max(maxY - minY, 18);
  const paddingX = Math.max(spanX * 0.22, 3.5);
  const paddingY = Math.max(spanY * 0.24, 3.5);

  return {
    minX: minX - paddingX,
    maxX: maxX + paddingX,
    minY: minY - paddingY,
    maxY: maxY + paddingY
  };
};

const buildGrid = (count, start, size) =>
  Array.from({ length: count + 1 }, (_, index) => start + (size / count) * index);

export const buildMapScene = ({
  floor,
  nodes = [],
  edges = [],
  routePoints = [],
  markerNodes = {}
} = {}) => {
  const floorNodes = nodes.filter((node) => resolveNodeFloor(node) === Number(floor));
  const floorRoutePoints = routePoints.filter((point) => resolveNodeFloor(point) === Number(floor));
  const floorMarkerNodes = Object.values(markerNodes || {}).filter(
    (node) => node && resolveNodeFloor(node) === Number(floor)
  );

  const floorBounds = deriveFloorBounds(
    floorNodes
      .concat(floorRoutePoints)
      .concat(floorMarkerNodes)
      .map((node) => resolveNodeCoordinates(node))
      .filter((point) => point.x !== null && point.y !== null)
  );

  const nodeViews = floorNodes
    .map((node) => {
      const coordinates = resolveNodeCoordinates(node);
      const projection = projectPlanarPointWithBounds(coordinates.x, coordinates.y, floorBounds);
      if (!projection) {
        return null;
      }

      return {
        id: node.id ?? node.nodeCode ?? `${node.nodeName}-${floor}`,
        raw: node,
        renderX: projection.renderX,
        renderY: projection.renderY,
        color: getNodeTypeStyle(node.nodeType).color,
        label: node.nodeName || node.name || '未命名'
      };
    })
    .filter(Boolean);

  const nodeMap = new Map();
  nodeViews.forEach((node) => {
    nodeMap.set(node.id, node);
  });

  const edgeViews = edges
    .map((edge) => {
      const from = nodeMap.get(edge.fromNodeId);
      const to = nodeMap.get(edge.toNodeId);
      if (!from || !to) {
        return null;
      }

      return {
        id: edge.id ?? `${edge.fromNodeId}-${edge.toNodeId}`,
        x1: from.renderX,
        y1: from.renderY,
        x2: to.renderX,
        y2: to.renderY
      };
    })
    .filter(Boolean);

  const markers = Object.keys(markerNodes)
    .map((markerType) => {
      const node = markerNodes[markerType];
      if (!node || resolveNodeFloor(node) !== Number(floor)) {
        return null;
      }
      const coordinates = resolveNodeCoordinates(node);
      const projection = projectPlanarPointWithBounds(coordinates.x, coordinates.y, floorBounds);
      if (!projection) {
        return null;
      }
      return {
        id: `${markerType}-${node.nodeCode || node.nodeId || node.id || node.nodeName || 'unknown'}`,
        markerType,
        floor: Number(floor),
        nodeName: node.nodeName || node.name || '未命名点位',
        nodeCode: node.nodeCode || '',
        description: node.description || '',
        color: getMarkerStyle(markerType).color,
        renderX: projection.renderX,
        renderY: projection.renderY,
        raw: node
      };
    })
    .filter(Boolean);

  const route = floorRoutePoints
    .map((point) => {
      const coordinates = resolveNodeCoordinates(point);
      return projectPlanarPointWithBounds(coordinates.x, coordinates.y, floorBounds);
    })
    .filter(Boolean);

  const { width, height, padding } = MAP_VIEWPORT;
  const drawableWidth = width - padding.left - padding.right;
  const drawableHeight = height - padding.top - padding.bottom;

  return {
    width,
    height,
    nodes: nodeViews,
    edges: edgeViews,
    markers,
    route,
    gridX: buildGrid(6, padding.left, drawableWidth),
    gridY: buildGrid(6, padding.top, drawableHeight)
  };
};
