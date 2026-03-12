/**
 * 本地存储工具模块
 * 提供统一的本地数据存储和读取接口
 */

const STORAGE_PREFIX = 'ar_nav_';

/**
 * 设置本地存储
 * @param {string} key - 存储键名
 * @param {*} value - 存储值
 * @param {number} expire - 过期时间（毫秒），可选
 * @returns {Promise}
 */
export const setStorage = (key, value, expire) => {
  return new Promise((resolve, reject) => {
    const storageKey = `${STORAGE_PREFIX}${key}`;
    const data = {
      value,
      timestamp: Date.now(),
      expire: expire ? Date.now() + expire : null
    };

    try {
      wx.setStorageSync(storageKey, data);
      resolve(data);
    } catch (error) {
      console.error('Storage set error:', error);
      reject(new Error('存储失败'));
    }
  });
};

/**
 * 获取本地存储
 * @param {string} key - 存储键名
 * @param {*} defaultValue - 默认值
 * @returns {Promise}
 */
export const getStorage = (key, defaultValue = null) => {
  return new Promise((resolve) => {
    const storageKey = `${STORAGE_PREFIX}${key}`;

    try {
      const data = wx.getStorageSync(storageKey);

      if (!data) {
        resolve(defaultValue);
        return;
      }

      // 检查是否过期
      if (data.expire && Date.now() > data.expire) {
        wx.removeStorageSync(storageKey);
        resolve(defaultValue);
        return;
      }

      resolve(data.value);
    } catch (error) {
      console.error('Storage get error:', error);
      resolve(defaultValue);
    }
  });
};

/**
 * 同步获取本地存储
 * @param {string} key - 存储键名
 * @param {*} defaultValue - 默认值
 * @returns {*}
 */
export const getStorageSync = (key, defaultValue = null) => {
  const storageKey = `${STORAGE_PREFIX}${key}`;

  try {
    const data = wx.getStorageSync(storageKey);

    if (!data) {
      return defaultValue;
    }

    // 检查是否过期
    if (data.expire && Date.now() > data.expire) {
      wx.removeStorageSync(storageKey);
      return defaultValue;
    }

    return data.value;
  } catch (error) {
    console.error('Storage get sync error:', error);
    return defaultValue;
  }
};

/**
 * 移除本地存储
 * @param {string} key - 存储键名
 * @returns {Promise}
 */
export const removeStorage = (key) => {
  return new Promise((resolve) => {
    const storageKey = `${STORAGE_PREFIX}${key}`;

    try {
      wx.removeStorageSync(storageKey);
      resolve(true);
    } catch (error) {
      console.error('Storage remove error:', error);
      resolve(false);
    }
  });
};

/**
 * 清除所有本地存储
 * @returns {Promise}
 */
export const clearStorage = () => {
  return new Promise((resolve) => {
    try {
      // 只清除带前缀的数据
      const keys = wx.getStorageInfoSync().keys;
      keys.forEach(key => {
        if (key.startsWith(STORAGE_PREFIX)) {
          wx.removeStorageSync(key);
        }
      });
      resolve(true);
    } catch (error) {
      console.error('Storage clear error:', error);
      resolve(false);
    }
  });
};

/**
 * 获取存储信息
 * @returns {Promise}
 */
export const getStorageInfo = () => {
  return new Promise((resolve, reject) => {
    wx.getStorageInfo({
      success: (res) => {
        // 只统计带前缀的存储
        const appKeys = res.keys.filter(key => key.startsWith(STORAGE_PREFIX));
        resolve({
          ...res,
          appKeys,
          appKeyCount: appKeys.length
        });
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
};

// 存储键名常量
export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER_INFO: 'userInfo',
  NAVIGATION_HISTORY: 'navigationHistory',
  CURRENT_LOCATION: 'currentLocation',
  SETTINGS: 'settings',
  CACHE_DATA: 'cacheData',
  SCAN_HISTORY: 'scanHistory'
};
