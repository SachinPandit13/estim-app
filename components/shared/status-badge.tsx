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
  const normalized = (status || '').toLowerCase() as SystemStatus;

  let dotColor = 'bg-muted';
  let badgeClasses = 'bg-surface-raised text-subtle border-border';
  const displayLabel = label || status;

  switch (normalized) {
    case 'online':
    case 'active':
    case 'resolved':
      dotColor = 'bg-success';
      badgeClasses = 'bg-success-muted text-success border-success/30';
      break;
    case 'offline':
    case 'inactive':
      dotColor = 'bg-muted';
      badgeClasses = 'bg-surface-raised text-muted border-border';
      break;
    case 'warning':
    case 'acknowledged':
      dotColor = 'bg-warning';
      badgeClasses = 'bg-warning-muted text-warning border-warning/30';
      break;
    case 'error':
    case 'open':
      dotColor = 'bg-danger';
      badgeClasses = 'bg-danger-muted text-danger border-danger/30';
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
