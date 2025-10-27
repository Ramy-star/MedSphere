
import { create } from 'zustand';
import { verifyAndCreateUser, isSuperAdmin as checkSuperAdmin } from '@/lib/authService';
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


const hasPermission = (user: UserProfile | null | undefined, permission: string, path: string): boolean => {
    if (!user) return false;

    // Super admin always has permission.
    if (user.roles?.some(r => r.role === 'superAdmin')) return true;

    // Find all sub-admin roles that grant the specific permission.
    const relevantRoles = user.roles?.filter(
        r => r.role === 'subAdmin' && r.permissions?.includes(permission)
    ) || [];

    if (relevantRoles.length === 0) return false;

    // Check if any of the relevant roles match the current path.
    for (const role of relevantRoles) {
        // Global scope always grants permission.
        if (role.scope === 'global') return true;

        // For specific scopes, check if the path is within that scope.
        if (role.scopeId) {
            const pathSegments = path.split('/').filter(Boolean);
            
            // Check for /level/[levelId] or /folder/[folderId]
            // The path needs to contain the scopeId of the role.
            if (path.includes(`/folder/${role.scopeId}`) || path.includes(`/level/${role.scopeId}`)) {
                return true;
            }
            
            // This is a simple check. For deeper nested content, we might need to
            // traverse the hierarchy, but for now, we'll check if the current path
            // starts with the role's scope.
            // Example: role scope is folder 'xyz'. Path is /folder/xyz.
            const scopePath = `/${role.scope}/${role.scopeId}`;
            if (path.startsWith(scopePath)) {
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
            
            // Add superAdmin role if applicable, for simplified 'can' check.
            if(isAdmin && (!userProfile.roles || !userProfile.roles.some(r => r.role === 'superAdmin'))) {
                if(!userProfile.roles) userProfile.roles = [];
                userProfile.roles.push({ role: 'superAdmin', scope: 'global' });
            }

            if (userProfile.isBlocked) {
                useAuthStore.getState().logout();
            } else {
                 useAuthStore.setState({
                    isAuthenticated: true,
                    studentId: userProfile.studentId,
                    isSuperAdmin: isAdmin,
                    user: userProfile,
                });
            }
        } else {
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
  user: undefined,
  
  checkAuth: async () => {
    if (userListenerUnsubscribe) {
        userListenerUnsubscribe();
        userListenerUnsubscribe = () => {};
    }

    try {
        const storedId = typeof window !== 'undefined' ? localStorage.getItem(VERIFIED_STUDENT_ID_KEY) : null;
        if (storedId) {
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
      const { user } = get();
      return hasPermission(user, permission, path);
  },
  
  canAddContent: (path: string): boolean => {
      const { user } = get();
      if (!user) return false;
      if (user.roles?.some(r => r.role === 'superAdmin')) return true;

      const subAdminRoles = user.roles?.filter(r => r.role === 'subAdmin') || [];
      if (subAdminRoles.length === 0) return false;
      
      const addPermissions = ['canAddClass', 'canAddFolder', 'canUploadFile', 'canAddLink', 'canCreateFlashcard'];
      
      for (const role of subAdminRoles) {
          if (role.permissions?.some(p => addPermissions.includes(p))) {
              if (role.scope === 'global') return true;
              
              if (role.scopeId && path.includes(role.scopeId)) {
                  return true;
              }
          }
      }
      return false;
  }
}));

export { useAuthStore };
