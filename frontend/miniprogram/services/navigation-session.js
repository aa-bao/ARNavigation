const tryParseJson = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
};

const toStringId = (value) => {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  return String(value);
};

const isNumericString = (value) => /^[0-9]+$/.test(String(value || '').trim());

export const parseNavigationScanResult = (rawResult) => {
  const rawText = toStringId(
    typeof rawResult === 'string'
      ? rawResult.trim()
      : rawResult?.result ?? rawResult?.nodeCode ?? rawResult?.id ?? ''
  );

  const payload = typeof rawResult === 'object' && rawResult !== null
    ? rawResult
    : tryParseJson(rawText);

  const payloadNodeCode = toStringId(payload?.nodeCode || payload?.code || payload?.node_id || payload?.nodeId);
  const payloadNodeId = toStringId(payload?.id ?? payload?.nodeId ?? payload?.node_id);
  const fallbackCode = isNumericString(rawText) ? rawText : '';

  return {
    rawText,
    payload,
    source: payload ? 'json' : 'string',
    nodeCode: payloadNodeCode || payloadNodeId || rawText || fallbackCode,
    nodeId: payloadNodeId || (isNumericString(rawText) ? rawText : ''),
    isJson: Boolean(payload)
  };
};

export const resolveScanNodeCode = (rawResult) => parseNavigationScanResult(rawResult).nodeCode;

export const getScanNodeCandidates = (rawResult) => {
  const scanResult = parseNavigationScanResult(rawResult);
  return {
    ...scanResult,
    candidateCodes: [
      scanResult.nodeCode,
      scanResult.nodeId,
      scanResult.rawText
    ].filter(Boolean)
  };
};

export const getNavigationSession = (app) => app?.globalData?.navigationSession || null;

export const setNavigationSession = (app, session) => {
  if (!app?.globalData) {
    return;
  }

  app.globalData.navigationSession = session;
  app.globalData.currentNavigationMode = session?.currentMode || 'compass';
};

export const clearNavigationSession = (app) => {
  if (!app?.globalData) {
    return;
  }

  app.globalData.navigationSession = null;
  app.globalData.currentNavigationMode = 'compass';
};

export const setNavigationMode = (app, mode) => {
  if (!app?.globalData) {
    return;
  }

  app.globalData.currentNavigationMode = mode;
  if (app.globalData.navigationSession) {
    app.globalData.navigationSession = {
      ...app.globalData.navigationSession,
      currentMode: mode
    };
  }
};

export const scanNodeCode = () => {
  return new Promise((resolve, reject) => {
    wx.scanCode({
      onlyFromCamera: true,
      scanType: ['qrCode'],
      success: (result) => resolve(resolveScanNodeCode(result.result)),
      fail: (error) => reject(error)
    });
  });
};

export const scanNavigationTarget = () => {
  return new Promise((resolve, reject) => {
    wx.scanCode({
      onlyFromCamera: true,
      scanType: ['qrCode'],
      success: (result) => resolve(getScanNodeCandidates(result.result)),
      fail: (error) => reject(error)
    });
  });
};
