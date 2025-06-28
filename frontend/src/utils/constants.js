// API constants
//local environment
export const BASE_URL = 'localhost:3000';
export const API_BASE_URL = `http://${BASE_URL}/api/`;

//staging environment
// export const BASE_URL = 'onboarding-demo.bluewavelabs.ca';
// export const API_BASE_URL = `https://${BASE_URL}/api/`;

export const roles = Object.freeze(['admin', 'member']);
export const URL_REGEX = Object.freeze({
  PROTOCOL: /^(https?:\/\/)/,
  DOMAIN: /^https?:\/\/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/,
});
