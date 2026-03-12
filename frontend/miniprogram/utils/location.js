/**
 * 定位工具模块
 * 提供地理位置相关功能，包括坐标转换、距离计算等
 */

const EARTH_RADIUS = 6371000; // 地球半径（米）

/**
 * 计算平面坐标两点之间的距离（米）
 * 适用于医院内部平面坐标系统
 * @param {number} x1 - 起点X坐标
 * @param {number} y1 - 起点Y坐标
 * @param {number} x2 - 终点X坐标
 * @param {number} y2 - 终点Y坐标
 * @returns {number} 距离（米）
 */
export const calculatePlanarDistance = (x1, y1, x2, y2) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * 计算平面坐标的目标方向（角度）
 * 适用于医院内部平面坐标系统，返回0-360度，以Y轴正方向为0度（正北）
 * @param {number} x1 - 起点X坐标
 * @param {number} y1 - 起点Y坐标
 * @param {number} x2 - 终点X坐标
 * @param {number} y2 - 终点Y坐标
 * @returns {number} 目标方向（角度，0-360）
 */
export const calculatePlanarDirection = (x1, y1, x2, y2) => {
  const dx = x2 - x1;
  const dy = y2 - y1;

  // 计算角度，注意坐标系转换：数学坐标系 -> 导航坐标系
  // 数学坐标系：0度在X轴正方向，逆时针增加
  // 导航坐标系：0度在Y轴正方向（正北），顺时针增加
  let angle = Math.atan2(dx, dy) * (180 / Math.PI);

  // 确保角度在 0-360 范围内
  if (angle < 0) {
    angle += 360;
  }

  return angle;
};

/**
 * 获取当前位置
 * @param {Object} options - 配置选项
 * @returns {Promise}
 */
export const getCurrentPosition = (options = {}) => {
  return new Promise((resolve, reject) => {
    const {
      type = 'gcj02',
      altitude = false,
      isHighAccuracy = true,
      highAccuracyExpireTime = 5000
    } = options;

    wx.getLocation({
      type,
      altitude,
      isHighAccuracy,
      highAccuracyExpireTime,
      success: (res) => {
        resolve({
          latitude: res.latitude,
          longitude: res.longitude,
          altitude: res.altitude,
          speed: res.speed,
          accuracy: res.accuracy,
          timestamp: res.time || Date.now()
        });
      },
      fail: (err) => {
        console.error('Get location failed:', err);
        reject(new Error(getLocationErrorMessage(err.errCode)));
      }
    });
  });
};

/**
 * 持续监听位置变化
 * @param {Function} callback - 位置更新回调
 * @param {Object} options - 配置选项
 * @returns {Function} 取消监听的函数
 */
export const watchPosition = (callback, options = {}) => {
  const { type = 'gcj02', interval = 1000 } = options;

  const watchId = wx.startLocationUpdateBackground ?
    // 使用后台定位
    wx.startLocationUpdateBackground({
      success: () => {
        wx.onLocationChange((res) => {
          callback({
            latitude: res.latitude,
            longitude: res.longitude,
            altitude: res.altitude,
            speed: res.speed,
            accuracy: res.accuracy,
            timestamp: res.time || Date.now()
          });
        });
      }
    }) :
    // 使用前台定位
    wx.startLocationUpdate({
      type,
      success: () => {
        wx.onLocationChange((res) => {
          callback({
            latitude: res.latitude,
            longitude: res.longitude,
            altitude: res.altitude,
            speed: res.speed,
            accuracy: res.accuracy,
            timestamp: res.time || Date.now()
          });
        });
      }
    });

  // 返回取消监听的函数
  return () => {
    wx.stopLocationUpdate();
    wx.offLocationChange();
  };
};

/**
 * 计算两点之间的距离（米）
 * @param {number} lat1 - 起点纬度
 * @param {number} lng1 - 起点经度
 * @param {number} lat2 - 终点纬度
 * @param {number} lng2 - 终点经度
 * @returns {number} 距离（米）
 */
