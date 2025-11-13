/**
 * Recorder Button Component
 * Large microphone button for voice recording
 * Features:
 * - Start/stop recording with visual feedback
 * - Recording timer
 * - Animated pulse effect while recording
 * - Error handling for microphone access
 * - Fallback to file upload if mic unavailable
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  MicrophoneIcon,
  StopIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/solid';

const RecorderButton = ({ onRecordingComplete, onRecordingStart, onRecordingStop, disabled = false }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState(null);
  const [micAvailable, setMicAvailable] = useState(true);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Check microphone availability on mount
  useEffect(() => {
    checkMicrophoneAvailability();
  }, []);

  const checkMicrophoneAvailability = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMicAvailable(false);
        return;
      }
      // Just check, don't request permission yet
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasAudioInput = devices.some(device => device.kind === 'audioinput');
      setMicAvailable(hasAudioInput);
    } catch (err) {
      console.error('Error checking microphone:', err);
      setMicAvailable(false);
    }
  };

  const startRecording = async () => {
    try {
      setError(null);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/ogg',
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([blob], 'recording.webm', {
          type: 'audio/webm',
        });

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());

        // Callback with audio file
        if (onRecordingComplete) {
          onRecordingComplete(audioFile);
        }

        setIsRecording(false);
        setRecordingTime(0);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);

      // Start timer
      let time = 0;
      timerRef.current = setInterval(() => {
        time += 1;
        setRecordingTime(time);
      }, 1000);

      if (onRecordingStart) {
        onRecordingStart();
      }
    } catch (err) {
      console.error('Recording error:', err);
      setError(err.message || 'Failed to access microphone');
      setMicAvailable(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      if (onRecordingStop) {
        onRecordingStop();
      }
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (file && onRecordingComplete) {
      onRecordingComplete(file);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // If microphone not available, show upload button
  if (!micAvailable) {
    return (
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="w-16 h-16 rounded-full bg-primary-500 hover:bg-primary-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          title="Upload audio file"
          aria-label="Upload audio"
        >
          <ArrowUpTrayIcon className="w-8 h-8" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileUpload}
          className="hidden"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-[200px]">
          Microphone unavailable. Upload audio file instead.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        {/* Pulse ring animation when recording */}
        {isRecording && (
          <div className="absolute inset-0 rounded-full bg-red-500 pulse-ring"></div>
        )}

        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={disabled}
          className={`
            relative w-16 h-16 rounded-full shadow-lg hover:shadow-xl
            transition-all duration-200 flex items-center justify-center
            disabled:opacity-50 disabled:cursor-not-allowed
            ${isRecording
              ? 'bg-red-500 hover:bg-red-600 animate-pulse'
              : 'bg-primary-500 hover:bg-primary-600'
            }
            text-white
          `}
          title={isRecording ? 'Stop recording' : 'Start recording'}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        >
          {isRecording ? (
            <StopIcon className="w-8 h-8" />
          ) : (
            <MicrophoneIcon className="w-8 h-8" />
          )}
        </button>
      </div>

      {/* Recording timer */}
      {isRecording && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 font-medium">
          <div className="w-2 h-2 bg-red-600 dark:bg-red-400 rounded-full animate-pulse"></div>
          {formatTime(recordingTime)}
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 text-center max-w-[200px]">
          {error}
        </p>
      )}

      {/* File upload fallback */}
      {!isRecording && (
        <>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            Or upload audio file
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </>
      )}
    </div>
  );
};

export default RecorderButton;
