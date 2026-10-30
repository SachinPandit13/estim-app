'use client';

import React, { useSyncExternalStore, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, CircleAlert, AlertTriangle, Info, X } from 'lucide-react';
import { useEstimUi, type ToastMessage, type ToastVariant } from '@/store/estim-ui-store';
import { cn } from '@/lib/utils';

const DEFAULT_TOAST_MS = 4500;
const emptySubscribe = () => () => {};

export function ToastViewport() {
  const { toasts, dismissToast } = useEstimUi();
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  if (!isClient || toasts.length === 0) return null;

  return createPortal(
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-[calc(1.25rem+env(safe-area-inset-bottom))] z-[120] flex flex-col gap-2.5 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:left-auto sm:w-[22rem]"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>,
    document.body,
  );
}

function getToastIcon(variant: ToastVariant) {
  switch (variant) {
    case 'success':
      return (
        <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
          <Check className="size-3.5" strokeWidth={2.75} />
        </span>
      );
    case 'error':
      return (
        <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-400">
          <CircleAlert className="size-3.5" strokeWidth={2.25} />
        </span>
      );
    case 'warning':
      return (
        <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
          <AlertTriangle className="size-3.5" strokeWidth={2.25} />
        </span>
      );
    case 'info':
    default:
      return (
        <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-blue-400">
          <Info className="size-3.5" strokeWidth={2.25} />
        </span>
      );
  }
}

function getTimerBarColor(variant: ToastVariant) {
  switch (variant) {
    case 'success':
      return 'bg-emerald-500';
    case 'error':
      return 'bg-red-500';
    case 'warning':
      return 'bg-amber-500';
    case 'info':
    default:
      return 'bg-blue-500';
  }
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
  const duration = toast.duration ?? DEFAULT_TOAST_MS;

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.id, duration, onDismiss]);

  return (
    <div
      role="status"
      className="animate-in-scale pointer-events-auto overflow-hidden rounded-[12px] border border-border bg-surface shadow-[var(--shadow-modal)] backdrop-blur-md transition-all duration-200"
    >
      <div className="flex items-start gap-3 p-3.5 sm:p-4">
        {getToastIcon(toast.variant)}
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-[13px] font-semibold leading-snug tracking-[-0.01em] text-foreground">
            {toast.title}
          </p>
          {toast.description && (
            <p className="mt-1 text-[12px] leading-relaxed text-muted break-words">
              {toast.description}
            </p>
          )}
        </div>
        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={() => onDismiss(toast.id)}
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-raised hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* Countdown progress bar */}
      <div className="h-0.5 bg-surface-sunken" aria-hidden>
        <div
          className={cn('toast-timer h-full w-full', getTimerBarColor(toast.variant))}
          style={{ animationDuration: `${duration}ms` }}
        />
      </div>
    </div>
  );
}
