
'use client';

import { create } from 'zustand';
import { verifyAndCreateUser, isSuperAdmin as checkSuperAdmin } from '@/lib/authService';
import { db } from '@/firebase';
import { doc, onSnapshot, getDocs, collection, query, orderBy, DocumentData, updateDoc, arrayUnion, getDoc, arrayRemove, setDoc, runTransaction } from 'firebase/firestore';
import type { Content } from '@/lib/contentService';
import { nanoid } from 'nanoid';
import { telegramInbox } from '@/lib/file-data';


const VERIFIED_STUDENT_ID_KEY = 'medsphere-verified-student-id';
const CURRENT_SESSION_ID_KEY = 'medsphere-session-id';

export type UserSession = {
    sessionId: string;
    device: string;
    lastActive: string; // ISO String
    loggedIn: string; // ISO String
    status?: 'active' | 'logged_out';
};

export type UserRole = {
    role: 'superAdmin' | 'subAdmin';
    scope: 'global' | 'level' | 'semester' | 'subject' | 'folder';
    scopeId?: string;
    scopeName?: string;
    permissions?: string[];
};

export type UserProfile = {
  id: string; // Document ID from Firestore, now mandatory
  uid: string;
  username: string;
  studentId: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  level?: string;
  createdAt?: string;
  roles?: UserRole[];
  isBlocked?: boolean;
  favorites?: string[];
  sessions?: UserSession[];
  stats?: {
    filesUploaded?: number;
    foldersCreated?: number;
    examsCompleted?: number;
    aiQueries?: number;
    consecutiveLoginDays?: number;
    lastLoginDate?: string;
  };
   achievements?: {
    badgeId: string;
    earnedAt: string;
  }[];
  metadata?: {
    cloudinaryPublicId?: string;
    coverPhotoURL?: string;
    coverPhotoCloudinaryPublicId?: string;
  };
};

type ItemHierarchy = { [id: string]: string[] }; // Maps item ID to its array of parent IDs

type AuthState = {
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  studentId: string | null;
  currentSessionId: string | null;
  user: UserProfile | null | undefined;
  loading: boolean;
  itemHierarchy: ItemHierarchy;
  buildHierarchy: () => (() => void); // Now returns an unsubscribe function
  checkAuth: () => Promise<void>;
  login: (studentId: string) => Promise<boolean>;
  logout: (localOnly?: boolean) => void;
  logoutSession: (sessionId: string) => Promise<void>;
  can: (permission: string, itemId: string | null) => boolean;
  canAddContent: (parentId: string | null) => boolean;
};

let userListenerUnsubscribe: () => void = () => {};
let hierarchyListenerUnsubscribe: () => void = () => {};


/**
 * Checks if a user has a specific permission for a given item.
 * This is the core logic for the roles and permissions system.
 */
const hasPermission = (user: UserProfile | null | undefined, permission: string, itemId: string | null, hierarchy: ItemHierarchy): boolean => {
    if (!user) {
        return false;
    }

    // 1. Super Admins can do anything.
    if (user.roles?.some(r => r.role === 'superAdmin')) {
        return true;
    }
    
    const allUserRoles = user.roles?.filter(role => role.role === 'subAdmin') || [];

    // 2. Handle page-level/global permissions that don't depend on a specific item.
    const pagePermissions = ['canAccessAdminPanel', 'canAccessQuestionCreator'];
    if (pagePermissions.includes(permission)) {
        // For these permissions, we just need to find if ANY role grants it.
        return allUserRoles.some(role => role.permissions?.includes(permission));
    }
    
    // ---- From here, we are dealing with content-specific permissions ----

    const relevantRoles = allUserRoles.filter(
        role => role.permissions?.includes(permission)
    );

    if (relevantRoles.length === 0) {
        return false;
    }

    // Check for a global scope that would grant permission everywhere.
    const hasGlobalScope = relevantRoles.some(role => role.scope === 'global');
    if (hasGlobalScope) {
        return true;
    }
    
    // If checking a permission at the root (e.g., adding a level), only global scope applies.
    if (itemId === null) {
        return false;
    }
    
    // Get the item's ancestry path (including itself).
    const itemPath = [...(hierarchy[itemId] || []), itemId];

    // Check if any of the item's ancestors (or the item itself) match a role's scopeId.
    for (const role of relevantRoles) {
        if (role.scopeId && itemPath.includes(role.scopeId)) {
            return true;
        }
    }

    return false;
};

