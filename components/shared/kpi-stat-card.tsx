import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface KpiStatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  trendText?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  accentColor?: 'default' | 'critical' | 'warning' | 'success';
  isLoading?: boolean;
  className?: string;
}

export function KpiStatCard({
  title,
  value,
  icon,
  description,
  trendText,
  trendDirection = 'neutral',
  accentColor = 'default',
  isLoading = false,
  className,
}: KpiStatCardProps) {
  let accentBorderClass = 'border-border';
  let iconContainerClass = 'bg-surface-raised text-subtle border border-border';

  switch (accentColor) {
    case 'critical':
      accentBorderClass = 'border-danger/30';
      iconContainerClass = 'bg-danger-muted text-danger border border-danger/30';
      break;
    case 'warning':
      accentBorderClass = 'border-warning/30';
      iconContainerClass = 'bg-warning-muted text-warning border border-warning/30';
      break;
    case 'success':
      accentBorderClass = 'border-success/30';
      iconContainerClass = 'bg-success-muted text-success border border-success/30';
      break;
  }

  return (
    <Card className={cn('overflow-hidden transition-all', accentBorderClass, className)}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-label text-muted">{title}</p>
          <div
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-[8px]',
              iconContainerClass,
            )}
          >
            {icon}
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <div className="text-stat-lg text-foreground font-mono">{value}</div>
          )}
        </div>

        {(description || trendText) && (
          <div className="mt-2 flex items-center gap-1.5 text-meta text-muted">
            {trendText && (
              <span
                className={cn(
                  'font-medium',
                  trendDirection === 'up' && 'text-danger',
                  trendDirection === 'down' && 'text-success',
                  trendDirection === 'neutral' && 'text-muted',
                )}
              >
                {trendText}
              </span>
            )}
            {description && <span>{description}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
