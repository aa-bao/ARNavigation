import { post, put, resolveAssetUrl, uploadFile } from './request.js';

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
    avatarUrl: resolveAssetUrl(avatarUrl)
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

const getAvatarValue = (profile = {}) => String(profile.avatarUrl || profile.avatar || '').trim();

const isPersistentAvatar = (avatarUrl) => {
  if (!avatarUrl) {
    return false;
  }

  if (/^\/(uploads|static)\//i.test(avatarUrl)) {
    return true;
  }

  if (!/^https?:\/\//i.test(avatarUrl)) {
    return false;
  }

  return !/^https?:\/\/(tmp|store)\//i.test(avatarUrl);
};

const loginWithCode = async (code, profile = {}) => {
  const rawAvatarUrl = getAvatarValue(profile);
  const loginPayload = {
    code,
    nickname: profile.nickname || profile.nickName || '',
    avatarUrl: ''
  };

  if (isPersistentAvatar(rawAvatarUrl)) {
    loginPayload.avatarUrl = rawAvatarUrl;
  }

  console.log('wechat login: exchanging code for session');
  const data = await post('/user/wechat/login', loginPayload);

  const session = normalizeAuthSession(data) || {
    token: data?.token || '',
    userInfo: normalizeUserInfo(data?.userInfo) || buildLegacyUserInfo(data)
  };

  saveAuthSession(session);

  try {
    const uploadedAvatarUrl = await syncWechatAvatar(rawAvatarUrl);
    if (uploadedAvatarUrl) {
      const updatedUserInfo = await put('/user/profile/avatar', { avatarUrl: uploadedAvatarUrl });
      session.userInfo = normalizeUserInfo(updatedUserInfo) || session.userInfo;
      saveAuthSession(session);
    }
  } catch (error) {
    console.warn('wechat login: avatar sync failed', error);
  }

  return session;
};

const isTemporaryWechatAvatar = (avatarUrl) => {
  if (!avatarUrl) {
    return false;
  }

  const value = String(avatarUrl).trim();
  if (!value) {
    return false;
  }

  if (isPersistentAvatar(value)) {
    return false;
  }

  return true;
};

const isLocalFilePath = (path = '') => /^(wxfile|wdfile):\/\//i.test(String(path).trim());

const downloadTempAvatar = (url) => new Promise((resolve, reject) => {
  wx.downloadFile({
    url,
    success: (res) => {
      if (res.statusCode >= 200 && res.statusCode < 300 && res.tempFilePath) {
        resolve(res.tempFilePath);
        return;
      }
      reject(new Error('涓嬭浇澶村儚澶辫触'));
    },
    fail: () => reject(new Error('涓嬭浇澶村儚澶辫触'))
  });
});

const syncWechatAvatar = async (avatarUrl) => {
  if (!isTemporaryWechatAvatar(avatarUrl)) {
    return '';
  }

  console.log('wechat login: uploading chosen avatar');
  let uploadPath = avatarUrl;

  if (!isLocalFilePath(uploadPath)) {
    uploadPath = await downloadTempAvatar(uploadPath);
  }

  const uploadResult = await uploadFile('/user/avatar', uploadPath);
  return uploadResult?.avatarUrl || '';
};

export const login = (profile = {}) => {
  return new Promise((resolve, reject) => {
    console.log('wechat login: requesting login code');
    wx.login({
      success: async (loginRes) => {
        if (!loginRes.code) {
          reject(new Error('微信登录失败，未获取到 code'));
          return;
        }

        try {
          console.log('wechat login: wx.login code received');
          const session = await loginWithCode(loginRes.code, profile);
          resolve(session);
        } catch (error) {
          reject(error);
        }
      },
      fail: () => reject(new Error('微信登录失败'))
    });
  });
};
