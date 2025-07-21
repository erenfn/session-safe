/**
 * Builds the correct noVNC URL for development vs production environments
 * @param {Object} sessionData - Session data containing novncUrl and novncPort
 * @param {string} sessionData.novncUrl - The production noVNC URL
 * @param {string} sessionData.novncPort - The noVNC port number
 * @returns {string} The appropriate noVNC URL for the current environment
 */
export const buildNoVncUrl = (sessionData) => {
  const { novncUrl, novncPort } = sessionData;
  try {
    const urlObj = new URL(novncUrl);
    const password = urlObj.searchParams.get('password');

    // In development (localhost) fall back to direct port access
    if (process.env.NODE_ENV === 'development' && novncPort) {
      return `http://localhost:${novncPort}/vnc.html?autoconnect=true&password=${password}&resize=scale`;
    }

    // Otherwise use the provided URL (production)
    return novncUrl;
  } catch (e) {
    return novncUrl;
  }
}; 