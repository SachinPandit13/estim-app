'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ErrorState } from '@/components/shared/error-state';
import { AlertTriangle, Info, Calendar } from 'lucide-react';
import type { DashboardSummary, Camera, SafetyIncident } from '@/types/api';

export default function ReportsPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [incidents, setIncidents] = useState<SafetyIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const [sumRes, camRes, incRes] = await Promise.all([
          apiClient<DashboardSummary>('/dashboard/summary'),
          apiClient<Camera[]>('/cameras'),
          apiClient<SafetyIncident[]>('/incidents?limit=100'),
        ]);
        setSummary(sumRes);
        setCameras(camRes);
        setIncidents(incRes);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load report data');
      } finally {
        setLoading(false);
      }
    };
    loadAnalytics();
  }, []);

  if (error) {
    return <ErrorState message={error} />;
  }

  if (loading && !summary) {
    return (
      <div className="py-20 text-center text-xs font-mono text-muted-foreground animate-pulse">
        Compiling facility safety telemetry and reports...
      </div>
    );
  }

  const totalCameras = cameras.length;
  const onlineCameras = cameras.filter((c) => c.status === 'online').length;
  const cameraAvailabilityPct =
    totalCameras > 0 ? Math.round((onlineCameras / totalCameras) * 100) : 100;

  const totalIncidentsCount = incidents.length;
  const criticalCount = incidents.filter((i) => i.severity === 'critical').length;
  const highCount = incidents.filter((i) => i.severity === 'high').length;
  const medCount = incidents.filter((i) => i.severity === 'medium').length;
  const lowCount = incidents.filter((i) => i.severity === 'low').length;

  const resolvedCount = incidents.filter((i) => i.status === 'resolved').length;
  const resolutionRatePct =
    totalIncidentsCount > 0 ? Math.round((resolvedCount / totalIncidentsCount) * 100) : 100;

  const violationsMap = summary?.violations_by_type ?? {};
  const violationEntries = Object.entries(violationsMap);

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border">
        <div>
          <h2 className="font-heading text-lg font-bold tracking-tight text-foreground sm:text-xl">
            Industrial Worker Safety Analytics & Compliance Report
          </h2>
          <p className="text-xs text-muted-foreground font-mono">
            Derived from active facility sensor telemetry and confirmed incident records
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-mono text-muted-foreground">
          <Calendar className="size-3.5 text-amber-500" />
          <span>Operational Window: Today (UTC)</span>
        </div>
      </div>

      {/* KPI Highlights */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 sm:p-5">
            <span className="text-xs font-medium uppercase font-mono text-muted-foreground">
              Camera Network Health
            </span>
            <div className="mt-2 text-2xl font-bold font-mono text-foreground sm:text-3xl">
              {cameraAvailabilityPct}%
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {onlineCameras} of {totalCameras} camera nodes actively streaming
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5">
            <span className="text-xs font-medium uppercase font-mono text-muted-foreground">
              Incident Resolution Rate
            </span>
            <div className="mt-2 text-2xl font-bold font-mono text-foreground sm:text-3xl">
              {resolutionRatePct}%
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {resolvedCount} resolved out of {totalIncidentsCount} tracked incidents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5">
            <span className="text-xs font-medium uppercase font-mono text-muted-foreground">
              High / Critical Hazards
            </span>
            <div className="mt-2 text-2xl font-bold font-mono text-red-500 sm:text-3xl">
              {criticalCount + highCount}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {criticalCount} critical emergencies • {highCount} high hazards
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Breakdown Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Severity Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Hazard Severity Distribution</CardTitle>
            <CardDescription className="text-xs">
              Categorization across all recorded facility incidents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-red-500 font-mono">Critical</span>
                <span className="font-mono text-muted-foreground">{criticalCount} incidents</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-red-600 rounded-full"
                  style={{
                    width: `${totalIncidentsCount > 0 ? (criticalCount / totalIncidentsCount) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-amber-500 font-mono">High</span>
                <span className="font-mono text-muted-foreground">{highCount} incidents</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{
                    width: `${totalIncidentsCount > 0 ? (highCount / totalIncidentsCount) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-yellow-600 font-mono">Medium</span>
                <span className="font-mono text-muted-foreground">{medCount} incidents</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-yellow-500 rounded-full"
                  style={{
                    width: `${totalIncidentsCount > 0 ? (medCount / totalIncidentsCount) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-400 font-mono">Low</span>
                <span className="font-mono text-muted-foreground">{lowCount} incidents</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-slate-400 rounded-full"
                  style={{
                    width: `${totalIncidentsCount > 0 ? (lowCount / totalIncidentsCount) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Violations by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Worker Safety Violations by Category
            </CardTitle>
            <CardDescription className="text-xs">
              Anomaly frequency across active computer vision detection heads
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5">
            {violationEntries.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No violation anomalies registered today.
              </div>
            ) : (
              violationEntries.map(([category, count]) => (
                <div
                  key={category}
                  className="flex items-center justify-between border-b border-border pb-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="size-3.5 text-amber-500" />
                    <span className="font-medium text-foreground capitalize">
                      {category.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-foreground">{count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Backend Architecture Notice */}
      <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
        <Info className="size-4 shrink-0 text-amber-500 mt-0.5" />
        <div className="space-y-1">
          <p className="font-medium text-foreground">Operational Data Scope Notice</p>
          <p className="leading-relaxed">
            Analytics metrics on this report are derived directly from real-time database
            transactions. Historical date-range aggregation and automated PDF/CSV export workflows
            will be enabled as the backend analytics worker pipeline is extended.
          </p>
        </div>
      </div>
    </div>
  );
}
