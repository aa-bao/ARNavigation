const createLocalWorldPoints = (points = []) => {
  if (!points.length) {
    return [];
  }

  const anchor = points[0];
  return points.map((point) => ({
    x: point.x - anchor.x,
    y: point.y - anchor.y,
    z: -(point.z - anchor.z)
  }));
};

const rotateLocalWorldPoints = (points = [], yawRadians = 0) => {
  if (!points.length || !yawRadians) {
    return points.map((point) => ({ ...point }));
  }

  const cos = Math.cos(yawRadians);
  const sin = Math.sin(yawRadians);

  return points.map((point) => ({
    x: point.x * cos - point.z * sin,
    y: point.y,
    z: point.x * sin + point.z * cos
  }));
};

const sampleAheadPoint = (points = [], distanceAhead = 2) => {
  if (!points.length) {
    return null;
  }

  if (points.length === 1) {
    return {
      position: points[0],
      direction: { x: 0, y: 0, z: -1 }
    };
  }

  let travelled = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dz = end.z - start.z;
    const segmentLength = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (travelled + segmentLength >= distanceAhead) {
      const ratio = (distanceAhead - travelled) / (segmentLength || 1);
      return {
        position: {
          x: start.x + dx * ratio,
          y: start.y + dy * ratio,
          z: start.z + dz * ratio
        },
        direction: {
          x: dx / (segmentLength || 1),
          y: dy / (segmentLength || 1),
          z: dz / (segmentLength || 1)
        }
      };
    }

    travelled += segmentLength;
  }

  const tail = points[points.length - 2];
  const head = points[points.length - 1];
  const dx = head.x - tail.x;
  const dy = head.y - tail.y;
  const dz = head.z - tail.z;
  const segmentLength = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;

  return {
    position: head,
    direction: {
      x: dx / segmentLength,
      y: dy / segmentLength,
      z: dz / segmentLength
    }
  };
};

module.exports = {
  createLocalWorldPoints,
  rotateLocalWorldPoints,
  sampleAheadPoint
};
