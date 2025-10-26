
'use client';
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, AlertCircle, LogOut, X, Clock, ArrowDown, FileText, SkipForward } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, LabelProps, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, LabelList, ReferenceLine } from 'recharts';
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { useCollection, useMemoFirebase } from '@/firebase/firestore/use-collection';
import { useUser } from '@/firebase/auth/use-user';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import type { Lecture, ExamResult, MCQ } from '@/lib/types';
import { addDocumentNonBlocking } from '@/firebase/firestore/non-blocking-updates';
import { useFirebase } from '@/firebase/provider';


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
    className={cn("flex flex-col space-y-2 text-center sm:text-left", className)}
    {...props}
  />
);
AlertDialogHeader.displayName = "AlertDialogHeader";

const AlertDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
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
const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;
const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";
const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

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

const ResultsDistributionChart = ({ results, userFirstResult, currentPercentage }: { results: ExamResult[], userFirstResult: ExamResult | null, currentPercentage: number }) => {
    
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

const ExamMode = ({ lecture, onExit, onSwitchLecture, allLectures, onStateChange }: { lecture: Lecture, onExit: () => void, onSwitchLecture: (lectureId: string) => void, allLectures: Lecture[], onStateChange?: (inProgress: boolean) => void }) => {
    const [examState, setExamState] = useState<'not-started' | 'in-progress' | 'finished'>('not-started');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<(string | null)[]>([]);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isExitAlertOpen, setIsExitAlertOpen] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const [showResumeAlert, setShowResumeAlert] = useState(false);
    const [questionAnimation, setQuestionAnimation] = useState('');
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const isInitialRender = useRef(true);

    const { user } = useUser();
    const isAdmin = user?.uid === process.env.NEXT_PUBLIC_ADMIN_UID;
    const { db: firestore } = useFirebase();
    
    const resultsCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, "examResults") : null, [firestore]);
    const examResultsQuery = useMemoFirebase(() => resultsCollectionRef ? query(resultsCollectionRef, where("lectureId", "==", lecture.id)) : null, [resultsCollectionRef, lecture.id]);
    const { data: allResults } = useCollection<ExamResult>(examResultsQuery);

    const questions = useMemo(() => {
        const l1 = Array.isArray(lecture.mcqs_level_1) ? lecture.mcqs_level_1 : [];
        const l2 = Array.isArray(lecture.mcqs_level_2) ? lecture.mcqs_level_2 : [];
        return [...l1, ...l2];
    }, [lecture]);

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
        if (!user || !allResults) return null;
        const userResults = allResults.filter(r => r.userId === user.uid);
        if (userResults.length === 0) return null;
        userResults.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        return userResults[0];
    }, [allResults, user]);

    const storageKey = useMemo(() => user ? `exam_progress_${lecture.id}_${user.uid}` : null, [lecture.id, user]);

    const handleSubmit = useCallback(async (isSkip = false) => {
        if (user && resultsCollectionRef && !isSkip) {
            const userPreviousResultsQuery = query(resultsCollectionRef, where("lectureId", "==", lecture.id), where("userId", "==", user.uid));
            try {
                const userPreviousResultsSnapshot = await getDocs(userPreviousResultsQuery);

                if (userPreviousResultsSnapshot.empty) {
                     const result: ExamResult = {
                        lectureId: lecture.id,
                        score,
                        totalQuestions: questions.length,
                        percentage,
                        userId: user.uid,
                        timestamp: new Date(),
                    };
                    addDocumentNonBlocking(resultsCollectionRef, result);
                }
            } catch (e) {
                console.error("Error checking or submitting exam results:", e)
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
    }, [storageKey, lecture.id, questions.length, user, resultsCollectionRef, score, percentage]);

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
    }, [storageKey, questions.length, lecture.id]);

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

    const containerClasses = `exam-container ${isAnimating ? 'animating-out' : 'animating-in'}`;

    if (questions.length === 0 && examState === 'not-started') {
        return <div className="exam-container"><p>No multiple-choice questions available for this lecture.</p></div>;
    }
    
    return (
        <>
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
                lectureId={lecture.id}
            />

            {examState === 'not-started' && (
                <div className={cn(containerClasses, "start-mode")}>
                    <div className="exam-start-screen">
                        <div id="lecture-tabs">
                            {allLectures.map(l => (
                                <button 
                                    key={l.id}
                                    className={cn('lecture-tab-btn', {'active': lecture.id === l.id})}
                                    onClick={() => {
                                        if (lecture.id !== l.id) onSwitchLecture(l.id);
                                    }}
                                >
                                    {l.name}
                                </button>
                            ))}
                        </div>
                        <hr className="w-full border-t border-border mb-8" />
                        <h2 style={{ fontFamily: "'Calistoga', cursive" }}>{lecture.name} Exam</h2>
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
                             {isAdmin && (
                                <button onClick={() => setIsReportModalOpen(true)} className="report-btn absolute top-0 left-0">
                                    <FileText size={20} />
                                    <span className="report-text">Report</span>
                                </button>
                            )}
                            <button onClick={handleExitClick} className="exit-btn absolute top-0 right-0">
                                <LogOut size={20} />
                                <span className="exit-text">Exit</span>
                            </button>
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
                            <h3 className="text-lg font-bold text-center mb-2" style={{ fontFamily: "'Calistoga', cursive" }}>{lecture.name}</h3>
                             <div className="flex justify-between items-center mb-2">
                                {isAdmin ? (
                                     <button onClick={() => handleSubmit(true)} className="skip-btn">
                                        <SkipForward size={16} />
                                        <span className="skip-text">Skip</span>
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-2 font-semibold text-lg text-muted-foreground">
                                        <Clock size={20} />
                                        <span>{formatTime(timeLeft)}</span>
                                    </div>
                                )}
                                <button className="quick-exit-btn" onClick={handleQuickExit} aria-label="Exit Exam">
                                    <X size={20} />
                                </button>
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
        </>
    );
};

interface AdminReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    lectureId: string;
}

