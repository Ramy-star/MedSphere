
'use client';
export default function FilePreview({ url, mime, itemName }: { url: string, mime: string, itemName: string }) {
  if (url === '#') {
     return (
        <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 bg-slate-900/50 rounded-lg">
            <p className="text-lg mb-2">Preview not available or file content not found.</p>
            <p className="text-sm">MIME Type: {mime}</p>
             <a href={url} download={itemName} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Download</a>
        </div>
    );
  }
  
  if (mime.startsWith('image/')) {
    return <div className="w-full h-full flex items-center justify-center bg-slate-900/50 rounded-lg p-2"><img src={url} alt={itemName} className="max-w-full max-h-full object-contain h-auto rounded-lg" /></div>;
  }
  
  if (mime === 'application/pdf') {
    return <iframe src={url} className="w-full h-full border-0 rounded-lg" title={itemName} />;
  }
  
  if (mime.startsWith('audio/')) {
    return <div className="w-full h-full flex items-center justify-center bg-slate-900/50 rounded-lg p-4"><audio controls src={url} className="w-full" /></div>;
  }
  
  if (mime.startsWith('video/')) {
    return <div className="w-full h-full flex items-center justify-center bg-black rounded-lg"><video controls src={url} className="max-w-full max-h-full h-auto" /></div>;
  }

  if (mime.startsWith('text/')) {
    return <iframe src={url} className="w-full h-full border-2 border-slate-700 rounded-lg bg-slate-800 text-white" title={itemName} />
  }

  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || mime === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
    return <iframe src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`} className="w-full h-full border-0 rounded-lg" title={itemName} />
  }
  
  return (
    <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 bg-slate-900/50 rounded-lg">
        <p className="text-lg mb-2">⚠️ Preview not available for this file type.</p>
        <p className="text-sm mb-4">MIME Type: {mime}</p>
        <a href={url} download={itemName} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Download File</a>
    </div>
  );
}
