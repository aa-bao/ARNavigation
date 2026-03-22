const BASE_URL = 'http://192.168.101.11:8080/api';
const TIMEOUT = 10000;
const ASSET_BASE_URL = BASE_URL.replace(/\/api\/?$/, '');

const requestInterceptor = (options) => {
  const token = wx.getStorageSync('token');
  if (token) {
    options.header = {
      ...options.header,
      Authorization: `Bearer ${token}`
    };
  }
  return options;
};

const responseInterceptor = (response) => {
  const { statusCode, data } = response;

  if (statusCode === 200) {
    if (data.code === 200 || data.code === 0) {
      return data.data;
    }
    throw new Error(data.message || '请求失败');
  }

  if (statusCode === 401 || statusCode === 403) {
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
    throw new Error(statusCode === 401 ? '登录已失效，请重新登录' : '无权限访问，请重新登录');
  }

  throw new Error(data?.message || `HTTP ${statusCode}: 请求失败`);
};

export const request = (options) => new Promise((resolve, reject) => {
  const intercepted = requestInterceptor(options);

  wx.request({
    ...intercepted,
    url: `${BASE_URL}${intercepted.url}`,
    timeout: intercepted.timeout || TIMEOUT,
    success: (res) => {
      try {
        resolve(responseInterceptor(res));
      } catch (error) {
        reject(error);
      }
    },
    fail: () => reject(new Error('网络请求失败，请检查连接'))
  });
});

export const get = (url, params = {}, options = {}) => {
  const queryString = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== '')
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  return request({
    url: queryString ? `${url}?${queryString}` : url,
    method: 'GET',
    ...options
  });
};

export const post = (url, data = {}, options = {}) => request({
  url,
  method: 'POST',
  data,
  header: {
    'Content-Type': 'application/json'
  },
  ...options
});

export const put = (url, data = {}, options = {}) => request({
  url,
  method: 'PUT',
  data,
  header: {
    'Content-Type': 'application/json'
  },
  ...options
});

export const del = (url, options = {}) => request({
  url,
  method: 'DELETE',
  ...options
});

export const uploadFile = (url, filePath, name = 'file', formData = {}) => new Promise((resolve, reject) => {
  const token = wx.getStorageSync('token');

  wx.uploadFile({
    url: `${BASE_URL}${url}`,
    filePath,
    name,
    formData,
    header: {
      Authorization: token ? `Bearer ${token}` : ''
    },
    success: (res) => {
      try {
        const parsed = JSON.parse(res.data);
        if (parsed.code === 200 || parsed.code === 0) {
          resolve(parsed.data);
          return;
        }
        reject(new Error(parsed.message || '上传失败'));
      } catch {
        reject(new Error('解析响应失败'));
      }
    },
    fail: () => reject(new Error('上传失败'))
  });
});

export const resolveAssetUrl = (url = '') => {
  if (!url) {
    return '';
  }

  if (/^(https?:\/\/|wxfile:\/\/|wdfile:\/\/|data:)/i.test(url)) {
    return url;
  }

  if (url.startsWith('/')) {
    return `${ASSET_BASE_URL}${url}`;
  }

  return `${ASSET_BASE_URL}/${url}`;
};

export const checkSession = () => new Promise((resolve) => {
  wx.checkSession({
    success: () => resolve(!!wx.getStorageSync('token')),
    fail: () => resolve(false)
  });
});
