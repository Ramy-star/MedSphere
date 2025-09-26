// This file is no longer used for file storage but is kept to avoid breaking imports.
// The Cloudinary service now handles file storage.
'use client';

// Placeholder functions
export async function saveFile(id: string, file: File) {
    console.warn("IndexedDB saveFile is deprecated. Using Cloudinary service.");
}

export async function getFile(id: string): Promise<File | undefined> {
    console.warn("IndexedDB getFile is deprecated. Using Cloudinary service.");
    return undefined;
}

export async function deleteFile(id: string) {
    console.warn("IndexedDB deleteFile is deprecated. Using Cloudinary service.");
}
