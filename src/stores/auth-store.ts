
import { create } from 'zustand';

const SUPER_ADMIN_ID = "221100154";
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
};

type AuthState = {
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  studentId: string | null;
  user: UserProfile | null;
  loading: boolean;
  checkAuth: () => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
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
            // In a real app, you would fetch the full user profile from Firestore here.
            // For now, we'll create a mock user object.
            const mockUser: UserProfile = {
                uid: storedId, // This is not the real uid, just for logging purposes
                studentId: storedId,
                displayName: `User ${storedId}`,
                username: `user_${storedId}`
            };

            set({
                isAuthenticated: true,
                studentId: storedId,
                isSuperAdmin: storedId === SUPER_ADMIN_ID,
                user: mockUser
            });
        } else {
            set({
                isAuthenticated: false,
                studentId: null,
                isSuperAdmin: false,
                user: null
            });
        }
    } catch (e) {
        console.error("Could not access localStorage:", e);
        set({ isAuthenticated: false, studentId: null, isSuperAdmin: false, user: null });
    } finally {
        set({ loading: false });
    }
  },
  logout: () => {
     try {
        localStorage.removeItem(VERIFIED_STUDENT_ID_KEY);
     } catch(e) {
        console.error("Could not access localStorage:", e);
     }
     set({
        isAuthenticated: false,
        studentId: null,
        isSuperAdmin: false,
        user: null,
        loading: false,
     });
     // Force a reload to clear all application state and ensure a clean start
     window.location.href = '/';
  }
}));
