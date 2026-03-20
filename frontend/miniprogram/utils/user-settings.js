export const DEFAULT_USER_SETTINGS = Object.freeze({
  voiceEnabled: true,
  vibrationEnabled: true,
  highAccuracyLocation: true,
  autoStartAR: false,
  darkMode: false,
  fontSize: 'normal'
});

export const normalizeUserSettings = (raw) => ({
  ...DEFAULT_USER_SETTINGS,
  ...(raw && typeof raw === 'object' ? raw : {})
});

export const loadUserSettingsSync = () => {
  try {
    const saved = wx.getStorageSync('userSettings');
    return normalizeUserSettings(saved);
  } catch (error) {
    return { ...DEFAULT_USER_SETTINGS };
  }
};

export const saveUserSettingsSync = (settings) => {
  const next = normalizeUserSettings(settings);
  wx.setStorageSync('userSettings', next);
  return next;
};
