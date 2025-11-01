
'use client';
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, AlertCircle, LogOut, X, Clock, FileText, SkipForward, Crown, Shield, User as UserIcon, PlusCircle, Trash2, Edit, Check, ChevronDown, ArrowDown } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, LabelList } from 'recharts';
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as SelectPrimitive from "@radix-ui/react-select";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import type { Lecture, ExamResult, MCQ } from '@/lib/types';
import { addDocumentNonBlocking } from '@/firebase/firestore/non-blocking-updates';
import { useFirebase } from '@/firebase/provider';
import { useAuthStore } from '@/stores/auth-store';
import { contentService } from '@/lib/contentService';
import { updateDoc, collection, doc, query, where, getDocs, CollectionReference, DocumentData, Query } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Textarea } from './ui/textarea';
import { cn } from '@/lib/utils';
import { useCollection } from '@/firebase/firestore/use-collection';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';


// === Types ===
type ExamResultWithId = ExamResult & { id: string };

// --- HELPER COMPONENTS (from ShadCN UI) ---

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants> & { asChild?: boolean }>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  );
});
Button.displayName = "Button";

const AlertDialog = AlertDialogPrimitive.Root;
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
const AlertDialogPortal = AlertDialogPrimitive.Portal;

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
    ref={ref}
  />
));
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName;

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    />
  </AlertDialogPortal>
));
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName;

const AlertDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
    {...props}
  />
);
AlertDialogHeader.displayName = "AlertDialogHeader";

const AlertDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-center sm:space-x-2", className)}
    {...props}
  />
);
AlertDialogFooter.displayName = "AlertDialogFooter";

const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold", className)}
    {...props}
  />
));
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName;

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
AlertDialogDescription.displayName = AlertDialogPrimitive.Description.displayName;

const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action
    ref={ref}
    className={cn(buttonVariants(), className)}
    {...props}
  />
));
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName;

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(
      buttonVariants({ variant: "outline" }),
      "mt-2 sm:mt-0",
      className
    )}
    {...props}
  />
));
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName;


const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

// --- Dialog Components ---
const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogOverlay = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Overlay>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>>(({ className, ...props }, ref) => (<DialogPrimitive.Overlay ref={ref} className={cn("fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className)} {...props} />));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;
const DialogContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>>(({ className, children, ...props }, ref) => (<DialogPortal><DialogOverlay /><DialogPrimitive.Content ref={ref} className={cn("fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg", className)} {...props}>{children}<DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"><X className="h-4 w-4" /><span className="sr-only">Close</span></DialogPrimitive.Close></DialogPrimitive.Content></DialogPortal>));
DialogContent.displayName = DialogPrimitive.Content.displayName;
const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (<div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />);
DialogHeader.displayName = "DialogHeader";
const DialogTitle = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Title>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>>(({ className, ...props }, ref) => (<DialogPrimitive.Title ref={ref} className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />));
DialogTitle.displayName = DialogPrimitive.Title.displayName;
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(({ className, type, ...props }, ref) => {
    return (<input type={type} className={cn("flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm", className)} ref={ref} {...props} />);
});
Input.displayName = "Input";
// --- Select Components ---
const Select = SelectPrimitive.Root;
const SelectValue = SelectPrimitive.Value;
const SelectTrigger = React.forwardRef<React.ElementRef<typeof SelectPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>>(({ className, children, ...props }, ref) => (<SelectPrimitive.Trigger ref={ref} className={cn("flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1", className)} {...props}>{children}<SelectPrimitive.Icon asChild><ChevronDown className="h-4 w-4 opacity-50" /></SelectPrimitive.Icon></SelectPrimitive.Trigger>));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;
const SelectContent = React.forwardRef<React.ElementRef<typeof SelectPrimitive.Content>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>>(({ className, children, position = "popper", ...props }, ref) => (<SelectPrimitive.Portal><SelectPrimitive.Content ref={ref} className={cn("relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1", position === "popper" && "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]", className)} position={position} {...props}><SelectPrimitive.Viewport className={cn("p-1", position === "popper" && "")}>{children}</SelectPrimitive.Viewport></SelectPrimitive.Content></SelectPrimitive.Portal>));
SelectContent.displayName = SelectPrimitive.Content.displayName;
const SelectItem = React.forwardRef<React.ElementRef<typeof SelectPrimitive.Item>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>>(({ className, children, ...props }, ref) => (<SelectPrimitive.Item ref={ref} className={cn("relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className)} {...props}><span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center"><SelectPrimitive.ItemIndicator><Check className="h-4 w-4" /></SelectPrimitive.ItemIndicator></span><SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText></SelectPrimitive.Item>));
SelectItem.displayName = SelectPrimitive.Item.displayName;

// --- CHART COMPONENTS ---

const PerformanceChart = ({ correct, incorrect, unanswered }: { correct: number, incorrect: number, unanswered: number }) => {
    const data = [
        { name: 'Correct', value: correct, color: '#10b981' },
        { name: 'Incorrect', value: incorrect, color: '#ef4444' },
        { name: 'Unanswered', value: unanswered, color: '#f59e0b' },
    ].filter(item => item.value > 0);

    const RADIAN = Math.PI / 180;
    const renderCustomizedLabel = (props: any) => {
        const { cx, cy, midAngle, outerRadius, percent, name } = props;
        const radius = outerRadius * 1.35; 
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        const textAnchor = x > cx ? 'start' : 'end';
        const labelX = x + (x > cx ? 3 : -3);

        if (percent === 0) return null;

        return (
            <text x={labelX} y={y} textAnchor={textAnchor} dominantBaseline="central" className="text-xs font-medium fill-foreground">
                {`${name} (${(percent * 100).toFixed(0)}%)`}
            </text>
        );
    };

    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 20, right: 50, left: 50, bottom: 20 }}>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine
                    label={renderCustomizedLabel}
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                </Pie>
            </PieChart>
        </ResponsiveContainer>
    );
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-background border border-border p-2 rounded-lg shadow-lg text-sm">
                <p className="font-bold">{`Score Range: ${label}`}</p>
                <p className="text-muted-foreground">{`Students: ${payload[0].value}`}</p>
            </div>
        );
    }
    return null;
};

const YouIndicator = (props: any) => {
    const { x, y, width, value } = props;
    if (value !== true) return null;
    
    const indicatorX = x + width / 2;
    const indicatorY = y - 10;

    return (
        <g transform={`translate(${indicatorX},${indicatorY})`}>
            <ArrowDown y={-10} size={16} className="text-primary" />
            <text y={-25} textAnchor="middle" className="fill-primary font-bold text-sm">
                You
            </text>
        </g>
    );
};

const ResultsDistributionChart = ({ results, userFirstResult, currentPercentage }: { results: (ExamResult & { id: string })[], userFirstResult: (ExamResult & { id: string }) | null, currentPercentage: number }) => {
    
    const { data, userBinIndex } = useMemo(() => {
        const bins = Array.from({ length: 20 }, (_, i) => ({
            name: `${i * 5}-${i * 5 + 4}%`,
            count: 0,
            isCurrentUser: false,
        }));
        bins.push({ name: '100%', count: 0, isCurrentUser: false });

        results.forEach(result => {
            const percentage = result.percentage;
            if (percentage === 100) {
                bins[20].count++;
            } else if (percentage >= 0) {
                const binIndex = Math.floor(percentage / 5);
                if(bins[binIndex]) bins[binIndex].count++;
            }
        });
        
        let localUserBinIndex = -1;
        const percentageToMark = userFirstResult ? userFirstResult.percentage : currentPercentage;

        if (percentageToMark !== null && percentageToMark !== undefined) {
             if (percentageToMark === 100) {
                localUserBinIndex = 20;
            } else if (percentageToMark >= 0) {
                localUserBinIndex = Math.floor(percentageToMark / 5);
            }
        }

        if (localUserBinIndex !== -1 && bins[localUserBinIndex]) {
            bins[localUserBinIndex].isCurrentUser = true;
        }
        
        return { data: bins, userBinIndex: localUserBinIndex };
    }, [results, userFirstResult, currentPercentage]);
    
    if (results.length === 0 && currentPercentage === null) {
        return <p className="text-center text-muted-foreground">Be the first to set the benchmark!</p>
    }
    
    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 40, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} interval={1} tick={{fontSize: 10}} />
                <YAxis allowDecimals={false} label={{ value: 'Students', angle: -90, position: 'insideLeft' }} />
                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--primary) / 0.1)' }} />
                                
                <Bar dataKey="count" name="Number of Students">
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === userBinIndex ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.3)"} />
                    ))}
                    <LabelList dataKey="isCurrentUser" content={<YouIndicator />} />
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}

