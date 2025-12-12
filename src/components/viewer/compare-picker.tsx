'use client';

import { useState, useRef, useMemo } from 'react';
import { GitCompare, Clock, History, Search, FolderOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDocumentTimeline } from '@/hooks/use-iteration';
import { useCollectionQuery } from '@/hooks/use-viewer-data';
import { getSourceField } from '@/lib/viewer/renderer-selector';
import { cn } from '@/lib/utils';
import { TimelineEntry } from '@/types/iteration-api';

interface ComparePickerProps {
  isOpen: boolean;
  onClose: () => void;
  currentDocId: string;
  dbName: string;
  collection: string;
  currentDocument?: Record<string, unknown>;
  onSelect: (targetDocId: string) => void;
}

export function ComparePicker({
  isOpen,
  onClose,
  currentDocId,
  dbName,
  collection,
  currentDocument,
  onSelect,
}: ComparePickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [browseSearchQuery, setBrowseSearchQuery] = useState('');
  const [browseSkip, setBrowseSkip] = useState(0);
  const browseLimit = 10;
  const inputRef = useRef<HTMLInputElement>(null);

  // Get source field for the collection to fetch timeline versions
  const sourceField = getSourceField(collection);
  const sourceId = sourceField && currentDocument 
    ? String(currentDocument[sourceField]) 
    : currentDocId;

  // Fetch timeline data to get available versions
  const { data: timeline, isLoading: isLoadingTimeline } = useDocumentTimeline(
    dbName,
    collection,
    sourceId,
    sourceField
  );

  // Fetch collection documents for browse mode
  const { data: collectionData, isLoading: isLoadingCollection, isFetching: isFetchingCollection } = useCollectionQuery(
    dbName,
    collection,
    {
      skip: browseSkip,
      limit: browseLimit,
      enabled: isOpen, // Only fetch when dialog is open
    }
  );

  // Filter entries excluding current document
  const availableVersions = timeline?.timeline?.filter(
    (entry: TimelineEntry) => entry.doc_id !== currentDocId
  ) || [];

  // Filter collection documents excluding current and matching search query
  const filteredDocuments = useMemo(() => {
    if (!collectionData?.documents) return [];
    
    let docs = collectionData.documents.filter(
      (doc) => String(doc._id) !== currentDocId
    );
    
    // Filter by search query if present
    if (browseSearchQuery.trim()) {
      const query = browseSearchQuery.toLowerCase();
      docs = docs.filter((doc) => {
        // Search in _id
        if (String(doc._id).toLowerCase().includes(query)) return true;
        // Search in common text fields
        for (const field of ['title', 'name', 'video_id', 'text']) {
          const value = doc[field];
          if (typeof value === 'string' && value.toLowerCase().includes(query)) {
            return true;
          }
        }
        return false;
      });
    }
    
    return docs;
  }, [collectionData?.documents, currentDocId, browseSearchQuery]);

  // Get quick picks
  const previousVersion = availableVersions[0];
  const firstVersion = availableVersions.length > 1 
    ? availableVersions[availableVersions.length - 1] 
    : null;

  // Handle selecting a version
  const handleSelectVersion = (docId: string) => {
    onSelect(docId);
    onClose();
  };

  // Handle manual search - use ref value as fallback for when state isn't updated
  const handleSearch = () => {
    const value = searchQuery.trim() || inputRef.current?.value.trim() || '';
    if (value) {
      onSelect(value);
      onClose();
      setSearchQuery(''); // Reset for next time
    }
  };

  // Pagination handlers
  const totalDocs = collectionData?.total || 0;
  const totalPages = Math.ceil(totalDocs / browseLimit);
  const currentPage = Math.floor(browseSkip / browseLimit) + 1;
  const canGoPrev = browseSkip > 0;
  const canGoNext = collectionData?.has_more || false;

  const handlePrevPage = () => {
    setBrowseSkip(Math.max(0, browseSkip - browseLimit));
  };

  const handleNextPage = () => {
    setBrowseSkip(browseSkip + browseLimit);
  };

  // Get display label for a document
  const getDocLabel = (doc: Record<string, unknown>): string => {
    // Try common label fields
    for (const field of ['title', 'name', 'video_id']) {
      if (doc[field] && typeof doc[field] === 'string') {
        const value = doc[field] as string;
        return value.length > 30 ? `${value.slice(0, 30)}...` : value;
      }
    }
    return '';
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Compare with...
          </DialogTitle>
          <DialogDescription>
            Select a document to compare with the current document.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="quick" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="quick" className="gap-2">
              <Clock className="h-4 w-4" />
              Quick Picks
            </TabsTrigger>
            <TabsTrigger value="browse" className="gap-2">
              <FolderOpen className="h-4 w-4" />
              Browse Collection
            </TabsTrigger>
          </TabsList>

          {/* Quick Picks Tab */}
          <TabsContent value="quick" className="space-y-4">
            {/* Quick Picks */}
            {!isLoadingTimeline && availableVersions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Version history
                </h4>
                <div className="grid gap-2">
                  {previousVersion && (
                    <Button
                      variant="outline"
                      className="justify-start gap-2 h-auto py-3"
                      onClick={() => handleSelectVersion(previousVersion.doc_id)}
                    >
                      <Clock className="h-4 w-4 text-blue-500" />
                      <div className="text-left">
                        <div className="font-medium">Previous version</div>
                        <div className="text-xs text-muted-foreground">
                          {previousVersion.timestamp 
                            ? new Date(previousVersion.timestamp).toLocaleString()
                            : `Version ${previousVersion.version}`
                          }
                        </div>
                      </div>
                    </Button>
                  )}
                  {firstVersion && firstVersion.doc_id !== previousVersion?.doc_id && (
                    <Button
                      variant="outline"
                      className="justify-start gap-2 h-auto py-3"
                      onClick={() => handleSelectVersion(firstVersion.doc_id)}
                    >
                      <History className="h-4 w-4 text-amber-500" />
                      <div className="text-left">
                        <div className="font-medium">First version</div>
                        <div className="text-xs text-muted-foreground">
                          {firstVersion.timestamp 
                            ? new Date(firstVersion.timestamp).toLocaleString()
                            : `Version ${firstVersion.version}`
                          }
                        </div>
                      </div>
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Version List */}
            {!isLoadingTimeline && availableVersions.length > 2 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  All versions ({availableVersions.length})
                </h4>
                <div className="max-h-40 overflow-y-auto space-y-1 border rounded-md p-2">
                  {availableVersions.map((entry) => (
                    <Button
                      key={entry.doc_id}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between text-sm"
                      onClick={() => handleSelectVersion(entry.doc_id)}
                    >
                      <span>Version {entry.version}</span>
                      <span className="text-xs text-muted-foreground">
                        {entry.timestamp 
                          ? new Date(entry.timestamp).toLocaleDateString()
                          : '—'
                        }
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading state */}
            {isLoadingTimeline && (
              <div className="flex items-center justify-center py-4">
                <div className="h-5 w-5 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Loading versions...
                </span>
              </div>
            )}

            {/* No versions message */}
            {!isLoadingTimeline && availableVersions.length === 0 && (
              <div className="text-center py-4 text-sm text-muted-foreground">
                No other versions found for this document.
                <br />
                <span className="text-xs">Try browsing the collection instead.</span>
              </div>
            )}

            {/* Manual ID search */}
            <div className="space-y-2 pt-2 border-t">
              <h4 className="text-sm font-medium text-muted-foreground">
                Or enter document ID
              </h4>
              <form 
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSearch();
                }}
              >
                <Input
                  ref={inputRef}
                  placeholder="Enter document ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSearch();
                    }
                  }}
                />
                <Button
                  type="submit"
                  variant="secondary"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </TabsContent>

          {/* Browse Collection Tab */}
          <TabsContent value="browse" className="space-y-4">
            {/* Search filter */}
            <div className="flex gap-2">
              <Input
                placeholder="Filter documents..."
                value={browseSearchQuery}
                onChange={(e) => setBrowseSearchQuery(e.target.value)}
                className="flex-1"
              />
              {browseSearchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setBrowseSearchQuery('')}
                >
                  Clear
                </Button>
              )}
            </div>

            {/* Documents list */}
            {isLoadingCollection ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Loading documents...
                </span>
              </div>
            ) : filteredDocuments.length > 0 ? (
              <div className="space-y-1 max-h-60 overflow-y-auto border rounded-md p-2">
                {filteredDocuments.map((doc) => {
                  const docId = String(doc._id);
                  const label = getDocLabel(doc);
                  return (
                    <Button
                      key={docId}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "w-full justify-start text-sm h-auto py-2",
                        isFetchingCollection && "opacity-50"
                      )}
                      onClick={() => handleSelectVersion(docId)}
                      disabled={isFetchingCollection}
                    >
                      <div className="text-left min-w-0 flex-1">
                        <div className="font-mono text-xs text-muted-foreground truncate">
                          {docId}
                        </div>
                        {label && (
                          <div className="text-sm truncate">{label}</div>
                        )}
                      </div>
                    </Button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {browseSearchQuery 
                  ? 'No documents match your filter.'
                  : 'No documents found in this collection.'
                }
              </div>
            )}

            {/* Pagination */}
            {totalDocs > browseLimit && (
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-xs text-muted-foreground">
                  {browseSkip + 1}–{Math.min(browseSkip + browseLimit, totalDocs)} of {totalDocs}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={!canGoPrev || isFetchingCollection}
                    onClick={handlePrevPage}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground px-2">
                    {currentPage}/{totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={!canGoNext || isFetchingCollection}
                    onClick={handleNextPage}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
