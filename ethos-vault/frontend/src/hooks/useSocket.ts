import { useEffect, useRef } from 'react';
import { getSocket } from '../lib/socket';

export function useSocketEvent<T = unknown>(
  event: string,
  handler: (data: T) => void,
  deps: unknown[] = [],
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const socket = getSocket();
    const listener = (data: T) => handlerRef.current(data);
    socket.on(event, listener);
    return () => {
      socket.off(event, listener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, ...deps]);
}

export function useJoinSession(sessionId: string | null) {
  useEffect(() => {
    if (!sessionId) return;
    const socket = getSocket();
    socket.emit('join-session', sessionId);
  }, [sessionId]);
}

export function useJoinUser(userId: string | null) {
  useEffect(() => {
    if (!userId) return;
    const socket = getSocket();
    socket.emit('join-user', userId);
  }, [userId]);
}
