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

const formSchema = z.object({
  name: z.string().min(1, { message: 'Link name is required.' }),
  url: z.string().url({ message: 'Please enter a valid URL.' }),
});

type NewLinkDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddLink: (name: string, url: string) => void;
};

export function NewLinkDialog({ open, onOpenChange, onAddLink }: NewLinkDialogProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      url: '',
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await onAddLink(values.name, values.url);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[70vw] sm:max-w-[425px] p-0 border-slate-700 rounded-2xl bg-slate-900/70 backdrop-blur-xl shadow-lg text-white">
        <div className="p-6">
          <DialogHeader>
            <DialogTitle>Add new link</DialogTitle>
            <DialogDescription>
              Save a URL as a new item in this folder.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. 'Research Paper on AI'" 
                        {...field} 
                        className="bg-slate-800/60 border-slate-700 focus:ring-blue-500 rounded-xl"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://example.com" 
                        {...field} 
                        className="bg-slate-800/60 border-slate-700 focus:ring-blue-500 rounded-xl"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" className="rounded-xl">Create Link</Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

