import { login } from '../../utils/auth.js';

const app = getApp();

Page({
  data: {
    submitting: false
  },

  onShow() {
    const token = wx.getStorageSync('token');
    if (token) {
      wx.switchTab({
        url: '/pages/index/index'
      });
    }
  },

  async handleWechatAuthorizeLogin() {
    if (this.data.submitting) {
      return;
    }

    this.setData({ submitting: true });
    try {
      const session = await login();
      app.globalData.userInfo = session.userInfo || wx.getStorageSync('userInfo') || null;

      wx.showToast({
        title: '登录成功',
        icon: 'success'
      });

      wx.switchTab({
        url: '/pages/index/index'
      });
    } catch (error) {
      const message = error?.message || '登录失败，请重试';
      wx.showToast({
        title: message,
        icon: 'none'
      });
    } finally {
      this.setData({ submitting: false });
    }
  }
});
