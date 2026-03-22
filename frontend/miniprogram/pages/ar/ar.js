import { getNodeByCode, getNavigationSegment } from '../../services/navigation-api.js';
import {
  getNavigationSession,
  setNavigationSession,
  setNavigationMode,
  clearNavigationSession,
  scanNavigationTarget
} from '../../services/navigation-session.js';
import { startCompass, calculateRelativeDirection } from '../../utils/compass.js';
import {
  createNavigationSession,
  getSegmentHeading,
  getWorldPoints,
  normalizeNode
} from '../../utils/navigation-transform.js';

const { createSceneRenderer } = require('../../renderers/ar-scene/index.js');
const { startMotionTracking: startRendererMotionTracking } = require('../../renderers/ar-scene/motion.js');

const app = getApp();

const buildCurrentNodeFromScan = (scanTarget, apiNode = null) => {
  if (apiNode) {
    return normalizeNode(apiNode);
  }

  const payload = scanTarget?.payload && typeof scanTarget.payload === 'object'
    ? scanTarget.payload
    : {};

  return normalizeNode({
    ...payload,
    id: payload.id ?? scanTarget?.nodeId ?? scanTarget?.nodeCode ?? null,
    nodeId: payload.nodeId ?? payload.id ?? scanTarget?.nodeId ?? scanTarget?.nodeCode ?? null,
    nodeCode: payload.nodeCode ?? payload.code ?? scanTarget?.nodeCode ?? '',
    nodeName: payload.nodeName ?? payload.name ?? ''
  });
};

