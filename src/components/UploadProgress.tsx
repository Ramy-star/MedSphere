
'use client';

import { File, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Progress } from './ui/progress';
import { cn } from '@/lib/utils';

export type UploadingFile = {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: 'uploading' | 'success' | 'error';
};

export function UploadProgress({ file }: { file: UploadingFile }) {
    const sizeInKB = file.size / 1024;
    const displaySize = sizeInKB < 1024 
        ? `${sizeInKB.toFixed(1)} KB` 
        : `${(sizeInKB / 1024).toFixed(1)} MB`;

    return (
        <div className={cn("relative group glass-card p-3 rounded-lg flex items-center justify-between w-full transition-all", 
            file.status === 'error' && "bg-red-500/10 border-red-500/30",
            file.status === 'success' && "bg-green-500/10 border-green-500/30"
        )}>
            <div className="flex items-center gap-3 overflow-hidden flex-1">
                <File className="w-6 h-6 text-blue-400 shrink-0" />
                <div className="flex-1 overflow-hidden">
                    <h3 className="text-sm font-medium text-white/90 whitespace-nowrap overflow-hidden text-ellipsis">{file.name}</h3>
                    {file.status === 'uploading' && (
                        <div className="flex items-center gap-2 mt-1">
                            <Progress value={file.progress} className="h-1.5 w-full bg-slate-700" />
                            <span className="text-xs text-slate-400 font-mono w-10 text-right">{Math.round(file.progress)}%</span>
                        </div>
                    )}
                    {file.status === 'error' && (
                        <div className="flex items-center gap-2 mt-1 text-red-400">
                           <AlertTriangle className="w-4 h-4" />
                           <span className="text-xs">Upload failed</span>
                        </div>
                    )}
                     {file.status === 'success' && (
                        <div className="flex items-center gap-2 mt-1 text-green-400">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-xs">Complete</span>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="flex items-center gap-4 shrink-0 ml-4">
                <p className="text-xs text-slate-400 hidden sm:block w-20 text-right">
                    {displaySize}
                </p>
                {/* Cancel button can be added here in the future */}
            </div>
        </div>
    );
}

    