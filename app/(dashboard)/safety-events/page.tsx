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
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
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
      (ev.camera_id && ev.camera_id.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border">
        <div>
          <h2 className="font-heading text-lg font-bold tracking-tight text-foreground sm:text-xl">
            Raw AI Safety Detections Stream
          </h2>
          <p className="text-xs text-muted-foreground font-mono">
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
          className="h-8 rounded-lg border border-border bg-card px-2 text-xs text-foreground outline-none font-mono"
        >
          <option value="all">All Anomaly Types</option>
          <option value="helmet">Helmet / Head Protection</option>
          <option value="vest">High-Visibility Safety Vest</option>
          <option value="fall">Worker Fall Anomaly</option>
          <option value="fire">Fire / Thermal Hazard</option>
          <option value="smoke">Smoke Dispersion</option>
        </select>
      </DataTableToolbar>

      {/* Events Table */}
      {error && events.length === 0 ? (
        <ErrorState message={error} onRetry={fetchEvents} />
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          icon={<ShieldAlert className="size-6 text-muted-foreground" />}
          title="No raw detections logged"
          description="Inference logs will populate here as camera streams detect safety compliance states."
        />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Detection Type</TableHead>
                <TableHead>Confidence Score</TableHead>
                <TableHead>Camera Origin</TableHead>
                <TableHead>Detected Timestamp</TableHead>
                <TableHead>Evidence Media</TableHead>
                <TableHead className="text-right">Inspection</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.map((ev) => {
                const confidencePct = Math.round((ev.confidence || 0) * 100);
                return (
                  <TableRow key={ev.id}>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="font-mono text-xs capitalize bg-muted/60 text-foreground border-border"
                      >
                        {ev.event_type.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{confidencePct}%</span>
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full ${
                              confidencePct >= 80
                                ? 'bg-emerald-500'
                                : confidencePct >= 60
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                            }`}
                            style={{ width: `${confidencePct}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Video className="size-3" />
                        <span className="truncate max-w-[120px]">{ev.camera_id || 'Unlinked'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {new Date(ev.detected_at).toLocaleString([], {
                          dateStyle: 'short',
                          timeStyle: 'medium',
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      {ev.snapshot_url ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-500">
                          <ImageIcon className="size-3" /> JPEG
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => setSelectedEvent(ev)}
                        className="h-7 text-xs font-mono gap-1"
                      >
                        <Eye className="size-3" />
                        Inspect
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Raw Event Detail Inspection Drawer */}
      <Sheet open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {selectedEvent && (
            <div className="space-y-4">
              <SheetHeader>
                <SheetTitle className="font-heading text-lg font-bold capitalize">
                  Detection: {selectedEvent.event_type.replace(/_/g, ' ')}
                </SheetTitle>
                <SheetDescription className="font-mono text-xs">
                  Event ID: {selectedEvent.id}
                </SheetDescription>
              </SheetHeader>

              {/* Snapshot image preview if available */}
              {selectedEvent.snapshot_url && (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase font-mono">
                    Detection Snapshot
                  </span>
                  <div className="aspect-video w-full rounded-lg border border-border overflow-hidden bg-slate-950 flex items-center justify-center">
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
              <div className="rounded-lg border border-border bg-card p-3 space-y-2 text-xs font-mono">
                <div className="flex justify-between border-b border-border pb-1">
                  <span className="text-muted-foreground">Confidence:</span>
                  <span className="font-bold">{(selectedEvent.confidence * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between border-b border-border pb-1">
                  <span className="text-muted-foreground">Camera ID:</span>
                  <span>{selectedEvent.camera_id || 'None'}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-1">
                  <span className="text-muted-foreground">Zone ID:</span>
                  <span>{selectedEvent.zone_id || 'Global'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Detected At:</span>
                  <span>{new Date(selectedEvent.detected_at).toISOString()}</span>
                </div>
              </div>

              {/* Bounding box JSON if available */}
              {selectedEvent.bounding_box && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground font-mono">
                    <FileCode className="size-3" />
                    Bounding Box Coordinates
                  </div>
                  <pre className="p-2.5 rounded-lg bg-slate-950 text-slate-300 font-mono text-[11px] overflow-x-auto border border-slate-800">
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
