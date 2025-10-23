'use client';
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, AlertCircle, LogOut, X, Clock } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, LabelProps } from 'recharts';
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { Lecture, MCQ } from '@/lib/types';


// --- INLINED UI COMPONENTS (Previously in src/components/ui/) ---

// Tooltip
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

// AlertDialog
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
const AlertDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col space-y-2 text-center sm:text-left", className)}
    {...props}
  />
);
AlertDialogHeader.displayName = "AlertDialogHeader";
const AlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
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
    className={cn(buttonVariants({ variant: "outline" }), "mt-2 sm:mt-0", className)}
    {...props}
  />
));
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName;


// --- STYLES (Previously in globals.css and component styles) ---
const GlobalStyles = () => (
    <style>{`
        /* --- Base Styles from globals.css --- */
        :root {
            --background: 220 24% 95%; /* light gray */
            --foreground: 222.2 84% 4.9%;
            --card: 210 40% 98%;
            --card-foreground: 222.2 84% 4.9%;
            --popover: 210 40% 98%;
            --popover-foreground: 222.2 84% 4.9%;
            --primary: 217 83% 53%; /* dark blue */
            --primary-foreground: 210 40% 98%;
            --secondary: 210 40% 96.1%;
            --secondary-foreground: 217 91% 20%;
            --muted: 210 40% 96.1%;
            --muted-foreground: 215.4 16.3% 46.9%;
            --accent: 248 77% 59%; /* purple */
            --accent-foreground: 217 91% 25%;
            --destructive: 0 84.2% 60.2%;
            --destructive-foreground: 210 40% 98%;
            --border: 214.3 31.8% 91.4%;
            --input: 214.3 31.8% 91.4%;
            --ring: 217 91% 60%;
            --radius: 1rem;
        }

        .dark {
            --background: 222.2 84% 4.9%;
            --foreground: 210 40% 98%;
            --card: 222.2 84% 4.9%;
            --card-foreground: 210 40% 98%;
            --popover: 222.2 84% 4.9%;
            --popover-foreground: 210 40% 98%;
            --primary: 217 91% 60%;
            --primary-foreground: 210 40% 98%;
            --secondary: 217.2 32.6% 17.5%;
            --secondary-foreground: 210 40% 98%;
            --muted: 217.2 32.6% 17.5%;
            --muted-foreground: 215 20.2% 65.1%;
            --accent: 217.2 32.6% 17.5%;
            --accent-foreground: 210 40% 98%;
            --destructive: 0 62.8% 30.6%;
            --destructive-foreground: 210 40% 98%;
            --border: 217.2 32.6% 17.5%;
            --input: 217.2 32.6% 17.5%;
            --ring: 217 91% 60%;
        }

        * {
            border-color: hsl(var(--border));
        }
        body {
            background-color: hsl(var(--background));
            color: hsl(var(--foreground));
        }
        button, a, input, select, textarea {
            transition-colors: 0.2s ease-in-out;
        }


        /* --- Keyframes for Animations --- */
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeOut {
            from { opacity: 1; transform: translateY(0); }
            to { opacity: 0; transform: translateY(-10px); }
        }
        @keyframes progress-bar {
            from { width: 0%; }
            to { width: var(--progress-width); }
        }

        /* --- Component-Specific Styles --- */
        .page-container {
            max-width: 900px;
            margin: 20px auto;
            background-color: var(--container-bg);
            box-shadow: var(--container-shadow);
            padding: 30px;
            overflow-x: hidden;
            border-radius: 1rem;
            position: relative; /* Needed for absolute positioning of children */
        }

        /* --- Exam Container --- */
        .exam-container {
            position: relative;
            background-color: #ffffff;
            border-radius: 1rem;
            padding: 2rem;
        }
        .exam-container.start-mode {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            min-height: 70vh;
        }

        .animating-out {
            animation: fadeOut 0.3s ease-out forwards;
        }
        .animating-in {
             animation: fadeIn 0.5s ease-out forwards;
        }


        /* --- Lecture Tabs --- */
        #lecture-tabs {
            display: flex;
            flex-wrap: nowrap;
            justify-content: flex-start;
            gap: 12px;
            padding: 5px 2px;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch; 
            scrollbar-width: none; 
            scroll-behavior: smooth;
            width: 100%;
            margin-bottom: 1.5rem;
        }

        #lecture-tabs::-webkit-scrollbar {
            display: none;
        }
        
        button.lecture-tab-btn {
            flex-shrink: 0;
            padding: 0.5rem 1rem;
            border-radius: 9999px;
            border: 1px solid hsl(var(--border));
            background-color: #fff;
            color: hsl(var(--muted-foreground));
            font-size: 0.9rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease-in-out;
        }

        button.lecture-tab-btn:hover {
            background-color: hsl(var(--muted));
            border-color: hsl(var(--primary));
        }

        button.lecture-tab-btn.active {
            background-color: hsl(var(--primary));
            border-color: hsl(var(--ring));
            color: hsl(var(--primary-foreground));
            font-weight: 600;
            box-shadow: none;
            transform: scale(1);
        }

        /* --- Start Screen --- */
        .exam-start-screen {
            text-align: center;
            padding: 2rem;
            width: 100%;
        }
        .exam-start-screen h2 {
            font-size: 2.2rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
            color: hsl(var(--foreground));
        }
        .exam-start-screen p {
            font-size: 1.1rem;
            color: hsl(var(--muted-foreground));
            margin-bottom: 2.5rem;
        }
        .start-exam-btn {
            background: hsl(var(--primary));
            color: hsl(var(--primary-foreground));
            padding: 0.8rem 2.5rem;
            font-size: 1.1rem;
            font-weight: 600;
            border-radius: 50px;
            border: none;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .start-exam-btn:hover {
            transform: translateY(-3px);
            background: hsl(var(--primary) / 0.9);
        }

        /* --- In-Progress Screen --- */
        .quick-exit-btn {
            position: absolute;
            top: 1.75rem;
            right: 1.75rem;
            background: transparent;
            border: none;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: hsl(var(--muted-foreground));
            transition: all 0.2s ease;
            z-index: 50;
        }
        .quick-exit-btn:hover {
            background: hsl(var(--destructive) / 0.1);
            color: hsl(var(--destructive));
            transform: scale(1.1);
        }

        .exam-progress-header {
            margin-bottom: 1.5rem;
        }
        .exam-progress-header h3 {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 0.75rem;
        }
        .progress-bar-container {
            width: 100%;
            background-color: hsl(var(--muted));
            border-radius: 10px;
            height: 8px;
            overflow: hidden;
        }
        .progress-bar {
            height: 100%;
            background: hsl(var(--primary));
            border-radius: 10px;
            transition: width 0.4s ease-in-out;
        }
        .question-area {
          min-height: 320px;
          transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out;
        }
        .question-area.question-fade-out {
          opacity: 0;
          transform: translateY(-10px);
        }
        .question-area.question-fade-in {
          opacity: 1;
          transform: translateY(0px);
        }
        .question-title {
            font-size: 1rem;
            font-weight: 500;
            color: hsl(var(--muted-foreground));
            margin-bottom: 1rem;
        }
        .question-text {
            font-size: 1.3rem;
            font-weight: 600;
            margin-bottom: 2rem;
            line-height: 1.6;
        }
        .options-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 1rem;
        }
        .option-btn {
            display: flex;
            align-items: center;
            text-align: left;
            width: 100%;
            padding: 1rem 1.25rem;
            border: 2px solid hsl(var(--border));
            border-radius: 1rem;
            background-color: #fff;
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.2s ease-in-out;
        }
        .option-btn:hover {
            border-color: hsl(var(--primary));
            transform: translateX(5px);
        }
        .option-btn.selected {
            background-color: hsl(var(--primary) / 0.1);
            border-color: hsl(var(--primary));
            font-weight: 600;
        }
        .option-letter {
            font-weight: 700;
            margin-right: 1rem;
            padding: 0.25rem 0.6rem;
            border: 1px solid hsl(var(--border));
            border-radius: 6px;
            min-width: 32px;
            text-align: center;
            transition: all 0.2s ease-in-out;
        }
        .option-btn.selected .option-letter {
          background-color: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
          border-color: hsl(var(--primary));
        }

        .exam-navigation {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 2rem;
            border-top: 1px solid hsl(var(--border));
            padding-top: 1.5rem;
        }
        .nav-btn {
            background-color: #fff;
            color: hsl(var(--muted-foreground));
            padding: 0.6rem 1.5rem;
            font-size: 1rem;
            font-weight: 500;
            border-radius: calc(1rem - 2px);
            border: 1px solid hsl(var(--border));
            cursor: pointer;
            transition: background-color 0.2s, color 0.2s, transform 0.1s;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .nav-btn:hover:not(:disabled) {
            background-color: hsl(var(--muted));
        }
        .nav-btn:active:not(:disabled) {
            transform: scale(0.97);
        }
        .nav-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .nav-btn.finish {
            background-color: #10b981;
            color: white;
            border-color: #10b981;
            font-weight: 600;
        }
        .nav-btn.finish:hover {
            background-color: #059669;
            border-color: #059669;
        }

        /* --- Results Screen --- */
        .exam-results-screen {
            text-align: center;
        }
        .results-summary {
            background: hsl(var(--muted));
            border: 1px solid hsl(var(--border));
            border-radius: 1rem;
            padding: 2.5rem 2rem;
            margin-bottom: 2.5rem;
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: center;
            gap: 2rem;
        }
        .results-summary h2 {
            font-size: 2rem;
            font-weight: 700;
            color: hsl(var(--foreground));
            margin-bottom: 0.75rem;
            width: 100%;
            text-align: center;
        }
        .score-container {
            flex-basis: 40%;
            text-align: center;
        }
        .score-container .score {
            font-size: 5rem;
            font-weight: 800;
            line-height: 1.1;
            color: hsl(var(--primary));
            margin: 0;
        }
        .score-container .score-text {
            font-size: 1.25rem;
            color: hsl(var(--muted-foreground));
            margin-top: 0.5rem;
        }
        .chart-container {
            flex-basis: 50%;
            min-width: 220px;
            height: 200px;
        }
        .review-answers-title {
            font-size: 1.8rem;
            font-weight: 600;
            margin-bottom: 1.5rem;
            text-align: left;
            border-bottom: 1px solid hsl(var(--border));
            padding-bottom: 1rem;
        }
        .review-question {
            background-color: #fff;
            border: 1px solid hsl(var(--border));
            border-radius: 1rem;
            padding: 1.5rem;
            margin-bottom: 1.25rem;
            text-align: left;
            transition: box-shadow 0.2s;
        }
        .review-question:hover {
            box-shadow: 0 4px 15px rgba(0,0,0,0.07);
        }
        .review-question-header {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: 1.25rem;
        }
        .review-question-text {
          font-weight: 600;
          font-size: 1.1rem;
          line-height: 1.6;
        }
        .review-option {
            padding: 0.8rem 1rem;
            border-radius: calc(1rem - 2px);
            margin-bottom: 0.75rem;
            display: flex;
            gap: 1rem;
            align-items: center;
            border: 1px solid transparent;
            font-size: 0.95rem;
        }
        .review-option.correct {
            background-color: #dcfce7;
            color: #166534;
            border-color: #86efac;
            font-weight: 600;
        }
        .review-option.incorrect {
            background-color: #fee2e2;
            color: #991b1b;
            border-color: #fca5a5;
        }
        .review-option.unanswered {
            background-color: #fffbeb;
            color: #b45309;
            border-color: #fcd34d;
        }
        .review-option > svg {
          flex-shrink: 0;
        }

        .exit-btn {
            background: none;
            border: 2px solid hsl(var(--destructive));
            color: hsl(var(--destructive));
            padding: 0.75rem 2rem;
            font-size: 1.1rem;
            font-weight: 600;
            border-radius: 50px;
            cursor: pointer;
            transition: background-color 0.2s, color 0.2s, transform 0.2s;
            margin-top: 2rem;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
        }
        .exit-btn:hover {
            background-color: hsl(var(--destructive));
            color: hsl(var(--primary-foreground));
            transform: translateY(-2px);
        }
        
        /* Mobile Styles */
        @media (max-width: 768px) {
            .page-container {
                padding: 15px;
                margin: 10px;
            }
            .exam-container {
                padding: 1rem;
            }
            .exam-start-screen h2 {
                font-size: 1.8rem;
            }
            .results-summary .score-container .score {
                font-size: 4rem;
            }
            .results-summary {
                flex-direction: column-reverse;
                padding: 1.5rem 1rem;
            }
        }
    `}</style>
);

