import { useState, useEffect, useRef } from 'react';

interface PathfinderBotAvatarProps {
  size?: number;
}

export default function PathfinderBotAvatar({ size = 80 }: PathfinderBotAvatarProps) {
  const [robotState, setRobotState] = useState<'idle' | 'waving' | 'happy'>('idle');
  const [screenMessage, setScreenMessage] = useState<'smile' | 'hi'>('smile');
  const waveInterval = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto wave animation
  useEffect(() => {
    const scheduleWave = () => {
      const delay = 3000 + Math.random() * 2000;
      waveInterval.current = setTimeout(() => {
        if (robotState === 'idle') {
          setRobotState('waving');
          setScreenMessage('hi');
          setTimeout(() => {
            setRobotState('idle');
            setScreenMessage('smile');
          }, 1500);
        }
        scheduleWave();
      }, delay);
    };
    
    scheduleWave();
    
    return () => {
      if (waveInterval.current) clearTimeout(waveInterval.current);
    };
  }, [robotState]);

  const isWaving = robotState === 'waving';
  const isHappy = robotState === 'happy';

  const scale = size / 80;

  return (
    <div style={{ width: size, height: size * 1.1 }}>
      <svg 
        width={size} 
        height={size * 1.1} 
        viewBox="0 0 80 88" 
        style={{ overflow: 'visible' }}
      >
        {/* Body */}
        <rect 
          x="22" 
          y="44" 
          width="36" 
          height="32" 
          rx="6" 
          fill="#e2e8f0" 
          stroke="#475569" 
          strokeWidth="1.5" 
        />
        
        {/* Chest Screen */}
        <rect 
          x="28" 
          y="50" 
          width="24" 
          height="16" 
          rx="3" 
          fill="#f8fafc" 
          stroke="#d97706" 
          strokeWidth="1.5" 
        />
        <rect 
          x="30" 
          y="52" 
          width="20" 
          height="12" 
          rx="2" 
          fill="#fef3c7" 
          opacity={isHappy ? 0.5 : 0.3}
        />
        
        {/* Screen Face */}
        {screenMessage === 'hi' ? (
          <>
            <text x="40" y="60" textAnchor="middle" fill="#475569" fontSize="8" fontWeight="bold">Hi!</text>
          </>
        ) : (
          <>
            <rect x="34" y="55" width="3" height="4" rx="0.5" fill="#475569" />
            <rect x="43" y="55" width="3" height="4" rx="0.5" fill="#475569" />
            <path d="M 36 62 Q 40 65 44 62" fill="none" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
          </>
        )}

        {/* Left Arm */}
        <rect 
          x="12" 
          y="48" 
          width="8" 
          height="20" 
          rx="4" 
          fill="#e2e8f0" 
          stroke="#475569" 
          strokeWidth="1.5" 
        />

        {/* Right Arm - Waves */}
        <g style={{ 
          transformOrigin: '68px 56px', 
          transform: isWaving ? 'rotate(-20deg)' : 'rotate(0deg)',
          transition: 'transform 0.3s ease'
        }}>
          <rect 
            x="60" 
            y="48" 
            width="8" 
            height="20" 
            rx="4" 
            fill="#e2e8f0" 
            stroke="#475569" 
            strokeWidth="1.5" 
          />
          {isWaving && (
            <animateTransform 
              attributeName="transform" 
              type="rotate" 
              values="0 68 56; -10 68 56; 0 68 56" 
              dur="0.25s" 
              repeatCount="indefinite" 
              additive="sum"
            />
          )}
        </g>

        {/* Neck */}
        <rect x="34" y="40" width="12" height="6" rx="2" fill="#475569" opacity="0.7" />

        {/* Head */}
        <g style={{ 
          transformOrigin: '40px 28px',
          animation: isHappy ? 'headBob 0.5s ease-in-out' : 'none'
        }}>
          <circle 
            cx="40" 
            cy="24" 
            r="18" 
            fill="#e2e8f0" 
            stroke="#475569" 
            strokeWidth="1.5" 
          />
          <circle 
            cx="40" 
            cy="24" 
            r="14" 
            fill="none" 
            stroke="#d97706" 
            strokeWidth="2" 
          />
          <circle 
            cx="40" 
            cy="24" 
            r="10" 
            fill="#475569" 
          />
          <circle 
            cx="40" 
            cy="24" 
            r="7" 
            fill="#f59e0b"
            style={{ filter: 'drop-shadow(0 0 4px #f59e0b)' }}
          />
          {/* Eye reflection */}
          <circle cx="37" cy="21" r="2" fill="white" opacity="0.8" />
          <circle cx="43" cy="27" r="1" fill="white" opacity="0.5" />
        </g>

        {/* Antenna */}
        <line x1="40" y1="6" x2="40" y2="2" stroke="#475569" strokeWidth="1.5" />
        <circle 
          cx="40" 
          cy="2" 
          r="2" 
          fill={isHappy ? "#fde68a" : "#475569"}
          style={{ filter: isHappy ? 'drop-shadow(0 0 3px #fde68a)' : 'none' }}
        >
          {isHappy && <animate attributeName="opacity" values="1;0.7;1" dur="0.5s" repeatCount="indefinite" />}
        </circle>

        <style>{`
          @keyframes headBob {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-2px); }
          }
        `}</style>
      </svg>
    </div>
  );
}
