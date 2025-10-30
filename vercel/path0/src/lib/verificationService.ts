'use server';

import { db } from '@/firebase';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import level1 from './student-ids/level-1.json';
import level2 from './student-ids/level-2.json';
import level3 from './student-ids/level-3.json';
import level4 from './student-ids/level-4.json';
import level5 from './student-ids/level-5.json';

// Combine all student IDs into a single set for efficient lookup
const allStudentIds = new Set([
    ...level1.map(String),
    ...level2.map(String),
    ...level3.map(String),
    ...level4.map(String),
    ...level5.map(String),
]);

/**
 * Checks if a student ID is valid.
 * It first checks against the predefined static lists, and if not found,
 * it checks the Firestore `users` collection for manually added users.
 * @param id The student ID to verify.
 * @returns True if the ID is valid, false otherwise.
 */
export async function isStudentIdValid(id: string): Promise<boolean> {
    const trimmedId = id.trim();
    if (allStudentIds.has(trimmedId)) {
        return true;
    }
    
    // Fallback to check Firestore if not in static lists
    if (!db) {
        console.error("Firestore not initialized for ID validation fallback.");
        return false;
    }
    
    try {
        const userDocRef = doc(db, 'users', trimmedId);
        const userDoc = await getDoc(userDocRef);
        return userDoc.exists();
    } catch (error) {
        console.error("Error checking Firestore for student ID:", error);
        return false; // Fail safely if DB check fails
    }
}

/**
 * Checks if a student ID has already been claimed by a user.
 * @param studentId The student ID to check.
 * @returns The UID of the user who claimed it, or null if not claimed.
 */
export async function getClaimedStudentIdUser(studentId: string): Promise<string | null> {
    if (!db) return null;
    const docRef = doc(db, 'claimedStudentIds', studentId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data().userId || null;
    }
    return null;
}
