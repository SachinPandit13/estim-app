'use client';

import React, { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { usePolling } from '@/hooks/use-polling';
import { StatusBadge } from '@/components/shared/status-badge';
import { SeverityBadge } from '@/components/shared/severity-badge';
import { DataTableToolbar } from '@/components/shared/data-table-toolbar';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Clock, Eye, ShieldCheck, ImageIcon } from 'lucide-react';
import type { SafetyIncident } from '@/types/api';

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<SafetyIncident[]>([]);
  const [_loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  // Inspection & Action States
  const [activeIncidentForDetail, setActiveIncidentForDetail] = useState<SafetyIncident | null>(
    null,
  );
  const [resolveIncidentId, setResolveIncidentId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchIncidents = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (severityFilter !== 'all') params.append('severity', severityFilter);
      params.append('limit', '100');

      const data = await apiClient<SafetyIncident[]>(`/incidents?${params.toString()}`);
      setIncidents(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load incidents');
    } finally {
      setLoading(false);
    }
  };

  usePolling(fetchIncidents, { intervalMs: 15000 });

  const handleAcknowledge = async (id: string) => {
    setActionInProgress(id);
    try {
      await apiClient<SafetyIncident>(`/incidents/${id}/acknowledge`, {
        method: 'PATCH',
      });
      await fetchIncidents();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to acknowledge incident');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveIncidentId) return;
    if (!resolutionNotes.trim()) {
      alert('Resolution notes are required to resolve an incident.');
      return;
    }

    setActionInProgress(resolveIncidentId);
    try {
      await apiClient<SafetyIncident>(`/incidents/${resolveIncidentId}/resolve`, {
        method: 'PATCH',
        body: JSON.stringify({ resolution_notes: resolutionNotes }),
      });
      setResolveIncidentId(null);
      setResolutionNotes('');
      await fetchIncidents();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to resolve incident');
    } finally {
      setActionInProgress(null);
    }
  };

  const filteredIncidents = incidents.filter((inc) => {
    const term = search.toLowerCase();
    return (
      inc.incident_type.toLowerCase().includes(term) ||
      inc.id.toLowerCase().includes(term) ||
      (inc.camera_id && inc.camera_id.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border">
        <div>
          <h2 className="font-heading text-lg font-bold tracking-tight text-foreground sm:text-xl">
            Safety Incidents Queue & Resolution
          </h2>
          <p className="text-xs text-muted-foreground font-mono">
            Triage, acknowledge, and resolve confirmed industrial safety violations
          </p>
        </div>
      </div>

      {/* Toolbar with status and severity filters */}
      <DataTableToolbar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Filter incidents by hazard type or ID..."
        totalCount={filteredIncidents.length}
        isFiltered={statusFilter !== 'all' || severityFilter !== 'all' || search !== ''}
        onResetFilters={() => {
          setSearch('');
          setStatusFilter('all');
          setSeverityFilter('all');
        }}
      >
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-8 rounded-lg border border-border bg-card px-2 text-xs text-foreground outline-none font-mono"
        >
          <option value="all">All Lifecycle</option>
          <option value="open">Open (Unacknowledged)</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="resolved">Resolved</option>
        </select>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="h-8 rounded-lg border border-border bg-card px-2 text-xs text-foreground outline-none font-mono"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </DataTableToolbar>

      {/* Incident List */}
      {error && incidents.length === 0 ? (
        <ErrorState message={error} onRetry={fetchIncidents} />
      ) : filteredIncidents.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="size-6 text-emerald-500" />}
          title="No incidents matching criteria"
          description="Facility areas are currently clear of unresolved worker safety violations."
        />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Severity</TableHead>
                <TableHead>Hazard Type & Evidence</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>First / Last Detected</TableHead>
                <TableHead>Detections</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIncidents.map((incident) => (
                <TableRow key={incident.id}>
                  <TableCell>
                    <SeverityBadge severity={incident.severity} />
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-foreground capitalize text-xs">
                      {incident.incident_type.replace(/_/g, ' ')}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono text-muted-foreground">
                      <span>ID: {incident.id.slice(0, 8)}...</span>
                      {incident.evidence_snapshot && (
                        <span className="inline-flex items-center gap-0.5 text-amber-500">
                          <ImageIcon className="size-3" /> Snapshot
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={incident.status} />
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {new Date(incident.last_detected_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(incident.first_detected_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground font-semibold">
                      {incident.detection_count}x
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => setActiveIncidentForDetail(incident)}
                        className="h-7 text-xs font-mono"
                        title="View Evidence & Notes"
                      >
                        <Eye className="size-3" />
                      </Button>

                      {incident.status === 'open' && (
                        <Button
                          size="xs"
                          variant="outline"
                          disabled={actionInProgress === incident.id}
                          onClick={() => handleAcknowledge(incident.id)}
                          className="h-7 text-xs font-mono border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
                        >
                          Acknowledge
                        </Button>
                      )}

                      {incident.status !== 'resolved' && (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => {
                            setResolveIncidentId(incident.id);
                            setResolutionNotes('');
                          }}
                          className="h-7 text-xs font-mono border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Resolution Notes Modal */}
      <Dialog
        open={!!resolveIncidentId}
        onOpenChange={(open) => !open && setResolveIncidentId(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Resolve Safety Incident</DialogTitle>
            <DialogDescription className="text-xs">
              Provide formal supervisor notes detailing corrective actions taken on the facility
              floor.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleResolveSubmit} className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                Corrective Action & Resolution Notes *
              </label>
              <textarea
                required
                rows={4}
                placeholder="e.g. Worker was alerted immediately and issued PPE safety helmet before resuming operation. Area checked."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                className="w-full rounded-lg border border-border bg-card p-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-amber-500 font-sans"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setResolveIncidentId(null)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
              >
                Confirm Resolution
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Incident Detail Inspection Drawer */}
      <Sheet
        open={!!activeIncidentForDetail}
        onOpenChange={(open) => !open && setActiveIncidentForDetail(null)}
      >
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {activeIncidentForDetail && (
            <div className="space-y-5">
              <SheetHeader>
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={activeIncidentForDetail.severity} />
                  <StatusBadge status={activeIncidentForDetail.status} />
                </div>
                <SheetTitle className="font-heading text-lg font-bold capitalize pt-1">
                  {activeIncidentForDetail.incident_type.replace(/_/g, ' ')}
                </SheetTitle>
                <SheetDescription className="font-mono text-xs">
                  Incident ID: {activeIncidentForDetail.id}
                </SheetDescription>
              </SheetHeader>

              {/* Evidence Snapshot */}
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider font-mono">
                  Visual Evidence Telemetry
                </span>
                {activeIncidentForDetail.evidence_snapshot ? (
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-slate-950 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={activeIncidentForDetail.evidence_snapshot}
                      alt="Incident Evidence"
                      className="object-cover w-full h-full"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8 text-center text-xs text-muted-foreground">
                    <ImageIcon className="size-6 text-muted-foreground mb-1" />
                    <span>No snapshot binary attached to incident record</span>
                  </div>
                )}
              </div>

              {/* Timeline details */}
              <div className="space-y-2 rounded-lg border border-border bg-card p-3 text-xs font-mono">
                <div className="flex justify-between border-b border-border pb-1.5">
                  <span className="text-muted-foreground">First Detected:</span>
                  <span>
                    {new Date(activeIncidentForDetail.first_detected_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border pb-1.5">
                  <span className="text-muted-foreground">Last Detected:</span>
                  <span>{new Date(activeIncidentForDetail.last_detected_at).toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-1.5">
                  <span className="text-muted-foreground">Accumulated Detections:</span>
                  <span className="font-bold">{activeIncidentForDetail.detection_count}</span>
                </div>
                {activeIncidentForDetail.acknowledged_at && (
                  <div className="flex justify-between border-b border-border pb-1.5 text-amber-500">
                    <span>Acknowledged At:</span>
                    <span>
                      {new Date(activeIncidentForDetail.acknowledged_at).toLocaleString()}
                    </span>
                  </div>
                )}
                {activeIncidentForDetail.resolved_at && (
                  <div className="flex justify-between text-emerald-500">
                    <span>Resolved At:</span>
                    <span>{new Date(activeIncidentForDetail.resolved_at).toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Resolution Notes */}
              {activeIncidentForDetail.resolution_notes && (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider font-mono">
                    Supervisor Resolution Log
                  </span>
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-50/20 p-3 text-xs text-foreground dark:bg-emerald-950/20">
                    {activeIncidentForDetail.resolution_notes}
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
