const STATUS = {
  READY: 'READY',
  TRACKING: 'TRACKING',
  DEGRADED: 'DEGRADED',
  RECALIBRATE_REQUIRED: 'RECALIBRATE_REQUIRED'
};

const DEFAULT_THRESHOLDS = {
  sampleWindowMs: 1000,
  trackingSampleCount: 10,
  trackingConfidence: 0.65,
  degradeConfidence: 0.45,
  degradeHoldMs: 800,
  recoverConfidence: 0.6,
  recoverHoldMs: 600,
  recalibrateConfidence: 0.35,
  recalibrateHeadingErrorDeg: 35,
  recalibrateHoldMs: 2500
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toFiniteNumber = (value, fallback = NaN) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeAngleDeg = (value) => {
  let angle = value % 360;
  if (angle < 0) {
    angle += 360;
  }
  return angle;
};

const shortestAngleDiffDeg = (fromDeg, toDeg) => {
  let diff = normalizeAngleDeg(toDeg) - normalizeAngleDeg(fromDeg);
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  return diff;
};

const degToRad = (deg) => deg * (Math.PI / 180);

const normalizePoint = (point = {}) => ({
  x: toFiniteNumber(point.x ?? point.worldX ?? point.planarX, 0),
  y: toFiniteNumber(point.y ?? point.worldY ?? point.planarY, 0),
  z: toFiniteNumber(point.z ?? point.worldZ, 0)
});

const computePathMetrics = (points = []) => {
  if (points.length < 2) {
    return {
      headingDeg: null,
      length: 0
    };
  }

  let length = 0;
  let headingDeg = null;

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dz = end.z - start.z;
    const segmentLength = Math.sqrt(dx * dx + dy * dy + dz * dz);
    length += segmentLength;

    if (headingDeg === null && segmentLength > 1e-6) {
      headingDeg = normalizeAngleDeg((Math.atan2(dx, dz) * 180) / Math.PI);
    }
  }

  return {
    headingDeg,
    length
  };
};

const createDefaultPose = () => ({
  x: 0,
  y: 0.15,
  z: -1.2,
  yaw: 0,
  pitch: 0,
  scale: 1,
  confidence: 0
});

