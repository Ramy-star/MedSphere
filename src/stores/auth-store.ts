
import { create } from 'zustand';
import { verifyAndCreateUser, getUserProfile, isSuperAdmin } from '@/lib/authService';
import { db } from '@/firebase';

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

const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isSuperAdmin: false,
  studentId: null,
  user: null,
  loading: true,
  checkAuth: () => {
    set({ loading: true });
    
    // Defer localStorage access to client-side
    if (typeof window !== 'undefined') {
      try {
        const storedId = localStorage.getItem(VERIFIED_STUDENT_ID_KEY);
        if (storedId) {
            // Check if db is initialized before using it
            if (!db) {
                 console.error("Firestore (db) is not initialized in checkAuth.");
                 set({ isAuthenticated: false, studentId: null, user: null, isSuperAdmin: false, loading: false });
                 return;
            }
            getUserProfile(storedId).then(userProfile => {
              if (userProfile) {
                 isSuperAdmin(userProfile.studentId).then(isAdmin => {
                    set({
                        isAuthenticated: true,
                        studentId: userProfile.studentId,
                        isSuperAdmin: isAdmin,
                        user: userProfile as UserProfile,
                        loading: false,
                    });
                 });
              } else {
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
    } else {
      set({ loading: false }); // On server, just finish loading
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
    if (typeof window !== 'undefined') {
       window.location.href = '/';
    }
  },
}));

export { useAuthStore };