export const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const radLat1 = toRadians(lat1);
  const radLat2 = toRadians(lat2);
  const radLng1 = toRadians(lng1);
  const radLng2 = toRadians(lng2);

  const a = radLat1 - radLat2;
  const b = radLng1 - radLng2;

  const s = 2 * Math.asin(Math.sqrt(
    Math.pow(Math.sin(a / 2), 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b / 2), 2)
  ));

  return s * EARTH_RADIUS;
};

/**
 * 计算两点之间的方位角
 * @param {number} lat1 - 起点纬度
 * @param {number} lng1 - 起点经度
 * @param {number} lat2 - 终点纬度
 * @param {number} lng2 - 终点经度
 * @returns {number} 方位角（度，0-360）
 */
export const calculateBearing = (lat1, lng1, lat2, lng2) => {
  const radLat1 = toRadians(lat1);
  const radLat2 = toRadians(lat2);
  const radLng1 = toRadians(lng1);
  const radLng2 = toRadians(lng2);

  const y = Math.sin(radLng2 - radLng1) * Math.cos(radLat2);
  const x = Math.cos(radLat1) * Math.sin(radLat2) -
            Math.sin(radLat1) * Math.cos(radLat2) * Math.cos(radLng2 - radLng1);

  let bearing = toDegrees(Math.atan2(y, x));
  bearing = (bearing + 360) % 360;

  return bearing;
};

/**
 * 坐标转换：GCJ-02 to WGS-84
 * @param {number} lat - GCJ-02纬度
 * @param {number} lng - GCJ-02经度
 * @returns {Object} WGS-84坐标
 */
export const gcj02ToWgs84 = (lat, lng) => {
  const dLat = transformLat(lng - 105.0, lat - 35.0);
  const dLng = transformLng(lng - 105.0, lat - 35.0);
  const radLat = lat / 180.0 * Math.PI;
  let magic = Math.sin(radLat);
  magic = 1 - 0.00669342162296594323 * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  const dLatInDegree = (dLat * 180.0) / ((6378245.0 * (1 - 0.00669342162296594323)) / (magic * sqrtMagic) * Math.PI);
  const dLngInDegree = (dLng * 180.0) / (6378245.0 / sqrtMagic * Math.cos(radLat) * Math.PI);

  return {
    lat: lat - dLatInDegree,
    lng: lng - dLngInDegree
  };
};

/**
 * 坐标转换：WGS-84 to GCJ-02
 * @param {number} lat - WGS-84纬度
 * @param {number} lng - WGS-84经度
 * @returns {Object} GCJ-02坐标
 */
export const wgs84ToGcj02 = (lat, lng) => {
  const dLat = transformLat(lng - 105.0, lat - 35.0);
  const dLng = transformLng(lng - 105.0, lat - 35.0);
  const radLat = lat / 180.0 * Math.PI;
  let magic = Math.sin(radLat);
  magic = 1 - 0.00669342162296594323 * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  const dLatInDegree = (dLat * 180.0) / ((6378245.0 * (1 - 0.00669342162296594323)) / (magic * sqrtMagic) * Math.PI);
  const dLngInDegree = (dLng * 180.0) / (6378245.0 / sqrtMagic * Math.cos(radLat) * Math.PI);

  return {
    lat: lat + dLatInDegree,
    lng: lng + dLngInDegree
  };
};

/**
 * 辅助函数：坐标转换纬度计算
 */
const transformLat = (x, y) => {
  let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  ret += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin(y / 3.0 * Math.PI)) * 2.0 / 3.0;
  ret += (160.0 * Math.sin(y / 12.0 * Math.PI) + 320 * Math.sin(y * Math.PI / 30.0)) * 2.0 / 3.0;
  return ret;
};

/**
 * 辅助函数：坐标转换经度计算
 */
const transformLng = (x, y) => {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  ret += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin(x / 3.0 * Math.PI)) * 2.0 / 3.0;
  ret += (150.0 * Math.sin(x / 12.0 * Math.PI) + 300.0 * Math.sin(x / 30.0 * Math.PI)) * 2.0 / 3.0;
  return ret;
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
 * 获取定位错误信息
 */
const getLocationErrorMessage = (errCode) => {
  const errorMessages = {
    0: '定位失败',
    1: '用户拒绝授权',
    2: '获取位置信息失败',
    3: '定位超时',
    4: '未知错误'
  };
  return errorMessages[errCode] || errorMessages[4];
};
