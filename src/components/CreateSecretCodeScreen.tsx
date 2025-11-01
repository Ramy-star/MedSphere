
'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Loader2, Eye, EyeOff, Save, CheckCircle2, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

type CreateSecretCodeScreenProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSecretCreated: (secret: string) => void;
};

const PasswordRequirement = ({ met, text }: { met: boolean, text: string }) => (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex items-center gap-2 text-sm transition-colors", met ? "text-green-400" : "text-slate-500")}
    >
      {met ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : (
        <XCircle className="h-4 w-4" />
      )}
      <span>{text}</span>
    </motion.div>
);

export function CreateSecretCodeScreen({ open, onOpenChange, onSecretCreated }: CreateSecretCodeScreenProps) {
    const [secretCode, setSecretCode] = useState('');
    const [confirmSecretCode, setConfirmSecretCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [showSecret, setShowSecret] = useState(false);
    const [validation, setValidation] = useState({
        minLength: false,
        uppercase: false,
        lowercase: false,
        number: false,
        special: false,
    });

    useEffect(() => {
        const validate = (code: string) => {
            setValidation({
                minLength: code.length >= 6,
                uppercase: /[A-Z]/.test(code),
                lowercase: /[a-z]/.test(code),
                number: /[0-9]/.test(code),
                special: /[^A-Za-z0-9]/.test(code),
            });
        };
        validate(secretCode);
    }, [secretCode]);

    const allValidationsMet = Object.values(validation).every(Boolean);

    const handleCreate = () => {
        if (!allValidationsMet) {
            setError("Secret code does not meet all requirements.");
            return;
        }
        if (secretCode !== confirmSecretCode) {
            setError("Secret codes do not match.");
            return;
        }
        
        setError(null);
        onSecretCreated(secretCode);
    };
    
    useEffect(() => {
        if (!open) {
            // Reset state when dialog is closed
            setSecretCode('');
            setConfirmSecretCode('');
            setError(null);
            setShowSecret(false);
            setValidation({ minLength: false, uppercase: false, lowercase: false, number: false, special: false });
        }
    }, [open]);

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[90vw] sm:max-w-md p-0 border-slate-700 rounded-2xl bg-slate-900/70 backdrop-blur-xl shadow-lg text-white">
           <div className="p-6">
                <DialogHeader>
                    <DialogTitle className="text-2xl">Create Your Secret Code</DialogTitle>
                    <DialogDescription>
                        This will be used to log in on other devices. Choose a strong, memorable code.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4 my-6">
                    <div className="relative">
                        <Input
                            type={showSecret ? "text" : "password"}
                            placeholder="Create Secret Code"
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
                        type="password"
                        placeholder="Confirm Secret Code"
                        value={confirmSecretCode}
                        onChange={(e) => setConfirmSecretCode(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                        className="bg-slate-800/60 border-slate-700 text-white h-12 text-center text-lg tracking-wider rounded-2xl"
                    />

                    {error && <p className="text-red-400 text-sm">{error}</p>}
                </div>

                <div className="space-y-2 p-4 rounded-lg bg-black/20">
                     <PasswordRequirement met={validation.minLength} text="At least 6 characters" />
                     <PasswordRequirement met={validation.uppercase} text="At least one uppercase letter (A-Z)" />
                     <PasswordRequirement met={validation.lowercase} text="At least one lowercase letter (a-z)" />
                     <PasswordRequirement met={validation.number} text="At least one number (0-9)" />
                     <PasswordRequirement met={validation.special} text="At least one special character (#, *, etc.)" />
                </div>

                <DialogFooter className="mt-6">
                    <Button
                        size="lg"
                        onClick={handleCreate}
                        disabled={!allValidationsMet || secretCode !== confirmSecretCode}
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
