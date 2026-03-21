export const emitVibrationFeedback = (settings = {}, type = 'short') => {
  if (settings?.vibrationEnabled === false) {
    return;
  }

  if (type === 'long') {
    wx.vibrateLong?.();
    return;
  }

  wx.vibrateShort?.();
};
