'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/dashboard/app-sidebar';
import { AppHeader } from '@/components/dashboard/app-header';
import { ShieldCheck } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-[14px] bg-brand text-brand-foreground shadow-[var(--shadow-md)] animate-pulse">
            <ShieldCheck className="size-6" />
          </div>
          <p className="text-micro font-mono text-muted uppercase tracking-widest">
            Connecting to Safety Console...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground overflow-x-hidden">
        <AppSidebar />
        <SidebarInset className="flex flex-1 flex-col min-w-0 bg-background overflow-x-hidden">
          <AppHeader />
          <main className="flex-1 p-4 sm:p-6 lg:p-7 overflow-y-auto overflow-x-hidden min-w-0">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
