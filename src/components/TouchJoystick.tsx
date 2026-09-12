import React, { useState, useRef, useEffect } from 'react';

interface TouchJoystickProps {
  onAngleChange: (angle: number) => void;
  isActive: boolean;
}

export const TouchJoystick: React.FC<TouchJoystickProps> = ({
  onAngleChange,
  isActive,
}) => {
  const [touchState, setTouchState] = useState<{
    active: boolean;
    startX: number;
    startY: number;
    curX: number;
    curY: number;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    curX: 0,
    curY: 0,
  });

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (!isActive) return;
      const touch = e.touches[0];
      if (!touch) return;

      // Don't intercept touches on buttons
      const target = e.target as HTMLElement | null;
      if (target?.closest('button') || target?.closest('input')) return;

      setTouchState({
        active: true,
        startX: touch.clientX,
        startY: touch.clientY,
        curX: touch.clientX,
        curY: touch.clientY,
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchState.active && e.touches.length > 0) return;
      const touch = e.touches[0];
      if (!touch) return;

      const dx = touch.clientX - touchState.startX;
      const dy = touch.clientY - touchState.startY;

      // Calculate angle
      if (Math.hypot(dx, dy) > 8) {
        const angle = Math.atan2(dy, dx);
        onAngleChange(angle);
      }

      // Clamp visual joystick thumb offset
      const maxRadius = 45;
      const dist = Math.hypot(dx, dy);
      const clampedDist = Math.min(dist, maxRadius);
      const angle = Math.atan2(dy, dx);

      setTouchState((prev) => ({
        ...prev,
        curX: prev.startX + Math.cos(angle) * clampedDist,
        curY: prev.startY + Math.sin(angle) * clampedDist,
      }));
    };

    const handleTouchEnd = () => {
      setTouchState((prev) => ({ ...prev, active: false }));
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isActive, touchState.active, touchState.startX, touchState.startY, onAngleChange]);

  if (!touchState.active) return null;

  return (
    <div
      ref={containerRef}
      id="touch-joystick-container"
      className="pointer-events-none fixed inset-0 z-10"
    >
      {/* Joystick Base Ring */}
      <div
        className="absolute w-24 h-24 -ml-12 -mt-12 rounded-full border-2 border-white/40 bg-white/10 backdrop-blur-xs shadow-xl flex items-center justify-center transition-opacity"
        style={{
          left: touchState.startX,
          top: touchState.startY,
        }}
      >
        {/* Joystick Thumb Nub */}
        <div
          className="absolute w-10 h-10 -ml-5 -mt-5 rounded-full bg-white/90 shadow-md border border-slate-300"
          style={{
            left: touchState.curX - touchState.startX + 48,
            top: touchState.curY - touchState.startY + 48,
          }}
        />
      </div>
    </div>
  );
};
