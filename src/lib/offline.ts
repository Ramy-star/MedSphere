
'use client';

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

interface OfflineDB extends DBSchema {
  files: {
    key: string;
    value: {
      id: string;
      name: string;
      content: Blob;
      mime: string;
      timestamp: number;
      size: number;
    };
    indexes: { 'timestamp': number };
  };
  folders: {
    key: string;
    value: {
      id: string;
      name: string;
      contents: any[];
      timestamp: number;
    };
    indexes: { 'timestamp': number };
  };
  lectures: {
    key: string;
    value: {
      id: string;
      data: any;
      timestamp: number;
    };
    indexes: { 'timestamp': number };
  };
}

class OfflineStorage {
  private dbPromise: Promise<IDBPDatabase<OfflineDB>> | null = null;

  private async init() {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = openDB<OfflineDB>('medsphere-offline', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('files')) {
          const fileStore = db.createObjectStore('files', { keyPath: 'id' });
          fileStore.createIndex('timestamp', 'timestamp');
        }
        if (!db.objectStoreNames.contains('folders')) {
          const folderStore = db.createObjectStore('folders', { keyPath: 'id' });
          folderStore.createIndex('timestamp', 'timestamp');
        }
        if (!db.objectStoreNames.contains('lectures')) {
          const lectureStore = db.createObjectStore('lectures', { keyPath: 'id' });
          lectureStore.createIndex('timestamp', 'timestamp');
        }
      }
    });
    return this.dbPromise;
  }

  async saveFile(fileId: string, data: { name: string; content: Blob; mime: string; }) {
    const db = await this.init();
    await db.put('files', {
      id: fileId,
      name: data.name,
      content: data.content,
      mime: data.mime,
      timestamp: Date.now(),
      size: data.content.size
    });
  }

  async getFile(fileId: string) {
    const db = await this.init();
    return await db.get('files', fileId);
  }

  async deleteFile(fileId: string): Promise<void> {
      const db = await this.init();
      await db.delete('files', fileId);
  }

  async saveFolder(folderId: string, contents: any[]) {
    const db = await this.init();
    await db.put('folders', {
      id: folderId,
      name: contents[0]?.parentName || 'Folder',
      contents,
      timestamp: Date.now()
    });
  }

  async getFolder(folderId: string) {
    const db = await this.init();
    return await db.get('folders', folderId);
  }

  async cleanOldFiles(maxSizeMB: number = 500) {
    const db = await this.init();
    const allFiles = await db.getAll('files');
    const totalSize = allFiles.reduce((sum, f) => sum + f.size, 0);
    const maxSize = maxSizeMB * 1024 * 1024;
    
    if (totalSize > maxSize) {
      const sorted = allFiles.sort((a, b) => a.timestamp - b.timestamp);
      let currentSize = totalSize;
      
      for (const file of sorted) {
        if (currentSize <= maxSize) break;
        await db.delete('files', file.id);
        currentSize -= file.size;
      }
    }
  }

  async isAvailableOffline(fileId: string): Promise<boolean> {
    const db = await this.init();
    const file = await db.get('files', fileId);
    return !!file;
  }
}

export const offlineStorage = new OfflineStorage();
