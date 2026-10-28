'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Bell } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import type { NotificationItem } from '@/types/api';
import { usePolling } from '@/hooks/use-polling';

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

      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          href="/notifications"
          className="relative flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="Notifications"
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white font-mono">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
