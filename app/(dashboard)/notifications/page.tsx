'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { usePolling } from '@/hooks/use-polling';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCheck, Check, Clock, ArrowRight, AlertTriangle, RotateCcw } from 'lucide-react';
import type { NotificationItem } from '@/types/api';
import { useEstimUi } from '@/store/estim-ui-store';

export default function NotificationsPage() {
  const { toast } = useEstimUi();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [_loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchNotifications = async () => {
    try {
      const data = await apiClient<NotificationItem[]>('/notifications?limit=50');
      setNotifications(data);
      const unread = data.filter((n) => !n.is_read).length;
      window.dispatchEvent(
        new CustomEvent('notification-count-changed', { detail: { unreadCount: unread } }),
      );
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  usePolling(fetchNotifications, { intervalMs: 15000 });

  const handleMarkRead = async (id: string) => {
    setActionInProgress(id);
    // Optimistic update
    setNotifications((prev) => {
      const next = prev.map((n) =>
        n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n,
      );
      const newUnread = next.filter((n) => !n.is_read).length;
      window.dispatchEvent(
        new CustomEvent('notification-count-changed', { detail: { unreadCount: newUnread } }),
      );
      return next;
    });

    try {
      await apiClient<NotificationItem>(`/notifications/${id}/read`, {
        method: 'PATCH',
      });
    } catch (err: unknown) {
      toast.error('Action Failed', err instanceof Error ? err.message : 'Failed to mark as read');
      await fetchNotifications();
    } finally {
      setActionInProgress(null);
    }
  };

  const handleMarkUnread = async (id: string) => {
    setActionInProgress(id);
    // Optimistic update
    setNotifications((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, is_read: false, read_at: null } : n));
      const newUnread = next.filter((n) => !n.is_read).length;
      window.dispatchEvent(
        new CustomEvent('notification-count-changed', { detail: { unreadCount: newUnread } }),
      );
      return next;
    });

    try {
      await apiClient<NotificationItem>(`/notifications/${id}/unread`, {
        method: 'PATCH',
      });
    } catch (err: unknown) {
      toast.error('Action Failed', err instanceof Error ? err.message : 'Failed to mark as unread');
      await fetchNotifications();
    } finally {
      setActionInProgress(null);
    }
  };

  const handleMarkAllRead = async () => {
    setActionInProgress('all');
    // Optimistic update
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }));
      window.dispatchEvent(
        new CustomEvent('notification-count-changed', { detail: { unreadCount: 0 } }),
      );
      return next;
    });

    try {
      await apiClient<{ updated_count: number }>('/notifications/read-all', {
        method: 'PATCH',
      });
      toast.success('All Read', 'All notifications marked as read.');
    } catch (err: unknown) {
      toast.error(
        'Action Failed',
        err instanceof Error ? err.message : 'Failed to mark all as read',
      );
      await fetchNotifications();
    } finally {
      setActionInProgress(null);
    }
  };

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.is_read;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-border">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Facility Safety Notifications
          </h2>
          <p className="text-micro text-muted font-mono mt-0.5">
            {unreadCount} unread alert{unreadCount !== 1 ? 's' : ''} • Critical dispatch history
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center rounded-[8px] border border-border bg-surface p-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-[6px] transition-colors ${
                filter === 'all'
                  ? 'bg-surface-raised text-brand font-semibold shadow-xs'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 rounded-[6px] transition-colors ${
                filter === 'unread'
                  ? 'bg-surface-raised text-brand font-semibold shadow-xs'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="secondary"
              onClick={handleMarkAllRead}
              loading={actionInProgress === 'all'}
              loadingText="Marking..."
              className="gap-1.5 font-mono text-xs"
            >
              <CheckCheck className="size-3.5" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      {error && notifications.length === 0 ? (
        <ErrorState message={error} onRetry={fetchNotifications} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Bell className="size-6 text-muted" />}
          title={filter === 'unread' ? 'No unread alerts' : 'No notifications'}
          description="Operational safety alerts will appear here when hazardous thresholds are crossed."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`flex items-start justify-between gap-3.5 rounded-[12px] border p-4 transition-all ${
                item.is_read
                  ? 'border-border bg-surface/70 text-muted'
                  : 'border-brand/30 bg-brand-soft/20 text-foreground shadow-xs'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[8px] ${
                    item.severity === 'critical'
                      ? 'bg-danger-muted text-danger border border-danger/30'
                      : item.severity === 'high'
                        ? 'bg-warning-muted text-warning border border-warning/30'
                        : 'bg-surface-raised text-muted border border-border'
                  }`}
                >
                  <AlertTriangle className="size-4" />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-body font-semibold text-foreground">{item.title}</h4>
                    <Badge
                      variant="outline"
                      className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0 bg-surface-raised border-border text-subtle"
                    >
                      {item.severity}
                    </Badge>
                  </div>
                  <p className="text-meta text-muted leading-relaxed">{item.message}</p>
                  <div className="flex items-center gap-2 pt-1 text-micro font-mono text-muted">
                    <Clock className="size-3" />
                    <span>{new Date(item.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 self-center sm:self-auto">
                {item.incident_id && (
                  <Link
                    href="/incidents"
                    className="inline-flex h-7 items-center justify-center rounded-[6px] px-2 text-micro font-mono gap-1 text-muted hover:bg-surface-raised hover:text-foreground transition-colors"
                  >
                    Incident
                    <ArrowRight className="size-3" />
                  </Link>
                )}

                {!item.is_read ? (
                  <Button
                    size="xs"
                    variant="secondary"
                    disabled={actionInProgress === item.id}
                    onClick={() => handleMarkRead(item.id)}
                    className="h-7 text-micro font-mono gap-1 hover:border-success/50 hover:text-success"
                    title="Mark as Read"
                  >
                    <Check className="size-3" />
                    <span className="hidden sm:inline">Mark Read</span>
                  </Button>
                ) : (
                  <Button
                    size="xs"
                    variant="ghost"
                    disabled={actionInProgress === item.id}
                    onClick={() => handleMarkUnread(item.id)}
                    className="h-7 text-micro font-mono gap-1 text-muted hover:text-brand"
                    title="Mark as Unread"
                  >
                    <RotateCcw className="size-3" />
                    <span className="hidden sm:inline">Mark Unread</span>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
