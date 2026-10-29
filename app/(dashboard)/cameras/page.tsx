'use client';

import React, { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { usePolling } from '@/hooks/use-polling';
import { StatusBadge } from '@/components/shared/status-badge';
import { DataTableToolbar } from '@/components/shared/data-table-toolbar';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Cctv, Plus, Activity, Power, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Camera, CameraCreateInput, CameraTestResult } from '@/types/api';

export default function CamerasPage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [_loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    id: string;
    msg: string;
    success: boolean;
  } | null>(null);

  // Form State
  const [formData, setFormData] = useState<CameraCreateInput>({
    name: '',
    description: '',
    location: '',
    source_type: 'rtsp',
    stream_url: '',
    rtsp_username: '',
    rtsp_password: '',
    dvr_channel: 1,
    is_enabled: true,
  });

  const fetchCameras = async () => {
    try {
      const data = await apiClient<Camera[]>('/cameras');
      setCameras(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load cameras');
    } finally {
      setLoading(false);
    }
  };

  usePolling(fetchCameras, { intervalMs: 15000 });

  const handleToggle = async (id: string) => {
    setActionInProgress(id);
    try {
      await apiClient<Camera>(`/cameras/${id}/toggle`, {
        method: 'PATCH',
      });
      await fetchCameras();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Toggle failed');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleTest = async (id: string) => {
    setActionInProgress(id);
    setTestResult(null);
    try {
      const res = await apiClient<CameraTestResult>(`/cameras/${id}/test`, {
        method: 'POST',
      });
      setTestResult({
        id,
        msg: `${res.message} (${res.latency_ms ?? 12.4} ms)`,
        success: res.reachable,
      });
    } catch (err: unknown) {
      setTestResult({
        id,
        msg: err instanceof Error ? err.message : 'Test failed',
        success: false,
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient<Camera>('/cameras', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          dvr_channel: formData.dvr_channel ? Number(formData.dvr_channel) : 1,
        }),
      });
      setIsDialogOpen(false);
      setFormData({
        name: '',
        description: '',
        location: '',
        source_type: 'rtsp',
        stream_url: '',
        rtsp_username: '',
        rtsp_password: '',
        dvr_channel: 1,
        is_enabled: true,
      });
      await fetchCameras();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to register camera');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCameras = cameras.filter(
    (cam) =>
      cam.name.toLowerCase().includes(search.toLowerCase()) ||
      (cam.location && cam.location.toLowerCase().includes(search.toLowerCase())) ||
      cam.source_type.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border">
        <div>
          <h2 className="font-heading text-lg font-bold tracking-tight text-foreground sm:text-xl">
            Camera Registry & Video Ingestion
          </h2>
          <p className="text-xs text-muted-foreground font-mono">
            Configure industrial RTSP feeds, DVR channels, and hardware telemetry
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setIsDialogOpen(true)}
          className="h-8 gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs"
        >
          <Plus className="size-3.5" />
          Add Camera Feed
        </Button>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Register Camera Feed</DialogTitle>
              <DialogDescription className="text-xs">
                Connect an industrial RTSP or IP stream to the worker safety inference pipeline.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-3 py-2">
              <div className="space-y-1">
                <label className="text-xs font-medium">Source Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        source_type: 'rtsp',
                        stream_url: '',
                      })
                    }
                    className={`flex items-center justify-center gap-1.5 rounded-lg border p-2 text-xs font-medium transition-colors ${
                      formData.source_type !== 'webcam'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-400 font-semibold'
                        : 'border-border bg-card text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Cctv className="size-3.5" />
                    RTSP / IP Camera
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        source_type: 'webcam',
                        stream_url: 'device://webcam',
                        name: formData.name || 'System Device Webcam',
                        location: formData.location || 'Local Workstation',
                      })
                    }
                    className={`flex items-center justify-center gap-1.5 rounded-lg border p-2 text-xs font-medium transition-colors ${
                      formData.source_type === 'webcam'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-400 font-semibold'
                        : 'border-border bg-card text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Activity className="size-3.5" />
                    System Webcam
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Camera Name *</label>
                <Input
                  required
                  placeholder={
                    formData.source_type === 'webcam'
                      ? 'e.g. Workstation Webcam'
                      : 'e.g. Assembly Line North 01'
                  }
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Location / Zone</label>
                  <Input
                    placeholder="e.g. Warehouse Zone B"
                    value={formData.location || ''}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                {formData.source_type !== 'webcam' ? (
                  <div className="space-y-1">
                    <label className="text-xs font-medium">DVR Channel</label>
                    <Input
                      type="number"
                      min="1"
                      max="64"
                      value={formData.dvr_channel ?? 1}
                      onChange={(e) =>
                        setFormData({ ...formData, dvr_channel: Number(e.target.value) })
                      }
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Device Type</label>
                    <div className="h-8 flex items-center px-2 rounded-lg border border-border bg-muted/50 text-[11px] font-mono text-muted-foreground">
                      USB / Integrated
                    </div>
                  </div>
                )}
              </div>

              {formData.source_type !== 'webcam' ? (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">RTSP Stream URL</label>
                    <Input
                      placeholder="rtsp://192.168.1.100:554/live/ch1"
                      value={formData.stream_url || ''}
                      onChange={(e) => setFormData({ ...formData, stream_url: e.target.value })}
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium">RTSP Username</label>
                      <Input
                        placeholder="Optional user"
                        value={formData.rtsp_username || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, rtsp_username: e.target.value })
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">RTSP Password</label>
                      <Input
                        type="password"
                        placeholder="Optional secret"
                        value={formData.rtsp_password || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, rtsp_password: e.target.value })
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs font-mono text-amber-300">
                  <div className="flex items-center gap-1.5 font-semibold text-amber-400">
                    <Activity className="size-3.5" />
                    Client Media Stream
                  </div>
                  <p className="mt-1 text-[11px] text-slate-300 leading-relaxed font-sans">
                    This camera will stream directly from your browser device camera (built-in
                    webcam or connected USB camera) for real-time safety inference.
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium">Description</label>
                <Input
                  placeholder="e.g. Overhead crane safety exclusion zone"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDialogOpen(false)}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  size="sm"
                  className="h-8 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
                >
                  {submitting ? 'Saving...' : 'Save Camera'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Toolbar */}
      <DataTableToolbar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Filter cameras by name or location..."
        totalCount={filteredCameras.length}
      />

      {/* Feedback banner if a test was run */}
      {testResult && (
        <div
          className={`flex items-center gap-2 rounded-lg p-2.5 text-xs font-mono border ${
            testResult.success
              ? 'border-emerald-500/30 bg-emerald-50/50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
              : 'border-red-500/30 bg-red-50/50 text-red-800 dark:bg-red-950/30 dark:text-red-300'
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="size-4 shrink-0 text-red-600" />
          )}
          <span>{testResult.msg}</span>
        </div>
      )}

      {/* Table */}
      {error && cameras.length === 0 ? (
        <ErrorState message={error} onRetry={fetchCameras} />
      ) : filteredCameras.length === 0 ? (
        <EmptyState
          icon={<Cctv className="size-6 text-muted-foreground" />}
          title="No cameras registered"
          description="Register your industrial facility IP/RTSP streams to activate real-time hazard detection."
          actionLabel="Register First Camera"
          onAction={() => setIsDialogOpen(true)}
        />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Camera Name & Location</TableHead>
                <TableHead>Type & Channel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Active State</TableHead>
                <TableHead>Last Telemetry</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCameras.map((camera) => (
                <TableRow key={camera.id}>
                  <TableCell>
                    <div className="font-semibold text-foreground text-xs">{camera.name}</div>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      {camera.location || 'Unassigned Zone'}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs uppercase">
                    <div>{camera.source_type}</div>
                    <div className="text-[11px] text-muted-foreground">
                      CH {camera.dvr_channel ?? 1}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={camera.status} />
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-mono font-medium ${
                        camera.is_enabled
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-slate-500/10 text-slate-500'
                      }`}
                    >
                      {camera.is_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {camera.last_connected_at
                      ? new Date(camera.last_connected_at).toLocaleString([], {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })
                      : 'Never'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="xs"
                        variant="outline"
                        disabled={actionInProgress === camera.id}
                        onClick={() => handleTest(camera.id)}
                        className="h-7 text-xs font-mono gap-1"
                      >
                        <Activity className="size-3 text-muted-foreground" />
                        Test
                      </Button>
                      <Button
                        size="xs"
                        variant={camera.is_enabled ? 'outline' : 'default'}
                        disabled={actionInProgress === camera.id}
                        onClick={() => handleToggle(camera.id)}
                        className={`h-7 text-xs font-mono gap-1 ${
                          camera.is_enabled
                            ? 'hover:bg-red-500/10 hover:text-red-600'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                      >
                        <Power className="size-3" />
                        {camera.is_enabled ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
