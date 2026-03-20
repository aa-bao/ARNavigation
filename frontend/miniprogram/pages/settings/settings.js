// pages/settings/settings.js
import { put, resolveAssetUrl, uploadFile } from '../../utils/request.js';
import { DEFAULT_USER_SETTINGS, loadUserSettingsSync, saveUserSettingsSync } from '../../utils/user-settings.js';

const app = getApp();

const normalizeUserInfo = (userInfo) => {
  if (!userInfo || typeof userInfo !== 'object') {
    return null;
  }

  return {
    ...userInfo,
    avatarUrl: resolveAssetUrl(userInfo.avatarUrl || userInfo.avatar || '')
  };
};

Page({
  data: {
    isLoggedIn: false,
    settings: {
      ...DEFAULT_USER_SETTINGS
    },
    appInfo: {
      version: '1.0.0',
      buildNumber: '2024031101',
      updateTime: '2024-03-11'
    },
    cacheInfo: {
      size: 0,
      lastClear: null
    },
    userInfo: null,
    permissions: {
      camera: false,
      microphone: false
    }
  },

  onLoad() {
    this.loadSettings();
    this.loadAuthState();
    this.checkPermissions();
    this.calculateCacheSize();
  },

  async onShow() {
    this.loadAuthState();
    this.checkPermissions();
  },

  loadAuthState() {
    const token = wx.getStorageSync('token');
    const userInfo = normalizeUserInfo(app.globalData.userInfo || wx.getStorageSync('userInfo') || null);
    const isLoggedIn = !!token;
    if (userInfo) {
      app.globalData.userInfo = userInfo;
      wx.setStorageSync('userInfo', userInfo);
    }
    this.setData({
      isLoggedIn,
      userInfo: isLoggedIn ? userInfo : null
    });
  },

  goToLogin() {
    wx.navigateTo({
      url: '/pages/login/login'
    });
  },

  loadSettings() {
    try {
      const savedSettings = loadUserSettingsSync();
      this.setData({
        settings: { ...this.data.settings, ...savedSettings }
      });
      app.updateUserSettings?.(savedSettings);
    } catch (error) {
      console.error('Load settings failed:', error);
    }
  },

  saveSettings() {
    try {
      const next = saveUserSettingsSync(this.data.settings);
      app.updateUserSettings?.(next);
    } catch (error) {
      console.error('Save settings failed:', error);
    }
  },

  async chooseAvatar() {
    if (!this.data.isLoggedIn) {
      this.goToLogin();
      return;
    }

    try {
      const chooseResult = await wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed']
      });
      const filePath = chooseResult.tempFiles?.[0]?.tempFilePath;
      if (!filePath) return;

      wx.showLoading({ title: '上传中...' });
      const uploadResult = await uploadFile('/user/avatar', filePath, 'file');
      const userInfo = normalizeUserInfo(await put('/user/profile/avatar', { avatarUrl: uploadResult.avatarUrl }));
      app.globalData.userInfo = userInfo;
      wx.setStorageSync('userInfo', userInfo);
      this.setData({ userInfo, isLoggedIn: true });
      wx.hideLoading();
      wx.showToast({
        title: '头像已更新',
        icon: 'success'
      });
    } catch (error) {
      wx.hideLoading();
      if (error?.errMsg && error.errMsg.includes('cancel')) return;
      wx.showToast({
        title: error?.message || '头像上传失败',
        icon: 'none'
      });
    }
  },

  checkPermissions() {
    wx.getSetting({
      success: (res) => {
        this.setData({
          permissions: {
            camera: res.authSetting['scope.camera'] === true,
            microphone: res.authSetting['scope.record'] === true
          }
        });
      }
    });
  },

  calculateCacheSize() {
    wx.getStorageInfo({
      success: (res) => {
        const sizeInMB = (res.currentSize / 1024).toFixed(2);
        this.setData({
          'cacheInfo.size': sizeInMB
        });
      }
    });
  },

  onSettingChange(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;

    this.setData({
      [`settings.${field}`]: value
    });

    this.saveSettings();
    this.applySetting(field, value);
  },

  applySetting(field, value) {
    switch (field) {
      case 'vibrationEnabled':
        wx.showToast({
          title: value ? '震动反馈已开启' : '震动反馈已关闭',
          icon: 'none'
        });
        break;
      case 'highAccuracyLocation':
        wx.showToast({
          title: value ? '扫码校准优先已开启' : '扫码校准优先已关闭',
          icon: 'none'
        });
        break;
      case 'autoStartAR':
        wx.showToast({
          title: value ? '自动启动AR已开启' : '自动启动AR已关闭',
          icon: 'none'
        });
        break;
      case 'darkMode':
        wx.showToast({
          title: '暗黑模式设置已保存',
          icon: 'none'
        });
        break;
      case 'fontSize':
        wx.showToast({
          title: '字体大小已更新',
          icon: 'none'
        });
        break;
      default:
        break;
    }
  },

  goToPermissionSettings() {
    wx.openSetting({
      success: () => {
        this.checkPermissions();
      }
    });
  },

  clearCache() {
    wx.showModal({
      title: '清除缓存',
      content: `确定要清除 ${this.data.cacheInfo.size}MB 的缓存数据吗？`,
      confirmColor: '#f5222d',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '清除中...' });
          wx.clearStorage({
            success: () => {
              this.saveSettings();
              this.setData({
                'cacheInfo.size': 0,
                'cacheInfo.lastClear': Date.now()
              });
              wx.hideLoading();
              wx.showToast({
                title: '缓存已清除',
                icon: 'success'
              });
            },
            fail: () => {
              wx.hideLoading();
              wx.showToast({
                title: '清除失败',
                icon: 'none'
              });
            }
          });
        }
      }
    });
  },

  checkUpdate() {
    wx.showLoading({ title: '检查中...' });
    setTimeout(() => {
      wx.hideLoading();
      wx.showModal({
        title: '已经是最新版本',
        content: `当前版本：${this.data.appInfo.version}\n无需更新`,
        showCancel: false,
        confirmText: '确定'
      });
    }, 1500);
  },

  aboutUs() {
    wx.showModal({
      title: '关于医院AR导航',
      content: `版本：${this.data.appInfo.version}\n\n医院AR导航系统是专为医院室内导航设计的智能应用，结合AR技术为用户提供直观、精准的导航服务。`,
      showCancel: false,
      confirmText: '知道了'
    });
  },

  feedback() {
    wx.navigateTo({
      url: '/pages/feedback/feedback'
    });
  },

  helpCenter() {
    wx.navigateTo({
      url: '/pages/help/help'
    });
  },

  privacyPolicy() {
    wx.navigateTo({
      url: '/pages/privacy/privacy'
    });
  },

  userAgreement() {
    wx.navigateTo({
      url: '/pages/agreement/agreement'
    });
  }
});
