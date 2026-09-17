import React, { useState, useRef, useEffect, memo } from 'react';
import { Compass } from 'lucide-react';

interface TouchLookZoneProps {
  onRotate: (deltaYaw: number, deltaPitch: number) => void;
  onTouchActive?: (active: boolean) => void;
}

export const TouchLookZone: React.FC<TouchLookZoneProps> = memo(({ onRotate, onTouchActive }) => {
  const [showHint, setShowHint] = useState(true);
  const [isPointerActive, setIsPointerActive] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const lastClientPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRectRef = useRef<{ left: number; top: number } | null>(null);

  // Auto-hide helper hint after 4 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only track primary touch or left-click
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    activePointerIdRef.current = e.pointerId;
    lastClientPosRef.current = { x: e.clientX, y: e.clientY };

    // Cache rect only on pointer down to eliminate layout thrashing during drag
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      containerRectRef.current = { left: rect.left, top: rect.top };
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${e.clientX - rect.left}px, ${e.clientY - rect.top}px, 0)`;
      }
    }

    setIsPointerActive(true);
    onTouchActive?.(true);
    setShowHint(false);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;

    // Direct touch-swipe delta rotation
    const deltaClientX = e.clientX - lastClientPosRef.current.x;
    const deltaClientY = e.clientY - lastClientPosRef.current.y;
    lastClientPosRef.current = { x: e.clientX, y: e.clientY };

    // Direct DOM transform update for 120Hz smooth touch ring without React re-render overhead
    if (ringRef.current && containerRectRef.current) {
      const touchX = e.clientX - containerRectRef.current.left;
      const touchY = e.clientY - containerRectRef.current.top;
      ringRef.current.style.transform = `translate3d(${touchX}px, ${touchY}px, 0)`;
    }

    // Natural non-inverted touch look controls:
    // Swipe Right (deltaClientX > 0) -> camera turns RIGHT
    // Swipe Left (deltaClientX < 0)  -> camera turns LEFT
    // Swipe Up (deltaClientY < 0)    -> camera tilts UP
    // Swipe Down (deltaClientY > 0)  -> camera tilts DOWN
    const directYaw = -deltaClientX * 0.0072;
    const directPitch = deltaClientY * 0.0052;

    onRotate(directYaw, directPitch);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current === e.pointerId) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      activePointerIdRef.current = null;
      setIsPointerActive(false);
      onTouchActive?.(false);
      containerRectRef.current = null;
    }
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="absolute top-28 right-0 bottom-0 w-1/2 z-10 touch-none select-none pointer-events-auto cursor-grab active:cursor-grabbing overflow-hidden"
      id="touch-look-360-zone"
    >
      {/* Helper Notification (fades out after 4s or on first touch) */}
      {showHint && (
        <div className="absolute top-6 right-4 sm:right-8 bg-[#071610]/85 backdrop-blur-md border border-emerald-500/40 rounded-xl px-3 py-1.5 flex items-center gap-2 text-emerald-300 text-[11px] font-bold shadow-lg pointer-events-none animate-pulse">
          <Compass className="w-3.5 h-3.5 text-emerald-400 animate-spin-slow" />
          <span>Swipe screen to look 360°</span>
        </div>
      )}

      {/* Subtle, unobtrusive touch trail ring that follows finger using GPU transform without blocking view */}
      <div
        ref={ringRef}
        className={`absolute top-0 left-0 w-12 h-12 -ml-6 -mt-6 rounded-full border border-emerald-400/30 bg-emerald-500/10 pointer-events-none transition-opacity duration-150 will-change-transform ${
          isPointerActive ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
});

// Backward-compatible alias
export const TouchLookJoystick = TouchLookZone;

