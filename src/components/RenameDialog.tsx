
'use client';

import { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import type { Content } from '@/lib/contentService';

const formSchema = z.object({
  name: z.string().min(1, { message: 'Name is required.' }),
});

type RenameDialogProps = {
  item: Content | null;
  onOpenChange: (open: boolean) => void;
  onRename: (newName: string) => void;
};

export function RenameDialog({ item, onOpenChange, onRename }: RenameDialogProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    if (item) {
      form.reset({ name: item.name });
    }
  }, [item, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    onRename(values.name);
  }

  const open = !!item;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[70vw] sm:max-w-[425px] p-0 border-slate-700 rounded-2xl bg-slate-900/70 backdrop-blur-xl shadow-lg text-white">
        <div className="p-6">
          <DialogHeader>
            <DialogTitle>Rename {item?.type === 'FOLDER' ? 'Folder' : 'File'}</DialogTitle>
            <DialogDescription>
              Enter a new name for "{item?.name}".
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Name</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        className="bg-slate-800/60 border-slate-700 focus:ring-blue-500 rounded-xl"
                        autoFocus
                        onFocus={(e) => e.target.select()}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" className="rounded-xl">Rename</Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
