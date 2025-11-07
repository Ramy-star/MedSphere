'use client';
import { db } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc, setDoc, getDocs, query, where } from 'firebase/firestore';
import { nanoid } from 'nanoid';
import { useAuthStore } from '@/stores/auth-store';

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

export interface DirectMessage {
  id: string;
  participants: string[];
  lastMessage?: {
    text: string;
    timestamp: any;
    userId: string;
  };
  lastUpdated: any;
}


export interface Message {
  id: string;
  channelId?: string; // For group chats
  chatId?: string; // For DMs
  userId: string;
  content: string;
  timestamp: any;
  isAnonymous: boolean;
}

export type Content = {
    id: string;
    name: string;
    type: string;
    parentId: string | null;
    metadata?: { [key: string]: any };
};


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

    const channelRef = doc(db, 'channels', channelId);
    const user = useAuthStore.getState().user;
    const userName = user?.displayName || 'User';

    await updateDoc(channelRef, {
        lastMessage: {
            text: content,
            timestamp: serverTimestamp(),
            userId: userId,
            userName: isAnonymous ? 'Anonymous' : userName,
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
    const newDocRef = doc(channelsColRef);
    
    const newChannelData: Omit<Channel, 'createdAt' | 'id'> & { createdAt: any; id: string } = {
        id: newDocRef.id,
        name,
        description,
        type,
        members: [creatorId], // Creator is the first member
        admins: [creatorId], // and the first admin
        createdAt: serverTimestamp(),
        ...(type === 'level' && { levelId }),
    };

    await setDoc(newDocRef, newChannelData);
    return newDocRef.id;
}


export async function createOrGetDirectChat(userId1: string, userId2: string): Promise<string> {
    if (!db) throw new Error("Firestore is not initialized.");

    const participants = [userId1, userId2].sort();
    const chatId = participants.join('_');
    
    const chatRef = doc(db, 'directMessages', chatId);
    const chatSnap = await getDoc(chatRef);

    if (chatSnap.exists()) {
        return chatSnap.id;
    } else {
        await setDoc(chatRef, {
            id: chatId,
            participants,
            lastUpdated: serverTimestamp(),
        });
        return chatId;
    }
}


export async function sendDirectMessage(chatId: string, userId: string, content: string): Promise<void> {
    if (!db) throw new Error("Firestore is not initialized.");

    const messagesColRef = collection(db, 'directMessages', chatId, 'messages');
    await addDoc(messagesColRef, {
        chatId: chatId,
        userId,
        content,
        timestamp: serverTimestamp(),
        isAnonymous: false,
    });

    const chatRef = doc(db, 'directMessages', chatId);
    await updateDoc(chatRef, {
        lastMessage: {
            text: content,
            timestamp: serverTimestamp(),
            userId: userId,
        },
        lastUpdated: serverTimestamp()
    });
}
