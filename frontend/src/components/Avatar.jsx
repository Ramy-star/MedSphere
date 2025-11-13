/**
 * Interactive Avatar Component
 * Visual representation of the AI assistant with animated states:
 * - idle: Default state with gentle floating animation
 * - listening: Eyes widen, glowing effect, audio visualizer active
 * - thinking: Pulsing animation with thoughtful expression
 * - speaking: Mouth animates with audio playback, synchronized movement
 *
 * Props:
 * - state: 'idle' | 'listening' | 'thinking' | 'speaking' (default: 'idle')
 * - audioLevel: Number (0-100) for mouth/visualizer animation during speaking
 * - onStateChange: Callback when internal state changes (optional)
 */

import React, { useState, useEffect, useRef } from 'react';

const Avatar = ({
  state = 'idle',
  audioLevel = 0,
  enableMicAnalysis = false,
  className = ''
}) => {
  const [blinkTimer, setBlinkTimer] = useState(0);
  const [floatY, setFloatY] = useState(0);
  const [floatX, setFloatX] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [mouseTilt, setMouseTilt] = useState(0);
  const [eyePosition, setEyePosition] = useState({ x: 0, y: 0 });
  const [internalAudioLevel, setInternalAudioLevel] = useState(0);
  const [mood, setMood] = useState('happy');
  const [scale, setScale] = useState(1);
  const [wingFlap, setWingFlap] = useState(0);
  const [waveData, setWaveData] = useState([0, 0, 0, 0, 0]);

  const animationRef = useRef();
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const sourceRef = useRef(null);
  const audioAnimationRef = useRef(null);
  const containerRef = useRef(null);

  // Update mood based on state prop
  useEffect(() => {
    const moodMap = {
      idle: 'happy',
      listening: 'thinking',
      thinking: 'thinking',
      speaking: 'excited',
    };
    setMood(moodMap[state] || 'happy');
  }, [state]);

  // Use external audioLevel prop or internal mic analysis
  useEffect(() => {
    if (state === 'speaking' && audioLevel > 0) {
      setInternalAudioLevel(audioLevel);
      // Update wave data based on external audio level
      const randomWave = Array.from({ length: 5 }, () => Math.random() * (audioLevel / 100));
      setWaveData(randomWave);
    }
  }, [audioLevel, state]);

  // Setup audio analysis for microphone (listening state)
  const setupAudio = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('getUserMedia not supported');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      sourceRef.current.connect(analyserRef.current);
      dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
      audioProcessLoop();
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  };

  const audioProcessLoop = () => {
    if (!analyserRef.current || !dataArrayRef.current) return;

    analyserRef.current.getByteTimeDomainData(dataArrayRef.current);

    // Sample wave data
    const newWaveData = [
      dataArrayRef.current[10],
      dataArrayRef.current[30],
      dataArrayRef.current[50],
      dataArrayRef.current[70],
      dataArrayRef.current[90],
    ];
    const normalizedData = newWaveData.map(val => Math.abs(val - 128) / 128);
    setWaveData(normalizedData);

    // Calculate average volume
    let sum = 0;
    for (let i = 0; i < dataArrayRef.current.length; i++) {
      sum += Math.abs(dataArrayRef.current[i] - 128);
    }
    const avg = sum / dataArrayRef.current.length;

    // Smooth audio level
    setInternalAudioLevel(prevLevel => prevLevel + (avg - prevLevel) * 0.2);

    audioAnimationRef.current = requestAnimationFrame(audioProcessLoop);
  };

  const stopAudio = () => {
    if (audioAnimationRef.current) {
      cancelAnimationFrame(audioAnimationRef.current);
    }
    if (sourceRef.current) {
      if (sourceRef.current.mediaStream) {
        sourceRef.current.mediaStream.getTracks().forEach(track => track.stop());
      }
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setWaveData([0, 0, 0, 0, 0]);

    const decay = () => {
      setInternalAudioLevel(prevLevel => {
        const newLevel = prevLevel * 0.8;
        if (newLevel < 0.1) return 0;
        requestAnimationFrame(decay);
        return newLevel;
      });
    };
    decay();
  };

  // Start/stop audio analysis based on state
  useEffect(() => {
    if (state === 'listening' && enableMicAnalysis) {
      setupAudio();
    } else if (state !== 'speaking') {
      stopAudio();
    }
    return () => {
      stopAudio();
    };
  }, [state, enableMicAnalysis]);

  // Mouse tracking for eye movement and head tilt
  useEffect(() => {
    const handleMouseMove = (e) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const angleX = ((e.clientX - centerX) / window.innerWidth) * 15;
        const angleY = ((e.clientY - centerY) / window.innerHeight) * 10;
        setEyePosition({
          x: Math.max(-10, Math.min(10, angleX)),
          y: Math.max(-5, Math.min(5, angleY))
        });

        const tiltX = ((e.clientX - centerX) / window.innerWidth) * 30;
        setMouseTilt(tiltX * 0.2);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Floating animation and wing flap
  useEffect(() => {
    let time = 0;
    let wingTime = 0;
    const animate = () => {
      time += 0.02;
      setFloatY(Math.sin(time) * 15 + Math.sin(time * 2.3) * 5);
      setFloatX(Math.cos(time * 0.7) * 10 + Math.sin(time * 1.5) * 3);
      setRotation(Math.sin(time * 0.5) * 3);
      setScale(1 + Math.sin(time * 2) * 0.02);

      const flapSpeed = state === 'speaking' ? 0.2 : 0.05;
      wingTime += flapSpeed;
      setWingFlap(Math.sin(wingTime) * 15);

      animationRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [state]);

  // Blink animation
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      if (document.hasFocus()) {
        const shouldBlink = Math.random() > 0.7;
        if (shouldBlink) {
          setBlinkTimer(1);
          setTimeout(() => setBlinkTimer(0), 150);
        }
      }
    }, 2000);
    return () => clearInterval(blinkInterval);
  }, []);

  // Styling
  const getBodyGradient = () => {
    const gradients = {
      happy: 'linear-gradient(140deg, #FFF8E1 0%, #FFECB3 50%, #FFD54F 100%)',
      excited: 'linear-gradient(140deg, #C8E6C9 0%, #A5D6A7 50%, #81C784 100%)',
      thinking: 'linear-gradient(140deg, #E1F5FE 0%, #B3E5FC 50%, #81D4FA 100%)',
      surprised: 'linear-gradient(140deg, #F3E5F5 0%, #E1BEE7 50%, #CE93D8 100%)'
    };
    return gradients[mood];
  };

  const avatarContainerStyle = {
    transform: `
      translateY(${floatY}px)
      translateX(${floatX}px)
      rotate(${rotation + mouseTilt}deg)
      scale(${scale})
    `
  };

  const bodyStyle = {
    background: getBodyGradient(),
  };

  const eyeStyle = {
    height: blinkTimer ? '2px' : '40px',
    borderRadius: blinkTimer ? '50%' : '50% / 60%',
    transform: `scaleY(${1 + (scale - 1) * 3})`,
  };

  const pupilSize = {
    happy: 20,
    excited: 22,
    thinking: 18,
    surprised: 24,
  }[mood];

  const pupilStyle = {
    display: blinkTimer ? 'none' : 'block',
    transform: `translate(-50%, -50%) translate(${eyePosition.x}px, ${eyePosition.y}px)`,
    width: `${pupilSize}px`,
    height: `${pupilSize}px`,
    transition: 'transform 0.2s ease, width 0.3s ease, height 0.3s ease'
  };

  const eyeHighlightStyle = {
    display: blinkTimer ? 'none' : 'block',
  };

  const eyebrowStyle = {
    transform: `translateX(-50%) rotate(${
      mood === 'surprised' ? '-15deg' :
      mood === 'excited' ? '-8deg' :
      mood === 'thinking' ? '5deg' :
      '0deg'
    })`,
  };

  const mouthOpenness = Math.min(1, internalAudioLevel / 30);
  const mouthHeight = state === 'speaking' ? (10 + mouthOpenness * 30) : (mood === 'surprised' ? 30 : 10);
  const mouthWidth = state === 'speaking' ? (25 + mouthOpenness * 20) : (mood === 'surprised' ? 30 : 45);

  const mouthStyle = {
    width: `${mouthWidth}px`,
    height: `${mouthHeight}px`,
    borderRadius: state === 'speaking' || mood === 'surprised' ? '50%' : '0 0 30px 30px',
    backgroundColor: state === 'speaking' ? '#E91E63' : 'transparent',
    borderLeft: state === 'speaking' ? 'none' : '3px solid rgba(0, 0, 0, 0.4)',
    borderRight: state === 'speaking' ? 'none' : '3px solid rgba(0, 0, 0, 0.4)',
    borderBottom: state === 'speaking' ? 'none' : '3px solid rgba(0, 0, 0, 0.4)',
    borderTop: 'none',
    backgroundClip: 'padding-box',
  };

  const mouthHighlightStyle = {
    display: state === 'speaking' ? 'block' : 'none',
    opacity: 0.5 + mouthOpenness * 0.5,
  };

  const cheekStyle = {
    animation: (mood === 'happy' || mood === 'excited') ? 'cheek-pulse 2s infinite ease-in-out' : 'none',
    opacity: (mood === 'happy' || mood === 'excited') ? 1 : 0.6,
  };

  const baseWingRotation = floatY * 0.3;

  const wingLeftStyle = {
    opacity: (state === 'listening' || state === 'speaking') ? 0.8 : 0.3,
    transform: `rotate(${-20 + baseWingRotation + wingFlap}deg) scale(1, ${1 - (floatY / 80)})`,
  };

  const wingRightStyle = {
    opacity: (state === 'listening' || state === 'speaking') ? 0.8 : 0.3,
    transform: `rotate(${20 - baseWingRotation - wingFlap}deg) scale(1, ${1 + (floatY / 80)})`,
  };

  const glowBaseOpacity = { happy: 0.5, excited: 0.7, thinking: 0.3, surprised: 0.8 }[mood];
  const glowPulse = state === 'speaking' ? mouthOpenness * 0.3 : 0;

  const glowStyle = {
    opacity: glowBaseOpacity + glowPulse,
    transform: `scale(${1 + glowPulse * 0.1})`,
  };

  const soundWaveStyle = {
    opacity: (state === 'listening' || state === 'speaking') ? 1 : 0,
  };

  const particleColor = {
    happy: 'radial-gradient(circle, #FFF176 0%, #FFD54F 100%)',
    excited: 'radial-gradient(circle, #C8E6C9 0%, #81C784 100%)',
    thinking: 'radial-gradient(circle, #B3E5FC 0%, #81D4FA 100%)',
    surprised: 'radial-gradient(circle, #E1BEE7 0%, #CE93D8 100%)'
  }[mood];

  return (
    <>
      <style>{`
        .avatar-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .avatar-container-inner {
          position: relative;
          width: 280px;
          height: 280px;
          cursor: pointer;
          filter: drop-shadow(0 20px 40px rgba(0, 0, 0, 0.15));
          transition: filter 0.3s ease, transform 0.1s ease-out;
        }

        .avatar-container-inner:hover {
          filter: drop-shadow(0 25px 50px rgba(0, 0, 0, 0.2));
        }

        .avatar-body {
          width: 100%;
          height: 100%;
          border-radius: 45% 55% 50% 50% / 60% 60% 40% 40%;
          position: relative;
          animation: morphing 8s ease-in-out infinite;
          transition: background 1s ease;
          box-shadow:
            inset 0 20px 30px rgba(255, 255, 255, 0.2),
            0 10px 20px rgba(0, 0, 0, 0.1);
        }

        .face-container {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80%;
          height: 80%;
        }

        .eye-container {
          position: absolute;
          top: 38%;
          width: 100%;
          display: flex;
          justify-content: center;
          gap: 60px;
        }

        .eye {
          position: relative;
          width: 35px;
          background: #FFFFFF;
          transition: height 0.1s ease, transform 0.05s ease-out;
          box-shadow: inset 0 3px 8px rgba(0, 0, 0, 0.2);
        }

        .pupil {
          position: absolute;
          background: radial-gradient(circle, #3498db 30%, #2980b9 100%);
          border-radius: 50%;
          top: 50%;
          left: 50%;
          transition: transform 0.2s ease, width 0.3s ease, height 0.3s ease;
          box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
        }

        .sparkle {
          position: absolute;
          width: 7px;
          height: 7px;
          background: white;
          border-radius: 50%;
          top: 8px;
          right: 6px;
          animation: sparkle 2s infinite;
          z-index: 1;
        }

        .eyebrow {
          position: absolute;
          width: 45px;
          height: 8px;
          background: rgba(0, 0, 0, 0.08);
          border-radius: 50px;
          top: -15px;
          left: 50%;
          transition: transform 0.3s ease;
        }

        .mouth {
          position: absolute;
          bottom: 28%;
          left: 50%;
          transform: translateX(-50%);
          transition: all 0.1s ease-out;
          box-shadow: inset 0 3px 8px rgba(0, 0, 0, 0.3);
          overflow: hidden;
        }

        .mouth-highlight {
          position: absolute;
          bottom: 5px;
          left: 50%;
          transform: translateX(-50%);
          width: 70%;
          height: 50%;
          background: #F06292;
          border-radius: 50%;
          transition: opacity 0.1s ease;
        }

        .cheek {
          position: absolute;
          width: 55px;
          height: 40px;
          background: radial-gradient(circle, rgba(255, 105, 180, 0.5) 0%, rgba(255, 105, 180, 0) 70%);
          border-radius: 50%;
          top: 45%;
          transition: opacity 0.5s ease, transform 1s ease-in-out;
        }

        .cheek.left { left: 10%; }
        .cheek.right { right: 10%; }

        .particle {
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: float-particle 3s infinite ease-in-out;
          pointer-events: none;
        }

        .wing {
          position: absolute;
          width: 80px;
          height: 120px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.05) 100%);
          backdrop-filter: blur(5px);
          border-radius: 50% 10% 50% 10%;
          top: 30%;
          transition: opacity 0.5s ease, transform 0.1s ease-out;
        }

        .wing.left {
          left: -30px;
          transform: rotate(-20deg);
        }

        .wing.right {
          right: -30px;
          transform: rotate(20deg);
        }

        .glow {
          position: absolute;
          width: 120%;
          height: 120%;
          top: -10%;
          left: -10%;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%);
          transition: opacity 0.3s ease, transform 0.1s ease-out;
          animation: pulse 2s infinite;
          z-index: -1;
        }

        .sound-wave {
          position: absolute;
          bottom: -60px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 5px;
          transition: opacity 0.3s ease-out;
        }

        .wave-bar {
          width: 4px;
          height: 30px;
          background: linear-gradient(to top, #B3E5FC, #E1F5FE);
          border-radius: 2px;
          transition: transform 0.05s ease-out;
          transform: scaleY(0.1);
        }

        @keyframes morphing {
          0%, 100% { border-radius: 45% 55% 50% 50% / 60% 60% 40% 40%; }
          25% { border-radius: 55% 45% 55% 45% / 55% 60% 40% 45%; }
          50% { border-radius: 50% 50% 45% 55% / 65% 55% 45% 35%; }
          75% { border-radius: 40% 60% 60% 40% / 60% 40% 40% 60%; }
        }

        @keyframes sparkle {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }

        @keyframes float-particle {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translateY(-100px) translateX(${Math.random() * 100 - 50}px); opacity: 0; }
        }

        @keyframes cheek-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.05); opacity: 1; }
        }
      `}</style>

      <div className={`avatar-wrapper ${className}`}>
        <div
          ref={containerRef}
          className="avatar-container-inner"
          style={avatarContainerStyle}
        >
          <div className="glow" style={glowStyle}></div>

          <div className="wing left" style={wingLeftStyle}></div>
          <div className="wing right" style={wingRightStyle}></div>

          <div className="avatar-body" style={bodyStyle}>
            <div className="face-container">
              <div className="eye-container">
                <div className="eye" style={eyeStyle}>
                  <div className="eyebrow" style={eyebrowStyle}></div>
                  <div className="pupil" style={pupilStyle}></div>
                  <div className="sparkle" style={eyeHighlightStyle}></div>
                </div>
                <div className="eye" style={eyeStyle}>
                  <div className="eyebrow" style={eyebrowStyle}></div>
                  <div className="pupil" style={pupilStyle}></div>
                  <div className="sparkle" style={eyeHighlightStyle}></div>
                </div>
              </div>

              <div className="cheek left" style={cheekStyle}></div>
              <div className="cheek right" style={cheekStyle}></div>

              <div className="mouth" style={mouthStyle}>
                <div className="mouth-highlight" style={mouthHighlightStyle}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="sound-wave" style={soundWaveStyle}>
          {waveData.map((data, index) => (
            <div
              key={index}
              className="wave-bar"
              style={{
                transform: `scaleY(${0.1 + data * 2.0})`
              }}
            ></div>
          ))}
        </div>

        {(state === 'listening' || state === 'speaking') && Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              background: particleColor,
              left: `${50 + (i - 2) * 15}%`,
              bottom: '200px',
              animationDelay: `${i * 0.5}s`
            }}
          ></div>
        ))}
      </div>
    </>
  );
};

export default Avatar;
