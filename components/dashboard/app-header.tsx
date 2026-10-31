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
import { useEstimUi } from '@/store/estim-ui-store';

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
  const { pushToast } = useEstimUi();

  // Fetch exact unread notification count
  const fetchUnread = useCallback(async () => {
    try {
      const res = await apiClient<{ unread_count: number }>('/notifications/unread-count');
      setUnreadCount(res.unread_count);
    } catch {
      try {
        const notifs = await apiClient<NotificationItem[] | { items: NotificationItem[] }>(
          '/notifications?limit=50',
        );
        const list = Array.isArray(notifs) ? notifs : (notifs?.items ?? []);
        const unread = list.filter((n) => !n.is_read).length;
        setUnreadCount(unread);
      } catch {
        // Quiet fail if not yet authenticated
      }
    }
  }, []);

  usePolling(fetchUnread, { intervalMs: 15000 });

  // Real-time WebSocket Alert Listener - increments badge dynamically and presents alert toast
  const handleSafetyAlert = useCallback(
    (alert: SafetyAlertMessage) => {
      setUnreadCount((prev) => prev + 1);
      const isCritical = alert.severity === 'critical' || alert.severity === 'high';
      pushToast({
        title: alert.title || 'Live Safety Detection Alert',
        description: alert.message,
        variant: isCritical ? 'error' : 'warning',
      });
    },
    [pushToast],
  );

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
    <header className="sticky top-0 z-30 flex h-13.5 shrink-0 items-center justify-between border-b border-border bg-surface/90 backdrop-blur-md px-4 sm:px-6 transition-colors duration-150">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="-ml-1 md:hidden" />
        <div className="h-4 w-px bg-border md:hidden" />
        <h1 className="text-page-title text-foreground tracking-tight">{title}</h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Real-time WebSocket connection status badge */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] bg-surface-raised text-[11px] font-mono text-subtle border border-border"
          title={isConnected ? 'Live WebSocket Connected' : 'Connecting to WebSocket...'}
        >
          <Radio
            className={`size-3 ${isConnected ? 'text-success animate-pulse' : 'text-warning'}`}
          />
          <span className="hidden md:inline font-medium">
            {isConnected ? 'WS LIVE' : 'WS CONNECTING'}
          </span>
        </div>

        {/* Notification Center Trigger Icon */}
        <Link
          href="/notifications"
          className="relative flex size-9 items-center justify-center rounded-[8px] border border-border bg-surface text-subtle hover:bg-surface-raised hover:text-foreground transition-colors"
          title="Notifications"
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-danger-foreground font-mono animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
