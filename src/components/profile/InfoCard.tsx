'use client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Copy, Check, Edit } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export const InfoCard = ({ icon: Icon, label, value, onEdit }: { icon: React.ElementType, label: string, value: string | null, onEdit?: () => void }) => {
    const [isCopied, setIsCopied] = useState(false);
    const { toast } = useToast();

    if (!value) return null;

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(value);
        setIsCopied(true);
        toast({ title: `${label} Copied`});
        setTimeout(() => setIsCopied(false), 2000);
    }
    
    return (
    <div className="glass-card flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl group">
        <div className="p-1.5 sm:p-2 bg-slate-700/50 rounded-lg sm:rounded-xl">
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300" />
        </div>
        <div className="flex-1 overflow-hidden">
            <span className="text-xs sm:text-sm text-slate-400">{label}</span>
            <p className="text-sm sm:text-base font-medium text-white mt-0.5 font-mono break-all">{value}</p>
        </div>
        <div className="flex items-center gap-1">
             <Button
                size="icon"
                variant="ghost"
                onClick={handleCopy}
                className="w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
                {isCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </Button>
            {onEdit && (
                 <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => { e.stopPropagation(); onEdit(); }}
                    className="w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                   <Edit className="w-4 h-4" />
                </Button>
            )}
        </div>
    </div>
)};
