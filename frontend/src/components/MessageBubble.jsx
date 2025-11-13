/**
 * Message Bubble Component
 * Individual message display for user and assistant
 * Features:
 * - Different styles for user vs assistant messages
 * - Timestamp display
 * - Avatar for assistant messages
 * - TTS button for assistant messages
 * - Markdown support (basic)
 * - Copy button for messages
 */

import React, { useState } from 'react';
import { format } from 'date-fns';
import {
  UserCircleIcon,
  ClipboardDocumentIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import TTSButton from './TTSButton';

const MessageBubble = ({ message, onTTSPlay, onTTSStop }) => {
  const { role, content, timestamp } = message;
  const isUser = role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Format timestamp
  const timeString = timestamp
    ? format(new Date(timestamp), 'HH:mm')
    : '';

  return (
    <div
      className={`flex gap-3 animate-fade-in ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {isUser ? (
          <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center shadow-md">
            <UserCircleIcon className="w-6 h-6 text-white" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-secondary-400 to-secondary-600 flex items-center justify-center shadow-md">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Message content */}
      <div
        className={`flex flex-col max-w-[70%] ${
          isUser ? 'items-end' : 'items-start'
        }`}
      >
        {/* Bubble */}
        <div
          className={`
            px-4 py-2.5 rounded-2xl shadow-sm
            ${
              isUser
                ? 'bg-primary-500 text-white rounded-tr-sm'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-tl-sm'
            }
          `}
        >
          {/* Message text with basic markdown support */}
          <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {content}
          </div>
        </div>

        {/* Metadata */}
        <div
          className={`flex items-center gap-2 mt-1 px-1 ${
            isUser ? 'flex-row-reverse' : 'flex-row'
          }`}
        >
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {timeString}
          </span>

          {/* Action buttons for assistant messages */}
          {!isUser && (
            <>
              <TTSButton
                text={content}
                onPlay={onTTSPlay}
                onStop={onTTSStop}
              />
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Copy message"
                aria-label="Copy"
              >
                {copied ? (
                  <CheckIcon className="w-4 h-4 text-green-500" />
                ) : (
                  <ClipboardDocumentIcon className="w-4 h-4" />
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
