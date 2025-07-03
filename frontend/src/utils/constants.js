// API constants
const isDevelopment = import.meta.env.VITE_NODE_ENV === 'development';

export const BASE_URL = isDevelopment ? 'http://localhost:3000' : 'https://safesession.xyz';

export const API_BASE_URL = `${BASE_URL}/api/`;

export const roles = Object.freeze(['admin', 'member']);
export const URL_REGEX = Object.freeze({
  PROTOCOL: /^(https?:\/\/)/,
  DOMAIN: /^https?:\/\/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/,
});
