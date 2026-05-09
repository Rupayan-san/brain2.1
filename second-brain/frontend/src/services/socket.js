import { io } from "socket.io-client";
import { API_BASE_URL, getToken } from "./api.js";

let socket;

export function getSocket() {
  if (!socket) {
    socket = io(API_BASE_URL, {
      transports: ["websocket"],
      auth: {
        token: getToken()
      }
    });
  }

  return socket;
}

export function resetSocket() {
  socket?.disconnect();
  socket = undefined;
}
