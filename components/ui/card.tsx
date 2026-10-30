import React, { type ElementType, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type CardProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  padded?: boolean;
  quiet?: boolean;
};

export function Card({ as: Comp = 'div', className, padded, quiet, ...props }: CardProps) {
  return (
    <Comp className={cn(quiet ? 'card-quiet' : 'card', padded && 'p-5', className)} {...props} />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1 p-5 pb-3', className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-section text-foreground', className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-meta text-muted', className)} {...props} />;
}

export function CardAction({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('self-start justify-self-end', className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5 pt-0', className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-center border-t border-border bg-surface-raised/50 p-4 rounded-b-[var(--radius-lg)]',
        className,
      )}
      {...props}
    />
  );
}