const getDeviceDescription = (): string => {
  if (typeof window === 'undefined') return 'Server';
  const ua = navigator.userAgent;

  let os = 'Unknown OS';
  let device = 'Device';
  let browser = 'Unknown Browser';

  // OS Detection
  if (/Windows/.test(ua)) {
    os = 'Windows';
    device = 'Windows PC';
  } else if (/Macintosh|Mac OS X/.test(ua)) {
    os = 'macOS';
    device = 'Apple Mac';
    if (/MacIntel/.test(navigator.platform) && 'ontouchend' in document) {
        device = 'Apple iPad'; // iPad on iPadOS 13+
    }
  } else if (/Android/.test(ua)) {
    os = 'Android';
    device = 'Android Device';
    const samsung = /SAMSUNG|SM-/.test(ua);
    const xiaomi = /Xiaomi|Redmi|POCO/.test(ua);
    const huawei = /Huawei/i.test(ua);
    const oneplus = /OnePlus/i.test(ua);
    if(samsung) device = 'Samsung Phone';
    if(xiaomi) device = 'Xiaomi Phone';
    if(huawei) device = 'Huawei Phone';
    if(oneplus) device = 'OnePlus Phone';

  } else if (/iPhone|iPad|iPod/.test(ua)) {
    os = 'iOS';
    device = 'Apple ' + ua.match(/iPhone|iPad|iPod/)?.[0];
  } else if (/Linux/.test(ua)) {
    os = 'Linux';
    device = 'Linux PC';
  }

  // Browser Detection
  if (/Firefox/.test(ua)) browser = 'Firefox';
  else if (/SamsungBrowser/.test(ua)) browser = 'Samsung Internet';
  else if (/Opera|OPR/.test(ua)) browser = 'Opera';
  else if (/Edge|Edg/.test(ua)) browser = 'Edge';
  else if (/Chrome/.test(ua)) browser = 'Chrome';
  else if (/Safari/.test(ua)) browser = 'Safari';

  return `${device} (${browser})`;
};


const listenToUserProfile = (studentId: string) => {
    if (userListenerUnsubscribe) userListenerUnsubscribe();
    if (!db) return;

    const userDocRef = doc(db, 'users', studentId);
    userListenerUnsubscribe = onSnapshot(userDocRef, async (doc) => {
        if (doc.exists()) {
            const userProfile = { id: doc.id, ...doc.data() } as UserProfile;
            
            // Real-time session check
            const currentSessionId = useAuthStore.getState().currentSessionId;
            const mySession = userProfile.sessions?.find(s => s.sessionId === currentSessionId);
            
            if (mySession && mySession.status === 'logged_out') {
                console.log("Remote logout signal received. Logging out.");
                useAuthStore.getState().logout(true); // Force logout without DB update
                return;
            }
            
            if (userProfile.isBlocked) {
                useAuthStore.getState().logout();
                return;
            }
            
            const isSuper = await checkSuperAdmin(userProfile.studentId);
            const hasSuperAdminRole = userProfile.roles?.some(r => r.role === 'superAdmin');

            if(isSuper && !hasSuperAdminRole) {
                userProfile.roles = [...(userProfile.roles || []), { role: 'superAdmin', scope: 'global' }];
            }

            useAuthStore.setState({
                isAuthenticated: true,
                studentId: userProfile.studentId,
                isSuperAdmin: isSuper,
                user: userProfile,
                loading: false,
            });
        } else {
            // User document was deleted, log them out.
            useAuthStore.getState().logout();
        }
    }, (error) => {
        console.error("Error listening to user profile:", error);
        useAuthStore.getState().logout();
    });
};


