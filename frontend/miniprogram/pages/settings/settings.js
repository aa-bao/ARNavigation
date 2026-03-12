// pages/settings/settings.js
import { clearStorage } from '../../utils/storage.js';

const app = getApp();

Page({
  data: {
    // 用户设置
    settings: {
      voiceEnabled: true,
      vibrationEnabled: true,
      highAccuracyLocation: true,
      autoStartAR: false,
      darkMode: false,
      fontSize: 'normal' // small, normal, large
    },

    // 应用信息
    appInfo: {
      version: '1.0.0',
      buildNumber: '2024031101',
      updateTime: '2024-03-11'
    },

    // 缓存信息
    cacheInfo: {
      size: 0,
      lastClear: null
    },

    // 用户信息
    userInfo: null,

    // 权限状态
    permissions: {
      location: false,
      camera: false,
      microphone: false
    }
  },

  onLoad(options) {
    console.log('Settings page loaded');
    this.loadSettings();
    this.loadUserInfo();
    this.checkPermissions();
    this.calculateCacheSize();
  },

  onShow() {
    // 页面显示时刷新权限状态
    this.checkPermissions();
  },

  onReady() {
    // 页面准备完成
  },

  // 加载设置
  loadSettings() {
    try {
      const savedSettings = wx.getStorageSync('userSettings');
      if (savedSettings) {
        this.setData({
          settings: { ...this.data.settings, ...savedSettings }
        });
      }
    } catch (error) {
      console.error('Load settings failed:', error);
    }
  },

  // 保存设置
  saveSettings() {
    try {
      wx.setStorageSync('userSettings', this.data.settings);
    } catch (error) {
      console.error('Save settings failed:', error);
    }
  },

  // 加载用户信息
  loadUserInfo() {
    const userInfo = app.globalData.userInfo;
    if (userInfo) {
      this.setData({ userInfo });
    }
  },

  // 检查权限
  checkPermissions() {
    wx.getSetting({
      success: (res) => {
        this.setData({
          permissions: {
            location: res.authSetting['scope.userLocation'] === true,
            camera: res.authSetting['scope.camera'] === true,
            microphone: res.authSetting['scope.record'] === true
          }
        });
      }
    });
  },

  // 计算缓存大小
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

  // 设置开关切换
  onSettingChange(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;

    this.setData({
      [`settings.${field}`]: value
    });

    this.saveSettings();

    // 应用特定设置
    this.applySetting(field, value);
  },

  // 应用设置
  applySetting(field, value) {
    switch (field) {
      case 'voiceEnabled':
        // 语音设置已更改
        wx.showToast({
          title: value ? '语音播报已开启' : '语音播报已关闭',
          icon: 'none'
        });
        break;

      case 'darkMode':
        // 暗黑模式设置
        wx.showToast({
          title: '暗黑模式设置已保存',
          icon: 'none'
        });
        break;

      case 'fontSize':
        // 字体大小设置
        wx.showToast({
          title: '字体大小已更改',
          icon: 'none'
        });
        break;
    }
  },

  // 前往权限设置
  goToPermissionSettings() {
    wx.openSetting({
      success: (res) => {
        console.log('Setting opened:', res);
        this.checkPermissions();
      }
    });
  },

  // 清除缓存
  clearCache() {
    wx.showModal({
      title: '清除缓存',
      content: `确定要清除 ${this.data.cacheInfo.size}MB 的缓存数据吗？`,
      confirmColor: '#f5222d',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '清除中...' });

          // 清除缓存
          wx.clearStorage({
            success: () => {
              // 重新加载必要数据
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

  // 检查更新
  checkUpdate() {
    wx.showLoading({ title: '检查中...' });

    // 模拟检查更新
    setTimeout(() => {
      wx.hideLoading();
      wx.showModal({
        title: '已是最新版本',
        content: `当前版本：${this.data.appInfo.version}\n无需更新`,
        showCancel: false,
        confirmText: '确定'
      });
    }, 1500);
  },

  // 关于我们
  aboutUs() {
    wx.showModal({
      title: '关于医院AR导航',
      content: '版本：' + this.data.appInfo.version + '\n\n医院AR导航系统是专为医院室内导航设计的智能应用，结合AR技术为用户提供直观、精准的导航服务。\n\n© 2024 医院AR导航团队',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 反馈问题
  feedback() {
    wx.navigateTo({
      url: '/pages/feedback/feedback'
    });
  },

  // 帮助中心
  helpCenter() {
    wx.navigateTo({
      url: '/pages/help/help'
    });
  },

  // 隐私政策
  privacyPolicy() {
    wx.navigateTo({
      url: '/pages/privacy/privacy'
    });
  },

  // 用户协议
  userAgreement() {
    wx.navigateTo({
      url: '/pages/agreement/agreement'
    });
  }
});
