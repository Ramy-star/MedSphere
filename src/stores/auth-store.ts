
import { create } from 'zustand';
import { verifyAndCreateUser, isSuperAdmin as checkSuperAdmin } from '@/lib/authService';
import { db } from '@/firebase';
import { doc, onSnapshot, getDocs, collection } from 'firebase/firestore';

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

type ItemHierarchy = { [id: string]: string[] };

type AuthState = {
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  studentId: string | null;
  user: UserProfile | null | undefined;
  itemHierarchy: ItemHierarchy;
  buildHierarchy: () => Promise<void>;
  checkAuth: () => Promise<void>;
  login: (studentId: string) => Promise<boolean>;
  logout: () => void;
  can: (permission: string, itemId: string | null) => boolean;
  canAddContent: (parentId: string | null) => boolean;
};

let userListenerUnsubscribe: () => void = () => {};

const hasPermission = (user: UserProfile | null | undefined, permission: string, itemId: string | null, hierarchy: ItemHierarchy): boolean => {
    if (!user) return false;
    if (user.roles?.some(r => r.role === 'superAdmin')) return true;

    const relevantRoles = user.roles?.filter(r => r.role === 'subAdmin' && r.permissions?.includes(permission)) || [];
    if (relevantRoles.length === 0) return false;

    // Check global scope first
    if (relevantRoles.some(r => r.scope === 'global')) return true;

    // If checking a top-level action (no specific item)
    if (itemId === null) return false;

    // Get the full ancestry path for the item
    const itemPath = hierarchy[itemId] || [];
    const fullItemPath = [...itemPath, itemId];

    for (const role of relevantRoles) {
        if (role.scopeId && fullItemPath.includes(role.scopeId)) {
            return true;
        }
    }
    
    return false;
};

const listenToUserProfile = (studentId: string) => {
    if (userListenerUnsubscribe) userListenerUnsubscribe();
    if (!db) return;

    const userDocRef = doc(db, 'users', studentId);
    userListenerUnsubscribe = onSnapshot(userDocRef, async (doc) => {
        if (doc.exists()) {
            const userProfile = { ...doc.data() } as UserProfile;
            if (userProfile.isBlocked) {
                useAuthStore.getState().logout();
                return;
            }
            
            const isAdmin = await checkSuperAdmin(userProfile.studentId);
            if(isAdmin && (!userProfile.roles || !userProfile.roles.some(r => r.role === 'superAdmin'))) {
                userProfile.roles = [...(userProfile.roles || []), { role: 'superAdmin', scope: 'global' }];
            }

            useAuthStore.setState({
                isAuthenticated: true,
                studentId: userProfile.studentId,
                isSuperAdmin: isAdmin,
                user: userProfile,
            });
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
  itemHierarchy: {},

  buildHierarchy: async () => {
    if (!db) return;
    const hierarchy: ItemHierarchy = {};
    const contentSnapshot = await getDocs(collection(db, 'content'));
    const items = new Map(contentSnapshot.docs.map(d => [d.id, d.data()]));

    for (const [id, item] of items.entries()) {
        const path = [];
        let currentParentId = item.parentId;
        while(currentParentId) {
            path.unshift(currentParentId);
            const parentItem = items.get(currentParentId);
            currentParentId = parentItem?.parentId;
        }
        hierarchy[id] = path;
    }
    set({ itemHierarchy: hierarchy });
  },
  
  checkAuth: async () => {
    if (userListenerUnsubscribe) userListenerUnsubscribe();
    try {
        const storedId = localStorage.getItem(VERIFIED_STUDENT_ID_KEY);
        if (storedId) {
            get().buildHierarchy(); // Build hierarchy on auth check
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
        get().buildHierarchy();
        listenToUserProfile(userProfile.studentId);
        return true;
      } else {
        get().logout();
        return false;
      }
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    }
  },

  logout: () => {
    if (userListenerUnsubscribe) userListenerUnsubscribe();
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
      itemHierarchy: {},
    });
    if (typeof window !== 'undefined') window.location.href = '/';
  },

  can: (permission: string, itemId: string | null): boolean => {
      const { user, itemHierarchy } = get();
      return hasPermission(user, permission, itemId, itemHierarchy);
  },
  
  canAddContent: (parentId: string | null): boolean => {
      const { user, itemHierarchy, can } = get();
      if (!user) return false;
      
      const addPermissions = ['canAddClass', 'canAddFolder', 'canUploadFile', 'canAddLink', 'canCreateFlashcard'];
      
      // An admin with any of the "add" permissions for a folder (or globally) should see the "Add Content" button.
      // The individual items within the menu will be filtered by their specific 'can' check.
      return addPermissions.some(p => can(p, parentId));
  }
}));

export { useAuthStore };
