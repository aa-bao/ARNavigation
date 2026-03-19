import { del, get, post } from '../utils/request.js';

export const getNodeByCode = (nodeCode) => {
  return get(`/navigation/node/code/${encodeURIComponent(nodeCode)}`);
};

export const getNavigationSegment = (startCode, targetId) => {
  return post('/navigation/segment', {
    startCode,
    targetId
  });
};

export const getNavigationNodes = () => get('/navigation/nodes');

export const getNavigationEdges = () => get('/navigation/edges');

export const getDestinations = (params = {}) => get('/navigation/destinations', params);

export const createNavigationHistory = (payload) => post('/navigation/recent', {
  userId: payload.userId,
  nodeId: payload.targetNodeId
});

export const getRecentNavigationHistory = async (params = {}) => {
  if (params.userId) {
    try {
      const recent = await get(`/navigation/recent/${params.userId}`, {
        limit: params.limit || 6
      });
      return Array.isArray(recent) ? recent : [];
    } catch (error) {
      return [];
    }
  }

  return get('/navigation/history/recent', params);
};

export const clearRecentNavigationHistory = () => del('/navigation/history');

export const saveRecentNavigation = (payload) => post('/navigation/recent', payload);
