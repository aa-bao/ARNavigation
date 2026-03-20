import { getNodeByCode, getNavigationSegment } from '../../services/navigation-api.js';
import {
  getNavigationSession,
  setNavigationSession,
  setNavigationMode,
  clearNavigationSession,
  scanNavigationTarget
} from '../../services/navigation-session.js';
import { startCompass, calculateRelativeDirection } from '../../utils/compass.js';
import { createNavigationSession, getSegmentHeading, normalizeNode } from '../../utils/navigation-transform.js';

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
    rendererSupported: true,
    rendererReady: true,
    rendererStatusText: '相机叠加箭头已就绪',
    motionText: '等待方向同步',
    promptText: 'AR 仅使用最近一次扫码点作为局部锚点。',
    directionText: '请沿箭头方向前进',
    deviceDirection: 0,
    targetDirection: 0,
    relativeAngle: 0,
    arrowRotation: 0,
    compassStopFunction: null
  },

  onLoad() {
    this.initializePage();
  },

  onShow() {
    this.applySession(getNavigationSession(app));
    this.startCompassTracking();
  },

  onHide() {
    this.stopCompassTracking();
  },

  onUnload() {
    this.stopCompassTracking();
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
      rendererSupported: true,
      rendererReady: true,
      rendererStatusText: '相机叠加箭头已就绪'
    });

    if (arrivedAtTarget) {
      app.updateNavState('ARRIVED');
      this.setData({
        directionText: '已到达目的地',
        relativeAngle: 0,
        arrowRotation: 0
      });
      return;
    }

    app.updateNavState('NAVIGATING');
  },

  startCompassTracking() {
    if (this.data.compassStopFunction) {
      return;
    }

    const stopCompass = startCompass((payload) => {
      const session = getNavigationSession(app) || this.session;
      const heading = session?.segmentHeading ?? getSegmentHeading(session);
      const deviceDirection = Math.round(payload.direction);
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
        return;
      }

      const relative = calculateRelativeDirection(payload.direction, heading);
      this.setData({
        deviceDirection,
        targetDirection: Math.round(heading),
        relativeAngle: Math.round(relative.relativeAngle),
        arrowRotation: relative.arrowRotation,
        directionText: relative.direction || '请沿箭头方向前进',
        motionText: `设备朝向 ${Math.round(payload.direction)}°`
      });
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
