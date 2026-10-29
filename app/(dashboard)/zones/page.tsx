'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { StatusBadge } from '@/components/shared/status-badge';
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
import { MapPin, Plus, Cctv } from 'lucide-react';
import type { Camera, Zone, ZoneCreateInput } from '@/types/api';

export default function ZonesPage() {
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
      setIsDialogOpen(false);
      setFormData({
        camera_id: selectedCameraId,
        name: '',
        description: '',
        is_active: true,
      });
      await fetchZones(selectedCameraId);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to create zone');
    } finally {
      setSubmitting(false);
    }
  };

  const currentCamera = cameras.find((c) => c.id === selectedCameraId);

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border">
        <div>
          <h2 className="font-heading text-lg font-bold tracking-tight text-foreground sm:text-xl">
            Camera Monitoring Zones & Hazard Boundaries
          </h2>
          <p className="text-xs text-muted-foreground font-mono">
            Define regions of interest (ROI) and sub-zones associated with specific facility cameras
          </p>
        </div>

        <Button
          size="sm"
          disabled={!selectedCameraId}
          onClick={() => setIsDialogOpen(true)}
          className="h-8 gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs"
        >
          <Plus className="size-3.5" />
          Add Zone Boundary
        </Button>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Create Monitoring Zone</DialogTitle>
              <DialogDescription className="text-xs">
                Associate a designated safety area with {currentCamera?.name || 'the camera'}.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-3 py-2">
              <div className="space-y-1">
                <label className="text-xs font-medium">Camera Origin</label>
                <Input
                  disabled
                  value={currentCamera?.name || selectedCameraId}
                  className="h-8 text-xs bg-muted text-muted-foreground"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Zone Name *</label>
                <Input
                  required
                  placeholder="e.g. Forklift High-Traffic Crosswalk"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Description</label>
                <Input
                  placeholder="e.g. Mandates full hardhat and high-vis vest compliance"
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
                  {submitting ? 'Saving...' : 'Create Zone'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Camera Selection Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
        <div className="flex items-center gap-2 text-xs font-medium text-foreground">
          <Cctv className="size-4 text-amber-500" />
          <span>Active Camera Source:</span>
        </div>
        <select
          value={selectedCameraId}
          onChange={(e) => setSelectedCameraId(e.target.value)}
          className="h-8 flex-1 sm:max-w-xs rounded-lg border border-border bg-background px-2.5 text-xs text-foreground outline-hidden font-mono"
        >
          {cameras.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.location || 'Default'})
            </option>
          ))}
        </select>
        {currentCamera && (
          <span className="text-xs text-muted-foreground font-mono">
            Channel {currentCamera.dvr_channel ?? 1} • {currentCamera.status}
          </span>
        )}
      </div>

      {/* Zones Table */}
      {error && cameras.length === 0 ? (
        <ErrorState message={error} />
      ) : zonesLoading ? (
        <div className="py-12 text-center text-xs font-mono text-muted-foreground animate-pulse">
          Loading camera zones...
        </div>
      ) : zones.length === 0 ? (
        <EmptyState
          icon={<MapPin className="size-6 text-muted-foreground" />}
          title="No zones configured for this camera"
          description="Create specific safety boundary zones to localize incident triggers."
          actionLabel="Create Zone"
          onAction={() => setIsDialogOpen(true)}
        />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zone Name & Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Coordinates Mode</TableHead>
                <TableHead>Created At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {zones.map((zone) => (
                <TableRow key={zone.id}>
                  <TableCell>
                    <div className="font-semibold text-foreground text-xs">{zone.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {zone.description || 'No description specified'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={zone.is_active ? 'active' : 'inactive'} />
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {zone.roi_polygon && zone.roi_polygon.length > 0
                      ? `${zone.roi_polygon.length} polygon vertex points`
                      : 'Whole Camera Viewport (Default ROI)'}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {new Date(zone.created_at).toLocaleDateString([], {
                      dateStyle: 'medium',
                    })}
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
