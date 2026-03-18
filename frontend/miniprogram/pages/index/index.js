// pages/index/index.js
import { get } from '../../utils/request.js';
import { getStorage, setStorage } from '../../utils/storage.js';
import { calculateDistance } from '../../utils/location.js';

const app = getApp();

Page({
  data: {
    navState: 'UNLOCATED', // UNLOCATED, READY, NAVIGATING, ARRIVED
    navStateText: 'Not Located',
    currentLocation: null,
    searchKeyword: '',
    searchResults: [],
    searchDebounceTimer: null,
    commonDestinations: [
      { id: '1', name: 'Emergency', floor: '1F', icon: '/images/emergency.png', type: 'department' },
      { id: '2', name: 'Outpatient', floor: '1F', icon: '/images/outpatient.png', type: 'department' },
      { id: '3', name: 'Pharmacy', floor: '1F', icon: '/images/pharmacy.png', type: 'facility' },
      { id: '4', name: 'CT Room', floor: 'B1', icon: '/images/ct.png', type: 'facility' },
      { id: '5', name: 'Inpatient', floor: '2F', icon: '/images/inpatient.png', type: 'department' },
      { id: '6', name: 'Cashier', floor: '1F', icon: '/images/cashier.png', type: 'facility' }
    ],
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
    this.setData({
      navState: globalData.navState,
      navStateText: this.getNavStateText(globalData.navState),
      currentLocation: globalData.currentLocation,
      selectedDestination: globalData.destination,
      navigationHistory: globalData.navigationHistory
    });
  },

  getNavStateText(state) {
    const stateMap = {
      UNLOCATED: 'Not Located',
      READY: 'Located',
      NAVIGATING: 'Navigating',
      ARRIVED: 'Arrived'
    };
    return stateMap[state] || 'Unknown';
  },

  async loadData() {
    try {
      const history = await getStorage('navigationHistory', []);
      this.setData({ navigationHistory: history });

      const currentLocation = app.globalData.currentLocation;
      if (currentLocation) {
        this.setData({
          currentLocation,
          navState: 'READY',
          navStateText: 'Located'
        });
      }
    } catch (error) {
      console.error('Load data failed:', error);
    }
  },

  async handleScan() {
    const canScan = await this.ensureLoginBeforeScan();
    if (!canScan) return;

    wx.scanCode({
      scanType: ['qrCode'],
      success: (res) => {
        this.processQRCode(res.result);
      },
      fail: (err) => {
        if (err.errMsg !== 'scanCode:fail cancel') {
          wx.showToast({
            title: 'Scan failed',
            icon: 'none'
          });
        }
      }
    });
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
      wx.showLoading({ title: 'Locating...' });

      let locationData;
      try {
        locationData = JSON.parse(result);
      } catch {
        locationData = { id: result };
      }

      const locationId = locationData.nodeCode || locationData.id;
      if (!locationId) {
        throw new Error('Invalid QR content');
      }

      const response = await get(`/navigation/node/code/${locationId}`);
      const locationInfo = Array.isArray(response) ? response[0] : response;

      const currentLocation = {
        id: locationInfo.id,
        name: locationInfo.nodeName,
        description: locationInfo.description,
        floor: locationInfo.floor ? `${locationInfo.floor}F` : '',
        type: locationInfo.nodeType,
        tags: locationInfo.tags,
        coordinates:
          locationInfo.xCoordinate && locationInfo.yCoordinate
            ? {
                lat: locationInfo.yCoordinate,
                lng: locationInfo.xCoordinate
              }
            : null
      };

      app.setCurrentLocation(currentLocation);

      this.setData({
        currentLocation,
        navState: 'READY',
        navStateText: 'Located'
      });

      wx.showToast({
        title: 'Located',
        icon: 'success'
      });
    } catch (error) {
      console.error('Process QR code failed:', error);
      wx.showToast({
        title: 'Locate failed',
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
      navStateText: 'Not Located'
    });
    app.updateNavState('UNLOCATED');
    app.setCurrentLocation(null);
    app.setDestination(null);
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
  },

  async performSearch(keyword) {
    if (!keyword.trim()) {
      this.setData({ searchResults: [] });
      return;
    }

    try {
      const results = await get('/location/search', {
        keyword: keyword.trim(),
        limit: 10
      });

      const mappedResults = results.map((item) => ({
        id: item.id,
        name: item.nodeName,
        floor: item.floor ? `${item.floor}F` : '',
        type: item.nodeType || 'Unknown',
        nodeCode: item.nodeCode,
        nodeType: item.nodeType,
        description: item.description,
        coordinates:
          item.xCoordinate && item.yCoordinate
            ? {
                lat: item.yCoordinate,
                lng: item.xCoordinate
              }
            : null
      }));

      if (this.data.currentLocation && this.data.currentLocation.coordinates) {
        mappedResults.forEach((item) => {
          if (item.coordinates) {
            item.distance = Math.round(
              calculateDistance(
                this.data.currentLocation.coordinates.lat,
                this.data.currentLocation.coordinates.lng,
                item.coordinates.lat,
                item.coordinates.lng
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
    const results = this.data.commonDestinations.filter(
      (item) =>
        item.name.toLowerCase().includes(lowerKeyword) || item.floor.toLowerCase().includes(lowerKeyword)
    );
    this.setData({ searchResults: results });
  },

  selectDestination(e) {
    const destination = e.currentTarget.dataset.item;
    this.setData({ selectedDestination: destination });
    app.setDestination(destination);
  },

  startNavigation() {
    const { currentLocation, selectedDestination } = this.data;

    if (!currentLocation) {
      wx.showToast({
        title: 'Please scan first',
        icon: 'none'
      });
      return;
    }

    if (!selectedDestination) {
      wx.showToast({
        title: 'Choose destination',
        icon: 'none'
      });
      return;
    }

    app.updateNavState('NAVIGATING');

    const navRecord = {
      fromId: currentLocation.id,
      fromName: currentLocation.name,
      toId: selectedDestination.id,
      toName: selectedDestination.name,
      timestamp: Date.now()
    };
    app.addNavigationHistory(navRecord);

    wx.navigateTo({
      url: '/pages/navigation/navigation',
      fail: () => {
        wx.showToast({
          title: 'Navigation open failed',
          icon: 'none'
        });
      }
    });
  },

  async clearHistory() {
    const res = await wx.showModal({
      title: 'Confirm',
      content: 'Clear all navigation history?',
      confirmColor: '#1890ff'
    });

    if (res.confirm) {
      try {
        await setStorage('navigationHistory', []);
        app.globalData.navigationHistory = [];
        this.setData({ navigationHistory: [] });
        wx.showToast({
          title: 'Cleared',
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
      name: item.toName
    };

    this.setData({
      selectedDestination: destination,
      navState: 'READY',
      navStateText: 'Located'
    });

    app.setDestination(destination);
    app.updateNavState('READY');

    wx.showToast({
      title: 'Destination selected',
      icon: 'success'
    });
  },

  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
  }
});
