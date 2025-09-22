
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
      { id: 'lvl1', name: 'Lvl 1', type: 'FOLDER', parentId: 'root' },
      { id: 'lvl2', name: 'Lvl 2', type: 'FOLDER', parentId: 'root' },
      { id: 'sem1', name: 'Semester 1', type: 'FOLDER', parentId: 'lvl1' },
      { id: 'file1', name: 'notes1.pdf', type: 'FILE', parentId: 'sem1', metadata: { mime: 'application/pdf', size: 1024 } }
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
    const all = loadAll();
    return all.filter(i => (i.parentId ?? null) === (parentId ?? null)).sort((a,b) => {
      if (a.type !== b.type) return a.type === 'FOLDER' ? -1 : 1;
      return collator.compare(a.name, b.name);
    });
  },

  async createFolder(parentId: string | null, name: string) {
    const all = loadAll();
    const id = 'id_' + Math.random().toString(36).slice(2,9);
    const item: ContentItem = { id, name, type: 'FOLDER', parentId, createdAt: new Date().toISOString() };
    all.push(item); saveAll(all); return item;
  },

  async uploadFile(parentId: string | null, file: { name: string, size?: number, mime?: string }) {
    const all = loadAll();
    const id = 'file_' + Math.random().toString(36).slice(2,9);
    const item: ContentItem = { id, name: file.name, type: 'FILE', parentId, metadata: { size: file.size, mime: file.mime }, createdAt: new Date().toISOString() };
    all.push(item); saveAll(all); return item;
  },

  async getById(id: string) {
    const all = loadAll(); return all.find(i => i.id === id) ?? null;
  },

  async rename(id: string, name: string) {
    const all = loadAll(); const it = all.find(i => i.id === id); if (!it) throw new Error('not found');
    it.name = name; saveAll(all); return it;
  },

  async delete(id: string) {
    let all = loadAll();
    function removeRec(idToRemove: string) {
      const children = all.filter(x => x.parentId === idToRemove).map(x => x.id);
      all = all.filter(x => x.id !== idToRemove);
      children.forEach(cid => removeRec(cid));
    }
    removeRec(id);
    saveAll(all);
    return true;
  }
};
