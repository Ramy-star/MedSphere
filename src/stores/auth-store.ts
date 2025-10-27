
import { create } from 'zustand';
import { verifyAndCreateUser, getUserProfile, isSuperAdmin } from '@/lib/authService';

const VERIFIED_STUDENT_ID_KEY = 'medsphere-verified-student-id';

type UserProfile = {
  uid: string;
  username: string;
  studentId: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  level?: string;
  createdAt?: string;
  roles?: any[];
};

type AuthState = {
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  studentId: string | null;
  user: UserProfile | null | undefined; // undefined means we haven't checked yet
  checkAuth: () => Promise<void>;
  login: (studentId: string) => Promise<boolean>;
  logout: () => void;
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
                const isAdmin = await isSuperAdmin(userProfile.studentId);
                set({
                    isAuthenticated: true,
                    studentId: userProfile.studentId,
                    isSuperAdmin: isAdmin,
                    user: userProfile as UserProfile,
                });
                return;
            }
        }
        // If no stored ID or profile lookup fails, set user to null to indicate check is complete
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
        const isAdmin = await isSuperAdmin(userProfile.studentId);
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
    // This check is important because logout might be called from a non-browser environment in some edge cases.
    if (typeof window !== 'undefined') {
       window.location.href = '/';
    }
  },
}));

export { useAuthStore };
