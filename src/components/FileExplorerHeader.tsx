'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, ArrowRight, Home, Folder as FolderIcon } from 'lucide-react';

export default function FileExplorerHeader({ currentFolder }: { currentFolder?: { name: string, icon?: string } }) {
  const pathname = usePathname() || '/';
  const segments = pathname.split('/').filter(Boolean);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => window.history.back()} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"><ArrowLeft size={16} /></button>
          <button onClick={() => window.history.forward()} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"><ArrowRight size={16} /></button>

          <nav className="flex items-center gap-2 ml-4 text-sm text-slate-300">
            <Link href="/" className="flex items-center gap-1 hover:text-white">
                <Home size={14}/> 
                <span>Home</span>
            </Link>
            {segments.map((seg, i) => {
              const href = '/' + segments.slice(0, i + 1).join('/');
              const isLast = i === segments.length - 1;
              return (
                <span key={href} className="flex items-center gap-2">
                  <span className="opacity-60">/</span>
                  <Link href={href} className={isLast ? "font-semibold text-white" : "hover:text-white"}>
                    {decodeURIComponent(seg)} 
                  </Link>
                </span>
              );
            })}
          </nav>
        </div>
      </div>

      {currentFolder && (
        <div className="mt-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
            {currentFolder.icon ? <img src={currentFolder.icon} className="w-6 h-6" alt={currentFolder.name} /> : <FolderIcon className="w-5 h-5 text-yellow-400" />}
          </div>
          <div>
            <div className="text-lg font-semibold text-white">{currentFolder.name}</div>
            <div className="text-xs text-slate-400">Folder</div>
          </div>
        </div>
      )}
    </div>
  );
}