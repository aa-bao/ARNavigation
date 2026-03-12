import { checkSession, login } from './utils/request.js';
import { getStorage, setStorage } from './utils/storage.js';

App({
  globalData: {
    userInfo: null,
    currentLocation: null,
    destination: null,
    navigationHistory: [],
    navState: 'UNLOCATED', // UNLOCATED, READY, NAVIGATING, ARRIVED
    systemInfo: null
  },

  onLaunch() {
    console.log('App Launch');
    this.initApp();
  },

  onShow() {
    console.log('App Show');
  },

  onHide() {
    console.log('App Hide');
  },

  onError(msg) {
    console.error('App Error:', msg);
  },

  async initApp() {
    try {
      // 获取系统信息
      const systemInfo = wx.getSystemInfoSync();
      this.globalData.systemInfo = systemInfo;
      console.log('System Info:', systemInfo);

      // 检查登录状态
      const isLoggedIn = await this.checkLoginStatus();
      if (!isLoggedIn) {
        await this.handleLogin();
      }

      // 加载导航历史
      await this.loadNavigationHistory();

      // 检查权限
      await this.checkPermissions();

    } catch (error) {
      console.error('App initialization failed:', error);
    }
  },

  async checkLoginStatus() {
    try {
      const res = await checkSession();
      return res;
    } catch {
      return false;
    }
  },

  async handleLogin() {
    try {
      const loginRes = await login();
      if (loginRes && loginRes.userInfo) {
        this.globalData.userInfo = loginRes.userInfo;
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  },

  async loadNavigationHistory() {
    try {
      const history = await getStorage('navigationHistory', []);
      this.globalData.navigationHistory = history;
    } catch (error) {
      console.error('Failed to load navigation history:', error);
    }
  },

  async addNavigationHistory(record) {
    try {
      const history = this.globalData.navigationHistory;
      history.unshift({
        ...record,
        timestamp: Date.now()
      });
      // 只保留最近50条记录
      if (history.length > 50) {
        history.pop();
      }
      await setStorage('navigationHistory', history);
    } catch (error) {
      console.error('Failed to add navigation history:', error);
    }
  },

  async checkPermissions() {
    try {
      // 检查相机权限（AR功能需要）
      const cameraSetting = await wx.getSetting();
      if (!cameraSetting.authSetting['scope.camera']) {
        console.log('Camera permission not granted');
      }

      // 检查位置权限
      if (!cameraSetting.authSetting['scope.userLocation']) {
        console.log('Location permission not granted');
      }
    } catch (error) {
      console.error('Permission check failed:', error);
    }
  },

  // 更新导航状态
  updateNavState(newState) {
    const validStates = ['UNLOCATED', 'READY', 'NAVIGATING', 'ARRIVED'];
    if (validStates.includes(newState)) {
      this.globalData.navState = newState;
      // 触发全局状态更新事件
      if (this.globalData.onNavStateChange) {
        this.globalData.onNavStateChange(newState);
      }
    }
  },

  // 设置当前位置
  setCurrentLocation(location) {
    this.globalData.currentLocation = location;
    if (location) {
      this.updateNavState('READY');
    }
  },

  // 设置目的地
  setDestination(destination) {
    this.globalData.destination = destination;
  }
});
