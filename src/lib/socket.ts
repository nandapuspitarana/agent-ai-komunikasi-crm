import { Server as NetServer } from 'http';
import { Server as ServerIO } from 'socket.io';
import { NextApiResponse } from 'next';

export const config = {
  api: {
    bodyParser: false,
  },
};

export const initSocket = (res: NextApiResponse) => {
  if (!res.socket.server.io) {
    console.log('Initializing Socket.io server...');
    const httpServer: NetServer = res.socket.server as any;
    const io = new ServerIO(httpServer, {
      path: '/api/socket',
      addTrailingSlash: false,
    });
    res.socket.server.io = io;
  }
  return res.socket.server.io;
};
