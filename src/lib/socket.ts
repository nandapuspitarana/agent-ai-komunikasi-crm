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
    const httpServer: NetServer = (res.socket as any)?.server as any;
    const io = new ServerIO(httpServer, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    // Expose socket server globally
    (global as any).socketIO = io;

    // Handle connections
    io.on('connection', (socket) => {
      const userId = socket.handshake.query.userId as string;
      const sessionId = socket.handshake.query.sessionId as string;
      const tenantId = socket.handshake.query.tenantId as string;

      if (userId) {
        // This is an agent
        socket.join(`inbox:${tenantId}`);
        socket.join(`tenant:${tenantId}`);
        socket.emit('connected', { role: 'agent', status: 'connected' });
      } else {
        // This is a widget visitor
        if (sessionId) {
          socket.join(`widget:${sessionId}`);
          socket.join(`session:${sessionId}`);
          
          widgetSessions.set(socket.id, {
            sessionId,
            tenantId,
            socketId: socket.id,
            connectedAt: new Date()
          });

          socket.emit('connected', { sessionId, status: 'connected' });
        }
      }

      // Handle room joining
      socket.on('join_session', ({ sessionId }) => {
        if (sessionId) {
          socket.join(`session:${sessionId}`);
          socket.join(`widget:${sessionId}`);
        }
      });

      // Handle incoming widget messages
      socket.on('send_message', async (data) => {
        try {

          // Ensure tenant exists (for demo purposes)
          await prisma.tenant.upsert({
            where: { id: tenantId },
            update: {},
            create: { id: tenantId, name: 'Demo Tenant', subscription: 'free' }
          });

          // Create or update chat session
          await prisma.chatSession.upsert({
            where: { id: sessionId },
            update: { status: 'bot' },
            create: {
              id: sessionId,
              tenantId,
              contactId: 'Widget Visitor',
              channel: 'widget',
              status: 'bot'
            }
          });

          // Store message in database
          await prisma.message.create({
            data: {
              sessionId,
              senderType: 'user',
              content: data.message
            }
          });

          // Broadcast to agents in Omni-Inbox (inbox:tenantId room)
          io.to(`inbox:${tenantId}`).emit('widget_message', {
            sessionId,
            message: data.message,
            timestamp: new Date(),
            source: 'widget'
          });

          // Send acknowledgment to widget
          socket.emit('message_sent', { status: 'sent', message: data.message });

          // Emit typing indicator while processing
          io.to(`widget:${sessionId}`).emit('agent_typing', { isTyping: true });

          // If there's a flow associated with this session, the flow execution
          // happens via /api/chat/execute-flow endpoint and response is sent back
          // via agent_message or direct message event
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
        widgetSessions.delete(socket.id);
      });
    });

    // Namespace for Omni-Inbox agents
    const inboxNamespace = io.of('/inbox');
    inboxNamespace.on('connection', (socket) => {
      const tenantId = socket.handshake.query.tenantId as string;

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
        // cleanup on disconnect
      });
    });

    (res.socket as any).server.io = io;
  }
  return (res.socket as any).server.io;
};
