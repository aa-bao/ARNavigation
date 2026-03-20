import {
  fetchMapEdges,
  fetchMapNodes,
  getMapOptionByKey,
  MAP_FLOOR_OPTIONS,
  MAP_VIEWPORT
} from '../../services/map-data.js';
import { getNavigationSession } from '../../services/navigation-session.js';
import { buildMapScene } from '../../utils/map-projector.js';

const app = getApp();

const getRecommendedFloor = ({ currentNode, destination, segmentEndNode, mode }) => {
  const currentFloor = Number(currentNode?.floor ?? currentNode?.floorNumber);
  const destinationFloor = Number(destination?.floor);
  const nextFloor = Number(segmentEndNode?.floor);

  if (mode === 'navigation' && Number.isFinite(currentFloor)) {
    return currentFloor;
  }

  if (Number.isFinite(nextFloor)) {
    return nextFloor;
  }

  if (Number.isFinite(currentFloor)) {
    return currentFloor;
  }

  if (Number.isFinite(destinationFloor)) {
    return destinationFloor;
  }

  return 1;
};

const resolveNodeName = (node, fallback) => node?.nodeName || node?.name || fallback;

const getGuidanceText = ({ floor, mode, currentNode, destination, segmentEndNode }) => {
  const currentFloor = Number(currentNode?.floor ?? currentNode?.floorNumber);
  const destinationFloor = Number(destination?.floor);
  const segmentFloor = Number(segmentEndNode?.floor);

  if (mode === 'navigation' && Number.isFinite(segmentFloor) && segmentFloor !== floor) {
    return `当前导航段终点位于 ${segmentFloor}F，切换楼层后可查看下一校准点。`;
  }

  if (Number.isFinite(currentFloor) && Number.isFinite(destinationFloor) && currentFloor !== destinationFloor) {
    return `您当前位于 ${currentFloor}F，目标位于 ${destinationFloor}F，请优先前往电梯或楼梯换层。`;
  }

  if (mode === 'navigation') {
    return '导航中，地图会同步显示当前位置、下一校准点和目标点。';
  }

  return '地图仅供参考，位置以二维码扫描为准。';
};

const getCanvasHeight = (width) => Math.round((width * MAP_VIEWPORT.height) / MAP_VIEWPORT.width);

