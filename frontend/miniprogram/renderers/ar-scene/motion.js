const toRadians = (value) => (Number(value) || 0) * (Math.PI / 180);

const startMotionTracking = (onChange) => {
  if (!wx.startDeviceMotionListening) {
    return Promise.resolve(() => {});
  }

  return new Promise((resolve, reject) => {
    const listener = (payload) => {
      onChange({
        alpha: toRadians(payload.alpha),
        beta: toRadians(payload.beta),
        gamma: toRadians(payload.gamma)
      });
    };

    wx.startDeviceMotionListening({
      interval: 'game',
      success: () => {
        wx.onDeviceMotionChange(listener);
        resolve(() => {
          wx.offDeviceMotionChange(listener);
          wx.stopDeviceMotionListening();
        });
      },
      fail: (error) => reject(error)
    });
  });
};

module.exports = {
  startMotionTracking
};