// --- MAIN EXAM COMPONENT LOGIC ---

const UpsertMcqFormContent = ({
    lectures,
    activeLectureId,
    onUpsert,
    closeDialog,
    mcqToEdit,
}: {
    lectures: Lecture[];
    activeLectureId?: string;
    onUpsert: (lectureId: string, newLectureName: string, mcq: MCQ, level: 1 | 2, originalMcq?: MCQ) => void;
    closeDialog: () => void;
    mcqToEdit: { mcq: MCQ, level: 1 | 2 } | null;
}) => {
    const isEditing = !!mcqToEdit;

    const getInitialLectureId = () => {
        if (isEditing) {
            const parentLecture = lectures.find(l => 
                (l.mcqs_level_1 || []).some(mcq => mcq.q === mcqToEdit.mcq.q) ||
                (l.mcqs_level_2 || []).some(mcq => mcq.q === mcqToEdit.mcq.q)
            );
            return parentLecture?.id || 'new';
        }
        return activeLectureId || lectures[0]?.id || 'new';
    };
    
    const [lectureId, setLectureId] = useState<string>(getInitialLectureId);
    const [newLectureName, setNewLectureName] = useState('');
    const [question, setQuestion] = useState(isEditing ? mcqToEdit.mcq.q : '');
    const [options, setOptions] = useState<string[]>(isEditing ? mcqToEdit.mcq.o : ['', '', '', '', '']);
    const [answer, setAnswer] = useState(isEditing ? mcqToEdit.mcq.a : '');
    const [level, setLevel] = useState<1 | 2>(isEditing ? mcqToEdit.level : 1);

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedQuestion = question.trim();
        const trimmedOptions = options.map(o => o.trim()).filter(Boolean);
        const trimmedAnswer = answer.trim();

        if (lectureId === 'new' && !newLectureName.trim()) {
            alert("Please provide a name for the new lecture.");
            return;
        }
        if (!trimmedQuestion || trimmedOptions.length < 2 || !trimmedAnswer) {
            alert("Please fill out the question, at least two options, and the answer.");
            return;
        }
        if (!trimmedOptions.includes(trimmedAnswer)) {
            alert("The correct answer must be one of the provided options.");
            return;
        }

        const newMcq: MCQ = { q: trimmedQuestion, o: trimmedOptions, a: trimmedAnswer };
        onUpsert(lectureId, newLectureName, newMcq, level, mcqToEdit?.mcq);
        closeDialog();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto p-1 pr-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">Lecture</label>
                <Select value={lectureId} onValueChange={setLectureId}>
                    <SelectTrigger><SelectValue placeholder="Select a lecture" /></SelectTrigger>
                    <SelectContent>
                        {lectures.map(lec => (<SelectItem key={lec.id} value={lec.id}>{lec.name}</SelectItem>))}
                        <SelectItem value="new">Create a new lecture...</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {lectureId === 'new' && (
                <div className="space-y-2">
                    <label className="text-sm font-medium">New Lecture Name</label>
                    <Input value={newLectureName} onChange={(e) => setNewLectureName(e.target.value)} placeholder="e.g., L6 Cardiology" required />
                </div>
            )}
            
             <div className="space-y-2">
                <label className="text-sm font-medium">Question Level</label>
                <Select value={String(level)} onValueChange={(v) => setLevel(Number(v) as 1 | 2)}>
                    <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                    <SelectContent>
                       <SelectItem value="1">Level 1</SelectItem>
                       <SelectItem value="2">Level 2</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Question</label>
                <Textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g., What is the primary function of the mitochondria?" required />
            </div>

            <div className="space-y-3">
                <label className="text-sm font-medium">Options</label>
                {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="flex items-center gap-2">
                       <span className="font-semibold text-gray-500">{String.fromCharCode(65 + index)}</span>
                        <Input value={options[index] || ''} onChange={(e) => handleOptionChange(index, e.target.value)} placeholder={`Option ${String.fromCharCode(65 + index)}`} />
                    </div>
                ))}
            </div>

             <div className="space-y-2">
                <label className="text-sm font-medium">Correct Answer</label>
                <Input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Copy-paste the exact text of the correct option" required />
            </div>
            
            <div className="flex justify-end pt-4">
                <Button type="submit">{isEditing ? 'Save Changes' : 'Add Question'}</Button>
            </div>
        </form>
    );
};

