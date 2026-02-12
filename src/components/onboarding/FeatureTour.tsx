/**
 * FeatureTour — tooltip-based guided tour (3-4 steps)
 * Highlights: AI chat, share, save controls, drawing tools
 * Triggers after first canvas interaction for new users
 */

import { useState, useEffect, useCallback } from 'react';

interface TourStep {
  target: string; // CSS selector
  title: string;
  description: string;
  position: 'left' | 'right' | 'top' | 'bottom';
}

const TOUR_STEPS: TourStep[] = [
  {
    target: '.chat-btn',
    title: 'AI Chat',
    description: 'Ask AI to help generate diagrams, explain concepts, or brainstorm ideas.',
    position: 'left',
  },
  {
    target: '.share-btn',
    title: 'Real-time Collaboration',
    description: 'Share a link to collaborate on this canvas with others in real-time.',
    position: 'left',
  },
  {
    target: '.menu-btn',
    title: 'Save & Export',
    description: 'Save your canvas to a file or export as PNG/SVG. Sign in for cloud auto-save.',
    position: 'left',
  },
  {
    target: '.image-gen-btn',
    title: 'AI Image Generation',
    description: 'Select elements and generate images based on your drawings using AI.',
    position: 'left',
  },
];

const TOUR_KEY = 'astroweb-tour-completed';

export default function FeatureTour() {
  const [currentStep, setCurrentStep] = useState(-1);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(false);

  // Start tour on first canvas interaction
  useEffect(() => {
    if (localStorage.getItem(TOUR_KEY)) return;

    const handleFirstInteraction = () => {
      // Delay slightly so canvas is ready
      setTimeout(() => setIsActive(true), 500);
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

  // Position tooltip next to target element
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
    const pos = { x: 0, y: 0 };

    switch (step.position) {
      case 'left':
        pos.x = rect.left - 280;
        pos.y = rect.top + rect.height / 2 - 50;
        break;
      case 'right':
        pos.x = rect.right + 12;
        pos.y = rect.top + rect.height / 2 - 50;
        break;
      case 'top':
        pos.x = rect.left + rect.width / 2 - 130;
        pos.y = rect.top - 110;
        break;
      case 'bottom':
        pos.x = rect.left + rect.width / 2 - 130;
        pos.y = rect.bottom + 12;
        break;
    }

    setTooltipPos(pos);
  }, [currentStep]);

  const handleNext = useCallback(() => {
    if (currentStep >= TOUR_STEPS.length - 1) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep]);

  const handleComplete = () => {
    setIsActive(false);
    setCurrentStep(-1);
    localStorage.setItem(TOUR_KEY, '1');
  };

  if (!isActive || currentStep < 0 || currentStep >= TOUR_STEPS.length) return null;

  const step = TOUR_STEPS[currentStep];

  return (
    <>
      {/* Tooltip */}
      <div style={{
        position: 'fixed',
        left: `${tooltipPos.x}px`,
        top: `${tooltipPos.y}px`,
        background: 'white',
        border: '2px solid #6366f1',
        borderRadius: '12px',
        padding: '16px 20px',
        width: '260px',
        boxShadow: '0 8px 30px rgba(99,102,241,0.2)',
        zIndex: 1200,
        animation: 'tooltipIn 0.2s ease',
      }}>
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
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
