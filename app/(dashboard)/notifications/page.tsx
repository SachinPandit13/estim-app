'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { usePolling } from '@/hooks/use-polling';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  CheckCheck,
  Check,
  Clock,
  ArrowRight,
  AlertTriangle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import type { NotificationItem, PaginatedResponse } from '@/types/api';
import { useEstimUi } from '@/store/estim-ui-store';

const PAGE_SIZE = 5;

export default function NotificationsPage() {
  const { toast } = useEstimUi();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [page, setPage] = useState<number>(1);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Fetch unread count for badge
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await apiClient<{ unread_count: number }>('/notifications/unread-count');
      setUnreadCount(res.unread_count);
      window.dispatchEvent(
        new CustomEvent('notification-count-changed', {
          detail: { unreadCount: res.unread_count },
        }),
      );
    } catch {
      // Quiet fail if network/auth issues
    }
  }, []);

  const fetchNotifications = useCallback(
    async (targetPage = page) => {
      setLoading(true);
      try {
        const res = await apiClient<PaginatedResponse<NotificationItem> | NotificationItem[]>(
          `/notifications?page=${targetPage}&size=${PAGE_SIZE}`,
        );

        if ('items' in res && Array.isArray(res.items)) {
          setNotifications(res.items);
          setTotalCount(res.total ?? res.items.length);
          setTotalPages(
            res.pages ?? Math.max(1, Math.ceil((res.total ?? res.items.length) / PAGE_SIZE)),
          );
        } else if (Array.isArray(res)) {
          // Fallback if returned as raw array
          setNotifications(res);
          setTotalCount(res.length);
          setTotalPages(Math.max(1, Math.ceil(res.length / PAGE_SIZE)));
        }

        setError(null);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load notifications');
      } finally {
        setLoading(false);
      }
    },
    [page],
  );

  useEffect(() => {
    let ignore = false;
    const loadData = async () => {
      try {
        const [res, unreadRes] = await Promise.allSettled([
          apiClient<PaginatedResponse<NotificationItem> | NotificationItem[]>(
            `/notifications?page=${page}&size=${PAGE_SIZE}`,
          ),
          apiClient<{ unread_count: number }>('/notifications/unread-count'),
        ]);

        if (!ignore) {
          if (res.status === 'fulfilled') {
            const data = res.value;
            if ('items' in data && Array.isArray(data.items)) {
              setNotifications(data.items);
              setTotalCount(data.total ?? data.items.length);
              setTotalPages(
                data.pages ?? Math.max(1, Math.ceil((data.total ?? data.items.length) / PAGE_SIZE)),
              );
            } else if (Array.isArray(data)) {
              setNotifications(data);
              setTotalCount(data.length);
              setTotalPages(Math.max(1, Math.ceil(data.length / PAGE_SIZE)));
            }
            setError(null);
          } else {
            setError(
              res.reason instanceof Error ? res.reason.message : 'Failed to load notifications',
            );
          }

          if (unreadRes.status === 'fulfilled') {
            setUnreadCount(unreadRes.value.unread_count);
            window.dispatchEvent(
              new CustomEvent('notification-count-changed', {
                detail: { unreadCount: unreadRes.value.unread_count },
              }),
            );
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load notifications');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadData();
    return () => {
      ignore = true;
    };
  }, [page]);

  usePolling(
    useCallback(async () => {
      await fetchNotifications(page);
      await fetchUnreadCount();
    }, [page, fetchNotifications, fetchUnreadCount]),
    { intervalMs: 15000 },
  );

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === page) return;
    setPage(newPage);
  };

  const handleMarkRead = async (id: string) => {
    setActionInProgress(id);
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n,
      ),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    window.dispatchEvent(
      new CustomEvent('notification-count-changed', {
        detail: { unreadCount: Math.max(0, unreadCount - 1) },
      }),
    );

    try {
      await apiClient<NotificationItem>(`/notifications/${id}/read`, {
        method: 'PATCH',
      });
    } catch (err: unknown) {
      toast.error('Action Failed', err instanceof Error ? err.message : 'Failed to mark as read');
      await fetchNotifications(page);
      await fetchUnreadCount();
    } finally {
      setActionInProgress(null);
    }
  };

  const handleMarkUnread = async (id: string) => {
    setActionInProgress(id);
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: false, read_at: null } : n)),
    );
    setUnreadCount((prev) => prev + 1);
    window.dispatchEvent(
      new CustomEvent('notification-count-changed', {
        detail: { unreadCount: unreadCount + 1 },
      }),
    );

    try {
      await apiClient<NotificationItem>(`/notifications/${id}/unread`, {
        method: 'PATCH',
      });
    } catch (err: unknown) {
      toast.error('Action Failed', err instanceof Error ? err.message : 'Failed to mark as unread');
      await fetchNotifications(page);
      await fetchUnreadCount();
    } finally {
      setActionInProgress(null);
    }
  };

  const handleMarkAllRead = async () => {
    setActionInProgress('all');
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        is_read: true,
        read_at: new Date().toISOString(),
      })),
    );
    setUnreadCount(0);
    window.dispatchEvent(
      new CustomEvent('notification-count-changed', {
        detail: { unreadCount: 0 },
      }),
    );

    try {
      await apiClient<{ updated_count: number }>('/notifications/read-all', {
        method: 'PATCH',
      });
      toast.success('All Read', 'All notifications marked as read.');
      await fetchNotifications(page);
      await fetchUnreadCount();
    } catch (err: unknown) {
      toast.error(
        'Action Failed',
        err instanceof Error ? err.message : 'Failed to mark all as read',
      );
      await fetchNotifications(page);
      await fetchUnreadCount();
    } finally {
      setActionInProgress(null);
    }
  };

  const displayedNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.is_read;
    return true;
  });

  const startIndex = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(page * PAGE_SIZE, totalCount);

  return (
    <div className="space-y-1 max-w-4xl mx-auto w-full min-w-0">
      {/* Header bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-1 border-b border-border">
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Facility Safety Notifications
        </h2>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center rounded-[8px] border border-border bg-surface p-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => {
                setFilter('all');
                setPage(1);
              }}
              className={`px-3 py-1 rounded-[6px] transition-colors ${
                filter === 'all'
                  ? 'bg-surface-raised text-brand font-semibold shadow-xs'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              All ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setFilter('unread');
                setPage(1);
              }}
              className={`px-3 py-1 rounded-[6px] transition-colors ${
                filter === 'unread'
                  ? 'bg-surface-raised text-brand font-semibold shadow-xs'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => fetchNotifications(page)}
            disabled={loading}
            className="size-8 p-0"
            title="Refresh feed"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>

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
        <ErrorState message={error} onRetry={() => fetchNotifications(page)} />
      ) : displayedNotifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="size-6 text-muted" />}
          title={filter === 'unread' ? 'No unread alerts' : 'No notifications'}
          description="Operational safety alerts will appear here when hazardous thresholds are crossed."
        />
      ) : (
        <div className="space-y-2">
          {displayedNotifications.map((item) => (
            <div
              key={item.id}
              className={`flex items-start justify-between gap-3.5 rounded-[12px] border p-4 transition-all ${
                item.is_read
                  ? 'border-border bg-surface/70 text-muted'
                  : 'border-brand/30 bg-brand-soft/20 text-foreground shadow-xs'
              }`}
            >
              <div className="flex items-start gap-3.5 min-w-0">
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

                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-body font-semibold text-foreground truncate">
                      {item.title}
                    </h4>
                    <Badge
                      variant="outline"
                      className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0 bg-surface-raised border-border text-subtle"
                    >
                      {item.severity}
                    </Badge>
                  </div>
                  <p className="text-meta text-muted leading-relaxed break-words">{item.message}</p>
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

      {/* Pagination Controls Bar */}
      {totalCount > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-border text-xs font-mono">
          <div className="text-muted">
            Showing <span className="font-semibold text-foreground">{startIndex}</span> to{' '}
            <span className="font-semibold text-foreground">{endIndex}</span> of{' '}
            <span className="font-semibold text-foreground">{totalCount}</span> notifications
          </div>

          <div className="flex items-center gap-1.5 self-center sm:self-auto">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1 || loading}
              className="h-8 gap-1 px-2.5 font-mono text-xs"
            >
              <ChevronLeft className="size-3.5" />
              <span>Previous</span>
            </Button>

            {/* Page number pills */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                    acc.push('ellipsis');
                  }
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === 'ellipsis' ? (
                    <span key={`ellipsis-${idx}`} className="px-1 text-muted">
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handlePageChange(item)}
                      disabled={loading}
                      className={`size-8 rounded-[8px] border text-xs font-mono transition-colors ${
                        item === page
                          ? 'border-brand bg-brand-muted text-brand font-bold shadow-xs'
                          : 'border-border bg-surface text-muted hover:text-foreground hover:bg-surface-raised'
                      }`}
                    >
                      {item}
                    </button>
                  ),
                )}
            </div>

            <Button
              size="sm"
              variant="secondary"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages || loading}
              className="h-8 gap-1 px-2.5 font-mono text-xs"
            >
              <span>Next</span>
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
