'use client';

import React, { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { usePolling } from '@/hooks/use-polling';
import { StreamPlaceholder } from '@/components/shared/stream-placeholder';
import { DataTableToolbar } from '@/components/shared/data-table-toolbar';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Button } from '@/components/ui/button';
import { Video, Grid2X2, Grid3X3, LayoutList, RefreshCw } from 'lucide-react';
import type { Camera } from '@/types/api';
import { useEstimUi } from '@/store/estim-ui-store';

export default function LiveMonitoringPage() {
  const { toast } = useEstimUi();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [gridLayout, setGridLayout] = useState<'2' | '3' | '1'>('2');
  const [connectingWebcam, setConnectingWebcam] = useState(false);

  const fetchCameras = async () => {
    try {
      const data = await apiClient<Camera[]>('/cameras');
      setCameras(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load camera feeds');
    } finally {
      setLoading(false);
    }
  };

  usePolling(fetchCameras, { intervalMs: 10000 });

  const handleConnectLocalWebcam = async () => {
    const existing = cameras.find((c) => c.source_type === 'webcam');
    if (existing) {
      toast.warning(
        'Webcam Already Active',
        `Local device camera "${existing.name}" is already active in your camera feeds.`,
      );
      return;
    }

    setConnectingWebcam(true);
    try {
      await apiClient<Camera>('/cameras', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Local Device Webcam',
          source_type: 'webcam',
          stream_url: 'device://webcam',
          location: 'Control Station',
          is_enabled: true,
        }),
      });
      toast.success(
        'Webcam Feed Registered',
        'Local device camera is now active and streaming telemetry.',
      );
      await fetchCameras();
    } catch (err: unknown) {
      toast.error(
        'Connection Failed',
        err instanceof Error ? err.message : 'Failed to register webcam feed',
      );
    } finally {
      setConnectingWebcam(false);
    }
  };

  const filteredCameras = cameras.filter((cam) => {
    const matchesSearch =
      cam.name.toLowerCase().includes(search.toLowerCase()) ||
      Boolean(cam.location && cam.location.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus =
      statusFilter === 'all' || cam.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-border">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Live Facility Telemetry & Video Feeds
          </h2>
          <p className="text-micro text-muted font-mono mt-0.5">
            {cameras.length} registered cameras •{' '}
            {cameras.filter((c) => c.status === 'online').length} operational feeds
          </p>
        </div>

        {/* Action Controls & Layout Switcher */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button
            size="sm"
            onClick={handleConnectLocalWebcam}
            loading={connectingWebcam}
            loadingText="Connecting..."
            variant="default"
            className="gap-1.5"
          >
            <Video className="size-3.5" />
            Connect Device Cam
          </Button>

          {/* Grid View Switcher */}
          <div className="flex items-center rounded-[8px] border border-border bg-surface p-0.5 shadow-xs">
            <button
              type="button"
              onClick={() => setGridLayout('1')}
              title="Single Focus"
              className={`flex size-7 items-center justify-center rounded-[6px] text-xs transition-colors ${
                gridLayout === '1'
                  ? 'bg-surface-raised text-brand font-semibold shadow-xs'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <LayoutList className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setGridLayout('2')}
              title="2x2 Matrix"
              className={`flex size-7 items-center justify-center rounded-[6px] text-xs transition-colors ${
                gridLayout === '2'
                  ? 'bg-surface-raised text-brand font-semibold shadow-xs'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <Grid2X2 className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setGridLayout('3')}
              title="3x3 Matrix"
              className={`flex size-7 items-center justify-center rounded-[6px] text-xs transition-colors ${
                gridLayout === '3'
                  ? 'bg-surface-raised text-brand font-semibold shadow-xs'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <Grid3X3 className="size-3.5" />
            </button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={fetchCameras}
            disabled={loading}
            className="gap-1.5 font-mono"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Toolbar filters */}
      <DataTableToolbar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search cameras by name or zone..."
        totalCount={filteredCameras.length}
        isFiltered={statusFilter !== 'all' || search !== ''}
        onResetFilters={() => {
          setSearch('');
          setStatusFilter('all');
        }}
      >
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-[10px] border border-border bg-surface px-3 text-xs text-foreground font-mono transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
        >
          <option value="all">All Statuses</option>
          <option value="online">Online Only</option>
          <option value="offline">Offline Only</option>
        </select>
      </DataTableToolbar>

      {/* Content */}
      {error && cameras.length === 0 ? (
        <ErrorState message={error} onRetry={fetchCameras} />
      ) : filteredCameras.length === 0 ? (
        <EmptyState
          icon={<Video className="size-6 text-muted" />}
          title="No cameras matching query"
          description="Adjust your search criteria or register new facility camera sources."
        />
      ) : (
        <div
          className={`grid gap-4 ${
            gridLayout === '1'
              ? 'grid-cols-1 max-w-3xl mx-auto'
              : gridLayout === '3'
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                : 'grid-cols-1 md:grid-cols-2'
          }`}
        >
          {filteredCameras.map((camera) => (
            <StreamPlaceholder key={camera.id} camera={camera} />
          ))}
        </div>
      )}
    </div>
  );
}
