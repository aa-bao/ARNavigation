import { clearAuthSession, login } from '../../utils/auth.js';

const app = getApp();

Page({
  data: {
    submitting: false,
    avatarUrl: '',
    nickname: ''
  },

  async onShow() {
    const authenticated = await app.isAuthenticated();
    if (authenticated) {
      wx.switchTab({
        url: '/pages/index/index'
      });
    }
  },

  handleChooseAvatar(event) {
    const avatarUrl = event?.detail?.avatarUrl || '';
    this.setData({ avatarUrl });
  },

  handleNicknameInput(event) {
    const nickname = event?.detail?.value || '';
    this.setData({ nickname });
  },

  async handleWechatAuthorizeLogin() {
    if (this.data.submitting) {
      return;
    }

    if (!this.data.avatarUrl) {
      wx.showToast({
        title: '请先点击头像完成授权',
        icon: 'none'
      });
      return;
    }

    if (!this.data.nickname.trim()) {
      wx.showToast({
        title: '请先填写昵称',
        icon: 'none'
      });
      return;
    }

    this.setData({ submitting: true });
    try {
      clearAuthSession();
      const session = await login({
        nickname: this.data.nickname.trim(),
        nickName: this.data.nickname.trim(),
        avatarUrl: this.data.avatarUrl
      });
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
