// components/ChatQuote.tsx
import React from "react";
import { X, CornerRightDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message } from "@/lib/communityService";
import { useUserProfile } from "@/hooks/use-user-profile";

type Props = {
  replyTo: Message;
  onClose?: () => void;
  className?: string;
  isDM?: boolean;
};

export default function ChatQuote({ replyTo, onClose, className = "", isDM = false }: Props) {
    const { userProfile } = useUserProfile(isDM ? undefined : replyTo.userId);

    const getTruncatedName = (name: string | undefined) => {
        if (!name) return 'User';
        const nameParts = name.split(' ');
        return nameParts.slice(0, 2).join(' ');
    };

    const senderName = replyTo.isAnonymous ? "Anonymous User" : getTruncatedName(userProfile?.displayName);

  return (
    <div
      role="status"
      aria-label="Replying to message"
      className={cn(
        "relative text-white text-sm px-4 py-2 rounded-t-2xl rounded-b-lg mb-1 mx-2",
        className
      )}
      style={{ backgroundColor: '#424242' }}
    >
      {/* Close button */}
      {onClose && (
        <button
            aria-label="Cancel reply"
            onClick={onClose}
            className="absolute top-1 right-1 w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center text-white/70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/20 transition-colors"
        >
            <X size={14} />
        </button>
      )}

      {/* Quote text (selectable) */}
      <blockquote className="select-text whitespace-pre-wrap break-words leading-snug pr-8">
        <div className="flex items-center gap-2">
            <CornerRightDown className="inline-block h-4 w-4 shrink-0 text-slate-400" />
            <div className="flex-1 overflow-hidden">
                {!isDM && <p className="font-semibold text-xs text-slate-300 truncate">{senderName}</p>}
                <p className="text-slate-300 line-clamp-1">{replyTo.content || "Voice message"}</p>
            </div>
        </div>
      </blockquote>
    </div>
  );
}
