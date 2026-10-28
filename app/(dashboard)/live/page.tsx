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

export default function LiveMonitoringPage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [gridLayout, setGridLayout] = useState<'2' | '3' | '1'>('2');

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

  const filteredCameras = cameras.filter((cam) => {
    const matchesSearch =
      cam.name.toLowerCase().includes(search.toLowerCase()) ||
      (cam.location && cam.location.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus =
      statusFilter === 'all' || cam.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border">
        <div>
          <h2 className="font-heading text-lg font-bold tracking-tight text-foreground sm:text-xl">
            Live Facility Telemetry & Video Feeds
          </h2>
          <p className="text-xs text-muted-foreground font-mono">
            {cameras.length} registered cameras •{' '}
            {cameras.filter((c) => c.status === 'online').length} operational feeds
          </p>
        </div>

        {/* Layout Switcher */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
            <button
              onClick={() => setGridLayout('1')}
              title="Single Focus"
              className={`flex size-7 items-center justify-center rounded-md text-xs transition-colors ${
                gridLayout === '1'
                  ? 'bg-muted text-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutList className="size-3.5" />
            </button>
            <button
              onClick={() => setGridLayout('2')}
              title="2x2 Matrix"
              className={`flex size-7 items-center justify-center rounded-md text-xs transition-colors ${
                gridLayout === '2'
                  ? 'bg-muted text-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Grid2X2 className="size-3.5" />
            </button>
            <button
              onClick={() => setGridLayout('3')}
              title="3x3 Matrix"
              className={`flex size-7 items-center justify-center rounded-md text-xs transition-colors ${
                gridLayout === '3'
                  ? 'bg-muted text-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Grid3X3 className="size-3.5" />
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchCameras}
            disabled={loading}
            className="h-8 gap-1.5 text-xs font-mono"
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
          className="h-8 rounded-lg border border-border bg-card px-2 text-xs text-foreground outline-none font-mono"
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
          icon={<Video className="size-6 text-muted-foreground" />}
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
            <StreamPlaceholder
              key={camera.id}
              camera={camera}
              // onToggleStatus={fetchCameras}
            />
          ))}
        </div>
      )}
    </div>
  );
}
