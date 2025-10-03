// =============================================================================
// WebSocket Server - Production Ready
// =============================================================================
// Real-time communication server with authentication and rate limiting

const WebSocket = require('ws');
const { logger } = require('./logging');
const { authenticateToken } = require('./auth');

class WebSocketServer {
  constructor(server, options = {}) {
    this.wss = new WebSocket.Server({
      server,
      path: '/ws',
      verifyClient: this.verifyClient.bind(this),
      ...options
    });

    this.clients = new Map();
    this.subscriptions = new Map();
    this.messageQueue = new Map();
    this.rateLimiters = new Map();
    // Configuration
    this.config = {
      maxConnections: 1000,
      messageRateLimit: 100, // messages per minute
      heartbeatInterval: 30000, // 30 seconds
      cleanupInterval: 60000, // 1 minute
      maxMessageSize: 1024 * 1024, // 1MB
      ...options
    };

    this.setupEventHandlers();
    this.startHeartbeat();
    this.startCleanup();
    logger.info('WebSocket server initialized');
  }

  setupEventHandlers() {
    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    this.wss.on('error', (error) => {
      logger.error('WebSocket server error:', error);
    });
  }

  async verifyClient(info) {
    try {
      const token = this.extractToken(info.req.url);
      if (!token) {
        return false;
      }

      const user = await authenticateToken(token);
      if (!user) {
        return false;
      }

      // Store user info for later use
      info.user = user;
      return true;
    } catch (error) {
      logger.error('WebSocket authentication error:', error);
      return false;
    }
  }

  extractToken(url) {
    const querystring = require('querystring');
    const urlParts = url.split('?');
    if (urlParts.length < 2) {return null;}
    const params = querystring.parse(urlParts[1]);
    return params.token || params.access_token;
  }

  handleConnection(ws, req) {
    const user = req.user;
    const clientId = this.generateClientId();
    // Store client information
    this.clients.set(clientId, {
      ws,
      user,
      connectedAt: Date.now(),
      lastHeartbeat: Date.now(),
      subscriptions: new Set(),
      messageCount: 0,
      lastMessageTime: Date.now()
    });

    // Initialize rate limiter for this client
    this.rateLimiters.set(clientId, {
      count: 0,
      resetTime: Date.now() + 60000 // Reset every minute
    });

    logger.info(`WebSocket client connected: ${clientId} (User: ${user.id})`);

    // Setup client event handlers
    this.setupClientHandlers(clientId, ws);

    // Send welcome message
    this.sendToClient(clientId, {
      type: 'welcome',
      data: {
        clientId,
        userId: user.id,
        timestamp: Date.now()
      }
    });
  }

  setupClientHandlers(clientId, ws) {
    const client = this.clients.get(clientId);
    if (!client) {return;}

    ws.on('message', (data) => {
      this.handleMessage(clientId, data);
    });

    ws.on('close', (code, reason) => {
      this.handleDisconnection(clientId, code, reason);
    });

    ws.on('error', (error) => {
      logger.error(`WebSocket client error (${clientId}):`, error);
    });

    ws.on('pong', () => {
      client.lastHeartbeat = Date.now();
    });
  }

  handleMessage(clientId, data) {
    try {
      // Check rate limiting
      if (!this.checkRateLimit(clientId)) {
        this.sendError(clientId, 'Rate limit exceeded');
        return;
      }

      // Validate message size
      if (data.length > this.config.maxMessageSize) {
        this.sendError(clientId, 'Message too large');
        return;
      }

      const message = JSON.parse(data);
      const client = this.clients.get(clientId);

      if (!client) {
        return;
      }

      // Update client stats
      client.messageCount++;
      client.lastMessageTime = Date.now();

      // Process message based on type
      switch (message.type) {
      case 'ping':
        this.handlePing(clientId);
        break;
      case 'subscribe':
        this.handleSubscribe(clientId, message.data);
        break;
      case 'unsubscribe':
        this.handleUnsubscribe(clientId, message.data);
        break;
      case 'publish':
        this.handlePublish(clientId, message.data);
        break;
      case 'get_subscriptions':
        this.handleGetSubscriptions(clientId);
        break;
      default:
        this.sendError(clientId, `Unknown message type: ${message.type}`);
      }
    } catch (error) {
      logger.error(`Error processing message from ${clientId}:`, error);
      this.sendError(clientId, 'Invalid message format');
    }
  }

