'use client';

import React, { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { usePolling } from '@/hooks/use-polling';
import { DataTableToolbar } from '@/components/shared/data-table-toolbar';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ShieldAlert, Clock, Eye, Video, ImageIcon, FileCode } from 'lucide-react';
import type { DetectionEvent } from '@/types/api';

export default function SafetyEventsPage() {
  const [events, setEvents] = useState<DetectionEvent[]>([]);
  const [_loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState<DetectionEvent | null>(null);

  const fetchEvents = async () => {
    try {
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.append('event_type', typeFilter);
      params.append('limit', '100');

      const data = await apiClient<DetectionEvent[]>(`/detections?${params.toString()}`);
      setEvents(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load detections');
    } finally {
      setLoading(false);
    }
  };

  usePolling(fetchEvents, { intervalMs: 12000 });

  const filteredEvents = events.filter((ev) => {
    const term = search.toLowerCase();
    return (
      ev.event_type.toLowerCase().includes(term) ||
      ev.id.toLowerCase().includes(term) ||
      Boolean(ev.camera_id && ev.camera_id.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-border">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Raw AI Safety Detections Stream
          </h2>
          <p className="text-micro text-muted font-mono mt-0.5">
            Low-latency inference event logs from computer vision models (Helmet, Vest, Fall, Fire,
            Smoke)
          </p>
        </div>
      </div>

      {/* Filter toolbar */}
      <DataTableToolbar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Filter events by type or camera ID..."
        totalCount={filteredEvents.length}
        isFiltered={typeFilter !== 'all' || search !== ''}
        onResetFilters={() => {
          setSearch('');
          setTypeFilter('all');
        }}
      >
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-9 rounded-[10px] border border-border bg-surface px-3 text-xs text-foreground font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
        >
          <option value="all">All Anomaly Types</option>
          <option value="NO_HELMET">Missing Helmet / Hardhat</option>
          <option value="NO_VEST">Missing High-Vis Vest</option>
          <option value="WORKER_FALL_DETECTED">Worker Fall Anomaly</option>
          <option value="ZONE_INTRUSION">Restricted Zone Intrusion</option>
          <option value="fire">Fire / Thermal Hazard</option>
          <option value="smoke">Smoke Dispersion</option>
        </select>
      </DataTableToolbar>

      {/* Events Table */}
      {error && events.length === 0 ? (
        <ErrorState message={error} onRetry={fetchEvents} />
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          icon={<ShieldAlert className="size-6 text-muted" />}
          title="No raw detections logged"
          description="Inference logs will populate here as camera streams detect safety compliance states."
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Detection Type</th>
                  <th>Confidence Score</th>
                  <th>Camera Origin</th>
                  <th>Detected Timestamp</th>
                  <th>Evidence Media</th>
                  <th className="text-right">Inspection</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((ev) => {
                  const confidencePct = Math.round((ev.confidence || 0) * 100);
                  return (
                    <tr key={ev.id}>
                      <td>
                        <Badge
                          variant="outline"
                          className="font-mono text-micro capitalize bg-surface-raised text-foreground border-border"
                        >
                          {ev.event_type.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="font-mono text-meta">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{confidencePct}%</span>
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-sunken border border-border">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                confidencePct >= 80
                                  ? 'bg-success'
                                  : confidencePct >= 60
                                    ? 'bg-warning'
                                    : 'bg-danger'
                              }`}
                              style={{ width: `${confidencePct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="font-mono text-meta text-muted">
                        <div className="flex items-center gap-1.5">
                          <Video className="size-3 text-muted" />
                          <span className="truncate max-w-[140px]">
                            {ev.camera_id || 'Unlinked'}
                          </span>
                        </div>
                      </td>
                      <td className="font-mono text-meta text-muted">
                        <div className="flex items-center gap-1.5">
                          <Clock className="size-3 text-muted" />
                          {new Date(ev.detected_at).toLocaleString([], {
                            dateStyle: 'short',
                            timeStyle: 'medium',
                          })}
                        </div>
                      </td>
                      <td>
                        {ev.snapshot_url ? (
                          <span className="inline-flex items-center gap-1 text-micro font-mono text-brand font-medium">
                            <ImageIcon className="size-3" /> JPEG
                          </span>
                        ) : (
                          <span className="text-micro font-mono text-muted">None</span>
                        )}
                      </td>
                      <td className="text-right">
                        <Button
                          size="xs"
                          variant="secondary"
                          onClick={() => setSelectedEvent(ev)}
                          className="h-7 text-micro font-mono gap-1"
                        >
                          <Eye className="size-3 text-muted" />
                          Inspect
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Raw Event Detail Inspection Drawer */}
      <Sheet open={Boolean(selectedEvent)} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-surface border-border text-foreground">
          {selectedEvent && (
            <div className="space-y-4">
              <SheetHeader>
                <SheetTitle className="text-section font-bold capitalize text-foreground">
                  Detection: {selectedEvent.event_type.replace(/_/g, ' ')}
                </SheetTitle>
                <SheetDescription className="font-mono text-micro text-muted">
                  Event ID: {selectedEvent.id}
                </SheetDescription>
              </SheetHeader>

              {/* Snapshot image preview if available */}
              {selectedEvent.snapshot_url && (
                <div className="space-y-1.5">
                  <span className="text-micro font-medium text-muted uppercase font-mono">
                    Detection Snapshot
                  </span>
                  <div className="aspect-video w-full rounded-[10px] border border-border overflow-hidden bg-surface-sunken flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedEvent.snapshot_url}
                      alt="Detection Evidence"
                      className="object-cover w-full h-full"
                    />
                  </div>
                </div>
              )}

              {/* Telemetry metadata */}
              <div className="rounded-[10px] border border-border bg-surface-raised p-3.5 space-y-2 text-micro font-mono">
                <div className="flex justify-between border-b border-border pb-1.5">
                  <span className="text-muted">Confidence:</span>
                  <span className="font-bold text-foreground">
                    {(selectedEvent.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between border-b border-border pb-1.5">
                  <span className="text-muted">Camera ID:</span>
                  <span className="text-foreground">{selectedEvent.camera_id || 'None'}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-1.5">
                  <span className="text-muted">Zone ID:</span>
                  <span className="text-foreground">{selectedEvent.zone_id || 'Global'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Detected At:</span>
                  <span className="text-foreground">
                    {new Date(selectedEvent.detected_at).toISOString()}
                  </span>
                </div>
              </div>

              {/* Bounding box JSON if available */}
              {selectedEvent.bounding_box && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-micro font-medium text-muted font-mono">
                    <FileCode className="size-3" />
                    Bounding Box Coordinates
                  </div>
                  <pre className="p-3 rounded-[10px] bg-surface-sunken text-foreground font-mono text-[11px] overflow-x-auto border border-border">
                    {JSON.stringify(selectedEvent.bounding_box, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
