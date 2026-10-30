'use client';

import React, { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-[10px] text-[13px] font-medium tracking-[-0.01em] transition-[background-color,color,box-shadow,border-color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.985] select-none whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'bg-brand text-brand-foreground hover:bg-brand-hover shadow-sm font-semibold',
        secondary:
          'border border-border bg-surface text-foreground shadow-sm hover:border-border-strong hover:bg-surface-raised',
        outline:
          'border border-border bg-transparent text-foreground hover:bg-surface-raised hover:border-border-strong',
        soft: 'border border-brand/25 bg-brand-soft text-brand hover:border-brand/40 hover:bg-brand-muted',
        ghost: 'text-subtle hover:bg-surface-raised hover:text-foreground',
        destructive: 'bg-danger text-danger-foreground hover:opacity-90 shadow-sm font-semibold',
        warning:
          'border border-warning/40 bg-warning-muted text-warning shadow-sm hover:border-warning/60 hover:bg-warning-strong',
        link: 'h-auto rounded-none px-0 text-brand underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-3.5',
        xs: 'h-6 px-2 text-[11px] rounded-md',
        sm: 'h-8 px-3 text-[12px] rounded-lg',
        lg: 'h-10 px-4 text-[14px]',
        icon: 'size-9',
        'icon-sm': 'size-8',
        'icon-xs': 'size-6 rounded-md',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean;
    loadingText?: string;
  };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant,
    size,
    loading = false,
    loadingText,
    children,
    disabled,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {loading ? (
        <>
          <LoaderCircle className="size-3.5 animate-spin shrink-0" aria-hidden />
          <span>{loadingText ?? children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
});

Button.displayName = 'Button';

export { buttonVariants };