const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isSuperAdmin: false,
  studentId: null,
  currentSessionId: typeof window !== 'undefined' ? localStorage.getItem(CURRENT_SESSION_ID_KEY) : null,
  user: undefined, // undefined means we haven't checked yet
  loading: true,
  itemHierarchy: {},

  buildHierarchy: () => {
    if (!db) return () => {};
    
    // Stop any previous listener to avoid memory leaks
    if (hierarchyListenerUnsubscribe) {
        hierarchyListenerUnsubscribe();
    }

    const q = query(collection(db, 'content'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const hierarchy: ItemHierarchy = {};
        const items = new Map<string, DocumentData>();
        snapshot.docs.forEach(d => items.set(d.id, d.data()));
        
        for (const id of items.keys()) {
            const path: string[] = [];
            let currentItem = items.get(id);
            let currentParentId = currentItem?.parentId;
            while(currentParentId) {
                path.unshift(currentParentId);
                const parentItem = items.get(currentParentId);
                currentParentId = parentItem?.parentId;
            }
            hierarchy[id] = path;
        }
        set({ itemHierarchy: hierarchy });
        console.log("Real-time hierarchy updated.");

    }, (error) => {
        console.error("Error listening to content hierarchy:", error);
    });

    hierarchyListenerUnsubscribe = unsubscribe;
    return unsubscribe; // Return the unsubscribe function for cleanup
  },
  
  checkAuth: async () => {
    if (typeof window === 'undefined') {
      set({ loading: false, user: null });
      return;
    };

    set({ loading: true });
    // Clean up previous listeners before starting new ones
    if (userListenerUnsubscribe) userListenerUnsubscribe();
    if (hierarchyListenerUnsubscribe) hierarchyListenerUnsubscribe();

    try {
        const storedId = localStorage.getItem(VERIFIED_STUDENT_ID_KEY);
        if (storedId) {
            // Start listening to the content hierarchy in real-time
            get().buildHierarchy();
            // Start listening to the user profile
            listenToUserProfile(storedId);

            // Ensure the Telegram Inbox exists for admins
            const isSuper = await checkSuperAdmin(storedId);
            if (isSuper && db) {
                 const inboxRef = doc(db, 'content', telegramInbox.id);
                 runTransaction(db, async transaction => {
                    const inboxDoc = await transaction.get(inboxRef);
                    if (!inboxDoc.exists()) {
                         console.log("Telegram Inbox not found for admin. Creating it now.");
                         transaction.set(inboxRef, { ...telegramInbox, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
                    }
                }).catch(err => console.error("Failed to ensure Telegram Inbox exists:", err));
            }

        } else {
            set({ isAuthenticated: false, studentId: null, user: null, isSuperAdmin: false, loading: false });
        }
    } catch (e) {
      console.error("Auth check failed:", e);
      set({ isAuthenticated: false, studentId: null, user: null, isSuperAdmin: false, loading: false });
    }
  },

  login: async (studentId: string): Promise<boolean> => {
    try {
      const userProfile = await verifyAndCreateUser(studentId);
      if (userProfile) {
        localStorage.setItem(VERIFIED_STUDENT_ID_KEY, userProfile.id);
        
        const sessionId = get().currentSessionId || nanoid();
        if (sessionId !== get().currentSessionId) {
          localStorage.setItem(CURRENT_SESSION_ID_KEY, sessionId);
          set({ currentSessionId: sessionId });
        }

        const newSession: UserSession = {
            sessionId,
            device: getDeviceDescription(),
            loggedIn: new Date().toISOString(),
            lastActive: new Date().toISOString(),
            status: 'active',
        };
        
        const userDocRef = doc(db, 'users', userProfile.id);
        
        // This is a more robust way to add a session
        const docSnap = await getDoc(userDocRef);
        const existingSessions = (docSnap.data()?.sessions as UserSession[] || []).filter(s => s.status !== 'logged_out');
        const thisSessionExists = existingSessions.some(s => s.sessionId === sessionId);

        if (!thisSessionExists) {
            await updateDoc(userDocRef, {
                sessions: arrayUnion(newSession)
            });
        }

        await get().checkAuth(); // This will now build hierarchy and set up the listener
        return true;
      } else {
        get().logout();
        return false;
      }
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    }
  },

  logout: async (localOnly = false) => {
    if (userListenerUnsubscribe) userListenerUnsubscribe();
    if (hierarchyListenerUnsubscribe) hierarchyListenerUnsubscribe();
    
    if (!localOnly) {
        const { user, currentSessionId } = get();
        if (user && user.id && currentSessionId) {
            const userDocRef = doc(db, 'users', user.id);
            try {
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    const userProfile = userDoc.data() as UserProfile;
                    const sessionToLogout = userProfile.sessions?.find(s => s.sessionId === currentSessionId);
                    if (sessionToLogout) {
                        // Mark as logged out instead of removing
                        const updatedSessions = userProfile.sessions?.map(s => s.sessionId === currentSessionId ? { ...s, status: 'logged_out' } : s);
                        await updateDoc(userDocRef, {
                            sessions: updatedSessions
                        });
                    }
                }
            } catch (error) {
                console.error("Error updating session status on logout:", error);
            }
        }
    }

    try {
      localStorage.removeItem(VERIFIED_STUDENT_ID_KEY);
      localStorage.removeItem(CURRENT_SESSION_ID_KEY);
    } catch (e) {
      console.error("Could not remove item from localStorage:", e);
    }
    set({
      isAuthenticated: false,
      studentId: null,
      isSuperAdmin: false,
      user: null,
      loading: false,
      itemHierarchy: {},
      currentSessionId: null,
    });
    
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        window.location.href = '/';
    }
  },

  logoutSession: async (sessionId: string) => {
    const { user } = get();
    if (!user || !user.sessions) return;
    
    const userDocRef = doc(db, 'users', user.id);
    const sessionToLogout = user.sessions.find(s => s.sessionId === sessionId);
    if (!sessionToLogout) return;
    
    // To ensure immutability and trigger re-renders correctly, we create a new array
    const updatedSessions = user.sessions.map(s => s.sessionId === sessionId ? { ...s, status: 'logged_out' } : s);

    await updateDoc(userDocRef, {
        sessions: updatedSessions
    });
  },

  can: (permission: string, itemId: string | null): boolean => {
      const { user, itemHierarchy } = get();
      return hasPermission(user, permission, itemId, itemHierarchy);
  },
  
  canAddContent: (parentId: string | null): boolean => {
      const { user, can } = get();
      if (!user) return false;
      
      const addPermissions = ['canAddClass', 'canAddFolder', 'canUploadFile', 'canAddLink', 'canCreateFlashcard'];
      
      return addPermissions.some(p => can(p, parentId));
  }
}));

// Initialize auth check on load
if (typeof window !== 'undefined') {
    useAuthStore.getState().checkAuth();
}

export { useAuthStore };
