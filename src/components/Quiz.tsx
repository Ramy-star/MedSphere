'use client';
import { useState } from 'react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Question {
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

interface QuizData {
  contentType: 'quiz';
  questions: Question[];
}

export function Quiz({ data }: { data: QuizData }) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  
  const currentQuestion = data.questions[currentQuestionIndex];

  const handleAnswerSelect = (answerIndex: number) => {
    if (isAnswered) return;
    setSelectedAnswer(answerIndex);
    setIsAnswered(true);
    setTimeout(() => setShowExplanation(true), 500);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < data.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setShowExplanation(false);
    } else {
      // Handle quiz completion if needed
      console.log('Quiz completed!');
    }
  };

  return (
    <div className="bg-[#2a2a2e] p-4 sm:p-6 rounded-2xl border border-slate-700/50 shadow-lg w-full text-white">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestionIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="mb-4">
            <p className="text-xs text-slate-400 font-semibold mb-2">
              Question {currentQuestionIndex + 1} of {data.questions.length}
            </p>
            <h3 className="text-base sm:text-lg font-semibold leading-snug">{currentQuestion.questionText}</h3>
          </div>

          <div className="space-y-3 my-5">
            {currentQuestion.options.map((option, index) => {
              const isCorrect = index === currentQuestion.correctAnswerIndex;
              const isSelected = index === selectedAnswer;
              
              let buttonVariant: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link" = "secondary";
              let icon = null;

              if (isAnswered) {
                if (isCorrect) {
                  buttonVariant = "default"; // Will be styled to green
                  icon = <CheckCircle className="h-5 w-5" />;
                } else if (isSelected) {
                  buttonVariant = "destructive"; // Will be styled to red
                  icon = <XCircle className="h-5 w-5" />;
                }
              }

              return (
                <Button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={isAnswered}
                  variant={buttonVariant}
                  className={cn(
                    "w-full justify-start text-left h-auto py-3 px-4 transition-all duration-300",
                    "bg-slate-700/50 hover:bg-slate-600/50 text-white",
                    isAnswered && isCorrect && "!bg-green-500/20 !border-green-500 text-white border",
                    isAnswered && isSelected && !isCorrect && "!bg-red-500/20 !border-red-500 text-white border",
                    isAnswered && !isSelected && "opacity-60"
                  )}
                >
                  <div className="flex-1 whitespace-normal break-words text-sm">{option}</div>
                  {isAnswered && (isSelected || isCorrect) && <div className="ml-4">{icon}</div>}
                </Button>
              );
            })}
          </div>

          <AnimatePresence>
            {showExplanation && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                  <p className="font-semibold text-slate-300 mb-1 text-sm">Explanation</p>
                  <p className="text-sm text-slate-300">{currentQuestion.explanation}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {isAnswered && currentQuestionIndex < data.questions.length - 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Button onClick={handleNextQuestion} className="w-full mt-6 bg-blue-600 hover:bg-blue-700">
                Next Question
              </Button>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
