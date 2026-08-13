"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — socket.io-client types resolve after npm install
import { io, Socket } from "socket.io-client";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
export interface SocketMessage {
  type:
    | "message_new"
    | "typing_start"
    | "typing_stop"
    | "message_status_update";
  payload: any;
}

interface SocketContextType {
  isConnected: boolean;
  /** Send a chat message */
  sendMessage: (conversationId: number, content: string, msgType?: string) => void;
  /** Send typing start event */
  sendTypingStart: (conversationId: number) => void;
  /** Send typing stop event */
  sendTypingStop: (conversationId: number) => void;
  /** Mark a message as read */
  markRead: (messageId: number) => void;
  /** Latest incoming event (reactive) */
  lastEvent: SocketMessage | null;
}

const SocketContext = createContext<SocketContextType>({
  isConnected: false,
  sendMessage: () => {},
  sendTypingStart: () => {},
  sendTypingStop: () => {},
  markRead: () => {},
  lastEvent: null,
});

export const useSocket = () => useContext(SocketContext);

// ──────────────────────────────────────────────
// Provider
// ──────────────────────────────────────────────
export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<SocketMessage | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const rawUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const apiUrl = rawUrl.replace(/\/api\/?$/, "").replace(/\/$/, "");
    const socket = io(apiUrl, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Socket.io] connected", socket.id);
      setIsConnected(true);
    });

    socket.on("disconnect", (reason: string) => {
      console.log("[Socket.io] disconnected:", reason);
      setIsConnected(false);
    });

    socket.on("connect_error", (err: Error) => {
      console.warn("[Socket.io] connection error:", err.message);
    });

    // ── Incoming events ──
    socket.on("message_new", (payload: any) => {
      setLastEvent({ type: "message_new", payload });
    });

    socket.on("typing_start", (payload: any) => {
      setLastEvent({ type: "typing_start", payload });
    });

    socket.on("typing_stop", (payload: any) => {
      setLastEvent({ type: "typing_stop", payload });
    });

    socket.on("message_status_update", (payload: any) => {
      setLastEvent({ type: "message_status_update", payload });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const sendMessage = useCallback(
    (conversationId: number, content: string, msgType = "text") => {
      socketRef.current?.emit("message_send", {
        conversation_id: conversationId,
        content,
        msg_type: msgType,
      });
    },
    []
  );

  const sendTypingStart = useCallback((conversationId: number) => {
    socketRef.current?.emit("typing_start", { conversation_id: conversationId });
  }, []);

  const sendTypingStop = useCallback((conversationId: number) => {
    socketRef.current?.emit("typing_stop", { conversation_id: conversationId });
  }, []);

  const markRead = useCallback((messageId: number) => {
    socketRef.current?.emit("message_read", { message_id: messageId });
  }, []);

  return (
    <SocketContext.Provider
      value={{
        isConnected,
        sendMessage,
        sendTypingStart,
        sendTypingStop,
        markRead,
        lastEvent,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

// ── Legacy shim so old imports of useWebSocket still work ──
export const WebSocketProvider = SocketProvider;
export const useWebSocket = () => {
  const { isConnected, sendMessage, lastEvent } = useSocket();
  return {
    isConnected,
    lastMessage: lastEvent,
    sendMessage: (data: any) => {
      // Old code sent: { type: "message.send", payload: { conversation_id, content, msg_type } }
      if (data?.type === "message.send" && data?.payload) {
        const { conversation_id, content, msg_type } = data.payload;
        sendMessage(conversation_id, content, msg_type);
      }
    },
  };
};
