/**
 * TTS Button Component
 * Button to play text-to-speech audio for a message
 * Features:
 * - Play/pause/replay audio
 * - Loading state while fetching audio
 * - Error handling
 * - Automatic cleanup of audio resources
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  SpeakerWaveIcon,
  StopIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { requestTTS, revokeBlobUrl } from '../utils/api';

const TTSButton = ({ text, onPlay, onStop, className = '' }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const audioRef = useRef(null);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioUrl) {
        revokeBlobUrl(audioUrl);
      }
    };
  }, [audioUrl]);

  const handlePlay = async () => {
    try {
      setError(null);

      // If audio already loaded, just play it
      if (audioUrl && audioRef.current) {
        audioRef.current.play();
        setIsPlaying(true);
        if (onPlay) onPlay();
        return;
      }

      // Request new audio
      setIsLoading(true);
      const { audioUrl: url } = await requestTTS(text);

      setAudioUrl(url);

      // Create and play audio
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
        if (onStop) onStop();
      };

      audio.onerror = () => {
        setError('Failed to play audio');
        setIsPlaying(false);
        setIsLoading(false);
        if (onStop) onStop();
      };

      await audio.play();
      setIsPlaying(true);
      if (onPlay) onPlay();
    } catch (err) {
      console.error('TTS error:', err);
      setError(err.message || 'Failed to generate speech');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      if (onStop) onStop();
    }
  };

  const handleRetry = () => {
    setError(null);
    setAudioUrl(null);
    if (audioRef.current) {
      audioRef.current = null;
    }
    handlePlay();
  };

  if (error) {
    return (
      <button
        onClick={handleRetry}
        className={`p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ${className}`}
        title="Retry speech generation"
        aria-label="Retry speech"
      >
        <ArrowPathIcon className="w-4 h-4" />
      </button>
    );
  }

  if (isLoading) {
    return (
      <div className={`p-1.5 ${className}`}>
        <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <button
      onClick={isPlaying ? handleStop : handlePlay}
      className={`p-1.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${className}`}
      title={isPlaying ? 'Stop speech' : 'Play speech'}
      aria-label={isPlaying ? 'Stop' : 'Play'}
    >
      {isPlaying ? (
        <StopIcon className="w-4 h-4" />
      ) : (
        <SpeakerWaveIcon className="w-4 h-4" />
      )}
    </button>
  );
};

export default TTSButton;