const PerformanceChart = ({ correct, incorrect, unanswered }: { correct: number, incorrect: number, unanswered: number }) => {
    const data = [
        { name: 'Correct', value: correct, color: '#10b981' },
        { name: 'Incorrect', value: incorrect, color: '#ef4444' },
        { name: 'Unanswered', value: unanswered, color: '#f59e0b' },
    ].filter(item => item.value > 0);

    const RADIAN = Math.PI / 180;
    const renderCustomizedLabel = (props: LabelProps & { name: string, percent: number }) => {
        const { cx, cy, midAngle, outerRadius, percent, name } = props as any;
        const radius = outerRadius * 1.35; 
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        const textAnchor = x > cx ? 'start' : 'end';
        const labelX = x + (x > cx ? 3 : -3);

        if (percent === 0) return null;

        return (
            <text x={labelX} y={y} fill="hsl(var(--foreground))" textAnchor={textAnchor} dominantBaseline="central" className="text-xs font-medium">
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


const ExamMode = ({ lecture, onExit, onSwitchLecture, allLectures }: { lecture: Lecture, onExit: () => void, onSwitchLecture: (lectureId: string) => void, allLectures: Lecture[] }) => {
    const [examState, setExamState] = useState<'not-started' | 'in-progress' | 'finished'>('not-started');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<(string | null)[]>([]);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isExitAlertOpen, setIsExitAlertOpen] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const [showResumeAlert, setShowResumeAlert] = useState(false);
    const [questionAnimation, setQuestionAnimation] = useState('');
    const isInitialMount = useRef(true);

    const questions = useMemo(() => {
        return [...(lecture.mcqs_level_1 || []), ...(lecture.mcqs_level_2 || [])];
    }, [lecture]);

    const storageKey = `exam_progress_${lecture.id}`;

    // Load progress when switching lectures
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        
        try {
            const savedProgress = localStorage.getItem(storageKey);
            if (savedProgress) {
                setShowResumeAlert(true);
            }
        } catch (error) {
            console.error("Could not access localStorage:", error);
        }
    }, [storageKey]);

    // Save progress
    useEffect(() => {
        if (examState === 'in-progress') {
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
                    handleSubmit();
                    return 0;
                }
                return prevTime - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [questions.length]);


    useEffect(() => {
        let timerCleanup: () => void = () => {};
        if (examState === 'in-progress') {
            if (timeLeft > 0) { // Resume timer
                const timer = setInterval(() => {
                    setTimeLeft(prevTime => {
                        if (prevTime <= 1) {
                            clearInterval(timer);
                            handleSubmit();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [examState]);


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
        if (resume) {
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
        try {
            localStorage.removeItem(storageKey);
        } catch (error) {
            console.error("Could not clear localStorage:", error);
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

    const handleSubmit = () => {
        try {
            localStorage.removeItem(storageKey);
        } catch (error) {
            console.error("Could not clear localStorage on submit:", error);
        }
        triggerAnimation('finished');
    };
    
    const handleExitClick = () => {
        setIsExitAlertOpen(true);
    };

    const handleQuickExit = () => {
        triggerAnimation('not-started');
        onExit();
    };
    
    const calculateScore = () => {
        let score = 0;
        let incorrect = 0;
        let unanswered = 0;

        for (let i = 0; i < questions.length; i++) {
            if (userAnswers[i] === null) {
                unanswered++;
            } else if (questions[i] && userAnswers[i] === questions[i].a) {
                score++;
            } else {
                incorrect++;
            }
        }
        return { score, incorrect, unanswered };
    };

    const containerClasses = `exam-container ${isAnimating ? 'animating-out' : 'animating-in'}`;

    if (questions.length === 0 && examState === 'not-started') {
        return <div className="exam-container"><p>No multiple-choice questions available for this lecture.</p></div>;
    }
    
    return (
        <>
            <AlertDialog open={isExitAlertOpen} onOpenChange={setIsExitAlertOpen}>
                <AlertDialogContent className="rounded-2xl bg-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to exit?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Your current progress will be saved. You can resume next time.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex justify-center sm:justify-center">
                        <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-500 hover:bg-red-600 rounded-xl" onClick={handleQuickExit}>Exit</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={showResumeAlert} onOpenChange={setShowResumeAlert}>
                <AlertDialogContent className="rounded-2xl bg-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Welcome Back!</AlertDialogTitle>
                        <AlertDialogDescription>
                            We found an incomplete exam. Would you like to resume where you left off or start a new exam?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex justify-center sm:justify-center">
                        <AlertDialogCancel className="rounded-xl" onClick={() => handleStartExam(false)}>Start New</AlertDialogCancel>
                        <AlertDialogAction className="rounded-xl bg-black text-white hover:bg-gray-800" onClick={() => handleStartExam(true)}>Resume Exam</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {examState === 'in-progress' && (
                <button className="quick-exit-btn" onClick={handleExitClick} aria-label="Exit Exam">
                    <X size={20} />
                </button>
            )}

            {examState === 'not-started' && (
                <div className={`${containerClasses} start-mode`}>
                    <div className="exam-start-screen">
                        <div id="lecture-tabs">
                            {allLectures.map(l => (
                                <button 
                                    key={l.id}
                                    className={`lecture-tab-btn ${lecture.id === l.id ? 'active' : ''}`}
                                    onClick={() => onSwitchLecture(l.id)}
                                >
                                    {l.name}
                                </button>
                            ))}
                        </div>
                        <hr className="w-full border-t border-gray-200 mb-8" />
                        <h2 style={{ fontFamily: "'Calistoga', cursive" }}>{lecture.name} Exam</h2>
                        <p>{`Ready to test your knowledge? You have ${questions.length} questions.`}</p>
                        <button onClick={() => handleStartExam(false)} className="start-exam-btn">
                            Start Exam
                        </button>
                    </div>
                </div>
            )}

            {examState === 'finished' && (() => {
                const { score, incorrect, unanswered } = calculateScore();
                return (
                    <div className={`${containerClasses} exam-results-screen`}>
                        <TooltipProvider>
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
                            
                            <h3 className="review-answers-title" style={{ fontFamily: "'Calistoga', cursive" }}>Review Your Answers</h3>
                            <div className="review-questions-list">
                                {questions.map((q, index) => {
                                    const userAnswer = userAnswers[index];
                                    const correctAnswer = q.a;
                                    const isCorrect = userAnswer === correctAnswer;
                                    const isUnanswered = userAnswer === null;
                                    const questionText = q.q.substring(q.q.indexOf('.') + 1).trim();

                                    return (
                                        <div key={index} className="review-question">
                                            <div className="review-question-header">
                                                {isUnanswered && (
                                                    <Tooltip>
                                                        <TooltipTrigger>
                                                            <AlertCircle size={20} className="text-yellow-500" />
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>You did not answer this question</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                )}
                                                <p className="review-question-text">{index + 1}. {questionText}</p>
                                            </div>
                                            <div className="options">
                                                {q.o.map((option, optIndex) => {
                                                    const isUserAnswer = option === userAnswer;
                                                    const isCorrectAnswer = option === correctAnswer;
                                                    let optionClass = 'review-option';

                                                    if (isCorrectAnswer) {
                                                        optionClass += ' correct';
                                                    } else if (isUserAnswer && !isCorrect) {
                                                        optionClass += ' incorrect';
                                                    } else if (isUnanswered && isCorrectAnswer) {
                                                        optionClass += ' unanswered';
                                                    }

                                                    return (
                                                        <div key={optIndex} className={optionClass}>
                                                            {isCorrectAnswer && <CheckCircle size={22} />}
                                                            {isUserAnswer && !isCorrect && <XCircle size={22} />}
                                                            {!isCorrectAnswer && !isUserAnswer && <div style={{width: 24, height: 24}} />}
                                                            <span>{String.fromCharCode(97 + optIndex)}) {option.substring(option.indexOf(')') + 1).trim()}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <button onClick={() => { triggerAnimation('not-started'); onExit(); }} className="exit-btn">
                                <LogOut size={20} />
                                Exit
                            </button>
                        </TooltipProvider>
                    </div>
                );
            })()}

            {examState === 'in-progress' && (() => {
                const currentQuestion = questions[currentQuestionIndex];
                const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
                const questionText = currentQuestion ? currentQuestion.q.substring(currentQuestion.q.indexOf('.') + 1).trim() : '';

                return (
                    <div className={containerClasses}>
                        <div className="exam-progress-header">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-lg font-bold" style={{ fontFamily: "'Calistoga', cursive" }}>{lecture.name}</h3>
                                <div className="flex items-center gap-2 font-semibold text-lg text-gray-700">
                                    <Clock size={20} />
                                    <span>{formatTime(timeLeft)}</span>
                                </div>
                            </div>
                            <div className="progress-bar-container">
                                <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                            </div>
                        </div>

                        <div className={`question-area ${questionAnimation}`}>
                            {currentQuestion && (
                                <>
                                    <p className="question-title">{`Question ${currentQuestionIndex + 1} of ${questions.length}`}</p>
                                    <p className="question-text">{questionText}</p>
                                    <div className="options-grid">
                                        {currentQuestion.o.map((option, index) => (
                                            <button
                                                key={index}
                                                className={`option-btn ${userAnswers[currentQuestionIndex] === option ? 'selected' : ''}`}
                                                onClick={() => handleSelectOption(option)}
                                            >
                                                <span className="option-letter">{String.fromCharCode(97 + index).toUpperCase()}</span>
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
                                <button onClick={handleSubmit} className="nav-btn finish">
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
        </>
    );
};


export function ExamContainer({ lectures }: { lectures: Lecture[] }) {
    const [activeLectureId, setActiveLectureId] = useState(lectures[0]?.id || '');

    useEffect(() => {
        const fontLinks = [
            { id: 'google-fonts-preconnect-1', href: 'https://fonts.googleapis.com', rel: 'preconnect' },
            { id: 'google-fonts-preconnect-2', href: 'https://fonts.gstatic.com', rel: 'preconnect', crossOrigin: 'anonymous' },
            { id: 'google-fonts-main', href: 'https://fonts.googleapis.com/css2?family=Coiny&family=Calistoga&display=swap', rel: 'stylesheet' }
        ];

        fontLinks.forEach(linkInfo => {
            if (!document.getElementById(linkInfo.id)) {
                const link = document.createElement('link');
                link.id = linkInfo.id;
                link.rel = linkInfo.rel;
                link.href = linkInfo.href;
                if (linkInfo.crossOrigin) {
                    (link as HTMLLinkElement).crossOrigin = linkInfo.crossOrigin as string;
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

    if (!lectures || lectures.length === 0) {
        return <p className="p-4 text-center">No lectures available.</p>;
    }

    const activeLecture = lectures.find(l => l.id === activeLectureId) || lectures[0];

    return (
        <div className="page-container">
            <GlobalStyles />
            <div id="questions-container">
                 <ExamMode 
                    lecture={activeLecture} 
                    onExit={handleExit} 
                    onSwitchLecture={handleSwitchLecture}
                    allLectures={lectures}
                />
            </div>
        </div>
    );
}
