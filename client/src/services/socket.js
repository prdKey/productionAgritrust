import { io } from "socket.io-client";

export const socket = io("https://api.agritust.shop", {
  autoConnect: false, // connect manually
});