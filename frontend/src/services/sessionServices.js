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

// Create a new session from existing cookies
export const createSessionFromCookies = async (sessionId) => {
  try {
    const response = await apiClient.post(`/session/${sessionId}/clone`);
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

// Get current user's sessions
export const getCurrentUserSessions = async () => {
  try {
    const response = await apiClient.get('/session/my-sessions');
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Trigger cookie extraction for a session
export const extractCookiesForSession = async (sessionId) => {
  try {
    const response = await apiClient.post(`/session/${sessionId}/extract-cookies`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Terminate all sessions for a user (admin only)
export const terminateUserSessions = async (userId) => {
  try {
    const response = await apiClient.post(`/session/terminate-user/${userId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getActiveSession = async () => {
  try {
    const response = await apiClient.get('/session/active');
    return response.data.activeSession;
  } catch (error) {
    throw error;
  }
};

export const terminateMyActiveSession = async () => {
  try {
    const response = await apiClient.post('/session/terminate-mine');
    return response.data;
  } catch (error) {
    throw error;
  }
};