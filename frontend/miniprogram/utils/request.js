const BASE_URL = 'http://192.168.101.11:8080/api';
const TIMEOUT = 10000;

// 请求拦截器
const requestInterceptor = (options) => {
  const token = wx.getStorageSync('token');
  if (token) {
    options.header = {
      ...options.header,
      'Authorization': `Bearer ${token}`
    };
  }
  return options;
};

// 响应拦截器
const responseInterceptor = (response) => {
  const { statusCode, data } = response;

  if (statusCode === 200) {
    if (data.code === 0 || data.code === 200) {
      return data.data || data;
    } else {
      throw new Error(data.message || '请求失败');
    }
  } else if (statusCode === 401) {
    // Token过期，清除登录状态
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
    throw new Error('登录已过期，请重新登录');
  } else {
    throw new Error(`HTTP ${statusCode}: 请求失败`);
  }
};

// 通用请求方法
export const request = (options) => {
  return new Promise((resolve, reject) => {
    // 应用请求拦截器
    options = requestInterceptor(options);

    wx.request({
      ...options,
      url: `${BASE_URL}${options.url}`,
      timeout: options.timeout || TIMEOUT,
      success: (res) => {
        try {
          const data = responseInterceptor(res);
          resolve(data);
        } catch (error) {
          reject(error);
        }
      },
      fail: (err) => {
        console.error('Request failed:', err);
        reject(new Error('网络请求失败，请检查网络连接'));
      }
    });
  });
};

// GET请求
export const get = (url, params = {}, options = {}) => {
  const queryString = Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  return request({
    url: queryString ? `${url}?${queryString}` : url,
    method: 'GET',
    ...options
  });
};

// POST请求
export const post = (url, data = {}, options = {}) => {
  return request({
    url,
    method: 'POST',
    data,
    header: {
      'Content-Type': 'application/json'
    },
    ...options
  });
};

// PUT请求
export const put = (url, data = {}, options = {}) => {
  return request({
    url,
    method: 'PUT',
    data,
    header: {
      'Content-Type': 'application/json'
    },
    ...options
  });
};

// DELETE请求
export const del = (url, options = {}) => {
  return request({
    url,
    method: 'DELETE',
    ...options
  });
};

// 上传文件
export const uploadFile = (url, filePath, name = 'file', formData = {}) => {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token');

    wx.uploadFile({
      url: `${BASE_URL}${url}`,
      filePath,
      name,
      formData,
      header: {
        'Authorization': token ? `Bearer ${token}` : ''
      },
      success: (res) => {
        try {
          const data = JSON.parse(res.data);
          if (data.code === 0 || data.code === 200) {
            resolve(data.data || data);
          } else {
            reject(new Error(data.message || '上传失败'));
          }
        } catch (e) {
          reject(new Error('解析响应失败'));
        }
      },
      fail: (err) => {
        reject(new Error('上传失败'));
      }
    });
  });
};

// 检查登录状态
export const checkSession = () => {
  return new Promise((resolve) => {
    wx.checkSession({
      success: () => {
        const token = wx.getStorageSync('token');
        resolve(!!token);
      },
      fail: () => {
        resolve(false);
      }
    });
  });
};

// 登录
export const login = () => {
  return new Promise((resolve, reject) => {
    wx.login({
      success: (res) => {
        if (res.code) {
          // 发送code到后端换取token
          post('/user/login', { code: res.code })
            .then((data) => {
              if (data.token) {
                wx.setStorageSync('token', data.token);
                if (data.userInfo) {
                  wx.setStorageSync('userInfo', data.userInfo);
                }
              }
              resolve(data);
            })
            .catch(reject);
        } else {
          reject(new Error('登录失败'));
        }
      },
      fail: () => {
        reject(new Error('登录失败'));
      }
    });
  });
};

// 获取用户信息
export const getUserProfile = () => {
  return new Promise((resolve, reject) => {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        resolve(res.userInfo);
      },
      fail: (err) => {
        reject(new Error('获取用户信息失败'));
      }
    });
  });
};
