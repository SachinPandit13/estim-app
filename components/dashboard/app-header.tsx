'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Bell, Radio } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import type { NotificationItem } from '@/types/api';
import { usePolling } from '@/hooks/use-polling';
import { useSafetyWebSocket, type SafetyAlertMessage } from '@/hooks/use-safety-websocket';

const routeTitles: Record<string, string> = {
  '/': 'System Overview',
  '/live': 'Live Video Monitoring',
  '/cameras': 'Camera Registry',
  '/safety-events': 'Safety Detections Stream',
  '/incidents': 'Safety Incident Management',
  '/zones': 'Monitoring Zones',
  '/notifications': 'Notification Center',
  '/reports': 'Safety Analytics & Reports',
  '/users': 'Users & Access Control',
  '/settings': 'System Health & Diagnostics',
};

export function AppHeader() {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Fetch exact unread notification count
  const fetchUnread = useCallback(async () => {
    try {
      const res = await apiClient<{ unread_count: number }>('/notifications/unread-count');
      setUnreadCount(res.unread_count);
    } catch {
      try {
        const notifs = await apiClient<NotificationItem[]>('/notifications?limit=50');
        const unread = notifs.filter((n) => !n.is_read).length;
        setUnreadCount(unread);
      } catch {
        // Quiet fail if not yet authenticated
      }
    }
  }, []);

  usePolling(fetchUnread, { intervalMs: 15000 });

  // Real-time WebSocket Alert Listener - increments badge dynamically
  const handleSafetyAlert = useCallback((_alert: SafetyAlertMessage) => {
    setUnreadCount((prev) => prev + 1);
  }, []);

  const { isConnected } = useSafetyWebSocket({
    onAlert: handleSafetyAlert,
  });

  // Listen for real-time notification count changes (read/unread toggles, mark all read, etc.)
  useEffect(() => {
    const handleCountChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ unreadCount?: number }>;
      if (typeof customEvent.detail?.unreadCount === 'number') {
        setUnreadCount(customEvent.detail.unreadCount);
      } else {
        fetchUnread();
      }
    };
    const handleCleared = () => setUnreadCount(0);

    window.addEventListener('notification-count-changed', handleCountChange);
    window.addEventListener('notifications-cleared', handleCleared);
    return () => {
      window.removeEventListener('notification-count-changed', handleCountChange);
      window.removeEventListener('notifications-cleared', handleCleared);
    };
  }, [fetchUnread]);

  const title = routeTitles[pathname] || 'Dashboard';

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/95 backdrop-blur-xs px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="-ml-1" />
        <div className="h-4 w-px bg-border hidden sm:block" />
        <h1 className="font-heading text-base font-semibold text-foreground tracking-tight">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Real-time WebSocket connection indicator */}
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/60 text-[11px] font-mono text-muted-foreground border border-border/50"
          title={isConnected ? 'Live WebSocket Connected' : 'Connecting to WebSocket...'}
        >
          <Radio
            className={`size-3 ${isConnected ? 'text-emerald-500 animate-pulse' : 'text-amber-500'}`}
          />
          <span className="hidden md:inline">{isConnected ? 'WS LIVE' : 'WS CONNECTING'}</span>
        </div>

        {/* Clean Notification Bell Icon with Badge */}
        <Link
          href="/notifications"
          className="relative flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="Notifications"
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white font-mono animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
