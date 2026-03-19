/**
 * 指南针/方向传感器工具模块
 * 提供设备方向检测、方位角计算等功能
 */

/**
 * 开始监听罗盘数据
 * @param {Function} callback - 回调函数，接收罗盘数据
 * @param {Object} options - 配置选项
 * @returns {Function} 停止监听的函数
 */
export const startCompass = (callback, options = {}) => {
  const { frequency = 100 } = options;

  // 检查API支持
  if (!wx.startCompass) {
    console.warn('当前设备不支持罗盘功能');
    return () => {};
  }

  // 开始监听
  wx.startCompass({
    success: () => {
      console.log('Compass started');
    },
    fail: (err) => {
      console.error('Failed to start compass:', err);
    }
  });

  // 监听罗盘变化
  const listener = (res) => {
    callback({
      direction: res.direction, // 0-360度，正北为0
      accuracy: res.accuracy || 'high', // 精度
      timestamp: Date.now()
    });
  };

  wx.onCompassChange(listener);

  // 返回停止监听的函数
  return () => {
    wx.stopCompass();
    wx.offCompassChange(listener);
  };
};

/**
 * 获取设备方向信息
 * @returns {Promise}
 */
export const getDeviceOrientation = () => {
  return new Promise((resolve, reject) => {
    if (!wx.startDeviceMotionListening) {
      reject(new Error('当前设备不支持设备方向检测'));
      return;
    }

    wx.startDeviceMotionListening({
      success: () => {
        wx.onDeviceMotionChange((res) => {
          resolve({
            alpha: res.alpha, // Z轴旋转角度
            beta: res.beta,   // X轴旋转角度
            gamma: res.gamma, // Y轴旋转角度
            timestamp: Date.now()
          });

          // 只获取一次
          wx.stopDeviceMotionListening();
          wx.offDeviceMotionChange();
        });
      },
      fail: (err) => {
        reject(new Error('无法获取设备方向'));
      }
    });
  });
};

/**
 * 计算目标方向
 * @param {number} currentLat - 当前纬度
 * @param {number} currentLng - 当前经度
 * @param {number} targetLat - 目标纬度
 * @param {number} targetLng - 目标经度
 * @returns {number} 目标方向（角度，正北为0）
 */
export const calculateTargetDirection = (currentLat, currentLng, targetLat, targetLng) => {
  const radLat1 = toRadians(currentLat);
  const radLat2 = toRadians(targetLat);
  const radLng1 = toRadians(currentLng);
  const radLng2 = toRadians(targetLng);

  const y = Math.sin(radLng2 - radLng1) * Math.cos(radLat2);
  const x = Math.cos(radLat1) * Math.sin(radLat2) -
            Math.sin(radLat1) * Math.cos(radLat2) * Math.cos(radLng2 - radLng1);

  let bearing = toDegrees(Math.atan2(y, x));
  bearing = (bearing + 360) % 360;

  return bearing;
};

/**
 * 计算相对方向
 * @param {number} deviceDirection - 设备朝向（罗盘角度）
 * @param {number} targetDirection - 目标方向
 * @returns {Object} 相对方向信息
 */
export const calculateRelativeDirection = (deviceDirection, targetDirection) => {
  let relativeAngle = targetDirection - deviceDirection;

  // 规范化到 -180 到 180 度
  while (relativeAngle > 180) relativeAngle -= 360;
  while (relativeAngle < -180) relativeAngle += 360;

  // 确定方向描述
  let direction = '';
  let arrowRotation = relativeAngle - 90;

  if (Math.abs(relativeAngle) <= 22.5) {
    direction = '正前方';
  } else if (relativeAngle > 22.5 && relativeAngle <= 67.5) {
    direction = '右前方';
  } else if (relativeAngle > 67.5 && relativeAngle <= 112.5) {
    direction = '右侧';
  } else if (relativeAngle > 112.5 && relativeAngle <= 157.5) {
    direction = '右后方';
  } else if (Math.abs(relativeAngle) > 157.5) {
    direction = '后方';
  } else if (relativeAngle >= -157.5 && relativeAngle < -112.5) {
    direction = '左后方';
  } else if (relativeAngle >= -112.5 && relativeAngle < -67.5) {
    direction = '左侧';
  } else if (relativeAngle >= -67.5 && relativeAngle < -22.5) {
    direction = '左前方';
  }

  return {
    relativeAngle,
    direction,
    arrowRotation,
    isInFront: Math.abs(relativeAngle) <= 90
  };
};

/**
 * 角度转弧度
 */
const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * 弧度转角度
 */
const toDegrees = (radians) => {
  return radians * (180 / Math.PI);
};

/**
 * 计算步数估计值
 * @param {number} distance - 距离（米）
 * @returns {number} 估计步数
 */
export const estimateSteps = (distance) => {
  // 假设平均步长0.7米
  const averageStepLength = 0.7;
  return Math.ceil(distance / averageStepLength);
};

/**
 * 估算行走时间
 * @param {number} distance - 距离（米）
 * @param {number} speed - 速度（米/分钟），默认80米/分钟（约5km/h）
 * @returns {number} 时间（分钟）
 */
export const estimateTime = (distance, speed = 80) => {
  return Math.ceil(distance / speed);
};
