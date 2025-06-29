import { apiClient } from './apiClient';

// Get all sessions (admin only)
export const getAllSessions = async () => {
  try {
    const response = await apiClient.get('/session');
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Terminate a specific session (admin only)
export const terminateSession = async (sessionId) => {
  try {
    const response = await apiClient.post(`/session/${sessionId}/terminate`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Terminate all active sessions (admin only)
export const terminateAllSessions = async () => {
  try {
    const response = await apiClient.post('/session/terminate-all');
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Create a new session
export const createSession = async (sessionData) => {
  try {
    const response = await apiClient.post('/session', sessionData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Store session cookies
export const storeSessionCookies = async (sessionId, encryptedCookies) => {
  try {
    const response = await apiClient.post(`/session/${sessionId}/cookies`, {
      encryptedCookies
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get session cookies
export const getSessionCookies = async (sessionId) => {
  try {
    const response = await apiClient.get(`/session/${sessionId}/cookies`);
    return response.data;
  } catch (error) {
    throw error;
  }
}; 