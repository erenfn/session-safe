// API constants
const isDevelopment = true;

export const BASE_URL = isDevelopment ? 'http://localhost' : 'https://safesession.xyz';

export const API_BASE_URL = isDevelopment
  ? `${BASE_URL}:3000/api/`
  : `${BASE_URL}/api/`;
  
export const roles = Object.freeze(['admin', 'member']);
export const URL_REGEX = Object.freeze({
  PROTOCOL: /^(https?:\/\/)/,
  DOMAIN: /^https?:\/\/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/,
});
