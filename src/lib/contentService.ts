'use server';
import { db } from '@/firebase';
import { collection, writeBatch, query, where, getDocs, orderBy, doc, setDoc, getDoc, updateDoc, runTransaction, increment, deleteDoc as deleteFirestoreDoc, DocumentReference, arrayUnion, arrayRemove, DocumentSnapshot, addDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { nanoid } from 'nanoid';
import type { Lecture } from './types';
import type { UserProfile } from '@/stores/auth-store';
import { allContent as seedData, telegramInbox } from '@/lib/file-data';
import type { Note } from '@/components/profile/ProfileNotesSection';


export type Content = {
  id: string;
  name: string;
  type: 'LEVEL' | 'SEMESTER' | 'SUBJECT' | 'FOLDER' | 'FILE' | 'LINK' | 'INTERACTIVE_QUIZ' | 'INTERACTIVE_EXAM' | 'INTERACTIVE_FLASHCARD' | 'NOTE';
  parentId: string | null;
  metadata?: {
    size?: number;
    mime?: string;
    storagePath?: string;
    cloudinaryPublicId?: string;
    cloudinaryResourceType?: 'image' | 'video' | 'raw';
    url?: string; // For LINK type
    iconURL?: string; // For custom folder icons
    iconCloudinaryPublicId?: string;
    shortId?: string;
    sourceFileId?: string; // For generated files like quizzes
    quizData?: string; // For INTERACTIVE_QUIZ or INTERACTIVE_EXAM type
    isClassContainer?: boolean; // For the new "Class" type
    isHidden?: boolean; // For hiding content from non-admins
  };
  createdAt?: string;
  updatedAt?: string;
  order?: number;
  iconName?: string;
  color?: string;
};

// This service is now only for Firestore-related content management.
// File uploads and client-side operations are moved to fileService.ts
export const contentService = {
  async seedInitialData() {
    if (!db) {
        console.error("Firestore is not initialized.");
        return;
    }
    const contentRef = collection(db, 'content');
    
    try {
        const batch = writeBatch(db);
        const allSeedItems = [...seedData, telegramInbox];

        allSeedItems.forEach((item, index) => {
            const docRef = doc(contentRef, item.id);
            const dataWithDefaults = {
                ...item,
                order: item.order ?? index,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            batch.set(docRef, dataWithDefaults, { merge: true });
        });

        await batch.commit();
        console.log('Data seeding/verification completed successfully.');
    } catch (e: any) {
        if (e && e.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: '/content (batch write)',
                operation: 'write',
                requestResourceData: { note: "Seeding multiple documents" }
            });
            errorEmitter.emit('permission-error', permissionError);
        } else {
            console.error("Error during data seeding transaction:", e);
        }
    }
  },
  async getChildren(parentId: string | null): Promise<Content[]> {
    if (!db) return [];
    const q = query(collection(db, 'content'), where('parentId', '==', parentId), orderBy('order'));
    const snapshot = await getDocs(q);
    const children = snapshot.docs.map(doc => doc.data() as Content);
    return children;
  },
  async createFolder(parentId: string | null, name: string, metadata: Content['metadata'] = {}): Promise<Content> {
    if (!db) throw new Error("Firestore not initialized");
    const newFolderId = uuidv4();
    const newFolderRef = doc(db, 'content', newFolderId);
    let newFolderData: Content | null = null;
    try {
      await runTransaction(db, async (transaction) => {
        const childrenQuery = parentId
            ? query(collection(db, 'content'), where('parentId', '==', parentId))
            : query(collection(db, 'content'), where('parentId', '==', null));
        const childrenSnapshot = await getDocs(childrenQuery);
        const order = childrenSnapshot.size;
        newFolderData = {
          id: newFolderId,
          name: name,
          type: 'FOLDER',
          parentId: parentId,
          metadata: metadata,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          order: order,
        };
        transaction.set(newFolderRef, newFolderData);
      });
     
      if (!newFolderData) throw new Error("Folder creation failed within transaction.");
      return newFolderData;
    } catch (e: any) {
      if (e && e.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `/content/${newFolderId}`,
            operation: 'create',
            requestResourceData: { name, parentId, type: 'FOLDER', metadata },
        }));
      } else {
        console.error("Transaction failed: ", e);
      }
      throw e;
    }
  },
  async createLink(parentId: string | null, name: string, url: string): Promise<Content> {
    if (!db) throw new Error("Firestore not initialized");
    const newLinkId = uuidv4();
    const newLinkRef = doc(db, 'content', newLinkId);
    let newLinkData: Content | null = null;
    try {
      await runTransaction(db, async (transaction) => {
        const childrenQuery = parentId
            ? query(collection(db, 'content'), where('parentId', '==', parentId))
            : query(collection(db, 'content'), where('parentId', '==', null));
        const childrenSnapshot = await getDocs(childrenQuery);
        const order = childrenSnapshot.size;
        newLinkData = {
          id: newLinkId,
          name: name,
          type: 'LINK',
          parentId: parentId,
          metadata: {
            url: url,
            shortId: nanoid(10),
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          order: order,
        };
        transaction.set(newLinkRef, newLinkData);
      });
     
      if (!newLinkData) throw new Error("Link creation failed within transaction.");
      return newLinkData;
    } catch (e: any) {
      if (e && e.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `/content/${newLinkId}`,
            operation: 'create',
            requestResourceData: { name, parentId, type: 'LINK', url },
        }));
      } else {
        console.error("Transaction failed: ", e);
      }
      throw e;
    }
  },
  async createOrUpdateInteractiveContent(
    destination: Content,
    name: string,
    lectureData: Partial<Lecture>,
    sourceFileId: string,
    type: 'INTERACTIVE_QUIZ' | 'INTERACTIVE_EXAM' | 'INTERACTIVE_FLASHCARD'
  ): Promise<Content> {
      if (!db) throw new Error("Firestore not initialized");
 
      const originalFileName = name.replace(/\.[^/.]+$/, "");
      let contentName = name;
     
      if(destination.type === 'FOLDER') {
         switch (type) {
            case 'INTERACTIVE_QUIZ':
                contentName = `${originalFileName} - Quiz`;
                break;
            case 'INTERACTIVE_EXAM':
                contentName = `${originalFileName} - Exam`;
                break;
            case 'INTERACTIVE_FLASHCARD':
                contentName = `${originalFileName} - Flashcards`;
                break;
        }
      }
     
      const newLectureData: Lecture = {
          id: lectureData.id || sourceFileId || uuidv4(),
          name: lectureData.name || originalFileName,
          mcqs_level_1: lectureData.mcqs_level_1 || [],
          mcqs_level_2: lectureData.mcqs_level_2 || [],
          written: lectureData.written || [],
          flashcards: lectureData.flashcards || [],
      };
      // If destination is a folder, create a new interactive file
      if (destination.type === 'FOLDER') {
          const newId = uuidv4();
          const newRef = doc(db, 'content', newId);
 
          return runTransaction(db, async (transaction) => {
              const childrenQuery = query(collection(db, 'content'), where('parentId', '==', destination.id));
              const childrenSnapshot = await getDocs(childrenQuery);
              const order = childrenSnapshot.size;
             
              const newContentData: Content = {
                  id: newId,
                  name: contentName,
                  type: type,
                  parentId: destination.id,
                  metadata: {
                      quizData: type === 'INTERACTIVE_FLASHCARD'
                        ? JSON.stringify([{ id: `l${Date.now()}`, name: name, flashcards: [] }], null, 2)
                        : JSON.stringify([newLectureData], null, 2),
                      sourceFileId,
                  },
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  order: order,
              };
              transaction.set(newRef, newContentData);
              return newContentData;
          });
      }
 
      // If destination is an existing file of the same type, merge the content
      if (destination.type === type) {
          const docRef = doc(db, 'content', destination.id);
 
          return runTransaction(db, async (transaction) => {
              const docSnap = await transaction.get(docRef);
              if (!docSnap.exists()) throw new Error("Destination file does not exist.");
 
              const existingQuizData = docSnap.data().metadata?.quizData;
              let existingLectures: Lecture[] = [];
              if (existingQuizData) {
                  try {
                      existingLectures = JSON.parse(existingQuizData);
                      if (!Array.isArray(existingLectures)) existingLectures = [];
                  } catch (e) {
                      existingLectures = [];
                  }
              }
             
              const existingLectureIndex = existingLectures.findIndex(lec => lec.id === newLectureData.id);
 
              if (existingLectureIndex > -1) {
                  const lectureToUpdate = { ...existingLectures[existingLectureIndex] };
                  if(newLectureData.mcqs_level_1 && newLectureData.mcqs_level_1.length > 0) lectureToUpdate.mcqs_level_1 = newLectureData.mcqs_level_1;
                  if(newLectureData.mcqs_level_2 && newLectureData.mcqs_level_2.length > 0) lectureToUpdate.mcqs_level_2 = newLectureData.mcqs_level_2;
                  if(newLectureData.written && newLectureData.written.length > 0) lectureToUpdate.written = newLectureData.written;
                  if(newLectureData.flashcards && newLectureData.flashcards.length > 0) lectureToUpdate.flashcards = newLectureData.flashcards;
                 
                  existingLectures[existingLectureIndex] = lectureToUpdate;
              } else {
                  existingLectures.push(newLectureData);
              }
 
              const updatedQuizData = JSON.stringify(existingLectures, null, 2);
              transaction.update(docRef, {
                  'metadata.quizData': updatedQuizData,
                  'updatedAt': new Date().toISOString(),
              });
 
              const updatedDestination = { ...destination };
              if (!updatedDestination.metadata) updatedDestination.metadata = {};
              updatedDestination.metadata.quizData = updatedQuizData;
              return updatedDestination;
          });
      }
 
      throw new Error(`Cannot save ${type} to a file of type ${destination.type}.`);
  },
  async getById(id: string): Promise<Content | null> {
    if (!db) return null;
    if (id === 'root') {
      return { id: 'root', name: 'Home', type: 'FOLDER', parentId: null };
    }
    const docRef = doc(db, 'content', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Content : null;
  },
  async updateDoc(docId: string, data: { [key: string]: any }): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");
    const docRef = doc(db, 'content', docId);
   
    const updatedData = { ...data, updatedAt: new Date().toISOString() };
   
    await updateDoc(docRef, updatedData).catch(e => {
        if (e.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: `/content/${docId}`,
                operation: 'update',
                requestResourceData: data,
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw e;
    });
  },
  async rename(id: string, name: string): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");
    const docRef = doc(db, 'content', id);
    const updatedData = { name, updatedAt: new Date().toISOString() };
   
    await updateDoc(docRef, updatedData).catch(e => {
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
  },
 
  async move(itemId: string, newParentId: string): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");
    if (itemId === newParentId) throw new Error("Cannot move an item into itself.");
    const itemRef = doc(db, 'content', itemId);
    try {
        await runTransaction(db, async (transaction) => {
            const itemDoc = await transaction.get(itemRef);
            if (!itemDoc.exists()) {
                throw new Error("Item to move does not exist.");
            }
            let parentCheckId: string | null = newParentId;
            while (parentCheckId) {
                if (parentCheckId === itemId) {
                    throw new Error("Cannot move a folder into one of its own subfolders.");
                }
                const parentDocSnap = await transaction.get(doc(db, 'content', parentCheckId));
                const parentData = parentDocSnap.data() as Content | undefined;
                parentCheckId = parentData?.parentId ?? null;
            }
            const childrenInNewParentQuery = query(collection(db, 'content'), where('parentId', '==', newParentId));
            const childrenSnapshot = await getDocs(childrenInNewParentQuery);
            const newOrder = childrenSnapshot.size;
            transaction.update(itemRef, { parentId: newParentId, order: newOrder, updatedAt: new Date().toISOString() });
        });
    } catch (e: any) {
        if (e.code === 'permission-denied') {
             errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: `/content/${itemId}`,
                operation: 'update',
                requestResourceData: { parentId: newParentId },
            }));
        } else {
             console.error("Move transaction failed:", e);
        }
        throw e;
    }
  },
  async copy(itemToCopy: Content, newParentId: string): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");
    const batch = writeBatch(db);
    const performCopy = async (originalItem: Content, targetParentId: string | null) => {
        const newId = uuidv4();
       
        const childrenInNewParentQuery = query(collection(db, 'content'), where('parentId', '==', targetParentId));
        const childrenSnapshot = await getDocs(childrenInNewParentQuery);
        const newOrder = childrenSnapshot.size;
        const newItemData: Content = {
            ...originalItem,
            id: newId,
            parentId: targetParentId,
            name: `${originalItem.name} (Copy)`,
            order: newOrder,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        if (originalItem.metadata?.iconURL) {
            if (!newItemData.metadata) newItemData.metadata = {};
            newItemData.metadata.iconURL = originalItem.metadata.iconURL;
            newItemData.metadata.iconCloudinaryPublicId = undefined;
        }
       
        const newDocRef = doc(db, 'content', newId);
        batch.set(newDocRef, newItemData);
        if (originalItem.type === 'FOLDER' || originalItem.type === 'SUBJECT' || originalItem.type === 'SEMESTER' || originalItem.type === 'LEVEL') {
            const childrenQuery = query(collection(db, 'content'), where('parentId', '==', originalItem.id), orderBy('order'));
            const childrenSnapshot = await getDocs(childrenQuery);
            for (const childDoc of childrenSnapshot.docs) {
                await performCopy(childDoc.data() as Content, newId);
            }
        }
    };
   
    try {
        await performCopy(itemToCopy, newParentId);
        await batch.commit();
    } catch(e: any) {
         if (e.code === 'permission-denied') {
             errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: `/content/${newParentId}`,
                operation: 'create',
                requestResourceData: { note: "Copy operation" },
            }));
        } else {
             console.error("Copy operation failed:", e);
        }
        throw e;
    }
  },
 
  async toggleVisibility(id: string): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");
    const docRef = doc(db, 'content', id);
    try {
        await runTransaction(db, async (transaction) => {
            const docSnap = await transaction.get(docRef);
            if (!docSnap.exists()) {
                throw "Document does not exist!";
            }
            const currentHiddenState = docSnap.data().metadata?.isHidden ?? false;
            transaction.update(docRef, { "metadata.isHidden": !currentHiddenState });
        });
    } catch (e: any) {
        if (e.code === 'permission-denied') {
             errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: `/content/${id}`,
                operation: 'update',
                requestResourceData: { 'metadata.isHidden': '...' },
            }));
        }
        console.error("Toggle visibility failed: ", e);
        throw e;
    }
  },
  async toggleFavorite(userId: string, contentId: string): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");
    const userRef = doc(db, "users", userId);
    try {
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) throw new Error("User not found");
       
        const favorites = userDoc.data().favorites || [];
        const isFavorited = favorites.includes(contentId);
        if (isFavorited) {
            await updateDoc(userRef, { favorites: arrayRemove(contentId) });
        } else {
            await updateDoc(userRef, { favorites: arrayUnion(contentId) });
        }
    } catch (e: any) {
        if (e.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: `/users/${userId}`,
                operation: 'update',
                requestResourceData: { favorites: '...' },
            }));
        }
        console.error("Toggle favorite failed:", e);
        throw e;
    }
  },
  async delete(id: string): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");
    const deleteQueue: string[] = [id];
    const visited = new Set<string>([id]);
    const batch = writeBatch(db);
    try {
        let head = 0;
        while(head < deleteQueue.length) {
            const currentId = deleteQueue[head++];
            const childrenQuery = query(collection(db, "content"), where("parentId", "==", currentId));
            const childrenSnapshot = await getDocs(childrenQuery);
            childrenSnapshot.forEach(childDoc => {
                if (!visited.has(childDoc.id)) {
                    deleteQueue.push(childDoc.id);
                    visited.add(childDoc.id);
                }
            });
        }
       
        const allDocsToDeleteQuery = query(collection(db, "content"), where("id", "in", Array.from(visited)));
        const allDocsSnapshot = await getDocs(allDocsToDeleteQuery);
       
        allDocsSnapshot.forEach(docSnap => {
            batch.delete(docSnap.ref);
        });
       
        await batch.commit();
    } catch (e: any) {
        if (e.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: `/content (recursive delete starting from ${id})`,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
        } else {
            console.error(`Recursive delete failed: ${e.message}`);
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
                path: `/content (batch update for reordering)`,
                operation: 'update',
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw e;
    }
  },
  async createNote(userId: string) {
    if (!db) throw new Error("Database not initialized");
    const notesCollection = collection(db, `users/${userId}/notes`);
    const newNote = {
      content: '## New Note\n\nStart writing here...',
      color: '#333333',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await addDoc(notesCollection, newNote);
  },

  async updateNote(userId: string, noteId: string, updates: Partial<Note>) {
    if (!db) throw new Error("Database not initialized");
    const noteRef = doc(db, `users/${userId}/notes`, noteId);
    await updateDoc(noteRef, { ...updates, updatedAt: new Date().toISOString() });
  },

  async deleteNote(userId: string, noteId: string) {
    if (!db) throw new Error("Database not initialized");
    const noteRef = doc(db, `users/${userId}/notes`, noteId);
    await deleteFirestoreDoc(noteRef);
  },
  
  async resetToInitialStructure(): Promise<void> {
    if (!db) throw new Error("Firestore not initialized.");

    console.log("Starting structure reset...");
    
    const seedIdsToKeep = new Set(
        seedData.map(item => item.id)
    );
    seedIdsToKeep.add(telegramInbox.id);

    const contentRef = collection(db, 'content');
    const allContentSnapshot = await getDocs(contentRef);
    
    const itemsToDelete: Content[] = [];
    
    allContentSnapshot.forEach(doc => {
        const item = doc.data() as Content;
        if (!seedIdsToKeep.has(item.id)) {
            itemsToDelete.push(item);
        }
    });

    if (itemsToDelete.length === 0) {
        console.log("No items to delete. Structure is already clean.");
        return;
    }

    console.log(`Found ${itemsToDelete.length} items to delete.`);

    const batch = writeBatch(db);
    itemsToDelete.forEach(item => {
        batch.delete(doc(db, 'content', item.id));
    });
    
    console.log("Committing Firestore batch deletion...");
    await batch.commit();
    console.log("Firestore documents deleted.");
  },
};
