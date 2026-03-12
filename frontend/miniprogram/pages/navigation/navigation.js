// pages/navigation/navigation.js
import { get, post } from '../../utils/request.js';
import { calculateDistance, calculatePlanarDistance, calculatePlanarDirection } from '../../utils/location.js';
import { calculateRelativeDirection } from '../../utils/compass.js';
import { startCompass } from '../../utils/compass.js';

const app = getApp();

Page({
  data: {
    // 导航状态
    isNavigating: true,
    hasArrived: false,

    // 位置信息
    currentLocation: null,
    destination: null,

    // 路径信息
    path: [],
    currentStepIndex: 0,
    totalSteps: 0,

    // 导航指令
    currentInstruction: '',
    nextInstruction: '',
    distanceToNext: 0,
    totalDistance: 0,
    remainingDistance: 0,
    estimatedTime: 0,

    // 方向信息
    deviceDirection: 0,
    targetDirection: 0,
    relativeAngle: 0,
    directionText: '',

    // 格式化后的方向值（用于显示）
    deviceDirectionDisplay: 0,
    targetDirectionDisplay: 0,

    // 指南针
    compassStopFunction: null,

    // 语音播报
    voiceEnabled: true,

    // AR模式
    arModeAvailable: true
  },

  onLoad(options) {
    console.log('Navigation page loaded');
    this.initNavigation();
  },

  onShow() {
    // 页面显示时恢复导航
    if (this.data.isNavigating) {
      this.startCompass();
    }
  },

  onHide() {
    // 页面隐藏时暂停指南针
    this.stopCompass();
  },

  onReady() {
    // 页面准备完成
  },

  onUnload() {
    // 页面卸载，清理资源
    this.stopCompass();
    app.updateNavState('READY');
  },

  // 初始化导航
  async initNavigation() {
    const globalData = app.globalData;

    if (!globalData.currentLocation || !globalData.destination) {
      wx.showToast({
        title: '导航信息不完整',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    this.setData({
      currentLocation: globalData.currentLocation,
      destination: globalData.destination,
      isNavigating: true
    });

    // 获取路径规划
    await this.fetchPath();

    // 启动指南针
    this.startCompass();

    // 室内导航不需要GPS实时定位，使用路径节点坐标即可
    // 如果需要可以在后台运行 GPS，但主要用于室内坐标计算距离
    // this.startLocationUpdate();
  },

  // 获取路径规划
  async fetchPath() {
    try {
      const { currentLocation, destination } = this.data;

      wx.showLoading({ title: '规划路径中...' });

      // 调用后端路径规划接口
      const pathData = await post('/navigation/plan', {
        startNodeId: currentLocation.id,
        endNodeId: destination.id
      });

      // 转换节点坐标格式：后端返回的是室内相对坐标 xCoordinate/yCoordinate
      // 存储为 coordinates.x / coordinates.y 供室内距离计算使用
      const nodes = pathData.pathNodes.map(node => ({
        id: node.nodeId,
        name: node.nodeName,
        floor: node.floor,
        instruction: node.description || '继续前行',
        coordinates: {
          x: node.xCoordinate,
          y: node.yCoordinate
        }
      }));

      // 使用后端返回的总距离（单位：米），这是基于边的实际距离
      const totalDistance = pathData.distance || 0;
      // estimatedTime 单位是秒，转换为分钟
      const estimatedTime = pathData.estimatedTime ? Math.ceil(pathData.estimatedTime / 60) : Math.ceil(totalDistance / 80);

      this.setData({
        path: nodes,
        currentStepIndex: 0,
        totalSteps: nodes.length,
        totalDistance: Math.round(totalDistance),
        remainingDistance: Math.round(totalDistance),
        estimatedTime,
        currentInstruction: nodes[0]?.instruction || '开始导航',
        nextInstruction: nodes[1]?.instruction || '即将到达'
      });

    } catch (error) {
      console.error('Fetch path failed:', error);

      // 使用模拟路径数据
      this.useMockPath();
    } finally {
      wx.hideLoading();
    }
  },

  // 使用模拟路径
  useMockPath() {
    const mockPath = [
      { id: '1', name: '当前位置', instruction: '从当前位置出发', coordinates: { lat: 39.9042, lng: 116.4074 } },
      { id: '2', name: '走廊交叉口', instruction: '沿走廊直行50米', coordinates: { lat: 39.9043, lng: 116.4075 } },
      { id: '3', name: '电梯厅', instruction: '乘电梯至3楼', coordinates: { lat: 39.9044, lng: 116.4076 } },
      { id: '4', name: '目的地', instruction: '到达目的地', coordinates: { lat: 39.9045, lng: 116.4077 } }
    ];

    this.setData({
      path: mockPath,
      currentStepIndex: 0,
      totalSteps: mockPath.length,
      totalDistance: 150,
      remainingDistance: 150,
      estimatedTime: 3,
      currentInstruction: mockPath[0].instruction,
      nextInstruction: mockPath[1]?.instruction || '即将到达'
    });
  },

  // 启动指南针
  startCompass() {
    if (this.data.compassStopFunction) {
      return;
    }

    const stopCompass = startCompass((data) => {
      this.handleCompassData(data);
    });

    this.setData({ compassStopFunction: stopCompass });
  },

  // 停止指南针
  stopCompass() {
    if (this.data.compassStopFunction) {
      this.data.compassStopFunction();
      this.setData({ compassStopFunction: null });
    }
  },

  // 处理指南针数据
  handleCompassData(data) {
    const { destination, path, currentStepIndex } = this.data;

    if (!destination || path.length === 0) {
      return;
    }

    // 使用路径节点坐标计算方向（室内导航）
    const currentNode = path[currentStepIndex];
    const targetNode = path[currentStepIndex + 1] || destination;

    if (!currentNode || !targetNode) {
      return;
    }

    // 使用平面坐标计算目标方向（室内导航）
    const targetDirection = calculatePlanarDirection(
      currentNode.coordinates?.x || 0,
      currentNode.coordinates?.y || 0,
      targetNode.coordinates?.x || 0,
      targetNode.coordinates?.y || 0
    );

    // 计算相对方向
    const relativeInfo = calculateRelativeDirection(data.direction, targetDirection);

    this.setData({
      deviceDirection: data.direction,
      targetDirection,
      relativeAngle: relativeInfo.relativeAngle,
      directionText: relativeInfo.direction,
      deviceDirectionDisplay: Math.round(data.direction),
      targetDirectionDisplay: Math.round(targetDirection)
    });
  },

  // 开始位置更新
  startLocationUpdate() {
    // 监听位置变化
    wx.startLocationUpdate({
      type: 'gcj02',
      success: () => {
        wx.onLocationChange((res) => {
          this.handleLocationUpdate(res);
        });
      },
      fail: (err) => {
        console.error('Start location update failed:', err);
      }
    });
  },

  // 处理位置更新
  handleLocationUpdate(location) {
    // 更新当前位置
    const currentLocation = {
      ...this.data.currentLocation,
      coordinates: {
        lat: location.latitude,
        lng: location.longitude
      }
    };

    this.setData({ currentLocation });

    // 检查是否到达节点
    this.checkArrivalAtNode();
  },

  // 检查是否到达节点（室内导航）
  checkArrivalAtNode() {
    const { path, currentStepIndex } = this.data;

    if (currentStepIndex >= path.length - 1) {
      // 已到达终点
      this.handleArrival();
      return;
    }

    // 室内导航根据当前节点和下一节点的距离来判断
    const currentNode = path[currentStepIndex];
    const nextNode = path[currentStepIndex + 1];

    if (!currentNode || !nextNode) {
      return;
    }

    // 使用平面距离计算（室内坐标）
    const distance = calculatePlanarDistance(
      currentNode.coordinates?.x || 0,
      currentNode.coordinates?.y || 0,
      nextNode.coordinates?.x || 0,
      nextNode.coordinates?.y || 0
    );

    // 如果距离小于阈值（比如3米），认为到达节点
    if (distance < 3) {
      this.advanceToNextStep();
    }
    // 注意：室内导航不实时更新剩余距离，因为用户是沿着路径走的
  },

  // 计算剩余距离（室内导航使用平面坐标）
  calculateRemainingDistance() {
    const { path, currentStepIndex, currentLocation } = this.data;
    let totalDistance = 0;

    // 使用当前路径节点（而不是GPS位置）计算剩余距离
    const currentNode = path[currentStepIndex];

    // 到下一节点的距离
    if (currentStepIndex < path.length - 1 && currentNode) {
      const nextNode = path[currentStepIndex + 1];
      totalDistance += calculatePlanarDistance(
        currentNode.coordinates?.x || 0,
        currentNode.coordinates?.y || 0,
        nextNode.coordinates?.x || 0,
        nextNode.coordinates?.y || 0
      );
    }

    // 剩余节点的距离（使用节点间的实际距离）
    for (let i = currentStepIndex + 1; i < path.length - 1; i++) {
      const node1 = path[i];
      const node2 = path[i + 1];
      if (node1 && node2) {
        totalDistance += calculatePlanarDistance(
          node1.coordinates?.x || 0,
          node1.coordinates?.y || 0,
          node2.coordinates?.x || 0,
          node2.coordinates?.y || 0
        );
      }
    }

    return Math.round(totalDistance);
  },

  // 进入下一步
  advanceToNextStep() {
    const { path, currentStepIndex } = this.data;
    const nextStepIndex = currentStepIndex + 1;

    if (nextStepIndex >= path.length) {
      this.handleArrival();
      return;
    }

    this.setData({
      currentStepIndex: nextStepIndex,
      currentInstruction: path[nextStepIndex]?.instruction || '继续前行',
      nextInstruction: path[nextStepIndex + 1]?.instruction || '即将到达'
    });

    // 播报导航指令
    if (this.data.voiceEnabled) {
      this.speakInstruction(this.data.currentInstruction);
    }
  },

  // 处理到达终点
  handleArrival() {
    this.setData({
      isNavigating: false,
      hasArrived: true
    });

    app.updateNavState('ARRIVED');

    // 播报到达信息
    if (this.data.voiceEnabled) {
      this.speakInstruction(`已到达目的地：${this.data.destination.name}`);
    }

    wx.showModal({
      title: '到达目的地',
      content: `您已到达${this.data.destination.name}`,
      showCancel: false,
      confirmText: '确定',
      success: () => {
        // 返回首页
        wx.navigateBack();
      }
    });
  },

  // 语音播报
  speakInstruction(text) {
    // 检查是否开启语音播报
    if (!this.data.voiceEnabled) {
      return;
    }

    // 直接记录日志，避免调用不存在的API
    console.log('Voice instruction:', text);

    // 可以在这里集成第三方语音合成服务
  },

  // 切换语音播报
  toggleVoice() {
    this.setData({
      voiceEnabled: !this.data.voiceEnabled
    });

    wx.showToast({
      title: this.data.voiceEnabled ? '语音播报已开启' : '语音播报已关闭',
      icon: 'none'
    });
  },

  // 进入AR模式
  enterARMode() {
    if (!this.data.arModeAvailable) {
      wx.showToast({
        title: 'AR功能暂不可用',
        icon: 'none'
      });
      return;
    }

    wx.navigateTo({
      url: '/pages/ar/ar',
      success: () => {
        console.log('Entered AR mode');
      },
      fail: (err) => {
        console.error('Enter AR mode failed:', err);
        wx.showToast({
          title: '进入AR模式失败',
          icon: 'none'
        });
      }
    });
  },

  // 暂停/继续导航
  toggleNavigation() {
    const isNavigating = !this.data.isNavigating;
    this.setData({ isNavigating });

    if (isNavigating) {
      this.startCompass();
      wx.showToast({
        title: '导航继续',
        icon: 'none'
      });
    } else {
      this.stopCompass();
      wx.showToast({
        title: '导航暂停',
        icon: 'none'
      });
    }
  },

  // 结束导航
  endNavigation() {
    wx.showModal({
      title: '结束导航',
      content: '确定要结束当前导航吗？',
      confirmColor: '#f5222d',
      success: (res) => {
        if (res.confirm) {
          // 停止导航
          this.stopCompass();
          wx.stopLocationUpdate();

          // 更新状态
          app.updateNavState('READY');
          app.setDestination(null);

          // 返回首页
          wx.navigateBack();
        }
      }
    });
  },

  // 查看地图
  viewMap() {
    // 可以在这里集成地图组件或跳转地图页面
    wx.showToast({
      title: '地图功能开发中',
      icon: 'none'
    });
  },

  // 分享路径
  sharePath() {
    // 实现分享功能
  },

  // 扫描二维码
  scanQRCode() {
    wx.scanCode({
      success: (res) => {
        console.log('Scan result:', res);
        this.handleScanResult(res.result);
      },
      fail: (err) => {
        console.error('Scan failed:', err);
        wx.showToast({
          title: '扫描失败',
          icon: 'none'
        });
      }
    });
  },

  // 处理扫描结果
  async handleScanResult(result) {
    try {
      wx.showLoading({ title: '处理中...' });

      // 解析扫描结果，假设二维码包含位置信息
      // 格式可能是: location:node123 或 JSON 格式
      let locationId;

      if (result.startsWith('location:')) {
        locationId = result.replace('location:', '');
      } else {
        // 尝试解析 JSON
        try {
          const data = JSON.parse(result);
          locationId = data.locationId || data.id || data.nodeId;
        } catch (e) {
          // 如果不是 JSON，直接使用整个结果作为 ID
          locationId = result;
        }
      }

      if (!locationId) {
        wx.hideLoading();
        wx.showToast({
          title: '无效的二维码',
          icon: 'none'
        });
        return;
      }

      // 获取位置信息
      const locationData = await get(`/location/${locationId}`);

      if (!locationData) {
        wx.hideLoading();
        wx.showToast({
          title: '位置不存在',
          icon: 'none'
        });
        return;
      }

      // 更新当前位置
      const currentLocation = {
        id: locationData.id,
        name: locationData.name,
        coordinates: {
          x: locationData.xCoordinate,
          y: locationData.yCoordinate
        }
      };

      this.setData({ currentLocation });
      app.globalData.currentLocation = currentLocation;

      // 检查当前位置在路径中的位置
      this.checkAndUpdatePathPosition(locationData.id);

      wx.hideLoading();
      wx.showToast({
        title: `已到达: ${locationData.name}`,
        icon: 'success'
      });
    } catch (error) {
      console.error('Handle scan result failed:', error);
      wx.hideLoading();
      wx.showToast({
        title: '处理失败',
        icon: 'none'
      });
    }
  },

  // 检查并更新路径位置
  checkAndUpdatePathPosition(scannedLocationId) {
    const { path, currentStepIndex } = this.data;

    // 查找扫描到的位置在路径中的索引
    const scannedIndex = path.findIndex(node => node.id === scannedLocationId);

    if (scannedIndex === -1) {
      // 扫描的位置不在路径中
      console.log('Scanned location not in path');
      return;
    }

    if (scannedIndex < currentStepIndex) {
      // 扫描的位置是已走过的节点
      console.log('Scanned location is already passed');
      return;
    }

    if (scannedIndex === currentStepIndex) {
      // 扫描的位置就是当前节点，不需要做什么
      console.log('Already at this location');
      return;
    }

    // 更新到扫描到的位置
    const newStepIndex = scannedIndex;
    const isFinalDestination = newStepIndex >= path.length - 1;

    if (isFinalDestination) {
      // 到达最终目的地
      this.handleArrival();
      return;
    }

    // 计算剩余距离
    let remainingDistance = 0;
    for (let i = newStepIndex; i < path.length - 1; i++) {
      const node1 = path[i];
      const node2 = path[i + 1];
      remainingDistance += calculatePlanarDistance(
        node1.coordinates?.x || 0,
        node1.coordinates?.y || 0,
        node2.coordinates?.x || 0,
        node2.coordinates?.y || 0
      );
    }

    this.setData({
      currentStepIndex: newStepIndex,
      remainingDistance: Math.round(remainingDistance),
      currentInstruction: path[newStepIndex]?.instruction || '继续前行',
      nextInstruction: path[newStepIndex + 1]?.instruction || '即将到达'
    });

    // 播报导航指令
    if (this.data.voiceEnabled) {
      this.speakInstruction(this.data.currentInstruction);
    }
  },

  // 用户点击右上角分享
  onShareAppMessage() {
    const { currentLocation, destination } = this.data;
    return {
      title: `从${currentLocation?.name}到${destination?.name}的导航`,
      path: `/pages/index/index?from=${currentLocation?.id}&to=${destination?.id}`,
      imageUrl: '/images/share-nav.png'
    };
  }
});
