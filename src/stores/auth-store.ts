
import { create } from 'zustand';
import { verifyAndCreateUser, getUserProfile, isSuperAdmin as checkSuperAdmin } from '@/lib/authService';
import { db } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const VERIFIED_STUDENT_ID_KEY = 'medsphere-verified-student-id';

type UserRole = {
    role: 'superAdmin' | 'subAdmin';
    scope: 'global' | 'level' | 'semester' | 'subject' | 'folder';
    scopeId?: string;
    scopeName?: string;
    permissions?: string[];
};

type UserProfile = {
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
};

type AuthState = {
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  studentId: string | null;
  user: UserProfile | null | undefined;
  checkAuth: () => Promise<void>;
  login: (studentId: string) => Promise<boolean>;
  logout: () => void;
  can: (permission: string, path: string) => boolean;
  canAddContent: (path: string) => boolean;
};

let userListenerUnsubscribe: () => void = () => {};

const hasPermission = (user: UserProfile | null | undefined, isSuperAdmin: boolean, permission: string, path: string): boolean => {
    if (!user) return false;
    if (isSuperAdmin) return true;

    const subAdminRoles = user.roles?.filter(r => r.role === 'subAdmin') || [];
    if (subAdminRoles.length === 0) return false;

    for (const role of subAdminRoles) {
        if (role.permissions?.includes(permission)) {
            if (role.scope === 'global') return true;

            const pathSegments = path.split('/').filter(Boolean);
            if (pathSegments.length < 2) continue;

            const scopeType = pathSegments[0];
            const scopeId = pathSegments[1];

            if (role.scope === scopeType && role.scopeId === scopeId) {
                return true;
            }
        }
    }
    return false;
};

const listenToUserProfile = (studentId: string) => {
    // Unsubscribe from any previous listener
    if (userListenerUnsubscribe) {
        userListenerUnsubscribe();
    }
    
    if (!db) {
        console.error("Firestore (db) is not initialized in listenToUserProfile.");
        return;
    }

    const userDocRef = doc(db, 'users', studentId);
    userListenerUnsubscribe = onSnapshot(userDocRef, async (doc) => {
        if (doc.exists()) {
            const userProfile = { ...doc.data() } as UserProfile;
            const isAdmin = await checkSuperAdmin(userProfile.studentId);
            
            // Check if user is blocked
            if (userProfile.isBlocked) {
                useAuthStore.getState().logout();
                // Optionally, show a toast message about being blocked
            } else {
                 useAuthStore.setState({
                    isAuthenticated: true,
                    studentId: userProfile.studentId,
                    isSuperAdmin: isAdmin,
                    user: userProfile,
                });
            }
        } else {
            // Document was deleted, log the user out
            useAuthStore.getState().logout();
        }
    }, (error) => {
        console.error("Error listening to user profile:", error);
        // On error (e.g. permissions), log the user out as a safeguard
        useAuthStore.getState().logout();
    });
};


const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isSuperAdmin: false,
  studentId: null,
  user: undefined,
  
  checkAuth: async () => {
    if (userListenerUnsubscribe) {
        userListenerUnsubscribe();
        userListenerUnsubscribe = () => {};
    }

    try {
        const storedId = typeof window !== 'undefined' ? localStorage.getItem(VERIFIED_STUDENT_ID_KEY) : null;
        if (storedId) {
            // Set up a real-time listener instead of a one-time fetch
            listenToUserProfile(storedId);
        } else {
            set({ isAuthenticated: false, studentId: null, user: null, isSuperAdmin: false });
        }
    } catch (e) {
      console.error("Auth check failed:", e);
      set({ isAuthenticated: false, studentId: null, user: null, isSuperAdmin: false });
    }
  },

  login: async (studentId: string): Promise<boolean> => {
    try {
      const userProfile = await verifyAndCreateUser(studentId);
      if (userProfile) {
        localStorage.setItem(VERIFIED_STUDENT_ID_KEY, userProfile.studentId);
        // After successful login, start listening for real-time updates
        listenToUserProfile(userProfile.studentId);
        return true;
      } else {
        localStorage.removeItem(VERIFIED_STUDENT_ID_KEY);
        set({ isAuthenticated: false, studentId: null, user: null, isSuperAdmin: false });
        return false;
      }
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    }
  },

  logout: () => {
    // Stop listening to user profile changes
    if (userListenerUnsubscribe) {
      userListenerUnsubscribe();
      userListenerUnsubscribe = () => {};
    }
    try {
      localStorage.removeItem(VERIFIED_STUDENT_ID_KEY);
    } catch (e) {
      console.error("Could not remove item from localStorage:", e);
    }
    set({
      isAuthenticated: false,
      studentId: null,
      isSuperAdmin: false,
      user: null,
    });
    if (typeof window !== 'undefined') {
       window.location.href = '/';
    }
  },

  can: (permission: string, path: string): boolean => {
      const { user, isSuperAdmin } = get();
      if (isSuperAdmin) return true;
      return hasPermission(user, isSuperAdmin, permission, path);
  },
  
  canAddContent: (path: string): boolean => {
      const { user, isSuperAdmin } = get();
      if (!user) return false;
      if (isSuperAdmin) return true;

      const subAdminRoles = user.roles?.filter(r => r.role === 'subAdmin') || [];
      if (subAdminRoles.length === 0) return false;
      
      const addPermissions = ['canAddClass', 'canAddFolder', 'canUploadFile', 'canAddLink', 'canCreateFlashcard'];
      
      for (const role of subAdminRoles) {
          if (role.permissions?.some(p => addPermissions.includes(p))) {
              if (role.scope === 'global') return true;
              const pathSegments = path.split('/').filter(Boolean);
              if (pathSegments.length < 2) continue;
              const scopeType = pathSegments[0];
              const scopeId = pathSegments[1];
              if (role.scope === scopeType && role.scopeId === scopeId) {
                  return true;
              }
          }
      }
      return false;
  }
}));

export { useAuthStore };
