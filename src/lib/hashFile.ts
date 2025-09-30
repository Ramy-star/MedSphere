'use client';

/**
 * Calculates the SHA-256 hash of a File object.
 * @param file The file to hash.
 * @returns A promise that resolves to the hex-encoded SHA-256 hash string.
 */
export async function sha256file(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buf);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
