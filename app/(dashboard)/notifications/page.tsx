"use client";

import React, { useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { usePolling } from "@/hooks/use-polling";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCheck, Check, Clock, ArrowRight, AlertTriangle } from "lucide-react";
import type { NotificationItem } from "@/types/api";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchNotifications = async () => {
    try {
      const data = await apiClient<NotificationItem[]>("/notifications?limit=50");
      setNotifications(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  usePolling(fetchNotifications, { intervalMs: 15000 });

  const handleMarkRead = async (id: string) => {
    setActionInProgress(id);
    try {
      await apiClient<NotificationItem>(`/notifications/${id}/read`, {
        method: "PATCH",
      });
      await fetchNotifications();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to mark as read");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleMarkAllRead = async () => {
    setActionInProgress("all");
    try {
      await apiClient<{ updated_count: number }>("/notifications/read-all", {
        method: "PATCH",
      });
      await fetchNotifications();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to mark all as read");
    } finally {
      setActionInProgress(null);
    }
  };

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.is_read;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border">
        <div>
          <h2 className="font-heading text-lg font-bold tracking-tight text-foreground sm:text-xl">
            Facility Safety Notifications
          </h2>
          <p className="text-xs text-muted-foreground font-mono">
            {unreadCount} unread alert{unreadCount !== 1 ? "s" : ""} • Critical dispatch history
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-border bg-card p-0.5 text-xs font-mono">
            <button
              onClick={() => setFilter("all")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filter === "all" ? "bg-muted text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filter === "unread" ? "bg-muted text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleMarkAllRead}
              disabled={actionInProgress === "all"}
              className="h-8 text-xs font-mono gap-1.5"
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
          icon={<Bell className="size-6 text-muted-foreground" />}
          title={filter === "unread" ? "No unread alerts" : "No notifications"}
          description="Operational safety alerts will appear here when hazardous thresholds are crossed."
        />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`flex items-start justify-between gap-3 rounded-xl border p-4 transition-all ${
                item.is_read
                  ? "border-border bg-card/60 text-muted-foreground"
                  : "border-amber-500/30 bg-amber-50/10 text-foreground shadow-xs dark:bg-amber-950/10"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${
                    item.severity === "critical"
                      ? "bg-red-500/20 text-red-500"
                      : item.severity === "high"
                      ? "bg-amber-500/20 text-amber-500"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <AlertTriangle className="size-4" />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-heading text-sm font-semibold text-foreground">
                      {item.title}
                    </h4>
                    <Badge
                      variant="outline"
                      className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0"
                    >
                      {item.severity}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {item.message}
                  </p>
                  <div className="flex items-center gap-2 pt-1 text-[11px] font-mono text-muted-foreground">
                    <Clock className="size-3" />
                    <span>{new Date(item.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 self-center sm:self-auto">
                {item.incident_id && (
                  <Link
                    href="/incidents"
                    className="inline-flex h-7 items-center justify-center rounded-md px-2 text-xs font-mono gap-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    Incident
                    <ArrowRight className="size-3" />
                  </Link>
                )}

                {!item.is_read && (
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={actionInProgress === item.id}
                    onClick={() => handleMarkRead(item.id)}
                    className="h-7 text-xs font-mono gap-1"
                    title="Mark as Read"
                  >
                    <Check className="size-3" />
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
