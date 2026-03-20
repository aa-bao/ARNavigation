// pages/index/index.js
import { get } from '../../utils/request.js';
import {
  createNavigationHistory,
  getDestinations,
  getRecentNavigationHistory
} from '../../services/navigation-api.js';
import { getStorage, setStorage } from '../../utils/storage.js';
import { calculatePlanarDistance } from '../../utils/location.js';
import { normalizeNode } from '../../utils/navigation-transform.js';
import { parseNavigationScanResult, scanNavigationTarget } from '../../services/navigation-session.js';
import { emitVibrationFeedback, emitVoiceBroadcast } from '../../utils/navigation-feedback.js';
import { loadUserSettingsSync } from '../../utils/user-settings.js';

const app = getApp();

const getUserSettings = () => app.getUserSettings?.() || loadUserSettingsSync();

const NAV_STATE_TEXT = {
  UNLOCATED: '未定位',
  READY: '已定位',
  NAVIGATING: '导航中',
  ARRIVED: '已到达'
};

const NODE_TYPE_TEXT = {
  NORMAL: '普通区域',
  CLINIC: '诊室',
  ENTRANCE: '入口',
  EXIT: '出口',
  LOBBY: '大厅',
  HALL: '走廊',
  RESTROOM: '卫生间',
  EXAMINATION: '检查区',
  NURSE_STATION: '护士站',
  REGISTRATION: '挂号收费区',
  PHARMACY: '药房',
  ELEVATOR: '电梯',
  STAIRS: '楼梯',
  SERVICE: '服务台',
  OFFICE: '办公室',
  WARD: '病房',
  WAITING: '候诊区',
  LAB: '检验科',
  IMAGING: '影像科',
  RECENT: '最近到访'
};

const localizeNodeType = (value) => {
  if (!value) {
    return '普通区域';
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return '普通区域';
  }

  const upper = normalized.toUpperCase();
  if (NODE_TYPE_TEXT[upper]) {
    return NODE_TYPE_TEXT[upper];
  }

  if (/NURSE/.test(upper)) return '护士站';
  if (/REGISTRATION|CASHIER|CHARGE/.test(upper)) return '挂号收费区';
  if (/PHARMACY|DRUG/.test(upper)) return '药房';
  if (/RESTROOM|TOILET|WC/.test(upper)) return '卫生间';
  if (/ENTRANCE|ENTRY|GATE/.test(upper)) return '入口';
  if (/EXAM|CHECK/.test(upper)) return '检查区';
  if (/CLINIC|OUTPATIENT/.test(upper)) return '诊室';
  if (/ELEVATOR|LIFT/.test(upper)) return '电梯';
  if (/STAIR/.test(upper)) return '楼梯';
  if (/LOBBY|HALL/.test(upper)) return '大厅';

  return '其他区域';
};

