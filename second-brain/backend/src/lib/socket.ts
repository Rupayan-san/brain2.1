import { Server } from "socket.io";

let io: Server | undefined;

export function setSocketServer(server: Server) {
  io = server;
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  io?.to(`user:${userId}`).emit(event, payload);
  io?.emit(event, payload);
}
