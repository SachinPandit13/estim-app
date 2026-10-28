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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border">
        <div>
          <h2 className="font-heading text-lg font-bold tracking-tight text-foreground sm:text-xl">
            System Telemetry & Platform Diagnostics
          </h2>
          <p className="text-xs text-muted-foreground font-mono">
            Direct monitoring of backend database connection pools, inference API, and session
            tokens
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={fetchDbPool}
          disabled={loading}
          className="h-8 gap-1.5 text-xs font-mono"
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          Check Health
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Database Connection Pool Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="size-4 text-amber-500" />
                <CardTitle className="text-base font-semibold">Database Pool Status</CardTitle>
              </div>
              {dbStatus ? (
                <StatusBadge status={dbStatus.status} />
              ) : (
                <StatusBadge status="warning" label="Connecting..." />
              )}
            </div>
            <CardDescription className="text-xs">
              PostgreSQL connection pooling telemetry
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 font-mono text-xs">
            {error ? (
              <div className="rounded-lg border border-red-500/20 bg-red-50/20 p-3 text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : dbStatus ? (
              <div className="space-y-2">
                <div className="flex justify-between border-b border-border pb-1.5">
                  <span className="text-muted-foreground">Pool Health:</span>
                  <span className="font-semibold text-emerald-500 flex items-center gap-1">
                    <CheckCircle2 className="size-3.5" />
                    Operational
                  </span>
                </div>
                <div className="flex justify-between border-b border-border pb-1.5">
                  <span className="text-muted-foreground">Message:</span>
                  <span className="text-foreground">{dbStatus.message}</span>
                </div>
                {dbStatus.pool_info && (
                  <div className="pt-1">
                    <span className="text-muted-foreground block mb-1">Pool Info Dump:</span>
                    <pre className="p-2 rounded bg-muted text-[11px] overflow-x-auto">
                      {JSON.stringify(dbStatus.pool_info, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-4 text-center text-muted-foreground">
                Querying database pool status...
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Session Diagnostics Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="size-4 text-amber-500" />
              <CardTitle className="text-base font-semibold">Active Session Telemetry</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Current authenticated supervisor identity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 font-mono text-xs">
            <div className="flex justify-between border-b border-border pb-1.5">
              <span className="text-muted-foreground">User ID:</span>
              <span className="text-foreground truncate max-w-[180px]">{user?.id || 'N/A'}</span>
            </div>
            <div className="flex justify-between border-b border-border pb-1.5">
              <span className="text-muted-foreground">Account Email:</span>
              <span className="text-foreground">{user?.email || 'N/A'}</span>
            </div>
            <div className="flex justify-between border-b border-border pb-1.5">
              <span className="text-muted-foreground">Assigned Role:</span>
              <span className="font-bold text-amber-500 uppercase">{user?.role || 'Member'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Security State:</span>
              <span className="text-emerald-500 flex items-center gap-1">
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
            <Server className="size-4 text-amber-500" />
            <CardTitle className="text-base font-semibold">
              Inference Engine & API Endpoints
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Target FastAPI backend server configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 font-mono text-xs">
          <div className="flex justify-between border-b border-border pb-1.5">
            <span className="text-muted-foreground">Inference Base URL:</span>
            <span className="text-foreground">
              {process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8001/api/v1'}
            </span>
          </div>
          <div className="flex justify-between border-b border-border pb-1.5">
            <span className="text-muted-foreground">Telemetry Host:</span>
            <span className="text-foreground">
              {process.env.NEXT_PUBLIC_HEALTH_BASE_URL || 'http://localhost:8001'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Single-Tenant Mode:</span>
            <span className="text-emerald-500 font-bold">Enabled</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
