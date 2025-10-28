
'use client';

import { create } from 'zustand';
import { verifyAndCreateUser, isSuperAdmin as checkSuperAdmin } from '@/lib/authService';
import { db } from '@/firebase';
import { doc, onSnapshot, getDocs, collection, query, orderBy, DocumentData, updateDoc, arrayRemove, arrayUnion, getDoc } from 'firebase/firestore';
import type { Content } from '@/lib/contentService';
import { nanoid } from 'nanoid';


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

    // 2. Handle page-level permissions separately. These should work regardless of scope.
    const pagePermissions = ['canAccessAdminPanel', 'canAccessQuestionCreator'];
    if (pagePermissions.includes(permission)) {
        // Check if ANY of the user's roles grant this page-level permission.
        return user.roles?.some(role => role.permissions?.includes(permission)) || false;
    }

    // 3. For content-related permissions, check roles and scopes.
    const relevantRoles = user.roles?.filter(
        role => role.role === 'subAdmin' && role.permissions?.includes(permission)
    ) || [];

    if (relevantRoles.length === 0) {
        return false;
    }

    // 4. Check if any relevant role has a global scope.
    const hasGlobalScope = relevantRoles.some(role => role.scope === 'global');
    if (hasGlobalScope) {
        return true;
    }

    // 5. If we need to check a specific item (itemId is not null) against scoped roles.
    if (itemId === null) {
        // This means we are checking a content permission (like 'canAddFolder') at the root level.
        // Without a global scope, this is not allowed.
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

const getDeviceDescription = () => {
    if (typeof window === 'undefined') return 'Server';
    const ua = navigator.userAgent;
    let browser = 'Unknown Browser';
    let os = 'Unknown OS';

    // OS Detection
    if (ua.includes('Win')) os = 'Windows';
    if (ua.includes('Mac')) os = 'macOS';
    if (ua.includes('Linux')) os = 'Linux';
    if (ua.includes('Android')) os = 'Android';
    if (ua.includes('like Mac')) os = 'iOS'; // For iPad/iPhone

    // Browser Detection
    if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('SamsungBrowser')) browser = 'Samsung Internet';
    else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';
    else if (ua.includes('Trident')) browser = 'Internet Explorer';
    else if (ua.includes('Edge')) browser = 'Edge';
    else if (ua.includes('Edg')) browser = 'Edge (Chromium)';
    else if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Safari')) browser = 'Safari';

    return `${os} - ${browser}`;
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
        localStorage.setItem(VERIFIED_STUDENT_ID_KEY, userProfile.studentId);
        
        const sessionId = nanoid();
        localStorage.setItem(CURRENT_SESSION_ID_KEY, sessionId);
        set({ currentSessionId: sessionId });

        const newSession: UserSession = {
            sessionId,
            device: getDeviceDescription(),
            loggedIn: new Date().toISOString(),
            lastActive: new Date().toISOString(),
            status: 'active',
        };
        
        const userDocRef = doc(db, 'users', userProfile.id);
        await updateDoc(userDocRef, {
            sessions: arrayUnion(newSession)
        });

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
        const { studentId, currentSessionId } = get();
        if (studentId && currentSessionId) {
            const userDocRef = doc(db, 'users', studentId);
            try {
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    const userProfile = userDoc.data() as UserProfile;
                    const sessionToRemove = userProfile.sessions?.find(s => s.sessionId === currentSessionId);
                    if (sessionToRemove) {
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
    const updatedSessions = user.sessions.map(s => 
        s.sessionId === sessionId ? { ...s, status: 'logged_out' } : s
    );

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
