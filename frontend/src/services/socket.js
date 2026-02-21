import { io } from 'socket.io-client';


const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map(); // Store listeners: event -> Set of callbacks
    this.pendingEmits = []; // Store emits that happen before connection
  }

  connect(token) {
    if (this.socket?.connected) {
      return this.socket;
    }

    // Clean up existing socket
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    console.log('Initializing Socket.IO connection...');
    this.socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
      this._flushPendingEmits();
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    // Re-attach all stored listeners to the new socket instance
    this._attachListeners();

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    // Clear all listeners on explicit disconnect (logout)
    this.listeners.clear();
  }

  // Register a listener and store it so it survives reconnection
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    // If socket exists, attach immediately
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // Remove a listener
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(event);
      }
    }

    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  emit(event, data, callback) {
    if (this.socket && this.socket.connected) {
      if (typeof callback === 'function') {
        this.socket.emit(event, data, callback);
      } else {
        this.socket.emit(event, data);
      }
    } else {
        // Queue important events if disconnected (optional, strictly for sending)
        // For now, we only log warning or basic queueing could be added
        console.warn(`Socket not connected. Queuing event: ${event}`);
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }

  // Internal: Attach all stored listeners to the current socket
  _attachListeners() {
    if (!this.socket) return;

    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach((callback) => {
        // Avoid duplicate listeners if socket.io doesn't dedupe (it usually allows duplicates)
        // So we remove first to be safe
        this.socket.off(event, callback); 
        this.socket.on(event, callback);
      });
    });
  }

  _flushPendingEmits() {
      // Future implementation for robust offline sending
  }
}

export default new SocketService();