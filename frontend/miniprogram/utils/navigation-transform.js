const FLOOR_HEIGHT = 4.5;

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeAngle = (degrees) => {
  let angle = degrees % 360;
  if (angle < 0) {
    angle += 360;
  }
  return angle;
};

const toRadians = (degrees) => degrees * (Math.PI / 180);

export const normalizeNode = (raw = {}) => {
  const source = Array.isArray(raw) ? (raw[0] || {}) : raw;
  const floor = toNumber(source.floor);
  const planarX = toNumber(source.planarX ?? source.xCoordinate ?? source.x ?? source.coordinates?.x);
  const planarY = toNumber(source.planarY ?? source.yCoordinate ?? source.y ?? source.coordinates?.y);
  const worldX = toNumber(source.worldX ?? source.x ?? planarX);
  const worldY = toNumber(source.worldY ?? (source.z !== undefined ? source.y : floor * FLOOR_HEIGHT), floor * FLOOR_HEIGHT);
  const worldZ = toNumber(source.worldZ ?? source.z ?? planarY);

  return {
    id: source.nodeId ?? source.id ?? null,
    nodeId: source.nodeId ?? source.id ?? null,
    nodeCode: source.nodeCode || '',
    nodeName: source.nodeName || source.name || '',
    floor,
    nodeType: source.nodeType || 'NORMAL',
    planarX,
    planarY,
    worldX,
    worldY,
    worldZ
  };
};

export const normalizeSegmentResponse = (raw = {}) => {
  const rawPoints = Array.isArray(raw.points)
    ? raw.points
    : Array.isArray(raw.segmentPoints)
      ? raw.segmentPoints
      : Array.isArray(raw.pathNodes)
        ? raw.pathNodes
        : [];
  const points = rawPoints.map(normalizeNode);
  const segmentStart = normalizeNode(raw.segmentStart || points[0] || {});
  const segmentEnd = normalizeNode(raw.segmentEnd || points[points.length - 1] || segmentStart);

  return {
    segmentStart,
    segmentEnd,
    finalTargetId: raw.finalTargetId ?? null,
    isFinalSegment: Boolean(raw.isFinalSegment),
    points
  };
};

export const createNavigationSession = ({ destination, currentNode, segmentResponse, mode = 'compass' }) => {
  const normalizedDestination = normalizeNode(destination || {});
  const normalizedCurrentNode = normalizeNode(currentNode || {});
  const normalizedSegment = normalizeSegmentResponse(segmentResponse);
  const segmentHeading = getSegmentHeading({
    segmentPoints: normalizedSegment.points
  });

  return {
    targetId: normalizedDestination.id,
    targetName: normalizedDestination.nodeName,
    destination: normalizedDestination,
    currentScannedNode: normalizedCurrentNode.nodeId ? normalizedCurrentNode : normalizedSegment.segmentStart,
    segmentEndNode: normalizedSegment.segmentEnd,
    isFinalSegment: normalizedSegment.isFinalSegment,
    segmentPoints: normalizedSegment.points,
    segmentHeading,
    currentMode: mode
  };
};

export const getPlanarPoints = (session) => {
  return (session?.segmentPoints || []).map((point) => ({
    x: point.planarX,
    y: point.planarY,
    nodeId: point.nodeId,
    nodeCode: point.nodeCode,
    nodeName: point.nodeName
  }));
};

export const getWorldPoints = (session) => {
  const worldPoints = (session?.segmentPoints || []).map((point) => ({
    x: point.worldX,
    y: point.worldY,
    z: point.worldZ,
    nodeId: point.nodeId,
    nodeCode: point.nodeCode,
    nodeName: point.nodeName
  }));

  const anchorHeading = toNumber(session?.anchorHeading, NaN);
  if (!Number.isFinite(anchorHeading) || !worldPoints.length) {
    return worldPoints;
  }

  const anchor = session?.currentScannedNode || session?.segmentPoints?.[0] || {};
  const anchorX = toNumber(anchor.planarX ?? anchor.worldX);
  const anchorZ = toNumber(anchor.planarY ?? anchor.worldZ);
  const anchorY = toNumber(anchor.worldY, worldPoints[0].y);
  const radians = toRadians(anchorHeading);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return worldPoints.map((point) => {
    const planarDx = point.x - anchorX;
    const planarDz = point.z - anchorZ;
    return {
      ...point,
      x: planarDx * cos - planarDz * sin,
      y: point.y - anchorY,
      z: -(planarDx * sin + planarDz * cos)
    };
  });
};

export const getSegmentHeading = (session) => {
  const points = getPlanarPoints(session);
  if (points.length < 2) {
    return null;
  }

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const dx = end.x - start.x;
    const dy = end.y - start.y;

    if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) {
      continue;
    }

    return normalizeAngle(Math.atan2(dx, dy) * (180 / Math.PI));
  }

  return null;
};

export const rotatePathPoints = (points = [], yawRadians = 0) => {
  const cos = Math.cos(yawRadians);
  const sin = Math.sin(yawRadians);

  return points.map((point) => ({
    x: point.x * cos - point.z * sin,
    y: point.y,
    z: point.x * sin + point.z * cos,
    nodeId: point.nodeId,
    nodeCode: point.nodeCode,
    nodeName: point.nodeName
  }));
};

export const getPathLocalYaw = (points = []) => {
  if (points.length < 2) {
    return 0;
  }

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const dx = end.x - start.x;
    const dz = end.z - start.z;

    if (Math.abs(dx) < 1e-6 && Math.abs(dz) < 1e-6) {
      continue;
    }

    return Math.atan2(dx, -dz);
  }

  return 0;
};

export const getLocalPathHeading = (session) => {
  const worldPoints = getWorldPoints(session);
  if (!worldPoints.length) {
    return 0;
  }

  const anchor = worldPoints[0];
  const localPoints = worldPoints.map((point) => ({
    ...point,
    x: point.x - anchor.x,
    y: point.y - anchor.y,
    z: -(point.z - anchor.z)
  }));
  return getPathLocalYaw(localPoints);
};
