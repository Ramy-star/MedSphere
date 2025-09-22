
'use client';
export default function FilePreview({ url, mime, itemName }: { url: string, mime: string, itemName: string }) {
  if (url === '#') {
     return (
        <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
            <p className="text-lg mb-2">Preview not available or file content not found.</p>
            <p className="text-sm">MIME Type: {mime}</p>
             <a href={url} download={itemName} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Download</a>
        </div>
    );
  }
  
  if (mime.startsWith('image/')) {
    return <img src={url} alt={itemName} className="max-w-full h-auto mx-auto rounded-lg" />;
  }
  
  if (mime === 'application/pdf') {
    return <iframe src={url} className="w-full h-full border-0" title={itemName} />;
  }
  
  if (mime.startsWith('audio/')) {
    return <audio controls src={url} className="w-full mt-4" />;
  }
  
  if (mime.startsWith('video/')) {
    return <video controls src={url} className="max-w-full h-auto mx-auto rounded-lg" />;
  }

  if (mime.startsWith('text/')) {
    return <iframe src={url} className="w-full h-full border-2 border-slate-700 rounded-lg bg-slate-800 text-white" title={itemName} />
  }

  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || mime === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
    return <iframe src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`} className="w-full h-full border-0" title={itemName} />
  }
  
  return (
    <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
        <p className="text-lg mb-2">⚠️ Preview not available for this file type.</p>
        <p className="text-sm mb-4">MIME Type: {mime}</p>
        <a href={url} download={itemName} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Download File</a>
    </div>
  );
}
