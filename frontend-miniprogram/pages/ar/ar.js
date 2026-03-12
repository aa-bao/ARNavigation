// AR视觉导引页面逻辑 - 基于XR-FRAME框架
const app = getApp();

// 平滑滤波器类
class SmoothFilter {
  constructor(windowSize = 5) {
    this.windowSize = windowSize;
    this.values = [];
  }

  add(value) {
    this.values.push(value);
    if (this.values.length > this.windowSize) {
      this.values.shift();
    }
    return this.getAverage();
  }

  getAverage() {
    if (this.values.length === 0) return 0;
    const sum = this.values.reduce((a, b) => a + b, 0);
    return sum / this.values.length;
  }

  clear() {
    this.values = [];
  }
}

// 角度平滑滤波器（处理0-360度跨越）
class AngleSmoothFilter {
  constructor(windowSize = 5) {
    this.windowSize = windowSize;
    this.sinValues = [];
    this.cosValues = [];
  }

  add(angle) {
    const rad = this.toRadians(angle);
    this.sinValues.push(Math.sin(rad));
    this.cosValues.push(Math.cos(rad));

    if (this.sinValues.length > this.windowSize) {
      this.sinValues.shift();
      this.cosValues.shift();
    }

    return this.getAverage();
  }

  getAverage() {
    if (this.sinValues.length === 0) return 0;
    const avgSin = this.sinValues.reduce((a, b) => a + b, 0) / this.sinValues.length;
    const avgCos = this.cosValues.reduce((a, b) => a + b, 0) / this.cosValues.length;
    return this.normalizeAngle(this.toDegrees(Math.atan2(avgSin, avgCos)));
  }

  toRadians(deg) {
    return deg * Math.PI / 180;
  }

  toDegrees(rad) {
    return rad * 180 / Math.PI;
  }

  normalizeAngle(angle) {
    while (angle < 0) angle += 360;
    while (angle >= 360) angle -= 360;
    return angle;
  }

  clear() {
    this.sinValues = [];
    this.cosValues = [];
  }
}

