'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import {
  Server,
  Database,
  User,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { DbPoolStatus } from '@/types/api';

export default function SettingsPage() {
  const { user } = useAuth();
  const [dbStatus, setDbStatus] = useState<DbPoolStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDbPool = async () => {
    setLoading(true);
    try {
      const healthUrl = process.env.NEXT_PUBLIC_HEALTH_BASE_URL || 'http://localhost:8001';
      const res = await fetch(`${healthUrl}/health/db-pool`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      setDbStatus(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not reach database telemetry endpoint');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    const loadInitialHealth = async () => {
      try {
        const healthUrl = process.env.NEXT_PUBLIC_HEALTH_BASE_URL || 'http://localhost:8001';
        const res = await fetch(`${healthUrl}/health/db-pool`);
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data = await res.json();
        if (!ignore) {
          setDbStatus(data);
          setError(null);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(
            err instanceof Error ? err.message : 'Could not reach database telemetry endpoint',
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadInitialHealth();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-border">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            System Telemetry & Platform Diagnostics
          </h2>
          <p className="text-micro text-muted font-mono mt-0.5">
            Direct monitoring of backend database connection pools, inference API, and session
            tokens
          </p>
        </div>

        <Button
          size="sm"
          variant="secondary"
          onClick={fetchDbPool}
          loading={loading}
          loadingText="Checking..."
          className="gap-1.5 font-mono text-xs"
        >
          <RefreshCw className="size-3.5" />
          Check Health
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Database Connection Pool Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="size-4 text-brand" />
                <CardTitle>Database Pool Status</CardTitle>
              </div>
              {dbStatus ? (
                <StatusBadge status={dbStatus.status} />
              ) : (
                <StatusBadge status="warning" label="Connecting..." />
              )}
            </div>
            <CardDescription>PostgreSQL connection pooling telemetry</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 font-mono text-micro">
            {error ? (
              <div className="rounded-[10px] border border-danger/30 bg-danger-muted p-3 text-danger flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : dbStatus ? (
              <div className="space-y-2">
                <div className="flex justify-between border-b border-border pb-1.5">
                  <span className="text-muted">Pool Health:</span>
                  <span className="font-semibold text-success flex items-center gap-1">
                    <CheckCircle2 className="size-3.5" />
                    Operational
                  </span>
                </div>
                <div className="flex justify-between border-b border-border pb-1.5">
                  <span className="text-muted">Message:</span>
                  <span className="text-foreground">{dbStatus.message}</span>
                </div>
                {dbStatus.pool_info && (
                  <div className="pt-1">
                    <span className="text-muted block mb-1">Pool Info Dump:</span>
                    <pre className="p-2.5 rounded-[8px] bg-surface-sunken text-foreground border border-border text-[11px] overflow-x-auto">
                      {JSON.stringify(dbStatus.pool_info, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-4 text-center text-muted">Querying database pool status...</div>
            )}
          </CardContent>
        </Card>

        {/* User Session Diagnostics Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="size-4 text-brand" />
              <CardTitle>Active Session Telemetry</CardTitle>
            </div>
            <CardDescription>Current authenticated supervisor identity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 font-mono text-micro">
            <div className="flex justify-between border-b border-border pb-1.5">
              <span className="text-muted">User ID:</span>
              <span className="text-foreground truncate max-w-[180px]">{user?.id || 'N/A'}</span>
            </div>
            <div className="flex justify-between border-b border-border pb-1.5">
              <span className="text-muted">Account Email:</span>
              <span className="text-foreground">{user?.email || 'N/A'}</span>
            </div>
            <div className="flex justify-between border-b border-border pb-1.5">
              <span className="text-muted">Assigned Role:</span>
              <span className="font-bold text-brand uppercase">{user?.role || 'Member'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Security State:</span>
              <span className="text-success flex items-center gap-1 font-semibold">
                <ShieldCheck className="size-3.5" />
                JWT Bearer Active
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Endpoint Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Server className="size-4 text-brand" />
            <CardTitle>Inference Engine & API Endpoints</CardTitle>
          </div>
          <CardDescription>Target FastAPI backend server configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 font-mono text-micro">
          <div className="flex justify-between border-b border-border pb-1.5">
            <span className="text-muted">Inference Base URL:</span>
            <span className="text-foreground">
              {process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8001/api/v1'}
            </span>
          </div>
          <div className="flex justify-between border-b border-border pb-1.5">
            <span className="text-muted">Telemetry Host:</span>
            <span className="text-foreground">
              {process.env.NEXT_PUBLIC_HEALTH_BASE_URL || 'http://localhost:8001'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Single-Tenant Mode:</span>
            <span className="text-success font-bold">Enabled</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