const UpsertMcqDialog = ({
    isOpen,
    onClose,
    lectures,
    activeLectureId,
    onUpsert,
    mcqToEdit,
}: {
    isOpen: boolean;
    onClose: () => void;
    lectures: Lecture[];
    activeLectureId?: string;
    onUpsert: (lectureId: string, newLectureName: string, mcq: MCQ, level: 1 | 2, originalMcq?: MCQ) => void;
    mcqToEdit: { mcq: MCQ, level: 1 | 2 } | null;
}) => {
    const isEditing = !!mcqToEdit;
    const formKey = useMemo(() => mcqToEdit?.mcq.q || `new-${Date.now()}`, [mcqToEdit]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[625px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit Question' : 'Create a New Question'}</DialogTitle>
                </DialogHeader>
                <UpsertMcqFormContent
                    key={formKey}
                    lectures={lectures}
                    activeLectureId={activeLectureId}
                    onUpsert={onUpsert}
                    closeDialog={onClose}
                    mcqToEdit={mcqToEdit}
                />
            </DialogContent>
        </Dialog>
    );
};

const FullLectureEditorDialog = ({
    isOpen,
    onClose,
    lecture,
    onDeleteMcq,
    onOpenUpsertDialog,
    onLectureNameSave,
} : {
    isOpen: boolean;
    onClose: () => void;
    lecture: Lecture;
    onDeleteMcq: (mcqToDelete: MCQ, level: 1 | 2) => void;
    onOpenUpsertDialog: (mcq: MCQ, level: 1 | 2) => void;
    onLectureNameSave: (newName: string) => void;
}) => {
    const [lectureName, setLectureName] = useState(lecture.name);

    useEffect(() => {
        setLectureName(lecture.name);
    }, [lecture]);

    const handleSave = () => {
        if (lectureName.trim() && lectureName.trim() !== lecture.name) {
            onLectureNameSave(lectureName.trim());
        }
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Edit Lecture</DialogTitle>
                </DialogHeader>
                <div className="space-y-2 mb-4">
                    <label className="text-sm font-medium">Lecture Name</label>
                    <Input value={lectureName} onChange={(e) => setLectureName(e.target.value)} />
                </div>
                <div className="flex-grow overflow-y-auto space-y-4 pr-2 -mr-2">
                    <h3 className="font-semibold text-lg">Questions</h3>
                    {(lecture.mcqs_level_1 || []).map((mcq, index) => (
                        <div key={`l1-${index}`} className="flex items-center justify-between p-2 rounded-md bg-secondary">
                            <p className="text-sm truncate flex-1 pr-4">{mcq.q}</p>
                            <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenUpsertDialog(mcq, 1)}><Edit size={14}/></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDeleteMcq(mcq, 1)}><Trash2 size={14}/></Button>
                            </div>
                        </div>
                    ))}
                     {(lecture.mcqs_level_2 || []).map((mcq, index) => (
                        <div key={`l2-${index}`} className="flex items-center justify-between p-2 rounded-md bg-secondary">
                            <p className="text-sm truncate flex-1 pr-4">{mcq.q}</p>
                            <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenUpsertDialog(mcq, 2)}><Edit size={14}/></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDeleteMcq(mcq, 2)}><Trash2 size={14}/></Button>
                            </div>
                        </div>
                    ))}
                    {(!lecture.mcqs_level_1 || lecture.mcqs_level_1.length === 0) && (!lecture.mcqs_level_2 || lecture.mcqs_level_2.length === 0) && (
                        <p className="text-sm text-muted-foreground text-center py-4">No questions in this lecture yet.</p>
                    )}
                </div>
                <div className="flex justify-end pt-4 border-t mt-4">
                    <Button onClick={handleSave}>Save & Close</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};


