
'use client';
export default function FilePreview({ url, mime }: { url: string, mime: string }) {
  if (mime.startsWith('image/')) return <img src={url} alt="preview" className="max-w-full mx-auto rounded-lg" />;
  if (mime === 'application/pdf' && url !== '#') return <iframe src={url} className="w-full h-full" />;
  if (mime.startsWith('audio/')) return <audio controls src={url} className="w-full" />;
  if (mime.startsWith('video/')) return <video controls src={url} className="max-w-full mx-auto rounded-lg" />;
  
  return (
    <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
        <p className="text-lg mb-2">Preview not available for this file type.</p>
        <p className="text-sm">MIME Type: {mime}</p>
        <a href={url} download className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Download</a>
    </div>
    );
}
