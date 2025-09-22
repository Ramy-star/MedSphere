
'use client';
import { deleteFile } from './indexedDBService';
import { allContent as seedData } from './file-data';
import { v4 as uuidv4 } from 'uuid';


export type Content = {
  id: string;
  name: string;
  type: 'LEVEL' | 'SEMESTER' | 'SUBJECT' | 'FOLDER' | 'FILE';
  parentId: string | null;
  metadata?: any;
  createdAt?: string;
  iconName?: string;
  color?: string;
};

const KEY = 'app_content_v2';
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function loadAll(): Content[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(KEY);
  if (!raw) {
    localStorage.setItem(KEY, JSON.stringify(seedData));
    return seedData;
  }
  return JSON.parse(raw);
}

function saveAll(items: Content[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export const contentService = {
  async getChildren(parentId: string | null) {
    if (typeof window === 'undefined') return [];
    const all = loadAll();
    const children = all.filter(i => (i.parentId ?? null) === (parentId ?? null));
    
    return children.sort((a,b) => {
      // Subjects and folders come first
      const aIsContainer = a.type === 'FOLDER' || a.type === 'SUBJECT';
      const bIsContainer = b.type === 'FOLDER' || b.type === 'SUBJECT';

      if (aIsContainer && !bIsContainer) return -1;
      if (!aIsContainer && bIsContainer) return 1;

      return collator.compare(a.name, b.name);
    });
  },

  async createFolder(parentId: string | null, name: string) {
    const all = loadAll();
    const id = `folder_${uuidv4()}`;
    const item: Content = { 
        id, 
        name, 
        type: 'FOLDER', 
        parentId: parentId, 
        createdAt: new Date().toISOString() 
    };
    all.push(item); 
    saveAll(all); 
    return item;
  },

  async uploadFile(parentId: string | null, file: { name: string, size?: number, mime?: string }) {
    const all = loadAll();
    const id = `file_${uuidv4()}`;
    const item: Content = { 
        id, 
        name: file.name, 
        type: 'FILE', 
        parentId: parentId, 
        metadata: { size: file.size, mime: file.mime }, 
        createdAt: new Date().toISOString() 
    };
    all.push(item); 
    saveAll(all); 
    return item;
  },
  
  async updateFileContent(id: string, file: { name: string, size?: number, mime?: string }) {
    const all = loadAll();
    const item = all.find(i => i.id === id && i.type === 'FILE');
    if (!item) throw new Error('File not found');

    item.name = file.name;
    item.metadata = { ...item.metadata, size: file.size, mime: file.mime };
    item.createdAt = new Date().toISOString(); // Also update the date on content update
    saveAll(all);
    return item;
  },

  async getById(id: string) {
    if (typeof window === 'undefined') return null;
    if (id === 'root') {
      return { id: 'root', name: 'Home', type: 'FOLDER', parentId: null };
    }
    const all = loadAll(); 
    return all.find(i => i.id === id) ?? null;
  },

  async getAncestors(id: string): Promise<Content[]> {
    if (id === 'root') return [];
    const all = loadAll();
    const ancestors: Content[] = [];
    let current = all.find(c => c.id === id);

    while (current?.parentId) {
        const parent = all.find(c => c.id === current!.parentId);
        if (!parent) break;
        ancestors.unshift(parent);
        current = parent;
    }
    return ancestors;
  },

  async rename(id: string, name: string) {
    const all = loadAll(); 
    const it = all.find(i => i.id === id); 
    if (!it) throw new Error('not found');
    it.name = name; 
    saveAll(all); 
    return it;
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
