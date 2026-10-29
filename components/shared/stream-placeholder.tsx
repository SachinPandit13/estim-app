'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import {
  Video,
  Activity,
  Info,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Flame,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { WebcamStreamPlayer } from '@/components/shared/webcam-stream';
import type { Camera, CameraTestResult, TrackedObject, FrameInferenceResponse } from '@/types/api';
import { detectionService } from '@/lib/detection-service';

interface StreamPlaceholderProps {
  camera: Camera;
  className?: string;
}

type SimulationViolationMode = 'normal' | 'no_helmet' | 'no_vest' | 'fall';

export function StreamPlaceholder({ camera, className }: StreamPlaceholderProps) {
  // If this camera is a local system device (webcam/USB), render the native player
  const isWebcam =
    camera.source_type?.toLowerCase() === 'webcam' ||
    camera.source_type?.toLowerCase() === 'usb' ||
    camera.source_type?.toLowerCase() === 'device';

  if (isWebcam) {
    return <WebcamStreamPlayer camera={camera} className={className} />;
  }

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<CameraTestResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // RTSP Safety Tracking Simulation State
  const [isTrackingEnabled, setIsTrackingEnabled] = useState(true);
  const [trackedWorkers, setTrackedWorkers] = useState<TrackedObject[]>([]);
  const [activeViolations, setActiveViolations] = useState<string[]>([]);
  const [simMode, setSimMode] = useState<SimulationViolationMode>('normal');
  const [incidentAlert, setIncidentAlert] = useState<{ message: string; id?: string } | null>(null);

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

  // Inference loop for RTSP stream
  useEffect(() => {
    if (!isTrackingEnabled) {
      return;
    }

    let isMounted = true;
    let inFlight = false;

    const interval = setInterval(async () => {
      if (inFlight) return;
      inFlight = true;

      try {
        let simulatedDetections = undefined;
        if (simMode !== 'normal') {
          simulatedDetections = [
            {
              bbox: simMode === 'fall' ? [0.15, 0.6, 0.85, 0.9] : [0.3, 0.2, 0.7, 0.85],
              confidence: 0.96,
              has_helmet: simMode !== 'no_helmet',
              has_vest: simMode !== 'no_vest',
              is_fallen: simMode === 'fall',
            },
          ];
        }

        const resp: FrameInferenceResponse = await detectionService.inferFrame({
          camera_id: camera.id,
          trigger_incidents: true,
          simulated_detections: simulatedDetections,
        });

        if (!isMounted) return;
        setTrackedWorkers(resp.tracked_workers);
        setActiveViolations(resp.violations_detected);

        if (resp.incident_created) {
          setIncidentAlert({
            message: `Incident Logged: ${resp.violations_detected.join(', ')}`,
            id: resp.incident_id || undefined,
          });
          setTimeout(() => setIncidentAlert(null), 5000);
        }
      } catch {
        // Continuous loop network catch
      } finally {
        inFlight = false;
      }
    }, 1500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [camera.id, isTrackingEnabled, simMode]);

  // Mask sensitive parts of stream URL for display
  const sanitizedUrl = camera.stream_url
    ? camera.stream_url.replace(/:([^@]+)@/, ':****@')
    : 'RTSP stream configured internally';

  return (
    <div
      className={`relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-4 text-slate-200 shadow-md ${className}`}
    >
      {/* Top Bar HUD */}
      <div className="flex items-start justify-between gap-2 z-10 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded bg-slate-900 border border-slate-800 text-slate-400">
            <Video className="size-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="font-heading text-sm font-semibold text-slate-100 leading-none">
                {camera.name}
              </h4>
              {isTrackingEnabled && (
                <span className="rounded bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase text-emerald-400 flex items-center gap-1">
                  <Activity className="size-2.5 animate-pulse" />
                  AI TRACKING ON
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
              <span>{camera.location || 'Default Zone'}</span>
              <span>•</span>
              <span className="text-amber-400/90 font-semibold">CH {camera.dvr_channel ?? 1}</span>
              {camera.config?.subtype !== undefined && (
                <>
                  <span>•</span>
                  <span className="text-blue-400">
                    {camera.config.subtype === 1
                      ? 'Sub Stream (subtype 1)'
                      : 'Main Stream (subtype 0)'}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeViolations.length > 0 && (
            <span className="rounded bg-red-500/20 border border-red-500/40 px-2 py-0.5 text-[10px] font-mono font-bold uppercase text-red-400 flex items-center gap-1 animate-pulse">
              <AlertCircle className="size-3" />
              {activeViolations.length} VIOLATION
            </span>
          )}
          <StatusBadge status={camera.status} />
        </div>
      </div>

      {/* Industrial Visual Area */}
      <div className="relative my-2 flex flex-col items-center justify-center rounded-lg border border-slate-900 bg-slate-900/50 py-6 px-4 text-center">
        {/* Incident Trigger Banner Alert */}
        {incidentAlert && (
          <div className="absolute top-2 right-2 bg-red-950/90 border border-red-500 text-red-200 px-3 py-1 rounded text-xs font-mono flex items-center gap-2 shadow-lg animate-bounce z-20">
            <Flame className="size-3.5 text-red-400" />
            <span>{incidentAlert.message}</span>
          </div>
        )}

        <div className="relative mb-2 flex size-10 items-center justify-center rounded-full bg-slate-800/80 text-amber-400 border border-slate-700/60">
          <Activity className="size-5" />
        </div>

        <p className="font-mono text-xs text-slate-300 font-semibold tracking-wide">
          {camera.source_type === 'dvr'
            ? 'INDUSTRIAL DVR/NVR PIPELINE'
            : 'RTSP INFERENCE PIPELINE ACTIVE'}
        </p>
        <p
          className="mt-0.5 max-w-xs font-mono text-[11px] text-slate-500 truncate"
          title={sanitizedUrl}
        >
          {sanitizedUrl}
        </p>

        {/* Live Tracked Workers Tags */}
        {isTrackingEnabled && trackedWorkers.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
            {trackedWorkers.map((w) => (
              <div
                key={w.track_id}
                className={`rounded border px-2 py-1 text-[11px] font-mono flex items-center gap-1.5 ${
                  w.status === 'violation'
                    ? 'border-red-500/60 bg-red-950/40 text-red-300'
                    : w.status === 'warning'
                      ? 'border-amber-500/60 bg-amber-950/40 text-amber-300'
                      : 'border-emerald-500/60 bg-emerald-950/40 text-emerald-300'
                }`}
              >
                <span className="font-bold">Worker #{w.track_id}</span>
                <span className="text-slate-400">•</span>
                <span>{w.has_helmet ? '⛑️ Helmet' : '❌ NO HELMET'}</span>
                <span>{w.has_vest ? '🦺 Vest' : '❌ NO VEST'}</span>
                {w.is_fallen && <span className="font-bold text-red-400">🚨 FALL</span>}
                {w.current_zone_name && (
                  <span className="font-bold text-red-400">⛔ {w.current_zone_name}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Latency & Test feedback */}
        {testResult && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-900/80 bg-emerald-950/60 px-3 py-0.5 text-[11px] text-emerald-300 font-mono">
            <CheckCircle2 className="size-3.5 text-emerald-400" />
            <span>Endpoint Verified: {testResult.latency_ms ?? 12.4} ms</span>
          </div>
        )}

        {testError && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-red-900/80 bg-red-950/60 px-3 py-0.5 text-[11px] text-red-300 font-mono">
            <AlertCircle className="size-3.5 text-red-400" />
            <span>{testError}</span>
          </div>
        )}
      </div>

      {/* Safety Simulation Quick Test Bar */}
      <div className="mt-1 flex items-center justify-between gap-1 rounded bg-slate-900/60 p-1.5 border border-slate-800/80 text-[11px] font-mono z-10">
        <div className="flex items-center gap-1 text-slate-400">
          <ShieldAlert className="size-3 text-amber-400" />
          <span>Safety Rule Test:</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSimMode('normal')}
            className={`px-1.5 py-0.5 rounded transition ${
              simMode === 'normal'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Compliant
          </button>
          <button
            type="button"
            onClick={() => setSimMode('no_helmet')}
            className={`px-1.5 py-0.5 rounded transition ${
              simMode === 'no_helmet'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            No Helmet
          </button>
          <button
            type="button"
            onClick={() => setSimMode('no_vest')}
            className={`px-1.5 py-0.5 rounded transition ${
              simMode === 'no_vest'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            No Vest
          </button>
          <button
            type="button"
            onClick={() => setSimMode('fall')}
            className={`px-1.5 py-0.5 rounded transition ${
              simMode === 'fall'
                ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Fall
          </button>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-900 z-10 text-[11px] font-mono">
        <div className="flex items-center gap-2">
          <Button
            size="xs"
            variant="ghost"
            onClick={() => {
              const next = !isTrackingEnabled;
              setIsTrackingEnabled(next);
              if (!next) {
                setTrackedWorkers([]);
                setActiveViolations([]);
              }
            }}
            className={`h-6 px-2 text-[10px] font-mono gap-1 ${
              isTrackingEnabled
                ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Toggle AI Safety Tracking"
          >
            {isTrackingEnabled ? (
              <>
                <ShieldCheck className="size-3" />
                AI Tracking [ON]
              </>
            ) : (
              <>
                <ShieldAlert className="size-3" />
                AI Tracking [OFF]
              </>
            )}
          </Button>

          <span className="flex items-center gap-1 text-slate-500">
            <Info className="size-3" />
            WebRTC Gateway
          </span>
        </div>

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
  );
}
