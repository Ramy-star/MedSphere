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
import { useEffect, useMemo, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from 'lucide-react';
import { useCollection } from '@/firebase/firestore/use-collection';
import { Content } from '@/lib/contentService';
import { db } from '@/firebase';
import { collection, doc, runTransaction, addDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/auth-store';


const formSchema = z.object({
  displayName: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  studentId: z.string().regex(/^[0-9]+$/, { message: 'Student ID must be numeric.' }),
  email: z.string().email({ message: 'Please enter a valid email.' }),
  level: z.string().min(1, { message: 'Please select a level.' }),
});

type AddUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

async function logAdminAction(actor: any, action: string, target: any, details?: object) {
    if (!db) return;
    try {
        await addDoc(collection(db, 'auditLogs'), {
            timestamp: new Date().toISOString(),
            actorId: actor.uid,
            actorName: actor.displayName || actor.username,
            action: action,
            targetId: target.uid,
            targetName: target.displayName || target.username,
            details: details || {}
        });
    } catch(error) {
        console.error("Failed to log admin action:", error);
    }
}

export function AddUserDialog({ open, onOpenChange }: AddUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user: currentUser } = useAuthStore();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: '',
      studentId: '',
      email: '',
      level: '',
    },
  });
  
  const { data: levels, loading: loadingLevels } = useCollection<Content>('content', {
      where: ['type', '==', 'LEVEL'],
      orderBy: ['order', 'asc']
  });

  const levelOptions = useMemo(() => {
      if (!levels) return [];
      return levels.map(level => ({ value: level.name, label: level.name }));
  }, [levels]);

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
        // CRITICAL FIX: Use studentId as the document ID, not auto-generated ID
        // This ensures the user can login with their studentId
        const newUserDocRef = doc(db, 'users', values.studentId);

        // Create user profile with all required fields (matching verifyAndCreateUser format)
        const newUser = {
            id: values.studentId,
            uid: values.studentId,
            studentId: values.studentId,
            displayName: values.displayName,
            username: `student_${values.studentId}`,
            email: values.email,
            level: values.level,
            createdAt: new Date().toISOString(),
            roles: [], // Must be an array, not an object
            stats: {
                filesUploaded: 0,
                foldersCreated: 0,
                examsCompleted: 0,
                aiQueries: 0,
                consecutiveLoginDays: 0,
                lastLoginDate: '',
            },
            achievements: [],
            sessions: [],
            favorites: [],
        };

        await runTransaction(db, async (transaction) => {
            // Check if user already exists
            const existingDoc = await transaction.get(newUserDocRef);
            if (existingDoc.exists()) {
                throw new Error('A user with this Student ID already exists.');
            }
            transaction.set(newUserDocRef, newUser);
        });

        if (currentUser) {
            await logAdminAction(currentUser, 'user.create', newUser);
        }

        toast({ title: "User Added", description: `${values.displayName} has been added successfully and can now login.` });
        onOpenChange(false);
    } catch (error: any) {
        console.error('Error adding user:', error);
        toast({
            variant: "destructive",
            title: "Error adding user",
            description: error.message || "An unknown error occurred.",
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] sm:max-w-[425px] p-0 border-slate-700 rounded-2xl bg-slate-900/70 backdrop-blur-xl shadow-lg text-white">
        <div className="p-6">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Enter the details for the new user.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} className="bg-slate-800/60 border-slate-700 focus:ring-blue-500 rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="studentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Student ID</FormLabel>
                    <FormControl>
                      <Input {...field} className="bg-slate-800/60 border-slate-700 focus:ring-blue-500 rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} className="bg-slate-800/60 border-slate-700 focus:ring-blue-500 rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Academic Level</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loadingLevels}>
                      <FormControl>
                        <SelectTrigger className="bg-slate-800/60 border-slate-700 focus:ring-blue-500 rounded-xl">
                          <SelectValue placeholder={loadingLevels ? "Loading levels..." : "Select a level"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {levelOptions.map(option => (
                           <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" className="rounded-xl" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add User
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
