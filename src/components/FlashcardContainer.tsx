
'use client';
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, PlusCircle, Trash2, Edit, X } from 'lucide-react';
import Image from 'next/image';
import { lecturesData as initialLecturesData } from '@/lib/data';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/auth-store';


// --- UTILS (from src/lib/utils.ts) ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- TYPES (from src/lib/types.ts) ---
export interface Flashcard {
  id: string;
  front: string;
  back: string;
  imageUrl?: string;
  color?: string;
}

export interface Lecture {
  id: string;
  name: string;
  flashcards: Flashcard[];
}


// --- UI COMPONENTS (INLINED) ---

// Button
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
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
        sm: "h-9 rounded-lg px-3",
        lg: "h-11 rounded-lg px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean }
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (<Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />);
});
Button.displayName = "Button";

// Input
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(({ className, type, ...props }, ref) => {
    return (<input type={type} className={cn("flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm", className)} ref={ref} {...props} />);
});
Input.displayName = "Input";

// Textarea
const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(({ className, ...props }, ref) => {
    return (<textarea className={cn('flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm', className)} ref={ref} {...props} />);
});
Textarea.displayName = 'Textarea';

// Dialog
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

// Alert Dialog
const AlertDialog = AlertDialogPrimitive.Root;
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
const AlertDialogPortal = AlertDialogPrimitive.Portal;
const AlertDialogOverlay = React.forwardRef<React.ElementRef<typeof AlertDialogPrimitive.Overlay>, React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>>(({ className, ...props }, ref) => (<AlertDialogPrimitive.Overlay className={cn("fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className)} {...props} ref={ref} />));
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName;
const AlertDialogContent = React.forwardRef<React.ElementRef<typeof AlertDialogPrimitive.Content>, React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>>(({ className, ...props }, ref) => (<AlertDialogPortal><AlertDialogOverlay /><AlertDialogPrimitive.Content ref={ref} className={cn("fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg", className)} {...props} /></AlertDialogPortal>));
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName;
const AlertDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (<div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />);
AlertDialogHeader.displayName = "AlertDialogHeader";
const AlertDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (<div className={cn("flex flex-col-reverse sm:flex-row sm:justify-center sm:space-x-2", className)} {...props} />);
AlertDialogFooter.displayName = "AlertDialogFooter";
const AlertDialogTitle = React.forwardRef<React.ElementRef<typeof AlertDialogPrimitive.Title>, React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>>(({ className, ...props }, ref) => (<AlertDialogPrimitive.Title ref={ref} className={cn("text-lg font-semibold", className)} {...props} />));
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName;
const AlertDialogDescription = React.forwardRef<React.ElementRef<typeof AlertDialogPrimitive.Description>, React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>>(({ className, ...props }, ref) => (<AlertDialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />));
AlertDialogDescription.displayName = AlertDialogPrimitive.Description.displayName;
const AlertDialogAction = React.forwardRef<React.ElementRef<typeof AlertDialogPrimitive.Action>, React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>>(({ className, ...props }, ref) => (<AlertDialogPrimitive.Action ref={ref} className={cn(buttonVariants(), className)} {...props} />));
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName;
const AlertDialogCancel = React.forwardRef<React.ElementRef<typeof AlertDialogPrimitive.Cancel>, React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>>(({ className, ...props }, ref) => (<AlertDialogPrimitive.Cancel ref={ref} className={cn(buttonVariants({ variant: "outline" }), "mt-2 sm:mt-0", className)} {...props} />));
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName;

// Select
const Select = SelectPrimitive.Root;
const SelectValue = SelectPrimitive.Value;
const SelectTrigger = React.forwardRef<React.ElementRef<typeof SelectPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>>(({ className, children, ...props }, ref) => (<SelectPrimitive.Trigger ref={ref} className={cn("flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1", className)} {...props}>{children}<SelectPrimitive.Icon asChild><ChevronDown className="h-4 w-4 opacity-50" /></SelectPrimitive.Icon></SelectPrimitive.Trigger>));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;
const SelectContent = React.forwardRef<React.ElementRef<typeof SelectPrimitive.Content>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>>(({ className, children, position = "popper", ...props }, ref) => (<SelectPrimitive.Portal><SelectPrimitive.Content ref={ref} className={cn("relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1", position === "popper" && "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]", className)} position={position} {...props}><SelectPrimitive.Viewport className={cn("p-1", position === "popper" && "")}>{children}</SelectPrimitive.Viewport></SelectPrimitive.Content></SelectPrimitive.Portal>));
SelectContent.displayName = SelectPrimitive.Content.displayName;
const SelectItem = React.forwardRef<React.ElementRef<typeof SelectPrimitive.Item>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>>(({ className, children, ...props }, ref) => (<SelectPrimitive.Item ref={ref} className={cn("relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className)} {...props}><span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center"><SelectPrimitive.ItemIndicator><Check className="h-4 w-4" /></SelectPrimitive.ItemIndicator></span><SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText></SelectPrimitive.Item>));
SelectItem.displayName = SelectPrimitive.Item.displayName;


const getTextColorForBackground = (hexColor: string): '#FFFFFF' | '#000000' => {
    if (!hexColor || hexColor.length < 7) return '#000000';
    try {
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5 ? '#000000' : '#FFFFFF';
    } catch (e) {
        return '#000000';
    }
};

// --- Flashcard Component ---
const FlashcardComponent = React.memo(({ card, isFlipped, onFlip, onEdit, onDelete, canAdminister }: { card: Flashcard, isFlipped: boolean, onFlip: () => void, onEdit: () => void, onDelete: () => void, canAdminister: boolean }) => {
    const cardStyle: React.CSSProperties = card.color && card.color !== '#FFFFFF' ? { 
        backgroundColor: card.color,
        color: getTextColorForBackground(card.color)
    } : {
        backgroundColor: '#FFFFFF',
        color: '#333'
    };
    
    return (
        <div 
            className={cn(
                'relative w-full max-w-[620px] h-[400px] cursor-pointer',
                'transition-transform duration-700 [transform-style:preserve-3d]',
                isFlipped ? '[transform:rotateY(180deg)]' : '',
            )}
        >
             {canAdminister && (
                <div className="absolute top-5 right-5 flex gap-2.5 z-10" onClick={(e) => e.stopPropagation()}>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" size="icon" className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 rounded-full w-9 h-9"><Trash2 size={18} /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>This action will permanently delete this flashcard. You cannot undo this.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={onDelete} className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <Button variant="outline" size="icon" className="rounded-full w-9 h-9" onClick={(e) => { e.stopPropagation(); onEdit(); }}><Edit size={18} /></Button>
                </div>
             )}
            <div 
              className="absolute h-full w-full flex flex-col items-center justify-center p-10 text-center rounded-3xl shadow-lg border border-gray-200 [backface-visibility:hidden] [-webkit-backface-visibility:hidden]" 
              onClick={onFlip} 
              style={cardStyle}
            >
                {card.imageUrl && (
                    <div className="mb-5 w-full max-h-[200px] flex justify-center items-center">
                        <Image src={card.imageUrl} alt={card.front} width={250} height={150} className="max-w-full max-h-full object-contain rounded-xl" />
                    </div>
                )}
                <p className={cn("font-['Calistoga',_serif] text-[1.6rem] leading-snug", card.imageUrl ? "text-[1.4rem]" : "")}>{card.front}</p>
            </div>
            <div 
              className="absolute h-full w-full flex flex-col items-center justify-center p-10 text-center rounded-3xl shadow-lg border border-gray-200 [backface-visibility:hidden] [-webkit-backface-visibility:hidden] [transform:rotateY(180deg)]" 
              onClick={onFlip} 
              style={cardStyle}
            >
                <p className="font-['Segoe_UI',_sans-serif] text-[1.15rem] leading-relaxed" dangerouslySetInnerHTML={{ __html: card.back }}></p>
            </div>
        </div>
    );
});
FlashcardComponent.displayName = 'Flashcard';

const CARD_COLORS = ['#FFFFFF', '#FFCDD2', '#D1C4E9', '#BBDEFB', '#C8E6C9', '#FFF9C4', '#FFE0B2', '#D7CCC8'];

// --- Upsert Flashcard Form Component ---
const UpsertFlashcardForm = ({ lectures, activeLectureId, onUpsertCard, closeDialog, cardToEdit }: { lectures: Lecture[], activeLectureId?: string, onUpsertCard: (lectureId: string, newLectureName: string, card: Omit<Flashcard, 'id'>, cardId?: string) => void, closeDialog: () => void, cardToEdit?: Flashcard | null }) => {
    
    const formMode = cardToEdit ? 'edit' : 'create';
    const formKey = cardToEdit ? cardToEdit.id : 'create-new';

    return (
        <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
                <DialogTitle>{formMode === 'edit' ? 'Edit Flashcard' : 'Create a New Flashcard'}</DialogTitle>
            </DialogHeader>
            <UpsertFlashcardFormContent
                key={formKey}
                lectures={lectures}
                activeLectureId={activeLectureId}
                onUpsertCard={onUpsertCard}
                closeDialog={closeDialog}
                cardToEdit={cardToEdit}
            />
        </DialogContent>
    );
};


// --- The actual form logic component ---
const UpsertFlashcardFormContent = ({ lectures, activeLectureId, onUpsertCard, closeDialog, cardToEdit }: { lectures: Lecture[], activeLectureId?: string, onUpsertCard: (lectureId: string, newLectureName: string, card: Omit<Flashcard, 'id'>, cardId?: string) => void, closeDialog: () => void, cardToEdit?: Flashcard | null }) => {
    
    const getInitialLectureId = () => {
        if (cardToEdit) {
            const parentLecture = lectures.find(l => l.flashcards.some(c => c.id === cardToEdit.id));
            return parentLecture?.id || 'new';
        }
        return activeLectureId || lectures[0]?.id || 'new';
    };
    
    const [lectureId, setLectureId] = useState<string>(getInitialLectureId);
    const [newLectureName, setNewLectureName] = useState('');
    const [front, setFront] = useState(cardToEdit?.front || '');
    const [back, setBack] = useState(cardToEdit?.back || '');
    const [image, setImage] = useState<string | null>(cardToEdit?.imageUrl || null);
    const [imagePreview, setImagePreview] = useState<string | null>(cardToEdit?.imageUrl || null);
    const [selectedColor, setSelectedColor] = useState<string>(cardToEdit?.color || '#FFFFFF');
    const [isDragging, setIsDragging] = useState(false);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result as string;
                setImage(dataUrl);
                setImagePreview(dataUrl);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
             const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result as string;
                setImage(dataUrl);
                setImagePreview(dataUrl);
            };
            reader.readAsDataURL(file);
        }
    }
    
    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if ((!front || !back) || (lectureId === 'new' && !newLectureName)) {
            alert("Please fill all required fields.");
            return;
        }
        onUpsertCard(lectureId, newLectureName, { front, back, imageUrl: image || undefined, color: selectedColor }, cardToEdit?.id);
        closeDialog();
    };
    
    const dropzoneClassName = `flex justify-center items-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800'}`;

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <label htmlFor="lecture" className="text-sm font-medium">Lecture</label>
                <Select value={lectureId} onValueChange={setLectureId}>
                    <SelectTrigger id="lecture">
                        <SelectValue placeholder="Select a lecture" />
                    </SelectTrigger>
                    <SelectContent>
                        {lectures.map(lec => (
                            <SelectItem key={lec.id} value={lec.id}>{lec.name}</SelectItem>
                        ))}
                         <SelectItem value="new">Create a new lecture...</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {lectureId === 'new' && (
                 <div className="space-y-2">
                    <label htmlFor="new-lecture" className="text-sm font-medium">New Lecture Name</label>
                    <Input id="new-lecture" value={newLectureName} onChange={(e) => setNewLectureName(e.target.value)} placeholder="e.g., L6 Cardiology" required />
                </div>
            )}
            
            <div className="space-y-2">
                <label htmlFor="front" className="text-sm font-medium">Question (Front)</label>
                <Input id="front" value={front} onChange={(e) => setFront(e.target.value)} placeholder="e.g., What is the powerhouse of the cell?" required />
            </div>

            <div className="space-y-2">
                <label htmlFor="back" className="text-sm font-medium">Answer (Back)</label>
                <Textarea id="back" value={back} onChange={(e) => setBack(e.target.value)} placeholder="e.g., Mitochondria" required />
            </div>
            
            <div className="space-y-2">
                <label className="text-sm font-medium">Card Color</label>
                <div className="flex flex-wrap gap-2">
                    {CARD_COLORS.map(color => (
                        <button
                            key={color}
                            type="button"
                            className={`w-8 h-8 rounded-full border-2 transition-transform transform hover:scale-110 ${selectedColor === color ? 'border-blue-500 scale-110' : 'border-transparent'}`}
                            style={{ backgroundColor: color }}
                            onClick={() => setSelectedColor(color)}
                        />
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <label htmlFor="image" className="text-sm font-medium">Image (Optional)</label>
                <div 
                    className={dropzoneClassName}
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onClick={() => document.getElementById('image-upload')?.click()}
                >
                    {imagePreview ? (
                        <div className='relative w-full h-full'>
                            <Image src={imagePreview} alt="Preview" layout="fill" objectFit="contain" />
                             <Button variant="ghost" size="icon" className="absolute top-1 right-1 z-10 bg-white/50 hover:bg-white" onClick={(e) => { e.stopPropagation(); setImage(null); setImagePreview(null); }}>
                                <X size={16} />
                            </Button>
                        </div>
                    ) : (
                        <div className="text-center text-gray-500">
                            <p>Drag & drop or click to upload</p>
                            <p className="text-xs">PNG, JPG, GIF up to 10MB</p>
                        </div>
                    )}
                </div>
                <Input id="image-upload" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </div>

            <div className="flex justify-center pt-4">
                <Button type="submit">{cardToEdit ? 'Save Changes' : 'Add Flashcard'}</Button>
            </div>
        </form>
    );
};

// --- Edit Lecture Dialog Component ---
const EditLectureDialog = ({ lecture, onSave, onOpenChange }: { lecture: Lecture, onSave: (newName: string) => void, onOpenChange: (open: boolean) => void }) => {
    const [name, setName] = useState(lecture.name);

    useEffect(() => {
        setName(lecture.name);
    }, [lecture]);

    const handleSave = () => {
        if (name.trim()) {
            onSave(name.trim());
            onOpenChange(false);
        }
    };

    return (
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Edit Lecture Name</AlertDialogTitle>
                <AlertDialogDescription>Enter the new name for the "{lecture.name}" lecture.</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Lecture Name" />
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => onOpenChange(false)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleSave}>Save</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    );
};


// --- Main View ---
export function FlashcardContainer({ lectures: rawLecturesData }: { lectures: Lecture[] | Lecture }) {
    const { can } = useAuthStore();
    
    const lectures = Array.isArray(rawLecturesData) ? rawLecturesData : (rawLecturesData ? [rawLecturesData] : []);
    const [lecturesState, setLecturesState] = useState<Lecture[]>(lectures);
    const [activeLectureId, setActiveLectureId] = useState(lectures[0]?.id);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [direction, setDirection] = useState(0);
    const [isUpsertDialogOpen, setIsUpsertDialogOpen] = useState(false);
    const [cardToEdit, setCardToEdit] = useState<Flashcard | null>(null);
    const [isEditLectureOpen, setIsEditLectureOpen] = useState(false);
    const canAdminister = can('canAdministerFlashcards', activeLectureId);

    const activeLecture = lecturesState.find(lec => lec.id === activeLectureId);
    const flashcards = activeLecture?.flashcards || [];
    const currentCard = flashcards[currentCardIndex];

    // --- Dynamic Font Loading ---
    useEffect(() => {
        const fontLink = document.createElement('link');
        fontLink.href = "https://fonts.googleapis.com/css2?family=Coiny&family=Calistoga&display=swap";
        fontLink.rel = "stylesheet";
        document.head.appendChild(fontLink);
    }, []);
    
    // --- Reset index if lecture changes or cards are deleted ---
    useEffect(() => {
        if (activeLecture && currentCardIndex >= activeLecture.flashcards.length) {
            setCurrentCardIndex(Math.max(0, activeLecture.flashcards.length - 1));
        }
    }, [lecturesState, activeLectureId, currentCardIndex, activeLecture]);

    const handleFlip = () => {
        setIsFlipped(prev => !prev);
    };

    const handleNavigation = (navDirection: 'next' | 'prev') => {
        setDirection(navDirection === 'next' ? 1 : -1);
        const newIndex = navDirection === 'next'
            ? Math.min(currentCardIndex + 1, flashcards.length - 1)
            : Math.max(currentCardIndex - 1, 0);

        if (newIndex !== currentCardIndex) {
            if (isFlipped) {
                setTimeout(() => {
                    setIsFlipped(false);
                    setCurrentCardIndex(newIndex);
                }, 150);
            } else {
                setCurrentCardIndex(newIndex);
            }
        }
    };

    const switchTab = (lectureId: string) => {
        if (activeLectureId === lectureId) return;
        setDirection(0); // Reset direction for fade-in
        setActiveLectureId(lectureId);
        setCurrentCardIndex(0);
        setIsFlipped(false);
    };
    
    const handleUpsertCard = (lectureId: string, newLectureName: string, cardData: Omit<Flashcard, 'id'>, cardIdToEdit?: string) => {
        setLecturesState(prevLectures => {
            let updatedLectures = [...prevLectures];
            let targetLectureId = lectureId;
            let newLectureCreated = false;

            if (lectureId === 'new') {
                if (!newLectureName.trim()) return prevLectures;
                const newLec: Lecture = {
                    id: `l${Date.now()}`,
                    name: newLectureName.trim(),
                    flashcards: []
                };
                updatedLectures.push(newLec);
                targetLectureId = newLec.id;
                newLectureCreated = true;
            }
            
            let previousLectureId: string | undefined;
            if(cardIdToEdit){
                 const parentLecture = prevLectures.find(l => l.flashcards.some(c => c.id === cardIdToEdit));
                 previousLectureId = parentLecture?.id;
            }

            if(previousLectureId && previousLectureId !== targetLectureId){
                const oldLectureIndex = updatedLectures.findIndex(lec => lec.id === previousLectureId);
                if(oldLectureIndex > -1){
                    updatedLectures[oldLectureIndex].flashcards = updatedLectures[oldLectureIndex].flashcards.filter(c => c.id !== cardIdToEdit);
                }
            }

            const lectureIndex = updatedLectures.findIndex(lec => lec.id === targetLectureId);
            if (lectureIndex === -1) return prevLectures;
            
            const lectureToUpdate = { ...updatedLectures[lectureIndex] };
            let newFlashcards = [...lectureToUpdate.flashcards];

            if (cardIdToEdit && (!previousLectureId || previousLectureId === targetLectureId)) { 
                const cardIndex = newFlashcards.findIndex(c => c.id === cardIdToEdit);
                if (cardIndex > -1) {
                    newFlashcards[cardIndex] = { ...newFlashcards[cardIndex], ...cardData };
                }
            } else {
                const newCard: Flashcard = {
                     id: cardIdToEdit || `f${Date.now()}`,
                    ...cardData
                };
                newFlashcards.push(newCard);
            }
            lectureToUpdate.flashcards = newFlashcards;
            updatedLectures[lectureIndex] = lectureToUpdate;
            
            if (newLectureCreated) {
                setTimeout(() => {
                    setActiveLectureId(targetLectureId);
                    setCurrentCardIndex(lectureToUpdate.flashcards.length - 1);
                }, 0);
            }

            return updatedLectures;
        });
    };

    const handleDeleteCard = () => {
         if(!currentCard) return;
         setLecturesState(prevLectures => {
            const updatedLectures = prevLectures.map(lecture => {
                if (lecture.id === activeLectureId) {
                    const newFlashcards = lecture.flashcards.filter(card => card.id !== currentCard.id);
                    return { ...lecture, flashcards: newFlashcards };
                }
                return lecture;
            }).filter(Boolean);
            
            const activeLectureStillExists = updatedLectures.some(l => l.id === activeLectureId);
            if(!activeLectureStillExists){
                 setActiveLectureId(updatedLectures[0]?.id);
            }
            
            return updatedLectures;
        });
    }
    
    const openEditCardDialog = () => {
        if(!currentCard) return;
        setCardToEdit(currentCard);
        setIsUpsertDialogOpen(true);
    };
    
    const openCreateCardDialog = () => {
        setCardToEdit(null);
        setIsUpsertDialogOpen(true);
    }

    const handleEditLecture = (newName: string) => {
        if (!activeLectureId) return;
        setLecturesState(prev => prev.map(l => l.id === activeLectureId ? { ...l, name: newName } : l));
    }
    
    const handleDeleteLecture = () => {
        if (!activeLectureId) return;
        setLecturesState(prev => {
            const remaining = prev.filter(l => l.id !== activeLectureId);
            if (activeLectureId) {
                const currentIdx = prev.findIndex(l => l.id === activeLectureId);
                const nextIdx = currentIdx > 0 ? currentIdx - 1 : 0;
                setActiveLectureId(remaining[nextIdx]?.id || undefined);
                setCurrentCardIndex(0);
            }
            return remaining;
        });
    }

    const variants = {
        enter: (direction: number) => {
            return {
                x: direction > 0 ? 50 : -50,
                opacity: 0
            };
        },
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1
        },
        exit: (direction: number) => {
            return {
                zIndex: 0,
                x: direction < 0 ? 50 : -50,
                opacity: 0
            };
        }
    };


    return (
        <div className='text-black bg-[#f5f7fa] font-["Segoe_UI"] text-[17px] w-full h-full flashcard-theme-wrapper'>
            <style>{`
                .flashcard-theme-wrapper {
                    --background: #ffffff;
                    --foreground: #333333;
                    --card: #ffffff;
                    --popover: #ffffff;
                    --primary: #3b82f6;
                    --primary-foreground: #ffffff;
                    --secondary: #f3f4f6;
                    --secondary-foreground: #111827;
                    --muted: #f3f4f6;
                    --muted-foreground: #6b7280;
                    --accent: #f9fafb;
                    --accent-foreground: #111827;
                    --destructive: #ef4444;
                    --destructive-foreground: #ffffff;
                    --border: #e5e7eb;
                    --input: #e5e7eb;
                    --ring: #3b82f6;
                }
                .flashcard-theme-wrapper .dialog-content-light,
                .flashcard-theme-wrapper .alert-dialog-content-light {
                    background-color: var(--background);
                    color: var(--foreground);
                    border-color: var(--border);
                }
                .flashcard-theme-wrapper .button-light {
                    background-color: #000000;
                    color: #ffffff;
                }
                .flashcard-theme-wrapper .button-light.outline {
                    background-color: transparent;
                    color: #000000;
                    border: 1px solid #e5e7eb;
                }
                .flashcard-theme-wrapper .button-light:hover {
                    background-color: #333333;
                }
                 .flashcard-theme-wrapper .button-light.destructive {
                    background-color: var(--destructive);
                    color: var(--destructive-foreground);
                }
            `}</style>
            <div className="w-full h-full bg-white shadow-lg p-10 overflow-hidden flex flex-col">
                <div className="flex flex-col mb-6 gap-6">
                    <div className="w-full flex justify-between items-center mb-4">
                        <div>
                            {canAdminister && activeLecture && (
                                <div className="flex items-center gap-2">
                                    <AlertDialog open={isEditLectureOpen} onOpenChange={setIsEditLectureOpen}>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-600"><Edit size={14}/></Button>
                                        </AlertDialogTrigger>
                                        {activeLecture && <EditLectureDialog 
                                            lecture={activeLecture} 
                                            onSave={handleEditLecture} 
                                            onOpenChange={setIsEditLectureOpen} 
                                        />}
                                    </AlertDialog>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600"><Trash2 size={14}/></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="alert-dialog-content-light">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will permanently delete the "{activeLecture.name}" lecture and all its flashcards.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel className="button-light outline">Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleDeleteLecture} className="button-light destructive">Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            )}
                        </div>
                        {canAdminister && (
                            <Dialog open={isUpsertDialogOpen} onOpenChange={setIsUpsertDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button className="flex items-center gap-2 bg-black text-white hover:bg-gray-800 button-light" onClick={openCreateCardDialog}>
                                        <PlusCircle size={18} />
                                        Create Flashcard
                                    </Button>
                                </DialogTrigger>
                                {isUpsertDialogOpen && (
                                    <UpsertFlashcardForm 
                                        lectures={lecturesState}
                                        activeLectureId={activeLectureId}
                                        onUpsertCard={handleUpsertCard}
                                        closeDialog={() => setIsUpsertDialogOpen(false)}
                                        cardToEdit={cardToEdit}
                                    />
                                )}
                            </Dialog>
                        )}
                    </div>

                    <div className="w-full flex items-center">
                        <div className="flex-grow overflow-x-auto">
                            <div className="flex flex-nowrap justify-start gap-2 p-1.5" role="tablist" aria-label="Lectures">
                                {lecturesState.map(lecture => (
                                    <div key={lecture.id} className="relative flex items-center">
                                        <button
                                            type="button"
                                            className={cn(
                                                "shrink-0 whitespace-nowrap rounded-full border text-center font-semibold text-sm py-2.5 px-6 transition-all duration-300 shadow-sm",
                                                activeLectureId === lecture.id 
                                                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 border-transparent text-white shadow-none'
                                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:-translate-y-0.5 hover:shadow-md'
                                            )}
                                            onClick={() => switchTab(lecture.id)}
                                            role="tab"
                                            aria-selected={activeLectureId === lecture.id}
                                        >
                                            {lecture.name}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>


                <div className="[perspective:1500px] min-h-[400px] flex-1 flex items-center justify-center relative overflow-hidden">
                    <AnimatePresence initial={false} custom={direction}>
                        {currentCard ? (
                            <motion.div
                                key={currentCard.id}
                                custom={direction}
                                variants={variants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{
                                    x: { type: "spring", stiffness: 300, damping: 30 },
                                    opacity: { duration: 0.2 }
                                }}
                                className="absolute w-full h-full flex items-center justify-center"
                            >
                                <FlashcardComponent 
                                    card={currentCard}
                                    isFlipped={isFlipped}
                                    onFlip={handleFlip}
                                    onDelete={handleDeleteCard}
                                    onEdit={openEditCardDialog}
                                    canAdminister={canAdminister}
                                />
                            </motion.div>
                        ) : (
                            <div className="text-center text-gray-500 py-10">
                                <p className="text-lg font-medium">
                                    {lectures.length > 0 ? "No flashcards in this lecture." : "No lectures available."}
                                </p>
                                {canAdminister && <p className="mt-2 text-sm">Create a new lecture and card to get started!</p>}
                            </div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex justify-center items-center mt-10 gap-6">
                    <button 
                        className="w-[55px] h-[55px] rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center cursor-pointer transition-all duration-200 text-gray-500 hover:bg-gray-100 hover:text-blue-500 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-md disabled:bg-gray-200 disabled:text-gray-400" 
                        onClick={() => handleNavigation('prev')}
                        disabled={currentCardIndex === 0 || flashcards.length === 0}
                        aria-label="Previous card"
                    >
                        <ChevronLeft size={28} />
                    </button>
                    <div className="text-xl font-semibold text-gray-500 min-w-[90px] text-center">
                        {flashcards.length > 0 ? `${currentCardIndex + 1} / ${flashcards.length}` : '0 / 0'}
                    </div>
                    <button 
                        className="w-[55px] h-[55px] rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center cursor-pointer transition-all duration-200 text-gray-500 hover:bg-gray-100 hover:text-blue-500 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-md disabled:bg-gray-200 disabled:text-gray-400"
                        onClick={() => handleNavigation('next')}
                        disabled={currentCardIndex >= flashcards.length - 1 || flashcards.length === 0}
                        aria-label="Next card"
                    >
                        <ChevronRight size={28} />
                    </button>
                </div>
            </div>
        </div>
    );
}
