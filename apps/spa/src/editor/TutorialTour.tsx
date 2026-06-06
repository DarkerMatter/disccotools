import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import type React from 'react';

export type TourStep = {
  /** Matches a `data-tour-id` attribute somewhere in the DOM. */
  target: string;
  title: string;
  body: string;
};

type Rect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const RING_MARGIN = 8;
const CARD_GAP = 12;
const CARD_VIEWPORT_PAD = 12;
const CARD_MAX_WIDTH = 320;
const CARD_FALLBACK_HEIGHT = 160;

const tipCardStyle: React.CSSProperties = {
  position: 'fixed',
  zIndex: 1502,
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: 16,
  maxWidth: CARD_MAX_WIDTH,
  boxShadow: '0 8px 28px rgba(0, 0, 0, 0.25)',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const stepCounterStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--color-text-muted)',
};

const titleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  margin: 0,
};

const bodyStyle: React.CSSProperties = {
  fontSize: 13,
  lineHeight: 1.5,
  color: 'var(--color-text)',
  margin: 0,
};

const buttonRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
  marginTop: 4,
};

const skipButtonStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  background: 'transparent',
  color: 'var(--color-text-muted)',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
};

const nextButtonStyle: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 'var(--radius-md)',
  border: 'none',
  background: 'var(--color-accent)',
  color: 'white',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};

function findTarget(targetId: string): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.querySelector<HTMLElement>(`[data-tour-id="${targetId}"]`);
}

function rectFromElement(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function computeCardPosition(
  rect: Rect | null,
): { top: number; left: number; centered: boolean } {
  const viewportW = typeof window === 'undefined' ? 1024 : window.innerWidth;
  const viewportH = typeof window === 'undefined' ? 768 : window.innerHeight;

  if (!rect || (rect.width === 0 && rect.height === 0)) {
    const top = Math.max(
      CARD_VIEWPORT_PAD,
      Math.round(viewportH / 2 - CARD_FALLBACK_HEIGHT / 2),
    );
    const left = Math.max(
      CARD_VIEWPORT_PAD,
      Math.round(viewportW / 2 - CARD_MAX_WIDTH / 2),
    );
    return { top, left, centered: true };
  }

  const rectCenterY = rect.top + rect.height / 2;
  const placeAbove = rectCenterY > viewportH / 2;

  let top: number;
  if (placeAbove) {
    top = rect.top - CARD_GAP - CARD_FALLBACK_HEIGHT;
    if (top < CARD_VIEWPORT_PAD) top = CARD_VIEWPORT_PAD;
  } else {
    top = rect.top + rect.height + CARD_GAP;
    const maxTop = viewportH - CARD_VIEWPORT_PAD - CARD_FALLBACK_HEIGHT;
    if (top > maxTop) top = Math.max(CARD_VIEWPORT_PAD, maxTop);
  }

  let left = rect.left;
  const maxLeft = viewportW - CARD_VIEWPORT_PAD - CARD_MAX_WIDTH;
  if (left > maxLeft) left = maxLeft;
  if (left < CARD_VIEWPORT_PAD) left = CARD_VIEWPORT_PAD;

  return { top, left, centered: false };
}

function ringStyle(rect: Rect | null): React.CSSProperties | null {
  if (!rect || (rect.width === 0 && rect.height === 0)) return null;
  return {
    top: rect.top - RING_MARGIN,
    left: rect.left - RING_MARGIN,
    width: rect.width + RING_MARGIN * 2,
    height: rect.height + RING_MARGIN * 2,
  };
}

export function TutorialTour({
  open,
  steps,
  onClose,
}: {
  open: boolean;
  steps: TourStep[];
  onClose: () => void;
}): JSX.Element | null {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  // Reset to step 0 whenever the tour closes.
  useEffect(() => {
    if (!open) setStepIndex(0);
  }, [open]);

  const step = open && steps.length > 0 ? steps[Math.min(stepIndex, steps.length - 1)] : null;

  const recompute = useCallback(() => {
    if (!step) {
      setRect(null);
      return;
    }
    const el = findTarget(step.target);
    if (!el) {
      setRect(null);
      return;
    }
    setRect(rectFromElement(el));
  }, [step]);

  useLayoutEffect(() => {
    if (!open || !step) return;
    recompute();
    function handle() {
      recompute();
    }
    window.addEventListener('resize', handle);
    window.addEventListener('scroll', handle, { passive: true });
    return () => {
      window.removeEventListener('resize', handle);
      window.removeEventListener('scroll', handle);
    };
  }, [open, step, recompute]);

  if (!open || !step) return null;

  const isLast = stepIndex >= steps.length - 1;
  const ring = ringStyle(rect);
  const card = computeCardPosition(rect);

  function handleNext() {
    if (isLast) {
      onClose();
      return;
    }
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Guided tour">
      {/* No ring: draw a full-screen backdrop so the dim is still present. */}
      {!ring && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            zIndex: 1500,
            pointerEvents: 'none',
          }}
        />
      )}
      {ring && <div className="tour-ring" aria-hidden="true" style={ring} />}
      <div
        style={{
          ...tipCardStyle,
          top: card.top,
          left: card.left,
        }}
      >
        <p style={stepCounterStyle}>
          Step {stepIndex + 1} of {steps.length}
        </p>
        <h3 style={titleStyle}>{step.title}</h3>
        <p style={bodyStyle}>{step.body}</p>
        <div style={buttonRowStyle}>
          <button type="button" onClick={onClose} style={skipButtonStyle}>
            Skip
          </button>
          <button type="button" onClick={handleNext} style={nextButtonStyle}>
            {isLast ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
