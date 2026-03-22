const { createGuidanceEngine } = require('./guidance-engine.js');
const vkCameraBg = require('./vk-camera-bg.js');

let threeModule = null;

const loadThree = (canvas) => {
  if (!threeModule) {
    try {
      // eslint-disable-next-line global-require
      threeModule = require('../../libs/threejs-miniprogram/dist/index.js');
    } catch (error) {
      try {
        // eslint-disable-next-line global-require
        threeModule = require('../../libs/threejs-miniprogram/dist/index');
      } catch (innerError) {
        threeModule = globalThis.THREE || null;
      }
    }
  }

  if (typeof threeModule?.createScopedThreejs === 'function' && canvas) {
    return threeModule.createScopedThreejs(canvas);
  }

  if (threeModule?.WebGLRenderer) {
    return threeModule;
  }

  return null;
};

const normalizePoints = (points = []) => {
  if (!Array.isArray(points)) {
    return [];
  }

  return points
    .map((point) => ({
      x: Number(point?.x ?? point?.worldX ?? point?.planarX ?? 0),
      y: Number(point?.y ?? point?.worldY ?? point?.planarY ?? 0),
      z: Number(point?.z ?? point?.worldZ ?? 0)
    }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z));
};

const createFallbackRenderer = (engine, reason = 'AR 渲染暂不可用') => ({
  supported: false,
  reason,
  updateSession(sessionLike) {
    engine.updateSession(sessionLike);
  },
  updateSensors(sensorLike) {
    engine.updateSensors(sensorLike);
  },
  tick() {
    return {
      ...engine.tick(),
      cameraReady: false,
      anchorLocked: false
    };
  },
  dispose() {
    engine.reset();
  }
});

