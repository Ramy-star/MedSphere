
'use client';

import type { Content } from './contentService';
import { db } from '@/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';


const prefetchCache = new Map<string, Content[]>();

class PrefetchService {
  private prefetching = new Set<string>();

  async prefetchChildren(parentId: string | null) {
    if (!parentId || prefetchCache.has(parentId) || this.prefetching.has(parentId)) {
      return;
    }

    if (!db) return;

    this.prefetching.add(parentId);
    try {
      // Directly fetch from firestore on the client
      const q = query(collection(db, 'content'), where('parentId', '==', parentId), orderBy('order'));
      const snapshot = await getDocs(q);
      const children = snapshot.docs.map(doc => doc.data() as Content);
      prefetchCache.set(parentId, children);

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

    