
import { create } from 'zustand';
import { verifyAndCreateUser, getUserProfile, isSuperAdmin as checkSuperAdmin } from '@/lib/authService';

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
};

type AuthState = {
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  studentId: string | null;
  user: UserProfile | null | undefined; // undefined means we haven't checked yet
  checkAuth: () => Promise<void>;
  login: (studentId: string) => Promise<boolean>;
  logout: () => void;
  can: (permission: string, path: string) => boolean;
  canAddContent: (path: string) => boolean;
};

// This function needs to be outside the store to be reused in 'can'
const hasPermission = (user: UserProfile | null | undefined, permission: string, path: string): boolean => {
    if (!user) return false;
    if (user.roles?.some(r => r.role === 'superAdmin')) return true;

    const subAdminRoles = user.roles?.filter(r => r.role === 'subAdmin') || [];
    if (subAdminRoles.length === 0) return false;

    for (const role of subAdminRoles) {
        if (role.permissions?.includes(permission)) {
            if (role.scope === 'global') return true;

            const pathSegments = path.split('/').filter(Boolean);
            if (pathSegments.length < 2) continue; // Not in a specific scope

            const scopeType = pathSegments[0]; // e.g., 'folder', 'level'
            const scopeId = pathSegments[1];

            if (role.scope === scopeType && role.scopeId === scopeId) {
                return true;
            }
        }
    }
    return false;
};

const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isSuperAdmin: false,
  studentId: null,
  user: undefined, // Initial state is 'undefined' to signify "not checked yet"
  
  checkAuth: async () => {
    try {
        const storedId = typeof window !== 'undefined' ? localStorage.getItem(VERIFIED_STUDENT_ID_KEY) : null;
        if (storedId) {
            const userProfile = await getUserProfile(storedId);
            if (userProfile) {
                const isAdmin = await checkSuperAdmin(userProfile.studentId);
                set({
                    isAuthenticated: true,
                    studentId: userProfile.studentId,
                    isSuperAdmin: isAdmin,
                    user: userProfile as UserProfile,
                });
                return;
            }
        }
        set({ isAuthenticated: false, studentId: null, user: null, isSuperAdmin: false });
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
        const isAdmin = await checkSuperAdmin(userProfile.studentId);
        set({
          isAuthenticated: true,
          studentId: userProfile.studentId,
          isSuperAdmin: isAdmin,
          user: userProfile as UserProfile,
        });
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
