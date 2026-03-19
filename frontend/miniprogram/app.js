import { checkSession, get, resolveAssetUrl } from './utils/request.js';
import { getStorage, setStorage } from './utils/storage.js';

const normalizeUserInfo = (userInfo) => {
  if (!userInfo || typeof userInfo !== 'object') {
    return null;
  }

  return {
    ...userInfo,
    avatarUrl: resolveAssetUrl(userInfo.avatarUrl || userInfo.avatar || ''),
    nickname: userInfo.nickname || userInfo.nickName || ''
  };
};

App({
  globalData: {
    userInfo: null,
    currentLocation: null,
    destination: null,
    navigationSession: null,
    currentNavigationMode: 'compass',
    navigationHistory: [],
    navState: 'UNLOCATED',
    systemInfo: null
  },

  onLaunch() {
    this.initApp();
  },

  async initApp() {
    try {
      this.globalData.systemInfo = wx.getSystemInfoSync();

      const authenticated = await this.isAuthenticated();
      this.globalData.userInfo = authenticated ? (wx.getStorageSync('userInfo') || null) : null;

      await this.loadNavigationHistory();
      await this.checkPermissions();
    } catch (error) {
      console.error('App initialization failed:', error);
    }
  },

  async isAuthenticated() {
    try {
      const sessionValid = await checkSession();
      const token = wx.getStorageSync('token');
      if (!sessionValid || !token) {
        wx.removeStorageSync('token');
        wx.removeStorageSync('userInfo');
        return false;
      }

      const userInfo = await get('/user/info');
      if (!userInfo) {
        wx.removeStorageSync('token');
        wx.removeStorageSync('userInfo');
        return false;
      }

      const normalizedUserInfo = normalizeUserInfo(userInfo);
      this.globalData.userInfo = normalizedUserInfo;
      wx.setStorageSync('userInfo', normalizedUserInfo);
      return true;
    } catch {
      wx.removeStorageSync('token');
      wx.removeStorageSync('userInfo');
      return false;
    }
  },

  async loadNavigationHistory() {
    const history = await getStorage('navigationHistory', []);
    this.globalData.navigationHistory = history;
  },

  async addNavigationHistory(record) {
    const history = this.globalData.navigationHistory;
    history.unshift({ ...record, timestamp: Date.now() });
    if (history.length > 50) {
      history.pop();
    }
    await setStorage('navigationHistory', history);
  },

  async checkPermissions() {
    try {
      const setting = await wx.getSetting();
      if (!setting.authSetting['scope.camera']) {
        console.log('Camera permission not granted');
      }
    } catch (error) {
      console.error('Permission check failed:', error);
    }
  },

  updateNavState(newState) {
    const validStates = ['UNLOCATED', 'READY', 'NAVIGATING', 'ARRIVED'];
    if (validStates.includes(newState)) {
      this.globalData.navState = newState;
      if (this.globalData.onNavStateChange) {
        this.globalData.onNavStateChange(newState);
      }
    }
  },

  setCurrentLocation(location) {
    if (!location) {
      this.globalData.currentLocation = null;
      return;
    }

    this.globalData.currentLocation = {
      ...location,
      id: location.id ?? location.nodeId ?? null,
      nodeId: location.nodeId ?? location.id ?? null,
      nodeCode: location.nodeCode || '',
      name: location.name || location.nodeName || '未命名位置',
      nodeName: location.nodeName || location.name || '未命名位置',
      description: location.description || '',
      coordinates: location.coordinates || (
        location.planarX !== undefined && location.planarY !== undefined
          ? { x: location.planarX, y: location.planarY }
          : null
      )
    };
    if (location) {
      this.updateNavState('READY');
    }
  },

  setDestination(destination) {
    this.globalData.destination = destination;
  },

  setNavigationSession(session) {
    this.globalData.navigationSession = session;
    this.globalData.currentNavigationMode = session?.currentMode || 'compass';
  },

  clearNavigationSession() {
    this.globalData.navigationSession = null;
    this.globalData.currentNavigationMode = 'compass';
  },

  setNavigationMode(mode) {
    this.globalData.currentNavigationMode = mode;
    if (this.globalData.navigationSession) {
      this.globalData.navigationSession = {
        ...this.globalData.navigationSession,
        currentMode: mode
      };
    }
  }
});
