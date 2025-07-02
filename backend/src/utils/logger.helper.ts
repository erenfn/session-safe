import * as fs from 'fs';
import * as path from 'path';

const LOG_FILE_PATH = path.resolve(__dirname, '../../data/session-service.log');

function getTimestamp() {
  return new Date().toISOString();
}

function writeLog(level: string, message: string, ...args: any[]) {
  const logEntry = `[${getTimestamp()}] [${level}] ${message} ${args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : arg)).join(' ')}\n`;
  fs.appendFileSync(LOG_FILE_PATH, logEntry, { encoding: 'utf8' });
  if (level === 'INFO') {
    console.log(logEntry.trim());
  } else if (level === 'ERROR') {
    console.error(logEntry.trim());
  }
}

export const Logger = {
  info: (message: string, ...args: any[]) => {
    writeLog('INFO', message, ...args);
  },
  error: (message: string, ...args: any[]) => {
    writeLog('ERROR', message, ...args);
  },
  getLogs: (limit: number = 1000): string => {
    if (!fs.existsSync(LOG_FILE_PATH)) return '';
    const logs = fs.readFileSync(LOG_FILE_PATH, 'utf8').split('\n');
    return logs.slice(-limit).join('\n');
  }
}; 