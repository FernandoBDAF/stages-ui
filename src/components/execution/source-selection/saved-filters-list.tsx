'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Bookmark, 
  Trash2, 
  Copy,
  Clock,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSourceSelectionStore } from '@/lib/store/source-selection-store';
import { useDeleteFilter, useDuplicateFilter } from '@/hooks/use-source-selection';
import type { SavedFilterSummary } from '@/types/source-selection';
import { cn } from '@/lib/utils';

export function SavedFiltersList() {
  const savedFilters = useSourceSelectionStore((state) => state.savedFilters);
  const selectedFilterId = useSourceSelectionStore((state) => state.selectedFilterId);
  const selectSavedFilter = useSourceSelectionStore((state) => state.selectSavedFilter);
  const deleteFilterMutation = useDeleteFilter();
  const duplicateFilterMutation = useDuplicateFilter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [filterToDelete, setFilterToDelete] = useState<string | null>(null);

  if (savedFilters.length === 0) {
    return null;
  }

  const handleDeleteClick = (filterId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFilterToDelete(filterId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (filterToDelete) {
      deleteFilterMutation.mutate(filterToDelete);
      setFilterToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const handleDuplicate = (filter: SavedFilterSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    duplicateFilterMutation.mutate({
      filterId: filter.id,
      newName: `${filter.name} (copy)`,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bookmark className="h-4 w-4" />
          Saved Filters
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px]">
          <div className="space-y-2">
            {savedFilters.map((filter) => {
              const isSelected = selectedFilterId === filter.id;
              
              return (
                <button
                  key={filter.id}
                  onClick={() => selectSavedFilter(filter.id)}
                  className={cn(
                    'w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors',
                    isSelected
                      ? 'bg-primary/10 border border-primary/30'
                      : 'hover:bg-muted/50 border border-transparent'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{filter.name}</div>
                    {filter.description && (
                      <div className="text-xs text-muted-foreground truncate">
                        {filter.description}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(filter.updated_at)}
                      </span>
                      {filter.use_count > 0 && (
                        <Badge variant="secondary" className="text-xs py-0">
                          Used {filter.use_count}x
                        </Badge>
                      )}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 ml-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => handleDuplicate(filter, e)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => handleDeleteClick(filter.id, e)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Filter</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this filter? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

