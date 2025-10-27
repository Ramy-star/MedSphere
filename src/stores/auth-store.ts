
import { create } from 'zustand';
import { authService } from '@/lib/authService';

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
  checkAuth: () => void;
  login: (studentId: string) => Promise<boolean>;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isSuperAdmin: false,
  studentId: null,
  user: null,
  loading: true,
  checkAuth: () => {
    set({ loading: true });
    try {
      const storedId = localStorage.getItem(VERIFIED_STUDENT_ID_KEY);
      if (storedId) {
        authService.getUserProfile(storedId).then(userProfile => {
          if (userProfile) {
            set({
              isAuthenticated: true,
              studentId: userProfile.studentId,
              isSuperAdmin: authService.isSuperAdmin(userProfile.studentId),
              user: userProfile as UserProfile,
              loading: false,
            });
          } else {
            // ID was stored but user doesn't exist in DB, force logout
            get().logout();
          }
        });
      } else {
        set({ isAuthenticated: false, studentId: null, isSuperAdmin: false, user: null, loading: false });
      }
    } catch (e) {
      console.error("Auth check failed:", e);
      set({ isAuthenticated: false, studentId: null, isSuperAdmin: false, user: null, loading: false });
    }
  },
  login: async (studentId: string): Promise<boolean> => {
    set({ loading: true });
    try {
      const userProfile = await authService.verifyAndCreateUser(studentId);
      if (userProfile) {
        localStorage.setItem(VERIFIED_STUDENT_ID_KEY, userProfile.studentId);
        set({
          isAuthenticated: true,
          studentId: userProfile.studentId,
          isSuperAdmin: authService.isSuperAdmin(userProfile.studentId),
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
    // Optional: redirect to login page
    if (typeof window !== 'undefined') {
       window.location.href = '/';
    }
  },
}));
