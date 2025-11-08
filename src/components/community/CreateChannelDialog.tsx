'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Users } from 'lucide-react';

interface CreateChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string, description: string) => Promise<void>;
}

export function CreateChannelDialog({ open, onOpenChange, onCreate }: CreateChannelDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setIsCreating(true);
    await onCreate(name, description);
    setIsCreating(false);
    // The parent component is responsible for closing the dialog on success
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
        <div className="grid gap-4 px-6 pb-6">
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
