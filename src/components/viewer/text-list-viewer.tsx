'use client';

import { FileText, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface TextListViewerProps {
  documents: Record<string, unknown>[];
  total: number;
  skip: number;
  limit: number;
  hasMore: boolean;
  onPageChange: (skip: number) => void;
  onDocumentClick: (docId: string) => void;
  textField?: string;
  isLoading?: boolean;
  className?: string;
}

/**
 * Extract text preview from document
 */
function getTextPreview(doc: Record<string, unknown>, textField?: string): string {
  // Try specific field first
  if (textField && doc[textField]) {
    const value = doc[textField];
    if (typeof value === 'string') return value;
  }
  
  // Try common fields (cleaned_text is used by cleaned_transcripts collection)
  const fields = ['cleaned_text', 'transcript', 'transcript_raw', 'content', 'text', 'description', 'summary'];
  for (const field of fields) {
    if (doc[field] && typeof doc[field] === 'string') {
      return doc[field] as string;
    }
  }
  
  return '';
}

/**
 * Extract title from document
 */
function getTitle(doc: Record<string, unknown>): string {
  return String(doc.title || doc.name || doc.video_title || doc.video_id || doc._id || 'Untitled');
}

/**
 * Truncate text to max characters with ellipsis
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

export function TextListViewer({
  documents,
  total,
  skip,
  limit,
  hasMore,
  onPageChange,
  onDocumentClick,
  textField,
  isLoading = false,
  className,
}: TextListViewerProps) {
  const currentPage = Math.floor(skip / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-4">
              <Skeleton className="h-5 w-1/3 mb-2" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-4/5" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-neutral-300 mb-4" />
        <p className="text-neutral-500">No documents found</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with count */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total.toLocaleString()} documents • Page {currentPage} of {totalPages}
        </span>
      </div>

      {/* Document cards */}
      <div className="space-y-3">
        {documents.map((doc) => {
          const docId = String(doc._id);
          const title = getTitle(doc);
          const preview = getTextPreview(doc, textField);
          const wordCount = preview.split(/\s+/).filter(Boolean).length;

          return (
            <Card
              key={docId}
              className="cursor-pointer hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
              onClick={() => onDocumentClick(docId)}
            >
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Title */}
                    <h3 className="font-medium text-neutral-900 dark:text-neutral-100 truncate mb-1">
                      {title}
                    </h3>
                    
                    {/* Preview text */}
                    {preview ? (
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2">
                        {truncate(preview, 200)}
                      </p>
                    ) : (
                      <p className="text-sm text-neutral-400 italic">No text content</p>
                    )}
                    
                    {/* Metadata */}
                    <div className="flex items-center gap-3 mt-2 text-xs text-neutral-500">
                      {wordCount > 0 && (
                        <span>{wordCount.toLocaleString()} words</span>
                      )}
                      {!!doc.channel_title && (
                        <>
                          <span>•</span>
                          <span>{String(doc.channel_title)}</span>
                        </>
                      )}
                      {!!doc.published_at && (
                        <>
                          <span>•</span>
                          <span>
                            {new Date(String(doc.published_at)).toLocaleDateString()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Arrow indicator */}
                  <ChevronRight className="h-5 w-5 text-neutral-400 flex-shrink-0 mt-1" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(0, skip - limit))}
          disabled={skip === 0}
        >
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(skip + limit)}
          disabled={!hasMore}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

