const formatVoiceText = (text = '') => {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return '';
  }
  return normalized.length > 14 ? `${normalized.slice(0, 14)}...` : normalized;
};

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

export const emitVoiceBroadcast = (settings = {}, text = '') => {
  if (settings?.voiceEnabled === false) {
    return;
  }

  const title = formatVoiceText(text);
  if (!title) {
    return;
  }

  // Mini Program has no built-in TTS in this project yet; use a unified "voice hint"
  // channel so we can swap in true TTS later without touching call sites.
  wx.showToast({
    title,
    icon: 'none',
    duration: 1500
  });
};