const createSceneRenderer = ({ canvas, points = [] }) => {
  const engine = createGuidanceEngine();
  engine.updateSession({ points: normalizePoints(points) });

  const THREE = loadThree(canvas);
  if (!THREE || !canvas || typeof canvas.getContext !== 'function') {
    return createFallbackRenderer(engine, !canvas ? 'AR 画布未准备完成' : 'AR 引擎初始化失败');
  }

  if (!wx?.createVKSession) {
    return createFallbackRenderer(engine, '当前微信环境不支持 VisionKit 平面追踪');
  }

  const gl = canvas.getContext('webgl');
  if (!gl) {
    return createFallbackRenderer(engine, '当前设备不支持 WebGL 渲染');
  }

  const renderer = new THREE.WebGLRenderer({ canvas, context: gl, alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);
  vkCameraBg.initGL(renderer);

  const scene = new THREE.Scene();
  const camera = new THREE.Camera();

  const ambient = new THREE.AmbientLight(0xffffff, 1.1);
  const directional = new THREE.DirectionalLight(0xffffff, 1.8);
  directional.position.set(1, 3, 2);
  scene.add(ambient);
  scene.add(directional);

  const anchorRoot = new THREE.Object3D();
  anchorRoot.matrixAutoUpdate = false;
  scene.add(anchorRoot);

  const arrowMeshes = [];
  const createArrowGeometry = (scale = 1) => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.48 * scale, -0.13 * scale);
    shape.lineTo(0.2 * scale, -0.13 * scale);
    shape.lineTo(0.2 * scale, -0.25 * scale);
    shape.lineTo(0.58 * scale, 0);
    shape.lineTo(0.2 * scale, 0.25 * scale);
    shape.lineTo(0.2 * scale, 0.13 * scale);
    shape.lineTo(-0.48 * scale, 0.13 * scale);
    shape.closePath();
    const geometry = new THREE.ShapeGeometry(shape);
    geometry.rotateX(-Math.PI / 2);
    geometry.rotateZ(-Math.PI / 2);
    return geometry;
  };

  for (let index = 0; index < 6; index += 1) {
    const scale = 0.62 + index * 0.08;
    const shellGeometry = createArrowGeometry(scale);
    const shellMaterial = new THREE.MeshStandardMaterial({
      color: 0x2ea7ff,
      emissive: 0x0b3d8a,
      emissiveIntensity: 0.42,
      roughness: 0.42,
      metalness: 0.08,
      side: THREE.DoubleSide,
      transparent: true
    });
    const shellMesh = new THREE.Mesh(shellGeometry, shellMaterial);
    shellMesh.position.set(0, 0.02, -(0.82 + index * 0.58));

    const innerGeometry = createArrowGeometry(scale * 0.72);
    const innerMaterial = new THREE.MeshStandardMaterial({
      color: 0xf8fbff,
      emissive: 0x1b64cf,
      emissiveIntensity: 0.2,
      roughness: 0.5,
      metalness: 0.02,
      side: THREE.DoubleSide,
      transparent: true
    });
    const innerMesh = new THREE.Mesh(innerGeometry, innerMaterial);
    innerMesh.position.set(0, 0.024, -(0.82 + index * 0.58));

    anchorRoot.add(shellMesh);
    anchorRoot.add(innerMesh);
    arrowMeshes.push({ shellMesh, innerMesh });
  }

  const session = wx.createVKSession({
    track: {
      plane: {
        mode: 1
      }
    }
  });

  let disposed = false;
  let started = false;
  let anchorLocked = false;
  let cameraReady = false;
  let cameraDropStreak = 0;
  let lastTick = { status: 'READY', confidence: 0, hintText: '等待平面检测', headingErrorDeg: null };

  const syncViewport = () => {
    const width = Math.max(Number(canvas.width) || 0, 1);
    const height = Math.max(Number(canvas.height) || 0, 1);
    if (renderer.domElement && (renderer.domElement.width !== width || renderer.domElement.height !== height)) {
      renderer.setSize(width, height, false);
    }
  };

  const applyPoseToArrows = (payload) => {
    const pose = payload?.pose || {};
    const yaw = Number.isFinite(pose.yaw) ? pose.yaw : 0;
    const confidence = Number.isFinite(payload?.confidence) ? Math.max(0, Math.min(1, payload.confidence)) : 0;

    anchorRoot.rotation.set(0, yaw, 0);

    arrowMeshes.forEach((item, idx) => {
      const shell = item.shellMesh;
      const inner = item.innerMesh;
      shell.visible = anchorLocked && cameraReady;
      inner.visible = anchorLocked && cameraReady;
      const alpha = 0.45 + confidence * 0.55;
      shell.material.opacity = alpha;
      inner.material.opacity = Math.min(alpha + 0.12, 1);
      shell.material.transparent = alpha < 0.999;
      inner.material.transparent = inner.material.opacity < 0.999;
      shell.material.color.setHex(payload?.status === 'RECALIBRATE_REQUIRED' ? 0xef4444 : 0x2ea7ff);
      shell.material.emissive.setHex(payload?.status === 'RECALIBRATE_REQUIRED' ? 0x7f1d1d : 0x0b3d8a);
      const s = 0.9 + idx * 0.07;
      shell.scale.set(1.24 * s, 1, 1.08 * s);
      inner.scale.set(1.24 * s, 1, 1.08 * s);
    });
  };

  const getUpY = (transform) => {
    if (!transform || typeof transform.length !== 'number' || transform.length < 16) {
      return -1;
    }
    const ux = Number(transform[4] || 0);
    const uy = Number(transform[5] || 0);
    const uz = Number(transform[6] || 0);
    const len = Math.sqrt((ux * ux) + (uy * uy) + (uz * uz));
    if (len < 1e-6) {
      return -1;
    }
    return Math.abs(uy / len);
  };

  const tryLockAnchor = () => {
    if (anchorLocked || !started) {
      return;
    }

    const hit = session.hitTest(0.5, 0.88, true);
    if (!hit || !hit.length) {
      return;
    }

    let selected = null;
    for (let index = 0; index < hit.length; index += 1) {
      const candidate = hit[index];
      const upY = getUpY(candidate?.transform);
      if (upY > 0.72) {
        selected = candidate;
        break;
      }
      if (!selected) {
        selected = candidate;
      }
    }

    if (selected && selected.transform) {
      anchorRoot.matrix.fromArray(selected.transform);
      anchorRoot.matrixWorldNeedsUpdate = true;
      anchorLocked = true;
    }
  };

  const renderFrame = () => {
    if (disposed || !started) {
      return lastTick;
    }

    syncViewport();

    const frame = session.getVKFrame(canvas.width, canvas.height);
    if (frame?.camera) {
      tryLockAnchor();
      const bgRendered = vkCameraBg.renderGL(frame);
      if (bgRendered) {
        cameraReady = true;
        cameraDropStreak = 0;
      } else {
        cameraDropStreak += 1;
        if (cameraDropStreak >= 6) {
          cameraReady = false;
        }
      }

      camera.matrixAutoUpdate = false;
      camera.matrixWorldInverse.fromArray(frame.camera.viewMatrix);
      camera.matrixWorld.getInverse(camera.matrixWorldInverse);
      const projectionMatrix = frame.camera.getProjectionMatrix(0.01, 1000);
      camera.projectionMatrix.fromArray(projectionMatrix);
    }

    const payload = engine.tick();
    applyPoseToArrows(payload);
    if (cameraReady) {
      renderer.autoClearColor = false;
      renderer.render(scene, camera);
    }
    lastTick = payload;

    session.requestAnimationFrame(renderFrame);
    return payload;
  };

  session.start((err) => {
    if (err || disposed) {
      started = false;
      lastTick = {
        status: 'READY',
        confidence: 0,
        hintText: 'VisionKit 初始化失败',
        headingErrorDeg: null
      };
      return;
    }

    started = true;
    session.on('resize', syncViewport);
    session.requestAnimationFrame(renderFrame);
  });

  return {
    supported: true,
    updateSession(sessionLike) {
      if (disposed) {
        return;
      }
      const sessionPoints = normalizePoints(
        sessionLike?.points
        ?? sessionLike?.segmentPoints
        ?? sessionLike?.worldPoints
        ?? points
      );
      engine.updateSession({
        points: sessionPoints,
        anchorHeading: sessionLike?.anchorHeading
      });
      anchorLocked = false;
    },
    updateSensors(sensorLike) {
      if (disposed) {
        return;
      }
      engine.updateSensors(sensorLike);
    },
    tick() {
      if (!started) {
        return {
          status: 'READY',
          confidence: 0,
          hintText: '正在初始化相机追踪...',
          headingErrorDeg: null,
          anchorLocked: false,
          cameraReady: false
        };
      }
      if (!cameraReady) {
        return {
          status: 'READY',
          confidence: 0,
          hintText: '等待相机画面恢复...',
          headingErrorDeg: null,
          anchorLocked: false,
          cameraReady: false
        };
      }
      if (!anchorLocked) {
        return {
          status: 'READY',
          confidence: 0,
          hintText: '请将手机对准地面完成锚定',
          headingErrorDeg: null,
          anchorLocked: false,
          cameraReady: true
        };
      }
      return {
        ...lastTick,
        hintText: lastTick?.hintText || 'AR 地面锚定已完成',
        anchorLocked: true,
        cameraReady: true
      };
    },
    dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      try {
        session.stop();
      } catch (e) {}
      engine.reset();
      arrowMeshes.forEach((item) => {
        item.shellMesh.geometry.dispose();
        item.shellMesh.material.dispose();
        item.innerMesh.geometry.dispose();
        item.innerMesh.material.dispose();
      });
      vkCameraBg.dispose();
      renderer.dispose();
    }
  };
};

module.exports = {
  createSceneRenderer
};
