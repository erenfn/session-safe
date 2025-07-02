import { EventSourcePolyfill } from 'event-source-polyfill';
import { API_BASE_URL } from '../utils/constants';

export default class LogsMonitor {
  constructor() {
    this.url = `${API_BASE_URL}session/logs`;
    this.eventSource = null;
    this.onLogs = null;
    this.onError = null;
    this.onClose = null;
    this.onOpen = null;
    this.isConnected = false;
    this.lastNLines = 50;
  }

  start(lastNLines = 50) {
    if (this.eventSource) {
      return;
    }

    this.lastNLines = lastNLines;
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      this.onError?.(new Error('No authentication token found'));
      return;
    }

    try {
      const urlWithParams = `${this.url}?lastNLines=${this.lastNLines}`;
      this.eventSource = new EventSourcePolyfill(urlWithParams, {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      this.eventSource.onopen = () => {
        this.isConnected = true;
        this.onOpen?.();
      };

      this.eventSource.onmessage = (event) => {
        try {
          const logLine = event.data;
          this.onLogs?.(logLine);
        } catch (error) {
          this.onError?.(error);
        }
      };

      this.eventSource.onerror = (error) => {
        if (error.message?.includes('Failed to fetch') || error.type === 'error') {
          this.tryWithoutCredentials(token);
        } else {
          this.isConnected = false;
          this.onError?.(new Error('Failed to connect to logs stream'));
          this.stop();
        }
      };
    } catch (error) {
      this.onError?.(error);
    }
  }

  tryWithoutCredentials(token) {
    try {
      this.eventSource = new EventSourcePolyfill(this.url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      this.eventSource.onopen = () => {
        this.isConnected = true;
        this.onOpen?.();
      };

      this.eventSource.onmessage = (event) => {
        try {
          const logLine = event.data;
          this.onLogs?.(logLine);
        } catch (error) {
          this.onError?.(error);
        }
      };

      this.eventSource.onerror = (error) => {
        this.isConnected = false;
        this.onError?.(new Error('Failed to connect to logs stream'));
        this.stop();
      };
    } catch (error) {
      this.onError?.(error);
    }
  }

  stop() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.isConnected = false;
      this.onClose?.();
    }
  }

  isConnected() {
    return this.isConnected;
  }

  // Setter methods for event handlers
  setOnLogs(callback) {
    this.onLogs = callback;
  }

  setOnError(callback) {
    this.onError = callback;
  }

  setOnClose(callback) {
    this.onClose = callback;
  }

  setOnOpen(callback) {
    this.onOpen = callback;
  }
} 