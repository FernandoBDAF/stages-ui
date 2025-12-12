import type {
  ExecutionDeepLink,
  GraphDashDeepLink,
  ManagementDeepLink,
} from '@/types/iteration-api';

/**
 * Build URL for Execution module with pre-filled config
 */
export function buildExecutionLink(params: ExecutionDeepLink): string {
  const searchParams = new URLSearchParams();
  
  searchParams.set('stage', params.stage);
  searchParams.set('input', params.input);
  searchParams.set('collection', params.collection);
  searchParams.set('db', params.db);
  
  if (params.params) {
    searchParams.set('params', JSON.stringify(params.params));
  }
  
  if (params.returnTo) {
    searchParams.set('returnTo', params.returnTo);
  }
  
  return `/execution?${searchParams.toString()}`;
}

/**
 * Build URL for GraphDash with entity selection
 */
export function buildGraphDashLink(params: GraphDashDeepLink): string {
  const searchParams = new URLSearchParams();
  
  searchParams.set('entity', params.entityId);
  searchParams.set('db', params.db);
  
  if (params.highlight) {
    searchParams.set('highlight', 'true');
  }
  
  if (params.expandRelations) {
    searchParams.set('expand', 'true');
  }
  
  // GraphDash runs on port 3001
  const graphDashUrl = process.env.NEXT_PUBLIC_GRAPHDASH_URL || 'http://localhost:3001';
  return `${graphDashUrl}/?${searchParams.toString()}`;
}

/**
 * Build URL for Management module with action
 */
export function buildManagementLink(params: ManagementDeepLink): string {
  const searchParams = new URLSearchParams();
  
  searchParams.set('action', params.action);
  searchParams.set('db', params.db);
  searchParams.set('collection', params.collection);
  
  if (params.filter) {
    searchParams.set('filter', JSON.stringify(params.filter));
  }
  
  if (params.selectedIds && params.selectedIds.length > 0) {
    searchParams.set('ids', params.selectedIds.join(','));
  }
  
  return `/management?${searchParams.toString()}`;
}

/**
 * Build URL for Viewer with document comparison
 */
export function buildCompareLink(
  db: string,
  collection: string,
  docId1: string,
  docId2: string
): string {
  const searchParams = new URLSearchParams();
  searchParams.set('db', db);
  searchParams.set('collection', collection);
  searchParams.set('compare', `${docId1},${docId2}`);
  return `/viewer?${searchParams.toString()}`;
}

/**
 * Build URL for Viewer with timeline view
 */
export function buildTimelineLink(
  db: string,
  collection: string,
  sourceId: string
): string {
  const searchParams = new URLSearchParams();
  searchParams.set('db', db);
  searchParams.set('collection', collection);
  searchParams.set('timeline', sourceId);
  return `/viewer?${searchParams.toString()}`;
}

/**
 * Parse return URL after external operation
 */
export function parseReturnUrl(url: string): {
  path: string;
  params: Record<string, string>;
} {
  try {
    const urlObj = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    const params: Record<string, string> = {};
    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return { path: urlObj.pathname, params };
  } catch {
    return { path: url, params: {} };
  }
}

/**
 * Open external link in new tab
 */
export function openInNewTab(url: string): void {
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Navigate within app with optional new tab
 */
export function navigateTo(
  url: string,
  router: { push: (url: string) => void },
  newTab = false
): void {
  if (newTab) {
    openInNewTab(url);
  } else {
    router.push(url);
  }
}


