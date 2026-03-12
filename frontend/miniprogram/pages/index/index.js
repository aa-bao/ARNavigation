// pages/index/index.js
import { get, post } from '../../utils/request.js';
import { getStorage, setStorage } from '../../utils/storage.js';
import { calculateDistance } from '../../utils/location.js';

const app = getApp();

Page({
  data: {
    // 导航状态
    navState: 'UNLOCATED', // UNLOCATED, READY, NAVIGATING, ARRIVED
    navStateText: '未定位',

    // 当前位置
    currentLocation: null,

    // 搜索相关
    searchKeyword: '',
    searchResults: [],
    searchDebounceTimer: null,

    // 常用目的地
    commonDestinations: [
      { id: '1', name: '急诊科', floor: '1F', icon: '/images/emergency.png', type: 'department' },
      { id: '2', name: '门诊部', floor: '1F', icon: '/images/outpatient.png', type: 'department' },
      { id: '3', name: '药房', floor: '1F', icon: '/images/pharmacy.png', type: 'facility' },
      { id: '4', name: 'CT室', floor: 'B1', icon: '/images/ct.png', type: 'facility' },
      { id: '5', name: '住院部', floor: '2F', icon: '/images/inpatient.png', type: 'department' },
      { id: '6', name: '收费处', floor: '1F', icon: '/images/cashier.png', type: 'facility' }
    ],

    // 已选目的地
    selectedDestination: null,

    // 导航历史
    navigationHistory: []
  },

  onLoad(options) {
    console.log('Index page loaded');
    this.loadData();
  },

  onShow() {
    // 同步全局状态
    this.syncGlobalState();
  },

  onReady() {
    // 页面准备完成
  },

  onHide() {
    // 清除搜索防抖
    if (this.data.searchDebounceTimer) {
      clearTimeout(this.data.searchDebounceTimer);
    }
  },

  onUnload() {
    // 页面卸载
  },

  // 同步全局状态
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

  // 获取状态文字
  getNavStateText(state) {
    const stateMap = {
      'UNLOCATED': '未定位',
      'READY': '已定位',
      'NAVIGATING': '导航中',
      'ARRIVED': '已到达'
    };
    return stateMap[state] || '未知';
  },

  // 加载数据
  async loadData() {
    try {
      // 加载导航历史
      const history = await getStorage('navigationHistory', []);
      this.setData({ navigationHistory: history });

      // 如果有当前位置，更新状态
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

  // 扫码处理
  handleScan() {
    wx.scanCode({
      scanType: ['qrCode'],
      success: (res) => {
        console.log('Scan result:', res);
        this.processQRCode(res.result);
      },
      fail: (err) => {
        console.error('Scan failed:', err);
        if (err.errMsg !== 'scanCode:fail cancel') {
          wx.showToast({
            title: '扫码失败',
            icon: 'none'
          });
        }
      }
    });
  },

  // 处理二维码
  async processQRCode(result) {
    try {
      wx.showLoading({ title: '定位中...' });

      // 解析二维码内容
      let locationData;
      try {
        locationData = JSON.parse(result);
      } catch {
        // 如果不是JSON，尝试作为位置ID处理
        locationData = { id: result };
      }

      // 调用后端API获取位置详情（支持 nodeCode 或 id 字段）
      const locationId = locationData.nodeCode || locationData.id;
      if (!locationId) {
        throw new Error('无效的二维码内容');
      }
      // 调用后端 /api/navigation/node/code/{nodeCode} 接口
      const response = await get(`/navigation/node/code/${locationId}`);
      // 后端返回的是列表，取第一个元素
      const locationInfo = Array.isArray(response) ? response[0] : response;

      // 更新当前位置（映射后端字段到前端格式）
      const currentLocation = {
        id: locationInfo.id,
        name: locationInfo.nodeName, // 后端是 nodeName，前端需要 name
        description: locationInfo.description,
        floor: locationInfo.floor ? `${locationInfo.floor}F` : '', // 转换为字符串格式如 "1F"
        type: locationInfo.nodeType, // 后端是 nodeType，前端需要 type
        tags: locationInfo.tags,
        coordinates: locationInfo.xCoordinate && locationInfo.yCoordinate ? {
          lat: locationInfo.yCoordinate, // 假设 yCoordinate 对应纬度
          lng: locationInfo.xCoordinate  // 假设 xCoordinate 对应经度
        } : null
      };

      // 更新全局状态
      app.setCurrentLocation(currentLocation);

      // 更新页面数据
      this.setData({
        currentLocation,
        navState: 'READY',
        navStateText: '已定位'
      });

      wx.showToast({
        title: '定位成功',
        icon: 'success'
      });

    } catch (error) {
      console.error('Process QR code failed:', error);
      wx.showToast({
        title: '定位失败，请重试',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 重新扫码
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
    this.handleScan();
  },

  // 搜索输入处理
  onSearchInput(e) {
    const keyword = e.detail.value;
    this.setData({ searchKeyword: keyword });

    // 防抖处理
    if (this.data.searchDebounceTimer) {
      clearTimeout(this.data.searchDebounceTimer);
    }

    this.data.searchDebounceTimer = setTimeout(() => {
      this.performSearch(keyword);
    }, 300);
  },

  // 搜索确认
  onSearchConfirm(e) {
    const keyword = e.detail.value;
    this.performSearch(keyword);
  },

  // 清除搜索
  clearSearch() {
    this.setData({
      searchKeyword: '',
      searchResults: []
    });
  },

  // 执行搜索
  async performSearch(keyword) {
    if (!keyword.trim()) {
      this.setData({ searchResults: [] });
      return;
    }

    try {
      // 调用后端搜索API
      const results = await get('/location/search', {
        keyword: keyword.trim(),
        limit: 10
      });

      // 映射后端返回的数据到小程序期望的格式
      const mappedResults = results.map(item => ({
        id: item.id,
        name: item.nodeName, // 后端是 nodeName，小程序需要 name
        floor: item.floor ? `${item.floor}F` : '', // 转换为字符串格式如 "1F"
        type: item.nodeType || '未知', // 后端是 nodeType，小程序需要 type
        nodeCode: item.nodeCode,
        nodeType: item.nodeType,
        description: item.description,
        coordinates: item.xCoordinate && item.yCoordinate ? {
          lat: item.yCoordinate, // 假设 yCoordinate 对应纬度
          lng: item.xCoordinate  // 假设 xCoordinate 对应经度
        } : null
      }));

      // 如果有当前位置，计算距离
      if (this.data.currentLocation && this.data.currentLocation.coordinates) {
        mappedResults.forEach(item => {
          if (item.coordinates) {
            item.distance = Math.round(calculateDistance(
              this.data.currentLocation.coordinates.lat,
              this.data.currentLocation.coordinates.lng,
              item.coordinates.lat,
              item.coordinates.lng
            ));
          }
        });

        // 按距离排序
        mappedResults.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
      }

      this.setData({ searchResults: mappedResults });
    } catch (error) {
      console.error('Search failed:', error);
      // 使用本地数据作为备用
      this.performLocalSearch(keyword);
    }
  },

  // 本地搜索（备用）
  performLocalSearch(keyword) {
    const lowerKeyword = keyword.toLowerCase();
    const results = this.data.commonDestinations.filter(item =>
      item.name.toLowerCase().includes(lowerKeyword) ||
      item.floor.toLowerCase().includes(lowerKeyword)
    );
    this.setData({ searchResults: results });
  },

  // 选择目的地
  selectDestination(e) {
    const destination = e.currentTarget.dataset.item;
    this.setData({ selectedDestination: destination });
    app.setDestination(destination);
  },

  // 开始导航
  startNavigation() {
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

    // 更新导航状态
    app.updateNavState('NAVIGATING');

    // 添加到导航历史
    const navRecord = {
      fromId: currentLocation.id,
      fromName: currentLocation.name,
      toId: selectedDestination.id,
      toName: selectedDestination.name,
      timestamp: Date.now()
    };
    app.addNavigationHistory(navRecord);

    // 跳转到导航页面
    wx.navigateTo({
      url: '/pages/navigation/navigation',
      success: () => {
        console.log('Navigation started');
      },
      fail: (err) => {
        console.error('Navigate to navigation page failed:', err);
        wx.showToast({
          title: '跳转失败',
          icon: 'none'
        });
      }
    });
  },

  // 清除历史记录
  async clearHistory() {
    const res = await wx.showModal({
      title: '确认清除',
      content: '确定要清除所有导航历史吗？',
      confirmColor: '#1890ff'
    });

    if (res.confirm) {
      try {
        await setStorage('navigationHistory', []);
        app.globalData.navigationHistory = [];
        this.setData({ navigationHistory: [] });
        wx.showToast({
          title: '已清除',
          icon: 'success'
        });
      } catch (error) {
        console.error('Clear history failed:', error);
      }
    }
  },

  // 重用历史记录
  reuseHistory(e) {
    const item = e.currentTarget.dataset.item;

    // 设置目的地
    const destination = {
      id: item.toId,
      name: item.toName
    };

    this.setData({
      selectedDestination: destination,
      navState: 'READY',
      navStateText: '已定位'
    });

    app.setDestination(destination);
    app.updateNavState('READY');

    wx.showToast({
      title: '已选择目的地',
      icon: 'success'
    });
  },

  // 格式化时间
  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    // 小于1分钟
    if (diff < 60000) {
      return '刚刚';
    }
    // 小于1小时
    if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}分钟前`;
    }
    // 小于24小时
    if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}小时前`;
    }
    // 其他情况显示日期
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  }
});
