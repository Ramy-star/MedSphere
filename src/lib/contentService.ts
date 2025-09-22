
import { deleteFile } from './indexedDBService';
export type ContentItem = {
  id: string;
  name: string;
  type: 'FOLDER' | 'FILE' | 'LINK';
  parentId?: string | null;
  metadata?: any;
  createdAt?: string;
};

const KEY = 'mock_content_v1';
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function loadAll(): ContentItem[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(KEY);
  if (!raw) {
    const seed: ContentItem[] = [
      { id: 'root', name: 'Root', type: 'FOLDER', parentId: null },
    ];
    localStorage.setItem(KEY, JSON.stringify(seed));
    return seed;
  }
  return JSON.parse(raw);
}
function saveAll(items: ContentItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export const contentService = {
  async getChildren(parentId: string | null) {
    if (typeof window === 'undefined') return [];
    const all = loadAll();
    return all.filter(i => (i.parentId ?? null) === (parentId ?? 'root')).sort((a,b) => {
      if (a.type !== b.type) return a.type === 'FOLDER' ? -1 : 1;
      return collator.compare(a.name, b.name);
    });
  },

  async createFolder(parentId: string | null, name: string) {
    const all = loadAll();
    const id = 'id_' + Math.random().toString(36).slice(2,9);
    const item: ContentItem = { id, name, type: 'FOLDER', parentId: parentId ?? 'root', createdAt: new Date().toISOString() };
    all.push(item); saveAll(all); return item;
  },

  async uploadFile(parentId: string | null, file: { name: string, size?: number, mime?: string }) {
    const all = loadAll();
    const id = 'file_' + Math.random().toString(36).slice(2,9);
    const item: ContentItem = { id, name: file.name, type: 'FILE', parentId: parentId ?? 'root', metadata: { size: file.size, mime: file.mime }, createdAt: new Date().toISOString() };
    all.push(item); saveAll(all); return item;
  },

  async getById(id: string) {
    if (typeof window === 'undefined') return null;
    const all = loadAll(); return all.find(i => i.id === id) ?? null;
  },

  async rename(id: string, name: string) {
    const all = loadAll(); const it = all.find(i => i.id === id); if (!it) throw new Error('not found');
    it.name = name; saveAll(all); return it;
  },

  async delete(id: string) {
    let all = loadAll();
    const itemsToDelete = new Set<string>();
    
    function findRecursively(idToRemove: string) {
        itemsToDelete.add(idToRemove);
        const children = all.filter(x => x.parentId === idToRemove);
        children.forEach(child => findRecursively(child.id));
    }

    findRecursively(id);

    const filesToDelete = all.filter(item => itemsToDelete.has(item.id) && item.type === 'FILE');
    
    for (const file of filesToDelete) {
        await deleteFile(file.id);
    }
    
    all = all.filter(x => !itemsToDelete.has(x.id));
    saveAll(all);

    return true;
  }
};
