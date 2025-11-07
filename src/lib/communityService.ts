'use client';
import { db } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc, setDoc, getDocs, query, where, arrayUnion, deleteDoc as deleteFirestoreDoc, writeBatch, increment, runTransaction } from 'firebase/firestore';
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
    isAnonymous?: boolean;
    createdAt: any;
    updatedAt?: any;
    commentCount?: number;
    commentsDisabled?: boolean;
    reactions: { [userId: string]: string }; // userId: reactionType
}

export interface Comment {
    id: string;
    postId: string;
    parentCommentId: string | null;
    userId: string;
    content: string;
    createdAt: any;
    reactions: { [key: string]: string };
    replyCount?: number;
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
  content?: string;
  timestamp: any;
  isAnonymous: boolean;
  audioUrl?: string;
  audioDuration?: number;
  audioType?: string;
  replyTo?: {
    messageId: string;
    content: string;
    userId: string;
    userName: string;
  };
}

export type Content = {
    id: string;
    name: string;
    type: string;
    parentId: string | null;
    metadata?: { [key: string]: any };
};


export async function sendMessage(channelId: string, userId: string, content: string, isAnonymous: boolean, audio?: { blob: Blob, duration: number }): Promise<void> {
    if (!db) {
        throw new Error("Firestore is not initialized.");
    }
    
    let audioData = {};
    if (audio) {
        const { url, publicId } = await contentService.uploadUserAvatar({ id: userId } as any, audio.blob, () => {}, 'community_audio');
        audioData = {
            audioUrl: url,
            audioDuration: audio.duration,
            audioType: audio.blob.type,
        };
        content = `Voice message (${Math.round(audio.duration)}s)`;
    }

    const messagesColRef = collection(db, 'channels', channelId, 'messages');
    
    await addDoc(messagesColRef, {
        channelId,
        userId,
        content,
        isAnonymous,
        timestamp: serverTimestamp(),
        ...audioData,
    });

    const channelRef = doc(db, 'channels', channelId);
    const user = useAuthStore.getState().user;
    let userName = user?.displayName || 'User';

    const nameParts = userName.split(' ');
    if (nameParts.length > 2) {
        userName = `${nameParts[0]} ${nameParts[1]}`;
    }


    await updateDoc(channelRef, {
        lastMessage: {
            text: audio ? 'Voice message' : content,
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
        members: [creatorId], 
        admins: [creatorId],
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


export async function sendDirectMessage(chatId: string, userId: string, content: string, audio?: { blob: Blob, duration: number }, replyTo?: Message['replyTo']): Promise<void> {
    if (!db) throw new Error("Firestore is not initialized.");

    let audioData = {};
    let messageContent = content;

    if (audio) {
        const { url } = await contentService.uploadUserAvatar({ id: userId } as any, audio.blob, () => {}, 'community_audio');
        audioData = {
            audioUrl: url,
            audioDuration: audio.duration,
            audioType: audio.blob.type,
        };
        messageContent = ''; // No text content for voice messages
    }

    const messagesColRef = collection(db, 'directMessages', chatId, 'messages');
    await addDoc(messagesColRef, {
        chatId: chatId,
        userId,
        content: messageContent,
        timestamp: serverTimestamp(),
        isAnonymous: false, // DMs are never anonymous
        replyTo: replyTo || null,
        ...audioData,
    });

    const chatRef = doc(db, 'directMessages', chatId);
    await updateDoc(chatRef, {
        lastMessage: {
            text: audio ? 'Voice message' : content,
            timestamp: serverTimestamp(),
            userId: userId,
        },
        lastUpdated: serverTimestamp()
    });
}

export async function updateDirectMessage(chatId: string, messageId: string, newContent: string) {
    if (!db) throw new Error("Firestore is not initialized.");
    const messageRef = doc(db, 'directMessages', chatId, 'messages', messageId);
    await updateDoc(messageRef, {
        content: newContent,
    });
}

export async function deleteDirectMessage(chatId: string, messageId: string) {
    if (!db) throw new Error("Firestore is not initialized.");
    const messageRef = doc(db, 'directMessages', chatId, 'messages', messageId);
    await deleteFirestoreDoc(messageRef);
}


export async function joinChannel(channelId: string, userId: string): Promise<void> {
    if (!db) throw new Error("Firestore is not initialized.");

    const channelRef = doc(db, 'channels', channelId);
    await updateDoc(channelRef, {
        members: arrayUnion(userId)
    });
}

export async function createPost(userId: string, content: string, imageFile: File | null, isAnonymous: boolean): Promise<string> {
    if (!db) throw new Error("Firestore is not initialized.");

    let imageUrl: string | undefined;
    let imageCloudinaryPublicId: string | undefined;

    if (imageFile) {
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
        isAnonymous: isAnonymous,
        createdAt: serverTimestamp(),
        commentCount: 0,
        commentsDisabled: false,
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
    await deleteFirestoreDoc(postRef);
}

export async function togglePostReaction(postId: string, userId: string, reactionType: string) {
    if (!db) throw new Error("Firestore is not initialized.");
    const postRef = doc(db, 'posts', postId);
    
    await runTransaction(db, async (transaction) => {
        const postSnap = await transaction.get(postRef);
        if (!postSnap.exists()) throw new Error("Post not found.");
        
        const postData = postSnap.data() as Post;
        const newReactions = { ...postData.reactions };

        if (newReactions[userId] === reactionType) {
            delete newReactions[userId];
        } else {
            newReactions[userId] = reactionType;
        }

        transaction.update(postRef, { reactions: newReactions });
    });
}

export async function toggleCommentReaction(postId: string, commentId: string, userId: string, reactionType: string) {
    if (!db) throw new Error("Firestore is not initialized.");
    const commentRef = doc(db, 'posts', postId, 'comments', commentId);
    
     await runTransaction(db, async (transaction) => {
        const commentSnap = await transaction.get(commentRef);
        if (!commentSnap.exists()) throw new Error("Comment not found.");
        
        const commentData = commentSnap.data() as Comment;
        const newReactions = { ...commentData.reactions };

        if (newReactions[userId] === reactionType) {
            delete newReactions[userId];
        } else {
            newReactions[userId] = reactionType;
        }

        transaction.update(commentRef, { reactions: newReactions });
    });
}

export async function toggleComments(postId: string, disable: boolean) {
    if (!db) throw new Error("Firestore is not initialized.");
    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, {
        commentsDisabled: disable,
    });
}


export async function addComment(postId: string, userId: string, content: string, parentCommentId: string | null): Promise<string> {
    if (!db) throw new Error("Firestore is not initialized.");
    
    const postRef = doc(db, 'posts', postId);
    const commentsColRef = collection(postRef, 'comments');
    const newDocRef = doc(commentsColRef);

    const newComment: Omit<Comment, 'id'| 'createdAt'> & {id: string, createdAt: any} = {
        id: newDocRef.id,
        postId,
        parentCommentId,
        userId,
        content,
        createdAt: serverTimestamp(),
        reactions: {},
        replyCount: 0,
    };
    
    await runTransaction(db, async (transaction) => {
        transaction.set(newDocRef, newComment);
        transaction.update(postRef, { commentCount: increment(1) });
        
        if (parentCommentId) {
            const parentCommentRef = doc(db, 'posts', postId, 'comments', parentCommentId);
            transaction.update(parentCommentRef, { replyCount: increment(1) });
        }
    });

    return newDocRef.id;
}


export async function getComments(postId: string): Promise<Comment[]> {
  if (!db) throw new Error("Firestore is not initialized.");
  const commentsColRef = collection(db, 'posts', postId, 'comments');
  const q = query(commentsColRef, where('postId', '==', postId)); // Ensure we only get comments for this post
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as Comment);
}

export async function updateComment(postId: string, commentId: string, newContent: string) {
    if (!db) throw new Error("Firestore is not initialized.");
    const commentRef = doc(db, 'posts', postId, 'comments', commentId);
    await updateDoc(commentRef, {
        content: newContent,
    });
}

export async function deleteComment(postId: string, commentId: string, parentCommentId: string | null) {
    if (!db) throw new Error("Firestore is not initialized.");
    
    const postRef = doc(db, 'posts', postId);
    const commentRef = doc(db, 'posts', postId, 'comments', commentId);
    
    await runTransaction(db, async (transaction) => {
        // Decrement post's total comment count
        transaction.update(postRef, { commentCount: increment(-1) });

        // If it's a reply, decrement parent comment's reply count
        if (parentCommentId) {
            const parentRef = doc(db, 'posts', postId, 'comments', parentCommentId);
            transaction.update(parentRef, { replyCount: increment(-1) });
        }
        
        // Delete the comment itself
        transaction.delete(commentRef);
    });
}
