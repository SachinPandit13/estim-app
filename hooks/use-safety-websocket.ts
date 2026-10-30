'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface SafetyAlertMessage {
  type: string;
  incident_id?: string;
  event_type?: string;
  camera_id?: string;
  zone_id?: string | null;
  severity: 'critical' | 'high' | 'medium' | 'low' | string;
  title: string;
  message: string;
  timestamp: string;
}

interface UseSafetyWebSocketOptions {
  onAlert?: (alert: SafetyAlertMessage) => void;
  enabled?: boolean;
}

export function useSafetyWebSocket(options: UseSafetyWebSocketOptions = {}) {
  const { onAlert, enabled = true } = options;
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [latestAlert, setLatestAlert] = useState<SafetyAlertMessage | null>(null);

  const onAlertRef = useRef(onAlert);
  useEffect(() => {
    onAlertRef.current = onAlert;
  }, [onAlert]);

  const dismissAlert = useCallback(() => {
    setLatestAlert(null);
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    let socket: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let pingInterval: ReturnType<typeof setInterval> | null = null;
    let isDisposed = false;

    // Resolve WebSocket URL
    const getWsUrl = (): string => {
      const explicitWs = process.env.NEXT_PUBLIC_WS_URL;
      if (explicitWs) return explicitWs;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1';
      try {
        const parsed = new URL(apiUrl);
        const protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${parsed.host}/api/v1/ws/alerts`;
      } catch {
        return 'ws://localhost:8001/api/v1/ws/alerts';
      }
    };

    const connect = () => {
      if (isDisposed) return;

      try {
        const wsUrl = getWsUrl();
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          if (isDisposed) return;
          setIsConnected(true);

          // Heartbeat ping every 25 seconds to keep connection alive
          pingInterval = setInterval(() => {
            if (socket && socket.readyState === WebSocket.OPEN) {
              socket.send('ping');
            }
          }, 25000);
        };

        socket.onmessage = (event) => {
          if (isDisposed) return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'SAFETY_ALERT') {
              const alertMsg = data as SafetyAlertMessage;
              setLatestAlert(alertMsg);
              if (onAlertRef.current) {
                onAlertRef.current(alertMsg);
              }
            }
            // AI_HEALTH messages are available for consumers; ignore by default here
          } catch {
            // Ignore non-json or ping/pong messages
          }
        };

        socket.onclose = () => {
          if (isDisposed) return;
          setIsConnected(false);
          if (pingInterval) clearInterval(pingInterval);

          // Attempt reconnect after 4 seconds
          reconnectTimeout = setTimeout(() => {
            connect();
          }, 4000);
        };

        socket.onerror = () => {
          if (socket && socket.readyState === WebSocket.OPEN) {
            socket.close();
          }
        };
      } catch {
        // Fallback schedule reconnect
        reconnectTimeout = setTimeout(() => {
          connect();
        }, 5000);
      }
    };

    connect();

    return () => {
      isDisposed = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (pingInterval) clearInterval(pingInterval);
      if (socket) {
        socket.close();
      }
    };
  }, [enabled]);

  return {
    isConnected,
    latestAlert,
    dismissAlert,
  };
}
