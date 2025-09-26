
'use client';
import { db } from '@/firebase';
import { collection, writeBatch, query, where, getDocs, orderBy, doc, setDoc, getDoc, updateDoc, runTransaction } from 'firebase/firestore';
import { allContent as seedData } from './file-data';
import { v4 as uuidv4 } from 'uuid';
import { naturalSort } from './sort';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


export type Content = {
  id: string;
  name: string;
  type: 'LEVEL' | 'SEMESTER' | 'SUBJECT' | 'FOLDER' | 'FILE';
  parentId: string | null;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
  order?: number;
  iconName?: string;
  color?: string;
};

export async function seedInitialData() {
    if (!db) {
        console.error("Firestore is not initialized.");
        return;
    }
    const contentRef = collection(db, 'content');
    const snapshot = await getDocs(query(contentRef, where('type', '==', 'LEVEL')));

    if (!snapshot.empty) {
        console.log("Content collection already has levels. Skipping seed.");
        return;
    }

    try {
        await runTransaction(db, async (transaction) => {
            seedData.forEach((item, index) => {
                const docRef = doc(contentRef, item.id);
                transaction.set(docRef, { ...item, order: index, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
            });
        });
        console.log('Initial data seeded successfully.');
    } catch (e: any) {
        if (e.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: '/content (batch write)',
                operation: 'write',
                requestResourceData: { note: "Seeding multiple documents" }
            });
            errorEmitter.emit('permission-error', permissionError);
        } else {
            console.error("Error seeding data:", e);
        }
        // Re-throw the error to be caught by the caller if needed
        throw e;
    }
}


export const contentService = {
  async getAll(): Promise<Content[]> {
    if (!db) return [];
    const q = query(collection(db, 'content'), orderBy('order'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Content);
  },
  
  async getChildren(parentId: string | null): Promise<Content[]> {
    if (!db) return [];
    const q = query(collection(db, 'content'), where('parentId', '==', parentId), orderBy('order'));
    const snapshot = await getDocs(q);
    const children = snapshot.docs.map(doc => doc.data() as Content);
    return children;
  },

  async createFolder(parentId: string | null, name: string): Promise<Content> {
    if (!db) throw new Error("Firestore not initialized");
    const id = `folder_${uuidv4()}`;
    const children = await this.getChildren(parentId);
    const order = children.length;
    
    const item: Content = { 
        id, 
        name, 
        type: 'FOLDER', 
        parentId: parentId, 
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        order: order
    };
    const docRef = doc(db, 'content', id);
    setDoc(docRef, item).catch(e => {
        if (e.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: `/content/${id}`,
                operation: 'create',
                requestResourceData: item,
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw e;
    });
    return item;
  },

  async uploadFile(parentId: string | null, file: { name: string, size?: number, mime?: string }): Promise<Content> {
     if (!db) throw new Error("Firestore not initialized");
    const id = `file_${uuidv4()}`;
    const children = await this.getChildren(parentId);
    const order = children.length;

    const item: Content = { 
        id, 
        name: file.name, 
        type: 'FILE', 
        parentId: parentId, 
        metadata: { size: file.size, mime: file.mime }, 
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        order: order
    };
    const docRef = doc(db, 'content', id);
    setDoc(docRef, item).catch(e => {
        if (e.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: `/content/${id}`,
                operation: 'create',
                requestResourceData: item,
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw e;
    });
    return item;
  },
  
  async updateFileContent(id: string, file: { name: string, size?: number, mime?: string }): Promise<Content> {
    if (!db) throw new Error("Firestore not initialized");
    const docRef = doc(db, 'content', id);
    const item = await this.getById(id);
    if (!item || item.type !== 'FILE') throw new Error('File not found');

    const updatedData = {
        name: file.name,
        metadata: { ...item.metadata, size: file.size, mime: file.mime },
        updatedAt: new Date().toISOString()
    };
    
    updateDoc(docRef, updatedData).catch(e => {
        if (e.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: `/content/${id}`,
                operation: 'update',
                requestResourceData: updatedData,
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw e;
    });
    return { ...item, ...updatedData };
  },

  async getById(id: string): Promise<Content | null> {
    if (!db) return null;
    if (id === 'root') {
      return { id: 'root', name: 'Home', type: 'FOLDER', parentId: null };
    }
    const docRef = doc(db, 'content', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() as Content : null;
  },

  async getAncestors(id: string): Promise<Content[]> {
    if (id === 'root' || !db) return [];
    
    const ancestors: Content[] = [];
    let current = await this.getById(id);

    while (current?.parentId) {
        const parent = await this.getById(current.parentId);
        if (!parent) break;
        ancestors.unshift(parent);
        current = parent;
    }
    return ancestors;
  },

  async rename(id: string, name: string): Promise<Content> {
    if (!db) throw new Error("Firestore not initialized");
    const docRef = doc(db, 'content', id);
    const item = await this.getById(id);
    if (!item) throw new Error('Item not found');

    const updatedData = { name, updatedAt: new Date().toISOString() };
    
    updateDoc(docRef, updatedData).catch(e => {
        if (e.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: `/content/${id}`,
                operation: 'update',
                requestResourceData: { name },
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw e;
    });

    return { ...item, ...updatedData };
  },

  async delete(id: string): Promise<boolean> {
    if (!db) throw new Error("Firestore not initialized");

    try {
      await runTransaction(db, async (transaction) => {
        const allContentSnapshot = await getDocs(collection(db, 'content'));
        const allContent = allContentSnapshot.docs.map(d => d.data() as Content);
        
        const itemsToDelete = new Set<string>();
        function findRecursively(idToRemove: string) {
          itemsToDelete.add(idToRemove);
          const children = allContent.filter(x => x.parentId === idToRemove);
          children.forEach(child => findRecursively(child.id));
        }
        findRecursively(id);

        itemsToDelete.forEach(itemId => {
          const docRef = doc(db, 'content', itemId);
          transaction.delete(docRef);
        });
      });
      return true;
    } catch (e: any) {
        if (e.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: `/content (transactional delete starting from ${id})`,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
        } else {
            console.error(`Transaction failed: ${e.message}`);
        }
        throw e;
    }
  },

  async updateOrder(parentId: string | null, orderedIds: string[]): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");

    const batch = writeBatch(db);
    orderedIds.forEach((id, index) => {
        const docRef = doc(db, 'content', id);
        batch.update(docRef, { order: index });
    });
    
    try {
        await batch.commit();
    } catch (e: any) {
        if (e.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: `/content (batch update)`,
                operation: 'update',
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw e;
    }
  }
};
