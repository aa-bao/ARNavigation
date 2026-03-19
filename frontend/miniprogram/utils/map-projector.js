import { getFloorMapConfig, MAP_COORDINATE_RANGE, MAP_VIEW_TYPES } from '../services/map-data.js';

const clamp = (value, min = 0, max = 1) => {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const resolveNodeCoordinates = (node = {}) => {
  const coordinateX = toNumber(node.planarX ?? node.xCoordinate ?? node.coordinates?.x ?? node.x);
  const coordinateY = toNumber(node.planarY ?? node.yCoordinate ?? node.coordinates?.y ?? node.y);
  return {
    x: coordinateX,
    y: coordinateY
  };
};

export const projectPlanarPointToMap = ({ x, y, floor, config } = {}) => {
  const resolvedConfig = config || getFloorMapConfig(floor);
  const pointX = toNumber(x);
  const pointY = toNumber(y);

  if (!resolvedConfig || resolvedConfig.type !== MAP_VIEW_TYPES.FLOOR || pointX === null || pointY === null) {
    return null;
  }

  const normalizedX = (pointX - MAP_COORDINATE_RANGE.minX)
    / (MAP_COORDINATE_RANGE.maxX - MAP_COORDINATE_RANGE.minX);
  const normalizedY = (pointY - MAP_COORDINATE_RANGE.minY)
    / (MAP_COORDINATE_RANGE.maxY - MAP_COORDINATE_RANGE.minY);

  const plotArea = resolvedConfig.plotArea || {
    left: 0,
    right: 1,
    top: 0,
    bottom: 1
  };
  const clampedX = clamp(normalizedX);
  const clampedY = clamp(normalizedY);
  const width = plotArea.right - plotArea.left;
  const height = plotArea.bottom - plotArea.top;

  return {
    leftPercent: (plotArea.left + clampedX * width) * 100,
    topPercent: (plotArea.top + (1 - clampedY) * height) * 100
  };
};

export const buildMapMarker = (node, markerType, config) => {
  if (!node) {
    return null;
  }

  const floor = Number(node.floor ?? node.floorNumber);
  const resolvedConfig = config || getFloorMapConfig(floor);
  if (!resolvedConfig || resolvedConfig.type !== MAP_VIEW_TYPES.FLOOR) {
    return null;
  }

  const coordinates = resolveNodeCoordinates(node);
  const projection = projectPlanarPointToMap({
    x: coordinates.x,
    y: coordinates.y,
    floor,
    config: resolvedConfig
  });

  if (!projection) {
    return null;
  }

  return {
    id: `${markerType}-${node.nodeCode || node.nodeId || node.id || node.name || 'unknown'}`,
    markerType,
    floor,
    leftPercent: projection.leftPercent,
    topPercent: projection.topPercent,
    nodeName: node.nodeName || node.name || '未命名点位',
    nodeCode: node.nodeCode || '',
    description: node.description || '',
    style: `left:${projection.leftPercent}%;top:${projection.topPercent}%;`
  };
};
