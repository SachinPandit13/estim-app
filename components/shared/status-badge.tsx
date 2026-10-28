import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type SystemStatus =
  | 'online'
  | 'offline'
  | 'error'
  | 'warning'
  | 'active'
  | 'inactive'
  | 'open'
  | 'acknowledged'
  | 'resolved';

interface StatusBadgeProps {
  status: string;
  className?: string;
  label?: string;
}

export function StatusBadge({ status, className, label }: StatusBadgeProps) {
  const normalized = status.toLowerCase() as SystemStatus;

  let dotColor = 'bg-muted-foreground';
  let badgeClasses = 'bg-secondary text-secondary-foreground border-border';
  let displayLabel = label || status;

  switch (normalized) {
    case 'online':
    case 'active':
    case 'resolved':
      dotColor = 'bg-emerald-500';
      badgeClasses =
        'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
      break;
    case 'offline':
    case 'inactive':
      dotColor = 'bg-zinc-400';
      badgeClasses =
        'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800/50 dark:text-zinc-400 dark:border-zinc-700';
      break;
    case 'warning':
    case 'acknowledged':
      dotColor = 'bg-amber-500';
      badgeClasses =
        'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
      break;
    case 'error':
    case 'open':
      dotColor = 'bg-red-500';
      badgeClasses =
        'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800';
      break;
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1.5 font-mono text-[11px] uppercase tracking-wide px-2 py-0.5',
        badgeClasses,
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full shrink-0', dotColor)} />
      {displayLabel}
    </Badge>
  );
}
