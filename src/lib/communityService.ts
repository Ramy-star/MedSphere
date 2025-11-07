'use client';
import { db } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { nanoid } from 'nanoid';

export interface Channel {
  id: string;
  name: string;
  description: string;
  type: 'public' | 'private' | 'level';
  levelId?: string;
  members: string[];
  admins: string[];
  createdAt: any;
  lastMessage?: {
    text: string;
    timestamp: any;
    userId: string;
    userName: string;
  };
}

export interface Message {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  timestamp: any;
  isAnonymous: boolean;
}

export async function sendMessage(channelId: string, userId: string, content: string, isAnonymous: boolean): Promise<void> {
    if (!db) {
        throw new Error("Firestore is not initialized.");
    }
    
    const messagesColRef = collection(db, 'channels', channelId, 'messages');
    
    await addDoc(messagesColRef, {
        channelId,
        userId,
        content,
        isAnonymous,
        timestamp: serverTimestamp()
    });

    // Also update the lastMessage on the channel
    const channelRef = doc(db, 'channels', channelId);
    await updateDoc(channelRef, {
        lastMessage: {
            text: content,
            timestamp: serverTimestamp(),
            userId: userId,
            userName: isAnonymous ? 'Anonymous' : 'User' // You might want to fetch the real username
        }
    });
}

export async function createChannel(
    name: string,
    description: string,
    type: 'public' | 'private' | 'level',
    creatorId: string,
    levelId?: string
): Promise<string> {
    if (!db) {
        throw new Error("Firestore is not initialized.");
    }

    const channelsColRef = collection(db, 'channels');
    
    const newChannelData = {
        name,
        description,
        type,
        members: [creatorId], // Creator is the first member
        admins: [creatorId], // and the first admin
        createdAt: serverTimestamp(),
        ...(type === 'level' && { levelId }),
    };

    const docRef = await addDoc(channelsColRef, newChannelData);
    
    // Update the document with its own ID
    await updateDoc(docRef, { id: docRef.id });

    return docRef.id;
}
