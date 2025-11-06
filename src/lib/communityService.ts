'use client';
import { db } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

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
}
