/**
 * FeatureTour — tooltip-based guided tour (3-4 steps)
 * Highlights: AI chat, share, save controls, image gen
 * Triggers after first canvas interaction for new users
 */

import { useState, useEffect, useCallback } from 'react';

interface TourStep {
  target: string; // CSS selector
  title: string;
  description: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    target: '.chat-btn',
    title: 'AI Assistant',
    description: 'Describe what you want to build or ask questions about your design.',
  },
  {
    target: '.share-btn',
    title: 'Sharing',
    description: 'Generate a link to share your work with others.',
  },
  {
    target: '.menu-btn',
    title: 'Menu',
    description: 'Access version history, export options, and settings.',
  },
];

const TOUR_KEY = 'astroweb-tour-completed';

export default function FeatureTour({ canStart = true }: { canStart?: boolean }) {
  const [currentStep, setCurrentStep] = useState(-1);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isActive, setIsActive] = useState(false);

  // Start tour on first canvas interaction
  useEffect(() => {
    if (localStorage.getItem(TOUR_KEY) || !canStart) return;

    const handleFirstInteraction = () => {
      // Delay to ensure the interaction event finishes
      setTimeout(() => {
        if (!localStorage.getItem(TOUR_KEY)) {
          setIsActive(true);
        }
      }, 1000);
      window.removeEventListener('canvas:data-change', handleFirstInteraction);
    };

    window.addEventListener('canvas:data-change', handleFirstInteraction);
    return () => window.removeEventListener('canvas:data-change', handleFirstInteraction);
  }, [canStart]);

  useEffect(() => {
    if (isActive && currentStep === -1) {
      setCurrentStep(0);
    }
  }, [isActive, currentStep]);

  const handleComplete = useCallback(() => {
    setIsActive(false);
    setCurrentStep(-1);
    setTargetRect(null);
    localStorage.setItem(TOUR_KEY, '1');
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep >= TOUR_STEPS.length - 1) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, handleComplete]);

  // Find and measure target element
  useEffect(() => {
    if (currentStep < 0 || currentStep >= TOUR_STEPS.length) return;

    const step = TOUR_STEPS[currentStep];
    const el = document.querySelector(step.target);
    if (!el) {
      handleNext();
      return;
    }

    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return; // Not visible yet
    setTargetRect(rect);
  }, [currentStep, handleNext]);

  if (!isActive || currentStep < 0 || currentStep >= TOUR_STEPS.length || !targetRect || !canStart) return null;

  const step = TOUR_STEPS[currentStep];

  // More compact tooltip
  const tooltipWidth = 220;
  const tooltipGap = 12;
  const tooltipX = targetRect.left - tooltipWidth - tooltipGap;
  const tooltipY = targetRect.top + targetRect.height / 2 - 40;

  return (
    <>
      {/* Subtle overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.05)',
          zIndex: 1190,
          pointerEvents: 'none',
        }}
      />

      {/* Clean highlight ring */}
      <div style={{
        position: 'fixed',
        left: targetRect.left - 4,
        top: targetRect.top - 4,
        width: targetRect.width + 8,
        height: targetRect.height + 8,
        border: '2px solid #111827',
        borderRadius: '8px',
        boxShadow: '0 0 0 4000px rgba(0,0,0,0.05)',
        background: 'transparent',
        zIndex: 1191,
        pointerEvents: 'none',
        transition: 'all 0.3s ease',
      }} />

      {/* Tooltip */}
      <div style={{
        position: 'fixed',
        left: `${tooltipX}px`,
        top: `${tooltipY}px`,
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '10px',
        padding: '12px 14px',
        width: `${tooltipWidth}px`,
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        zIndex: 1200,
        animation: 'tooltipIn 0.2s ease',
      }}>
        {/* Arrow */}
        <div style={{
          position: 'absolute',
          right: -6,
          top: '50%',
          transform: 'translateY(-50%) rotate(45deg)',
          width: 10,
          height: 10,
          background: 'white',
          border: '1px solid #e5e7eb',
          borderLeft: 'none',
          borderBottom: 'none',
          zIndex: 1,
        }} />

        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
          {step.title}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#6b7280', lineHeight: 1.4, marginBottom: '12px' }}>
          {step.description}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
            {currentStep + 1} / {TOUR_STEPS.length}
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={handleComplete}
              style={{
                padding: '4px 8px',
                background: 'none',
                border: 'none',
                color: '#9ca3af',
                fontSize: '0.7rem',
                cursor: 'pointer',
              }}
            >
              Skip
            </button>
            <button
              onClick={handleNext}
              style={{
                padding: '4px 10px',
                background: '#111827',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {currentStep === TOUR_STEPS.length - 1 ? 'Got it' : 'Next'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes tooltipIn {
          from { opacity: 0; transform: translateX(-4px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
