
'use server';

import level1 from './student-ids/level-1.json';
import level2 from './student-ids/level-2.json';
import level3 from './student-ids/level-3.json';
import level4 from './student-ids/level-4.json';
import level5 from './student-ids/level-5.json';
import { db } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

// Combine all student IDs into a single set for efficient lookup
const allStudentIds = new Set([
    ...level1,
    ...level2,
    ...level3,
    ...level4,
    ...level5,
]);


/**
 * Checks if a student ID is present in the predefined lists.
 * This function no longer checks if the ID is claimed.
 * @param id The student ID to verify.
 * @returns True if the ID is in the lists, false otherwise.
 */
export async function isStudentIdValid(id: string): Promise<boolean> {
    const trimmedId = id.trim();
    return allStudentIds.has(trimmedId);
}


/**
 * Checks if a given student ID has already been claimed in Firestore.
 * @param id The student ID to check.
 * @returns A promise that resolves to the UID of the user who claimed the ID, or null if it's not claimed.
 */
export async function getClaimedStudentIdUser(id: string): Promise<string | null> {
    if (!db) {
        console.error("Firestore DB instance is not available for student ID verification.");
        // Fail closed for security.
        return 'error-db-unavailable'; 
    }
    
    try {
        const docRef = doc(db, 'claimedStudentIds', id.trim());
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            return docSnap.data().userId || null;
        }
        return null;

    } catch (error) {
        console.error("Error checking claimed student ID in Firestore:", error);
        // Fail closed for security.
        return 'error-db-check';
    }
}
