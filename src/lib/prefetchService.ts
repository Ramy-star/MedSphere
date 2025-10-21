'use client';

import { contentService, Content } from './contentService';

/**
 * A simple in-memory cache for prefetched data.
 * The key is the parentId, and the value is the array of children Content.
 */
const prefetchCache = new Map<string, Content[]>();

class PrefetchService {
  private prefetching = new Set<string>();

  /**
   * Prefetches the children of a given parent ID.
   * It prevents re-fetching if a prefetch for the same ID is already in progress.
   * @param parentId The ID of the parent to prefetch children for.
   */
  async prefetchChildren(parentId: string | null) {
    if (!parentId || prefetchCache.has(parentId) || this.prefetching.has(parentId)) {
      return;
    }

    this.prefetching.add(parentId);
    try {
      // We don't need to use the result directly, as the firebase SDK
      // will cache the documents internally. When the useCollection hook
      // is used on the next page, it will resolve from the cache instantly.
      await contentService.getChildren(parentId);
    } catch (error) {
      console.error(`[Prefetch] Failed to prefetch children for ${parentId}:`, error);
      // If it fails, we remove it from the cache so it can be tried again.
      prefetchCache.delete(parentId);
    } finally {
      this.prefetching.delete(parentId);
    }
  }

  /**
   * Retrieves prefetched children from the cache.
   * @param parentId The ID of the parent.
   * @returns The cached array of children, or undefined if not in cache.
   */
  getPrefetchedChildren(parentId: string): Content[] | undefined {
    return prefetchCache.get(parentId);
  }
}

export const prefetcher = new PrefetchService();