  checkRateLimit(clientId) {
    const limiter = this.rateLimiters.get(clientId);
    if (!limiter) {return true;}

    const now = Date.now();

    // Reset counter if minute has passed
    if (now > limiter.resetTime) {
      limiter.count = 0;
      limiter.resetTime = now + 60000;
    }

    // Check if limit exceeded
    if (limiter.count >= this.config.messageRateLimit) {
      return false;
    }

    limiter.count++;
    return true;
  }

  handlePing(clientId) {
    this.sendToClient(clientId, {
      type: 'pong',
      data: {
        timestamp: Date.now()
      }
    });
  }

  handleSubscribe(clientId, data) {
    const { channel } = data;
    if (!channel) {
      this.sendError(clientId, 'Channel required for subscription');
      return;
    }

    const client = this.clients.get(clientId);
    if (!client) {return;}

    // Add to client subscriptions
    client.subscriptions.add(channel);

    // Add to global subscription map
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }
    this.subscriptions.get(channel).add(clientId);

    logger.info(`Client ${clientId} subscribed to channel: ${channel}`);

    this.sendToClient(clientId, {
      type: 'subscribed',
      data: {
        channel,
        timestamp: Date.now()
      }
    });
  }

  handleUnsubscribe(clientId, data) {
    const { channel } = data;
    if (!channel) {
      this.sendError(clientId, 'Channel required for unsubscription');
      return;
    }

    const client = this.clients.get(clientId);
    if (!client) {return;}

    // Remove from client subscriptions
    client.subscriptions.delete(channel);

    // Remove from global subscription map
    const channelSubscribers = this.subscriptions.get(channel);
    if (channelSubscribers) {
      channelSubscribers.delete(clientId);
      if (channelSubscribers.size === 0) {
        this.subscriptions.delete(channel);
      }
    }

    logger.info(`Client ${clientId} unsubscribed from channel: ${channel}`);

    this.sendToClient(clientId, {
      type: 'unsubscribed',
      data: {
        channel,
        timestamp: Date.now()
      }
    });
  }

  handlePublish(clientId, data) {
    const { channel, message } = data;
    if (!channel || !message) {
      this.sendError(clientId, 'Channel and message required for publishing');
      return;
    }

    // Check if client is subscribed to the channel
    const client = this.clients.get(clientId);
    if (!client || !client.subscriptions.has(channel)) {
      this.sendError(clientId, 'Not subscribed to channel');
      return;
    }

    // Broadcast message to all subscribers
    this.broadcastToChannel(channel, {
      type: 'message',
      data: {
        channel,
        message,
        publisher: clientId,
        timestamp: Date.now()
      }
    });
  }

  handleGetSubscriptions(clientId) {
    const client = this.clients.get(clientId);
    if (!client) {return;}

    this.sendToClient(clientId, {
      type: 'subscriptions',
      data: {
        subscriptions: Array.from(client.subscriptions),
        timestamp: Date.now()
      }
    });
  }

  handleDisconnection(clientId, code, _reason) {
    const client = this.clients.get(clientId);
    if (!client) {return;}

    logger.info(`WebSocket client disconnected: ${clientId} (Code: ${code})`);

    // Remove from all subscriptions
    for (const channel of client.subscriptions) {
      const channelSubscribers = this.subscriptions.get(channel);
      if (channelSubscribers) {
        channelSubscribers.delete(clientId);
        if (channelSubscribers.size === 0) {
          this.subscriptions.delete(channel);
        }
      }
    }

    // Cleanup
    this.clients.delete(clientId);
    this.rateLimiters.delete(clientId);
    this.messageQueue.delete(clientId);
  }

  // Public methods for external use
  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      client.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      logger.error(`Error sending message to client ${clientId}:`, error);
      return false;
    }
  }

  broadcastToChannel(channel, message) {
    const subscribers = this.subscriptions.get(channel);
    if (!subscribers) {return 0;}

    let sentCount = 0;
    for (const clientId of subscribers) {
      if (this.sendToClient(clientId, message)) {
        sentCount++;
      }
    }

    return sentCount;
  }

  broadcastToAll(message) {
    let sentCount = 0;
    for (const [clientId] of this.clients) {
      if (this.sendToClient(clientId, message)) {
        sentCount++;
      }
    }
    return sentCount;
  }

  sendToUser(userId, message) {
    let sentCount = 0;
    for (const [clientId, client] of this.clients) {
      if (client.user.id === userId) {
        if (this.sendToClient(clientId, message)) {
          sentCount++;
        }
      }
    }
    return sentCount;
  }

  sendError(clientId, errorMessage) {
    this.sendToClient(clientId, {
      type: 'error',
      data: {
        message: errorMessage,
        timestamp: Date.now()
      }
    });
  }

  // Utility methods
  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  startHeartbeat() {
    setInterval(() => {
      const now = Date.now();
      for (const [_clientId, client] of this.clients) {
        if (now - client.lastHeartbeat > this.config.heartbeatInterval * 2) {
          logger.warn(`Client ${_clientId} heartbeat timeout, disconnecting`);
          client.ws.terminate();
        } else {
          client.ws.ping();
        }
      }
    }, this.config.heartbeatInterval);
  }

  startCleanup() {
    setInterval(() => {
      // Cleanup disconnected clients
      for (const [_clientId, client] of this.clients) {
        if (client.ws.readyState !== WebSocket.OPEN) {
          this.handleDisconnection(_clientId, 1000, 'Cleanup');
        }
      }

      // Cleanup old rate limiters
      const now = Date.now();
      for (const [_clientId, limiter] of this.rateLimiters) {
        if (now > limiter.resetTime + 300000) { // 5 minutes after reset
          this.rateLimiters.delete(_clientId);
        }
      }
    }, this.config.cleanupInterval);
  }

  // Statistics and monitoring
  getStats() {
    return {
      totalClients: this.clients.size,
      totalSubscriptions: this.subscriptions.size,
      channels: Array.from(this.subscriptions.keys()),
      connectionsByUser: this.getConnectionsByUser(),
      uptime: Date.now() - this.startTime
    };
  }

  getConnectionsByUser() {
    const userConnections = new Map();
    for (const [_clientId, client] of this.clients) {
      const userId = client.user.id;
      if (!userConnections.has(userId)) {
        userConnections.set(userId, 0);
      }
      userConnections.set(userId, userConnections.get(userId) + 1);
    }
    return Object.fromEntries(userConnections);
  }

  // Health check
  isHealthy() {
    return {
      status: 'healthy',
      clients: this.clients.size,
      subscriptions: this.subscriptions.size,
      uptime: Date.now() - this.startTime
    };
  }

  // Graceful shutdown
  async shutdown() {
    logger.info('Shutting down WebSocket server...');

    // Notify all clients
    this.broadcastToAll({
      type: 'server_shutdown',
      data: {
        message: 'Server is shutting down',
        timestamp: Date.now()
      }
    });

    // Close all connections
    for (const [_clientId, client] of this.clients) {
      client.ws.close(1001, 'Server shutdown');
    }

    // Close WebSocket server
    this.wss.close();

    logger.info('WebSocket server shutdown complete');
  }
}

// Export singleton instance
let globalWebSocketServer = null;

function createWebSocketServer(server, options) {
  if (globalWebSocketServer) {
    return globalWebSocketServer;
  }

  globalWebSocketServer = new WebSocketServer(server, options);
  globalWebSocketServer.startTime = Date.now();
  return globalWebSocketServer;
}

function getWebSocketServer() {
  return globalWebSocketServer;
}

module.exports = {
  WebSocketServer,
  createWebSocketServer,
  getWebSocketServer
};
