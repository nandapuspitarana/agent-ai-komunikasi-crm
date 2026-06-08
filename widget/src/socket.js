import { io } from 'socket.io-client';

/**
 * Socket.io Client Manager for Widget
 * Handles real-time communication between widget and Omni-Inbox dashboard
 */

export class SocketManager {
  constructor(serverUrl, tenantId, sessionId) {
    this.serverUrl = serverUrl;
    this.tenantId = tenantId;
    this.sessionId = sessionId;
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
  }

  /**
   * Initialize Socket.io connection
   * @returns {Promise<void>}
   */
  async connect() {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.serverUrl, {
          path: '/api/socket',
          query: {
            sessionId: this.sessionId,
            tenantId: this.tenantId,
            type: 'widget'
          },
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 5,
          transports: ['websocket', 'polling']
        });

        // Connection established
        this.socket.on('connect', () => {
          this.isConnected = true;
          console.log('[Widget Socket] Connected to server');
          this._emit('connected', { sessionId: this.sessionId });
          resolve();
        });

        // Connection failed
        this.socket.on('connect_error', (error) => {
          console.error('[Widget Socket] Connection error:', error);
          this._emit('connection_error', { error: error.message });
        });

        // Disconnected from server
        this.socket.on('disconnect', (reason) => {
          this.isConnected = false;
          console.warn('[Widget Socket] Disconnected:', reason);
          this._emit('disconnected', { reason });
        });

        // Incoming message from agent/flow
        this.socket.on('message', (data) => {
          console.log('[Widget Socket] Message received:', data);
          this._emit('message', data);
        });

        // Agent typing indicator
        this.socket.on('agent_typing', (data) => {
          console.log('[Widget Socket] Agent typing:', data);
          this._emit('agent_typing', data);
        });

        // Agent stopped typing
        this.socket.on('agent_typing_stop', (data) => {
          console.log('[Widget Socket] Agent typing stopped');
          this._emit('agent_typing_stop', data);
        });

        // Session ended
        this.socket.on('session_ended', (data) => {
          console.log('[Widget Socket] Session ended:', data);
          this._emit('session_ended', data);
        });

        // Flow execution event
        this.socket.on('flow_event', (data) => {
          console.log('[Widget Socket] Flow event:', data);
          this._emit('flow_event', data);
        });

        // Widget configuration updated
        this.socket.on('config_updated', (data) => {
          console.log('[Widget Socket] Config updated:', data);
          this._emit('config_updated', data);
        });

        // Error handling
        this.socket.on('error', (error) => {
          console.error('[Widget Socket] Error:', error);
          this._emit('socket_error', { error });
        });

        // Set connection timeout
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('Socket connection timeout'));
          }
        }, 5000);

      } catch (error) {
        console.error('[Widget Socket] Failed to initialize:', error);
        reject(error);
      }
    });
  }

  /**
   * Send message to inbox/agent
   * @param {Object} messageData - Message object { text, metadata, etc }
   * @returns {Promise<void>}
   */
  sendMessage(messageData) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('Socket not connected'));
        return;
      }

      const payload = {
        sessionId: this.sessionId,
        tenantId: this.tenantId,
        timestamp: new Date().toISOString(),
        ...messageData
      };

      this.socket.emit('send_message', payload, (ack) => {
        if (ack && ack.success) {
          console.log('[Widget Socket] Message sent successfully');
          resolve(ack);
        } else {
          console.error('[Widget Socket] Message send failed:', ack);
          reject(new Error(ack?.error || 'Failed to send message'));
        }
      });
    });
  }

  /**
   * Send typing indicator to inbox
   * @returns {void}
   */
  sendTypingIndicator() {
    if (this.isConnected) {
      this.socket.emit('user_typing', {
        sessionId: this.sessionId,
        tenantId: this.tenantId
      });
    }
  }

  /**
   * Stop typing indicator
   * @returns {void}
   */
  stopTypingIndicator() {
    if (this.isConnected) {
      this.socket.emit('user_typing_stop', {
        sessionId: this.sessionId,
        tenantId: this.tenantId
      });
    }
  }

  /**
   * Send form submission to flow engine
   * @param {Object} formData - Form data to process
   * @returns {Promise<void>}
   */
  submitForm(formData) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('Socket not connected'));
        return;
      }

      const payload = {
        sessionId: this.sessionId,
        tenantId: this.tenantId,
        type: 'form_submission',
        data: formData,
        timestamp: new Date().toISOString()
      };

      this.socket.emit('form_submit', payload, (ack) => {
        if (ack && ack.success) {
          console.log('[Widget Socket] Form submitted successfully');
          resolve(ack);
        } else {
          console.error('[Widget Socket] Form submission failed:', ack);
          reject(new Error(ack?.error || 'Failed to submit form'));
        }
      });
    });
  }

  /**
   * Update widget state/context
   * @param {Object} stateUpdate - State updates
   * @returns {Promise<void>}
   */
  updateContext(stateUpdate) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('Socket not connected'));
        return;
      }

      const payload = {
        sessionId: this.sessionId,
        tenantId: this.tenantId,
        type: 'context_update',
        data: stateUpdate,
        timestamp: new Date().toISOString()
      };

      this.socket.emit('update_context', payload, (ack) => {
        if (ack && ack.success) {
          console.log('[Widget Socket] Context updated');
          resolve(ack);
        } else {
          reject(new Error(ack?.error || 'Failed to update context'));
        }
      });
    });
  }

  /**
   * Register listener for socket event
   * @param {string} eventName - Event name to listen for
   * @param {Function} callback - Callback function
   * @returns {void}
   */
  on(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName).push(callback);
  }

  /**
   * Remove listener
   * @param {string} eventName - Event name
   * @param {Function} callback - Callback to remove
   * @returns {void}
   */
  off(eventName, callback) {
    if (this.listeners.has(eventName)) {
      const callbacks = this.listeners.get(eventName);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Internal method to emit events to listeners
   * @private
   */
  _emit(eventName, data) {
    if (this.listeners.has(eventName)) {
      this.listeners.get(eventName).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[Widget Socket] Error in listener for ${eventName}:`, error);
        }
      });
    }
  }

  /**
   * Disconnect from server
   * @returns {void}
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.isConnected = false;
      console.log('[Widget Socket] Disconnected');
    }
  }

  /**
   * Get connection status
   * @returns {boolean}
   */
  getStatus() {
    return this.isConnected;
  }

  /**
   * Reconnect to server
   * @returns {Promise<void>}
   */
  reconnect() {
    this.disconnect();
    return this.connect();
  }
}

export default SocketManager;
