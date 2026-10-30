import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { IncidentSeverity } from '@/types/api';

interface SeverityBadgeProps {
  severity: IncidentSeverity | string;
  className?: string;
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const normalized = (severity || 'medium').toLowerCase();

  switch (normalized) {
    case 'critical':
      return (
        <Badge
          variant="outline"
          className={cn(
            'gap-1.5 border-danger/40 bg-danger-muted text-danger font-semibold font-mono text-[11px] uppercase tracking-wider',
            className,
          )}
        >
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-danger" />
          </span>
          Critical
        </Badge>
      );
    case 'high':
      return (
        <Badge
          variant="outline"
          className={cn(
            'gap-1.5 border-warning/40 bg-warning-muted text-warning font-semibold font-mono text-[11px] uppercase tracking-wider',
            className,
          )}
        >
          <span className="size-1.5 rounded-full bg-warning shrink-0" />
          High
        </Badge>
      );
    case 'medium':
      return (
        <Badge
          variant="outline"
          className={cn(
            'gap-1.5 border-warning/25 bg-warning-muted/60 text-warning font-medium font-mono text-[11px] uppercase tracking-wider',
            className,
          )}
        >
          <span className="size-1.5 rounded-full bg-warning/80 shrink-0" />
          Medium
        </Badge>
      );
    case 'low':
    default:
      return (
        <Badge
          variant="outline"
          className={cn(
            'gap-1.5 border-border bg-surface-raised text-subtle font-mono text-[11px] uppercase tracking-wider',
            className,
          )}
        >
          <span className="size-1.5 rounded-full bg-muted shrink-0" />
          Low
        </Badge>
      );
  }
}
