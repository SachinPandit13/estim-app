import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataTableToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  children?: React.ReactNode;
  onResetFilters?: () => void;
  isFiltered?: boolean;
  totalCount?: number;
  className?: string;
}

export function DataTableToolbar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Filter records...',
  children,
  onResetFilters,
  isFiltered = false,
  totalCount,
  className,
}: DataTableToolbarProps) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3 py-3', className)}>
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-8 h-8 text-xs bg-card"
          />
        </div>
        {children}
        {isFiltered && onResetFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetFilters}
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Reset
            <X className="ml-1 size-3" />
          </Button>
        )}
      </div>

      {totalCount !== undefined && (
        <div className="text-xs text-muted-foreground font-mono">
          {totalCount} {totalCount === 1 ? 'record' : 'records'}
        </div>
      )}
    </div>
  );
}
