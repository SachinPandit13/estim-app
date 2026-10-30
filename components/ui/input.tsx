'use client';

import React, { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  required?: boolean;
  trailing?: ReactNode;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { id, label, error, required, className, type, onClick, trailing, ...props },
  ref,
) {
  const inputId = id ?? props.name;

  const inputElement = (
    <div className={cn(trailing ? 'relative' : 'w-full')}>
      <input
        ref={ref}
        id={inputId}
        type={type}
        required={required}
        aria-invalid={Boolean(error) || undefined}
        onClick={(event) => {
          onClick?.(event);
          if (type !== 'date' || event.defaultPrevented) return;
          const field = event.currentTarget;
          if (typeof field.showPicker !== 'function') return;
          try {
            field.showPicker();
          } catch {
            /* Picker already open */
          }
        }}
        className={cn(
          'h-9 w-full min-w-0 rounded-[10px] border border-border bg-surface px-3 py-1.5 text-sm text-foreground transition-[border-color,box-shadow,background-color] duration-150',
          'placeholder:text-muted',
          'hover:border-border-strong',
          'focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand-ring focus-visible:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-60',
          type === 'date' && 'cursor-pointer',
          trailing ? 'pr-10' : '',
          error ? 'border-danger' : '',
          className,
        )}
        {...props}
      />
      {trailing ? (
        <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center text-muted">
          {trailing}
        </div>
      ) : null}
    </div>
  );

  if (!label && !error) {
    return inputElement;
  }

  return (
    <div className="flex min-w-0 flex-col gap-1.5 w-full">
      {label ? (
        <label htmlFor={inputId} className="text-[13px] font-medium text-foreground">
          {label}
          {required ? <span className="text-danger"> *</span> : null}
        </label>
      ) : null}
      {inputElement}
      {error ? (
        <p role="alert" className="text-xs text-danger font-medium">
          {error}
        </p>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';

export type SearchInputProps = InputHTMLAttributes<HTMLInputElement>;

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { className, ...props },
  ref,
) {
  return (
    <div className={cn('relative w-full sm:w-[15rem]', className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted shrink-0"
        aria-hidden
      />
      <input
        ref={ref}
        type="search"
        className={cn(
          'h-9 w-full rounded-[10px] border border-border bg-surface py-0 pr-3 pl-9 text-body text-foreground shadow-sm transition-[border-color,box-shadow,background-color] duration-150',
          'placeholder:text-muted',
          'hover:border-border-strong',
          'focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand-ring focus-visible:outline-none',
        )}
        {...props}
      />
    </div>
  );
});

SearchInput.displayName = 'SearchInput';