Page({
  data: {
    loading: true,
    errorText: '',
    destination: null,
    currentNode: null,
    nextNode: null,
    isFinalSegment: false,
    arrivedAtTarget: false,
    rendererSupported: false,
    rendererReady: false,
    rendererCameraReady: false,
    rendererStatusText: '正在初始化 AR 引擎',
    motionText: '等待方向同步',
    promptText: 'AR 仅使用最近一次扫码点作为局部锚点。',
    directionText: '请沿箭头方向前进',
    deviceDirection: 0,
    targetDirection: 0,
    relativeAngle: 0,
    arrowRotation: 0,
    laneShiftRpx: 0,
    laneRotateDeg: 0,
    laneVisible: true,
    needTurnAround: false,
    compassStopFunction: null,
    motionStopFunction: null
  },

  onLoad() {
    this.renderer = null;
    this.motionState = null;
    this.compassHeading = null;
    this.session = null;
    this.rendererSessionPoints = [];
    this.isPageReady = false;
    this.isPageVisible = false;
    this.rendererInitToken = 0;
    this.motionTrackingToken = 0;
    this.rendererInitPromise = null;
    this.motionTrackingPromise = null;
    this.initializePage();
  },

  onReady() {
    this.isPageReady = true;
    this.initializeRenderer();
  },

  onShow() {
    this.isPageVisible = true;
    this.applySession(getNavigationSession(app));
    this.startCompassTracking();
    this.startMotionTracking();
    this.initializeRenderer();
  },

  onHide() {
    this.stopCompassTracking();
    this.stopMotionTracking();
    this.disposeRenderer();
    this.isPageVisible = false;
  },

  onUnload() {
    this.stopCompassTracking();
    this.stopMotionTracking();
    this.disposeRenderer();
    this.isPageVisible = false;
  },

  initializePage() {
    const session = getNavigationSession(app);
    if (!session) {
      this.setData({
        loading: false,
        errorText: '缺少导航会话，请先在指南针模式完成扫码。'
      });
      return;
    }

    this.applySession(session);
  },

  applySession(session) {
    if (!session) {
      return;
    }

    const heading = session.segmentHeading ?? getSegmentHeading(session);
    const arrivedAtTarget = Boolean(
      session.isFinalSegment
      && session.currentScannedNode?.nodeId
      && session.currentScannedNode.nodeId === session.segmentEndNode?.nodeId
    );

    this.session = session;
    this.setData({
      loading: false,
      errorText: '',
      destination: session.destination,
      currentNode: session.currentScannedNode,
      nextNode: session.segmentEndNode,
      isFinalSegment: Boolean(session.isFinalSegment),
      arrivedAtTarget,
      targetDirection: heading !== null ? Math.round(heading) : 0,
      promptText: arrivedAtTarget
        ? '您当前已在最终目标点，可结束导航。'
        : `请沿相机画面中的箭头前往 ${session.segmentEndNode?.nodeName || '下一二维码点'}，到达后重新扫码。`,
      rendererSupported: this.data.rendererSupported,
      rendererReady: this.data.rendererReady,
      rendererCameraReady: this.data.rendererCameraReady,
      rendererStatusText: this.data.rendererStatusText
    });

    this.syncRendererWithSession();

    if (arrivedAtTarget) {
      app.updateNavState('ARRIVED');
      this.setData({
        directionText: '已到达目的地',
        relativeAngle: 0,
        arrowRotation: 0,
        laneVisible: false
      });
      return;
    }

    this.setData({ laneVisible: true });
    app.updateNavState('NAVIGATING');
  },

  updateLaneByRelative(relativeAngle = 0, isInFront = true) {
    if (!isInFront) {
      if (this.data.laneVisible || !this.data.needTurnAround) {
        this.setData({
          laneVisible: false,
          needTurnAround: true
        });
      }
      return;
    }

    const angle = Number(relativeAngle) || 0;
    const clampedAngle = Math.max(-90, Math.min(90, angle));
    const laneShiftRpx = Math.max(-140, Math.min(140, (clampedAngle / 90) * 120));
    const laneRotateDeg = Math.max(-32, Math.min(32, clampedAngle * 0.35));

    if (
      laneShiftRpx !== this.data.laneShiftRpx
      || laneRotateDeg !== this.data.laneRotateDeg
      || !this.data.laneVisible
      || this.data.needTurnAround
    ) {
      this.setData({
        laneShiftRpx,
        laneRotateDeg,
        laneVisible: true,
        needTurnAround: false
      });
    }
  },

  getSessionPoints() {
    return getWorldPoints(this.session || getNavigationSession(app));
  },

  syncRendererWithSession() {
    if (!this.renderer) {
      return;
    }

    this.rendererSessionPoints = this.getSessionPoints();
    if (typeof this.renderer.updateSession === 'function') {
      this.renderer.updateSession({
        points: this.rendererSessionPoints,
        anchorHeading: this.session?.anchorHeading ?? null
      });
    }

    this.pushRendererSensors();
  },

  pushRendererSensors() {
    if (!this.renderer) {
      return;
    }

    if (typeof this.renderer.updateSensors === 'function') {
      this.renderer.updateSensors({
        compassHeading: this.compassHeading,
        motion: this.motionState
      });
    }

    this.applyRendererTickResult(this.tickRenderer());
  },

  applyRendererTickResult(tickResult) {
    if (!tickResult) {
      return;
    }

    const nextData = {
      rendererSupported: Boolean(tickResult.supported),
      rendererReady: Boolean(tickResult.ready),
      rendererCameraReady: Boolean(tickResult.cameraReady),
      rendererStatusText: tickResult.statusText || this.data.rendererStatusText
    };

    if (
      nextData.rendererSupported !== this.data.rendererSupported
      || nextData.rendererReady !== this.data.rendererReady
      || nextData.rendererCameraReady !== this.data.rendererCameraReady
      || nextData.rendererStatusText !== this.data.rendererStatusText
    ) {
      this.setData(nextData);
    }
  },

  tickRenderer() {
    const renderer = this.renderer;

    if (!renderer) {
      return {
        supported: false,
        ready: false,
        cameraReady: false,
        statusText: 'AR 渲染器未初始化'
      };
    }

    if (!renderer.supported) {
      return {
        supported: false,
        ready: false,
        cameraReady: false,
        statusText: renderer.reason || '图像 AR 引导已启用（3D 引擎不可用）'
      };
    }

    const tickResult = typeof renderer.tick === 'function' ? renderer.tick() : null;
    const anchorLocked = Boolean(tickResult?.anchorLocked);
    const cameraReady = Boolean(tickResult?.cameraReady);

    return {
      supported: true,
      ready: cameraReady && anchorLocked,
      cameraReady,
      statusText: tickResult?.hintText || (this.session?.isFinalSegment ? '已到达最终目标' : '正在识别地面平面...')
    };
  },

  initializeRenderer() {
    if (!this.isPageReady || !this.isPageVisible || this.rendererInitPromise) {
      return this.rendererInitPromise;
    }

    const initToken = this.rendererInitToken + 1;
    this.rendererInitToken = initToken;

    this.rendererInitPromise = new Promise((resolve) => {
      wx.nextTick(() => {
        if (!this.isPageReady || !this.isPageVisible || initToken !== this.rendererInitToken) {
          this.rendererInitPromise = null;
          resolve(null);
          return;
        }

        const query = wx.createSelectorQuery().in(this);
        query.select('#arWebglCanvas').fields({ node: true, size: true });
        query.exec((result) => {
          if (!this.isPageReady || !this.isPageVisible || initToken !== this.rendererInitToken) {
            this.rendererInitPromise = null;
            resolve(null);
            return;
          }

          const canvas = result?.[0]?.node || null;
          if (!canvas) {
            this.renderer = null;
            this.applyRendererTickResult({
              supported: false,
              ready: false,
              cameraReady: false,
              statusText: 'AR 画布未准备完成'
            });
            this.rendererInitPromise = null;
            resolve(null);
            return;
          }

          const systemInfo = typeof wx.getSystemInfoSync === 'function' ? wx.getSystemInfoSync() : {};
          const pixelRatio = Math.max(Number(systemInfo.pixelRatio || 1), 1);
          const canvasWidth = Math.max(Math.round((systemInfo.windowWidth || 0) * pixelRatio), 1);
          const canvasHeight = Math.max(Math.round((systemInfo.windowHeight || 0) * pixelRatio), 1);
          canvas.width = canvasWidth;
          canvas.height = canvasHeight;

          const sessionPoints = this.getSessionPoints();
          this.rendererSessionPoints = sessionPoints;
          const renderer = createSceneRenderer({
            canvas,
            points: sessionPoints
          });

          this.renderer = renderer;
          this.rendererInitPromise = null;

          if (!renderer?.supported) {
            this.applyRendererTickResult({
              supported: false,
              ready: false,
              cameraReady: false,
              statusText: renderer?.reason || '当前设备不支持 WebGL 渲染'
            });
            resolve(renderer);
            return;
          }

          this.syncRendererWithSession();
          resolve(renderer);
        });
      });
    });

    return this.rendererInitPromise;
  },

  disposeRenderer() {
    this.rendererInitToken += 1;
    this.rendererInitPromise = null;
    this.rendererSessionPoints = [];

    if (this.renderer) {
      this.renderer.dispose?.();
      this.renderer = null;
    }
  },

  startMotionTracking() {
    if (this.data.motionStopFunction || this.motionTrackingPromise) {
      return this.motionTrackingPromise;
    }

    const trackingToken = this.motionTrackingToken + 1;
    this.motionTrackingToken = trackingToken;

    this.motionTrackingPromise = startRendererMotionTracking((payload) => {
      if (trackingToken !== this.motionTrackingToken) {
        return;
      }

      this.motionState = payload || null;
      if (this.renderer) {
        this.pushRendererSensors();
      }
    })
      .then((stopMotionTracking) => {
        if (trackingToken !== this.motionTrackingToken || !this.isPageVisible) {
          stopMotionTracking?.();
          return null;
        }

        this.setData({ motionStopFunction: stopMotionTracking });
        return stopMotionTracking;
      })
      .catch(() => {
        if (trackingToken !== this.motionTrackingToken) {
          return null;
        }

        this.motionState = null;
        this.pushRendererSensors();
        return null;
      })
      .finally(() => {
        if (trackingToken === this.motionTrackingToken) {
          this.motionTrackingPromise = null;
        }
      });

    return this.motionTrackingPromise;
  },

  stopMotionTracking() {
    this.motionTrackingToken += 1;

    if (this.data.motionStopFunction) {
      this.data.motionStopFunction();
      this.setData({ motionStopFunction: null });
    }

    this.motionTrackingPromise = null;
  },

  startCompassTracking() {
    if (this.data.compassStopFunction) {
      return;
    }

    const stopCompass = startCompass((payload) => {
      const session = getNavigationSession(app) || this.session;
      const heading = session?.segmentHeading ?? getSegmentHeading(session);
      const deviceDirection = Math.round(payload.direction);
      this.compassHeading = payload.direction;
      const hasHeading = !(heading === null || heading === undefined || Number.isNaN(Number(heading)));

      if (!hasHeading) {
        this.setData({
          deviceDirection,
          targetDirection: 0,
          relativeAngle: 0,
          arrowRotation: 0,
          directionText: '当前为跨楼层段，请前往下一二维码点',
          motionText: `设备朝向 ${deviceDirection}°`
        });
        this.updateLaneByRelative(0, true);
        this.pushRendererSensors();
        return;
      }

      const relative = calculateRelativeDirection(payload.direction, heading);
      const isInFront = Boolean(relative.isInFront);
      const directionText = isInFront
        ? (relative.direction || '请沿箭头方向前进')
        : '目标在身后，请原地转身后再前进';

      this.setData({
        deviceDirection,
        targetDirection: Math.round(heading),
        relativeAngle: Math.round(relative.relativeAngle),
        arrowRotation: relative.arrowRotation,
        directionText,
        motionText: `设备朝向 ${Math.round(payload.direction)}°`
      });

      this.updateLaneByRelative(relative.relativeAngle, isInFront);
      this.pushRendererSensors();
    });

    this.setData({ compassStopFunction: stopCompass });
  },

  stopCompassTracking() {
    if (this.data.compassStopFunction) {
      this.data.compassStopFunction();
      this.setData({ compassStopFunction: null });
    }
  },

  async handleRescan() {
    const currentSession = getNavigationSession(app);
    const destination = currentSession?.destination || app.globalData.destination;
    if (!destination?.id) {
      this.setData({ errorText: '缺少目的地信息，请返回重选。' });
      return;
    }

    try {
      this.setData({ loading: true, errorText: '' });
      wx.showLoading({ title: '重新扫码...' });

      const scanTarget = await scanNavigationTarget();
      const nodeCode = scanTarget?.nodeCode || scanTarget?.nodeId;
      const currentNode = nodeCode ? await getNodeByCode(nodeCode).catch(() => null) : null;
      const resolvedNode = buildCurrentNodeFromScan(scanTarget, currentNode);
      const segmentResponse = await getNavigationSegment(
        resolvedNode.nodeCode || resolvedNode.nodeId || nodeCode,
        destination.id
      );
      const session = createNavigationSession({
        destination,
        currentNode: resolvedNode,
        segmentResponse,
        mode: 'ar'
      });
      session.anchorHeading = currentSession?.anchorHeading ?? session.segmentHeading ?? 0;

      setNavigationSession(app, session);
      setNavigationMode(app, 'ar');
      app.setCurrentLocation?.(session.currentScannedNode);
      app.updateNavState('NAVIGATING');
      this.applySession(session);
      wx.showToast({
        title: `已校准到${session.currentScannedNode?.nodeName || '当前节点'}`,
        icon: 'success'
      });
    } catch (error) {
      this.setData({
        loading: false,
        errorText: error?.message || '重新扫码失败。'
      });
    } finally {
      wx.hideLoading();
      this.setData({ loading: false });
    }
  },

  switchToCompass() {
    const session = getNavigationSession(app);
    if (session) {
      const nextSession = {
        ...session,
        currentMode: 'compass'
      };
      setNavigationSession(app, nextSession);
      setNavigationMode(app, 'compass');
    }

    wx.navigateBack({
      delta: 1,
      fail: () => {
        wx.redirectTo({
          url: '/pages/navigation/navigation'
        });
      }
    });
  },

  endNavigation() {
    clearNavigationSession(app);
    app.updateNavState('READY');

    wx.navigateBack({
      delta: 1,
      fail: () => {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }
    });
  }
});
