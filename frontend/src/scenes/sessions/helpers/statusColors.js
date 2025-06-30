/**
 * Helper function to get the appropriate color for session status
 * @param {string} status - The session status
 * @returns {string} - CSS color value
 */
export const getStatusColor = (status) => {
  switch (status) {
    case 'active':
      return '#10b981'; // green
    case 'pending':
      return '#f59e0b'; // amber
    case 'completed':
      return '#3b82f6'; // blue
    case 'destroyed':
      return '#ef4444'; // red
    default:
      return 'var(--second-text-color)';
  }
}; 