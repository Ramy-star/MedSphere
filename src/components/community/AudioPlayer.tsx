'use client';
import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AudioPlayerProps {
  src: string;
  className?: string;
}

const formatTime = (time: number) => {
  if (isNaN(time) || !isFinite(time) || time < 0) {
    return '0:00';
  }
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export function AudioPlayer({ src, className }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleCanPlay = () => {
        setIsLoading(false);
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('canplay', handleCanPlay);


    // Check if metadata is already loaded
    if (audio.readyState >= 1 && isFinite(audio.duration)) {
      handleLoadedMetadata();
    }


    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [src]);

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
  
  const handleSeek = (event: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || duration === 0) return;

    const progressBar = event.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const newTime = (x / rect.width) * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };


  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={cn("flex items-center gap-3 w-full max-w-[250px]", className)}>
        <audio ref={audioRef} src={src} preload="metadata" />
        <button onClick={togglePlayPause} className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-blue-500 text-white disabled:bg-slate-400" disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <div className="flex-grow flex items-center gap-2">
            <div className="w-full h-1.5 bg-slate-500/30 rounded-full cursor-pointer" onClick={handleSeek}>
                <div 
                    className="h-full bg-blue-500 rounded-full" 
                    style={{ width: `${progress}%` }}
                />
            </div>
            <span className="text-xs text-slate-400 font-mono w-16 text-right">
                {isPlaying ? formatTime(currentTime) : formatTime(duration)}
            </span>
        </div>
    </div>
  );
}
