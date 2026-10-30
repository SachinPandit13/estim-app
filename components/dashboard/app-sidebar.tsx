'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Video,
  Cctv,
  ShieldAlert,
  AlertOctagon,
  MapPin,
  Bell,
  BarChart3,
  Users,
  Settings,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const mainNavItems: NavItem[] = [
  {
    title: 'Overview',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'Live Monitoring',
    href: '/live',
    icon: Video,
  },
  {
    title: 'Cameras',
    href: '/cameras',
    icon: Cctv,
  },
  {
    title: 'Safety Events',
    href: '/safety-events',
    icon: ShieldAlert,
  },
  {
    title: 'Incidents',
    href: '/incidents',
    icon: AlertOctagon,
  },
  {
    title: 'Zones',
    href: '/zones',
    icon: MapPin,
  },
];

const secondaryNavItems: NavItem[] = [
  {
    title: 'Notifications',
    href: '/notifications',
    icon: Bell,
  },
  {
    title: 'Reports & Analytics',
    href: '/reports',
    icon: BarChart3,
  },
  {
    title: 'Users & Access',
    href: '/users',
    icon: Users,
  },
  {
    title: 'System Settings',
    href: '/settings',
    icon: Settings,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [unreadNotifs, setUnreadNotifs] = useState<number>(0);

  useEffect(() => {
    const handleCountChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ unreadCount?: number }>;
      if (typeof customEvent.detail?.unreadCount === 'number') {
        setUnreadNotifs(customEvent.detail.unreadCount);
      }
    };
    const handleCleared = () => setUnreadNotifs(0);
    window.addEventListener('notification-count-changed', handleCountChange);
    window.addEventListener('notifications-cleared', handleCleared);
    return () => {
      window.removeEventListener('notification-count-changed', handleCountChange);
      window.removeEventListener('notifications-cleared', handleCleared);
    };
  }, []);

  return (
    <Sidebar className="border-r border-border bg-surface text-foreground transition-colors duration-150">
      <SidebarHeader className="border-b border-border px-4 py-4">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex size-8 items-center justify-center rounded-lg bg-brand text-brand-foreground font-bold shadow-sm transition-transform duration-150 group-hover:scale-105">
            <ShieldCheck className="size-5" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-heading text-base font-bold tracking-wider text-foreground">
              ESTIM
            </span>
            <span className="text-[10px] uppercase font-mono text-brand font-medium tracking-widest mt-0.5">
              Worker Safety AI
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2.5 py-3.5 space-y-4">
        {/* Real-time Monitoring Group */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase font-mono font-semibold tracking-wider text-muted px-2.5 mb-1.5">
            Monitoring
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {mainNavItems.map((item) => {
                const isActive =
                  item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      render={<Link href={item.href} />}
                      className={`gap-3 px-3 py-2 text-sm rounded-[9px] transition-[background-color,color] font-medium duration-120 ${
                        isActive
                          ? 'bg-brand-muted text-brand font-semibold hover:bg-brand-muted hover:text-brand'
                          : 'text-subtle hover:bg-surface-raised hover:text-foreground'
                      }`}
                    >
                      <item.icon className="size-4 shrink-0" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Management & Administration Group */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase font-mono font-semibold tracking-wider text-muted px-2.5 mb-1.5">
            Administration
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {secondaryNavItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      render={<Link href={item.href} />}
                      className={`gap-3 px-3 py-2 text-sm rounded-[9px] transition-[background-color,color] font-medium duration-120 ${
                        isActive
                          ? 'bg-brand-muted text-brand font-semibold hover:bg-brand-muted hover:text-brand'
                          : 'text-subtle hover:bg-surface-raised hover:text-foreground'
                      }`}
                    >
                      <item.icon className="size-4 shrink-0" />
                      <span className="flex-1">{item.title}</span>
                      {item.href === '/notifications' && unreadNotifs > 0 && (
                        <span className="flex size-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-danger-foreground font-mono">
                          {unreadNotifs > 9 ? '9+' : unreadNotifs}
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-3">
        <div className="flex items-center justify-between rounded-[10px] border border-border bg-surface-raised p-2.5">
          <div className="flex flex-col min-w-0 pr-2">
            <span className="truncate text-xs font-semibold text-foreground">
              {user?.full_name || user?.email || 'Supervisor'}
            </span>
            <span className="text-[10px] uppercase font-mono text-muted truncate">
              {user?.role || 'Member'}
            </span>
          </div>
          <button
            type="button"
            onClick={logout}
            title="Log Out"
            className="flex size-7 items-center justify-center rounded-md text-muted hover:bg-surface hover:text-danger transition-colors"
          >
            <LogOut className="size-3.5" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
