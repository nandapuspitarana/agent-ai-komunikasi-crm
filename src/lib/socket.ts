import { Server as NetServer } from 'http';
import { Server as ServerIO } from 'socket.io';
import { NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const config = {
  api: {
    bodyParser: false,
  },
};

// Store active widget sessions
const widgetSessions = new Map();

export const initSocket = (res: NextApiResponse) => {
  if (!(res.socket as any)?.server?.io) {
    console.log('Initializing Socket.io server...');
    const httpServer: NetServer = (res.socket as any)?.server as any;
    const io = new ServerIO(httpServer, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    // Handle widget connections
    io.on('connection', (socket) => {
      const sessionId = socket.handshake.query.sessionId as string;
      const tenantId = socket.handshake.query.tenantId as string;

      console.log(`Widget connected: ${sessionId} from tenant ${tenantId}`);

      // Store session info
      widgetSessions.set(socket.id, {
        sessionId,
        tenantId,
        socketId: socket.id,
        connectedAt: new Date()
      });

      // Emit connection confirmation to widget
      socket.emit('connected', { sessionId, status: 'connected' });

      // Handle incoming widget messages
      socket.on('send_message', async (data) => {
        try {
          console.log(`Message from widget ${sessionId}:`, data.message);

          // Store message in database
          // TODO: Create conversation and message records in database

          // Broadcast to agents in Omni-Inbox (inbox:tenantId room)
          io.to(`inbox:${tenantId}`).emit('widget_message', {
            sessionId,
            message: data.message,
            timestamp: new Date(),
            source: 'widget'
          });

          // Send acknowledgment to widget
          socket.emit('message_sent', { status: 'sent', message: data.message });
        } catch (error) {
          console.error('Error handling widget message:', error);
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      // Handle agent messages to widget
      socket.on('agent_message', (data) => {
        socket.emit('message', {
          message: data.message,
          sender: 'agent',
          timestamp: new Date()
        });
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`Widget disconnected: ${sessionId}`);
        widgetSessions.delete(socket.id);
      });
    });

    // Namespace for Omni-Inbox agents
    const inboxNamespace = io.of('/inbox');
    inboxNamespace.on('connection', (socket) => {
      const tenantId = socket.handshake.query.tenantId as string;
      const userId = socket.handshake.query.userId as string;

      console.log(`Agent connected to Inbox: ${userId} from tenant ${tenantId}`);

      // Join tenant-specific room
      socket.join(`inbox:${tenantId}`);

      socket.on('send_to_widget', (data) => {
        // Find and send message to specific widget session
        io.to(`widget:${data.sessionId}`).emit('message', {
          message: data.message,
          sender: 'agent',
          timestamp: new Date()
        });
      });

      socket.on('disconnect', () => {
        console.log(`Agent disconnected from Inbox: ${userId}`);
      });
    });

    (res.socket as any).server.io = io;
  }
  return (res.socket as any).server.io;
};
