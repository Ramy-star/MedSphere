/**
 * Home Page Component
 * Main application page that combines all components
 * Features:
 * - Conversation management (create, switch, delete)
 * - Message handling (send, receive, TTS)
 * - Voice recording and transcription
 * - Model brain configuration
 * - LocalStorage persistence
 * - Settings modal
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  XMarkIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import { transcribeAudio, sendChat, requestTTS } from '../utils/api';

const Home = () => {
  // Theme state
  const [theme, setTheme] = useState('light');

  // Conversation state
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [messages, setMessages] = useState([]);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Model brain state
  const [modelBrain, setModelBrain] = useState('');
  const [useModelBrain, setUseModelBrain] = useState(true);

  // Avatar state
  const [avatarState, setAvatarState] = useState('idle');
  const [avatarAudioLevel, setAvatarAudioLevel] = useState(0);
  const audioRef = useRef(null);
  const audioIntervalRef = useRef(null);

  // Load data from localStorage on mount
  useEffect(() => {
    loadFromStorage();
    checkOnboarding();
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    saveToStorage();
  }, [conversations, modelBrain, useModelBrain, theme]);

  // Apply theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Load current conversation messages
  useEffect(() => {
    if (currentConversationId) {
      const conversation = conversations.find(c => c.id === currentConversationId);
      setMessages(conversation?.messages || []);
    } else {
      setMessages([]);
    }
  }, [currentConversationId, conversations]);

  const loadFromStorage = () => {
    try {
      const savedConversations = localStorage.getItem('conversations');
      const savedCurrentId = localStorage.getItem('currentConversationId');
      const savedModelBrain = localStorage.getItem('modelBrain');
      const savedUseModelBrain = localStorage.getItem('useModelBrain');
      const savedTheme = localStorage.getItem('theme');

      if (savedConversations) {
        setConversations(JSON.parse(savedConversations));
      }
      if (savedCurrentId) {
        setCurrentConversationId(savedCurrentId);
      }
      if (savedModelBrain) {
        setModelBrain(savedModelBrain);
      }
      if (savedUseModelBrain !== null) {
        setUseModelBrain(savedUseModelBrain === 'true');
      }
      if (savedTheme) {
        setTheme(savedTheme);
      }
    } catch (error) {
      console.error('Failed to load from storage:', error);
    }
  };

  const saveToStorage = () => {
    try {
      localStorage.setItem('conversations', JSON.stringify(conversations));
      localStorage.setItem('currentConversationId', currentConversationId || '');
      localStorage.setItem('modelBrain', modelBrain);
      localStorage.setItem('useModelBrain', useModelBrain.toString());
      localStorage.setItem('theme', theme);
    } catch (error) {
      console.error('Failed to save to storage:', error);
    }
  };

  const checkOnboarding = () => {
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
      localStorage.setItem('hasSeenOnboarding', 'true');
    }
  };

  // Conversation management
  const createNewConversation = () => {
    const newConv = {
      id: Date.now().toString(),
      title: 'New Conversation',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setConversations([newConv, ...conversations]);
    setCurrentConversationId(newConv.id);
    setIsMobileSidebarOpen(false);
  };

  const selectConversation = (id) => {
    setCurrentConversationId(id);
    setIsMobileSidebarOpen(false);
  };

  const deleteConversation = (id) => {
    const newConversations = conversations.filter(c => c.id !== id);
    setConversations(newConversations);
    if (id === currentConversationId) {
      setCurrentConversationId(newConversations[0]?.id || null);
    }
  };

  const updateConversation = (id, updates) => {
    setConversations(conversations.map(conv =>
      conv.id === id
        ? { ...conv, ...updates, updatedAt: Date.now() }
        : conv
    ));
  };

  // Message management
  const addMessage = (role, content) => {
    const newMessage = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: Date.now(),
    };

    if (!currentConversationId) {
      createNewConversation();
    }

    const convId = currentConversationId || Date.now().toString();
    const conversation = conversations.find(c => c.id === convId);
    const updatedMessages = [...(conversation?.messages || []), newMessage];

    // Auto-generate title from first user message
    let title = conversation?.title || 'New Conversation';
    if (role === 'user' && updatedMessages.length === 1) {
      title = content.substring(0, 50) + (content.length > 50 ? '...' : '');
    }

    updateConversation(convId, {
      messages: updatedMessages,
      title,
    });

    return newMessage;
  };

  // Send message handler
  const handleSendMessage = async (text) => {
    if (!text.trim()) return;

    try {
      setIsLoading(true);
      setIsThinking(true);
      setAvatarState('thinking');

      // Add user message
      addMessage('user', text);

      // Prepare prompt with model brain
      const prompt = useModelBrain && modelBrain
        ? `${modelBrain}\n\n${text}`
        : text;

      // Send to chat API
      const { response } = await sendChat(text, {
        modelBrain: useModelBrain ? modelBrain : '',
        conversationId: currentConversationId,
      });

      setIsThinking(false);

      // Add assistant message
      addMessage('assistant', response);

      // Request TTS and play
      setAvatarState('speaking');
      const { audioUrl } = await requestTTS(response);

      // Play audio and animate avatar
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      // Analyze audio for avatar animation
      if (window.AudioContext) {
        try {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const source = audioContext.createMediaElementSource(audio);
          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          analyser.connect(audioContext.destination);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);

          const updateAudioLevel = () => {
            analyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
            setAvatarAudioLevel(average);

            if (!audio.paused) {
              audioIntervalRef.current = requestAnimationFrame(updateAudioLevel);
            }
          };

          audio.onplay = () => {
            updateAudioLevel();
          };
        } catch (err) {
          console.warn('Web Audio API not available:', err);
        }
      }

      audio.onended = () => {
        setAvatarState('idle');
        setAvatarAudioLevel(0);
        if (audioIntervalRef.current) {
          cancelAnimationFrame(audioIntervalRef.current);
        }
      };

      await audio.play();

    } catch (error) {
      console.error('Send message error:', error);
      addMessage('assistant', `Sorry, I encountered an error: ${error.message}`);
      setAvatarState('idle');
    } finally {
      setIsLoading(false);
      setIsThinking(false);
    }
  };

  // Voice input handler
  const handleVoiceInput = async (audioFile) => {
    try {
      setIsLoading(true);
      setAvatarState('listening');

      // Transcribe audio
      const { text } = await transcribeAudio(audioFile);

      setAvatarState('idle');

      // Send transcribed text as message
      if (text) {
        await handleSendMessage(text);
      } else {
        alert('Could not transcribe audio. Please try again.');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Voice input error:', error);
      alert(`Transcription failed: ${error.message}`);
      setAvatarState('idle');
      setIsLoading(false);
    }
  };

  // Export/import conversations
  const handleExportConversations = () => {
    const dataStr = JSON.stringify(conversations, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `voice-assistant-conversations-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportConversations = (data) => {
    try {
      if (Array.isArray(data)) {
        setConversations([...data, ...conversations]);
        alert('Conversations imported successfully!');
      } else {
        alert('Invalid data format');
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('Failed to import conversations');
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Navbar
        theme={theme}
        onThemeToggle={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        onSettingsClick={() => setIsSettingsOpen(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          conversations={conversations}
          currentConversationId={currentConversationId}
          onSelectConversation={selectConversation}
          onNewConversation={createNewConversation}
          onDeleteConversation={deleteConversation}
          onExportConversations={handleExportConversations}
          onImportConversations={handleImportConversations}
          isMobileOpen={isMobileSidebarOpen}
          onMobileToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        <ChatWindow
          messages={messages}
          isLoading={isLoading}
          isThinking={isThinking}
          onSendMessage={handleSendMessage}
          onVoiceInput={handleVoiceInput}
          avatarState={avatarState}
          avatarAudioLevel={avatarAudioLevel}
          className="flex-1"
        />
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Settings & Model Brain
              </h2>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <XMarkIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <div className="space-y-6">
                {/* Model Brain Section */}
                <div>
                  <div className="flex items-start gap-2 mb-3">
                    <InformationCircleIcon className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        Model Brain
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Define the AI's personality, behavior, and instructions. This context
                        will be included with every message you send.
                      </p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useModelBrain}
                        onChange={(e) => setUseModelBrain(e.target.checked)}
                        className="w-4 h-4 text-primary-500 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Enable Model Brain
                      </span>
                    </label>
                  </div>

                  <textarea
                    value={modelBrain}
                    onChange={(e) => setModelBrain(e.target.value)}
                    placeholder="Example:&#10;You are a helpful assistant named Alex.&#10;Age: 25&#10;Profession: AI Engineer&#10;Tone: Friendly and professional&#10;Always respond concisely and clearly.&#10;When asked in Arabic, respond in Egyptian Arabic."
                    rows={12}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {/* Tips */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                    💡 Tips for Model Brain
                  </h4>
                  <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1 list-disc list-inside">
                    <li>Define a clear name and personality</li>
                    <li>Specify the tone (casual, formal, friendly, etc.)</li>
                    <li>Include language preferences</li>
                    <li>Add any constraints or special instructions</li>
                    <li>Keep it concise for better results</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="btn btn-primary"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Onboarding Tooltip */}
      {showOnboarding && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Welcome! 👋
            </h2>
            <div className="space-y-3 text-gray-700 dark:text-gray-300 mb-6">
              <p className="flex items-start gap-2">
                <span className="text-2xl">💬</span>
                <span className="text-sm">
                  <strong>Type or speak</strong> to start a conversation
                </span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-2xl">🎤</span>
                <span className="text-sm">
                  <strong>Press the microphone</strong> to record voice messages
                </span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-2xl">⚙️</span>
                <span className="text-sm">
                  <strong>Open settings</strong> to customize the AI's personality
                </span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-2xl">🌙</span>
                <span className="text-sm">
                  <strong>Toggle theme</strong> for dark or light mode
                </span>
              </p>
            </div>
            <button
              onClick={() => setShowOnboarding(false)}
              className="w-full btn btn-primary"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
