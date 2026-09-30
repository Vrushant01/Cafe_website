import { io, Socket } from 'socket.io-client';
import { useEffect } from 'react';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (typeof window === 'undefined') {
    return {
      on: () => {},
      off: () => {},
      emit: () => {},
      connected: false,
    } as unknown as Socket;
  }

  if (!socket) {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
    socket = io(socketUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

/**
 * Socket Reconnect Strategy with Full REST Resync (TRD.md §6)
 * Automatically triggers a fresh REST fetch when connection is established or restored.
 */
export function useSocketResync(onResync: () => void) {
  useEffect(() => {
    const s = getSocket();

    const handleConnect = () => {
      console.log('[Socket] Connected/Reconnected. Triggering full REST resynchronization.');
      onResync();
    };

    s.on('connect', handleConnect);
    return () => {
      s.off('connect', handleConnect);
    };
  }, [onResync]);
}
