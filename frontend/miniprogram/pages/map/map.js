import { MAP_FLOOR_OPTIONS, MAP_VIEW_TYPES, getFloorMapConfig, getMapOptionByKey } from '../../services/map-data.js';
import { buildMapMarker } from '../../utils/map-projector.js';
import { getNavigationSession } from '../../services/navigation-session.js';

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

const resolvePreferredFloor = ({ currentNode, currentLocation, destination }) => {
  const preferred = Number(
    currentNode?.floor
    ?? currentLocation?.floor
    ?? currentLocation?.floorNumber
    ?? destination?.floor
  );
  return Number.isFinite(preferred) ? preferred : 1;
};

Page({
  data: {
    mapMode: 'browse',
    hasCustomSelection: false,
    activeKey: '1F',
    activeTitle: '1F 平面图',
    activeFloor: 1,
    isOverview: false,
    imagePath: '',
    floorOptions: MAP_FLOOR_OPTIONS,
    currentNode: null,
    segmentEndNode: null,
    destination: null,
    markers: [],
    currentSummary: '尚未定位',
    segmentEndSummary: '暂无导航段终点',
    destinationSummary: '尚未选择',
    guidanceText: '切换楼层查看医院布局。',
    errorText: '',
    imageErrorText: ''
  },

  onLoad(query = {}) {
    const context = app.consumeMapViewContext?.() || null;
    const mapMode = query.mode || context?.mode || 'browse';
    this.setData({ mapMode });
  },

  onShow() {
    this.syncView();
  },

  handleFloorSwitch(event) {
    const { key } = event.currentTarget.dataset;
    const option = getMapOptionByKey(key);
    if (!option) {
      return;
    }

    this.setData({ hasCustomSelection: true });
    this.setActiveOption(option);
    this.renderMarkers(option);
  },

  handleImageError() {
    this.setData({
      imageErrorText: '地图资源加载失败，请稍后重试或切换其他楼层。'
    });
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
    const activeOption = this.resolveActiveOption(preferredFloor);

    this.currentNode = currentNode;
    this.segmentEndNode = segmentEndNode;
    this.destination = destination;

    this.setActiveOption(activeOption, {
      currentNode,
      segmentEndNode,
      destination
    });
    this.renderMarkers(activeOption, {
      currentNode,
      segmentEndNode,
      destination
    });
  },

  resolveActiveOption(preferredFloor) {
    const currentOption = getMapOptionByKey(this.data.activeKey);
    if (this.data.hasCustomSelection && currentOption) {
      return currentOption;
    }
    return getFloorMapConfig(preferredFloor) || MAP_FLOOR_OPTIONS[0];
  },

  setActiveOption(option, state = {}) {
    const currentNode = state.currentNode ?? this.currentNode ?? null;
    const segmentEndNode = state.segmentEndNode ?? this.segmentEndNode ?? null;
    const destination = state.destination ?? this.destination ?? null;
    const currentFloor = Number(currentNode?.floor ?? currentNode?.floorNumber);
    const segmentEndFloor = Number(segmentEndNode?.floor);
    const destinationFloor = Number(destination?.floor);

    let guidanceText = this.data.mapMode === 'navigation'
      ? '导航中，可随时回到指南针页继续前进。'
      : '地图仅供参考，位置以二维码扫描为准。';
    let errorText = '';

    if (option.type === MAP_VIEW_TYPES.FLOOR) {
      if (this.data.mapMode === 'navigation' && segmentEndFloor && option.floor !== segmentEndFloor) {
        guidanceText = `当前导航段终点位于 ${segmentEndFloor}F，请切换后查看下一校准点。`;
      } else if (destinationFloor && currentFloor && destinationFloor !== currentFloor) {
        guidanceText = `您当前位于 ${currentFloor}F，目的地位于 ${destinationFloor}F，请先前往电梯或楼梯换层。`;
      } else if (destinationFloor && option.floor !== destinationFloor && this.data.mapMode === 'navigation') {
        guidanceText = `当前查看 ${option.floor}F，目的地点位于 ${destinationFloor}F。`;
      }
    } else {
      guidanceText = '3D 总览仅用于楼层关系参考，不显示精确定位点。';
    }

    if (option.type === MAP_VIEW_TYPES.FLOOR && !getFloorMapConfig(option.floor)) {
      errorText = '未找到该楼层的地图配置。';
    }

    this.setData({
      activeKey: option.key,
      activeTitle: option.title,
      activeFloor: option.floor,
      isOverview: option.type === MAP_VIEW_TYPES.OVERVIEW,
      imagePath: option.imagePath,
      guidanceText,
      errorText,
      imageErrorText: '',
      currentSummary: currentNode?.nodeName || currentNode?.name || '尚未定位',
      segmentEndSummary: segmentEndNode?.nodeName || '暂无导航段终点',
      destinationSummary: destination?.nodeName || destination?.name || '尚未选择'
    });
  },

  renderMarkers(option, state = {}) {
    const currentNode = state.currentNode ?? this.currentNode ?? null;
    const segmentEndNode = state.segmentEndNode ?? this.segmentEndNode ?? null;
    const destination = state.destination ?? this.destination ?? null;

    if (option.type !== MAP_VIEW_TYPES.FLOOR) {
      this.setData({ markers: [] });
      return;
    }

    const markers = [
      buildMapMarker(currentNode, 'CURRENT', option),
      buildMapMarker(segmentEndNode, 'SEGMENT_END', option),
      buildMapMarker(destination, 'DESTINATION', option)
    ].filter(Boolean).filter((item) => item.floor === option.floor);

    this.setData({
      markers,
      errorText: markers.length
        ? ''
        : (this.data.errorText || '当前楼层暂无可展示点位，可切换楼层查看。')
    });
  }
});
