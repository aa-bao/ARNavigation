import { checkSession } from './utils/request.js';
import { getStorage, setStorage } from './utils/storage.js';

App({
  globalData: {
    userInfo: null,
    currentLocation: null,
    destination: null,
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
      const authenticated = await checkSession();
      if (!authenticated) {
        wx.removeStorageSync('token');
        wx.removeStorageSync('userInfo');
      }
      return authenticated;
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
      if (!setting.authSetting['scope.userLocation']) {
        console.log('Location permission not granted');
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
    this.globalData.currentLocation = location;
    if (location) {
      this.updateNavState('READY');
    }
  },

  setDestination(destination) {
    this.globalData.destination = destination;
  }
});
