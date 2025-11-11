'use client';

import { create } from 'zustand';
import { getStudentDetails, createUserProfile, verifySecretCode } from '@/lib/authService';
import { db } from '@/firebase';
import { doc, onSnapshot, getDocs, collection, query, orderBy, DocumentData, updateDoc, arrayUnion, getDoc, arrayRemove, setDoc, runTransaction } from 'firebase/firestore';
import type { Content } from '@/lib/contentService';
import { nanoid } from 'nanoid';
import { telegramInbox } from '@/lib/file-data';
import { allAchievements, allAchievementsWithIcons, type Achievement } from '@/lib/achievements';
import { format, differenceInCalendarDays, parseISO } from 'date-fns';


const VERIFIED_STUDENT_ID_KEY = 'medsphere-verified-student-id';
const CURRENT_SESSION_ID_KEY = 'medsphere-session-id';
const DISPLAYED_ACHIEVEMENTS_KEY = 'medsphere-displayed-achievements';

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
  id: string; 
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
    accountAgeDays?: number;
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

type AuthFlowState = 'anonymous' | 'authenticated' | 'awaiting_secret_creation' | 'loading';

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
  set: (partial: Partial<AuthState>) => void; // Allow direct state setting
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
  awardSpecialAchievement: (badgeId: string) => Promise<void>;
};

type ItemHierarchy = { [id: string]: string[] };

let userListenerUnsubscribe: () => void = () => {};
let hierarchyListenerUnsubscribe: () => void = () => {};

const hasPermission = (user: UserProfile | null | undefined, permission: string, itemId: string | null, hierarchy: ItemHierarchy): boolean => {
    if (!user) return false;
    if (user.roles?.some(r => r.role === 'superAdmin')) return true;
    const pagePermissions = ['canAccessAdminPanel', 'canAccessQuestionCreator', 'canAccessCommunityPage'];
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
            const isSuper = userProfile.studentId === '221100154';
            useAuthStore.setState({ authState: 'authenticated', isAuthenticated: true, studentId: userProfile.studentId, isSuperAdmin: !!isSuper, user: userProfile, loading: false, error: null });
            
            // Check for achievements after user data is fully loaded and set
            await useAuthStore.getState().checkAndAwardAchievements();

        } else {
            useAuthStore.getState().logout();
        }
    }, (error) => {
        console.error("Error listening to user profile:", error);
        useAuthStore.getState().logout();
    });
};

