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
    <Sidebar className="border-r border-border bg-slate-950 text-slate-100">
      <SidebarHeader className="border-b border-slate-900 px-4 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500 text-slate-950 font-bold shadow-sm">
            <ShieldCheck className="size-5" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-heading text-base font-bold tracking-wider text-slate-100">
              ESTIM
            </span>
            <span className="text-[10px] uppercase font-mono text-amber-400/90 tracking-widest mt-0.5">
              Worker Safety AI
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        {/* Real-time Monitoring Group */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase font-mono tracking-wider text-slate-400 px-3 mb-1">
            Monitoring
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => {
                const isActive =
                  item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      render={<Link href={item.href} />}
                      className={`gap-3 px-3 py-2 text-sm rounded-lg transition-colors font-medium ${
                        isActive
                          ? 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300'
                          : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
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

        {/* Management & Analytics Group */}
        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-[10px] uppercase font-mono tracking-wider text-slate-400 px-3 mb-1">
            Administration
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryNavItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      render={<Link href={item.href} />}
                      className={`gap-3 px-3 py-2 text-sm rounded-lg transition-colors font-medium ${
                        isActive
                          ? 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300'
                          : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
                      }`}
                    >
                      <item.icon className="size-4 shrink-0" />
                      <span className="flex-1">{item.title}</span>
                      {item.href === '/notifications' && unreadNotifs > 0 && (
                        <span className="flex size-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white font-mono">
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

      <SidebarFooter className="border-t border-slate-900 p-3">
        <div className="flex items-center justify-between rounded-lg bg-slate-900/60 p-2.5">
          <div className="flex flex-col min-w-0 pr-2">
            <span className="truncate text-xs font-medium text-slate-200">
              {user?.full_name || user?.email || 'Supervisor'}
            </span>
            <span className="text-[10px] uppercase font-mono text-slate-400 truncate">
              {user?.role || 'Member'}
            </span>
          </div>
          <button
            onClick={logout}
            title="Log Out"
            className="flex size-7 items-center justify-center rounded text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors"
          >
            <LogOut className="size-3.5" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
