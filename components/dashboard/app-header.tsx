'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Bell, AlertTriangle, Flame, X, Radio } from 'lucide-react';
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
  const [activeToast, setActiveToast] = useState<SafetyAlertMessage | null>(null);

  // Poll for existing notifications every 20 seconds
  const fetchUnread = async () => {
    try {
      const notifs = await apiClient<NotificationItem[]>('/notifications?limit=20');
      const unread = notifs.filter((n) => !n.is_read).length;
      setUnreadCount(unread);
    } catch {
      // Quiet fail if not yet authenticated
    }
  };

  usePolling(fetchUnread, { intervalMs: 20000 });

  // Real-time WebSocket Alert Listener
  const handleSafetyAlert = useCallback((alert: SafetyAlertMessage) => {
    // 1. Immediately increment unread notification badge
    setUnreadCount((prev) => prev + 1);

    // 2. Trigger high-visibility emergency banner
    setActiveToast(alert);
  }, []);

  const { isConnected } = useSafetyWebSocket({
    onAlert: handleSafetyAlert,
  });

  const title = routeTitles[pathname] || 'Dashboard';

  return (
    <>
      {/* Real-time Emergency HUD Banner for safety violations / fire / fall */}
      {activeToast && (
        <div
          className={`relative z-40 flex items-center justify-between px-4 py-2 text-xs font-semibold shadow-md transition-all animate-in slide-in-from-top duration-300 ${
            activeToast.severity === 'critical'
              ? 'bg-red-600 text-white'
              : activeToast.severity === 'high'
                ? 'bg-amber-600 text-white'
                : 'bg-primary text-primary-foreground'
          }`}
        >
          <div className="flex items-center gap-2">
            {activeToast.event_type?.includes('FIRE') ||
            activeToast.event_type?.includes('SMOKE') ? (
              <Flame className="size-4 animate-bounce" />
            ) : (
              <AlertTriangle className="size-4 animate-pulse" />
            )}
            <span className="font-mono uppercase tracking-wider bg-black/30 px-1.5 py-0.5 rounded text-[10px]">
              {activeToast.severity}
            </span>
            <span className="font-medium">{activeToast.title}:</span>
            <span className="hidden sm:inline font-normal opacity-95">{activeToast.message}</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/incidents"
              className="underline hover:no-underline font-mono text-[11px] uppercase tracking-wide bg-black/20 hover:bg-black/40 px-2 py-0.5 rounded transition-colors"
            >
              View Incident →
            </Link>
            <button
              onClick={() => setActiveToast(null)}
              className="p-1 hover:bg-black/20 rounded transition-colors"
              title="Dismiss alert"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      )}

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
    </>
  );
}
