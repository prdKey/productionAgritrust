import { io } from "socket.io-client";

export const socket = io("https://api.agritust.com", {
  autoConnect: false, // connect manually
});