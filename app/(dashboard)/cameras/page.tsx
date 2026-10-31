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
import { Modal, ConfirmDialog } from '@/components/ui/modal';
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
  Pencil,
  Trash2,
} from 'lucide-react';
import type { Camera, CameraCreateInput, CameraTestResult } from '@/types/api';
import { useEstimUi } from '@/store/estim-ui-store';

const emptyForm = (): CameraCreateInput => ({
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

export default function CamerasPage() {
  const { toast } = useEstimUi();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [_loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Camera | null>(null);
  const [testResult, setTestResult] = useState<{
    id: string;
    msg: string;
    success: boolean;
  } | null>(null);

  const [formData, setFormData] = useState<CameraCreateInput>(emptyForm);

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
      toast.success('Camera Toggled', 'Camera operational state updated.');
      await fetchCameras();
    } catch (err: unknown) {
      toast.error('Toggle Failed', err instanceof Error ? err.message : 'Toggle failed');
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
      const result = {
        id,
        msg: `${res.message} (${res.latency_ms ?? 12.4} ms)`,
        success: res.reachable,
      };
      setTestResult(result);
      if (res.reachable) {
        toast.success('Stream Reachable', result.msg);
      } else {
        toast.warning('Stream Unreachable', result.msg);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Test failed';
      setTestResult({ id, msg, success: false });
      toast.error('Connection Test Failed', msg);
    } finally {
      setActionInProgress(null);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setFormData(emptyForm());
    setIsDialogOpen(true);
  };

  const openEdit = (camera: Camera) => {
    setEditingId(camera.id);
    setFormData({
      name: camera.name,
      description: camera.description || '',
      location: camera.location || '',
      source_type: camera.source_type || 'dvr',
      stream_url: camera.stream_url || '',
      dvr_host: camera.dvr_host || (camera.config?.dvr_host as string) || '192.168.1.2',
      dvr_port: camera.dvr_port ?? (camera.config?.dvr_port as number) ?? 554,
      dvr_channel: camera.dvr_channel ?? 1,
      subtype: camera.subtype ?? (camera.config?.subtype as number) ?? 0,
      rtsp_username: camera.rtsp_username || 'admin',
      rtsp_password: '',
      is_enabled: camera.is_enabled,
    });
    setIsDialogOpen(true);
  };

  const confirmDeleteAction = async () => {
    if (!deleteTarget) return;
    setActionInProgress(deleteTarget.id);
    try {
      await apiClient(`/cameras/${deleteTarget.id}`, { method: 'DELETE' });
      toast.success('Camera Removed', `Camera "${deleteTarget.name}" has been deleted.`);
      setDeleteTarget(null);
      await fetchCameras();
    } catch (err: unknown) {
      toast.error('Delete Failed', err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const body = {
      ...formData,
      dvr_channel: formData.dvr_channel ? Number(formData.dvr_channel) : 1,
      dvr_port: formData.dvr_port ? Number(formData.dvr_port) : 554,
      subtype: formData.subtype !== undefined ? Number(formData.subtype) : 0,
    };
    try {
      if (editingId) {
        await apiClient<Camera>(`/cameras/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        toast.success('Camera Updated', 'Camera configuration saved successfully.');
      } else {
        await apiClient<Camera>('/cameras', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        toast.success('Camera Added', 'New camera stream configured for inference.');
      }
      setIsDialogOpen(false);
      setEditingId(null);
      setFormData(emptyForm());
      await fetchCameras();
    } catch (err: unknown) {
      toast.error('Save Failed', err instanceof Error ? err.message : 'Failed to save camera');
    } finally {
      setSubmitting(false);
    }
  };

  // Live masked URL preview for dynamic DVR configuration
  const liveDvrUrl = `rtsp://${formData.rtsp_username || 'USERNAME'}:${
    formData.rtsp_password ? (showPassword ? formData.rtsp_password : '***') : 'PASSWORD'
  }@${formData.dvr_host || 'DVR_IP'}:${formData.dvr_port || 554}/cam/realmonitor?channel=${
    formData.dvr_channel || 1
  }&subtype=${formData.subtype ?? 0}`;

  const filteredCameras = cameras.filter((cam) => {
    const matchesSearch =
      cam.name.toLowerCase().includes(search.toLowerCase()) ||
      Boolean(cam.location && cam.location.toLowerCase().includes(search.toLowerCase())) ||
      cam.source_type.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-border">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Camera Registry & DVR Config
          </h2>
          <p className="text-micro text-muted font-mono mt-0.5">
            Manage RTSP endpoints, Dahua/Hikvision DVR channels, and local telemetry feeds
          </p>
        </div>

        <Button
          size="sm"
          onClick={openCreate}
          variant="default"
          className="gap-1.5 self-start sm:self-auto"
        >
          <Plus className="size-4" />
          Add Camera
        </Button>
      </div>

      {/* Add / Edit Camera Modal */}
      <Modal
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={editingId ? 'Edit Camera Configuration' : 'Register New Camera'}
        description="Configure stream credentials, Dahua/Hikvision DVR channel, or RTSP endpoint for automated safety inspection."
        maxWidth="max-w-[34rem]"
        footer={
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="camera-form"
              loading={submitting}
              loadingText="Saving..."
              variant="default"
            >
              {editingId ? 'Update Camera' : 'Save Camera'}
            </Button>
          </div>
        }
      >
        <form id="camera-form" onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Camera Identifier Name"
            required
            placeholder="e.g. Forklift Lane West (Cam 03)"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <Input
            label="Facility Zone / Location"
            placeholder="e.g. Loading Dock Bay 4, Warehouse A"
            value={formData.location || ''}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          />

          {/* Source Protocol Radio Switcher */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-foreground">Video Stream Protocol</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, source_type: 'dvr' })}
                className={`flex flex-col items-center justify-center p-3 rounded-[10px] border text-center transition-all ${
                  formData.source_type === 'dvr'
                    ? 'border-brand bg-brand-soft text-brand font-semibold shadow-xs'
                    : 'border-border bg-surface text-subtle hover:bg-surface-raised hover:text-foreground'
                }`}
              >
                <HardDrive className="size-4 mb-1" />
                <span className="text-xs font-mono font-medium">DVR / NVR</span>
                <span className="text-[10px] text-muted">Multi-channel</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, source_type: 'rtsp' })}
                className={`flex flex-col items-center justify-center p-3 rounded-[10px] border text-center transition-all ${
                  formData.source_type === 'rtsp'
                    ? 'border-brand bg-brand-soft text-brand font-semibold shadow-xs'
                    : 'border-border bg-surface text-subtle hover:bg-surface-raised hover:text-foreground'
                }`}
              >
                <Radio className="size-4 mb-1" />
                <span className="text-xs font-mono font-medium">Custom RTSP</span>
                <span className="text-[10px] text-muted">Single URL</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, source_type: 'webcam' })}
                className={`flex flex-col items-center justify-center p-3 rounded-[10px] border text-center transition-all ${
                  formData.source_type === 'webcam'
                    ? 'border-brand bg-brand-soft text-brand font-semibold shadow-xs'
                    : 'border-border bg-surface text-subtle hover:bg-surface-raised hover:text-foreground'
                }`}
              >
                <Activity className="size-4 mb-1" />
                <span className="text-xs font-mono font-medium">Webcam</span>
                <span className="text-[10px] text-muted">Local Device</span>
              </button>
            </div>
          </div>

          {/* DVR Configuration Block */}
          {formData.source_type === 'dvr' && (
            <div className="space-y-3.5 rounded-[12px] border border-brand/20 bg-brand-soft/40 p-3.5">
              <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-brand">
                <HardDrive className="size-3.5" />
                Dahua / Hikvision Multi-Channel RTSP Matrix
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Input
                    label="DVR IP Address"
                    required
                    placeholder="192.168.1.2"
                    value={formData.dvr_host || ''}
                    onChange={(e) => setFormData({ ...formData, dvr_host: e.target.value })}
                    className="font-mono"
                  />
                </div>
                <div>
                  <Input
                    label="RTSP Port"
                    type="number"
                    value={formData.dvr_port ?? 554}
                    onChange={(e) => setFormData({ ...formData, dvr_port: Number(e.target.value) })}
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Input
                    label="DVR Channel Number"
                    type="number"
                    min={1}
                    max={64}
                    value={formData.dvr_channel ?? 1}
                    onChange={(e) =>
                      setFormData({ ...formData, dvr_channel: Number(e.target.value) })
                    }
                    className="font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-foreground">Stream Profile</label>
                  <select
                    value={formData.subtype ?? 0}
                    onChange={(e) => setFormData({ ...formData, subtype: Number(e.target.value) })}
                    className="h-9 w-full rounded-[10px] border border-border bg-surface px-2.5 text-xs font-mono text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
                  >
                    <option value={1}>Sub Stream (subtype=1) • AI Low Latency</option>
                    <option value={0}>Main Stream (subtype=0) • Full HD</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="RTSP Username"
                  placeholder="admin"
                  value={formData.rtsp_username || ''}
                  onChange={(e) => setFormData({ ...formData, rtsp_username: e.target.value })}
                  className="font-mono"
                />

                <Input
                  label="RTSP Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={formData.rtsp_password || ''}
                  onChange={(e) => setFormData({ ...formData, rtsp_password: e.target.value })}
                  className="font-mono"
                  trailing={
                    <button
                      type="button"
                      aria-label="Toggle password view"
                      onClick={() => setShowPassword(!showPassword)}
                      className="hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="size-3.5" />
                      ) : (
                        <Eye className="size-3.5" />
                      )}
                    </button>
                  }
                />
              </div>

              {/* Dynamic URL Preview */}
              <div className="rounded-[8px] border border-border bg-surface-sunken p-2.5 text-micro font-mono text-subtle">
                <span className="text-[10px] text-muted uppercase block mb-1">
                  Generated Dynamic RTSP Endpoint:
                </span>
                <span className="break-all text-brand font-semibold">{liveDvrUrl}</span>
              </div>
            </div>
          )}

          {/* Custom RTSP Stream URL */}
          {formData.source_type === 'rtsp' && (
            <div className="space-y-3 rounded-[12px] border border-border bg-surface-raised p-3.5">
              <Input
                label="Custom RTSP Stream URL"
                required
                placeholder="rtsp://192.168.1.100:554/live/ch1"
                value={formData.stream_url || ''}
                onChange={(e) => setFormData({ ...formData, stream_url: e.target.value })}
                className="font-mono"
              />

              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="RTSP Username"
                  placeholder="Optional user"
                  value={formData.rtsp_username || ''}
                  onChange={(e) => setFormData({ ...formData, rtsp_username: e.target.value })}
                  className="font-mono"
                />
                <Input
                  label="RTSP Password"
                  type="password"
                  placeholder="Optional secret"
                  value={formData.rtsp_password || ''}
                  onChange={(e) => setFormData({ ...formData, rtsp_password: e.target.value })}
                  className="font-mono"
                />
              </div>
            </div>
          )}

          {/* Description */}
          <Input
            label="Operational Description"
            placeholder="e.g. High-risk automated machinery perimeter"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Camera Feed"
        description={`Are you sure you want to delete camera "${deleteTarget?.name}"? Historical incidents and detection telemetry will be preserved.`}
        confirmLabel="Delete Camera"
        destructive
        loading={actionInProgress === deleteTarget?.id}
        onConfirm={confirmDeleteAction}
      />

      {/* Toolbar */}
      <DataTableToolbar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Filter cameras by name, location, or source..."
        totalCount={filteredCameras.length}
      />

      {/* Diagnostic Result Banner */}
      {testResult && (
        <div
          className={`flex items-center gap-2 rounded-[10px] p-3 text-xs font-mono border ${
            testResult.success
              ? 'border-success/30 bg-success-muted text-success'
              : 'border-danger/30 bg-danger-muted text-danger'
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="size-4 shrink-0 text-success" />
          ) : (
            <AlertCircle className="size-4 shrink-0 text-danger" />
          )}
          <span>{testResult.msg}</span>
        </div>
      )}

      {/* Cameras Responsive Table */}
      {error && cameras.length === 0 ? (
        <ErrorState message={error} onRetry={fetchCameras} />
      ) : filteredCameras.length === 0 ? (
        <EmptyState
          icon={<Cctv className="size-6 text-muted" />}
          title="No cameras registered"
          description="Register your industrial facility DVR/NVR or RTSP streams to activate real-time AI safety monitoring."
          actionLabel="Add Camera"
          onAction={openCreate}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Camera Name & Location</th>
                  <th>Source & Channel</th>
                  <th>Status</th>
                  <th>Active State</th>
                  <th>Last Telemetry</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCameras.map((camera) => (
                  <tr key={camera.id}>
                    <td>
                      <div className="font-semibold text-foreground text-xs">{camera.name}</div>
                      <div className="text-micro text-muted font-mono">
                        {camera.location || 'Unassigned Zone'}
                      </div>
                    </td>
                    <td className="font-mono text-meta">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold border border-border bg-surface-raised text-subtle uppercase">
                          {camera.source_type}
                        </span>
                        {camera.dvr_channel && (
                          <span className="text-micro text-muted">CH {camera.dvr_channel}</span>
                        )}
                      </div>
                      {camera.config?.subtype !== undefined && (
                        <div className="text-micro text-muted mt-0.5">
                          {camera.config.subtype === 1
                            ? 'Sub Stream (subtype 1)'
                            : 'Main Stream (subtype 0)'}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="flex flex-col gap-1">
                        <StatusBadge status={camera.status} />
                        <span className="text-micro font-mono text-muted">
                          AI {camera.ai_state || 'OFFLINE'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`inline-flex items-center gap-1 rounded-[6px] px-2 py-0.5 text-micro font-mono font-medium ${
                          camera.is_enabled
                            ? 'bg-success-muted text-success border border-success/30'
                            : 'bg-surface-raised text-muted border border-border'
                        }`}
                      >
                        {camera.is_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="font-mono text-meta text-muted">
                      {camera.last_connected_at
                        ? new Date(camera.last_connected_at).toLocaleString([], {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })
                        : 'Never'}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="xs"
                          variant="secondary"
                          disabled={actionInProgress === camera.id}
                          onClick={() => openEdit(camera)}
                          className="h-7 text-micro font-mono gap-1"
                          title="Edit camera settings"
                        >
                          <Pencil className="size-3 text-muted" />
                          Edit
                        </Button>
                        <Button
                          size="xs"
                          variant="secondary"
                          disabled={actionInProgress === camera.id}
                          onClick={() => handleTest(camera.id)}
                          className="h-7 text-micro font-mono gap-1"
                          title="Test Connectivity"
                        >
                          <Activity className="size-3 text-muted" />
                          Test
                        </Button>
                        <Button
                          size="xs"
                          variant={camera.is_enabled ? 'outline' : 'soft'}
                          disabled={actionInProgress === camera.id}
                          onClick={() => handleToggle(camera.id)}
                          className="h-7 text-micro font-mono gap-1"
                        >
                          <Power className="size-3" />
                          {camera.is_enabled ? 'Disable' : 'Enable'}
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          disabled={actionInProgress === camera.id}
                          onClick={() => setDeleteTarget(camera)}
                          className="h-7 text-micro font-mono gap-1 text-muted hover:text-danger"
                          title="Delete camera"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
