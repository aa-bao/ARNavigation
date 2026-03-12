// pages/ar/hummingbirdSDK.js
// 蜂鸟云室内定位SDK接口封装

class HummingbirdSDK {
  constructor() {
    // 初始化配置
    this.baseUrl = 'https://api.hummingbird.com/v1';
    this.accessKey = '';
    this.secretKey = '';
    this.timeout = 30000;

    // 定位状态
    this.isInitialized = false;
    this.isLocationing = false;
    this.currentPosition = null;
    this.locationCallbacks = [];

    // 导航状态
    this.isNavigating = false;
    this.path = null;
    this.destination = null;
    this.navigationCallbacks = [];
  }

  // 初始化SDK
  async init(config = {}) {
    try {
      console.log('HummingbirdSDK: 初始化SDK');

      // 保存配置
      this.accessKey = config.accessKey || this.accessKey;
      this.secretKey = config.secretKey || this.secretKey;

      // 验证配置
      if (!this.accessKey || !this.secretKey) {
        throw new Error('缺少访问密钥');
      }

      // 模拟初始化过程
      await this.simulateNetworkRequest(1500);

      this.isInitialized = true;
      console.log('HummingbirdSDK: 初始化成功');
      return true;
    } catch (error) {
      console.error('HummingbirdSDK: 初始化失败:', error);
      return false;
    }
  }

  // 请求定位权限
  async requestLocationPermission() {
    console.log('HummingbirdSDK: 请求定位权限');

    return new Promise((resolve) => {
      wx.getSetting({
        success: (res) => {
          const hasPermission = res.authSetting['scope.userLocation'];

          if (hasPermission === true) {
            resolve({ granted: true });
            return;
          }

          wx.authorize({
            scope: 'scope.userLocation',
            success: () => {
              resolve({ granted: true });
            },
            fail: () => {
              wx.showModal({
                title: '需要定位权限',
                content: 'AR导航需要定位权限，请在设置中开启',
                confirmText: '去设置',
                success: (modalRes) => {
                  if (modalRes.confirm) {
                    wx.openSetting();
                  }
                }
              });
              resolve({ granted: false });
            }
          });
        },
        fail: () => {
          resolve({ granted: false });
        }
      });
    });
  }

  // 获取当前位置信息
  async getCurrentPosition() {
    try {
      console.log('HummingbirdSDK: 获取当前位置');

      await this.simulateNetworkRequest(1000);

      // 模拟返回当前位置
      this.currentPosition = {
        latitude: 31.2304,
        longitude: 121.4737,
        altitude: 0,
        accuracy: 1.5,
        floor: 1,
        timestamp: Date.now(),
        coordinates: {
          x: 100,
          y: 200
        },
        address: '医院大厅'
      };

      return this.currentPosition;
    } catch (error) {
      console.error('HummingbirdSDK: 获取位置失败:', error);
      return null;
    }
  }

  // 开始持续定位
  async startLocationUpdates(callback) {
    try {
      if (this.isLocationing) {
        console.log('HummingbirdSDK: 定位已在运行');
        return;
      }

      this.isLocationing = true;

      if (callback) {
        this.locationCallbacks.push(callback);
      }

      console.log('HummingbirdSDK: 开始持续定位');

      // 模拟定位更新
      while (this.isLocationing) {
        await this.simulateNetworkRequest(2000);

        const deltaX = (Math.random() - 0.5) * 2;
        const deltaY = (Math.random() - 0.5) * 2;

        this.currentPosition = {
          ...this.currentPosition,
          coordinates: {
            x: this.currentPosition.coordinates.x + deltaX,
            y: this.currentPosition.coordinates.y + deltaY
          },
          timestamp: Date.now(),
          accuracy: 1.5 + Math.random() * 0.5
        };

        // 触发位置更新
        this.locationCallbacks.forEach(cb => {
          cb(this.currentPosition);
        });
      }

    } catch (error) {
      console.error('HummingbirdSDK: 定位异常:', error);
    }
  }

  // 停止定位
  stopLocationUpdates() {
    this.isLocationing = false;
    console.log('HummingbirdSDK: 定位已停止');
  }