const buildDestinationFromScan = (scanTarget, apiNode = null) => {
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
    navState: 'UNLOCATED', // UNLOCATED, READY, NAVIGATING, ARRIVED
    navStateText: '未定位',
    currentLocation: null,
    searchKeyword: '',
    searchResults: [],
    searchDebounceTimer: null,
    commonDestinations: [],
    destinationCatalog: [],
    filteredDestinations: [],
    pagedDestinations: [],
    currentPage: 1,
    pageSize: 9,
    totalPages: 1,
    floorOptions: ['全部楼层'],
    floorOptionValues: [''],
    floorFilterIndex: 0,
    typeOptions: ['全部类型'],
    typeOptionValues: [''],
    typeFilterIndex: 0,
    recentDestinations: [],
    selectedDestination: null,
    navigationHistory: []
  },

  onLoad() {
    this.loadData();
  },

  async onShow() {
    this.syncGlobalState();
  },

  onHide() {
    if (this.data.searchDebounceTimer) {
      clearTimeout(this.data.searchDebounceTimer);
    }
  },

  syncGlobalState() {
    const globalData = app.globalData;
    const navigationHistory = globalData.navigationHistory || [];
    this.setData({
      navState: globalData.navState,
      navStateText: this.getNavStateText(globalData.navState),
      currentLocation: globalData.currentLocation,
      selectedDestination: globalData.destination,
      navigationHistory,
      recentDestinations: this.mapRecentDestinations(navigationHistory)
    });
    this.applyDestinationFilters();
  },

  getNavStateText(state) {
    return NAV_STATE_TEXT[state] || '未知状态';
  },

  async loadData() {
    try {
      const history = await getStorage('navigationHistory', []);
      this.setData({
        navigationHistory: history,
        recentDestinations: this.mapRecentDestinations(history)
      });
      await this.loadCommonDestinations();
      await this.loadRecentHistory();

      const currentLocation = app.globalData.currentLocation;
      if (currentLocation) {
        this.setData({
          currentLocation,
          navState: 'READY',
          navStateText: '已定位'
        });
      }
    } catch (error) {
      console.error('Load data failed:', error);
    }
  },

  async loadCommonDestinations() {
    try {
      const nodes = await getDestinations({ limit: 200 });
      const commonDestinations = (nodes || [])
        .map((item) => this.mapNodeToDestination(item));
      this.setData({
        commonDestinations,
        destinationCatalog: commonDestinations
      });
      this.buildDestinationFilters(commonDestinations);
      this.applyDestinationFilters();
    } catch (error) {
      console.error('Load destinations failed:', error);
      const fallback = this.mapRecentDestinations(this.data.navigationHistory);
      this.setData({
        commonDestinations: fallback,
        destinationCatalog: fallback
      });
      this.buildDestinationFilters(fallback);
      this.applyDestinationFilters();
    }
  },

  async loadRecentHistory() {
    try {
      const userId = app.globalData.userInfo?.id;
      if (!userId) {
        return;
      }
      const remoteRecent = await getRecentNavigationHistory({ userId, limit: 6 });
      if (Array.isArray(remoteRecent) && remoteRecent.length) {
        const persistedRecent = remoteRecent.map((item) => ({
          id: item.nodeId,
          name: item.nodeName,
          floor: item.floor ? `${item.floor}F` : '',
          type: item.nodeType || 'RECENT',
          typeLabel: localizeNodeType(item.nodeType || 'RECENT'),
          nodeCode: item.nodeCode || (item.nodeId ? String(item.nodeId) : ''),
          nodeType: item.nodeType || 'RECENT',
          description: item.description || '',
          coordinates: null
        }));
        this.setData({ recentDestinations: persistedRecent });
      }

      const remoteHistory = remoteRecent;
      if (!Array.isArray(remoteHistory) || !remoteHistory.length) {
        return;
      }

      const normalizedHistory = remoteHistory.map((item) => ({
        ...item,
        fromId: item.startNodeId || null,
        fromName: item.startNodeName || item.startNodeCode || this.data.currentLocation?.name || '未知位置',
        toId: item.targetNodeId || item.nodeId,
        toName: item.targetNodeName || item.nodeName || item.targetNodeCode || item.nodeCode || '未知地点',
        timestamp: item.startedAt
          ? new Date(item.startedAt).getTime()
          : (item.lastNavigatedAt ? new Date(item.lastNavigatedAt).getTime() : Date.now())
      }));
      const mergedHistory = [...normalizedHistory];
      (this.data.navigationHistory || []).forEach((item) => {
        const key = `${item.toId || ''}-${item.timestamp || ''}`;
        if (!mergedHistory.some((remoteItem) => `${remoteItem.toId || ''}-${remoteItem.timestamp || ''}` === key)) {
          mergedHistory.push(item);
        }
      });
      app.globalData.navigationHistory = mergedHistory;
      this.setData({
        navigationHistory: mergedHistory,
        recentDestinations: this.data.recentDestinations.length
          ? this.data.recentDestinations
          : this.mapRecentDestinations(mergedHistory)
      });
    } catch (error) {
      console.error('Load remote history failed:', error);
    }
  },

  async handleScan() {
    const canScan = await this.ensureLoginBeforeScan();
    if (!canScan) return;

    this.processQRCode();
  },

  async ensureLoginBeforeScan() {
    const authenticated = await app.isAuthenticated();
    if (authenticated) {
      return true;
    }

    const modalRes = await wx.showModal({
      title: '请先登录',
      content: '扫码导航需要先进行微信授权登录',
      confirmText: '登录',
      cancelText: '取消'
    });
    if (!modalRes.confirm) {
      return false;
    }

    wx.navigateTo({
      url: '/pages/login/login'
    });
    return false;
  },

  async processQRCode(result) {
    try {
      wx.showLoading({ title: '定位中...' });
      app.clearNavigationSession?.();

      const scanTarget = result
        ? (typeof result === 'string' ? parseNavigationScanResult(result) : result)
        : await scanNavigationTarget();
      const locationId = scanTarget?.nodeCode || scanTarget?.nodeId;
      if (!locationId) {
        throw new Error('Invalid QR content');
      }

      const response = await get(`/navigation/node/code/${locationId}`).catch(() => null);
      const normalized = buildDestinationFromScan(scanTarget, response);

      const currentLocation = {
        id: normalized.nodeId,
        nodeId: normalized.nodeId,
        nodeCode: normalized.nodeCode,
        name: normalized.nodeName,
        nodeName: normalized.nodeName,
        description: response?.description || '',
        floor: normalized.floor ? `${normalized.floor}F` : '',
        floorNumber: normalized.floor,
        type: normalized.nodeType,
        nodeType: normalized.nodeType,
        coordinates: {
          x: normalized.planarX,
          y: normalized.planarY
        }
      };

      app.setCurrentLocation(currentLocation);
      const settings = getUserSettings();
      emitVibrationFeedback(settings, 'short');
      emitVoiceBroadcast(settings, `已定位 ${currentLocation.name}`);

      this.setData({
        currentLocation,
        navState: 'READY',
        navStateText: '已定位'
      });
      this.applyDestinationDistance();

      wx.showToast({
        title: '定位成功',
        icon: 'success'
      });
    } catch (error) {
      console.error('Process QR code failed:', error);
      wx.showToast({
        title: '定位失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  handleReScan() {
    this.setData({
      currentLocation: null,
      selectedDestination: null,
      navState: 'UNLOCATED',
      navStateText: '未定位'
    });
    app.updateNavState('UNLOCATED');
    app.setCurrentLocation(null);
    app.setDestination(null);
    app.clearNavigationSession?.();
    this.handleScan();
  },

  onSearchInput(e) {
    const keyword = e.detail.value;
    this.setData({ searchKeyword: keyword });

    if (this.data.searchDebounceTimer) {
      clearTimeout(this.data.searchDebounceTimer);
    }

    this.data.searchDebounceTimer = setTimeout(() => {
      this.performSearch(keyword);
    }, 300);
  },

  onSearchConfirm(e) {
    const keyword = e.detail.value;
    this.performSearch(keyword);
  },

  clearSearch() {
    this.setData({
      searchKeyword: '',
      searchResults: []
    });
    this.applyDestinationFilters(1);
  },

  async performSearch(keyword) {
    if (!keyword.trim()) {
      this.setData({ searchResults: [] });
      this.applyDestinationFilters(1);
      return;
    }

    try {
      const results = await get('/location/search', {
        keyword: keyword.trim(),
        limit: 10
      });

      const mappedResults = results.map((item) => this.mapNodeToDestination(item));

      if (this.data.currentLocation && this.data.currentLocation.coordinates) {
        mappedResults.forEach((item) => {
          if (item.coordinates) {
            item.distance = Math.round(
              calculatePlanarDistance(
                this.data.currentLocation.coordinates.x,
                this.data.currentLocation.coordinates.y,
                item.coordinates.x,
                item.coordinates.y
              )
            );
          }
        });

        mappedResults.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
      }

      this.setData({ searchResults: mappedResults });
    } catch (error) {
      console.error('Search failed:', error);
      this.performLocalSearch(keyword);
    }
  },

  performLocalSearch(keyword) {
    const lowerKeyword = keyword.toLowerCase();
    const source = [...this.data.destinationCatalog, ...this.data.recentDestinations];
    const results = source.filter(
      (item) =>
        item.name.toLowerCase().includes(lowerKeyword)
        || item.floor.toLowerCase().includes(lowerKeyword)
        || (item.type || '').toLowerCase().includes(lowerKeyword)
    );
    this.setData({ searchResults: results });
  },

  buildDestinationFilters(destinations = []) {
    const floorSet = new Set();
    const typeMap = new Map();
    destinations.forEach((item) => {
      if (item.floor) {
        floorSet.add(item.floor);
      }
      if (item.type) {
        typeMap.set(item.type, item.typeLabel || localizeNodeType(item.type));
      }
    });

    const floorValues = ['', ...Array.from(floorSet)];
    const typeValues = ['', ...Array.from(typeMap.keys())];
    this.setData({
      floorOptions: ['全部楼层', ...Array.from(floorSet)],
      floorOptionValues: floorValues,
      typeOptions: ['全部类型', ...Array.from(typeMap.values())],
      typeOptionValues: typeValues
    });
  },

  applyDestinationDistance(list = this.data.destinationCatalog) {
    if (!this.data.currentLocation?.coordinates) {
      return list;
    }

    return list.map((item) => {
      if (!item.coordinates) {
        return item;
      }
      return {
        ...item,
        distance: Math.round(
          calculatePlanarDistance(
            this.data.currentLocation.coordinates.x,
            this.data.currentLocation.coordinates.y,
            item.coordinates.x,
            item.coordinates.y
          )
        )
      };
    }).sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
  },

  applyDestinationFilters(page = this.data.currentPage || 1) {
    const keyword = (this.data.searchKeyword || '').trim().toLowerCase();
    const floorFilter = this.data.floorOptionValues[this.data.floorFilterIndex] || '';
    const typeFilter = this.data.typeOptionValues[this.data.typeFilterIndex] || '';

    let filtered = this.applyDestinationDistance(this.data.destinationCatalog || []);
    filtered = filtered.filter((item) => {
      const matchesKeyword = !keyword
        || item.name.toLowerCase().includes(keyword)
        || (item.description || '').toLowerCase().includes(keyword)
        || (item.type || '').toLowerCase().includes(keyword)
        || (item.typeLabel || '').toLowerCase().includes(keyword);
      const matchesFloor = !floorFilter || item.floor === floorFilter;
      const matchesType = !typeFilter || item.type === typeFilter;
      return matchesKeyword && matchesFloor && matchesType;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / this.data.pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * this.data.pageSize;
    const paged = filtered.slice(start, start + this.data.pageSize);

    this.setData({
      filteredDestinations: filtered,
      pagedDestinations: paged,
      currentPage: safePage,
      totalPages
    });
  },

  onFloorFilterChange(e) {
    this.setData({
      floorFilterIndex: Number(e.detail.value) || 0
    });
    this.applyDestinationFilters(1);
  },

  onTypeFilterChange(e) {
    this.setData({
      typeFilterIndex: Number(e.detail.value) || 0
    });
    this.applyDestinationFilters(1);
  },

  goPrevPage() {
    this.applyDestinationFilters(this.data.currentPage - 1);
  },

  goNextPage() {
    this.applyDestinationFilters(this.data.currentPage + 1);
  },

  mapNodeToDestination(item) {
    const normalized = normalizeNode(item);
    return {
      id: normalized.nodeId,
      name: normalized.nodeName,
      floor: normalized.floor ? `${normalized.floor}F` : '',
      type: normalized.nodeType || 'NORMAL',
      typeLabel: localizeNodeType(normalized.nodeType),
      nodeCode: normalized.nodeCode,
      nodeType: normalized.nodeType,
      description: item.description || '',
      coordinates: {
        x: normalized.planarX,
        y: normalized.planarY
      }
    };
  },

  mapRecentDestinations(history = []) {
    const recent = [];
    const seen = new Set();

    history.forEach((item) => {
      const key = item?.toId || item?.toName;
      if (!key || seen.has(key)) {
        return;
      }

      seen.add(key);
      recent.push({
        id: item.toId,
        name: item.toName,
        floor: '',
        type: '最近到访',
        typeLabel: '最近到访',
        nodeCode: item.toId ? String(item.toId) : '',
        nodeType: 'RECENT',
        description: '',
        coordinates: null
      });
    });

    return recent.slice(0, 6);
  },

  selectDestination(e) {
    const destination = e.currentTarget.dataset.item;
    this.setData({ selectedDestination: destination });
    app.setDestination(destination);
  },

  async startNavigation() {
    const { currentLocation, selectedDestination } = this.data;

    if (!currentLocation) {
      wx.showToast({
        title: '请先扫码定位',
        icon: 'none'
      });
      return;
    }

    if (!selectedDestination) {
      wx.showToast({
        title: '请选择目的地',
        icon: 'none'
      });
      return;
    }

    app.setDestination(selectedDestination);
    app.updateNavState('NAVIGATING');

    const navRecord = {
      fromId: currentLocation.id,
      fromName: currentLocation.name,
      toId: selectedDestination.id,
      toName: selectedDestination.name,
      timestamp: Date.now()
    };
    app.addNavigationHistory(navRecord);
    try {
      if (app.globalData.userInfo?.id) {
        await createNavigationHistory({
          userId: app.globalData.userInfo?.id,
          startNodeId: currentLocation.id,
          startNodeCode: currentLocation.nodeCode,
          startNodeName: currentLocation.name,
          targetNodeId: selectedDestination.id,
          targetNodeCode: selectedDestination.nodeCode,
          targetNodeName: selectedDestination.name,
          source: 'SCAN',
          status: 'STARTED'
        });
        await this.loadRecentHistory();
      }
    } catch (error) {
      console.warn('Create remote history failed:', error);
    }

    wx.navigateTo({
      url: '/pages/navigation/navigation',
      fail: () => {
        wx.showToast({
          title: '打开导航失败',
          icon: 'none'
        });
      }
    });
  },

  continueNavigation() {
    wx.navigateTo({
      url: '/pages/navigation/navigation',
      fail: () => {
        wx.showToast({
          title: '无法继续导航',
          icon: 'none'
        });
      }
    });
  },

  openMapFromHome() {
    app.setMapViewContext?.({ mode: 'navigation' });
    wx.switchTab({
      url: '/pages/map/map'
    });
  },

  stopNavigation() {
    app.clearNavigationSession?.();
    app.updateNavState('READY');
    this.syncGlobalState();
  },

  async clearHistory() {
    const res = await wx.showModal({
      title: '确认',
      content: '确认清空最近导航记录吗？',
      confirmColor: '#1890ff'
    });

    if (res.confirm) {
      try {
        await setStorage('navigationHistory', []);
        app.globalData.navigationHistory = [];
        this.setData({ navigationHistory: [], recentDestinations: [] });
        wx.showToast({
          title: '已清空',
          icon: 'success'
        });
      } catch (error) {
        console.error('Clear history failed:', error);
      }
    }
  },

  reuseHistory(e) {
    const item = e.currentTarget.dataset.item;
    const destination = {
      id: item.toId,
      name: item.toName,
      nodeCode: item.toId ? String(item.toId) : ''
    };

    this.setData({
      selectedDestination: destination,
      navState: 'READY',
      navStateText: '已定位'
    });

    app.setDestination(destination);
    app.updateNavState('READY');

    wx.showToast({
      title: '已选中目的地',
      icon: 'success'
    });
  },

  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;

    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  }
});
