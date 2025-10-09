
import { cn } from "@/lib/utils";
import React from "react";

// SendStopButton: a blue Send button that becomes a Stop button with a rotating outer ring while "isSending".
// Props:
// - onSend(): async or sync callback when user clicks Send.
// - onStop(): callback when user clicks Stop while sending.
// - isSending: boolean to control the sending state from the parent.
// - disabled: boolean to disable the button.
// - size: one of 'sm' | 'md' | 'lg' (defaults to 'md')

export default function SendStopButton({ onSend, onStop, isSending, disabled, size = "md" }) {
  // size map
  const sizes = {
    sm: { btn: "w-9 h-9" },
    md: { btn: "w-12 h-12" },
    lg: { btn: "w-14 h-14" },
  };

  const { btn } = sizes[size] || sizes.md;

  async function handleSend() {
    if (!isSending && onSend) {
      onSend();
    }
  }

  function handleStopClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (isSending && onStop) {
      onStop();
    }
  }

  return (
    <div className="inline-flex items-center justify-center">
      {isSending ? (
        // Stop button (square)
        <button
            onClick={handleStopClick}
            aria-label="Stop sending"
            title="Stop"
            className={cn(
                "inline-flex items-center justify-center rounded-full text-red-500 hover:bg-red-500/10 transition-colors",
                btn
            )}
        >
            <span className="sr-only">Stop</span>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="6" y="6" width="12" height="12" rx="1" stroke="currentColor" strokeWidth="2"/>
            </svg>
        </button>
      ) : (
        // Idle: Send button
        <button
          onClick={handleSend}
          aria-label="Send message"
          title="Send"
          disabled={disabled}
          className={cn(
            "inline-flex items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors disabled:text-slate-600 disabled:hover:bg-transparent",
            btn
          )}
        >
          <span className="sr-only">Send</span>
          {/* paper plane icon */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </div>
  );
}
