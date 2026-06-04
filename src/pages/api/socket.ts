import { initSocket } from '@/lib/socket';
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(res.socket as any)?.server?.io) {
    console.log('Socket.io server initializing...');
    initSocket(res);
  }

  res.end();
}
