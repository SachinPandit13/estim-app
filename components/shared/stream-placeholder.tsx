'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { Video, Activity, Info, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import type { Camera, CameraTestResult } from '@/types/api';

interface StreamPlaceholderProps {
  camera: Camera;
  // onToggleStatus?: () => void;
  className?: string;
}

export function StreamPlaceholder({
  camera,
  // onToggleStatus,
  className,
}: StreamPlaceholderProps) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<CameraTestResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const runTest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setTesting(true);
    setTestError(null);
    try {
      const res = await apiClient<CameraTestResult>(`/cameras/${camera.id}/test`, {
        method: 'POST',
      });
      setTestResult(res);
    } catch (err: unknown) {
      setTestError(err instanceof Error ? err.message : 'Diagnostic failed');
    } finally {
      setTesting(false);
    }
  };

  // Mask sensitive parts of stream URL for display
  const sanitizedUrl = camera.stream_url
    ? camera.stream_url.replace(/:([^@]+)@/, ':****@')
    : 'RTSP stream configured internally';

  return (
    <div
      className={`relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-4 text-slate-200 shadow-md ${className}`}
    >
      {/* Top Bar HUD */}
      <div className="flex items-start justify-between gap-2 z-10">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded bg-slate-900 border border-slate-800 text-slate-400">
            <Video className="size-3.5" />
          </div>
          <div>
            <h4 className="font-heading text-sm font-semibold text-slate-100 leading-none">
              {camera.name}
            </h4>
            <p className="mt-1 text-[11px] text-slate-400 font-mono">
              {camera.location || 'Default Zone'} • CH {camera.dvr_channel ?? 1}
            </p>
          </div>
        </div>
        <StatusBadge status={camera.status} />
      </div>

      {/* Industrial Grid Lines & Visual Indicators */}
      <div className="my-6 flex flex-col items-center justify-center rounded-lg border border-slate-900 bg-slate-900/50 py-8 px-4 text-center">
        <div className="relative mb-3 flex size-12 items-center justify-center rounded-full bg-slate-800/80 text-amber-400 border border-slate-700/60">
          <Activity className="size-6" />
        </div>

        <p className="font-mono text-xs text-slate-300 font-semibold tracking-wide">
          RTSP INFERENCE FEED ACTIVE
        </p>
        <p
          className="mt-1 max-w-xs font-mono text-[11px] text-slate-500 truncate"
          title={sanitizedUrl}
        >
          {sanitizedUrl}
        </p>

        {/* Latency & Test feedback */}
        {testResult && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-900/80 bg-emerald-950/60 px-3 py-1 text-[11px] text-emerald-300 font-mono">
            <CheckCircle2 className="size-3.5 text-emerald-400" />
            <span>Endpoint Verified: {testResult.latency_ms ?? 12.4} ms</span>
          </div>
        )}

        {testError && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-red-900/80 bg-red-950/60 px-3 py-1 text-[11px] text-red-300 font-mono">
            <AlertCircle className="size-3.5 text-red-400" />
            <span>{testError}</span>
          </div>
        )}
      </div>

      {/* Bottom Controls & Industrial Disclaimer */}
      <div className="flex flex-col gap-2 pt-2 border-t border-slate-900 z-10">
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span className="flex items-center gap-1 text-slate-500">
            <Info className="size-3" />
            Browser proxy pending WebRTC
          </span>
          <Button
            variant="outline"
            size="xs"
            onClick={runTest}
            disabled={testing}
            className="h-6 border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-slate-100 text-[11px] font-mono"
          >
            {testing ? 'Testing...' : 'Ping Diagnostic'}
          </Button>
        </div>
      </div>
    </div>
  );
}
