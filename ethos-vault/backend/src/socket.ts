import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';

let io: Server | null = null;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: process.env.CORS_ORIGIN || 'http://localhost:5173', methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket) => {
    socket.on('join-session', (sessionId: string) => {
      socket.join(`session:${sessionId}`);
    });

    socket.on('join-user', (userId: string) => {
      socket.join(`user:${userId}`);
    });
  });

  return io;
}

export function emitToSession(sessionId: string, event: string, data: unknown): void {
  io?.to(`session:${sessionId}`).emit(event, data);
}

export function emitToUser(userId: string, event: string, data: unknown): void {
  io?.to(`user:${userId}`).emit(event, data);
}

export function getIO(): Server | null {
  return io;
}
