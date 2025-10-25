
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
const SelectContent = React.forwardRef<React.ElementRef<typeof SelectPrimitive.Content>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>>(({ className, children, position = "popper", ...props }, ref) => (<SelectPrimitive.Portal><SelectPrimitive.Content ref={ref} className={cn("relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2", position === "popper" && "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1", className)} position={position} {...props}><SelectPrimitive.Viewport className={cn("p-1", position === "popper" && "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]")}>{children}</SelectPrimitive.Viewport></SelectPrimitive.Content></SelectPrimitive.Portal>));
SelectContent.displayName = SelectPrimitive.Content.displayName;
const SelectItem = React.forwardRef<React.ElementRef<typeof SelectPrimitive.Item>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>>(({ className, children, ...props }, ref) => (<SelectPrimitive.Item ref={ref} className={cn("relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className)} {...props}><span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center"><SelectPrimitive.ItemIndicator><Check className="h-4 w-4" /></SelectPrimitive.ItemIndicator></span><SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText></SelectPrimitive.Item>));
SelectItem.displayName = SelectPrimitive.Item.displayName;


// --- STYLES ---
const GlobalStyles = () => (
    <style>{`
        /* --- Keyframes for Animations --- */
        @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.98); }
            to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideInRight {
            from { opacity: 0; transform: translateX(-30px); }
            to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInLeft {
            from { opacity: 0; transform: translateX(30px); }
            to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideDownFadeIn {
            from { opacity: 0; transform: translateY(-20px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* --- CSS Variables --- */
        :root {
            /* Fonts */
            --header-font: 'Coiny', cursive;
            --base-font: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            --card-font: 'Calistoga', serif;
        }

        /* --- Base screen styles --- */
        body {
            font-family: var(--base-font);
            background-color: hsl(var(--background));
            color: hsl(var(--foreground));
            font-size: 17px;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        .page-container {
            max-width: 900px;
            margin: 40px auto;
            background-color: var(--container-bg);
            box-shadow: var(--container-shadow);
            padding: 40px;
            overflow: hidden;
            border-radius: 24px;
            background: hsl(var(--card));
        }
        
        /* --- Styles for Lecture Tabs --- */
         #header-container {
            display: flex;
            flex-direction: column;
            margin-bottom: 1.5rem;
            gap: 1.5rem;
        }
        #lecture-tabs-container {
            flex-grow: 1;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch; 
            scrollbar-width: none; 
        }
        #lecture-tabs-container::-webkit-scrollbar {
            display: none;
        }
        
        #lecture-tabs {
            display: flex;
            flex-wrap: nowrap;
            justify-content: flex-start;
            gap: 8px;
            padding: 5px 2px;
            scroll-behavior: smooth;
        }
        
        .lecture-tab-wrapper {
            position: relative;
            display: flex;
            align-items: center;
        }

        button.lecture-tab-btn {
            border-radius: 9999px;
            border: 1px solid hsl(var(--border));
            text-align: center;
            font-weight: 600;
            font-size: 0.9rem;
            padding: 0.7rem 1.6rem;
            transition: all 0.3s ease;
            background-color: hsl(var(--background));
            color: hsl(var(--muted-foreground));
            cursor: pointer;
            white-space: nowrap;
            box-shadow: 0 2px 4px rgba(0,0,0,0.04);
        }
        button.lecture-tab-btn:hover {
            background-color: hsl(var(--accent));
            transform: translateY(-2px);
            box-shadow: 0 4px 10px rgba(0,0,0,0.08);
        }
        button.lecture-tab-btn.active {
            background-image: linear-gradient(to right, #3b82f6, #4f46e5);
            border-color: transparent;
            color: white;
            font-weight: 600;
            box-shadow: none;
            transform: scale(1);
        }

        /* --- Flashcard Area --- */
        .flashcard-area {
            perspective: 1500px;
            min-height: 400px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
        }
        .flashcard-container {
            width: 100%;
            max-width: 620px;
            height: 400px;
            position: relative;
            transform-style: preserve-3d;
            transition: transform 0.7s cubic-bezier(0.25, 1, 0.5, 1);
            cursor: pointer;
        }
        .flashcard-container.is-flipped {
            transform: rotateY(180deg);
        }
        .flashcard-container.slide-in-right { animation: slideInRight 0.6s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
        .flashcard-container.slide-in-left { animation: slideInLeft 0.6s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
        .flashcard-container.slideDownFadeIn { animation: slideDownFadeIn 0.6s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
        
        .flashcard-face {
            position: absolute;
            height: 100%;
            width: 100%;
            backface-visibility: hidden;
            -webkit-backface-visibility: hidden;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px;
            text-align: center;
            border-radius: 24px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            border: 1px solid hsl(var(--border));
            background: hsl(var(--card));
            font-family: var(--card-font);
            font-size: 1.6rem;
            line-height: 1.5;
            transition: background-color 0.3s, color 0.3s;
        }
        .flashcard-front {
             color: var(--card-text-color, hsl(var(--card-foreground)));
        }
        .flashcard-back {
            color: var(--card-text-color, hsl(var(--card-foreground)));
            transform: rotateY(180deg);
            font-family: var(--base-font);
            font-size: 1.15rem;
            line-height: 1.6;
        }
        .flashcard-image-container {
            margin-bottom: 20px;
            width: 100%;
            max-height: 200px;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .flashcard-image {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            border-radius: 12px;
        }
        .flashcard-front-text {
             font-size: 1.4rem;
        }
        .flashcard-actions {
            position: absolute;
            top: 15px;
            right: 15px;
            display: flex;
            gap: 10px;
            z-index: 10;
        }
        .flashcard-actions button {
            background: rgba(255, 255, 255, 0.7);
            border: 1px solid hsl(var(--border));
            border-radius: 50%;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
        }
         .flashcard-actions button:hover {
            background: white;
         }

        /* --- Navigation --- */
        .flashcard-nav {
            display: flex;
            justify-content: center;
            align-items: center;
            margin-top: 40px;
            gap: 25px;
        }
        .nav-button {
            width: 55px;
            height: 55px;
            border-radius: 50%;
            background: hsl(var(--card));
            border: 1px solid hsl(var(--border));
            box-shadow: 0 4px 10px rgba(0,0,0,0.08);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s ease-out;
            color: hsl(var(--muted-foreground));
        }
        .nav-button:hover {
            background: hsl(var(--accent));
            color: hsl(var(--primary));
            transform: translateY(-2px);
            box-shadow: 0 6px 15px rgba(0,0,0,0.1);
        }
        .nav-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
            box-shadow: 0 4px 10px rgba(0,0,0,0.08);
            background: hsl(var(--muted));
            color: #94a3b8;
        }
        .progress-text {
            font-size: 1.25rem;
            font-weight: 600;
            color: hsl(var(--muted-foreground));
            min-width: 90px;
            text-align: center;
        }
        
        /* Mobile Styles */
        @media (max-width: 768px) {
             .page-container {
                padding: 20px;
                margin: 10px;
            }
             #header-container {
                 flex-direction: column;
                 align-items: stretch;
                 gap: 1rem;
             }
             #lecture-tabs-container {
                 margin-left: -20px;
                 margin-right: -20px;
                 padding-left: 20px;
                 padding-right: 20px;
             }
            .flashcard-area {
                min-height: 350px;
            }
            .flashcard-container {
                height: 380px;
            }
            .flashcard-face {
                font-size: 1.3rem;
                padding: 30px;
            }
            .flashcard-back {
                font-size: 1rem;
            }
            .flashcard-front-text {
                font-size: 1.1rem;
            }
        }
    `}</style>
);

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
const FlashcardComponent = React.memo(({ card, isFlipped, onFlip, animationClass, onEdit, onDelete }: { card: Flashcard, isFlipped: boolean, onFlip: () => void, animationClass: string, onEdit: () => void, onDelete: () => void }) => {
    const cardStyle = card.color && card.color !== '#FFFFFF' ? { 
        backgroundColor: card.color,
        color: getTextColorForBackground(card.color)
    } : {};
    
    return (
        <div className={`flashcard-container ${isFlipped ? 'is-flipped' : ''} ${animationClass}`} >
            <div className="flashcard-actions" onClick={(e) => e.stopPropagation()}>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="outline" size="icon" className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"><Trash2 size={18} /></Button>
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
                <Button variant="outline" size="icon" onClick={(e) => { e.stopPropagation(); onEdit(); }}><Edit size={18} /></Button>
            </div>
            <div className="flashcard-face flashcard-front" onClick={onFlip} style={cardStyle}>
                {card.imageUrl && (
                    <div className="flashcard-image-container">
                        <Image src={card.imageUrl} alt={card.front} width={250} height={150} className="flashcard-image" />
                    </div>
                )}
                <p className={card.imageUrl ? 'flashcard-front-text' : ''}>{card.front}</p>
            </div>
            <div className="flashcard-face flashcard-back" onClick={onFlip} style={cardStyle}>
                <p dangerouslySetInnerHTML={{ __html: card.back }}></p>
            </div>
        </div>
    );
});
FlashcardComponent.displayName = 'Flashcard';

const CARD_COLORS = ['#FFFFFF', '#FFCDD2', '#D1C4E9', '#BBDEFB', '#C8E6C9', '#FFF9C4', '#FFE0B2', '#D7CCC8'];

// --- Upsert Flashcard Form Component ---
const UpsertFlashcardForm = ({ lectures, activeLectureId, onUpsertCard, closeDialog, cardToEdit }: { lectures: Lecture[], activeLectureId?: string, onUpsertCard: (lectureId: string, newLectureName: string, card: Omit<Flashcard, 'id'>, cardId?: string) => void, closeDialog: () => void, cardToEdit?: Flashcard | null }) => {
    
    // Determine the mode and set a unique key to force re-mounting
    const formMode = cardToEdit ? 'edit' : 'create';
    const formKey = cardToEdit ? cardToEdit.id : 'create-new';

    return (
        <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
                <DialogTitle>{formMode === 'edit' ? 'Edit Flashcard' : 'Create a New Flashcard'}</DialogTitle>
            </DialogHeader>
            <UpsertFlashcardFormContent
                key={formKey} // This is crucial for re-mounting the component
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
export function FlashcardContainer({ lectures: rawLecturesData }: { lectures: Lecture[] }) {
    const [lectures, setLectures] = useState<Lecture[]>(rawLecturesData);
    const [activeLectureId, setActiveLectureId] = useState(lectures[0]?.id);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [animation, setAnimation] = useState({ class: 'fadeIn', direction: '' });
    const isAnimating = useRef(false);
    const [isUpsertDialogOpen, setIsUpsertDialogOpen] = useState(false);
    const [cardToEdit, setCardToEdit] = useState<Flashcard | null>(null);
    const [isEditLectureOpen, setIsEditLectureOpen] = useState(false);

    const activeLecture = lectures.find(lec => lec.id === activeLectureId);
    const flashcards = activeLecture?.flashcards || [];
    const currentCard = flashcards[currentCardIndex];

    // --- Dynamic Font Loading ---
    useEffect(() => {
        const fontLink = document.createElement('link');
        fontLink.href = "https://fonts.googleapis.com/css2?family=Coiny&family=Calistoga&display=swap";
        fontLink.rel = "stylesheet";
        document.head.appendChild(fontLink);
    }, []);
    
    // --- Animation Handling ---
    useEffect(() => {
        if (animation.class) {
            const timer = setTimeout(() => {
                setAnimation({ class: '', direction: '' });
                isAnimating.current = false;
            }, 600); // Animation duration
            return () => clearTimeout(timer);
        }
    }, [animation.class]);

    // --- Reset index if lecture changes or cards are deleted ---
    useEffect(() => {
        if (activeLecture && currentCardIndex >= activeLecture.flashcards.length) {
            setCurrentCardIndex(Math.max(0, activeLecture.flashcards.length - 1));
        }
    }, [lectures, activeLectureId, currentCardIndex, activeLecture]);

    const handleFlip = () => {
        if (isAnimating.current) return;
        setIsFlipped(prev => !prev);
    };

    const handleNavigation = (direction: 'next' | 'prev') => {
        if (isAnimating.current) return;
        isAnimating.current = true;

        const newIndex = direction === 'next'
            ? Math.min(currentCardIndex + 1, flashcards.length - 1)
            : Math.max(currentCardIndex - 1, 0);

        if (newIndex === currentCardIndex) {
            isAnimating.current = false;
            return;
        }

        setAnimation({ class: direction === 'next' ? 'slide-in-left' : 'slide-in-right', direction });
        
        if (isFlipped) {
           setTimeout(() => {
                setIsFlipped(false);
                setCurrentCardIndex(newIndex);
           }, 150);
        } else {
            setCurrentCardIndex(newIndex);
        }
    };

    const switchTab = (lectureId: string) => {
        if (isAnimating.current || activeLectureId === lectureId) return;
        isAnimating.current = true;
        
        setAnimation({ class: 'slideDownFadeIn', direction: '' });
        setActiveLectureId(lectureId);
        setCurrentCardIndex(0);
        setIsFlipped(false);
    };
    
    const handleUpsertCard = (lectureId: string, newLectureName: string, cardData: Omit<Flashcard, 'id'>, cardIdToEdit?: string) => {
        setLectures(prevLectures => {
            let updatedLectures = [...prevLectures];
            let targetLectureId = lectureId;
            let newLectureCreated = false;

            // Create new lecture if requested
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
                // Remove card from old lecture
                const oldLectureIndex = updatedLectures.findIndex(lec => lec.id === previousLectureId);
                if(oldLectureIndex > -1){
                    updatedLectures[oldLectureIndex].flashcards = updatedLectures[oldLectureIndex].flashcards.filter(c => c.id !== cardIdToEdit);
                }
            }


            // Find the index of the lecture to add/update the card in
            const lectureIndex = updatedLectures.findIndex(lec => lec.id === targetLectureId);
            if (lectureIndex === -1) return prevLectures;
            
            const lectureToUpdate = { ...updatedLectures[lectureIndex] };
            let newFlashcards = [...lectureToUpdate.flashcards];

            if (cardIdToEdit && (!previousLectureId || previousLectureId === targetLectureId)) { // Editing existing card in the same lecture
                const cardIndex = newFlashcards.findIndex(c => c.id === cardIdToEdit);
                if (cardIndex > -1) {
                    newFlashcards[cardIndex] = { ...newFlashcards[cardIndex], ...cardData };
                }
            } else { // Adding new card or moving card to a new lecture
                const newCard: Flashcard = {
                     id: cardIdToEdit || `f${Date.now()}`,
                    ...cardData
                };
                // if we are moving, we need to add it to the new lecture, the old one is already removed
                newFlashcards.push(newCard);
            }
            lectureToUpdate.flashcards = newFlashcards;
            updatedLectures[lectureIndex] = lectureToUpdate;
            
            if (newLectureCreated) {
                // Use a timeout to ensure state update propagates before switching tab
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
         setLectures(prevLectures => {
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
        setLectures(prev => prev.map(l => l.id === activeLectureId ? { ...l, name: newName } : l));
    }

    const handleDeleteLecture = () => {
        if (!activeLectureId) return;
        setLectures(prev => {
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

    return (
        <>
            <GlobalStyles />
            <div id="header-container">
                 <div className="w-full flex justify-between items-center mb-4">
                    <div>
                        {activeLecture && (
                            <div className="flex items-center gap-2">
                                <AlertDialog open={isEditLectureOpen} onOpenChange={setIsEditLectureOpen}>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8"><Edit size={14}/></Button>
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
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will permanently delete the "{activeLecture.name}" lecture and all its flashcards.
                                            </AlertDialogDescription>
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
                    <Dialog open={isUpsertDialogOpen} onOpenChange={setIsUpsertDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="flex items-center gap-2 bg-black text-white hover:bg-gray-800" onClick={openCreateCardDialog}>
                                <PlusCircle size={18} />
                                Create Flashcard
                            </Button>
                        </DialogTrigger>
                        {isUpsertDialogOpen && (
                            <UpsertFlashcardForm 
                                lectures={lectures}
                                activeLectureId={activeLectureId}
                                onUpsertCard={handleUpsertCard}
                                closeDialog={() => setIsUpsertDialogOpen(false)}
                                cardToEdit={cardToEdit}
                            />
                        )}
                    </Dialog>
                </div>

                <div className="w-full flex items-center">
                    <div id="lecture-tabs-container">
                        <div id="lecture-tabs" role="tablist" aria-label="Lectures">
                            {lectures.map(lecture => (
                                <div key={lecture.id} className="lecture-tab-wrapper">
                                    <button
                                        type="button"
                                        className={`lecture-tab-btn ${activeLectureId === lecture.id ? 'active' : ''}`}
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


            <div className="flashcard-area">
                {currentCard ? (
                    <FlashcardComponent 
                        card={currentCard}
                        isFlipped={isFlipped}
                        onFlip={handleFlip}
                        animationClass={animation.class}
                        onDelete={handleDeleteCard}
                        onEdit={openEditCardDialog}
                    />
                ) : (
                     <div className="text-center text-gray-500 py-10">
                        <p className="text-lg font-medium">
                            {lectures.length > 0 ? "No flashcards in this lecture." : "No lectures available."}
                        </p>
                        <p className="mt-2 text-sm">Create a new lecture and card to get started!</p>
                    </div>
                )}
            </div>

            <div className="flashcard-nav">
                <button 
                    className="nav-button" 
                    onClick={() => handleNavigation('prev')}
                    disabled={currentCardIndex === 0 || isAnimating.current || flashcards.length === 0}
                    aria-label="Previous card"
                >
                    <ChevronLeft size={28} />
                </button>
                <div className="progress-text">
                    {flashcards.length > 0 ? `${currentCardIndex + 1} / ${flashcards.length}` : '0 / 0'}
                </div>
                <button 
                    className="nav-button" 
                    onClick={() => handleNavigation('next')}
                    disabled={currentCardIndex >= flashcards.length - 1 || isAnimating.current || flashcards.length === 0}
                    aria-label="Next card"
                >
                    <ChevronRight size={28} />
                </button>
            </div>
        </>
    );
}
