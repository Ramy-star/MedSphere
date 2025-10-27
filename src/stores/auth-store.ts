
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
  user: UserProfile | null;
  loading: boolean;
  checkAuth: () => Promise<void>;
  login: (studentId: string) => Promise<boolean>;
  logout: () => void;
};

const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isSuperAdmin: false,
  studentId: null,
  user: null,
  loading: true, // Start in loading state until first check is complete
  
  checkAuth: async () => {
    set({ loading: true });
    
    try {
        const storedId = localStorage.getItem(VERIFIED_STUDENT_ID_KEY);
        if (storedId) {
            const userProfile = await getUserProfile(storedId);
            if (userProfile) {
                const isAdmin = await isSuperAdmin(userProfile.studentId);
                set({
                    isAuthenticated: true,
                    studentId: userProfile.studentId,
                    isSuperAdmin: isAdmin,
                    user: userProfile as UserProfile,
                    loading: false,
                });
                return;
            }
        }
        // If no stored ID or profile lookup fails, ensure logged out state
        get().logout();
    } catch (e) {
      console.error("Auth check failed:", e);
      get().logout(); // Ensure clean state on error
    } finally {
        set({ loading: false });
    }
  },

  login: async (studentId: string): Promise<boolean> => {
    set({ loading: true });
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
          loading: false,
        });
        return true;
      } else {
        localStorage.removeItem(VERIFIED_STUDENT_ID_KEY);
        set({ isAuthenticated: false, studentId: null, user: null, isSuperAdmin: false, loading: false });
        return false;
      }
    } catch (error) {
      console.error("Login failed:", error);
      set({ loading: false });
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
      loading: false,
    });
    // This check is important because logout might be called from a non-browser environment in some edge cases.
    if (typeof window !== 'undefined') {
       window.location.href = '/';
    }
  },
}));

export { useAuthStore };
