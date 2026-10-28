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
  let accentClass = 'border-border';
  let iconContainerClass = 'bg-muted text-muted-foreground';

  switch (accentColor) {
    case 'critical':
      accentClass = 'border-red-500/30 bg-red-50/20 dark:bg-red-950/10';
      iconContainerClass = 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400';
      break;
    case 'warning':
      accentClass = 'border-amber-500/30 bg-amber-50/20 dark:bg-amber-950/10';
      iconContainerClass = 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400';
      break;
    case 'success':
      accentClass = 'border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/10';
      iconContainerClass =
        'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400';
      break;
  }

  return (
    <Card className={cn('overflow-hidden ring-1 shadow-xs transition-all', accentClass, className)}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <div
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-lg',
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
            <div className="font-heading text-2xl font-bold tracking-tight sm:text-3xl text-foreground font-mono">
              {value}
            </div>
          )}
        </div>

        {(description || trendText) && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            {trendText && (
              <span
                className={cn(
                  'font-medium',
                  trendDirection === 'up' && 'text-red-600 dark:text-red-400',
                  trendDirection === 'down' && 'text-emerald-600 dark:text-emerald-400',
                  trendDirection === 'neutral' && 'text-muted-foreground',
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
