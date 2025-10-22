'use client';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  folderName: z.string().min(1, { message: 'Name is required.' }),
});

type NewFolderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddFolder: (folderName: string) => void;
  title?: string;
  description?: string;
};

export function NewFolderDialog({ open, onOpenChange, onAddFolder, title = "Add new folder", description }: NewFolderDialogProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      folderName: '',
    },
  });

  useEffect(() => {
    if (open) {
      // Small delay to allow dialog to animate in before focusing
      setTimeout(() => {
        const input = document.getElementById('folderNameInput') as HTMLInputElement | null;
        input?.focus();
        input?.select();
      }, 100);
    } else {
      form.reset();
    }
  }, [open, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await onAddFolder(values.folderName);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[70vw] sm:max-w-[425px] p-0 border-slate-700 rounded-2xl bg-slate-900/70 backdrop-blur-xl shadow-lg text-white">
        <div className="p-6">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
              <FormField
                control={form.control}
                name="folderName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        id="folderNameInput" 
                        placeholder="e.g. 'Lecture Notes'" 
                        {...field} 
                        className="bg-slate-800/60 border-slate-700 focus:ring-blue-500 rounded-xl"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" className="rounded-xl">Create</Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
