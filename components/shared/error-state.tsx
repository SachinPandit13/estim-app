import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Failed to load data',
  message = 'An error occurred while connecting to the safety monitoring API. Please verify the backend connection.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-red-500/20 bg-red-50/10 p-8 text-center dark:bg-red-950/10',
        className,
      )}
    >
      <div className="flex size-10 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400 mb-3">
        <AlertTriangle className="size-5" />
      </div>
      <h3 className="font-heading text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm" className="mt-4 gap-1.5">
          <RefreshCw className="size-3.5" />
          Retry Connection
        </Button>
      )}
    </div>
  );
}
