import React, { useState, useRef, useEffect, memo } from 'react';

interface VirtualJoystickProps {
  onMove: (vector: { x: number; z: number }) => void;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = memo(({ onMove }) => {
  const [active, setActive] = useState(false);
  const baseRef = useRef<HTMLDivElement | null>(null);
  const thumbRef = useRef<HTMLDivElement | null>(null);
  const touchIdRef = useRef<number | null>(null);
  const baseCenterRef = useRef<{ x: number; y: number; maxRadius: number } | null>(null);

  // Keyboard controls listener (WASD / Arrows)
  useEffect(() => {
    const keys = { w: false, a: false, s: false, d: false };

    const updateKeyboard = () => {
      let x = 0;
      let z = 0;
      if (keys.w) z -= 1;
      if (keys.s) z += 1;
      if (keys.a) x -= 1;
      if (keys.d) x += 1;

      // Normalize if diagonal
      const len = Math.hypot(x, z);
      if (len > 0) {
        onMove({ x: x / len, z: z / len });
      } else if (!active) {
        onMove({ x: 0, z: 0 });
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') keys.w = true;
      if (k === 's' || k === 'arrowdown') keys.s = true;
      if (k === 'a' || k === 'arrowleft') keys.a = true;
      if (k === 'd' || k === 'arrowright') keys.d = true;
      updateKeyboard();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') keys.w = false;
      if (k === 's' || k === 'arrowdown') keys.s = false;
      if (k === 'a' || k === 'arrowleft') keys.a = false;
      if (k === 'd' || k === 'arrowright') keys.d = false;
      updateKeyboard();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onMove, active]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!baseRef.current) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    // Cache center coordinates once on touch start to eliminate getBoundingClientRect layout thrashing during move
    const rect = baseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const maxRadius = rect.width / 2;

    baseCenterRef.current = { x: centerX, y: centerY, maxRadius };
    touchIdRef.current = e.pointerId;
    setActive(true);

    const deltaX = e.clientX - centerX;
    const deltaY = e.clientY - centerY;
    updateStick(deltaX, deltaY, maxRadius);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!active || !baseCenterRef.current) return;
    if (touchIdRef.current !== null && e.pointerId !== touchIdRef.current) return;

    const { x: centerX, y: centerY, maxRadius } = baseCenterRef.current;
    const deltaX = e.clientX - centerX;
    const deltaY = e.clientY - centerY;
    updateStick(deltaX, deltaY, maxRadius);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    setActive(false);
    if (thumbRef.current) {
      thumbRef.current.style.transform = 'translate3d(0px, 0px, 0)';
    }
    onMove({ x: 0, z: 0 });
    touchIdRef.current = null;
    baseCenterRef.current = null;
  };

  const updateStick = (dx: number, dy: number, maxRadius: number) => {
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);

    const stickX = Math.cos(angle) * clampedDist;
    const stickY = Math.sin(angle) * clampedDist;

    // Direct GPU transform update on thumb element for 120Hz smooth stick motion without React re-render overhead
    if (thumbRef.current) {
      thumbRef.current.style.transform = `translate3d(${stickX}px, ${stickY}px, 0)`;
    }

    // Output normalized vector
    const normX = clampedDist > 5 ? stickX / maxRadius : 0;
    const normZ = clampedDist > 5 ? stickY / maxRadius : 0;
    onMove({ x: normX, z: normZ });
  };

  return (
    <div
      ref={baseRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`relative w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-[#FAF8F5]/85 backdrop-blur-md border-2 touch-none flex items-center justify-center select-none shadow-lg transition-colors ${
        active 
          ? 'border-emerald-600 shadow-emerald-600/30 bg-[#FAF8F5]/95' 
          : 'border-emerald-600/40 shadow-stone-800/10'
      }`}
    >
      {/* Inner guide ring */}
      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border border-dashed border-emerald-600/30 pointer-events-none" />

      {/* Floating Joystick Thumb with GPU accelerated translation */}
      <div
        ref={thumbRef}
        className="absolute w-10 h-10 sm:w-13 sm:h-13 rounded-full bg-gradient-to-tr from-emerald-600 to-green-500 shadow-md shadow-emerald-700/30 pointer-events-none flex items-center justify-center will-change-transform"
        style={{
          transform: 'translate3d(0px, 0px, 0)',
        }}
      >
        <div className="w-3.5 h-3.5 rounded-full bg-[#FAF8F5] shadow-xs" />
      </div>
    </div>
  );
});

