/**
 * Chat Window Component
 * Main chat interface with message list and input area
 * Features:
 * - Scrollable message list
 * - Typing indicator
 * - Loading skeletons
 * - Message input with send button
 * - Voice recording integration
 * - Auto-scroll to latest message
 * - Empty state
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  PaperAirplaneIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/solid';
import MessageBubble from './MessageBubble';
import RecorderButton from './RecorderButton';
import Avatar from './Avatar';

const ChatWindow = ({
  messages,
  isLoading,
  isThinking,
  onSendMessage,
  onVoiceInput,
  avatarState = 'idle',
  avatarAudioLevel = 0,
  className = '',
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = () => {
    const text = inputValue.trim();
    if (text && !isLoading) {
      onSendMessage(text);
      setInputValue('');
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRecordingComplete = async (audioFile) => {
    setIsRecording(false);
    if (onVoiceInput) {
      await onVoiceInput(audioFile);
    }
  };

  const handleRecordingStart = () => {
    setIsRecording(true);
  };

  const handleRecordingStop = () => {
    setIsRecording(false);
  };

  // Typing indicator component
  const TypingIndicator = () => (
    <div className="flex gap-3 animate-fade-in">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-secondary-400 to-secondary-600 flex items-center justify-center shadow-md flex-shrink-0">
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
      <div className="flex items-center gap-1 px-4 py-3 rounded-2xl rounded-tl-sm bg-gray-100 dark:bg-gray-700">
        <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full typing-dot"></div>
        <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full typing-dot"></div>
        <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full typing-dot"></div>
      </div>
    </div>
  );

  // Loading skeleton component
  const MessageSkeleton = () => (
    <div className="flex gap-3 animate-fade-in">
      <div className="w-8 h-8 rounded-full skeleton"></div>
      <div className="flex-1 max-w-[70%] space-y-2">
        <div className="h-4 skeleton rounded w-3/4"></div>
        <div className="h-4 skeleton rounded w-1/2"></div>
      </div>
    </div>
  );

  // Empty state component
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <Avatar state={avatarState} audioLevel={avatarAudioLevel} className="mb-8" />

      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Welcome to Voice Assistant
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md">
        Start a conversation by typing a message or using the voice recorder below.
        I'm here to help with anything you need!
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl w-full">
        {[
          { icon: '💬', text: 'Ask me anything' },
          { icon: '🎤', text: 'Use voice commands' },
          { icon: '🤖', text: 'Get AI assistance' },
          { icon: '🌐', text: 'Natural conversations' },
        ].map((item, index) => (
          <div
            key={index}
            className="p-4 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
          >
            <div className="text-2xl mb-2">{item.icon}</div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {item.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const hasMessages = messages.length > 0;

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-800 ${className}`}>
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {hasMessages ? (
          <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
              />
            ))}

            {/* Thinking indicator */}
            {isThinking && <TypingIndicator />}

            {/* Loading skeleton */}
            {isLoading && !isThinking && <MessageSkeleton />}

            <div ref={messagesEndRef} />
          </div>
        ) : (
          <EmptyState />
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Voice recorder */}
          <div className="flex justify-center mb-4">
            <RecorderButton
              onRecordingComplete={handleRecordingComplete}
              onRecordingStart={handleRecordingStart}
              onRecordingStop={handleRecordingStop}
              disabled={isLoading || isRecording}
            />
          </div>

          {/* Text input */}
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                rows={1}
                disabled={isLoading || isRecording}
                className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  minHeight: '48px',
                  maxHeight: '120px',
                }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
              />
            </div>

            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading || isRecording}
              className="p-3 rounded-xl bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95"
              title="Send message (Enter)"
              aria-label="Send message"
            >
              {isLoading ? (
                <ArrowPathIcon className="w-6 h-6 animate-spin" />
              ) : (
                <PaperAirplaneIcon className="w-6 h-6" />
              )}
            </button>
          </div>

          {/* Keyboard hint */}
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
