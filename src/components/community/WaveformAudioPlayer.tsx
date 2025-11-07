'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WaveformAudioPlayerProps {
  src: string;
  className?: string;
  isCurrentUser: boolean;
}

const formatTime = (time: number) => {
  if (isNaN(time) || !isFinite(time) || time < 0) {
    return '0:00';
  }
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const WAVEFORM_BARS = 100;

export function WaveformAudioPlayer({ src, className, isCurrentUser }: WaveformAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [waveform, setWaveform] = useState<number[]>([]);

  const drawWaveform = useCallback((normalizedData: number[], progress: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);

    const barWidth = rect.width / WAVEFORM_BARS;
    const barGap = barWidth * 0.2;
    const realBarWidth = barWidth - barGap;
    const centerY = rect.height / 2;

    ctx.clearRect(0, 0, rect.width, rect.height);
    
    const playedColor = isCurrentUser ? '#FFFFFF' : '#3b82f6';
    const unplayedColor = isCurrentUser ? 'rgba(255, 255, 255, 0.4)' : 'rgba(59, 130, 246, 0.4)';


    for (let i = 0; i < WAVEFORM_BARS; i++) {
        const x = i * barWidth + barGap / 2;
        const barHeight = Math.max(1, normalizedData[i] * rect.height);
        
        const currentBarProgress = i / WAVEFORM_BARS;
        ctx.fillStyle = currentBarProgress < progress ? playedColor : unplayedColor;

        ctx.fillRect(x, centerY - barHeight / 2, realBarWidth, barHeight);
    }
  }, [isCurrentUser]);

  useEffect(() => {
    const processAudio = async () => {
      try {
        setIsLoading(true);
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const response = await fetch(src);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const rawData = audioBuffer.getChannelData(0);
        const samples = WAVEFORM_BARS;
        const blockSize = Math.floor(rawData.length / samples);
        const filteredData = [];
        for (let i = 0; i < samples; i++) {
          let blockStart = blockSize * i;
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(rawData[blockStart + j]);
          }
          filteredData.push(sum / blockSize);
        }

        const max = Math.max(...filteredData);
        const normalizedData = filteredData.map(n => n / max);
        setWaveform(normalizedData);
      } catch (error) {
        console.error("Error processing audio:", error);
      } finally {
        setIsLoading(false);
      }
    };
    processAudio();
  }, [src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    if (audio.readyState >= 1 && isFinite(audio.duration)) handleLoadedMetadata();

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [src]);

  useEffect(() => {
    if (waveform.length > 0) {
      drawWaveform(waveform, currentTime / duration);
    }
  }, [waveform, currentTime, duration, drawWaveform]);

  const togglePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(err => console.error("Audio play failed:", err));
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const audio = audioRef.current;
    if (!audio || duration === 0 || isLoading) return;
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const newTime = (x / rect.width) * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };
  
  const playButtonColor = isCurrentUser ? 'bg-white text-blue-600' : 'bg-blue-500 text-white';

  return (
    <div className={cn("flex items-center gap-3 w-full max-w-[250px]", className)}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        onClick={togglePlayPause}
        className={cn(
          "flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full transition-colors",
          playButtonColor,
          "disabled:bg-slate-400"
        )}
        disabled={isLoading || waveform.length === 0}
      >
        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : isPlaying ? <Pause size={20} /> : <Play size={20} className="translate-x-0.5" />}
      </button>
      <div className="flex-grow flex flex-col justify-center">
        <canvas
          ref={canvasRef}
          className="w-full h-10 cursor-pointer"
          onMouseDown={handleSeek}
        />
        <div className={cn("text-xs font-mono", isCurrentUser ? "text-slate-200/80" : "text-slate-400")}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>
    </div>
  );
}
