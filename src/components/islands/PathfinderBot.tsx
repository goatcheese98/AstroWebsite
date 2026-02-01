import { useState, useCallback, useEffect, useRef } from 'react';

type RobotState = 'idle' | 'waving' | 'happy' | 'excited' | 'scanning' | 'love' | 'dragged';
type ScreenMessage = 'smile' | 'hi' | 'heart' | 'cool' | 'scan';

const MESSAGES: ScreenMessage[] = ['smile', 'hi', 'heart', 'cool', 'scan'];

const COLORS = {
  body: '#e2e8f0',
  bodyStroke: '#475569',
  eyeRing: '#d97706',
  eye: '#f59e0b',
  screen: '#fef3c7',
  screenActive: '#fde68a',
  accent: '#3b82f6',
};

export default function PathfinderBot() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [robotState, setRobotState] = useState<RobotState>('idle');
  const [screenMessage, setScreenMessage] = useState<ScreenMessage>('smile');
  const [isHovering, setIsHovering] = useState(false);
  const [scanLine, setScanLine] = useState(0);
  
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 }); // For head tracking
  const dragStart = useRef({ x: 0, y: 0 });
  const velocity = useRef({ x: 0, y: 0 });
  const lastPos = useRef({ x: 0, y: 0 });
  
  const waveInterval = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const returnAnimation = useRef<number | null>(null);

  // Track mouse for head movement
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      // Calculate offset from center (-1 to 1)
      const offsetX = (e.clientX - centerX) / (rect.width / 2);
      const offsetY = (e.clientY - centerY) / (rect.height / 2);
      
      // Clamp and scale down for subtle movement
      setMouseOffset({
        x: Math.max(-1, Math.min(1, offsetX)) * 8,
        y: Math.max(-1, Math.min(1, offsetY)) * 5,
      });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Auto wave and change messages
  useEffect(() => {
    const scheduleWave = () => {
      const delay = 4000 + Math.random() * 3000;
      waveInterval.current = setTimeout(() => {
        if (robotState === 'idle') {
          setRobotState('waving');
          setScreenMessage('hi');
          setTimeout(() => {
            setRobotState('idle');
            setScreenMessage('smile');
          }, 2000);
        }
        scheduleWave();
      }, delay);
    };
    
    scheduleWave();
    
    messageInterval.current = setInterval(() => {
      if (robotState === 'idle') {
        const nextMsg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
        setScreenMessage(nextMsg);
        if (nextMsg === 'scan') {
          setRobotState('scanning');
          let scanPos = 0;
          const scanAnim = setInterval(() => {
            scanPos += 5;
            setScanLine(scanPos);
            if (scanPos > 80) {
              clearInterval(scanAnim);
              setRobotState('idle');
              setScreenMessage('smile');
            }
          }, 50);
        }
      }
    }, 5000);
    
    return () => {
      if (waveInterval.current) clearTimeout(waveInterval.current);
      if (messageInterval.current) clearInterval(messageInterval.current);
    };
  }, [robotState]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setRobotState('dragged');
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    lastPos.current = { x: e.clientX, y: e.clientY };
    
    if (returnAnimation.current) cancelAnimationFrame(returnAnimation.current);
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStart.current.x;
    const newY = e.clientY - dragStart.current.y;
    
    velocity.current = {
      x: (e.clientX - lastPos.current.x) * 0.3,
      y: (e.clientY - lastPos.current.y) * 0.3,
    };
    lastPos.current = { x: e.clientX, y: e.clientY };
    
    setPosition({ x: newX, y: newY });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    setRobotState('happy');
    setScreenMessage('cool');
    
    const startX = position.x;
    const startY = position.y;
    const startTime = Date.now();
    const duration = 800;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const t = progress;
      const ease = t < 0.6 
        ? Math.sin(t / 0.6 * Math.PI / 2) * 1.15
        : 1 + Math.sin((t - 0.6) / 0.4 * Math.PI) * 0.15;
      
      setPosition({
        x: startX * (1 - ease),
        y: startY * (1 - ease),
      });
      
      velocity.current.x *= 0.9;
      velocity.current.y *= 0.9;
      
      if (progress < 1) {
        returnAnimation.current = requestAnimationFrame(animate);
      } else {
        setPosition({ x: 0, y: 0 });
        setTimeout(() => {
          setRobotState('idle');
          setScreenMessage('smile');
        }, 500);
      }
    };
    
    animate();
  }, [isDragging, position]);

  const handleClick = useCallback(() => {
    if (isDragging) return;
    setRobotState('excited');
    setScreenMessage('heart');
    setTimeout(() => setRobotState('love'), 300);
    setTimeout(() => {
      setRobotState('happy');
      setScreenMessage('cool');
    }, 1200);
    setTimeout(() => {
      setRobotState('idle');
      setScreenMessage('smile');
    }, 2500);
  }, [isDragging]);

  const handleMouseEnter = useCallback(() => {
    if (isDragging) return;
    setIsHovering(true);
    setRobotState('happy');
    setScreenMessage('hi');
  }, [isDragging]);

  const handleMouseLeave = useCallback(() => {
    if (isDragging) return;
    setIsHovering(false);
    setRobotState('idle');
    setScreenMessage('smile');
  }, [isDragging]);

  const wobbleX = velocity.current.x;
  const wobbleY = velocity.current.y;
  
  // Head follows mouse + drag wobble
  const headTranslateX = mouseOffset.x + wobbleX * 0.5;
  const headTranslateY = mouseOffset.y + wobbleY * 0.3;
  const headRotate = mouseOffset.x * 0.5 + wobbleX * 0.3;

  // Leg movement based on drag
  const legSwing = Math.sin(Date.now() / 200) * Math.min(Math.abs(wobbleX) * 0.5, 10);

  const isWaving = robotState === 'waving';
  const isExcited = robotState === 'excited';
  const isLove = robotState === 'love';
  const isHappy = robotState === 'happy' || isHovering;
  const isScanning = robotState === 'scanning';
  const eyeGlow = isExcited || isLove ? '#fbbf24' : isHappy ? '#f59e0b' : '#d97706';
  const screenColor = isExcited || isLove ? '#fca5a5' : isHappy ? COLORS.screenActive : COLORS.screen;

  const renderScreenContent = () => {
    switch (screenMessage) {
      case 'hi':
        return (
          <>
            <text x="150" y="225" textAnchor="middle" fill={COLORS.bodyStroke} fontSize="20" fontWeight="bold" fontFamily="var(--font-hand)">Hi!</text>
            <circle cx="135" cy="210" r="3" fill={COLORS.bodyStroke} />
            <circle cx="165" cy="210" r="3" fill={COLORS.bodyStroke} />
            <path d="M 140 235 Q 150 242 160 235" fill="none" stroke={COLORS.bodyStroke} strokeWidth="2.5" strokeLinecap="round" />
          </>
        );
      case 'heart':
        return (
          <path 
            d="M 150 235 C 150 230, 140 220, 135 225 C 130 230, 150 245, 150 245 C 150 245, 170 230, 165 225 C 160 220, 150 230, 150 235" 
            fill="#f87171"
            style={{ transformOrigin: '150px 232px', animation: 'heartbeat 0.5s ease-in-out infinite' }}
          />
        );
      case 'cool':
        return (
          <>
            <text x="150" y="228" textAnchor="middle" fill={COLORS.bodyStroke} fontSize="16" fontWeight="bold" fontFamily="var(--font-hand)">COOL!</text>
            <path d="M 130 215 L 135 210 L 140 215" fill="none" stroke={COLORS.bodyStroke} strokeWidth="2" />
            <path d="M 160 215 L 165 210 L 170 215" fill="none" stroke={COLORS.bodyStroke} strokeWidth="2" />
          </>
        );
      case 'scan':
        return (
          <>
            <rect x="120" y="200" width="60" height="40" fill="none" stroke="#22c55e" strokeWidth="2" />
            <line x1="120" y1={200 + scanLine} x2="180" y2={200 + scanLine} stroke="#22c55e" strokeWidth="2" />
            <text x="150" y="245" textAnchor="middle" fill="#22c55e" fontSize="10" fontFamily="var(--font-mono)">SCANNING...</text>
          </>
        );
      case 'smile':
      default:
        return (
          <>
            <circle cx="150" cy="220" r="25" fill={screenColor} style={{ transition: 'fill 0.3s ease' }} />
            <rect x="140" y="212" width="6" height="8" rx="1" fill={COLORS.bodyStroke} />
            <rect x="154" y="212" width="6" height="8" rx="1" fill={COLORS.bodyStroke} />
            <path d={isExcited ? "M 138 228 Q 150 240 162 228" : "M 138 226 Q 150 232 162 226"} fill="none" stroke={COLORS.bodyStroke} strokeWidth="3" strokeLinecap="round" style={{ transition: 'd 0.2s ease' }} />
          </>
        );
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ width: '300px', height: '380px', position: 'relative', userSelect: 'none' }}
    >
      <div
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          width: '300px',
          height: '380px',
          position: 'absolute',
          left: position.x,
          top: position.y,
          cursor: isDragging ? 'grabbing' : 'grab',
          filter: 'url(#sketch-filter)',
        }}
      >
        <svg width="300" height="380" viewBox="0 0 300 380" style={{ overflow: 'visible' }}>
          <defs>
            <style>{`@keyframes heartbeat { 0%, 100% { transform: scale(1); } 25% { transform: scale(1.15); } 50% { transform: scale(1); } }`}</style>
          </defs>

          {/* Left Leg with swinging animation */}
          <g style={{ transformOrigin: '100px 280px', transform: `rotate(${isDragging ? legSwing : wobbleX * 0.3}deg)` }}>
            <rect x="85" y="280" width="30" height="70" rx="8" fill={COLORS.body} stroke={COLORS.bodyStroke} strokeWidth="2.5" />
            <rect x="82" y="340" width="36" height="20" rx="4" fill={COLORS.bodyStroke} />
            <circle cx="100" cy="350" r="3" fill={COLORS.body} />
          </g>

          {/* Right Leg with opposite swing */}
          <g style={{ transformOrigin: '200px 280px', transform: `rotate(${isDragging ? -legSwing : -wobbleX * 0.3}deg)` }}>
            <rect x="185" y="280" width="30" height="70" rx="8" fill={COLORS.body} stroke={COLORS.bodyStroke} strokeWidth="2.5" />
            <rect x="182" y="340" width="36" height="20" rx="4" fill={COLORS.bodyStroke} />
            <circle cx="200" cy="350" r="3" fill={COLORS.body} />
          </g>

          {/* Body */}
          <rect x="85" y="160" width="130" height="130" rx="15" fill={COLORS.body} stroke={COLORS.bodyStroke} strokeWidth="2.5" style={{ transform: isExcited ? 'translateY(-5px)' : 'translateY(0)', transition: 'transform 0.2s ease' }} />

          {/* Chest Screen Frame */}
          <rect x="100" y="180" width="100" height="80" rx="8" fill="#f8fafc" stroke={COLORS.eyeRing} strokeWidth="2.5" />
          <rect x="105" y="185" width="90" height="70" rx="4" fill={screenColor} opacity={isHappy || isExcited || isLove ? 0.4 : 0.2} style={{ transition: 'all 0.3s ease' }}>
            {(isHappy || isExcited || isLove) && <animate attributeName="opacity" values="0.4;0.6;0.4" dur="0.3s" repeatCount="indefinite" />}
          </rect>
          <g style={{ transformOrigin: '150px 220px', transition: 'transform 0.2s ease' }}>{renderScreenContent()}</g>

          {/* Body Details */}
          <circle cx="95" cy="200" r="5" fill={COLORS.bodyStroke} opacity="0.5" />
          <circle cx="205" cy="200" r="5" fill={COLORS.bodyStroke} opacity="0.5" />
          <circle cx="95" cy="240" r="5" fill={COLORS.bodyStroke} opacity="0.5" />
          <circle cx="205" cy="240" r="5" fill={COLORS.bodyStroke} opacity="0.5" />

          {/* Left Arm */}
          <g style={{ transformOrigin: '85px 190px', transform: `rotate(${wobbleX * 0.4}deg)` }}>
            <rect x="60" y="175" width="25" height="80" rx="10" fill={COLORS.body} stroke={COLORS.bodyStroke} strokeWidth="2.5" />
            <circle cx="72" cy="185" r="4" fill={COLORS.bodyStroke} opacity="0.5" />
            <rect x="58" y="250" width="29" height="25" rx="6" fill={COLORS.bodyStroke} />
            <rect x="60" y="273" width="6" height="12" rx="2" fill={COLORS.body} />
            <rect x="70" y="273" width="6" height="12" rx="2" fill={COLORS.body} />
            <rect x="80" y="273" width="6" height="12" rx="2" fill={COLORS.body} />
          </g>

          {/* Right Arm (Waving) */}
          <g style={{ transformOrigin: '215px 190px', transform: isWaving ? `rotate(-30deg) rotate(${wobbleX * 0.3}deg)` : isExcited || isLove ? `rotate(-45deg) rotate(${wobbleX * 0.3}deg)` : `rotate(${wobbleX * 0.4}deg)`, transition: isDragging ? 'none' : 'transform 0.3s ease' }}>
            <rect x="215" y="175" width="25" height="80" rx="10" fill={COLORS.body} stroke={COLORS.bodyStroke} strokeWidth="2.5" />
            <circle cx="227" cy="185" r="4" fill={COLORS.bodyStroke} opacity="0.5" />
            <g style={{ transformOrigin: '227px 255px' }}>
              <rect x="213" y="250" width="28" height="22" rx="6" fill={COLORS.bodyStroke} />
              <rect x="212" y="245" width="6" height="15" rx="2" fill={COLORS.body} />
              <rect x="222" y="243" width="6" height="17" rx="2" fill={COLORS.body} />
              <rect x="232" y="245" width="6" height="15" rx="2" fill={COLORS.body} />
            </g>
            {isWaving && <animateTransform attributeName="transform" type="rotate" values="0 227 255; -10 227 255; 0 227 255" dur="0.25s" repeatCount="indefinite" additive="sum" />}
          </g>

          {/* Neck */}
          <rect x="130" y="145" width="40" height="20" fill={COLORS.bodyStroke} opacity="0.7" />
          <rect x="125" y="150" width="50" height="10" rx="3" fill={COLORS.body} stroke={COLORS.bodyStroke} strokeWidth="2" />

          {/* Head - follows mouse with translation and rotation */}
          <g style={{ transformOrigin: '150px 100px', transform: `translate(${headTranslateX}px, ${headTranslateY}px) rotate(${headRotate}deg) ${isExcited || isLove ? 'scale(1.03)' : 'scale(1)'}`, transition: isDragging ? undefined : 'transform 0.1s ease-out' }}>
            <circle cx="150" cy="85" r="55" fill={COLORS.body} stroke={COLORS.bodyStroke} strokeWidth="2.5" style={{ filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.15))' }} />
            <circle cx="150" cy="85" r="45" fill="none" stroke={COLORS.eyeRing} strokeWidth="4" style={{ transformOrigin: '150px 85px', animation: isHappy || isExcited || isLove ? 'pulse-ring 1s ease-in-out infinite' : undefined }} />
            <circle cx="150" cy="85" r="38" fill={COLORS.bodyStroke} />
            <circle cx="150" cy="85" r="28" fill={eyeGlow} style={{ filter: `drop-shadow(0 0 ${isHappy || isExcited || isLove ? '20px' : '12px'} ${eyeGlow})`, transition: 'all 0.2s ease' }}>
              {(isHappy || isExcited || isLove) && <animate attributeName="opacity" values="1;0.85;1" dur="0.4s" repeatCount="indefinite" />}
            </circle>
            <circle cx="140" cy="72" r="8" fill="white" opacity="0.9" />
            <circle cx="160" cy="95" r="3" fill="white" opacity="0.5" />
            <rect x="95" y="70" width="12" height="30" rx="4" fill={COLORS.bodyStroke} opacity="0.4" />
            <rect x="193" y="70" width="12" height="30" rx="4" fill={COLORS.bodyStroke} opacity="0.4" />
          </g>

          {/* Antenna - also follows head */}
          <g style={{ transform: `translate(${headTranslateX * 0.5}px, ${headTranslateY * 0.5}px)`, transition: isDragging ? undefined : 'transform 0.1s ease-out' }}>
            <line x1="150" y1="30" x2="150" y2="5" stroke={COLORS.bodyStroke} strokeWidth="3" />
            <circle cx="150" cy="5" r="7" fill={isHappy || isExcited || isLove ? COLORS.screenActive : COLORS.bodyStroke} style={{ filter: isHappy || isExcited || isLove ? `drop-shadow(0 0 8px ${COLORS.screenActive})` : undefined, transition: 'all 0.2s ease' }}>
              {(isHappy || isExcited || isLove) && <animate attributeName="opacity" values="1;0.6;1" dur="0.5s" repeatCount="indefinite" />}
            </circle>
          </g>

          {/* Hint */}
          {isHovering && robotState === 'idle' && (
            <text x="150" y="375" textAnchor="middle" fill="var(--color-text-muted)" fontSize="12" fontFamily="var(--font-hand)" opacity="0.7">Drag me!</text>
          )}

          <style>{`@keyframes pulse-ring { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }`}</style>
        </svg>
      </div>
    </div>
  );
}
