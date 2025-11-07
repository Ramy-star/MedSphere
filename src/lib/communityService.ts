'use client';
import { db } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc, setDoc, getDocs, query, where, arrayUnion, deleteDoc, writeBatch } from 'firebase/firestore';
import { nanoid } from 'nanoid';
import { useAuthStore } from '@/stores/auth-store';
import { contentService } from './contentService';

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

export interface Post {
    id: string;
    userId: string;
    content: string;
    imageUrl?: string;
    imageCloudinaryPublicId?: string;
    createdAt: any;
    updatedAt?: any;
    commentCount?: number;
    reactions: { [userId: string]: string }; // userId: reactionType
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
    let userName = user?.displayName || 'User';

    // Truncate name to first two parts
    const nameParts = userName.split(' ');
    if (nameParts.length > 2) {
        userName = `${nameParts[0]} ${nameParts[1]}`;
    }


    await updateDoc(channelRef, {
        lastMessage: {
            text: content,
            timestamp: serverTimestamp(),
            userId: userId,
            userName: isAnonymous ? 'Anonymous User' : userName,
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

export async function joinChannel(channelId: string, userId: string): Promise<void> {
    if (!db) throw new Error("Firestore is not initialized.");

    const channelRef = doc(db, 'channels', channelId);
    await updateDoc(channelRef, {
        members: arrayUnion(userId)
    });
}

export async function createPost(userId: string, content: string, imageFile: File | null): Promise<string> {
    if (!db) throw new Error("Firestore is not initialized.");

    let imageUrl: string | undefined;
    let imageCloudinaryPublicId: string | undefined;

    if (imageFile) {
        // Since this is not a user avatar, we can simplify the upload call.
        // Let's assume a generic folder for posts.
        const uploadResult = await contentService.uploadUserAvatar({ id: userId } as any, imageFile, () => {}, 'posts');
        imageUrl = uploadResult.url;
        imageCloudinaryPublicId = uploadResult.publicId;
    }
    
    const postsColRef = collection(db, 'posts');
    const newDocRef = doc(postsColRef);
    
    const newPostData: Omit<Post, 'id' | 'createdAt'> & { id: string, createdAt: any } = {
        id: newDocRef.id,
        userId,
        content,
        reactions: {},
        createdAt: serverTimestamp(),
        ...(imageUrl && { imageUrl }),
        ...(imageCloudinaryPublicId && { imageCloudinaryPublicId }),
    };

    await setDoc(newDocRef, newPostData);
    
    return newDocRef.id;
}

export async function updatePost(postId: string, newContent: string) {
    if (!db) throw new Error("Firestore is not initialized.");
    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, {
        content: newContent,
        updatedAt: serverTimestamp(),
    });
}

export async function deletePost(post: Post) {
    if (!db) throw new Error("Firestore is not initialized.");
    if (post.imageCloudinaryPublicId) {
        await contentService.deleteCloudinaryAsset(post.imageCloudinaryPublicId, 'image');
    }
    const postRef = doc(db, 'posts', post.id);
    await deleteDoc(postRef);
}

export async function togglePostReaction(postId: string, userId: string) {
    if (!db) throw new Error("Firestore is not initialized.");
    const postRef = doc(db, 'posts', postId);
    
    const postSnap = await getDoc(postRef);
    if(!postSnap.exists()) throw new Error("Post not found.");

    const postData = postSnap.data() as Post;
    const newReactions = { ...postData.reactions };

    if (newReactions[userId]) {
        delete newReactions[userId];
    } else {
        newReactions[userId] = 'like'; // For now, only 'like' is supported
    }

    await updateDoc(postRef, {
        reactions: newReactions,
    });
}
