
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

// Function to wait for db to be initialized
const waitForDB = (timeout = 5000) => {
    return new Promise((resolve) => {
        if (db) {
            resolve(true);
            return;
        }
        const startTime = Date.now();
        const interval = setInterval(() => {
            if (db) {
                clearInterval(interval);
                resolve(true);
            } else if (Date.now() - startTime > timeout) {
                clearInterval(interval);
                resolve(false);
            }
        }, 100);
    });
};

const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isSuperAdmin: false,
  studentId: null,
  user: null,
  loading: true,
  checkAuth: async () => {
    set({ loading: true });
    
    if (typeof window !== 'undefined') {
      try {
        const dbReady = await waitForDB();
        if (!dbReady) {
            console.error("Firestore (db) could not be initialized in time.");
            set({ isAuthenticated: false, studentId: null, user: null, isSuperAdmin: false, loading: false });
            return;
        }

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
            } else {
              get().logout();
            }
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
