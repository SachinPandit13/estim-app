'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { usePolling } from '@/hooks/use-polling';
import { KpiStatCard } from '@/components/shared/kpi-stat-card';
import { StatusBadge } from '@/components/shared/status-badge';
import { SeverityBadge } from '@/components/shared/severity-badge';
import { ErrorState } from '@/components/shared/error-state';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Cctv,
  Video,
  AlertOctagon,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import type { DashboardSummary, SafetyIncident } from '@/types/api';
import { useEstimUi } from '@/store/estim-ui-store';

export default function OverviewPage() {
  const { toast } = useEstimUi();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentIncidents, setRecentIncidents] = useState<SafetyIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [sumRes, incRes] = await Promise.all([
        apiClient<DashboardSummary>('/dashboard/summary'),
        apiClient<SafetyIncident[]>('/incidents?limit=5'),
      ]);
      setSummary(sumRes);
      setRecentIncidents(incRes);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  usePolling(fetchData, { intervalMs: 15000 });

  const handleAcknowledge = async (id: string) => {
    setAcknowledgingId(id);
    try {
      await apiClient<SafetyIncident>(`/incidents/${id}/acknowledge`, {
        method: 'PATCH',
      });
      toast.success(
        'Incident Acknowledged',
        'The safety incident has been marked as acknowledged.',
      );
      // Refresh local list
      await fetchData();
    } catch (err: unknown) {
      toast.error(
        'Action Failed',
        err instanceof Error ? err.message : 'Failed to acknowledge incident',
      );
    } finally {
      setAcknowledgingId(null);
    }
  };

  if (error && !summary) {
    return <ErrorState message={error} onRetry={fetchData} className="mt-8" />;
  }

  const totalCameras = summary?.total_cameras ?? 0;
  const onlineCameras = summary?.online_cameras ?? 0;
  const offlineCameras = totalCameras - onlineCameras;
  const openIncidents = summary?.open_incidents_today ?? 0;
  const criticalIncidents = summary?.critical_incidents_today ?? 0;
  const violationsMap = summary?.violations_by_type ?? {};
  const violationEntries = Object.entries(violationsMap);
  const totalViolationsCount = violationEntries.reduce((acc, [, val]) => acc + val, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Status */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Industrial Facility Safety Overview
          </h2>
          <p className="text-micro text-muted font-mono mt-0.5">
            Continuous real-time computer vision inference on active camera feeds
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link href="/live">
            <Button variant="secondary" size="sm" className="gap-1.5">
              <Video className="size-3.5" />
              Live Feeds
            </Button>
          </Link>
          <Link href="/incidents">
            <Button variant="default" size="sm" className="gap-1.5">
              <ShieldAlert className="size-3.5" />
              View All Incidents
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiStatCard
          title="Total Monitored Cameras"
          value={totalCameras}
          icon={<Cctv className="size-4" />}
          description={`${onlineCameras} online • ${offlineCameras} offline`}
          isLoading={loading && !summary}
        />
        <KpiStatCard
          title="Online Telemetry Streams"
          value={onlineCameras}
          icon={<CheckCircle2 className="size-4" />}
          description={
            totalCameras > 0
              ? `${Math.round((onlineCameras / totalCameras) * 100)}% network availability`
              : 'No cameras configured'
          }
          accentColor="success"
          isLoading={loading && !summary}
        />
        <KpiStatCard
          title="Open Incidents Today"
          value={openIncidents}
          icon={<AlertTriangle className="size-4" />}
          description="Awaiting supervisor resolution"
          accentColor={openIncidents > 0 ? 'warning' : 'default'}
          isLoading={loading && !summary}
        />
        <KpiStatCard
          title="Critical Emergencies"
          value={criticalIncidents}
          icon={<AlertOctagon className="size-4" />}
          description="Immediate intervention required"
          accentColor={criticalIncidents > 0 ? 'critical' : 'default'}
          isLoading={loading && !summary}
        />
      </div>

      {/* Middle Grid: Violations Distribution & Recent Alerts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Violations Distribution Breakdown */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Violations by Category</CardTitle>
                <CardDescription>Detected safety anomalies today</CardDescription>
              </div>
              <span className="font-mono text-micro font-semibold px-2 py-0.5 rounded-[6px] bg-surface-raised border border-border text-subtle">
                {totalViolationsCount} Total
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {violationEntries.length === 0 ? (
              <div className="py-8 text-center text-meta text-muted">
                No safety violations detected today.
              </div>
            ) : (
              violationEntries.map(([category, count]) => {
                const percentage =
                  totalViolationsCount > 0 ? Math.round((count / totalViolationsCount) * 100) : 0;
                return (
                  <div key={category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-meta">
                      <span className="font-medium text-foreground capitalize">
                        {category.replace(/_/g, ' ')}
                      </span>
                      <span className="font-mono text-muted">
                        {count} ({percentage}%)
                      </span>
                    </div>
                    {/* Visual Ratio Progress Bar */}
                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken border border-border">
                      <div
                        className="h-full rounded-full bg-brand transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Priority Urgent Safety Incidents */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle>Priority Safety Incidents</CardTitle>
              <CardDescription>
                Most recent hazardous events requiring supervisor action
              </CardDescription>
            </div>
            <Link
              href="/incidents"
              className="inline-flex h-7 items-center justify-center rounded-[6px] px-2 text-micro font-medium text-subtle hover:bg-surface-raised hover:text-foreground gap-1 transition-colors"
            >
              View Queue
              <ArrowRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentIncidents.length === 0 ? (
              <div className="p-6 text-center">
                <EmptyState
                  icon={<ShieldCheck className="size-5 text-success" />}
                  title="No active safety incidents"
                  description="All monitored facility zones are currently compliant with worker safety guidelines."
                />
              </div>
            ) : (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="w-[110px]">Severity</th>
                      <th>Hazard / Event</th>
                      <th>Detected At</th>
                      <th>Status</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentIncidents.map((inc) => (
                      <tr key={inc.id}>
                        <td>
                          <SeverityBadge severity={inc.severity} />
                        </td>
                        <td className="font-medium text-body">
                          <div className="capitalize text-foreground font-semibold">
                            {inc.incident_type.replace(/_/g, ' ')}
                          </div>
                          <div className="text-micro text-muted font-mono">
                            Detections: {inc.detection_count}
                          </div>
                        </td>
                        <td className="font-mono text-meta text-muted">
                          <div className="flex items-center gap-1.5">
                            <Clock className="size-3 text-muted shrink-0" />
                            {new Date(inc.last_detected_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </div>
                        </td>
                        <td>
                          <StatusBadge status={inc.status} />
                        </td>
                        <td className="text-right">
                          {inc.status === 'open' ? (
                            <Button
                              size="xs"
                              variant="soft"
                              loading={acknowledgingId === inc.id}
                              loadingText="Saving..."
                              onClick={() => handleAcknowledge(inc.id)}
                            >
                              Acknowledge
                            </Button>
                          ) : (
                            <Link href="/incidents" className="text-link text-meta">
                              Inspect
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
