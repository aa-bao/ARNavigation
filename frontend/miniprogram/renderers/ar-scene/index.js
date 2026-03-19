const { createLocalWorldPoints, rotateLocalWorldPoints, sampleAheadPoint } = require('./curve.js');
const { updateArrowMesh } = require('./arrow.js');
const { getLocalPathHeading } = require('../../utils/navigation-transform.js');

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

const createFallbackRenderer = (reason = 'AR 渲染暂不可用') => ({
  supported: false,
  reason,
  updatePath() {},
  updateMotion() {},
  dispose() {}
});

const createSceneRenderer = ({ canvas, points = [] }) => {
  const THREE = loadThree(canvas);
  if (!THREE || !canvas || typeof canvas.getContext !== 'function') {
    return createFallbackRenderer(!canvas ? 'AR 画布未准备完成' : 'AR 引擎初始化失败');
  }

  const gl = canvas.getContext('webgl');
  if (!gl) {
    return createFallbackRenderer('当前设备不支持 WebGL 渲染');
  }

  const renderer = new THREE.WebGLRenderer({ canvas, context: gl, alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  scene.background = null;
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
  camera.position.set(0, 1.6, 0);
  renderer.setSize(canvas.width, canvas.height);
  camera.aspect = canvas.width / Math.max(canvas.height, 1);
  camera.updateProjectionMatrix();

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0x9bd3ff, 1.3);
  directionalLight.position.set(2, 3, 1);
  scene.add(directionalLight);

  const arrowGeometry = new THREE.ConeGeometry(0.18, 0.55, 10);
  arrowGeometry.rotateX(-Math.PI / 2);
  const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0x22c55e });
  const arrowMesh = new THREE.Mesh(arrowGeometry, arrowMaterial);
  arrowMesh.visible = false;
  scene.add(arrowMesh);

  let curveLine = null;
  let rawPoints = [];
  let localPoints = [];
  let baseYaw = 0;
  let lastMotion = null;

  const renderPath = () => {
    if (curveLine) {
      scene.remove(curveLine);
      curveLine.geometry.dispose();
      curveLine.material.dispose();
      curveLine = null;
    }

    const motionYaw = lastMotion?.alpha || 0;
    const rotatedPoints = rotateLocalWorldPoints(localPoints, baseYaw - motionYaw);

    if (!rotatedPoints.length) {
      arrowMesh.visible = false;
      renderer.render(scene, camera);
      return;
    }
    arrowMesh.visible = true;

    const vectorPoints = rotatedPoints.map((point) => new THREE.Vector3(point.x, point.y, point.z));
    const curve = new THREE.CatmullRomCurve3(vectorPoints);
    const sampled = curve.getPoints(Math.max(8, vectorPoints.length * 12));
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(sampled);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x38bdf8 });
    curveLine = new THREE.Line(lineGeometry, lineMaterial);
    scene.add(curveLine);

    updateArrowMesh(THREE, arrowMesh, sampleAheadPoint(rotatedPoints, 1.2));
    renderer.render(scene, camera);
  };

  const rebuildPath = (nextPoints) => {
    rawPoints = Array.isArray(nextPoints) ? nextPoints.slice() : [];
    localPoints = createLocalWorldPoints(rawPoints);
    baseYaw = getLocalPathHeading({
      segmentPoints: rawPoints.map((point) => ({
        ...point,
        worldX: point.x,
        worldY: point.y,
        worldZ: point.z
      }))
    });

    renderPath();
  };

  rebuildPath(points);

  return {
    supported: true,
    updatePath(nextPoints) {
      rebuildPath(nextPoints);
    },
    updateMotion(motion) {
      lastMotion = motion || null;
      camera.rotation.set(motion?.beta || 0, 0, motion?.gamma || 0);
      renderPath();
    },
    dispose() {
      if (curveLine) {
        scene.remove(curveLine);
        curveLine.geometry.dispose();
        curveLine.material.dispose();
      }
      arrowGeometry.dispose();
      arrowMaterial.dispose();
      renderer.dispose();
    }
  };
};

module.exports = {
  createSceneRenderer
};