const AdminReportModal = ({ isOpen, onClose, lectureId }: AdminReportModalProps) => {
    const { db } = useFirebase();
    const [reportData, setReportData] = useState<{ userName: string; studentId: string; score: number; total: number; percentage: number }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && db) {
            const fetchReportData = async () => {
                setLoading(true);
                
                const resultsQuery = query(collection(db, "examResults"), where("lectureId", "==", lectureId));
                const resultsSnapshot = await getDocs(resultsQuery);
                const resultsByUser: { [userId: string]: ExamResult } = {};

                // Get the first result for each user
                resultsSnapshot.forEach(doc => {
                    const result = doc.data() as ExamResult;
                    if (!resultsByUser[result.userId] || new Date(result.timestamp) < new Date(resultsByUser[result.userId].timestamp)) {
                        resultsByUser[result.userId] = result;
                    }
                });

                const userIds = Object.keys(resultsByUser);
                if (userIds.length === 0) {
                    setReportData([]);
                    setLoading(false);
                    return;
                }
                
                const usersQuery = query(collection(db, "users"), where("uid", "in", userIds));
                const usersSnapshot = await getDocs(usersQuery);
                const usersMap = new Map<string, any>();
                usersSnapshot.forEach(doc => usersMap.set(doc.id, doc.data()));
                
                const finalData = Object.values(resultsByUser).map(result => ({
                    userName: usersMap.get(result.userId)?.displayName || 'Unknown User',
                    studentId: usersMap.get(result.userId)?.studentId || 'N/A',
                    score: result.score,
                    total: result.totalQuestions,
                    percentage: result.percentage,
                })).sort((a, b) => b.percentage - a.percentage);

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
                <div className="max-h-[60vh] overflow-y-auto">
                    {loading ? (
                        <p>Loading report...</p>
                    ) : reportData.length > 0 ? (
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-400 uppercase bg-gray-700">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Student Name</th>
                                    <th scope="col" className="px-6 py-3">Student ID</th>
                                    <th scope="col" className="px-6 py-3">Score</th>
                                    <th scope="col" className="px-6 py-3">Percentage</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.map((data, index) => (
                                    <tr key={index} className="border-b bg-gray-800 border-gray-700">
                                        <th scope="row" className="px-6 py-4 font-medium whitespace-nowrap text-white">{data.userName}</th>
                                        <td className="px-6 py-4">{data.studentId}</td>
                                        <td className="px-6 py-4">{`${data.score} / ${data.total}`}</td>
                                        <td className="px-6 py-4">{data.percentage.toFixed(2)}%</td>
                                    </tr>
                                ))}
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

export default function ExamContainer({ lectures: rawLecturesData, onStateChange }: { lectures: Lecture[] | Lecture, onStateChange?: (inProgress: boolean) => void }) {
    const lectures = Array.isArray(rawLecturesData) ? rawLecturesData : (rawLecturesData ? [rawLecturesData] : []);
    const [activeLectureId, setActiveLectureId] = useState('');
    const isInitialRender = useRef(true);

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
        if (isInitialRender.current && lectures.length > 0) {
            setActiveLectureId(lectures[0].id);
            isInitialRender.current = false;
        }
    }, [lectures]);

    if (!lectures || lectures.length === 0) {
        return <p className="p-4 text-center">No lectures available.</p>;
    }

    const activeLecture = lectures.find(l => l.id === activeLectureId);

    if (!activeLecture) {
        return <div className="flex items-center justify-center h-full"><p>Loading lecture...</p></div>;
    }

    const ExamStyles = () => (
      <style>{`
        .exam-theme-wrapper {
            --background: 220 24% 95%;
            --foreground: 222.2 84% 4.9%;
            --card: 210 40% 98%;
            --card-foreground: 222.2 84% 4.9%;
            --popover: 210 40% 98%;
            --popover-foreground: 222.2 84% 4.9%;
            --primary: 224 76% 48%;
            --primary-foreground: 210 40% 98%;
            --secondary: 210 40% 96.1%;
            --secondary-foreground: 217 91% 20%;
            --muted: 210 40% 96.1%;
            --muted-foreground: 215.4 16.3% 46.9%;
            --accent: 243 77% 59%;
            --accent-foreground: 210 40% 98%;
            --destructive: 0 84.2% 60.2%;
            --destructive-foreground: 210 40% 98%;
            --border: 214.3 31.8% 91.4%;
            --input: 214.3 31.8% 91.4%;
            --ring: 224 76% 48%;
        }
        .report-btn, .skip-btn {
            background-color: transparent;
            border: 2px solid #3b82f6;
            color: #3b82f6;
            font-weight: 600;
            border-radius: 9999px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            overflow: hidden;
            transition: all 0.3s ease-in-out;
            width: 44px;
            height: 44px;
            padding: 0;
        }
        .report-btn .report-text, .skip-btn .skip-text {
            white-space: nowrap;
            opacity: 0;
            max-width: 0;
            transition: all 0.2s ease-in-out;
        }
        .report-btn:hover, .skip-btn:hover {
            background-color: #3b82f6;
            color: white;
            width: 120px;
            padding: 0 16px;
        }
        .report-btn:hover .report-text, .skip-btn:hover .skip-text {
            opacity: 1;
            max-width: 100px;
            margin-left: 0.5rem;
        }
        .skip-btn {
          border-color: #6b7280;
          color: #6b7280;
        }
        .skip-btn:hover {
          background-color: #6b7280;
          color: white;
        }
      `}</style>
    )

    return (
        <main className="exam-theme-wrapper exam-page-container bg-background text-foreground">
            <ExamStyles />
            <div id="questions-container">
                 <ExamMode 
                    lecture={activeLecture} 
                    onExit={handleExit} 
                    onSwitchLecture={handleSwitchLecture}
                    allLectures={lectures}
                    onStateChange={onStateChange}
                />
            </div>
        </main>
    );
}

