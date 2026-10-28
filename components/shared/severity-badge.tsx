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
            'gap-1.5 border-red-500/30 bg-red-500/10 text-red-600 font-semibold dark:text-red-400 font-mono text-[11px] uppercase tracking-wider',
            className,
          )}
        >
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-red-600" />
          </span>
          Critical
        </Badge>
      );
    case 'high':
      return (
        <Badge
          variant="outline"
          className={cn(
            'gap-1.5 border-amber-500/30 bg-amber-500/10 text-amber-700 font-semibold dark:text-amber-400 font-mono text-[11px] uppercase tracking-wider',
            className,
          )}
        >
          <span className="size-1.5 rounded-full bg-amber-600 shrink-0" />
          High
        </Badge>
      );
    case 'medium':
      return (
        <Badge
          variant="outline"
          className={cn(
            'gap-1.5 border-yellow-500/30 bg-yellow-500/10 text-yellow-800 font-medium dark:text-yellow-400 font-mono text-[11px] uppercase tracking-wider',
            className,
          )}
        >
          <span className="size-1.5 rounded-full bg-yellow-500 shrink-0" />
          Medium
        </Badge>
      );
    case 'low':
    default:
      return (
        <Badge
          variant="outline"
          className={cn(
            'gap-1.5 border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 font-mono text-[11px] uppercase tracking-wider',
            className,
          )}
        >
          <span className="size-1.5 rounded-full bg-slate-400 shrink-0" />
          Low
        </Badge>
      );
  }
}
