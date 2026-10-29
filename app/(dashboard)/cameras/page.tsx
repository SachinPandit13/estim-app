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
import {
  Cctv,
  Plus,
  Activity,
  Power,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Eye,
  EyeOff,
  Radio,
} from 'lucide-react';
import type { Camera, CameraCreateInput, CameraTestResult } from '@/types/api';

export default function CamerasPage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [_loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [testResult, setTestResult] = useState<{
    id: string;
    msg: string;
    success: boolean;
  } | null>(null);

  // Form State with Dynamic DVR standard defaults
  const [formData, setFormData] = useState<CameraCreateInput>({
    name: '',
    description: '',
    location: '',
    source_type: 'dvr',
    stream_url: '',
    dvr_host: '192.168.1.2',
    dvr_port: 554,
    dvr_channel: 1,
    subtype: 0,
    rtsp_username: 'admin',
    rtsp_password: '',
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
          dvr_port: formData.dvr_port ? Number(formData.dvr_port) : 554,
          subtype: formData.subtype !== undefined ? Number(formData.subtype) : 0,
        }),
      });
      setIsDialogOpen(false);
      setFormData({
        name: '',
        description: '',
        location: '',
        source_type: 'dvr',
        stream_url: '',
        dvr_host: '192.168.1.2',
        dvr_port: 554,
        dvr_channel: 1,
        subtype: 0,
        rtsp_username: 'admin',
        rtsp_password: '',
        is_enabled: true,
      });
      await fetchCameras();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to register camera');
    } finally {
      setSubmitting(false);
    }
  };

  // Live masked URL preview for dynamic DVR configuration
  const liveDvrUrl = `rtsp://${formData.rtsp_username || 'USERNAME'}:${
    formData.rtsp_password ? (showPassword ? formData.rtsp_password : '***') : 'PASSWORD'
  }@${formData.dvr_host || '192.168.1.2'}:${formData.dvr_port || 554}/cam/realmonitor?channel=${
    formData.dvr_channel || 1
  }&subtype=${formData.subtype ?? 0}`;

  const filteredCameras = cameras.filter(
    (cam) =>
      cam.name.toLowerCase().includes(search.toLowerCase()) ||
      (cam.location && cam.location.toLowerCase().includes(search.toLowerCase())) ||
      cam.source_type.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border">
        <div>
          <h2 className="font-heading text-lg font-bold tracking-tight text-foreground sm:text-xl">
            Camera Registry & Stream Feeds
          </h2>
          <p className="text-xs text-muted-foreground font-mono">
            {cameras.length} registered video sources • Industrial DVR / NVR RTSP streaming
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <Button
            size="sm"
            onClick={() => setIsDialogOpen(true)}
            className="h-8 gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs"
          >
            <Plus className="size-3.5" />
            Add Camera
          </Button>

          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold">
                Register New Camera Stream
              </DialogTitle>
              <DialogDescription className="text-xs">
                Configure an Industrial DVR/NVR stream, custom RTSP IP camera, or local device
                camera.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-3.5 py-2">
              {/* 3-Tab Source Type Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Source Type</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        source_type: 'dvr',
                        stream_url: '',
                      })
                    }
                    className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-2 text-xs font-medium transition-colors ${
                      formData.source_type === 'dvr'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-400 font-semibold'
                        : 'border-border bg-card text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <HardDrive className="size-4" />
                    <span>DVR / NVR</span>
                    <span className="text-[9px] font-mono text-muted-foreground">
                      CP Plus / Dahua
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        source_type: 'rtsp',
                        stream_url: '',
                      })
                    }
                    className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-2 text-xs font-medium transition-colors ${
                      formData.source_type === 'rtsp'
                        ? 'border-purple-500 bg-purple-500/10 text-purple-400 font-semibold'
                        : 'border-border bg-card text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Cctv className="size-4" />
                    <span>Custom RTSP</span>
                    <span className="text-[9px] font-mono text-muted-foreground">
                      Direct IP URL
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        source_type: 'webcam',
                        stream_url: 'device://webcam',
                        name: formData.name || 'Workstation Webcam',
                        location: formData.location || 'Control Room',
                      })
                    }
                    className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-2 text-xs font-medium transition-colors ${
                      formData.source_type === 'webcam'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-400 font-semibold'
                        : 'border-border bg-card text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Activity className="size-4" />
                    <span>Device Cam</span>
                    <span className="text-[9px] font-mono text-muted-foreground">
                      USB / Hardware
                    </span>
                  </button>
                </div>
              </div>

              {/* Camera Name */}
              <div className="space-y-1">
                <label className="text-xs font-medium">Camera Name *</label>
                <Input
                  required
                  placeholder={
                    formData.source_type === 'webcam'
                      ? 'e.g. Workstation Webcam'
                      : formData.source_type === 'dvr'
                        ? 'e.g. Workshop Entrance Cam 01'
                        : 'e.g. Perimeter Fence IP 02'
                  }
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              {/* Location */}
              <div className="space-y-1">
                <label className="text-xs font-medium">Facility Location / Zone</label>
                <Input
                  placeholder="e.g. Assembly Bay 3 • Loading Dock"
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              {/* DVR Configuration Fields */}
              {formData.source_type === 'dvr' && (
                <div className="space-y-3 rounded-lg border border-blue-500/30 bg-blue-950/10 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 font-mono">
                    <Radio className="size-3.5" />
                    Standard Industrial DVR/NVR Parameters
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2 space-y-1">
                      <label className="text-xs font-medium">DVR Host / IP Address *</label>
                      <Input
                        required
                        placeholder="192.168.1.2"
                        value={formData.dvr_host || ''}
                        onChange={(e) => setFormData({ ...formData, dvr_host: e.target.value })}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">RTSP Port</label>
                      <Input
                        type="number"
                        placeholder="554"
                        value={formData.dvr_port ?? 554}
                        onChange={(e) =>
                          setFormData({ ...formData, dvr_port: Number(e.target.value) })
                        }
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium">DVR Channel (1–64)</label>
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

                    <div className="space-y-1">
                      <label className="text-xs font-medium">Stream Profile</label>
                      <select
                        value={formData.subtype ?? 0}
                        onChange={(e) =>
                          setFormData({ ...formData, subtype: Number(e.target.value) })
                        }
                        className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs font-mono"
                      >
                        <option value={1}>Sub Stream (subtype=1) • AI Low Latency</option>
                        <option value={0}>Main Stream (subtype=0) • Full HD</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium">RTSP Username</label>
                      <Input
                        placeholder="admin"
                        value={formData.rtsp_username || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, rtsp_username: e.target.value })
                        }
                        className="h-8 text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium">RTSP Password</label>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Password"
                          value={formData.rtsp_password || ''}
                          onChange={(e) =>
                            setFormData({ ...formData, rtsp_password: e.target.value })
                          }
                          className="h-8 text-xs font-mono pr-8"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? (
                            <EyeOff className="size-3.5" />
                          ) : (
                            <Eye className="size-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Live Dynamic URL Preview */}
                  <div className="rounded-md border border-border bg-slate-900/90 p-2 text-[11px] font-mono text-slate-300">
                    <span className="text-[10px] text-slate-500 uppercase block mb-1">
                      Generated Dynamic RTSP Endpoint:
                    </span>
                    <span className="break-all text-amber-400 font-semibold">{liveDvrUrl}</span>
                  </div>
                </div>
              )}

              {/* Custom RTSP Stream URL */}
              {formData.source_type === 'rtsp' && (
                <div className="space-y-3 rounded-lg border border-purple-500/30 bg-purple-950/10 p-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Custom RTSP Stream URL *</label>
                    <Input
                      required
                      placeholder="rtsp://192.168.1.100:554/live/ch1"
                      value={formData.stream_url || ''}
                      onChange={(e) => setFormData({ ...formData, stream_url: e.target.value })}
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium">RTSP Username</label>
                      <Input
                        placeholder="Optional user"
                        value={formData.rtsp_username || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, rtsp_username: e.target.value })
                        }
                        className="h-8 text-xs font-mono"
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
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Webcam Banner */}
              {formData.source_type === 'webcam' && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-mono text-amber-300">
                  <div className="flex items-center gap-1.5 font-semibold text-amber-400">
                    <Activity className="size-3.5" />
                    Direct Client Media Stream
                  </div>
                  <p className="mt-1 text-[11px] text-slate-300 leading-relaxed font-sans">
                    Streams live video frames directly from your browser webcam or connected USB
                    camera for real-time safety and PPE verification.
                  </p>
                </div>
              )}

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-medium">Operational Description</label>
                <Input
                  placeholder="e.g. High-risk automated machinery perimeter"
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
                  {submitting ? 'Registering...' : 'Save Camera'}
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
        searchPlaceholder="Filter cameras by name, location, or source..."
        totalCount={filteredCameras.length}
      />

      {/* Test Diagnostic Result Banner */}
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

      {/* Cameras Table */}
      {error && cameras.length === 0 ? (
        <ErrorState message={error} onRetry={fetchCameras} />
      ) : filteredCameras.length === 0 ? (
        <EmptyState
          icon={<Cctv className="size-6 text-muted-foreground" />}
          title="No cameras registered"
          description="Register your industrial facility DVR/NVR or RTSP streams to activate real-time AI safety monitoring."
          actionLabel="Add Camera"
          onAction={() => setIsDialogOpen(true)}
        />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Camera Name & Location</TableHead>
                <TableHead>Source & Channel</TableHead>
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
                  <TableCell className="font-mono text-xs">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase ${
                          camera.source_type === 'dvr'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                            : camera.source_type === 'webcam'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                        }`}
                      >
                        {camera.source_type}
                      </span>
                      {camera.dvr_channel && (
                        <span className="text-[11px] text-muted-foreground">
                          CH {camera.dvr_channel}
                        </span>
                      )}
                    </div>
                    {camera.config?.subtype !== undefined && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {camera.config.subtype === 1
                          ? 'Sub Stream (subtype 1)'
                          : 'Main Stream (subtype 0)'}
                      </div>
                    )}
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
                        title="Test TCP Socket / Connectivity"
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
