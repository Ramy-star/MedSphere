
import { create } from 'zustand';

const SUPER_ADMIN_ID = "221100154";
const VERIFIED_STUDENT_ID_KEY = 'medsphere-verified-student-id';

type AuthState = {
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  studentId: string | null;
  loading: boolean;
  checkAuth: () => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isSuperAdmin: false,
  studentId: null,
  loading: true,
  checkAuth: () => {
    set({ loading: true });
    try {
        const storedId = localStorage.getItem(VERIFIED_STUDENT_ID_KEY);
        if (storedId) {
            set({
                isAuthenticated: true,
                studentId: storedId,
                isSuperAdmin: storedId === SUPER_ADMIN_ID,
            });
        } else {
            set({
                isAuthenticated: false,
                studentId: null,
                isSuperAdmin: false,
            });
        }
    } catch (e) {
        console.error("Could not access localStorage:", e);
        set({ isAuthenticated: false, studentId: null, isSuperAdmin: false });
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
        loading: false,
     });
  }
}));
