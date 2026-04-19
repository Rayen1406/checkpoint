import { io } from "socket.io-client";

function getDefaultSocketUrl() {
  if (typeof window === "undefined") {
    return "http://localhost:4000";
  }

  const { protocol, hostname, port } = window.location;
  const isViteDevHost =
    (hostname === "localhost" || hostname === "127.0.0.1") && port === "5173";

  if (isViteDevHost) {
    return "http://localhost:4000";
  }

  return `${protocol}//${window.location.host}`;
}

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || getDefaultSocketUrl();

let socket;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, { transports: ["websocket"] });
  }

  return socket;
}
