'use client';

import { useCallback } from 'react';
import { GitCompare, Download, Trash2, X, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface SelectionToolbarProps {
  selectedIds: Set<string>;
  totalCount: number;
  onClear: () => void;
  onSelectAll: () => void;
  onCompare?: (id1: string, id2: string) => void;
  onExport?: (ids: string[]) => void;
  onDelete?: (ids: string[]) => void;
  className?: string;
}

export function SelectionToolbar({
  selectedIds,
  totalCount,
  onClear,
  onSelectAll,
  onCompare,
  onExport,
  onDelete,
  className,
}: SelectionToolbarProps) {
  const selectedCount = selectedIds.size;
  const selectedArray = Array.from(selectedIds);
  
  const handleCompare = useCallback(() => {
    if (selectedCount >= 2 && onCompare) {
      onCompare(selectedArray[0], selectedArray[1]);
    }
  }, [selectedCount, selectedArray, onCompare]);
  
  const handleExport = useCallback(() => {
    if (selectedCount > 0 && onExport) {
      onExport(selectedArray);
    }
  }, [selectedCount, selectedArray, onExport]);
  
  const handleDelete = useCallback(() => {
    if (selectedCount > 0 && onDelete) {
      onDelete(selectedArray);
    }
  }, [selectedCount, selectedArray, onDelete]);
  
  if (selectedCount === 0) {
    return null;
  }
  
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-2 bg-primary/5 border border-primary/20 rounded-lg',
        'animate-in slide-in-from-top-2 duration-200',
        className
      )}
    >
      {/* Selection count */}
      <div className="flex items-center gap-2 text-sm font-medium">
        <CheckSquare className="h-4 w-4 text-primary" />
        <span className="text-primary">
          {selectedCount} selected
        </span>
        {totalCount > selectedCount && (
          <span className="text-muted-foreground">
            of {totalCount}
          </span>
        )}
      </div>
      
      <div className="h-4 w-px bg-border" />
      
      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Compare - only when exactly 2 selected */}
        {onCompare && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCompare}
            disabled={selectedCount !== 2}
            className="gap-1.5"
            title={selectedCount !== 2 ? 'Select exactly 2 documents to compare' : 'Compare selected documents'}
          >
            <GitCompare className="h-4 w-4" />
            Compare
          </Button>
        )}
        
        {/* Export JSON */}
        {onExport && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExport}
            className="gap-1.5"
          >
            <Download className="h-4 w-4" />
            Export JSON
          </Button>
        )}
        
        {/* Delete with confirmation */}
        {onDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {selectedCount} document{selectedCount > 1 ? 's' : ''}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the selected
                  document{selectedCount > 1 ? 's' : ''} from the database.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
      
      <div className="flex-1" />
      
      {/* Select all / Clear */}
      <div className="flex items-center gap-2">
        {selectedCount < totalCount && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSelectAll}
            className="text-muted-foreground"
          >
            Select all
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="gap-1.5 text-muted-foreground"
        >
          <X className="h-3 w-3" />
          Clear
        </Button>
      </div>
    </div>
  );
}

