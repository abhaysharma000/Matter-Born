import React, { useState, useRef, useEffect } from 'react';
import { Compass } from 'lucide-react';

interface TouchLookZoneProps {
  onRotate: (deltaYaw: number, deltaPitch: number) => void;
}

export const TouchLookZone: React.FC<TouchLookZoneProps> = ({ onRotate }) => {
  const [showHint, setShowHint] = useState(true);
  const [activeTouch, setActiveTouch] = useState<{ x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const lastClientPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

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

    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setActiveTouch({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }

    setShowHint(false);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;

    // Direct touch-swipe delta rotation (1-to-1 camera orbit, no joystick stick drift or auto-rotation)
    const deltaClientX = e.clientX - lastClientPosRef.current.x;
    const deltaClientY = e.clientY - lastClientPosRef.current.y;
    lastClientPosRef.current = { x: e.clientX, y: e.clientY };

    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setActiveTouch({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }

    // Calibrated natural sensitivity for mobile touch swipe
    const directYaw = deltaClientX * 0.0072;
    const directPitch = -deltaClientY * 0.0052;

    onRotate(directYaw, directPitch);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current === e.pointerId) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      activePointerIdRef.current = null;
      setActiveTouch(null);
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

      {/* Subtle, unobtrusive touch trail ring that follows finger without blocking view */}
      {activeTouch && (
        <div
          className="absolute w-12 h-12 -ml-6 -mt-6 rounded-full border border-emerald-400/30 bg-emerald-500/10 pointer-events-none transition-transform duration-75 scale-95"
          style={{
            left: `${activeTouch.x}px`,
            top: `${activeTouch.y}px`,
          }}
        />
      )}
    </div>
  );
};

// Backward-compatible alias
export const TouchLookJoystick = TouchLookZone;
