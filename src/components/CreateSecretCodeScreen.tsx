'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Loader2, Eye, EyeOff, Save } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

type CreateSecretCodeScreenProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSecretCreated: (secret: string) => void;
};

export function CreateSecretCodeScreen({ open, onOpenChange, onSecretCreated }: CreateSecretCodeScreenProps) {
    const [secretCode, setSecretCode] = useState('');
    const [confirmSecretCode, setConfirmSecretCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [showSecret, setShowSecret] = useState(false);

    const handleCreate = () => {
        if (secretCode.length < 6) {
            setError("Secret code must be at least 6 characters.");
            return;
        }
        if (secretCode !== confirmSecretCode) {
            setError("Secret codes do not match.");
            return;
        }
        
        setError(null);
        onSecretCreated(secretCode);
    };

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[90vw] sm:max-w-md p-0 border-slate-700 rounded-2xl bg-slate-900/70 backdrop-blur-xl shadow-lg text-white">
           <div className="p-6">
                <DialogHeader>
                    <DialogTitle className="text-2xl">Create Your Secret Code</DialogTitle>
                    <DialogDescription>
                        This will be used to log in on other devices. Keep it safe!
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4 my-6">
                    <div className="relative">
                        <Input
                            type={showSecret ? "text" : "password"}
                            placeholder="Create Secret Code (min. 6 characters)"
                            value={secretCode}
                            onChange={(e) => setSecretCode(e.target.value)}
                            className="bg-slate-800/60 border-slate-700 text-white h-12 text-center text-lg tracking-wider rounded-2xl pr-10"
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-slate-400"
                            onClick={() => setShowSecret(!showSecret)}
                        >
                            {showSecret ? <EyeOff size={20} /> : <Eye size={20} />}
                        </Button>
                    </div>
                    <Input
                        type={showSecret ? "text" : "password"}
                        placeholder="Confirm Secret Code"
                        value={confirmSecretCode}
                        onChange={(e) => setConfirmSecretCode(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                        className="bg-slate-800/60 border-slate-700 text-white h-12 text-center text-lg tracking-wider rounded-2xl"
                    />

                    {error && <p className="text-red-400 text-sm">{error}</p>}
                </div>

                <DialogFooter>
                    <Button
                        size="lg"
                        onClick={handleCreate}
                        disabled={!secretCode || !confirmSecretCode}
                        className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg h-12 transition-transform active:scale-95"
                    >
                        <Save className="mr-2 h-5 w-5" />
                        Create & Use Code
                    </Button>
                </DialogFooter>
            </div>
        </DialogContent>
      </Dialog>
    );
}
