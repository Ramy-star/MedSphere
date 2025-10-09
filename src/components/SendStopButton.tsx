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
    sm: { btn: "w-9 h-9", ring: "w-9 h-9" },
    md: { btn: "w-12 h-12", ring: "w-12 h-12" },
    lg: { btn: "w-14 h-14", ring: "w-14 h-14" },
  };

  const { btn, ring } = sizes[size] || sizes.md;

  async function handleSend() {
    if (!isSending && onSend) {
      onSend();
    }
  }

  function handleStopClick(e) {
    e.stopPropagation();
    if (isSending && onStop) {
      onStop();
    }
  }

  return (
    <div className="inline-flex items-center justify-center">
      {isSending ? (
        <div className={`relative flex items-center justify-center ${ring}`}>
          {/* Rotating ring (outside) */}
           <svg
            className="absolute inset-0 w-full h-full animate-spin-slow"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="16"
              cy="16"
              r="14"
              stroke="#2563EB"
              strokeWidth="3"
              strokeOpacity="0.2"
            />
            <path
              d="M16 2 A 14 14 0 0 1 30 16"
              stroke="#2563EB"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>

          {/* Stop button (square) */}
          <button
            onClick={handleStopClick}
            aria-label="Stop sending"
            title="Stop"
            className={`relative z-10 inline-flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700`}
          >
            <div className={`flex items-center justify-center ${btn}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="4" width="16" height="16" rx="2" fill="#ffffff" />
              </svg>
            </div>
          </button>
        </div>
      ) : (
        // Idle: Send button
        <button
          onClick={handleSend}
          aria-label="Send message"
          title="Send"
          disabled={disabled}
          className={`inline-flex items-center justify-center ${btn} rounded-full bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-500 disabled:text-gray-300`}
        >
          <span className="sr-only">Send</span>
          {/* paper plane icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </div>
  );
}
