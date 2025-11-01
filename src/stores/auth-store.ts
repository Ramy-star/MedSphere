'use client';

import { create } from 'zustand';
import { getStudentDetails, createUserProfile, verifySecretCode } from '@/lib/authService';
import { db } from '@/firebase';
import { doc, onSnapshot, getDocs, collection, query, orderBy, DocumentData, updateDoc, arrayUnion, getDoc, arrayRemove, setDoc, runTransaction } from 'firebase/firestore';
import type { Content } from '@/lib/contentService';
import { nanoid } from 'nanoid';
import { telegramInbox } from '@/lib/file-data';
import { allAchievements, type Achievement } from '@/lib/achievements';
import { format, differenceInCalendarDays, parseISO } from 'date-fns';

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
    lastLoginDate?: string; // Stored as 'yyyy-MM-dd'
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
  secretCodeHash: string;
};

type AuthFlowState = 'anonymous' | 'authenticated' | 'awaiting_secret_creation';

type AuthState = {
  authState: AuthFlowState;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  studentId: string | null;
  currentSessionId: string | null;
  user: UserProfile | null | undefined;
  loading: boolean;
  error: string | null;
  itemHierarchy: ItemHierarchy;
  newlyEarnedAchievement: Achievement | null;
  buildHierarchy: () => (() => void);
  checkAuth: () => Promise<void>;
  login: (studentId: string, secretCode?: string) => Promise<void>;
  createProfileAndLogin: (studentId: string, secretCode: string) => Promise<void>;
  logout: (localOnly?: boolean) => void;
  logoutSession: (sessionId: string) => Promise<void>;
  can: (permission: string, itemId: string | null) => boolean;
  canAddContent: (parentId: string | null) => boolean;
  checkAndAwardAchievements: () => Promise<void>;
  clearNewlyEarnedAchievement: () => void;
};

type ItemHierarchy = { [id: string]: string[] }; // Maps item ID to its array of parent IDs

let userListenerUnsubscribe: () => void = () => {};
let hierarchyListenerUnsubscribe: () => void = () => {};

const hasPermission = (user: UserProfile | null | undefined, permission: string, itemId: string | null, hierarchy: ItemHierarchy): boolean => {
    if (!user) return false;
    if (user.roles?.some(r => r.role === 'superAdmin')) return true;
    const pagePermissions = ['canAccessAdminPanel', 'canAccessQuestionCreator'];
    if (pagePermissions.includes(permission)) {
        return user.roles?.some(role => role.permissions?.includes(permission)) || false;
    }
    const relevantRoles = user.roles?.filter(role => role.role === 'subAdmin' && role.permissions?.includes(permission)) || [];
    if (relevantRoles.length === 0) return false;
    if (relevantRoles.some(role => role.scope === 'global')) return true;
    if (itemId === null) return false;
    const itemPath = [...(hierarchy[itemId] || []), itemId];
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
    let os = 'Unknown OS', device = 'Device', browser = 'Unknown Browser';
    if (/Windows/.test(ua)) { os = 'Windows'; device = 'Windows PC'; }
    else if (/Macintosh|Mac OS X/.test(ua)) { os = 'macOS'; device = 'Apple Mac'; if (/MacIntel/.test(navigator.platform) && 'ontouchend' in document) device = 'Apple iPad'; }
    else if (/Android/.test(ua)) { os = 'Android'; device = 'Android Device'; }
    else if (/iPhone|iPad|iPod/.test(ua)) { os = 'iOS'; device = 'Apple ' + ua.match(/iPhone|iPad|iPod/)?.[0]; }
    else if (/Linux/.test(ua)) { os = 'Linux'; device = 'Linux PC'; }
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
            const currentSessionId = useAuthStore.getState().currentSessionId;
            const mySession = userProfile.sessions?.find(s => s.sessionId === currentSessionId);
            if (mySession && mySession.status === 'logged_out') {
                useAuthStore.getState().logout(true); return;
            }
            if (userProfile.isBlocked) {
                useAuthStore.getState().logout(); return;
            }
            const isSuper = userProfile.roles?.some(r => r.role === 'superAdmin');
            useAuthStore.setState({ authState: 'authenticated', isAuthenticated: true, studentId: userProfile.studentId, isSuperAdmin: !!isSuper, user: userProfile, loading: false, error: null });
            useAuthStore.getState().checkAndAwardAchievements();
        } else {
            useAuthStore.getState().logout();
        }
    }, (error) => {
        console.error("Error listening to user profile:", error);
        useAuthStore.getState().logout();
    });
};

