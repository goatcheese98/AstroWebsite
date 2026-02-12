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
    title: 'AI Chat',
    description: 'Ask AI to help generate diagrams, explain concepts, or brainstorm ideas.',
  },
  {
    target: '.share-btn',
    title: 'Real-time Collaboration',
    description: 'Share a link to collaborate on this canvas with others in real-time.',
  },
  {
    target: '.menu-btn',
    title: 'Save & Export',
    description: 'Save your canvas to a file or export as PNG/SVG. Sign in for cloud auto-save.',
  },
  {
    target: '.image-gen-btn',
    title: 'AI Image Generation',
    description: 'Select elements and generate images based on your drawings using AI.',
  },
];

const TOUR_KEY = 'astroweb-tour-completed';

export default function FeatureTour() {
  const [currentStep, setCurrentStep] = useState(-1);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isActive, setIsActive] = useState(false);

  // Start tour on first canvas interaction
  useEffect(() => {
    if (localStorage.getItem(TOUR_KEY)) return;

    const handleFirstInteraction = () => {
      setTimeout(() => setIsActive(true), 800);
      window.removeEventListener('canvas:data-change', handleFirstInteraction);
    };

    window.addEventListener('canvas:data-change', handleFirstInteraction);
    return () => window.removeEventListener('canvas:data-change', handleFirstInteraction);
  }, []);

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
      // Skip to next step if target not found
      handleNext();
      return;
    }

    const rect = el.getBoundingClientRect();
    setTargetRect(rect);
  }, [currentStep, handleNext]);

  if (!isActive || currentStep < 0 || currentStep >= TOUR_STEPS.length || !targetRect) return null;

  const step = TOUR_STEPS[currentStep];

  // Position tooltip to the left of the target button, vertically centered
  const tooltipWidth = 260;
  const tooltipGap = 16;
  const tooltipX = targetRect.left - tooltipWidth - tooltipGap;
  const tooltipY = targetRect.top + targetRect.height / 2 - 60;

  return (
    <>
      {/* Semi-transparent overlay to dim background */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.15)',
          zIndex: 1190,
          pointerEvents: 'none',
        }}
      />

      {/* Highlight ring around target button */}
      <div style={{
        position: 'fixed',
        left: targetRect.left - 6,
        top: targetRect.top - 6,
        width: targetRect.width + 12,
        height: targetRect.height + 12,
        border: '2px solid #6366f1',
        borderRadius: '10px',
        boxShadow: '0 0 0 4000px rgba(0,0,0,0.15), 0 0 20px rgba(99,102,241,0.4)',
        background: 'transparent',
        zIndex: 1191,
        pointerEvents: 'none',
        animation: 'pulseRing 2s ease-in-out infinite',
      }} />

      {/* Tooltip */}
      <div style={{
        position: 'fixed',
        left: `${tooltipX}px`,
        top: `${tooltipY}px`,
        background: 'white',
        border: '2px solid #6366f1',
        borderRadius: '12px',
        padding: '16px 20px',
        width: `${tooltipWidth}px`,
        boxShadow: '0 8px 30px rgba(99,102,241,0.25)',
        zIndex: 1200,
        animation: 'tooltipIn 0.25s ease',
      }}>
        {/* Arrow pointing right toward the target */}
        <div style={{
          position: 'absolute',
          right: -8,
          top: '50%',
          transform: 'translateY(-50%) rotate(45deg)',
          width: 14,
          height: 14,
          background: 'white',
          border: '2px solid #6366f1',
          borderLeft: 'none',
          borderBottom: 'none',
          zIndex: 1,
        }} />

        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1f2937', marginBottom: '6px' }}>
          {step.title}
        </div>
        <div style={{ fontSize: '0.8rem', color: '#6b7280', lineHeight: 1.5, marginBottom: '14px' }}>
          {step.description}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
            {currentStep + 1} / {TOUR_STEPS.length}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleComplete}
              style={{
                padding: '6px 12px',
                background: 'none',
                border: 'none',
                color: '#6b7280',
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              Skip
            </button>
            <button
              onClick={handleNext}
              style={{
                padding: '6px 14px',
                background: '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {currentStep === TOUR_STEPS.length - 1 ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes tooltipIn {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulseRing {
          0%, 100% { box-shadow: 0 0 0 4000px rgba(0,0,0,0.15), 0 0 15px rgba(99,102,241,0.3); }
          50% { box-shadow: 0 0 0 4000px rgba(0,0,0,0.15), 0 0 25px rgba(99,102,241,0.6); }
        }
      `}</style>
    </>
  );
}
