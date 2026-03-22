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
    return engine.tick();
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
  for (let index = 0; index < 6; index += 1) {
    const geo = new THREE.ConeGeometry(0.16 + index * 0.03, 0.14 + index * 0.02, 10);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({ color: 0x2ea7ff, emissive: 0x134a99, emissiveIntensity: 0.35 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, 0.02, -(0.8 + index * 0.55));
    mesh.scale.set(1.35, 0.45, 1.05);
    anchorRoot.add(mesh);
    arrowMeshes.push(mesh);
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

    arrowMeshes.forEach((mesh, idx) => {
      mesh.visible = anchorLocked;
      const alpha = 0.45 + confidence * 0.55;
      mesh.material.opacity = alpha;
      mesh.material.transparent = alpha < 0.999;
      mesh.material.color.setHex(payload?.status === 'RECALIBRATE_REQUIRED' ? 0xef4444 : 0x2ea7ff);
      mesh.material.emissive.setHex(payload?.status === 'RECALIBRATE_REQUIRED' ? 0x7f1d1d : 0x134a99);
      const s = 0.9 + idx * 0.07;
      mesh.scale.set(1.35 * s, 0.45 * s, 1.05 * s);
    });
  };

  const tryLockAnchor = () => {
    if (anchorLocked || !started) {
      return;
    }

    const hit = session.hitTest(0.5, 0.8, true);
    if (hit && hit.length && hit[0].transform) {
      anchorRoot.matrix.fromArray(hit[0].transform);
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
      vkCameraBg.renderGL(frame);

      camera.matrixAutoUpdate = false;
      camera.matrixWorldInverse.fromArray(frame.camera.viewMatrix);
      camera.matrixWorld.getInverse(camera.matrixWorldInverse);
      const projectionMatrix = frame.camera.getProjectionMatrix(0.01, 1000);
      camera.projectionMatrix.fromArray(projectionMatrix);
    }

    const payload = engine.tick();
    applyPoseToArrows(payload);
    renderer.autoClearColor = false;
    renderer.render(scene, camera);
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
          hintText: '正在识别地面平面...',
          headingErrorDeg: null,
          anchorLocked: false
        };
      }
      if (!anchorLocked) {
        return {
          status: 'READY',
          confidence: 0,
          hintText: '请将手机对准地面完成锚定',
          headingErrorDeg: null,
          anchorLocked: false
        };
      }
      return {
        ...lastTick,
        hintText: lastTick?.hintText || 'AR 地面锚定已完成',
        anchorLocked: true
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
      arrowMeshes.forEach((mesh) => {
        mesh.geometry.dispose();
        mesh.material.dispose();
      });
      vkCameraBg.dispose();
      renderer.dispose();
    }
  };
};

module.exports = {
  createSceneRenderer
};
