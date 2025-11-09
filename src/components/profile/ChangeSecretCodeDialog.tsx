'use client';

import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
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
import { useToast } from '@/hooks/use-toast';
import { updateSecretCode } from '@/lib/authService';


type ChangeSecretCodeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
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

export function ChangeSecretCodeDialog({ open, onOpenChange, userId }: ChangeSecretCodeDialogProps) {
    const [secretCode, setSecretCode] = useState('');
    const [confirmSecretCode, setConfirmSecretCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showSecret, setShowSecret] = useState(false);
    const [showConfirmSecret, setShowConfirmSecret] = useState(false);
    const [validation, setValidation] = useState({
        minLength: false,
        uppercase: false,
        lowercase: false,
        number: false,
        special: false,
    });
    const { toast } = useToast();

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
    const codesMatch = secretCode !== '' && secretCode === confirmSecretCode;

    const handleSave = async () => {
        if (!allValidationsMet) {
            setError("Secret code does not meet all requirements.");
            return;
        }
        if (!codesMatch) {
            setError("Secret codes do not match.");
            return;
        }
        
        setError(null);
        setIsSaving(true);
        try {
            await updateSecretCode(userId, secretCode);
            toast({
                title: "Success!",
                description: "Your secret code has been updated.",
            });
            onOpenChange(false);
        } catch (err: any) {
            console.error("Failed to update secret code:", err);
            toast({
                variant: 'destructive',
                title: "Update Failed",
                description: err.message || "An unknown error occurred.",
            });
        } finally {
            setIsSaving(false);
        }
    };
    
    useEffect(() => {
        if (!open) {
            // Reset state when dialog is closed
            setSecretCode('');
            setConfirmSecretCode('');
            setError(null);
            setShowSecret(false);
            setShowConfirmSecret(false);
            setValidation({ minLength: false, uppercase: false, lowercase: false, number: false, special: false });
        }
    }, [open]);

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[90vw] sm:max-w-md p-0 border-slate-700 rounded-2xl bg-slate-900/70 backdrop-blur-xl shadow-lg text-white">
           <div className="p-6">
                <DialogHeader>
                    <DialogTitle className="text-2xl">Change Your Secret Code</DialogTitle>
                    <DialogDescription>
                        Choose a new strong, memorable code. You'll need this to log in on other devices.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4 my-6">
                    <div className="relative">
                        <Input
                            type={showSecret ? "text" : "password"}
                            placeholder="New Secret Code"
                            value={secretCode}
                            onChange={(e) => setSecretCode(e.target.value)}
                            className="bg-slate-800/60 border-slate-700 text-white h-12 text-center text-lg tracking-wider rounded-2xl pr-10"
                            disabled={isSaving}
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
                    <div className="relative">
                        <Input
                            type={showConfirmSecret ? "text" : "password"}
                            placeholder="Confirm Secret Code"
                            value={confirmSecretCode}
                            onChange={(e) => setConfirmSecretCode(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                            className="bg-slate-800/60 border-slate-700 text-white h-12 text-center text-lg tracking-wider rounded-2xl pr-10"
                            disabled={isSaving}
                        />
                         <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-slate-400"
                            onClick={() => setShowConfirmSecret(!showConfirmSecret)}
                        >
                            {showConfirmSecret ? <EyeOff size={20} /> : <Eye size={20} />}
                        </Button>
                        {confirmSecretCode && !codesMatch && (
                            <p className="text-red-400 text-xs text-left mt-1.5 px-2">Codes do not match.</p>
                        )}
                    </div>


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
                        onClick={handleSave}
                        disabled={!allValidationsMet || !codesMatch || isSaving}
                        className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg h-12 transition-transform active:scale-95"
                    >
                        {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                        Save New Code
                    </Button>
                </DialogFooter>
            </div>
        </DialogContent>
      </Dialog>
    );
}
