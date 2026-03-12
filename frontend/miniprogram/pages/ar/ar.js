// pages/ar/ar.js
import { startCompass, calculateRelativeDirection } from '../../utils/compass.js';
import { calculatePlanarDistance, calculatePlanarDirection } from '../../utils/location.js';
import { post } from '../../utils/request.js';
import { hummingbirdSDK } from '../../utils/hummingbird/HummingbirdSDK.js';

const app = getApp();

Page({
  data: {
    // AR状态
    isARReady: false,
    hasCameraPermission: false,
    xrSceneReady: false,

    // 位置信息
    currentLocation: null,
    destination: null,

    // 方向信息
    deviceDirection: 0,
    targetDirection: 0,
    relativeAngle: 0,
    directionText: '',

    // 3D箭头控制
    arrowVisible: true,
    arrowRotation: 0, // 平面旋转角度（度）
    arrowScale: 1,
    arrowOpacity: 1,

    // 距离信息
    distance: 0,
    remainingDistance: 0,
    instruction: '',

    // 路径信息
    path: [],
    currentStepIndex: 0,
    totalSteps: 0,
    estimatedTime: 0,

    // 导航状态
    isNavigating: true,
    hasArrived: false,

    // 语音播报
    voiceEnabled: true,

    // 指南针
    compassStopFunction: null,

    // 相机上下文
    cameraContext: null,

    // XR场景
    xrScene: null,
    xrSceneElement: null,

    // 蜂鸟云SDK
    hummingbirdInitialized: false
  },

  async onLoad(options) {
    console.log('AR page loaded');
    await this.initAR();
  },

  async onShow() {
    // 检查相机权限
    await this.checkCameraPermission();

    // 恢复指南针
    if (this.data.isNavigating) {
      this.startCompass();
    }

    // 检查蜂鸟云SDK
    if (this.data.hummingbirdInitialized) {
      await this.restartHummingbirdLocation();
    }
  },

  onReady() {
    // 页面准备完成
    this.setData({
      cameraContext: wx.createCameraContext()
    });
  },

  onHide() {
    // 停止指南针
    this.stopCompass();
  },

  onUnload() {
    // 清理资源
    this.cleanup();
  },

  // 初始化AR
  async initAR() {
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
      destination: globalData.destination
    });

    // 获取路径规划
    await this.fetchPath();

    // 初始化蜂鸟云SDK
    await this.initHummingbirdSDK();

    // 启动指南针
    this.startCompass();

    this.setData({ isARReady: true });
  },

  // 初始化蜂鸟云SDK
  async initHummingbirdSDK() {
    try {
      wx.showLoading({ title: '初始化定位...' });

      await hummingbirdSDK.init({
        accessKey: 'ZM7EzxHctTT2',
        secretKey: 'bbd43fe8b1d64b1706d6921e5489ff7d'
      });

      await hummingbirdSDK.requestLocationPermission();

      const position = await hummingbirdSDK.startLocationUpdates(
        this.handleHummingbirdLocation.bind(this)
      );

      if (position) {
        this.setData({
          currentLocation: {
            ...this.data.currentLocation,
            coordinates: position.coordinates,
            floor: position.floor
          },
          hummingbirdInitialized: true
        });
      }

      console.log('HummingbirdSDK初始化成功');
    } catch (error) {
      console.error('HummingbirdSDK初始化失败:', error);
      // 降级使用原有的定位方式
    } finally {
      wx.hideLoading();
    }
  },

  // 重启蜂鸟云定位
  async restartHummingbirdLocation() {
    if (this.data.hummingbirdInitialized) {
      await hummingbirdSDK.startLocationUpdates(
        this.handleHummingbirdLocation.bind(this)
      );
    }
  },

  // 处理蜂鸟云位置更新
  handleHummingbirdLocation(position) {
    console.log('Hummingbird位置更新:', position);

    this.setData({
      currentLocation: {
        ...this.data.currentLocation,
        coordinates: position.coordinates,
        floor: position.floor
      }
    });

    // 检查是否到达节点
    this.checkArrivalAtNode();
    // 更新距离
    this.updateDistance();
  },

  // 获取路径规划
  async fetchPath() {
    try {
      const { currentLocation, destination } = this.data;

      wx.showLoading({ title: '规划路径中...' });

      // 首先尝试使用蜂鸟云SDK
      if (this.data.hummingbirdInitialized) {
        try {
          const pathData = await hummingbirdSDK.calculatePath(currentLocation, destination);
          this.processPathData(pathData);
          return;
        } catch (hbError) {
          console.log('蜂鸟云路径规划失败，使用后端:', hbError);
        }
      }

      // 降级使用后端路径规划
      const pathData = await post('/navigation/plan', {
        startNodeId: currentLocation.id,
        endNodeId: destination.id
      });

      this.processPathData(pathData);

    } catch (error) {
      console.error('Fetch path failed:', error);
      this.useMockPath();
    } finally {
      wx.hideLoading();
    }
  },

  // 处理路径数据
  processPathData(pathData) {
    const nodes = (pathData.pathNodes || []).map(node => ({
      id: node.nodeId || node.id,
      name: node.nodeName || node.name,
      floor: node.floor,
      instruction: node.description || node.instruction || '继续前行',
      coordinates: {
        x: node.xCoordinate || node.coordinates?.x || 0,
        y: node.yCoordinate || node.coordinates?.y || 0
      }
    }));

    const totalDistance = pathData.distance || 0;
    const estimatedTime = pathData.estimatedTime
      ? Math.ceil(pathData.estimatedTime / 60)
      : Math.ceil(totalDistance / 80);

    this.setData({
      path: nodes,
      currentStepIndex: 0,
      totalSteps: nodes.length,
      totalDistance: Math.round(totalDistance),
      remainingDistance: Math.round(totalDistance),
      estimatedTime,
      instruction: nodes[0]?.instruction || '开始导航'
    });
  },

  // 使用模拟路径
  useMockPath() {
    const mockPath = [
      { id: '1', name: '当前位置', instruction: '从当前位置出发', coordinates: { x: 0, y: 0 } },
      { id: '2', name: '走廊交叉口', instruction: '沿走廊直行50米', coordinates: { x: 25, y: 30 } },
      { id: '3', name: '电梯厅', instruction: '乘电梯至3楼', coordinates: { x: 50, y: 50 } },
      { id: '4', name: '目的地', instruction: '到达目的地', coordinates: { x: 80, y: 60 } }
    ];

    this.setData({
      path: mockPath,
      currentStepIndex: 0,
      totalSteps: mockPath.length,
      totalDistance: 120,
      remainingDistance: 120,
      estimatedTime: 3,
      instruction: mockPath[0].instruction
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
    const { currentLocation, destination, path, currentStepIndex } = this.data;

    if (!currentLocation || (!destination && !path.length)) {
      return;
    }

    let targetCoords;
    if (path.length > 0 && currentStepIndex < path.length) {
      targetCoords = path[currentStepIndex].coordinates;
    } else if (destination) {
      targetCoords = destination.coordinates;
    }

    if (!targetCoords) {
      return;
    }

    // 计算目标方向
    const currentX = currentLocation.coordinates?.x || 0;
    const currentY = currentLocation.coordinates?.y || 0;

    const targetDirection = calculatePlanarDirection(
      currentX,
      currentY,
      targetCoords.x,
      targetCoords.y
    );

    // 计算相对方向
    const relativeInfo = calculateRelativeDirection(data.direction, targetDirection);

    // 根据角度调整箭头缩放
    const angleAbs = Math.abs(relativeInfo.relativeAngle);
    const scale = angleAbs < 30 ? 1.2 : (angleAbs < 60 ? 1.1 : 0.95);

    // 更新3D箭头旋转
    const opacity = angleAbs < 45 ? 1 : (angleAbs < 90 ? 0.8 : 0.6);

    console.log('箭头旋转:', relativeInfo.relativeAngle, '度');
    console.log('当前朝向:', data.direction);
    console.log('目标方向:', targetDirection);

    this.setData({
      deviceDirection: data.direction,
      targetDirection,
      relativeAngle: relativeInfo.relativeAngle,
      directionText: relativeInfo.direction,
      arrowRotation: relativeInfo.relativeAngle,
      arrowScale: scale,
      arrowOpacity: opacity
    });

    // 更新指引
    this.updateInstruction(relativeInfo.direction);
  },

  // 更新距离
  updateDistance() {
    const remainingDistance = this.calculateRemainingDistance();
    this.setData({ remainingDistance });
  },

  // 计算剩余距离
  calculateRemainingDistance() {
    const { path, currentStepIndex, currentLocation } = this.data;
    let totalDistance = 0;

    if (currentStepIndex < path.length - 1) {
      const nextNode = path[currentStepIndex + 1];
      totalDistance += calculatePlanarDistance(
        currentLocation.coordinates?.x || 0,
        currentLocation.coordinates?.y || 0,
        nextNode.coordinates.x,
        nextNode.coordinates.y
      );
    }

    for (let i = currentStepIndex + 1; i < path.length - 1; i++) {
      const node1 = path[i];
      const node2 = path[i + 1];
      totalDistance += calculatePlanarDistance(
        node1.coordinates.x,
        node1.coordinates.y,
        node2.coordinates.x,
        node2.coordinates.y
      );
    }

    return Math.round(totalDistance);
  },

  // 检查是否到达节点
  checkArrivalAtNode() {
    const { path, currentStepIndex, currentLocation } = this.data;

    if (currentStepIndex >= path.length - 1) {
      this.handleArrival();
      return;
    }

    const nextNode = path[currentStepIndex + 1];
    const distance = calculatePlanarDistance(
      currentLocation.coordinates?.x || 0,
      currentLocation.coordinates?.y || 0,
      nextNode.coordinates.x,
      nextNode.coordinates.y
    );

    if (distance < 3) {
      this.advanceToNextStep();
    } else {
      const remainingDistance = this.calculateRemainingDistance();
      this.setData({ remainingDistance });
    }
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
      instruction: path[nextStepIndex]?.instruction || '继续前行'
    });

    if (this.data.voiceEnabled) {
      this.speakInstruction(this.data.instruction);
    }
  },

  // 处理到达终点
  handleArrival() {
    this.setData({
      isNavigating: false,
      hasArrived: true
    });

    app.updateNavState('ARRIVED');

    if (this.data.voiceEnabled) {
      this.speakInstruction(`已到达目的地：${this.data.destination.name}`);
    }

    this.stopCompass();
  },

  // 更新指引
  updateInstruction(direction) {
    const { remainingDistance } = this.data;

    let instruction = '';

    if (Math.abs(this.data.relativeAngle) <= 22.5) {
      instruction = `直行${remainingDistance > 0 ? remainingDistance + '米' : ''}`;
    } else if (this.data.relativeAngle > 22.5 && this.data.relativeAngle <= 67.5) {
      instruction = '向右前方转弯';
    } else if (this.data.relativeAngle < -22.5 && this.data.relativeAngle >= -67.5) {
      instruction = '向左前方转弯';
    } else if (this.data.relativeAngle > 67.5) {
      instruction = '向右转';
    } else if (this.data.relativeAngle < -67.5) {
      instruction = '向左转';
    }

    this.setData({ instruction });
  },

  // 相机错误处理
  onCameraError(e) {
    console.error('Camera error:', e);
    wx.showToast({
      title: '相机启动失败',
      icon: 'none'
    });
  },

  // 拍照
  takePhoto() {
    const { cameraContext } = this.data;
    if (!cameraContext) {
      return;
    }

    cameraContext.takePhoto({
      quality: 'high',
      success: (res) => {
        console.log('Photo taken:', res.tempImagePath);
      }
    });
  },

  // 退出AR模式
  exitARMode() {
    this.cleanup();
    wx.navigateBack();
  },

  // 结束导航
  endNavigation() {
    this.cleanup();
    app.updateNavState('READY');
    app.setDestination(null);
    wx.navigateBack();
  },

  // 显示地图
  showPathMap() {
    wx.showToast({
      title: '地图功能开发中',
      icon: 'none'
    });
  },

  // 切换箭头显示
  toggleArrow() {
    this.setData({
      arrowVisible: !this.data.arrowVisible
    });
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

  // 检查相机权限
  async checkCameraPermission() {
    return new Promise((resolve) => {
      wx.getSetting({
        success: (res) => {
          const hasPermission = res.authSetting['scope.camera'];
          this.setData({
            hasCameraPermission: hasPermission === true
          });

          if (!hasPermission) {
            this.requestCameraPermission().then(resolve);
          } else {
            resolve(true);
          }
        },
        fail: () => resolve(false)
      });
    });
  },

  // 请求相机权限
  requestCameraPermission() {
    return new Promise((resolve) => {
      wx.authorize({
        scope: 'scope.camera',
        success: () => {
          this.setData({
            hasCameraPermission: true,
            isARReady: true
          });
          resolve(true);
        },
        fail: () => {
          wx.showModal({
            title: '需要相机权限',
            content: 'AR导航需要访问相机权限，请在设置中开启',
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting();
              }
            }
          });
          resolve(false);
        }
      });
    });
  },


  // 语音播报
  speakInstruction(text) {
    if (!this.data.voiceEnabled) {
      return;
    }
    console.log('Voice instruction:', text);
  },

  // 清理资源
  async cleanup() {
    console.log('AR cleanup');

    // 停止指南针
    this.stopCompass();

    // 停止蜂鸟云SDK
    if (this.data.hummingbirdInitialized) {
      await hummingbirdSDK.stopLocationUpdates();
      await hummingbirdSDK.cleanup();
    }

    // 停止位置更新
    try {
      wx.stopLocationUpdate();
    } catch (e) {
      // ignore
    }
  }
});
