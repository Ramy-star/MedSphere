'use client';

import { contentService } from './contentService';
import type { Content } from './contentService';


const prefetchCache = new Map<string, Content[]>();

class PrefetchService {
  private prefetching = new Set<string>();

  async prefetchChildren(parentId: string | null) {
    if (!parentId || prefetchCache.has(parentId) || this.prefetching.has(parentId)) {
      return;
    }

    this.prefetching.add(parentId);
    try {
      await contentService.getChildren(parentId);
    } catch (error) {
      console.error(`[Prefetch] Failed to prefetch children for ${parentId}:`, error);
      prefetchCache.delete(parentId);
    } finally {
      this.prefetching.delete(parentId);
    }
  }

  getPrefetchedChildren(parentId: string): Content[] | undefined {
    return prefetchCache.get(parentId);
  }
}

export const prefetcher = new PrefetchService();