const useAuthStore = create<AuthState>((set, get) => ({
  authState: 'anonymous',
  isAuthenticated: false,
  isSuperAdmin: false,
  studentId: null,
  currentSessionId: typeof window !== 'undefined' ? localStorage.getItem(CURRENT_SESSION_ID_KEY) : null,
  user: undefined,
  loading: true,
  error: null,
  itemHierarchy: {},
  newlyEarnedAchievement: null,
  buildHierarchy: () => {
    if (!db) return () => {};
    if (hierarchyListenerUnsubscribe) hierarchyListenerUnsubscribe();
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
    }, (error) => console.error("Error listening to content hierarchy:", error));
    hierarchyListenerUnsubscribe = unsubscribe;
    return unsubscribe;
  },
  checkAuth: async () => {
    if (typeof window === 'undefined') {
      set({ authState: 'anonymous', loading: false, user: null });
      return;
    }
    set({ loading: true });
    if (userListenerUnsubscribe) userListenerUnsubscribe();
    if (hierarchyListenerUnsubscribe) hierarchyListenerUnsubscribe();
    try {
        const storedId = localStorage.getItem(VERIFIED_STUDENT_ID_KEY);
        if (storedId) {
            get().buildHierarchy();
            listenToUserProfile(storedId);
        } else {
            set({ authState: 'anonymous', isAuthenticated: false, studentId: null, user: null, isSuperAdmin: false, loading: false });
        }
    } catch (e) {
      console.error("Auth check failed:", e);
      set({ authState: 'anonymous', isAuthenticated: false, studentId: null, user: null, isSuperAdmin: false, loading: false });
    }
  },
  login: async (studentId: string, secretCode?: string) => {
    set({ loading: true, error: null });
    if (!db) {
        set({ loading: false, error: "Database not available." });
        return;
    }
    try {
      const details = await getStudentDetails(studentId);
      if (!details.isValid) throw new Error("Invalid Student ID.");
      if (details.isClaimed) {
        if (!secretCode) throw new Error("This ID is registered. Please enter your secret code.");
        const userProfile = await verifySecretCode(studentId, secretCode);
        if (userProfile) {
           localStorage.setItem(VERIFIED_STUDENT_ID_KEY, userProfile.id);
           set({ authState: 'authenticated' }); // This line was missing!
           await get().checkAuth();
        } else {
          throw new Error("Incorrect Secret Code.");
        }
      } else {
        set({ authState: 'awaiting_secret_creation', studentId: studentId, loading: false });
      }
    } catch (error: any) {
        console.error("Login/Verification error:", error);
        set({ loading: false, error: error.message });
    }
  },
  createProfileAndLogin: async (studentId, secretCode) => {
      set({ loading: true, error: null });
      try {
          const userProfile = await createUserProfile(studentId, secretCode);
          if (userProfile) {
              localStorage.setItem(VERIFIED_STUDENT_ID_KEY, userProfile.id);
              set({ authState: 'authenticated' });
              await get().checkAuth();
          } else {
              throw new Error("Could not create user profile.");
          }
      } catch (error: any) {
          console.error("Profile creation failed:", error);
          set({ loading: false, error: error.message, authState: 'anonymous' });
          localStorage.removeItem(VERIFIED_STUDENT_ID_KEY);
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
                    const updatedSessions = userProfile.sessions?.map(s => s.sessionId === currentSessionId ? { ...s, status: 'logged_out' } : s);
                    await updateDoc(userDocRef, { sessions: updatedSessions });
                }
            } catch (error) { console.error("Error updating session on logout:", error); }
        }
    }
    try {
      localStorage.removeItem(VERIFIED_STUDENT_ID_KEY);
      localStorage.removeItem(CURRENT_SESSION_ID_KEY);
    } catch (e) { console.error("Could not clear localStorage:", e); }
    set({ authState: 'anonymous', isAuthenticated: false, studentId: null, isSuperAdmin: false, user: null, loading: false, error: null, itemHierarchy: {}, currentSessionId: null });
    if (typeof window !== 'undefined' && window.location.pathname !== '/') window.location.href = '/';
  },
  logoutSession: async (sessionId: string) => {
    const { user } = get();
    if (!user || !user.sessions) return;
    const userDocRef = doc(db, 'users', user.id);
    const updatedSessions = user.sessions.map(s => s.sessionId === sessionId ? { ...s, status: 'logged_out' } : s);
    await updateDoc(userDocRef, { sessions: updatedSessions });
  },
  can: (permission, itemId) => hasPermission(get().user, permission, itemId, get().itemHierarchy),
  canAddContent: (parentId) => {
      const { user, can } = get();
      if (!user) return false;
      const addPermissions = ['canAddClass', 'canAddFolder', 'canUploadFile', 'canAddLink', 'canCreateFlashcard'];
      return addPermissions.some(p => can(p, parentId));
  },
  checkAndAwardAchievements: async () => {
    const { user } = get();
    if (!user || !user.stats) return;
    const earnedIds = new Set(user.achievements?.map(a => a.badgeId) || []);
    let newAchievements: { badgeId: string; earnedAt: string }[] = [];
    let achievementToShow: Achievement | null = null;
    allAchievements.forEach(achievement => {
        if (!earnedIds.has(achievement.id)) {
            const userStat = user.stats?.[achievement.condition.stat as keyof typeof user.stats] || 0;
            if (typeof userStat === 'number' && userStat >= achievement.condition.value) {
                newAchievements.push({ badgeId: achievement.id, earnedAt: new Date().toISOString() });
                if (!achievementToShow) achievementToShow = achievement;
            }
        }
    });
    if (newAchievements.length > 0) {
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, { achievements: arrayUnion(...newAchievements) });
        if(achievementToShow) set({ newlyEarnedAchievement: achievementToShow });
    }
  },
  clearNewlyEarnedAchievement: () => set({ newlyEarnedAchievement: null }),
}));

if (typeof window !== 'undefined') {
    useAuthStore.getState().checkAuth();
}

export { useAuthStore };
