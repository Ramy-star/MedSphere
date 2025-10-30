// components/ChatQuote.tsx
import React from "react";
import { X, CornerRightDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  text: string;
  onClose?: () => void;
  className?: string;
};

export default function ChatQuote({ text, onClose, className = "" }: Props) {
  return (
    <div
      role="status"
      aria-label="Quote notice"
      className={cn(
        "relative text-white text-sm px-4 py-3 rounded-t-2xl rounded-b-lg mx-8 sm:mx-2 mb-0", // Adjusted margin
        className
      )}
      style={{ backgroundColor: '#424242' }}
    >
      {/* Close button */}
      {onClose && (
        <button
            aria-label="Close quote"
            onClick={onClose}
            className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center text-white/70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/20 transition-colors"
        >
            <X size={16} />
        </button>
      )}

      {/* Quote text (selectable) */}
      <blockquote className="select-text whitespace-pre-wrap break-words leading-snug pr-8">
        <CornerRightDown className="inline-block h-4 w-4 mr-2 -mt-1 text-slate-400" />
        <span className="text-slate-300 line-clamp-2">{text}</span>
      </blockquote>
    </div>
  );
}
