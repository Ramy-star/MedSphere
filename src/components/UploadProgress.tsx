'use client';

import { File as FileIcon, X, AlertTriangle, CheckCircle2, RotateCw } from 'lucide-react';
import { Progress } from './ui/progress';
import { cn } from '@/lib/utils';
import type { Content } from '@/lib/contentService';
import { Button } from './ui/button';

export type UploadingFile = {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  file: File; // Keep the original file object for retries
  xhr?: XMLHttpRequest;
  isUpdate?: boolean; // Flag to indicate if this is an update
  originalId?: string; // ID of the file being updated
};

export type UploadCallbacks = {
  onProgress: (progress: number) => void;
  onSuccess: (content: Content) => void;
  onError: (error: Error) => void;
};


export function UploadProgress({ file, onRetry, onRemove }: { file: UploadingFile, onRetry: (id: string) => void, onRemove: (id: string) => void }) {
    const sizeInKB = file.size / 1024;
    const displaySize = sizeInKB < 1024 
        ? `${sizeInKB.toFixed(1)} KB` 
        : `${(sizeInKB / 1024).toFixed(1)} MB`;

    const showRemoveButton = file.status === 'uploading' || file.status === 'error';

    return (
        <div className={cn("relative group glass-card p-2 rounded-2xl flex items-center justify-between w-full transition-all mb-1", 
            file.status === 'error' && "bg-red-900/20 border-red-500/30",
            file.status === 'success' && "bg-green-900/20 border-green-500/30"
        )}>
            <div className="flex items-center gap-3 overflow-hidden flex-1">
                <FileIcon className="w-5 h-5 text-blue-400 shrink-0" />
                <div className="flex-1 overflow-hidden">
                    <h3 className="text-sm font-medium text-white/90 whitespace-nowrap overflow-hidden text-ellipsis">{file.name}</h3>
                    {file.status === 'uploading' && (
                        <div className="flex items-center gap-2 mt-1">
                            <Progress value={file.progress} className="h-1 w-full bg-slate-700" />
                            <span className="text-xs text-slate-400 font-ubuntu w-10 text-right">{Math.round(file.progress)}%</span>
                        </div>
                    )}
                    {file.status === 'error' && (
                        <div className="flex items-center gap-2 mt-0.5 text-red-400">
                           <AlertTriangle className="w-3.5 h-3.5" />
                           <span className="text-xs">Upload failed</span>
                        </div>
                    )}
                     {file.status === 'success' && (
                        <div className="flex items-center gap-2 mt-0.5 text-green-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span className="text-xs">Complete</span>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="flex items-center gap-1 shrink-0 ml-2">
                 {file.status === 'error' && !file.isUpdate && (
                    <Button variant="ghost" size="icon" className="w-7 h-7 rounded-full text-slate-300 hover:text-white" onClick={() => onRetry(file.id)} title="Retry">
                        <RotateCw className="w-4 h-4" />
                    </Button>
                )}
                 {showRemoveButton && (
                    <Button variant="ghost" size="icon" className="w-7 h-7 rounded-full text-slate-300 hover:text-red-400" onClick={() => onRemove(file.id)} title="Remove">
                        <X className="w-4 h-4" />
                    </Button>
                 )}
                <p className="text-xs text-slate-400 hidden sm:block w-20 text-right font-ubuntu">
                    {displaySize}
                </p>
            </div>
        </div>
    );
}