const ExamMode = ({
    fileItemId,
    lectures: initialLectures,
    activeLecture,
    onExit,
    onSwitchLecture,
    onLecturesUpdate,
    allLectures,
    onStateChange
}: {
    fileItemId: string | null;
    lectures: Lecture[];
    activeLecture: Lecture;
    onExit: () => void;
    onSwitchLecture: (lectureId: string) => void;
    onLecturesUpdate: (updatedLectures: Lecture[]) => void;
    allLectures: Lecture[];
    onStateChange?: (inProgress: boolean) => void;
}) => {
    const [examState, setExamState] = useState<'not-started' | 'in-progress' | 'finished'>('not-started');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<(string | null)[]>([]);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isExitAlertOpen, setIsExitAlertOpen] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const [showResumeAlert, setShowResumeAlert] = useState(false);
    const [questionAnimation, setQuestionAnimation] = useState('');
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isUpsertMcqDialogOpen, setIsUpsertMcqDialogOpen] = useState(false);
    const [mcqToEdit, setMcqToEdit] = useState<{ mcq: MCQ, level: 1 | 2 } | null>(null);
    const [isFullLectureEditorOpen, setIsFullLectureEditorOpen] = useState(false);
    const isInitialRender = useRef(true);

    const { studentId, user, can, awardSpecialAchievement, checkAndAwardAchievements } = useAuthStore();
    const canAdminister = can('canAdministerExams', fileItemId);
    const { db: firestore } = useFirebase();
    
    const resultsCollectionRef = useMemo((): CollectionReference<DocumentData> | undefined => {
        return firestore ? collection(firestore, "examResults") : undefined;
    }, [firestore]);

    const examResultsQuery = useMemo((): Query<DocumentData> | undefined => {
        return resultsCollectionRef ? query(resultsCollectionRef, where("lectureId", "==", activeLecture.id)) : undefined;
    }, [resultsCollectionRef, activeLecture.id]);

    const { data: allResults } = useCollection<ExamResultWithId>(examResultsQuery as any, { disabled: !examResultsQuery });

    const questions = useMemo(() => {
        const l1 = Array.isArray(activeLecture?.mcqs_level_1) ? activeLecture.mcqs_level_1 : [];
        const l2 = Array.isArray(activeLecture?.mcqs_level_2) ? activeLecture.mcqs_level_2 : [];
        return [...l1, ...l2] as MCQ[];
    }, [activeLecture]);

    useEffect(() => {
        if (onStateChange) {
            const isInProgress = examState === 'in-progress' || examState === 'not-started';
            onStateChange(isInProgress);
        }
    }, [examState, onStateChange]);

    const { score, incorrect, unanswered, percentage } = useMemo(() => {
        let score = 0;
        let incorrect = 0;
        let unanswered = 0;

        for (let i = 0; i < questions.length; i++) {
            if (userAnswers[i] === null || userAnswers[i] === undefined) {
                unanswered++;
            } else if (questions[i] && userAnswers[i] === questions[i].a) {
                score++;
            } else {
                incorrect++;
            }
        }
        const percentage = questions.length > 0 ? (score / questions.length) * 100 : 0;
        return { score, incorrect, unanswered, percentage };
    }, [questions, userAnswers]);

    const userFirstResult = useMemo(() => {
        if (!studentId || !allResults) return null;
        const userResults = allResults.filter(r => r.userId === studentId);
        if (userResults.length === 0) return null;
        userResults.sort((a, b) => {
            const aTs: any = (a as any).timestamp;
            const bTs: any = (b as any).timestamp;
            const aDate = aTs && typeof aTs.toDate === 'function' ? aTs.toDate() : new Date(aTs);
            const bDate = bTs && typeof bTs.toDate === 'function' ? bTs.toDate() : new Date(bTs);
            return aDate.getTime() - bDate.getTime();
        });
        return userResults[0];
    }, [allResults, studentId]);

    const storageKey = useMemo(() => studentId ? `exam_progress_${activeLecture.id}_${studentId}` : null, [activeLecture.id, studentId]);

    const handleSubmit = useCallback(async (isSkip = false) => {
        const hour = new Date().getHours();
        if (hour >= 0 && hour < 4) {
            awardSpecialAchievement('NIGHT_OWL');
        }

        const userHasAlreadySubmitted = !!userFirstResult;
        if (studentId && resultsCollectionRef && !isSkip && !userHasAlreadySubmitted) {
            try {
                 const result: Omit<ExamResult, 'id'> = {
                    lectureId: activeLecture.id,
                    score,
                    totalQuestions: questions.length,
                    percentage,
                    userId: studentId,
                    timestamp: new Date(),
                };
                await addDocumentNonBlocking(resultsCollectionRef, result);
                if (user) {
                  const userRef = doc(firestore, 'users', user.id);
                  const newStats = { ...user.stats };
                  newStats.examsCompleted = (newStats.examsCompleted || 0) + 1;
                  await updateDoc(userRef, { stats: newStats });
                  checkAndAwardAchievements();
                }

            } catch (e) {
                console.error("Error submitting exam results:", e)
            }
        }
        
        if (storageKey) {
            try {
                localStorage.removeItem(storageKey);
            } catch (error) {
                console.error("Could not clear localStorage:", error);
            }
        }
        triggerAnimation('finished');
    }, [storageKey, activeLecture.id, questions.length, studentId, resultsCollectionRef, score, percentage, awardSpecialAchievement, userFirstResult, user, firestore, checkAndAwardAchievements]);


    useEffect(() => {
        if (isInitialRender.current || !storageKey) {
            isInitialRender.current = false;
            return;
        }
        
        try {
            const savedProgress = localStorage.getItem(storageKey);
            if (savedProgress) {
                setShowResumeAlert(true);
            } else {
                setExamState('not-started');
                setCurrentQuestionIndex(0);
                setUserAnswers(Array(questions.length).fill(null));
                setTimeLeft(0);
            }
        } catch (error) {
            console.error("Could not access localStorage:", error);
        }
    }, [storageKey, questions.length, activeLecture.id]);

    useEffect(() => {
        if (examState === 'in-progress' && storageKey) {
            try {
                const progress = {
                    currentQuestionIndex,
                    userAnswers,
                    timeLeft,
                };
                localStorage.setItem(storageKey, JSON.stringify(progress));
            } catch (error) {
                console.error("Could not save to localStorage:", error);
            }
        }
    }, [currentQuestionIndex, userAnswers, timeLeft, examState, storageKey]);

    const startTimer = useCallback(() => {
        const totalTime = questions.length * 30; // 30 seconds per question
        setTimeLeft(totalTime);
        const timer = setInterval(() => {
            setTimeLeft(prevTime => {
                if (prevTime <= 1) {
                    clearInterval(timer);
                    handleSubmit(false);
                    return 0;
                }
                return prevTime - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [questions.length, handleSubmit]);

    useEffect(() => {
        let timerCleanup = () => {};
        if (examState === 'in-progress') {
            if (timeLeft > 0) { // Resume timer
                const timer = setInterval(() => {
                    setTimeLeft(prevTime => {
                        if (prevTime <= 1) {
                            clearInterval(timer);
                            handleSubmit(false);
                            return 0;
                        }
                        return prevTime - 1;
                    });
                }, 1000);
                timerCleanup = () => clearInterval(timer);
            } else { // Start new timer
                timerCleanup = startTimer();
            }
        }
        return timerCleanup;
    }, [examState, timeLeft, startTimer, handleSubmit]);

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    };

    const handleAnimationEnd = (nextState: 'not-started' | 'in-progress' | 'finished') => {
        setExamState(nextState);
        setIsAnimating(false);
    };
    
    const triggerAnimation = (nextState: 'not-started' | 'in-progress' | 'finished') => {
        setIsAnimating(true);
        setTimeout(() => handleAnimationEnd(nextState), 300); // Match animation duration
    };

    const handleStartExam = (resume = false) => {
        setShowResumeAlert(false);
        if (resume && storageKey) {
            try {
                const savedProgress = localStorage.getItem(storageKey);
                if (savedProgress) {
                    const { currentQuestionIndex, userAnswers, timeLeft } = JSON.parse(savedProgress);
                    setCurrentQuestionIndex(currentQuestionIndex);
                    setUserAnswers(userAnswers);
                    setTimeLeft(timeLeft);
                    triggerAnimation('in-progress');
                }
            } catch (error) {
                console.error("Could not load from localStorage:", error);
                startNewExam();
            }
        } else {
            startNewExam();
        }
    };
    
    const startNewExam = () => {
        if (storageKey) {
            try {
                localStorage.removeItem(storageKey);
            } catch (error) {
                console.error("Could not clear localStorage:", error);
            }
        }
        setCurrentQuestionIndex(0);
        setUserAnswers(Array(questions.length).fill(null));
        setTimeLeft(0);
        triggerAnimation('in-progress');
    };

    const handleSelectOption = (option: string) => {
        const newAnswers = [...userAnswers];
        newAnswers[currentQuestionIndex] = option;
        setUserAnswers(newAnswers);
    };

    const triggerQuestionAnimation = (callback: () => void) => {
        setQuestionAnimation('question-fade-out');
        setTimeout(() => {
            callback();
            setQuestionAnimation('question-fade-in');
        }, 300); // Duration of fade-out animation
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            triggerQuestionAnimation(() => setCurrentQuestionIndex(prev => prev + 1));
        }
    };

    const handlePrevious = () => {
        if (currentQuestionIndex > 0) {
            triggerQuestionAnimation(() => setCurrentQuestionIndex(prev => prev - 1));
        }
    };
    
    const handleExitClick = () => {
        triggerAnimation('not-started');
        onExit();
    };

    const handleQuickExit = () => {
        setIsExitAlertOpen(true);
    };

    // Admin functions
    const handleUpsertMcq = (lectureId: string, newLectureName: string, mcqData: MCQ, level: 1 | 2, originalMcq?: MCQ) => {
        let updatedLectures = [...initialLectures];
        let targetLectureId = lectureId;
        let newLectureCreated = false;

        if (lectureId === 'new') {
            if (!newLectureName.trim()) return;
            const newLec: Lecture = {
                id: `l${Date.now()}`,
                name: newLectureName.trim(),
                mcqs_level_1: [], mcqs_level_2: []
            };
            updatedLectures.push(newLec);
            targetLectureId = newLec.id;
            newLectureCreated = true;
        }

        const lectureIndex = updatedLectures.findIndex(l => l.id === targetLectureId);
        if (lectureIndex === -1) return;

        const lectureToUpdate = {...updatedLectures[lectureIndex]};
        const key: 'mcqs_level_1' | 'mcqs_level_2' = `mcqs_level_${level}`;
        let mcqs = [...(lectureToUpdate[key] || [])];

        if (originalMcq) {
            const mcqIndex = mcqs.findIndex(m => m.q === originalMcq.q);
            if (mcqIndex > -1) mcqs[mcqIndex] = mcqData;
        } else {
            mcqs.push(mcqData);
        }
        lectureToUpdate[key] = mcqs;
        updatedLectures[lectureIndex] = lectureToUpdate;

        onLecturesUpdate(updatedLectures);
        if (newLectureCreated) {
            setTimeout(() => onSwitchLecture(targetLectureId), 0);
        }
    };

    const handleDeleteMcq = (mcqToDelete: MCQ, level: 1 | 2) => {
        const key: 'mcqs_level_1' | 'mcqs_level_2' = `mcqs_level_${level}`;
        const updatedLectures = initialLectures.map(l => {
            if (l.id === activeLecture.id) {
                return {...l, [key]: (l[key] || []).filter(mcq => mcq.q !== mcqToDelete.q)}
            }
            return l;
        });
        onLecturesUpdate(updatedLectures);
    };

    const handleEditLectureSave = (newName: string) => {
        const updatedLectures = initialLectures.map(l => l.id === activeLecture.id ? {...l, name: newName} : l);
        onLecturesUpdate(updatedLectures);
    };
    
    const handleDeleteLecture = () => {
        const updatedLectures = initialLectures.filter(l => l.id !== activeLecture.id);
        onLecturesUpdate(updatedLectures);
        onSwitchLecture(updatedLectures[0]?.id || '');
    };
    
    const containerClasses = `exam-container ${isAnimating ? 'animating-out' : 'animating-in'}`;

    if (questions.length === 0 && examState === 'not-started' && !canAdminister) {
        return <div className="exam-container"><p>No multiple-choice questions available for this lecture.</p></div>;
    }
    
    return (
        <div className='text-black bg-[#f5f7fa] font-["Segoe_UI"] text-[17px] w-full h-full exam-theme-wrapper'>
            <style>{`
                .exam-theme-wrapper {
                    --background: 220 24% 95%; /* light gray-blue */
                    --foreground: 222.2 84% 4.9%; /* very dark blue, almost black */
                    --card: 210 40% 98%; /* very light gray-blue, almost white */
                    --popover: 210 40% 98%;
                    --primary: 224 76% 48%; /* blue */
                    --primary-foreground: 210 40% 98%;
                    --secondary: 210 40% 96.1%; /* light gray */
                    --secondary-foreground: 217 91% 20%;
                    --muted: 210 40% 96.1%;
                    --muted-foreground: 215.4 16.3% 46.9%; /* gray */
                    --accent: 243 77% 59%; /* purple-blue */
                    --accent-foreground: 210 40% 98%;
                    --destructive: 0 84.2% 60.2%; /* red */
                    --destructive-foreground: 210 40% 98%;
                    --border: 214.3 31.8% 91.4%; /* light gray */
                    --input: 214.3 31.8% 91.4%;
                    --ring: 224 76% 48%;
                }
                .exam-theme-wrapper > div { color: hsl(var(--foreground)); }
            `}</style>
            <AlertDialog open={isExitAlertOpen} onOpenChange={setIsExitAlertOpen}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to exit?</AlertDialogTitle>
                        <AlertDialogDescription>
                           Your progress will be saved. You can resume next time.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="justify-center sm:justify-center">
                        <AlertDialogCancel className="rounded-2xl border-border bg-background hover:bg-gray-100 text-foreground hover:text-foreground focus:ring-0 focus-visible:ring-0 focus:ring-offset-0">Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive hover:bg-destructive/90 rounded-2xl" onClick={handleExitClick}>Exit</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={showResumeAlert} onOpenChange={setShowResumeAlert}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Welcome Back!</AlertDialogTitle>
                        <AlertDialogDescription>
                            We found an incomplete exam. Would you like to resume where you left off or start a new exam?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="justify-center sm:justify-center">
                         <AlertDialogCancel 
                            className="rounded-2xl border-border bg-background hover:bg-gray-100 text-foreground hover:text-foreground focus:ring-0 focus-visible:ring-0 focus:ring-offset-0" 
                            onClick={() => handleStartExam(false)}>
                            Start New
                        </AlertDialogCancel>
                        <AlertDialogAction 
                            className="rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-0 focus-visible:ring-0 focus:ring-offset-0" 
                            onClick={() => handleStartExam(true)}>
                            Resume Exam
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AdminReportModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                lectureId={activeLecture.id}
            />
            
            <UpsertMcqDialog
                isOpen={isUpsertMcqDialogOpen}
                onClose={() => {setIsUpsertMcqDialogOpen(false); setMcqToEdit(null);}}
                lectures={initialLectures}
                activeLectureId={activeLecture.id}
                onUpsert={handleUpsertMcq}
                mcqToEdit={mcqToEdit}
            />

            {activeLecture && <FullLectureEditorDialog 
                isOpen={isFullLectureEditorOpen}
                onClose={() => setIsFullLectureEditorOpen(false)}
                lecture={activeLecture}
                onDeleteMcq={handleDeleteMcq}
                onOpenUpsertDialog={(mcq, level) => {
                    setMcqToEdit({mcq, level});
                    setIsUpsertMcqDialogOpen(true);
                }}
                onLectureNameSave={handleEditLectureSave}
            />}

            {examState === 'not-started' && (
                <div className={cn(containerClasses, "start-mode")}>
                    <div className="exam-start-screen">
                        <div className="w-full flex justify-between items-center mb-4">
                            <div>
                                {canAdminister && (
                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-600" onClick={() => setIsFullLectureEditorOpen(true)}><Edit size={14}/></Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600"><Trash2 size={14}/></Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>This will permanently delete this lecture and all its questions.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={handleDeleteLecture} className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                )}
                            </div>
                            {canAdminister && (
                                <Button onClick={() => setIsUpsertMcqDialogOpen(true)} className="flex items-center gap-2">
                                    <PlusCircle size={18} /> Create Question
                                </Button>
                            )}
                        </div>
                        <div id="lecture-tabs">
                            {allLectures.map(l => (
                                <button 
                                    key={l.id}
                                    className={cn('lecture-tab-btn', {'active': activeLecture.id === l.id})}
                                    onClick={() => {
                                        if (activeLecture.id !== l.id) onSwitchLecture(l.id);
                                    }}
                                >
                                    {l.name}
                                </button>
                            ))}
                        </div>
                        <hr className="w-full border-t border-border mb-8" />
                        <h2 style={{ fontFamily: "'Calistoga', cursive" }}>{activeLecture.name} Exam</h2>
                        <p>{`Ready to test your knowledge? You have ${questions.length} questions.`}</p>
                        <button onClick={() => handleStartExam(false)} className="start-exam-btn">
                            Start Exam
                        </button>
                    </div>
                </div>
            )}

            {examState === 'finished' && (
                <div className={cn(containerClasses, "exam-results-screen")}>
                    <TooltipProvider>
                        <div className="relative">
                             {canAdminister && (
                                <button onClick={() => setIsReportModalOpen(true)} className="expanding-btn primary absolute top-0 left-0">
                                    <FileText size={20} />
                                    <span className="expanding-text">Report</span>
                                </button>
                            )}
                            <div className="absolute top-0 right-0">
                                <button onClick={handleExitClick} className="expanding-btn destructive">
                                    <LogOut size={20} />
                                    <span className="expanding-text">Exit</span>
                                </button>
                            </div>
                            <div className="results-summary">
                                <h2 style={{ fontFamily: "'Calistoga', cursive" }}>Exam Completed!</h2>
                                <div className="score-container">
                                    <div className="score">{score} / {questions.length}</div>
                                    <p className="score-text">
                                        You answered {score} out of {questions.length} questions correctly.
                                    </p>
                                </div>
                                <div className="chart-container">
                                    <PerformanceChart correct={score} incorrect={incorrect} unanswered={unanswered} />
                                </div>
                            </div>
                        </div>

                        <div className="results-summary mt-6">
                            <h2 style={{ fontFamily: "'Calistoga', cursive" }}>How You Compare</h2>
                            <div className="w-full h-[300px]">
                                {allResults ? (
                                    <ResultsDistributionChart 
                                        results={allResults} 
                                        userFirstResult={userFirstResult}
                                        currentPercentage={percentage}
                                    />
                                ) : (
                                    <p className='text-center pt-10'>Loading comparison data...</p>
                                )}
                            </div>
                        </div>
                        
                        <h3 className="review-answers-title" style={{ fontFamily: "'Calistoga', cursive" }}>Review Your Answers</h3>
                        <div className="review-questions-list">
                            {questions.map((q, index) => {
                                const userAnswer = userAnswers[index];
                                const correctAnswer = q.a;
                                const isCorrect = userAnswer === correctAnswer;
                                const isUnanswered = userAnswer === null || userAnswer === undefined;
                                const questionText = q.q.substring(q.q.indexOf('.') + 1).trim();

                                return (
                                    <div key={index} className="review-question">
                                        <div className="review-question-header">
                                            {isUnanswered ? (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                      <AlertCircle size={20} className="text-yellow-500 shrink-0" />
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>You did not answer this question</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            ) : isCorrect ? (
                                                <CheckCircle size={20} className="text-green-600 shrink-0"/>
                                            ) : (
                                                <XCircle size={20} className="text-red-600 shrink-0"/>
                                            )}
                                            <p className="review-question-text">{index + 1}. {questionText}</p>
                                        </div>
                                        <div className="options">
                                            {q.o.map((option, optIndex) => {
                                                const isUserAnswer = option === userAnswer;
                                                const isCorrectAnswer = option === correctAnswer;
                                                let optionClass = 'review-option ';

                                                if (isCorrectAnswer) {
                                                    optionClass += 'correct';
                                                } else if (isUserAnswer && !isCorrect) {
                                                    optionClass += 'incorrect';
                                                } else if (isUnanswered && isCorrectAnswer) {
                                                    optionClass += 'unanswered';
                                                }

                                                return (
                                                    <div key={optIndex} className={optionClass}>
                                                        {isCorrectAnswer ? <CheckCircle size={22} className="shrink-0" /> :
                                                         isUserAnswer && !isCorrect ? <XCircle size={22} className="shrink-0" /> :
                                                         <div style={{width: 22, height: 22}} className="shrink-0" />}
                                                        <span className='pl-2'>{String.fromCharCode(97 + optIndex)}) {option.substring(option.indexOf(')') + 1).trim()}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </TooltipProvider>
                </div>
            )}

            {examState === 'in-progress' && (() => {
                const currentQuestion = questions[currentQuestionIndex];
                const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
                const questionText = currentQuestion ? currentQuestion.q.substring(currentQuestion.q.indexOf('.') + 1).trim() : '';

                return (
                    <div className={containerClasses}>
                         <div className="exam-progress-header">
                            <h3 className="text-lg font-bold text-center mb-4" style={{ fontFamily: "'Calistoga', cursive" }}>{activeLecture.name}</h3>
                             <div className="relative flex justify-center items-center mb-2">
                                <div className="absolute left-0 top-1/2 -translate-y-1/2">
                                    {canAdminister && (
                                        <button onClick={() => handleSubmit(true)} className="expanding-btn secondary">
                                            <SkipForward size={20} />
                                            <span className="expanding-text">Skip</span>
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 font-semibold text-lg text-muted-foreground">
                                    <Clock size={20} />
                                    <span>{formatTime(timeLeft)}</span>
                                </div>
                                <div className="absolute right-0 top-1/2 -translate-y-1/2">
                                    <button className="quick-exit-btn" onClick={handleQuickExit} aria-label="Exit Exam">
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>
                            <div className="progress-bar-container">
                                <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                            </div>
                        </div>

                        <div className={cn("question-area", questionAnimation)}>
                            {currentQuestion && (
                                <>
                                    <p className="question-title">{`Question ${currentQuestionIndex + 1} of ${questions.length}`}</p>
                                    <p className="question-text">{questionText}</p>
                                    <div className="options-grid">
                                        {currentQuestion.o.map((option, index) => (
                                            <button
                                                key={index}
                                                className={cn('option-btn', {'selected': userAnswers[currentQuestionIndex] === option})}
                                                onClick={() => handleSelectOption(option)}
                                            >
                                                <span className="option-letter">{String.fromCharCode(65 + index).toUpperCase()}</span>
                                                <span>{option.substring(option.indexOf(')') + 1).trim()}</span>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                        
                        <div className="exam-navigation">
                            <button 
                                onClick={handlePrevious} 
                                disabled={currentQuestionIndex === 0}
                                className="nav-btn"
                            >
                                <ChevronLeft size={20} />
                                Previous
                            </button>

                            {currentQuestionIndex === questions.length - 1 ? (
                                <button onClick={() => handleSubmit(false)} className="nav-btn finish">
                                    Finish & Submit
                                </button>
                            ) : (
                                <button 
                                    onClick={handleNext} 
                                    className="nav-btn"
                                >
                                    Next
                                    <ChevronRight size={20} />
                                </button>
                            )}
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

interface AdminReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    lectureId: string;
}

const AdminReportModal = ({ isOpen, onClose, lectureId }: AdminReportModalProps) => {
    const { db } = useFirebase();
    const [reportData, setReportData] = useState<{ userProfile: any, result: ExamResult }[]>([]);
    const [loading, setLoading] = useState(true);
    const reportContentRef = useRef<HTMLDivElement>(null);


    useEffect(() => {
        if (isOpen && db) {
            const fetchReportData = async () => {
                setLoading(true);
                
                const resultsQuery = query(collection(db, "examResults"), where("lectureId", "==", lectureId));
                const resultsSnapshot = await getDocs(resultsQuery);
                const resultsByUser: { [userId: string]: ExamResult } = {};

                resultsSnapshot.forEach(snap => {
                    const result = snap.data() as ExamResult;
                    const existing = resultsByUser[result.userId];
                    const thisTs: any = (result as any).timestamp;
                    const thisDate = thisTs && typeof thisTs.toDate === 'function' ? thisTs.toDate() : new Date(thisTs);
                    if (!existing) {
                        resultsByUser[result.userId] = result;
                    } else {
                        const existingTs: any = (existing as any).timestamp;
                        const existingDate = existingTs && typeof existingTs.toDate === 'function' ? existingTs.toDate() : new Date(existingTs);
                        if (thisDate.getTime() < existingDate.getTime()) {
                            resultsByUser[result.userId] = result;
                        }
                    }
                });

                const userIds = Object.keys(resultsByUser);
                if (userIds.length === 0) {
                    setReportData([]);
                    setLoading(false);
                    return;
                }
                
                const userProfilesPromises = userIds.map(id => getDoc(doc(db, 'users', id)));
                const userProfilesSnapshots = await Promise.all(userProfilesPromises);
                const userProfilesMap = new Map(userProfilesSnapshots.map(snap => [snap.id, snap.data()]));

                const finalData = Object.values(resultsByUser).map(result => {
                    return {
                        userProfile: userProfilesMap.get(result.userId) || { displayName: `Student ${result.userId}`, studentId: result.userId },
                        result: result,
                    };
                }).sort((a, b) => b.result.percentage - a.result.percentage);

                setReportData(finalData);
                setLoading(false);
            };

            fetchReportData();
        }
    }, [isOpen, db, lectureId]);


    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Exam Report</DialogTitle>
                </DialogHeader>
                <div ref={reportContentRef} className="max-h-[60vh] overflow-y-auto">
                    {loading ? (
                        <p>Loading report...</p>
                    ) : reportData.length > 0 ? (
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Student Name</th>
                                    <th scope="col" className="px-6 py-3">Student ID</th>
                                    <th scope="col" className="px-6 py-3">Score</th>
                                    <th scope="col" className="px-6 py-3">Percentage</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.map((data, index) => {
                                    const { userProfile, result } = data;
                                    const isSuperAdmin = userProfile.roles?.some((r: any) => r.role === 'superAdmin');
                                    const isSubAdmin = userProfile.roles?.some((r: any) => r.role === 'subAdmin') && !isSuperAdmin;
                                    const avatarRingClass = isSuperAdmin ? "ring-yellow-400" : isSubAdmin ? "ring-blue-400" : "ring-transparent";
                                    
                                    return (
                                        <tr key={index} className="border-b bg-white">
                                            <td scope="row" className="px-6 py-4 font-medium whitespace-nowrap text-gray-900">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className={cn("h-7 w-7 ring-2 ring-offset-2 ring-offset-background transition-all", avatarRingClass)}>
                                                        <AvatarImage 
                                                            src={userProfile.photoURL} 
                                                            alt={userProfile.displayName} 
                                                            className="pointer-events-none select-none"
                                                            onDragStart={(e) => e.preventDefault()}
                                                            onContextMenu={(e) => e.preventDefault()}
                                                        />
                                                        <AvatarFallback><UserIcon size={14}/></AvatarFallback>
                                                    </Avatar>
                                                    {userProfile.displayName}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">{userProfile.studentId}</td>
                                            <td className="px-6 py-4">{`${result.score} / ${result.totalQuestions}`}</td>
                                            <td className="px-6 py-4">{result.percentage.toFixed(2)}%</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <p>No results found for this exam yet.</p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default function ExamContainer({ lectures: rawLecturesData, onStateChange, fileItemId }: { lectures: Lecture[] | Lecture, onStateChange?: (inProgress: boolean) => void, fileItemId: string | null }) {
    const [lecturesState, setLecturesState] = useState<Lecture[]>(Array.isArray(rawLecturesData) ? rawLecturesData : (rawLecturesData ? [rawLecturesData] : []));
    const [activeLectureId, setActiveLectureId] = useState<string | undefined>(lecturesState[0]?.id);
    const isInitialRender = useRef(true);

    const persistChanges = async (updatedLectures: Lecture[]) => {
      if (!fileItemId) return;
      try {
        await contentService.updateDoc(fileItemId, {
          'metadata.quizData': JSON.stringify(updatedLectures, null, 2)
        });
      } catch (error) {
        console.error("Failed to save exam changes:", error);
      }
    };
    
    const handleLecturesUpdate = (updatedLectures: Lecture[]) => {
        setLecturesState(updatedLectures);
        persistChanges(updatedLectures);
    };

    useEffect(() => {
        const fontLinks = [
            { id: 'google-fonts-preconnect-1', href: 'https://fonts.googleapis.com', rel: 'preconnect' },
            { id: 'google-fonts-preconnect-2', href: 'https://fonts.gstatic.com', rel: 'preconnect', crossOrigin: 'anonymous' as const },
            { id: 'google-fonts-main', href: 'https://fonts.googleapis.com/css2?family=Coiny&family=Calistoga&display=swap', rel: 'stylesheet' }
        ];

        fontLinks.forEach(linkInfo => {
            if (!document.getElementById(linkInfo.id)) {
                const link = document.createElement('link');
                link.id = linkInfo.id;
                link.rel = linkInfo.rel;
                link.href = linkInfo.href;
                if (linkInfo.crossOrigin) {
                    link.crossOrigin = linkInfo.crossOrigin;
                }
                document.head.appendChild(link);
            }
        });
    }, []);

    const handleSwitchLecture = (lectureId: string) => {
        setActiveLectureId(lectureId);
    };

    const handleExit = () => {
        // No specific action needed on exit from the container perspective
    };
    
    useEffect(() => {
        if (isInitialRender.current && lecturesState.length > 0) {
            setActiveLectureId(lecturesState[0].id);
            isInitialRender.current = false;
        }
    }, [lecturesState]);

    if (!lecturesState || lecturesState.length === 0) {
        return <p className="p-4 text-center">No lectures available.</p>;
    }

    const activeLecture = lecturesState.find(l => l.id === activeLectureId);

    if (!activeLecture) {
        return <div className="flex items-center justify-center h-full"><p>Loading lecture...</p></div>;
    }

    return (
        <main className="exam-page-container">
            <div id="questions-container" className="h-full">
                 <ExamMode 
                    fileItemId={fileItemId}
                    lectures={lecturesState}
                    activeLecture={activeLecture}
                    onExit={handleExit} 
                    onSwitchLecture={handleSwitchLecture}
                    onLecturesUpdate={handleLecturesUpdate}
                    allLectures={lecturesState}
                    onStateChange={onStateChange}
                />
            </div>
        </main>
    );
}