Page({
  data: {
    mapMode: 'browse',
    hasCustomSelection: false,
    activeKey: '1F',
    activeTitle: '1F 平面图',
    activeFloor: 1,
    floorOptions: MAP_FLOOR_OPTIONS,
    currentNode: null,
    segmentEndNode: null,
    destination: null,
    currentSummary: '尚未定位',
    segmentEndSummary: '暂无下一校准点',
    destinationSummary: '尚未选择',
    guidanceText: '地图仅供参考，位置以二维码扫描为准。',
    loading: true,
    errorText: '',
    edgeWarningText: '',
    floorNodeCount: 0,
    floorEdgeCount: 0,
    canvasWidth: 320,
    canvasHeight: getCanvasHeight(320),
    legendItems: [
      { key: 'CURRENT', label: '当前位置', color: '#2563eb' },
      { key: 'DESTINATION', label: '目的地', color: '#dc2626' },
      { key: 'SEGMENT_END', label: '下一校准点', color: '#d97706' }
    ]
  },

  onLoad(query = {}) {
    const context = app.consumeMapViewContext?.() || null;
    this.mapNodes = [];
    this.mapEdges = [];
    this.renderTimer = null;
    this.setData({
      mapMode: query.mode || context?.mode || 'browse'
    });
  },

  onReady() {
    this.initializePage();
  },

  onShow() {
    this.syncView();
  },

  onUnload() {
    if (this.renderTimer) {
      clearTimeout(this.renderTimer);
      this.renderTimer = null;
    }
  },

  async initializePage() {
    try {
      await this.ensureCanvasSize();
      await this.ensureMapData();
      this.syncView();
    } catch (error) {
      this.setData({
        loading: false,
        errorText: error?.message || '地图数据加载失败'
      });
    }
  },

  async ensureMapData() {
    if (this.mapNodes.length) {
      return;
    }

    this.setData({ loading: true, errorText: '', edgeWarningText: '' });

    const nodes = await fetchMapNodes();
    this.mapNodes = Array.isArray(nodes) ? nodes : [];
    if (!this.mapNodes.length) {
      throw new Error('地图节点数据为空');
    }

    try {
      const edges = await fetchMapEdges();
      this.mapEdges = Array.isArray(edges) ? edges : [];
    } catch (error) {
      this.mapEdges = [];
      this.setData({
        edgeWarningText: '边线数据加载失败，已切换为纯节点地图。'
      });
    }

    this.setData({ loading: false });
  },

  ensureCanvasSize() {
    return new Promise((resolve) => {
      wx.nextTick(() => {
        const query = wx.createSelectorQuery().in(this);
        query.select('.map-stage').boundingClientRect();
        query.exec((result) => {
          const rect = result && result[0];
          const width = Math.max(Math.round(rect?.width || 320), 280);
          this.setData({
            canvasWidth: width,
            canvasHeight: getCanvasHeight(width)
          }, resolve);
        });
      });
    });
  },

  handleFloorSwitch(event) {
    const { key } = event.currentTarget.dataset;
    const option = getMapOptionByKey(key);
    if (!option) {
      return;
    }

    this.setData({ hasCustomSelection: true });
    this.applyActiveFloor(option);
    this.scheduleRender();
  },

  syncView() {
    const session = getNavigationSession(app);
    const currentNode = session?.currentScannedNode || app.globalData.currentLocation || null;
    const segmentEndNode = session?.segmentEndNode || null;
    const destination = session?.destination || app.globalData.destination || null;
    const preferredFloor = getRecommendedFloor({
      currentNode,
      destination,
      segmentEndNode,
      mode: this.data.mapMode
    });
    const option = this.resolveActiveOption(preferredFloor);

    this.currentNode = currentNode;
    this.segmentEndNode = segmentEndNode;
    this.destination = destination;
    this.navigationSession = session;

    this.applyActiveFloor(option, {
      currentNode,
      segmentEndNode,
      destination
    });
    this.scheduleRender();
  },

  resolveActiveOption(preferredFloor) {
    if (this.data.hasCustomSelection) {
      return getMapOptionByKey(this.data.activeKey);
    }
    return getMapOptionByKey(`${preferredFloor}F`);
  },

  applyActiveFloor(option, state = {}) {
    const currentNode = state.currentNode ?? this.currentNode ?? null;
    const segmentEndNode = state.segmentEndNode ?? this.segmentEndNode ?? null;
    const destination = state.destination ?? this.destination ?? null;

    this.setData({
      activeKey: option.key,
      activeTitle: option.title,
      activeFloor: option.floor,
      currentNode,
      segmentEndNode,
      destination,
      currentSummary: resolveNodeName(currentNode, '尚未定位'),
      segmentEndSummary: resolveNodeName(segmentEndNode, '暂无下一校准点'),
      destinationSummary: resolveNodeName(destination, '尚未选择'),
      guidanceText: getGuidanceText({
        floor: option.floor,
        mode: this.data.mapMode,
        currentNode,
        destination,
        segmentEndNode
      })
    });
  },

  scheduleRender() {
    if (this.renderTimer) {
      clearTimeout(this.renderTimer);
    }

    this.renderTimer = setTimeout(() => {
      this.renderTimer = null;
      this.renderScene();
    }, 40);
  },

  renderScene() {
    if (this.data.errorText || !this.data.canvasWidth || !this.mapNodes.length) {
      return;
    }

    const scene = buildMapScene({
      floor: this.data.activeFloor,
      nodes: this.mapNodes,
      edges: this.mapEdges,
      routePoints: this.navigationSession?.segmentPoints || [],
      markerNodes: {
        CURRENT: this.currentNode,
        DESTINATION: this.destination,
        SEGMENT_END: this.segmentEndNode
      }
    });

    const ctx = wx.createCanvasContext('floorCanvas', this);
    const scaleX = this.data.canvasWidth / scene.width;
    const scaleY = this.data.canvasHeight / scene.height;

    ctx.clearRect(0, 0, this.data.canvasWidth, this.data.canvasHeight);
    ctx.save();
    ctx.scale(scaleX, scaleY);

    const unitScale = 1 / Math.min(scaleX, scaleY);

    this.drawBoard(ctx, scene, unitScale);
    this.drawGrid(ctx, scene, unitScale);
    this.drawEdges(ctx, scene, unitScale);
    this.drawRoute(ctx, scene, unitScale);
    this.drawNodes(ctx, scene, unitScale);
    this.drawMarkers(ctx, scene, unitScale);

    ctx.restore();
    ctx.draw();

    if (scene.nodes.length !== this.data.floorNodeCount || scene.edges.length !== this.data.floorEdgeCount) {
      this.setData({
        floorNodeCount: scene.nodes.length,
        floorEdgeCount: scene.edges.length
      });
    }
  },

  drawBoard(ctx, scene, unitScale) {
    ctx.setFillStyle('#f7fbff');
    ctx.fillRect(0, 0, scene.width, scene.height);

    ctx.setStrokeStyle('rgba(47, 111, 159, 0.18)');
    ctx.setLineWidth(1.2 * unitScale);
    ctx.strokeRect(1, 1, scene.width - 2, scene.height - 2);
  },

  drawGrid(ctx, scene, unitScale) {
    ctx.setStrokeStyle('rgba(148, 163, 184, 0.18)');
    ctx.setLineWidth(0.8 * unitScale);

    scene.gridX.forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(x, MAP_VIEWPORT.padding.top);
      ctx.lineTo(x, scene.height - MAP_VIEWPORT.padding.bottom);
      ctx.stroke();
    });

    scene.gridY.forEach((y) => {
      ctx.beginPath();
      ctx.moveTo(MAP_VIEWPORT.padding.left, y);
      ctx.lineTo(scene.width - MAP_VIEWPORT.padding.right, y);
      ctx.stroke();
    });
  },

  drawEdges(ctx, scene, unitScale) {
    ctx.setStrokeStyle('rgba(37, 99, 235, 0.82)');
    ctx.setLineWidth(3.8 * unitScale);
    ctx.setLineCap('round');

    scene.edges.forEach((edge) => {
      ctx.beginPath();
      ctx.moveTo(edge.x1, edge.y1);
      ctx.lineTo(edge.x2, edge.y2);
      ctx.stroke();
    });
  },

  drawRoute(ctx, scene, unitScale) {
    if (!scene.route.length) {
      return;
    }

    ctx.setStrokeStyle('#16a34a');
    ctx.setLineWidth(3.6 * unitScale);
    ctx.setLineCap('round');
    ctx.setLineJoin('round');

    ctx.beginPath();
    scene.route.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.renderX, point.renderY);
        return;
      }
      ctx.lineTo(point.renderX, point.renderY);
    });
    ctx.stroke();
  },

  drawNodes(ctx, scene, unitScale) {
    scene.nodes.forEach((node) => {
      ctx.setFillStyle('#ffffff');
      ctx.beginPath();
      ctx.arc(node.renderX, node.renderY, 6.8 * unitScale, 0, Math.PI * 2);
      ctx.fill();

      ctx.setStrokeStyle('rgba(15, 23, 42, 0.35)');
      ctx.setLineWidth(1.5 * unitScale);
      ctx.beginPath();
      ctx.arc(node.renderX, node.renderY, 6.8 * unitScale, 0, Math.PI * 2);
      ctx.stroke();

      // Keep regular nodes neutral so legend colors are reserved for map markers.
      ctx.setFillStyle('#64748b');
      ctx.beginPath();
      ctx.arc(node.renderX, node.renderY, 3.4 * unitScale, 0, Math.PI * 2);
      ctx.fill();
    });
  },

  drawMarkers(ctx, scene, unitScale) {
    ctx.setFontSize(13 * unitScale);
    scene.markers.forEach((marker) => {
      ctx.setStrokeStyle(marker.color);
      ctx.setLineWidth(3.2 * unitScale);
      ctx.beginPath();
      ctx.arc(marker.renderX, marker.renderY, 11.5 * unitScale, 0, Math.PI * 2);
      ctx.stroke();

      ctx.setFillStyle('#ffffff');
      ctx.beginPath();
      ctx.arc(marker.renderX, marker.renderY, 6.8 * unitScale, 0, Math.PI * 2);
      ctx.fill();

      ctx.setFillStyle(marker.color);
      ctx.beginPath();
      ctx.arc(marker.renderX, marker.renderY, 4.6 * unitScale, 0, Math.PI * 2);
      ctx.fill();

      ctx.setFillStyle(marker.color);
      ctx.setTextAlign('left');
      ctx.fillText(marker.nodeName, marker.renderX + 22, marker.renderY + 6);
    });
  }
});