  // 计算路径
  async calculatePath(startPoint, endPoint) {
    try {
      console.log('HummingbirdSDK: 计算导航路径');

      await this.simulateNetworkRequest(1500);

      // 模拟路径计算
      this.path = {
        start: startPoint,
        end: endPoint,
        distance: 150,
        estimatedTime: 300,
        nodes: [
          {
            id: 'node1',
            coordinates: { x: 100, y: 200 },
            floor: 1,
            instruction: '从当前位置出发'
          },
          {
            id: 'node2',
            coordinates: { x: 120, y: 230 },
            floor: 1,
            instruction: '沿走廊直行'
          },
          {
            id: 'node3',
            coordinates: { x: 140, y: 250 },
            floor: 1,
            instruction: '在电梯厅前左转'
          },
          {
            id: 'node4',
            coordinates: { x: 160, y: 280 },
            floor: 1,
            instruction: '继续直行'
          },
          {
            id: 'node5',
            coordinates: { x: 180, y: 300 },
            floor: 1,
            instruction: '到达目的地'
          }
        ],
        timestamp: Date.now()
      };

      return this.path;
    } catch (error) {
      console.error('HummingbirdSDK: 路径计算失败:', error);
      return null;
    }
  }

  // 开始导航
  async startNavigation(destination) {
    try {
      console.log('HummingbirdSDK: 开始导航');

      this.destination = destination;
      this.isNavigating = true;

      // 计算路径
      const currentPosition = await this.getCurrentPosition();
      const path = await this.calculatePath(
        { coordinates: currentPosition.coordinates },
        { coordinates: destination.coordinates }
      );

      if (!path) {
        throw new Error('路径计算失败');
      }

      // 模拟导航过程
      this.navigationCallbacks.forEach(cb => {
        cb({
          type: 'navigation_started',
          data: path
        });
      });

      return path;
    } catch (error) {
      console.error('HummingbirdSDK: 导航失败:', error);
      return null;
    }
  }

  // 停止导航
  stopNavigation() {
    this.isNavigating = false;
    this.destination = null;
    this.path = null;

    console.log('HummingbirdSDK: 导航已停止');
  }

  // 检查是否到达
  checkArrival() {
    if (!this.currentPosition || !this.destination) {
      return false;
    }

    const distance = Math.sqrt(
      Math.pow(this.currentPosition.coordinates.x - this.destination.coordinates.x, 2) +
      Math.pow(this.currentPosition.coordinates.y - this.destination.coordinates.y, 2)
    );

    const arrived = distance < 5;

    if (arrived && this.isNavigating) {
      this.isNavigating = false;

      this.navigationCallbacks.forEach(cb => {
        cb({
          type: 'arrived',
          data: this.currentPosition
        });
      });
    }

    return arrived;
  }

  // 添加定位回调
  addLocationCallback(callback) {
    if (!this.locationCallbacks.includes(callback)) {
      this.locationCallbacks.push(callback);
    }
  }

  // 移除定位回调
  removeLocationCallback(callback) {
    const index = this.locationCallbacks.indexOf(callback);
    if (index !== -1) {
      this.locationCallbacks.splice(index, 1);
    }
  }

  // 添加导航回调
  addNavigationCallback(callback) {
    if (!this.navigationCallbacks.includes(callback)) {
      this.navigationCallbacks.push(callback);
    }
  }

  // 移除导航回调
  removeNavigationCallback(callback) {
    const index = this.navigationCallbacks.indexOf(callback);
    if (index !== -1) {
      this.navigationCallbacks.splice(index, 1);
    }
  }

  // 模拟网络请求延迟
  simulateNetworkRequest(duration = 1000) {
    return new Promise(resolve => {
      setTimeout(resolve, duration);
    });
  }

  // 获取版本信息
  getVersion() {
    return {
      sdk: '1.0.0',
      api: '1.0',
      platform: 'wechat'
    };
  }
}

// 单例实例
const hummingbirdSDK = new HummingbirdSDK();

// 导出模块
module.exports = {
  HummingbirdSDK,
  hummingbirdSDK
};
