'use client';
import { useState } from 'react';
import { db } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadUrl, setUploadUrl] = useState('');

  const handleUpload = async () => {
    if (!file) return;

    // 1️⃣ توقيع
    const sigRes = await fetch('/api/sign-cloudinary-params', { method: 'POST' });
    const { timestamp, signature, apiKey, cloudName } = await sigRes.json();

    // 2️⃣ رفع لـ Cloudinary
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
      { method: 'POST', body: formData }
    );
    const data = await uploadRes.json();
    setUploadUrl(data.secure_url);

    // 3️⃣ حفظ الرابط في Firestore
    await addDoc(collection(db, "uploads"), {
      url: data.secure_url,
      createdAt: serverTimestamp()
    });

    alert("✅ تم رفع الملف وحفظ الرابط في Firestore");
  };
console.log('🚀 Cloudinary upload triggered');


  return (
    <div>
      <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <button onClick={handleUpload}>Upload</button>

      {uploadUrl && (
        <p>📎 <a href={uploadUrl} target="_blank">فتح الرابط</a></p>
      )}
    </div>
  );
}
