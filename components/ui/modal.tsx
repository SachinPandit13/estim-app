'use client';

import React, {
  useEffect,
  useId,
  useRef,
  useSyncExternalStore,
  type ReactNode,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const emptySubscribe = () => () => {};

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'max-w-[34rem]',
}: ModalProps) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !isClient) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6">
      <div
        aria-hidden
        onClick={onClose}
        className="modal-overlay animate-in-fade absolute inset-0 cursor-pointer"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          'modal-panel animate-in-scale relative z-10 flex max-h-[min(90vh,750px)] w-full flex-col overflow-hidden rounded-[16px] border border-border bg-surface text-foreground shadow-[var(--shadow-modal)] outline-none',
          maxWidth,
        )}
      >
        <div className="relative shrink-0 border-b border-border px-5 pt-5 pb-4 sm:px-6">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Close dialog"
            className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4"
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
          <div className="pr-10">
            <h2
              id={titleId}
              className="text-[1.0625rem] font-semibold tracking-[-0.025em] text-foreground"
            >
              {title}
            </h2>
            {description ? (
              <p id={descId} className="text-meta text-muted mt-1">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">{children}</div>

        {footer ? (
          <div className="flex h-14 shrink-0 items-center justify-end gap-2.5 border-t border-border bg-surface-raised px-5 sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

export type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  destructive?: boolean;
  loading?: boolean;
  loadingText?: string;
  confirmDisabled?: boolean;
};

export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  destructive = false,
  loading = false,
  loadingText,
  confirmDisabled = false,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, loading, onClose]);

  if (!open || !isClient) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6">
      <div
        aria-hidden
        onClick={() => {
          if (!loading) onClose();
        }}
        className="modal-overlay animate-in-fade absolute inset-0 cursor-pointer"
      />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className="modal-panel animate-in-scale relative z-10 flex max-h-[min(88vh,660px)] w-full max-w-[28rem] flex-col overflow-hidden rounded-[16px] border border-border bg-surface shadow-[var(--shadow-modal)] outline-none"
      >
        <div className="relative shrink-0 px-5 pt-5 pb-3 sm:px-6">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Close"
            className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4"
            disabled={loading}
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
          <div className="pr-10">
            <h2
              id={titleId}
              className="text-[1.0625rem] font-semibold tracking-[-0.025em] text-foreground"
            >
              {title}
            </h2>
            {description ? (
              <p id={descId} className="text-meta text-muted mt-1">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        {children ? <div className="min-h-0 flex-1 px-5 pb-4 sm:px-6">{children}</div> : null}

        <div className="flex h-14 shrink-0 items-center justify-end gap-2.5 border-t border-border bg-surface-raised px-5 sm:px-6">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            loading={loading}
            loadingText={loadingText ?? 'Processing...'}
            disabled={confirmDisabled}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function useDisclosure(initial = false) {
  const [open, setOpen] = useState(initial);
  return {
    open,
    onOpen: () => setOpen(true),
    onClose: () => setOpen(false),
    toggle: () => setOpen((v) => !v),
  };
}
