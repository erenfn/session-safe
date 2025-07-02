export function parseLogLine(line, idx) {
  // Example: [2025-06-30T23:21:34.653Z] [INFO] [SESSION_SERVICE] Message here
  const logRegex = /^\[(.*?)\] \[(.*?)\] \[(.*?)\] (.*)$/;
  const match = line.match(logRegex);
  if (!match) return null;
  const [, timestamp, level, source, message] = match;
  return {
    id: idx,
    timestamp,
    level,
    source,
    message,
  };
}

export const getLevelColor = (level) => {
    switch (level) {
      case 'ERROR':
        return 'error';
      case 'WARNING':
        return 'warning';
      case 'INFO':
        return 'info';
      default:
        return 'default';
    }
  };

