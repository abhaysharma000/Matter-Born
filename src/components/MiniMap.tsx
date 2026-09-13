import React, { useEffect, useRef } from 'react';
import { GameEngine } from '../game/GameEngine';
import { GRID_SIZE, WORLD_SIZE } from '../utils/constants';

interface MiniMapProps {
  engine: GameEngine;
}

export const MiniMap: React.FC<MiniMapProps> = ({ engine }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let animId: number;

    const renderMiniMap = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const size = canvas.width;
      const scale = size / GRID_SIZE;

      // Clear map background
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, size, size);

      // Draw all claimed territories
      const allChars = [engine.player, ...engine.bots];
      const colorMap = new Map<number, string>();
      for (const c of allChars) {
        colorMap.set(c.id, c.color);
      }

      for (let cy = 0; cy < GRID_SIZE; cy += 2) {
        for (let cx = 0; cx < GRID_SIZE; cx += 2) {
          const idx = cy * GRID_SIZE + cx;
          const owner = engine.grid[idx];
          if (owner !== 0) {
            const color = colorMap.get(owner);
            if (color) {
              ctx.fillStyle = color;
              ctx.fillRect(cx * scale, cy * scale, scale * 2, scale * 2);
            }
          }
        }
      }

      // Draw royale zone circle if active
      if (engine.gameMode === 'royale') {
        const center = size / 2;
        const r = (engine.royaleZoneRadius / WORLD_SIZE) * size;
        ctx.beginPath();
        ctx.arc(center, center, Math.max(2, r), 0, Math.PI * 2);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Draw bots as tiny dots
      for (const bot of engine.bots) {
        if (!bot.alive) continue;
        const bx = (bot.x / WORLD_SIZE) * size;
        const by = (bot.y / WORLD_SIZE) * size;
        ctx.fillStyle = bot.color;
        ctx.beginPath();
        ctx.arc(bx, by, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw player as pulsing radar blip
      if (engine.player.alive) {
        const px = (engine.player.x / WORLD_SIZE) * size;
        const py = (engine.player.y / WORLD_SIZE) * size;

        // Pulse ring
        ctx.beginPath();
        ctx.arc(px, py, 4.5, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Core dot
        ctx.fillStyle = engine.player.color;
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(renderMiniMap);
    };

    animId = requestAnimationFrame(renderMiniMap);
    return () => cancelAnimationFrame(animId);
  }, [engine]);

  return (
    <div
      id="mini-map-container"
      className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden shadow-xl border-2 border-emerald-500/50 bg-slate-950/95 backdrop-blur-md pointer-events-none"
    >
      <canvas
        ref={canvasRef}
        id="mini-map-canvas"
        width={140}
        height={140}
        className="w-full h-full block rounded-full"
      />
      <div className="absolute top-1 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-full bg-slate-950/90 text-[8px] font-bold text-emerald-300 font-mono">
        RADAR
      </div>
    </div>
  );
};