const createGuidanceEngine = (config = {}) => {
  const nowFn = typeof config.now === 'function' ? config.now : () => Date.now();
  const thresholds = {
    ...DEFAULT_THRESHOLDS,
    ...(config.thresholds || {})
  };

  let session = {
    points: [],
    anchorHeading: null,
    pathHeadingDeg: null,
    pathLength: 0
  };
  let status = STATUS.READY;
  let confidence = 0;
  let headingErrorDeg = null;
  let pose = createDefaultPose();
  let smoothedCompassHeading = null;
  let smoothedPitch = 0;
  let lastCompassAt = 0;
  let lastMotionAt = 0;
  let freshAnchorApplied = false;
  let lowConfidenceSince = null;
  let recoverConfidenceSince = null;
  let unstableSince = null;
  let lastTickAt = 0;
  const compassSamples = [];

  const trimSamples = (now) => {
    const cutoff = now - thresholds.sampleWindowMs;
    while (compassSamples.length && compassSamples[0].at < cutoff) {
      compassSamples.shift();
    }
  };

  const getTargetHeading = () => {
    if (Number.isFinite(session.anchorHeading)) {
      return normalizeAngleDeg(session.anchorHeading);
    }
    if (Number.isFinite(session.pathHeadingDeg)) {
      return normalizeAngleDeg(session.pathHeadingDeg);
    }
    return null;
  };

  const computeConfidence = (now, validSampleCount, currentHeadingErrorDeg) => {
    if (!session.points.length) {
      return 0;
    }

    const sampleFactor = clamp(validSampleCount / thresholds.trackingSampleCount, 0, 1);
    const compassAge = lastCompassAt ? now - lastCompassAt : Number.POSITIVE_INFINITY;
    const compassFreshness = compassAge <= 250
      ? 1
      : compassAge >= 1000
        ? 0
        : 1 - ((compassAge - 250) / 750);
    const motionAge = lastMotionAt ? now - lastMotionAt : Number.POSITIVE_INFINITY;
    const motionFreshness = motionAge <= 500 ? 1 : motionAge >= 1500 ? 0.3 : 0.3 + ((1500 - motionAge) / 1000) * 0.7;
    const pathFactor = clamp(session.points.length / 4, 0, 1);
    const lengthFactor = clamp(session.pathLength / 6, 0, 1);
    const alignmentPenalty = currentHeadingErrorDeg === null
      ? 0.25
      : clamp(Math.abs(currentHeadingErrorDeg) / 40, 0, 1);

    return clamp(
      0.12
      + 0.35 * sampleFactor
      + 0.16 * compassFreshness
      + 0.1 * motionFreshness
      + 0.08 * pathFactor
      + 0.06 * lengthFactor
      - 0.55 * alignmentPenalty,
      0,
      1
    );
  };

  const computePose = (now, nextConfidence, currentHeadingErrorDeg) => {
    const motionSample = session.motion || null;
    const pitch = Number.isFinite(smoothedPitch) ? clamp(smoothedPitch, -0.6, 0.6) * 0.35 : 0;
    const alignment = currentHeadingErrorDeg === null ? 0 : clamp(currentHeadingErrorDeg / 45, -1, 1);
    const yaw = degToRad(clamp(currentHeadingErrorDeg || 0, -70, 70) * 0.9);
    const x = clamp(alignment, -1, 1) * 0.55;
    const z = -1.05 - nextConfidence * 0.35;

    return {
      x,
      y: 0.15 + (Number.isFinite(pitch) ? pitch * 0.1 : 0),
      z,
      yaw,
      pitch: Number.isFinite(motionSample?.beta) ? clamp(motionSample.beta, -0.8, 0.8) * 0.35 : pitch,
      scale: 0.9 + nextConfidence * 0.35,
      confidence: nextConfidence
    };
  };

  const getHintText = (nextStatus, nextConfidence, currentHeadingErrorDeg) => {
    if (!session.points.length) {
      return '路径数据不足，使用方向引导';
    }

    if (nextStatus === STATUS.RECALIBRATE_REQUIRED) {
      return '方向偏移过大，请重新扫码校准';
    }

    if (nextStatus === STATUS.DEGRADED) {
      return '方向信号不稳定，请缓慢重新对准';
    }

    if (nextStatus === STATUS.TRACKING) {
      if (currentHeadingErrorDeg === null) {
        return '保持当前朝向';
      }
      if (Math.abs(currentHeadingErrorDeg) > 20) {
        return currentHeadingErrorDeg > 0 ? '向右微调方向' : '向左微调方向';
      }
      return '保持当前朝向';
    }

    if (nextConfidence >= 0.65) {
      return '等待更多稳定样本';
    }

    return '等待稳定方向数据';
  };

  const evaluateState = (now, nextConfidence, validSampleCount) => {
    const currentTargetHeading = getTargetHeading();
    const hasCompass = smoothedCompassHeading !== null && Number.isFinite(currentTargetHeading);
    const currentError = hasCompass
      ? shortestAngleDiffDeg(smoothedCompassHeading, currentTargetHeading)
      : null;
    const absError = currentError === null ? null : Math.abs(currentError);

    if (!session.points.length) {
      status = STATUS.READY;
      lowConfidenceSince = null;
      recoverConfidenceSince = null;
      unstableSince = null;
      freshAnchorApplied = false;
      headingErrorDeg = null;
      pose = createDefaultPose();
      confidence = 0;
      return;
    }

    if (status === STATUS.RECALIBRATE_REQUIRED) {
      if (freshAnchorApplied && nextConfidence >= thresholds.recoverConfidence) {
        status = STATUS.TRACKING;
        freshAnchorApplied = false;
        lowConfidenceSince = null;
        recoverConfidenceSince = null;
        unstableSince = null;
      }
    } else if (status === STATUS.READY) {
      const readyToTrack = validSampleCount >= thresholds.trackingSampleCount && nextConfidence >= thresholds.trackingConfidence;
      if (readyToTrack) {
        status = STATUS.TRACKING;
        lowConfidenceSince = null;
        recoverConfidenceSince = null;
        unstableSince = null;
      }
    } else if (status === STATUS.TRACKING) {
      if (nextConfidence < thresholds.degradeConfidence) {
        if (lowConfidenceSince === null) {
          lowConfidenceSince = now;
        }
        if (now - lowConfidenceSince >= thresholds.degradeHoldMs) {
          status = STATUS.DEGRADED;
          recoverConfidenceSince = null;
          unstableSince = nextConfidence < thresholds.recalibrateConfidence || (absError !== null && absError > thresholds.recalibrateHeadingErrorDeg)
            ? now
            : null;
        }
      } else {
        lowConfidenceSince = null;
      }
    } else if (status === STATUS.DEGRADED) {
      if (nextConfidence >= thresholds.recoverConfidence) {
        if (recoverConfidenceSince === null) {
          recoverConfidenceSince = now;
        }
        if (now - recoverConfidenceSince >= thresholds.recoverHoldMs) {
          status = STATUS.TRACKING;
          lowConfidenceSince = null;
          recoverConfidenceSince = null;
          unstableSince = null;
        }
      } else {
        recoverConfidenceSince = null;
      }

      const unhealthy = nextConfidence < thresholds.recalibrateConfidence
        || (absError !== null && absError > thresholds.recalibrateHeadingErrorDeg);
      if (unhealthy) {
        if (unstableSince === null) {
          unstableSince = now;
        }
        if (now - unstableSince >= thresholds.recalibrateHoldMs) {
          status = STATUS.RECALIBRATE_REQUIRED;
          lowConfidenceSince = null;
          recoverConfidenceSince = null;
        }
      } else {
        unstableSince = null;
      }
    }

    headingErrorDeg = currentError;
    confidence = nextConfidence;
    pose = computePose(now, nextConfidence, currentError);

    if (status === STATUS.READY && nextConfidence >= thresholds.trackingConfidence && validSampleCount >= thresholds.trackingSampleCount) {
      status = STATUS.TRACKING;
    }
  };

  const updateSession = (sessionLike = {}) => {
    const nextPoints = Array.isArray(sessionLike.points) ? sessionLike.points.map(normalizePoint) : [];
    const nextMetrics = computePathMetrics(nextPoints);

    session = {
      points: nextPoints,
      anchorHeading: Number.isFinite(toFiniteNumber(sessionLike.anchorHeading, NaN))
        ? normalizeAngleDeg(toFiniteNumber(sessionLike.anchorHeading, 0))
        : null,
      pathHeadingDeg: nextMetrics.headingDeg,
      pathLength: nextMetrics.length,
      motion: session.motion || null
    };

    lowConfidenceSince = null;
    recoverConfidenceSince = null;
    unstableSince = null;
    freshAnchorApplied = Number.isFinite(session.anchorHeading);

    if (!session.points.length) {
      status = STATUS.READY;
      confidence = 0;
      headingErrorDeg = null;
      pose = createDefaultPose();
      freshAnchorApplied = false;
    }
  };

  const updateSensors = (sensorLike = {}) => {
    const now = nowFn();
    const compassHeading = toFiniteNumber(
      sensorLike.compassHeading ?? sensorLike.direction ?? sensorLike.heading,
      NaN
    );
    const motion = sensorLike.motion && typeof sensorLike.motion === 'object' ? sensorLike.motion : null;

    if (Number.isFinite(compassHeading)) {
      const normalizedHeading = normalizeAngleDeg(compassHeading);
      compassSamples.push({ at: now, heading: normalizedHeading });
      trimSamples(now);

      if (smoothedCompassHeading === null) {
        smoothedCompassHeading = normalizedHeading;
      } else {
        const delta = shortestAngleDiffDeg(smoothedCompassHeading, normalizedHeading);
        smoothedCompassHeading = normalizeAngleDeg(smoothedCompassHeading + delta * 0.18);
      }
      lastCompassAt = now;
    }

    if (motion) {
      session = {
        ...session,
        motion
      };
      if (Number.isFinite(motion.beta)) {
        smoothedPitch = smoothedPitch === 0 && lastMotionAt === 0
          ? Number(motion.beta)
          : (smoothedPitch * 0.82) + (Number(motion.beta) * 0.18);
      }
      lastMotionAt = now;
    }
  };

  const tick = () => {
    const now = nowFn();
    trimSamples(now);
    const validSampleCount = compassSamples.length;
    const currentTargetHeading = getTargetHeading();
    const currentError = smoothedCompassHeading !== null && Number.isFinite(currentTargetHeading)
      ? shortestAngleDiffDeg(smoothedCompassHeading, currentTargetHeading)
      : null;
    const nextConfidence = computeConfidence(now, validSampleCount, currentError);

    evaluateState(now, nextConfidence, validSampleCount);

    const nextStatus = status;
    const nextPose = pose;
    const nextHintText = getHintText(nextStatus, nextConfidence, headingErrorDeg);
    lastTickAt = now;

    return {
      pose: nextPose,
      status: nextStatus,
      confidence: nextConfidence,
      hintText: nextHintText,
      headingErrorDeg
    };
  };

  const reset = () => {
    session = {
      points: [],
      anchorHeading: null,
      pathHeadingDeg: null,
      pathLength: 0,
      motion: null
    };
    status = STATUS.READY;
    confidence = 0;
    headingErrorDeg = null;
    pose = createDefaultPose();
    smoothedCompassHeading = null;
    smoothedPitch = 0;
    lastCompassAt = 0;
    lastMotionAt = 0;
    freshAnchorApplied = false;
    lowConfidenceSince = null;
    recoverConfidenceSince = null;
    unstableSince = null;
    lastTickAt = 0;
    compassSamples.length = 0;
  };

  return {
    updateSession,
    updateSensors,
    tick,
    reset,
    STATES: STATUS
  };
};

module.exports = {
  createGuidanceEngine,
  GUIDANCE_STATES: STATUS
};
