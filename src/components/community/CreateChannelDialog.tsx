'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Users, Globe, Lock } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';

interface CreateChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string, description: string, type: 'public' | 'private') => Promise<void>;
}

export function CreateChannelDialog({ open, onOpenChange, onCreate }: CreateChannelDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [groupType, setGroupType] = useState<'public' | 'private'>('private');

  const handleCreate = async () => {
    if (!name.trim()) return;
    setIsCreating(true);
    await onCreate(name, description, groupType);
    setIsCreating(false);
  };
  
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
        // Reset state on close
        setName('');
        setDescription('');
        setGroupType('private');
    }
    onOpenChange(isOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="glass-card p-0">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <DialogTitle className="text-xl">Create New Group</DialogTitle>
                <DialogDescription>
                    Start a new discussion group for your colleagues.
                </DialogDescription>
              </div>
          </div>
        </DialogHeader>
        <div className="grid gap-6 px-6 pb-6">
          <div className="grid gap-2">
            <label htmlFor="name" className="text-sm font-medium text-slate-300">Group Name</label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Cardiology Study Group"
              className="bg-slate-800/60 border-slate-700 rounded-xl h-11"
            />
          </div>
          <div className="grid gap-2">
             <label htmlFor="description" className="text-sm font-medium text-slate-300">Description (Optional)</label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this group about?"
              className="bg-slate-800/60 border-slate-700 rounded-xl"
              rows={3}
            />
          </div>
          <div className="grid gap-3">
            <label className="text-sm font-medium text-slate-300">Group Privacy</label>
            <RadioGroup defaultValue="private" value={groupType} onValueChange={(value: 'public' | 'private') => setGroupType(value)}>
                <div className="flex items-start gap-4 rounded-lg border border-slate-700 p-4 transition-colors hover:bg-slate-800/50 has-[[data-state=checked]]:border-blue-500 has-[[data-state=checked]]:bg-blue-900/20">
                    <RadioGroupItem value="public" id="public" />
                    <Label htmlFor="public" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2 font-semibold text-white">
                            <Globe className="w-4 h-4" />
                            Public
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Anyone can find and join this group.</p>
                    </Label>
                </div>
                <div className="flex items-start gap-4 rounded-lg border border-slate-700 p-4 transition-colors hover:bg-slate-800/50 has-[[data-state=checked]]:border-blue-500 has-[[data-state=checked]]:bg-blue-900/20">
                    <RadioGroupItem value="private" id="private" />
                    <Label htmlFor="private" className="flex-1 cursor-pointer">
                         <div className="flex items-center gap-2 font-semibold text-white">
                            <Lock className="w-4 h-4" />
                            Private
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Members must be invited or request to join.</p>
                    </Label>
                </div>
            </RadioGroup>
          </div>
        </div>
        <DialogFooter className="p-6 pt-4 bg-black/20 border-t border-white/10 rounded-b-2xl">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating} className="rounded-xl">
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating || !name.trim()} className="rounded-xl">
            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
