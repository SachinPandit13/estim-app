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
import { Modal } from '@/components/ui/modal';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Clock, Eye, ShieldCheck, ImageIcon } from 'lucide-react';
import type { SafetyIncident } from '@/types/api';
import { useEstimUi } from '@/store/estim-ui-store';

export default function IncidentsPage() {
  const { toast } = useEstimUi();
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
      toast.success('Incident Acknowledged', 'The incident has been marked as acknowledged.');
      await fetchIncidents();
    } catch (err: unknown) {
      toast.error(
        'Action Failed',
        err instanceof Error ? err.message : 'Failed to acknowledge incident',
      );
    } finally {
      setActionInProgress(null);
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveIncidentId) return;
    if (!resolutionNotes.trim()) {
      toast.warning('Input Required', 'Resolution notes are required to resolve an incident.');
      return;
    }

    setActionInProgress(resolveIncidentId);
    try {
      await apiClient<SafetyIncident>(`/incidents/${resolveIncidentId}/resolve`, {
        method: 'PATCH',
        body: JSON.stringify({ resolution_notes: resolutionNotes }),
      });
      toast.success('Incident Resolved', 'Safety incident has been resolved and logged.');
      setResolveIncidentId(null);
      setResolutionNotes('');
      await fetchIncidents();
    } catch (err: unknown) {
      toast.error(
        'Resolution Failed',
        err instanceof Error ? err.message : 'Failed to resolve incident',
      );
    } finally {
      setActionInProgress(null);
    }
  };

  const filteredIncidents = incidents.filter((inc) => {
    const term = search.toLowerCase();
    return (
      inc.incident_type.toLowerCase().includes(term) ||
      inc.id.toLowerCase().includes(term) ||
      Boolean(inc.camera_id && inc.camera_id.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-border">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Safety Incidents Queue & Resolution
          </h2>
          <p className="text-micro text-muted font-mono mt-0.5">
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
          className="h-9 rounded-[10px] border border-border bg-surface px-3 text-xs text-foreground font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
        >
          <option value="all">All Statuses</option>
          <option value="open">Open Only</option>
          <option value="acknowledged">Acknowledged Only</option>
          <option value="resolved">Resolved Only</option>
        </select>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="h-9 rounded-[10px] border border-border bg-surface px-3 text-xs text-foreground font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical Only</option>
          <option value="high">High Only</option>
          <option value="medium">Medium Only</option>
          <option value="low">Low Only</option>
        </select>
      </DataTableToolbar>

      {/* Incidents Table */}
      {error && incidents.length === 0 ? (
        <ErrorState message={error} onRetry={fetchIncidents} />
      ) : filteredIncidents.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="size-6 text-success" />}
          title="No safety incidents found"
          description="Your safety queue has zero violations matching your filter criteria."
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Hazard / Incident Type</th>
                  <th>Camera / Zone</th>
                  <th>Detection Count</th>
                  <th>Timestamp</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredIncidents.map((inc) => (
                  <tr key={inc.id}>
                    <td>
                      <SeverityBadge severity={inc.severity} />
                    </td>
                    <td>
                      <div className="font-semibold text-foreground text-xs capitalize">
                        {inc.incident_type.replace(/_/g, ' ')}
                      </div>
                      <div className="text-micro text-muted font-mono">{inc.id}</div>
                    </td>
                    <td className="font-mono text-meta text-muted">
                      <div>{inc.camera_id || 'Global Sensor'}</div>
                      {inc.zone_id && (
                        <div className="text-micro text-muted">Zone: {inc.zone_id}</div>
                      )}
                    </td>
                    <td className="font-mono text-meta">
                      <span className="font-semibold text-foreground">{inc.detection_count}</span>{' '}
                      <span className="text-micro text-muted">detections</span>
                    </td>
                    <td className="font-mono text-meta text-muted">
                      <div className="flex items-center gap-1.5">
                        <Clock className="size-3 text-muted shrink-0" />
                        {new Date(inc.last_detected_at).toLocaleString([], {
                          dateStyle: 'short',
                          timeStyle: 'medium',
                        })}
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={inc.status} />
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="xs"
                          variant="secondary"
                          onClick={() => setActiveIncidentForDetail(inc)}
                          className="h-7 text-micro font-mono gap-1"
                        >
                          <Eye className="size-3 text-muted" />
                          Inspect
                        </Button>

                        {inc.status === 'open' && (
                          <Button
                            size="xs"
                            variant="soft"
                            loading={actionInProgress === inc.id}
                            loadingText="Saving..."
                            onClick={() => handleAcknowledge(inc.id)}
                            className="h-7 text-micro font-mono"
                          >
                            Acknowledge
                          </Button>
                        )}

                        {inc.status !== 'resolved' && (
                          <Button
                            size="xs"
                            variant="default"
                            onClick={() => {
                              setResolveIncidentId(inc.id);
                              setResolutionNotes('');
                            }}
                            className="h-7 text-micro font-mono"
                          >
                            Resolve
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resolution Notes Modal */}
      <Modal
        open={Boolean(resolveIncidentId)}
        onClose={() => setResolveIncidentId(null)}
        title="Resolve Safety Incident"
        description="Provide required resolution telemetry notes describing the corrective supervisor actions taken."
        maxWidth="max-w-[28rem]"
        footer={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setResolveIncidentId(null)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="resolve-form"
              loading={Boolean(actionInProgress)}
              loadingText="Resolving..."
              variant="default"
            >
              Confirm Resolution
            </Button>
          </div>
        }
      >
        <form id="resolve-form" onSubmit={handleResolveSubmit} className="space-y-3.5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-foreground">
              Supervisor Resolution Summary <span className="text-danger">*</span>
            </label>
            <textarea
              required
              rows={4}
              placeholder="e.g. Worker was alerted immediately and issued PPE safety helmet before resuming operation. Perimeter re-cleared."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              className="w-full rounded-[10px] border border-border bg-surface p-3 text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring font-sans"
            />
          </div>
        </form>
      </Modal>

      {/* Incident Detail Inspection Drawer */}
      <Sheet
        open={Boolean(activeIncidentForDetail)}
        onOpenChange={(open) => !open && setActiveIncidentForDetail(null)}
      >
        <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-surface border-border text-foreground">
          {activeIncidentForDetail && (
            <div className="space-y-5">
              <SheetHeader>
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={activeIncidentForDetail.severity} />
                  <StatusBadge status={activeIncidentForDetail.status} />
                </div>
                <SheetTitle className="text-section font-bold capitalize text-foreground pt-1">
                  {activeIncidentForDetail.incident_type.replace(/_/g, ' ')}
                </SheetTitle>
                <SheetDescription className="font-mono text-micro text-muted">
                  Incident ID: {activeIncidentForDetail.id}
                </SheetDescription>
              </SheetHeader>

              {/* Evidence Snapshot */}
              <div className="space-y-1.5">
                <span className="text-micro font-medium text-muted uppercase tracking-wider font-mono">
                  Visual Evidence Telemetry
                </span>
                {activeIncidentForDetail.evidence_snapshot ? (
                  <div className="relative aspect-video w-full overflow-hidden rounded-[10px] border border-border bg-surface-sunken flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={activeIncidentForDetail.evidence_snapshot}
                      alt="Incident Evidence"
                      className="object-cover w-full h-full"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-[10px] border border-dashed border-border py-8 text-center text-meta text-muted">
                    <ImageIcon className="size-6 text-muted mb-1" />
                    <span>No snapshot binary attached to incident record</span>
                  </div>
                )}
              </div>

              {/* Timeline details */}
              <div className="space-y-2 rounded-[10px] border border-border bg-surface-raised p-3.5 text-micro font-mono">
                <div className="flex justify-between border-b border-border pb-1.5">
                  <span className="text-muted">First Detected:</span>
                  <span className="text-foreground">
                    {new Date(activeIncidentForDetail.first_detected_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border pb-1.5">
                  <span className="text-muted">Last Detected:</span>
                  <span className="text-foreground">
                    {new Date(activeIncidentForDetail.last_detected_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border pb-1.5">
                  <span className="text-muted">Accumulated Detections:</span>
                  <span className="font-bold text-foreground">
                    {activeIncidentForDetail.detection_count}
                  </span>
                </div>
                {activeIncidentForDetail.acknowledged_at && (
                  <div className="flex justify-between border-b border-border pb-1.5 text-warning">
                    <span>Acknowledged At:</span>
                    <span>
                      {new Date(activeIncidentForDetail.acknowledged_at).toLocaleString()}
                    </span>
                  </div>
                )}
                {activeIncidentForDetail.resolved_at && (
                  <div className="flex justify-between text-success">
                    <span>Resolved At:</span>
                    <span>{new Date(activeIncidentForDetail.resolved_at).toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Resolution Notes */}
              {activeIncidentForDetail.resolution_notes && (
                <div className="space-y-1.5">
                  <span className="text-micro font-medium text-muted uppercase tracking-wider font-mono">
                    Supervisor Resolution Log
                  </span>
                  <div className="rounded-[10px] border border-success/30 bg-success-muted p-3 text-meta text-foreground">
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