const useAuthStore = create<AuthState>((set, get) => ({
  authState: 'loading',
  isAuthenticated: false,
  isSuperAdmin: false,
  studentId: null,
  currentSessionId: typeof window !== 'undefined' ? localStorage.getItem(CURRENT_SESSION_ID_KEY) : null,
  user: undefined,
  loading: true,
  error: null,
  itemHierarchy: {},
  newlyEarnedAchievement: null,
  set: (partial) => set(partial),
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
    set({ loading: true, authState: 'loading' });
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
    set({ loading: true, error: null, authState: 'loading' });
    if (!db) {
        set({ loading: false, error: "Database not available." });
        return;
    }
    try {
      const details = await getStudentDetails(studentId);
      if (!details.isValid) throw new Error("Invalid Student ID.");
      if (details.isClaimed && details.userProfile) {
        if (!secretCode) throw new Error("This ID is registered. Please enter your secret code.");
        const userProfile = await verifySecretCode(studentId, secretCode);
        if (userProfile) {
           localStorage.setItem(VERIFIED_STUDENT_ID_KEY, userProfile.id);
           listenToUserProfile(userProfile.id);
           set({ authState: 'authenticated' });
        } else {
          throw new Error("Incorrect Secret Code.");
        }
      } else {
        set({ authState: 'awaiting_secret_creation', studentId, loading: false });
      }
    } catch (error: any) {
        console.error("Login/Verification error:", error);
        set({ loading: false, error: error.message, authState: 'anonymous' });
    }
  },
  createProfileAndLogin: async (studentId, secretCode) => {
      set({ loading: true, error: null, authState: 'loading' });
      try {
          const userProfile = await createUserProfile(studentId, secretCode);
          if (userProfile) {
              localStorage.setItem(VERIFIED_STUDENT_ID_KEY, userProfile.id);
              localStorage.setItem(DISPLAYED_ACHIEVEMENTS_KEY, JSON.stringify([])); // Initialize displayed achievements
              listenToUserProfile(userProfile.id);
              set({ authState: 'authenticated' });
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
      localStorage.removeItem(DISPLAYED_ACHIEVEMENTS_KEY);
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
      const addPermissions = ['canAddClass', 'canAddFolder', 'canUploadFile', 'canAddLink', 'canCreateFlashcard', 'canCreateQuiz', 'canCreateExam'];
      return addPermissions.some(p => can(p, parentId));
  },
  awardSpecialAchievement: async (badgeId: string) => {
        const { user } = get();
        if (!user || !user.id) return;
        const earnedIds = new Set(user.achievements?.map(a => a.badgeId) || []);
        if (earnedIds.has(badgeId)) return;

        const achievement = allAchievementsWithIcons.find(a => a.id === badgeId);
        if (!achievement) return;

        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, {
            achievements: arrayUnion({ badgeId, earnedAt: new Date().toISOString() })
        });
        set({ newlyEarnedAchievement: achievement });
    },
  checkAndAwardAchievements: async () => {
    const { user } = get();
    if (!user) return;
  
    const userStats = user.stats || {};
    if (user.createdAt) {
      userStats.accountAgeDays = differenceInCalendarDays(new Date(), parseISO(user.createdAt));
    }
  
    const earnedAchievementIds = new Set(user.achievements?.map(a => a.badgeId) || []);
    
    let displayedAchievements: string[] = [];
    try {
        const stored = localStorage.getItem(DISPLAYED_ACHIEVEMENTS_KEY);
        if(stored) displayedAchievements = JSON.parse(stored);
    } catch(e) {
        console.error("Could not parse displayed achievements from localStorage", e);
    }

    let newAchievementsToGrant: { badgeId: string; earnedAt: string }[] = [];
    let achievementToToast: Achievement | null = null;
  
    allAchievements.forEach(achievementData => {
      const achievementWithIcon = allAchievementsWithIcons.find(a => a.id === achievementData.id);
      if (!achievementWithIcon) return; // Skip if we can't find the full achievement object

      // Check if it's already earned in the database
      if (earnedAchievementIds.has(achievementData.id)) {
        // If it's earned but not yet displayed, it's the one to show
        if (!displayedAchievements.includes(achievementData.id) && !achievementToToast) {
            achievementToToast = achievementWithIcon;
            displayedAchievements.push(achievementData.id);
        }
        return; 
      }
      
      // If not earned, check if conditions are met now
      if (achievementData.condition.value > -1) {
        const statValue = userStats[achievementData.condition.stat as keyof typeof userStats] || 0;
        if (typeof statValue === 'number' && statValue >= achievementData.condition.value) {
          newAchievementsToGrant.push({ badgeId: achievementData.id, earnedAt: new Date().toISOString() });
          
          if (!achievementToToast) {
            achievementToToast = achievementWithIcon;
            displayedAchievements.push(achievementData.id);
          }
        }
      }
    });

    try {
        localStorage.setItem(DISPLAYED_ACHIEVEMENTS_KEY, JSON.stringify(displayedAchievements));
    } catch (e) {
        console.error("Could not save displayed achievements to localStorage", e);
    }
    
    // Batch update Firestore with all newly granted achievements
    if (newAchievementsToGrant.length > 0) {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { achievements: arrayUnion(...newAchievementsToGrant) });
    }
  
    // Update the state to show the toast for the first new achievement found
    if (achievementToToast && (!get().newlyEarnedAchievement || get().newlyEarnedAchievement?.id !== achievementToToast.id)) {
      set({ newlyEarnedAchievement: achievementToToast });
    }
  },
  clearNewlyEarnedAchievement: () => set({ newlyEarnedAchievement: null }),
}));

if (typeof window !== 'undefined') {
    useAuthStore.getState().checkAuth();
}

export { useAuthStore };
