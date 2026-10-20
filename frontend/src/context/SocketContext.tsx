"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export interface NotificationPayload {
  _id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
  postId?: string | null;
  commentId?: string | null;
  actor?: {
    _id: string;
    name: string;
    university?: string;
    role?: string;
  };
}

export interface PostLikesPayload {
  postId: string;
  likes: string[];
  likesCount: number;
}

export interface PostCommentPayload {
  postId: string;
  comment: any;
  commentCount: number;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  latestNotification: NotificationPayload | null;
  joinPostRooms: (postIds: string | string[]) => void;
  leavePostRooms: (postIds: string | string[]) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  latestNotification: null,
  joinPostRooms: () => {},
  leavePostRooms: () => {},
});

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [latestNotification, setLatestNotification] = useState<NotificationPayload | null>(null);
  
  // Track active joined rooms so if socket reconnects, it automatically rejoins them
  const activeRoomsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Only connect if user is logged in
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    if (!user || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      activeRoomsRef.current.clear();
      return;
    }

    // Determine backend URL (strip /api if present)
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    const socketUrl = apiUrl.replace(/\/api\/?$/, '');

    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('[Socket.IO] Connected to server');
      setIsConnected(true);

      // Re-join any previously tracked post rooms if reconnecting
      if (activeRoomsRef.current.size > 0) {
        newSocket.emit('join_posts', Array.from(activeRoomsRef.current));
      }
    });

    newSocket.on('disconnect', () => {
      console.log('[Socket.IO] Disconnected from server');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.warn('[Socket.IO] Connection error:', err.message);
      setIsConnected(false);
    });

    // Handle incoming real-time notifications
    newSocket.on('notification', (notification: NotificationPayload) => {
      setLatestNotification(notification);
      // Surface instant toast popup on screen for active user
      showToast(notification.message, 'info');
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user?._id]);

  const joinPostRooms = useCallback((postIds: string | string[]) => {
    const ids = Array.isArray(postIds) ? postIds : [postIds];
    const validIds = ids.filter(Boolean);
    if (validIds.length === 0) return;

    validIds.forEach((id) => activeRoomsRef.current.add(id));
    if (socket && socket.connected) {
      socket.emit('join_posts', validIds);
    }
  }, [socket]);

  const leavePostRooms = useCallback((postIds: string | string[]) => {
    const ids = Array.isArray(postIds) ? postIds : [postIds];
    const validIds = ids.filter(Boolean);
    if (validIds.length === 0) return;

    validIds.forEach((id) => activeRoomsRef.current.delete(id));
    if (socket && socket.connected) {
      socket.emit('leave_posts', validIds);
    }
  }, [socket]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        latestNotification,
        joinPostRooms,
        leavePostRooms,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
