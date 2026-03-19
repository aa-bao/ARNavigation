import { startCompass, calculateRelativeDirection } from '../../utils/compass.js';
import { getNodeByCode, getNavigationSegment } from '../../services/navigation-api.js';
import {
  getNavigationSession,
  setNavigationSession,
  setNavigationMode,
  clearNavigationSession,
  scanNavigationTarget
} from '../../services/navigation-session.js';
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
    directionText: '请按照箭头方向前进',
    instructionText: '导航将引导您前往下一个二维码点。',
    deviceDirection: 0,
    targetDirection: 0,
    relativeAngle: 0,
    arrowRotation: 0,
    currentMode: 'compass',
    compassStopFunction: null
  },

  onLoad() {
    this.initializePage();
  },

  onShow() {
    this.applySession(getNavigationSession(app));
    this.startCompass();
  },

  onHide() {
    this.stopCompass();
  },

  onUnload() {
    this.stopCompass();
  },

  async initializePage() {
    const session = getNavigationSession(app);
    if (session) {
      this.applySession(session);
      return;
    }

    const destination = app.globalData.destination;
    if (!destination?.id) {
      this.setData({
        loading: false,
        errorText: '缺少目的地信息，请返回重新选择。'
      });
      return;
    }

    const currentLocation = app.globalData.currentLocation;
    if (currentLocation?.nodeCode || currentLocation?.nodeId || currentLocation?.id) {
      await this.refreshSessionFromNode(currentLocation);
      return;
    }

    await this.scanAndRefreshSession();
  },

  applySession(session) {
    if (!session) {
      return;
    }

    const destination = session.destination || app.globalData.destination || null;
    const currentNode = session.currentScannedNode || null;
    const nextNode = session.segmentEndNode || null;
    this.session = session;
    const heading = session.segmentHeading ?? getSegmentHeading(session);
    const isFinalSegment = Boolean(session.isFinalSegment);
    const arrivedAtTarget = Boolean(
      isFinalSegment
      && currentNode?.nodeId
      && currentNode.nodeId === nextNode?.nodeId
    );
    const instructionText = arrivedAtTarget
      ? '您当前已位于最终目标点，可结束导航。'
      : `请前往 ${nextNode?.nodeName || '下一二维码点'} 并重新扫码校准。`;

    this.setData({
      loading: false,
      errorText: '',
      destination,
      currentNode,
      nextNode,
      isFinalSegment,
      arrivedAtTarget,
      instructionText,
      currentMode: session.currentMode || app.globalData.currentNavigationMode || 'compass',
      targetDirection: heading !== null ? Math.round(heading) : 0
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

  startCompass() {
    if (this.data.compassStopFunction) {
      return;
    }

    const stopCompass = startCompass((payload) => {
      const session = getNavigationSession(app);
      const heading = session?.segmentHeading ?? getSegmentHeading(session);
      if (heading === null) {
        return;
      }

      const relative = calculateRelativeDirection(payload.direction, heading);
      this.setData({
        deviceDirection: Math.round(payload.direction),
        targetDirection: Math.round(heading),
        relativeAngle: relative.arrowRotation,
        arrowRotation: relative.arrowRotation,
        directionText: relative.direction || '请沿箭头方向前进'
      });
    });

    this.setData({ compassStopFunction: stopCompass });
  },

  stopCompass() {
    if (this.data.compassStopFunction) {
      this.data.compassStopFunction();
      this.setData({ compassStopFunction: null });
    }
  },

  async refreshSessionFromNode(currentNode) {
    const activeSession = getNavigationSession(app);
    const destination = activeSession?.destination || app.globalData.destination;
    if (!destination?.id) {
      throw new Error('缺少目的地信息，请返回重新选择。');
    }

    const currentNodeCode = currentNode?.nodeCode || currentNode?.nodeId || currentNode?.id;
    if (!currentNodeCode) {
      throw new Error('当前扫码点缺少 nodeCode，无法规划路径。');
    }

    const segmentResponse = await getNavigationSegment(currentNodeCode, destination.id);
    const nextSession = createNavigationSession({
      destination,
      currentNode,
      segmentResponse,
      mode: 'compass'
    });

    setNavigationSession(app, nextSession);
    setNavigationMode(app, 'compass');
    app.setCurrentLocation?.(nextSession.currentScannedNode);
    app.updateNavState(
      nextSession.isFinalSegment
      && nextSession.currentScannedNode?.nodeId === nextSession.segmentEndNode?.nodeId
        ? 'ARRIVED'
        : 'NAVIGATING'
    );

    this.applySession(nextSession);
  },

  async scanAndRefreshSession() {
    const session = getNavigationSession(app);
    const destination = session?.destination || app.globalData.destination;
    if (!destination?.id) {
      this.setData({
        loading: false,
        errorText: '缺少目的地信息，请返回重新选择。'
      });
      return;
    }

    try {
      this.setData({ loading: true, errorText: '' });
      wx.showLoading({ title: '扫描中...' });

      const scanTarget = await scanNavigationTarget();
      const nodeCode = scanTarget?.nodeCode || scanTarget?.nodeId;
      const currentNode = nodeCode ? await getNodeByCode(nodeCode).catch(() => null) : null;
      const resolvedNode = buildCurrentNodeFromScan(scanTarget, currentNode);
      await this.refreshSessionFromNode(resolvedNode);
    } catch (error) {
      this.setData({
        loading: false,
        errorText: error?.message || '扫码或导航请求失败。'
      });
      wx.showToast({
        title: '导航初始化失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  async handleRescan() {
    await this.scanAndRefreshSession();
  },

  handleArrivedPrompt() {
    wx.showModal({
      title: '重新校准',
      content: this.data.isFinalSegment
        ? (this.data.arrivedAtTarget
          ? '您已在目标点附近，可以结束导航。'
          : '这是最后一段，请到达目标点二维码后再次扫描确认。')
        : '请确认您已到达下一二维码点，然后扫描二维码校准位置。',
      confirmText: this.data.arrivedAtTarget ? '结束导航' : '去扫码',
      success: async ({ confirm }) => {
        if (!confirm) {
          return;
        }

        if (this.data.arrivedAtTarget) {
          this.endNavigation();
          return;
        }

        await this.scanAndRefreshSession();
      }
    });
  },

  enterARMode() {
    const session = getNavigationSession(app);
    if (!session) {
      wx.showToast({
        title: '请先完成扫码',
        icon: 'none'
      });
      return;
    }

    const nextSession = {
      ...session,
      currentMode: 'ar',
      anchorHeading: this.data.deviceDirection || session.segmentHeading || getSegmentHeading(session) || 0
    };
    setNavigationSession(app, nextSession);
    setNavigationMode(app, 'ar');
    app.updateNavState('NAVIGATING');

    wx.navigateTo({
      url: '/pages/ar/ar'
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
