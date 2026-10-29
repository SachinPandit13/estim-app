'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import {
  Video,
  Camera as CameraIcon,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Maximize2,
  SwitchCamera,
  Play,
  Pause,
  ShieldCheck,
  ShieldAlert,
  Activity,
  Flame,
  UserX,
  Users,
} from 'lucide-react';

import type { Camera, TrackedObject, FrameInferenceResponse } from '@/types/api';
import { detectionService } from '@/lib/detection-service';
import { visionDetector } from '@/lib/vision-detector';

interface WebcamStreamProps {
  camera: Camera;
  className?: string;
}

type ModeType =
  | 'live_vision'
  | 'override_compliant'
  | 'override_no_helmet'
  | 'override_no_vest'
  | 'override_fall'
  | 'override_fire';

export function WebcamStreamPlayer({ camera, className }: WebcamStreamProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const missedFramesRef = useRef<number>(0);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [_isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshotTaken, setSnapshotTaken] = useState<boolean>(false);
  const [activeResolution, setActiveResolution] = useState<string>('Detecting...');

  // AI Safety Tracking state
  const [isTrackingEnabled, setIsTrackingEnabled] = useState<boolean>(true);
  const [trackedWorkers, setTrackedWorkers] = useState<TrackedObject[]>([]);
  const [activeViolations, setActiveViolations] = useState<string[]>([]);
  const [activeHazards, setActiveHazards] = useState<string[]>([]);
  const [detectionMode, setDetectionMode] = useState<ModeType>('live_vision');
  const [incidentAlert, setIncidentAlert] = useState<{ message: string; id?: string } | null>(null);
  const [humanDetected, setHumanDetected] = useState<boolean>(false);

  // Enumerate connected cameras
  const refreshDevices = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      setError('Media devices API is not supported in this browser environment.');
      return;
    }
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices.filter((d) => d.kind === 'videoinput');
      setDevices(videoInputs);
      if (videoInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoInputs[0].deviceId);
      }
    } catch {
      // Permission not yet granted
    }
  }, [selectedDeviceId]);

  // Start webcam feed with clean unmount
  useEffect(() => {
    let isMounted = true;

    const startWebcam = async () => {
      setError(null);
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        if (isMounted) setError('Webcam streaming is not supported on this device/browser.');
        return;
      }

      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      try {
        const constraints: MediaStreamConstraints = {
          video: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true,
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener(
            'loadedmetadata',
            () => {
              if (videoRef.current) {
                setActiveResolution(
                  `${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`,
                );
              }
            },
            { once: true },
          );
        }

        setIsPlaying(true);
        setIsPaused(false);
        refreshDevices();
      } catch (err: unknown) {
        if (!isMounted) return;
        if (err instanceof DOMException && err.name === 'NotAllowedError') {
          setError(
            'Camera permission denied. Please allow camera access in your browser settings.',
          );
        } else if (err instanceof DOMException && err.name === 'NotFoundError') {
          setError('No camera device found on this system.');
        } else if (err instanceof DOMException && err.name === 'NotReadableError') {
          setError('Camera is in use by another application (e.g. Teams, Zoom).');
        } else {
          setError(err instanceof Error ? err.message : 'Failed to connect to local camera.');
        }
      }
    };

    startWebcam();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [selectedDeviceId, refreshDevices]);

  // Render bounding box HUD overlay on canvas
  const drawHud = useCallback(
    (workers: TrackedObject[], hazards: string[] = []) => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;

      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!isTrackingEnabled) return;

      // Draw Environmental Hazards overlay if any detected
      if (hazards.length > 0) {
        hazards.forEach((hazard, hIdx) => {
          const isFire = hazard.includes('FIRE');
          const bannerY = 10 + hIdx * 32;
          ctx.fillStyle = isFire ? 'rgba(220, 38, 38, 0.95)' : 'rgba(71, 85, 105, 0.95)';
          ctx.fillRect(10, bannerY, 230, 26);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.strokeRect(10, bannerY, 230, 26);

          ctx.font = 'bold 11px monospace';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(
            isFire ? '🔥 CRITICAL: FIRE DETECTED' : '💨 WARNING: SMOKE DETECTED',
            18,
            bannerY + 17,
          );
        });
      }

      workers.forEach((worker) => {
        const [xMin, yMin, xMax, yMax] = worker.bbox;
        const x = xMin * canvas.width;
        const y = yMin * canvas.height;
        const w = (xMax - xMin) * canvas.width;
        const h = (yMax - yMin) * canvas.height;

        let strokeColor = '#10b981'; // green / compliant
        let fillColor = 'rgba(16, 185, 129, 0.08)';

        if (worker.status === 'violation') {
          strokeColor = '#ef4444'; // red / critical
          fillColor = 'rgba(239, 68, 68, 0.15)';
        } else if (worker.status === 'warning') {
          strokeColor = '#f59e0b'; // amber / warning
          fillColor = 'rgba(245, 158, 11, 0.12)';
        }

        // 1. Fill worker region
        ctx.fillStyle = fillColor;
        ctx.fillRect(x, y, w, h);

        // 2. High-Tech Corner Brackets
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2.5;
        const cornerLen = Math.min(22, w * 0.25, h * 0.25);

        // Top-Left
        ctx.beginPath();
        ctx.moveTo(x, y + cornerLen);
        ctx.lineTo(x, y);
        ctx.lineTo(x + cornerLen, y);
        ctx.stroke();

        // Top-Right
        ctx.beginPath();
        ctx.moveTo(x + w - cornerLen, y);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x + w, y + cornerLen);
        ctx.stroke();

        // Bottom-Left
        ctx.beginPath();
        ctx.moveTo(x, y + h - cornerLen);
        ctx.lineTo(x, y + h);
        ctx.lineTo(x + cornerLen, y + h);
        ctx.stroke();

        // Bottom-Right
        ctx.beginPath();
        ctx.moveTo(x + w - cornerLen, y + h);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x + w, y + h - cornerLen);
        ctx.stroke();

        // 3. Header Pill Badge (Worker ID + Confidence)
        const headerText = `Worker #${worker.track_id} • ${Math.round(worker.confidence * 100)}%`;
        ctx.font = 'bold 11px monospace';
        const textMetrics = ctx.measureText(headerText);
        const badgeW = textMetrics.width + 16;
        const badgeH = 20;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(x, Math.max(0, y - badgeH - 4), badgeW, badgeH);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, Math.max(0, y - badgeH - 4), badgeW, badgeH);

        ctx.fillStyle = strokeColor;
        ctx.fillText(headerText, x + 8, Math.max(0, y - badgeH - 4) + 14);

        // 4. PPE / Violation Indicator Tags
        const tags: { text: string; ok: boolean }[] = [];
        tags.push({
          text: worker.has_helmet ? '⛑️ Helmet: OK' : '⛑️ NO HELMET',
          ok: worker.has_helmet,
        });
        tags.push({
          text: worker.has_vest ? '🦺 Vest: OK' : '🦺 NO VEST',
          ok: worker.has_vest,
        });
        if (worker.is_fallen) {
          tags.push({ text: '🚨 FALL DETECTED', ok: false });
        }
        if (worker.current_zone_name) {
          tags.push({ text: `⛔ ${worker.current_zone_name}`, ok: false });
        }

        let tagY = y + 16;
        tags.forEach((tag) => {
          ctx.font = 'bold 10px monospace';
          const tm = ctx.measureText(tag.text);
          const tW = tm.width + 12;
          const tH = 18;

          ctx.fillStyle = tag.ok ? 'rgba(16, 185, 129, 0.85)' : 'rgba(239, 68, 68, 0.85)';
          ctx.fillRect(x + 6, tagY, tW, tH);
          ctx.fillStyle = '#ffffff';
          ctx.fillText(tag.text, x + 12, tagY + 13);
          tagY += 22;
        });
      });
    },
    [isTrackingEnabled],
  );

  // Real Computer Vision Safety Inference Loop
  useEffect(() => {
    if (!isTrackingEnabled || isPaused || Boolean(error)) {
      return;
    }

    let isMounted = true;
    let inFlight = false;

    const interval = setInterval(async () => {
      if (!videoRef.current || inFlight || videoRef.current.readyState < 2) return;
      inFlight = true;

      try {
        // 1. Run real computer vision analysis directly on video frame pixels
        const detailed = visionDetector.analyzeFrameDetailed(videoRef.current);
        const realCandidates = detailed.workers;
        const hazards = [...detailed.hazards];
        if (detectionMode === 'override_fire' && !hazards.includes('FIRE_DETECTED')) {
          hazards.push('FIRE_DETECTED');
        }

        if (!isMounted) return;
        setActiveHazards(hazards);

        // 2. Capture downscaled frame for deep learning YOLO inference
        let imageBase64: string | undefined = undefined;
        try {
          const offscreen = document.createElement('canvas');
          const targetW = 640;
          const vW = videoRef.current.videoWidth || 640;
          const vH = videoRef.current.videoHeight || 480;
          const targetH = Math.round((targetW / vW) * vH);
          offscreen.width = targetW;
          offscreen.height = targetH;
          const offCtx = offscreen.getContext('2d');
          if (offCtx) {
            offCtx.drawImage(videoRef.current, 0, 0, targetW, targetH);
            imageBase64 = offscreen.toDataURL('image/jpeg', 0.65);
          }
        } catch {
          // Offscreen capture fallback
        }

        // 3. Prepare payload candidates for all detected workers dynamically
        const payloadCandidates = realCandidates.map((cand, idx) => {
          let finalHasHelmet = cand.has_helmet;
          let finalHasVest = cand.has_vest;
          let finalIsFallen = cand.is_fallen;

          if (detectionMode === 'override_compliant') {
            finalHasHelmet = true;
            finalHasVest = true;
            finalIsFallen = false;
          } else if (detectionMode === 'override_no_helmet') {
            if (idx === 0) finalHasHelmet = false;
          } else if (detectionMode === 'override_no_vest') {
            if (idx === 0) finalHasVest = false;
          } else if (detectionMode === 'override_fall') {
            if (idx === 0) finalIsFallen = true;
          }

          return {
            bbox: cand.bbox,
            confidence: cand.confidence,
            has_helmet: finalHasHelmet,
            has_vest: finalHasVest,
            is_fallen: finalIsFallen,
          };
        });

        // 4. Send frame and candidates to backend YOLO inference and MOT tracker
        const resp: FrameInferenceResponse = await detectionService.inferFrame({
          camera_id: camera.id,
          image_base64: imageBase64,
          trigger_incidents: true,
          simulated_detections: payloadCandidates,
          environmental_hazards: hazards,
        });

        if (!isMounted) return;

        const workers = resp.tracked_workers || [];
        if (workers.length > 0) {
          missedFramesRef.current = 0;
          setHumanDetected(true);
          setTrackedWorkers(workers);
          setActiveViolations(resp.violations_detected || []);
          drawHud(workers, hazards);
        } else {
          missedFramesRef.current = 0;
          setHumanDetected(false);
          setTrackedWorkers([]);
          setActiveViolations([]);

          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx?.clearRect(0, 0, canvas.width, canvas.height);
          }
          if (hazards.length > 0) {
            drawHud([], hazards);
          }
        }

        if (resp.incident_created) {
          const alertDesc =
            resp.violations_detected.length > 0
              ? resp.violations_detected.join(', ')
              : hazards.join(', ');
          setIncidentAlert({
            message: `New Incident Logged: ${alertDesc}`,
            id: resp.incident_id || undefined,
          });
          setTimeout(() => setIncidentAlert(null), 5000);
        }
      } catch {
        // Suppress network jitter errors in continuous inference loop
      } finally {
        inFlight = false;
      }
    }, 700);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [camera.id, isTrackingEnabled, isPaused, error, detectionMode, drawHud]);

  // Pause / Resume playback
  const togglePause = () => {
    if (!videoRef.current) return;
    if (isPaused) {
      videoRef.current.play();
      setIsPaused(false);
    } else {
      videoRef.current.pause();
      setIsPaused(true);
      missedFramesRef.current = 0;
      setTrackedWorkers([]);
      setActiveViolations([]);
      setActiveHazards([]);
      setHumanDetected(false);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  // Snapshot frame capture
  const captureSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    setSnapshotTaken(true);
    setTimeout(() => setSnapshotTaken(false), 2000);

    const link = document.createElement('a');
    link.download = `estim-webcam-${camera.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 0.9);
    link.click();
  };

  // Fullscreen
  const toggleFullscreen = () => {
    if (videoRef.current?.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  return (
    <div
      className={`relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-4 text-slate-200 shadow-md ${className}`}
    >
      {/* Top Bar HUD */}
      <div className="flex items-start justify-between gap-2 z-10 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Video className="size-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="font-heading text-sm font-semibold text-slate-100 leading-none">
                {camera.name}
              </h4>
              <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase text-amber-400">
                Local Device
              </span>
              {isTrackingEnabled && (
                <span className="rounded bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase text-emerald-400 flex items-center gap-1">
                  <Activity className="size-2.5 animate-pulse" />
                  REAL VISION AI ON
                </span>
              )}
            </div>
            <p className="mt-1 text-[11px] text-slate-400 font-mono">
              {camera.location || 'Local Workstation'} • {activeResolution}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeHazards.length > 0 && (
            <span className="rounded bg-red-600/30 border border-red-500 px-2 py-0.5 text-[10px] font-mono font-bold uppercase text-red-300 flex items-center gap-1 animate-pulse">
              <Flame className="size-3 text-red-400" />
              {activeHazards.join(', ')}
            </span>
          )}
          {activeViolations.length > 0 && (
            <span className="rounded bg-red-500/20 border border-red-500/40 px-2 py-0.5 text-[10px] font-mono font-bold uppercase text-red-400 flex items-center gap-1 animate-pulse">
              <AlertCircle className="size-3" />
              {activeViolations.length} VIOLATION
            </span>
          )}
          <StatusBadge status={error ? 'error' : isPaused ? 'warning' : 'online'} />
        </div>
      </div>

      {/* Video Viewport */}
      <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-slate-900 bg-slate-900/80 flex items-center justify-center">
        {/* Native HTML5 Video Element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`h-full w-full object-cover transition-opacity ${
            error ? 'opacity-0' : isPaused ? 'opacity-60' : 'opacity-100'
          }`}
        />

        {/* Live Safety Tracking HUD Canvas Overlay */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full pointer-events-none z-10"
        />

        {/* Live HUD Status Pill */}
        {!error && (
          <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded bg-slate-950/80 backdrop-blur-xs px-2 py-0.5 text-[10px] font-mono text-emerald-400 border border-emerald-500/30 z-20">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>LIVE HARDWARE STREAM</span>
            {humanDetected && trackedWorkers.length > 0 ? (
              <span className="text-emerald-400 border-l border-slate-700 pl-1.5 flex items-center gap-1.5 font-bold">
                <Users className="size-3 text-emerald-400" />
                <span>
                  {trackedWorkers.length} {trackedWorkers.length === 1 ? 'Worker' : 'Workers'}{' '}
                  Tracked
                </span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                  {trackedWorkers.filter((w) => w.status === 'compliant').length} OK
                </span>
                {trackedWorkers.some((w) => w.status !== 'compliant') && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-red-500/20 text-red-400">
                    {trackedWorkers.filter((w) => w.status !== 'compliant').length} Alert
                  </span>
                )}
              </span>
            ) : (
              <span className="text-slate-400 border-l border-slate-700 pl-1.5 flex items-center gap-1 font-mono">
                <UserX className="size-3 text-slate-500" />0 WORKERS DETECTED • AREA CLEAR
              </span>
            )}
          </div>
        )}

        {/* Incident Trigger Banner Alert */}
        {incidentAlert && (
          <div className="absolute top-2 right-2 bg-red-950/90 border border-red-500 text-red-200 px-3 py-1 rounded text-xs font-mono flex items-center gap-2 shadow-lg animate-bounce z-20">
            <Flame className="size-3.5 text-red-400" />
            <span>{incidentAlert.message}</span>
          </div>
        )}

        {/* Snapshot flash feedback */}
        {snapshotTaken && (
          <div className="absolute inset-0 bg-white/20 flex items-center justify-center pointer-events-none transition-all z-30">
            <div className="rounded-lg bg-slate-900/90 border border-amber-500 px-3 py-1.5 text-xs font-mono text-amber-400 flex items-center gap-1.5 shadow-lg">
              <CheckCircle2 className="size-4 text-emerald-400" />
              Snapshot Saved
            </div>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 p-4 flex flex-col items-center justify-center text-center bg-slate-950/90 space-y-2 z-30">
            <AlertCircle className="size-8 text-red-500 shrink-0" />
            <p className="text-xs text-red-300 font-mono max-w-xs">{error}</p>
            <Button
              size="xs"
              variant="outline"
              onClick={() => setSelectedDeviceId(selectedDeviceId)}
              className="mt-2 h-7 text-xs font-mono gap-1 border-slate-700 bg-slate-900"
            >
              <RefreshCw className="size-3" />
              Retry Connection
            </Button>
          </div>
        )}
      </div>

      {/* Safety Mode Bar */}
      <div className="mt-2 flex items-center justify-between gap-1 rounded bg-slate-900/60 p-1.5 border border-slate-800/80 text-[11px] font-mono z-10">
        <div className="flex items-center gap-1 text-slate-400">
          <ShieldAlert className="size-3 text-amber-400" />
          <span>Vision Analysis:</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setDetectionMode('live_vision')}
            className={`px-2 py-0.5 rounded font-bold transition ${
              detectionMode === 'live_vision'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Real-time Computer Vision detecting actual human body, hardhat & vest colors"
          >
            Live Vision (Real)
          </button>
          <button
            type="button"
            onClick={() => setDetectionMode('override_no_helmet')}
            className={`px-1.5 py-0.5 rounded transition ${
              detectionMode === 'override_no_helmet'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Test: No Helmet
          </button>
          <button
            type="button"
            onClick={() => setDetectionMode('override_no_vest')}
            className={`px-1.5 py-0.5 rounded transition ${
              detectionMode === 'override_no_vest'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Test: No Vest
          </button>
          <button
            type="button"
            onClick={() => setDetectionMode('override_fall')}
            className={`px-1.5 py-0.5 rounded transition ${
              detectionMode === 'override_fall'
                ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Test: Fall
          </button>
          <button
            type="button"
            onClick={() => setDetectionMode('override_fire')}
            className={`px-1.5 py-0.5 rounded transition ${
              detectionMode === 'override_fire'
                ? 'bg-red-600/30 text-red-300 border border-red-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Test: Fire
          </button>
        </div>
      </div>

      {/* Bottom Controls Bar */}
      <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-900 z-10 text-xs font-mono">
        {/* Device selector */}
        {devices.length > 1 ? (
          <div className="flex items-center gap-1.5">
            <SwitchCamera className="size-3.5 text-slate-500" />
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="h-6 rounded border border-slate-800 bg-slate-900 px-1 text-[11px] text-slate-300 font-mono outline-hidden max-w-[130px] truncate"
            >
              {devices.map((d, idx) => (
                <option key={d.deviceId || idx} value={d.deviceId}>
                  {d.label || `Camera ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <CheckCircle2 className="size-3 text-emerald-500" />
            Default Device
          </span>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-1.5">
          <Button
            size="xs"
            variant="ghost"
            onClick={() => {
              const next = !isTrackingEnabled;
              setIsTrackingEnabled(next);
              if (!next) {
                missedFramesRef.current = 0;
                setTrackedWorkers([]);
                setActiveViolations([]);
                setActiveHazards([]);
                setHumanDetected(false);
                const canvas = canvasRef.current;
                if (canvas) {
                  const ctx = canvas.getContext('2d');
                  ctx?.clearRect(0, 0, canvas.width, canvas.height);
                }
              }
            }}
            className={`h-6 px-2 text-[10px] font-mono gap-1 ${
              isTrackingEnabled
                ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Toggle AI Worker Safety Tracking"
          >
            {isTrackingEnabled ? (
              <>
                <ShieldCheck className="size-3" />
                AI HUD [ON]
              </>
            ) : (
              <>
                <ShieldAlert className="size-3" />
                AI HUD [OFF]
              </>
            )}
          </Button>

          <Button
            size="xs"
            variant="ghost"
            onClick={togglePause}
            disabled={Boolean(error)}
            className="h-6 w-6 p-0 text-slate-400 hover:text-slate-100"
            title={isPaused ? 'Resume Stream' : 'Pause Stream'}
          >
            {isPaused ? <Play className="size-3" /> : <Pause className="size-3" />}
          </Button>

          <Button
            size="xs"
            variant="ghost"
            onClick={captureSnapshot}
            disabled={Boolean(error)}
            className="h-6 w-6 p-0 text-slate-400 hover:text-slate-100"
            title="Capture Snapshot"
          >
            <CameraIcon className="size-3" />
          </Button>

          <Button
            size="xs"
            variant="ghost"
            onClick={toggleFullscreen}
            disabled={Boolean(error)}
            className="h-6 w-6 p-0 text-slate-400 hover:text-slate-100"
            title="Fullscreen"
          >
            <Maximize2 className="size-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