Page({
  data: {
    // XR场景状态
    xrReady: false,
    sceneReady: false,
    arReady: false,

    // 箭头模型状态
    arrowVisible: false,
    arrowPosition: '0 -1 -3',
    arrowRotation: '0 0 0',
    arrowScale: '1 1 1',
    arrowAnimation: '',

    // 目标标记
    targetVisible: false,
    targetPosition: '0 0 -10',

    // 导航信息
    destinationName: '目的地',
    remainingDistance: 0,
    directionHint: '请沿箭头方向前进',
    turnAngle: 0,
    nextPointName: '下一个路口',
    nextPointDistance: 0,

    // 指南针
    compassRotation: 0,
    heading: 0,

    // UI状态
    showToast: false,
    toastMessage: '',
    showCalibration: false,
    showArrival: false
  },

  // 页面生命周期
  onLoad(options) {
    console.log('[AR] 页面加载:', options);

    // 从导航页面接收参数
    if (options.destination) {
      this.setData({
        destinationName: decodeURIComponent(options.destination)
      });
    }

    if (options.pathData) {
      try {
        const pathData = JSON.parse(decodeURIComponent(options.pathData));
        this.initPathData(pathData);
      } catch (e) {
        console.error('[AR] 解析路径数据失败:', e);
      }
    }

    // 初始化滤波器
    this.headingFilter = new AngleSmoothFilter(7);
    this.rotationFilter = new AngleSmoothFilter(5);

    // 初始化路径索引
    this.currentPathIndex = 0;
    this.pathPoints = [];
    this.arrived = false;
  },

  onReady() {
    console.log('[AR] 页面就绪');
  },

  onShow() {
    console.log('[AR] 页面显示');
    this.checkCameraPermission();
  },

  onHide() {
    console.log('[AR] 页面隐藏');
    this.stopCompass();
  },

  onUnload() {
    console.log('[AR] 页面卸载');
    this.cleanup();
  },

  // ==================== XR-FRAME 事件处理 ====================

  handleXRReady(e) {
    console.log('[AR] XR-FRAME就绪:', e);
    this.setData({ xrReady: true });
    this.showToast('AR引擎初始化成功');
  },

  handleARReady(e) {
    console.log('[AR] AR功能就绪:', e);
    this.setData({ arReady: true });

    // AR就绪后开始指南针监听
    this.startCompass();

    // 加载3D箭头模型
    this.loadArrowModel();
  },

  handleSceneReady(e) {
    console.log('[AR] 场景就绪:', e);
    this.setData({ sceneReady: true });

    // 获取场景和相机
    const scene = this.selectComponent('#main-scene');
    if (scene) {
      this.scene = scene;
      this.camera = scene.getElementById('main-camera');
    }
  },

  handleXRError(e) {
    console.error('[AR] XR-FRAME错误:', e);
    const errorType = e.detail?.type || 'unknown';

    let errorMsg = 'AR功能初始化失败';
    if (errorType === 'device_not_supported') {
      errorMsg = '您的设备不支持AR功能';
    } else if (errorType === 'camera_permission_denied') {
      errorMsg = '请允许使用相机权限';
    }

    this.showToast(errorMsg);

    // 3秒后返回
    setTimeout(() => {
      wx.navigateBack();
    }, 3000);
  },

  // ==================== 3D模型加载 ====================

  loadArrowModel() {
    console.log('[AR] 加载3D导航箭头');

    // 3D箭头已经通过基础几何体构建，直接显示
    this.setData({
      arrowVisible: true,
      arrowAnimation: 'pulse'
    });

    // 启动箭头脉动动画
    this.startArrowAnimation();
  },

  createProceduralArrow() {
    // 使用XR-FRAME基础几何体创建高德风格3D箭头
    console.log('[AR] 创建程序化3D导航箭头');
  },

  // 箭头脉动动画
  startArrowAnimation() {
    console.log('[AR] 启动箭头动画');

    let scale = 1;
    let growing = true;
    let opacity = 1;

    this.arrowAnimationId = setInterval(() => {
      if (growing) {
        scale += 0.01;
        if (scale >= 1.1) {
          growing = false;
        }
      } else {
        scale -= 0.01;
        if (scale <= 1) {
          growing = true;
        }
      }

      // 更新箭头缩放动画
      this.setData({
        arrowScale: `${scale} ${scale} ${scale}`
      });

      // 更新尾焰透明度动画
      opacity = 0.6 + 0.4 * Math.sin(Date.now() / 300);
    }, 30);
  },

  stopArrowAnimation() {
    if (this.arrowAnimationId) {
      clearInterval(this.arrowAnimationId);
      this.arrowAnimationId = null;
    }

    // 重置缩放
    this.setData({
      arrowScale: '1 1 1'
    });
  },

  // ==================== 指南针功能 ====================

  checkCameraPermission() {
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.camera']) {
          wx.authorize({
            scope: 'scope.camera',
            fail: () => {
              this.showToast('需要相机权限才能使用AR导航');
            }
          });
        }
      }
    });
  },

  startCompass() {
    console.log('[AR] 启动指南针');

    wx.startCompass({
      success: () => {
        console.log('[AR] 指南针启动成功');

        // 监听指南针变化
        wx.onCompassChange((res) => {
          this.handleCompassChange(res);
        });
      },
      fail: (err) => {
        console.error('[AR] 指南针启动失败:', err);
        this.showToast('指南针功能不可用');
      }
    });
  },

  stopCompass() {
    console.log('[AR] 停止指南针');
    wx.stopCompass();
    wx.offCompassChange();
  },

  handleCompassChange(res) {
    // res.direction 是设备相对于正北的角度（0-360）
    const rawHeading = res.direction;

    // 应用平滑滤波
    const smoothedHeading = this.headingFilter.add(rawHeading);

    // 更新指南针UI
    this.setData({
      compassRotation: -smoothedHeading,
      heading: smoothedHeading
    });

    // 更新箭头方向
    this.updateArrowDirection(smoothedHeading);

    // 检查是否需要校准
    if (res.accuracy < 0 || res.accuracy > 2) {
      // 精度较差，显示校准提示
      if (!this.calibrationShown) {
        this.calibrationShown = true;
        setTimeout(() => {
          this.setData({ showCalibration: true });
        }, 5000);
      }
    }
  },

  dismissCalibration() {
    this.setData({ showCalibration: false });
  },

  // ==================== 方位角计算与箭头旋转 ====================

  initPathData(pathData) {
    console.log('[AR] 初始化路径数据:', pathData);

    if (pathData && pathData.points) {
      this.pathPoints = pathData.points;
      this.currentPathIndex = 0;

      // 更新UI显示
      if (this.pathPoints.length > 0) {
        const nextPoint = this.pathPoints[0];
        this.setData({
          nextPointName: nextPoint.name || '下一个路口',
          nextPointDistance: this.calculateDistance(
            app.globalData.currentLocation,
            nextPoint
          )
        });
      }
    }
  },

  updateArrowDirection(heading) {
    if (!this.pathPoints || this.pathPoints.length === 0) return;

    // 获取当前位置和下一个路径点
    const currentPos = app.globalData.currentLocation;
    const nextPoint = this.pathPoints[this.currentPathIndex];

    if (!currentPos || !nextPoint) return;

    // 计算目标方位角(Bearing)
    const bearing = this.calculateBearing(currentPos, nextPoint);

    // 计算箭头旋转角度：Arrow_Rotation = Bearing - Heading
    let arrowRotation = bearing - heading;

    // 归一化到0-360度
    arrowRotation = this.normalizeAngle(arrowRotation);

    // 应用平滑滤波
    const smoothedRotation = this.rotationFilter.add(arrowRotation);

    // 更新3D箭头旋转
    this.setData({
      arrowRotation: `0 ${smoothedRotation} 0`,
      directionHint: this.getDirectionHint(smoothedRotation),
      turnAngle: Math.round(smoothedRotation)
    });

    // 更新距离
    const distance = this.calculateDistance(currentPos, nextPoint);
    this.setData({
      remainingDistance: Math.round(distance),
      nextPointDistance: Math.round(distance)
    });

    // 检查是否到达路径点
    if (distance < 2) {
      this.onReachPathPoint();
    }
  },

  // 计算两点间的方位角(Bearing)
  calculateBearing(from, to) {
    const lat1 = this.toRadians(from.latitude);
    const lat2 = this.toRadians(to.latitude);
    const dLon = this.toRadians(to.longitude - from.longitude);

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

    let bearing = this.toDegrees(Math.atan2(y, x));
    bearing = this.normalizeAngle(bearing);

    return bearing;
  },

  // 计算两点间距离(米)
  calculateDistance(from, to) {
    const R = 6371000; // 地球半径(米)
    const lat1 = this.toRadians(from.latitude);
    const lat2 = this.toRadians(to.latitude);
    const dLat = this.toRadians(to.latitude - from.latitude);
    const dLon = this.toRadians(to.longitude - from.longitude);

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  },

  // 角度工具函数
  toRadians(deg) {
    return deg * Math.PI / 180;
  },

  toDegrees(rad) {
    return rad * 180 / Math.PI;
  },

  normalizeAngle(angle) {
    while (angle < 0) angle += 360;
    while (angle >= 360) angle -= 360;
    return angle;
  },

  // 获取方向提示文本
  getDirectionHint(rotation) {
    if (rotation >= 330 || rotation <= 30) {
      return '请直行';
    } else if (rotation > 30 && rotation < 150) {
      return '请向右转';
    } else if (rotation >= 210 && rotation < 330) {
      return '请向左转';
    } else {
      return '请掉头';
    }
  },

  // 到达路径点处理
  onReachPathPoint() {
    console.log('[AR] 到达路径点:', this.currentPathIndex);

    this.currentPathIndex++;

    if (this.currentPathIndex >= this.pathPoints.length) {
      // 到达终点
      this.onArrival();
    } else {
      // 到达中间点，提示用户
      const nextPoint = this.pathPoints[this.currentPathIndex];
      this.showToast(`已到达，前往${nextPoint.name || '下一个路口'}`);

      // 更新UI
      this.setData({
        nextPointName: nextPoint.name || '下一个路口'
      });
    }
  },

  // 到达终点处理
  onArrival() {
    console.log('[AR] 到达终点');
    this.arrived = true;

    // 隐藏箭头
    this.setData({
      arrowVisible: false,
      directionHint: '已到达目的地',
      turnAngle: 0
    });

    // 显示到达弹窗
    this.setData({ showArrival: true });

    // 播放到达音效
    this.playArrivalSound();

    // 停止指南针
    this.stopCompass();
  },

  // 播放到达音效
  playArrivalSound() {
    const innerAudioContext = wx.createInnerAudioContext();
    innerAudioContext.src = '/audio/arrival.mp3';
    innerAudioContext.play();
  },

  // ==================== 用户交互 ====================

  goBack() {
    wx.navigateBack();
  },

  recenterView() {
    console.log('[AR] 重置视角');

    // 重置箭头位置
    this.setData({
      arrowPosition: '0 -1 -3',
      arrowRotation: '0 0 0'
    });

    // 重置滤波器
    this.headingFilter.clear();
    this.rotationFilter.clear();

    this.showToast('视角已重置');
  },

  exitAR() {
    console.log('[AR] 退出AR导航');

    wx.showModal({
      title: '退出导航',
      content: '确定要退出AR导航吗？',
      success: (res) => {
        if (res.confirm) {
          this.cleanup();
          wx.navigateBack();
        }
      }
    });
  },

  // 完成到达
  finishArrival() {
    this.setData({ showArrival: false });
    this.cleanup();
    wx.navigateBack();
  },

  // ==================== 工具方法 ====================

  showToast(message) {
    this.setData({
      showToast: true,
      toastMessage: message
    });

    setTimeout(() => {
      this.setData({ showToast: false });
    }, 2000);
  },

  cleanup() {
    console.log('[AR] 清理资源');

    // 停止指南针
    this.stopCompass();

    // 停止箭头动画
    this.stopArrowAnimation();

    // 清空滤波器
    if (this.headingFilter) {
      this.headingFilter.clear();
    }
    if (this.rotationFilter) {
      this.rotationFilter.clear();
    }

    // 重置状态
    this.arrived = false;
    this.currentPathIndex = 0;
    this.calibrationShown = false;
  }
});
