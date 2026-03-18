import { post } from './request.js';

const AUTH_KEYS = {
  TOKEN: 'token',
  USER_INFO: 'userInfo'
};

const normalizeUserInfo = (userInfo) => {
  if (!userInfo || typeof userInfo !== 'object') {
    return null;
  }

  const nickname = userInfo.nickname || userInfo.nickName || '';
  const avatarUrl = userInfo.avatarUrl || userInfo.avatar || '';

  return {
    ...userInfo,
    nickname,
    nickName: userInfo.nickName || nickname,
    avatarUrl
  };
};

const buildLegacyUserInfo = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  if (
    !payload.username &&
    !payload.nickname &&
    !payload.nickName &&
    !payload.avatar &&
    !payload.avatarUrl &&
    !payload.phone &&
    !payload.userType &&
    !payload.status
  ) {
    return null;
  }

  return normalizeUserInfo({
    id: payload.id,
    username: payload.username,
    nickname: payload.nickname || payload.nickName,
    avatarUrl: payload.avatarUrl || payload.avatar,
    phone: payload.phone,
    userType: payload.userType,
    status: payload.status
  });
};

const normalizeAuthSession = (data) => {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const payload = data.data && typeof data.data === 'object' ? data.data : data;
  if (!payload.token && !payload.userInfo) {
    return null;
  }

  return {
    token: payload.token || '',
    userInfo: normalizeUserInfo(payload.userInfo) || buildLegacyUserInfo(payload)
  };
};

export const saveAuthSession = (session = {}) => {
  if (session.token) {
    wx.setStorageSync(AUTH_KEYS.TOKEN, session.token);
  }

  if (session.userInfo) {
    wx.setStorageSync(AUTH_KEYS.USER_INFO, normalizeUserInfo(session.userInfo));
  }
};

export const clearAuthSession = () => {
  wx.removeStorageSync(AUTH_KEYS.TOKEN);
  wx.removeStorageSync(AUTH_KEYS.USER_INFO);
};

export const getAuthSession = () => ({
  token: wx.getStorageSync(AUTH_KEYS.TOKEN) || '',
  userInfo: normalizeUserInfo(wx.getStorageSync(AUTH_KEYS.USER_INFO))
});

const loginWithCode = async (code, profile = {}) => {
  const data = await post('/user/wechat/login', {
    code,
    nickname: profile.nickname || profile.nickName || '',
    avatarUrl: profile.avatarUrl || profile.avatar || ''
  });

  const session = normalizeAuthSession(data) || {
    token: data?.token || '',
    userInfo: normalizeUserInfo(data?.userInfo) || buildLegacyUserInfo(data)
  };

  saveAuthSession(session);
  return session;
};

export const login = () => {
  return new Promise((resolve, reject) => {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (profileRes) => {
        wx.login({
          success: async (loginRes) => {
            if (!loginRes.code) {
              reject(new Error('登录失败'));
              return;
            }

            try {
              const session = await loginWithCode(loginRes.code, profileRes.userInfo || {});
              resolve(session);
            } catch (error) {
              reject(error);
            }
          },
          fail: () => reject(new Error('登录失败'))
        });
      },
      fail: () => reject(new Error('用户取消授权'))
    });
  });
};
