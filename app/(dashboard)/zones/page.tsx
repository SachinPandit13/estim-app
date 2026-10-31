'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { StatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { MapPin, Plus, Cctv } from 'lucide-react';
import type { Camera, Zone, ZoneCreateInput } from '@/types/api';
import { useEstimUi } from '@/store/estim-ui-store';

export default function ZonesPage() {
  const { toast } = useEstimUi();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [zones, setZones] = useState<Zone[]>([]);
  const [_loading, setLoading] = useState(true);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<ZoneCreateInput>({
    camera_id: '',
    name: '',
    description: '',
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let ignore = false;
    const loadCameras = async () => {
      try {
        const data = await apiClient<Camera[]>('/cameras');
        if (!ignore) {
          setCameras(data);
          if (data.length > 0) {
            setSelectedCameraId(data[0].id);
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load cameras');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };
    loadCameras();
    return () => {
      ignore = true;
    };
  }, []);

  const fetchZones = async (camId: string) => {
    if (!camId) return;
    setZonesLoading(true);
    try {
      const data = await apiClient<Zone[]>(`/zones/camera/${camId}`);
      setZones(data);
    } catch {
      setZones([]);
    } finally {
      setZonesLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    if (selectedCameraId) {
      const loadZones = async () => {
        try {
          const data = await apiClient<Zone[]>(`/zones/camera/${selectedCameraId}`);
          if (!ignore) {
            setZones(data);
          }
        } catch {
          if (!ignore) {
            setZones([]);
          }
        } finally {
          if (!ignore) {
            setZonesLoading(false);
          }
        }
      };
      loadZones();
    }
    return () => {
      ignore = true;
    };
  }, [selectedCameraId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    setSubmitting(true);
    try {
      await apiClient<Zone>('/zones', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          camera_id: formData.camera_id || selectedCameraId,
        }),
      });
      toast.success('Zone Created', `Monitoring boundary "${formData.name}" established.`);
      setIsDialogOpen(false);
      setFormData({
        camera_id: selectedCameraId,
        name: '',
        description: '',
        is_active: true,
      });
      await fetchZones(selectedCameraId);
    } catch (err: unknown) {
      toast.error('Creation Failed', err instanceof Error ? err.message : 'Failed to create zone');
    } finally {
      setSubmitting(false);
    }
  };

  const currentCamera = cameras.find((c) => c.id === selectedCameraId);

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-border">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Camera Monitoring Zones & Hazard Boundaries
          </h2>
          <p className="text-micro text-muted font-mono mt-0.5">
            Define regions of interest (ROI) and sub-zones associated with specific facility cameras
          </p>
        </div>

        <Button
          size="sm"
          disabled={!selectedCameraId}
          onClick={() => setIsDialogOpen(true)}
          variant="default"
          className="gap-1.5 self-start sm:self-auto"
        >
          <Plus className="size-4" />
          Add Zone Boundary
        </Button>
      </div>

      {/* Camera Selection Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-[10px] border border-border bg-surface p-3.5 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-medium text-foreground">
          <Cctv className="size-4 text-brand" />
          <span>Active Camera Source:</span>
        </div>
        <select
          value={selectedCameraId}
          onChange={(e) => setSelectedCameraId(e.target.value)}
          className="h-9 flex-1 sm:max-w-xs rounded-[10px] border border-border bg-surface-raised px-3 text-xs text-foreground font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
        >
          {cameras.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.location || 'Default'})
            </option>
          ))}
        </select>
        {currentCamera && (
          <span className="text-micro text-muted font-mono">
            Channel {currentCamera.dvr_channel ?? 1} • {currentCamera.status}
          </span>
        )}
      </div>

      {/* Zones Table */}
      {error && cameras.length === 0 ? (
        <ErrorState message={error} />
      ) : zonesLoading ? (
        <div className="py-12 text-center text-xs font-mono text-muted animate-pulse">
          Loading camera zones...
        </div>
      ) : zones.length === 0 ? (
        <EmptyState
          icon={<MapPin className="size-6 text-muted" />}
          title="No zones configured for this camera"
          description="Create specific safety boundary zones to localize incident triggers."
          actionLabel="Create Zone"
          onAction={() => setIsDialogOpen(true)}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Zone Name & Description</th>
                  <th>Status</th>
                  <th>Coordinates Mode</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((zone) => (
                  <tr key={zone.id}>
                    <td>
                      <div className="font-semibold text-foreground text-xs">{zone.name}</div>
                      <div className="text-micro text-muted">
                        {zone.description || 'No description specified'}
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={zone.is_active ? 'active' : 'inactive'} />
                    </td>
                    <td className="font-mono text-meta text-muted">
                      {zone.roi_polygon && zone.roi_polygon.length > 0
                        ? `${zone.roi_polygon.length} polygon vertex points`
                        : 'Whole Camera Viewport (Default ROI)'}
                    </td>
                    <td className="font-mono text-meta text-muted">
                      {new Date(zone.created_at).toLocaleDateString([], {
                        dateStyle: 'medium',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Zone Modal */}
      <Modal
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title="Create Monitoring Zone"
        description={`Associate a designated safety area boundary with ${currentCamera?.name || 'the camera'}.`}
        maxWidth="max-w-[28rem]"
        footer={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="zone-form"
              loading={submitting}
              loadingText="Saving..."
              variant="default"
            >
              Create Zone
            </Button>
          </div>
        }
      >
        <form id="zone-form" onSubmit={handleSubmit} className="space-y-3.5">
          <Input
            label="Camera Origin"
            disabled
            value={currentCamera?.name || selectedCameraId}
            className="font-mono bg-surface-sunken"
          />

          <Input
            label="Zone Name"
            required
            placeholder="e.g. Forklift High-Traffic Crosswalk"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <Input
            label="Description"
            placeholder="e.g. Mandates full hardhat and high-vis vest compliance"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </form>
      </Modal>
    </div>
  );
}
