import React, { useEffect, useRef } from 'react';
import { GameEngine } from '../game/GameEngine';
import { CELL_SIZE, GRID_SIZE, WORLD_SIZE } from '../utils/constants';
import { Character } from '../types';

interface GameCanvasProps {
  engine: GameEngine;
  onPointerMoveAngle?: (angle: number) => void;
  isPaused: boolean;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  engine,
  onPointerMoveAngle,
  isPaused,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isMouseDownRef = useRef<boolean>(false);
  const touchOriginRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animationFrameId: number;
    let lastTime = performance.now();

    // Canvas resize handling with HiDPI
    const handleResize = () => {
      if (!canvas || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    };

    handleResize();
    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Main animation loop
    const renderLoop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      if (!isPaused && engine.gameState === 'playing') {
        engine.update(dt);
      }

      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawScene(ctx, canvas, engine);
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, [engine, isPaused]);

  // Handle Mouse & Keyboard inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPaused || engine.gameState !== 'playing') return;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          engine.handleInputDirection(0, -1);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          engine.handleInputDirection(0, 1);
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          engine.handleInputDirection(-1, 0);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          engine.handleInputDirection(1, 0);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [engine, isPaused]);

  // Pointer & Touch handlers for smooth 360-degree control
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isMouseDownRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    touchOriginRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    handlePointerAngle(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isMouseDownRef.current) return;
    handlePointerAngle(e);
  };

  const handlePointerUp = () => {
    isMouseDownRef.current = false;
    touchOriginRef.current = null;
  };

  const handlePointerAngle = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;
    const rect = canvas.getBoundingClientRect();
    const curX = e.clientX - rect.left;
    const curY = e.clientY - rect.top;

    // Direct angle from screen center (where player is centered)
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const angle = Math.atan2(curY - centerY, curX - centerX);

    engine.handleInputAngle(angle);
    if (onPointerMoveAngle) onPointerMoveAngle(angle);
  };

  return (
    <div
      ref={containerRef}
      id="game-canvas-container"
      className="relative w-full h-full overflow-hidden select-none touch-none cursor-crosshair bg-slate-100"
    >
      <canvas
        ref={canvasRef}
        id="game-main-canvas"
        className="block w-full h-full"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
    </div>
  );
};

// Canvas Drawing Routine
function drawScene(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  engine: GameEngine
) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const viewW = canvas.width / dpr;
  const viewH = canvas.height / dpr;

  ctx.save();
  ctx.scale(dpr, dpr);

  // Clear background
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, viewW, viewH);

  // Camera transform
  ctx.save();
  ctx.translate(viewW / 2, viewH / 2);
  ctx.scale(engine.zoom, engine.zoom);
  ctx.translate(-engine.cameraX, -engine.cameraY);

  // View bounds in world coords for culling
  const halfVW = (viewW / 2) / engine.zoom;
  const halfVH = (viewH / 2) / engine.zoom;
  const viewLeft = engine.cameraX - halfVW;
  const viewRight = engine.cameraX + halfVW;
  const viewTop = engine.cameraY - halfVH;
  const viewBottom = engine.cameraY + halfVH;

  // 1. Draw Grid Lines (Notebook / Paper pattern)
  drawPaperGrid(ctx, viewLeft, viewRight, viewTop, viewBottom);

  // 2. Draw Claimed Territories
  drawTerritories(ctx, engine, viewLeft, viewRight, viewTop, viewBottom);

  // 3. Draw Royale Zone (if active)
  if (engine.gameMode === 'royale') {
    drawRoyaleZone(ctx, engine);
  }

  // 4. Draw Trails
  drawTrails(ctx, engine);

  // 5. Draw Characters (Player & Bots)
  drawCharacters(ctx, engine);

  // 6. Draw Particles
  drawParticles(ctx, engine);

  // 7. Draw Floating Texts
  drawFloatingTexts(ctx, engine);

  // 8. Draw Arena Outer Boundaries
  drawArenaBorders(ctx);

  ctx.restore(); // Camera
  ctx.restore(); // DPR
}

// Background Grid
function drawPaperGrid(
  ctx: CanvasRenderingContext2D,
  left: number,
  right: number,
  top: number,
  bottom: number
) {
  const startX = Math.max(0, Math.floor(left / CELL_SIZE) * CELL_SIZE);
  const endX = Math.min(WORLD_SIZE, Math.ceil(right / CELL_SIZE) * CELL_SIZE);
  const startY = Math.max(0, Math.floor(top / CELL_SIZE) * CELL_SIZE);
  const endY = Math.min(WORLD_SIZE, Math.ceil(bottom / CELL_SIZE) * CELL_SIZE);

  ctx.beginPath();
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#e2e8f0';

  for (let x = startX; x <= endX; x += CELL_SIZE) {
    ctx.moveTo(x, startY);
    ctx.lineTo(x, endY);
  }
  for (let y = startY; y <= endY; y += CELL_SIZE) {
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
  }
  ctx.stroke();
}

// Draw Claimed Territories with batching
function drawTerritories(
  ctx: CanvasRenderingContext2D,
  engine: GameEngine,
  left: number,
  right: number,
  top: number,
  bottom: number
) {
  const minCX = Math.max(0, Math.floor(left / CELL_SIZE));
  const maxCX = Math.min(GRID_SIZE - 1, Math.ceil(right / CELL_SIZE));
  const minCY = Math.max(0, Math.floor(top / CELL_SIZE));
  const maxCY = Math.min(GRID_SIZE - 1, Math.ceil(bottom / CELL_SIZE));

  const allChars = [engine.player, ...engine.bots];
  const colorMap = new Map<number, { primary: string; dark: string }>();
  for (const c of allChars) {
    colorMap.set(c.id, { primary: c.color, dark: c.darkColor });
  }

  // Draw cells grouped by horizontal runs
  for (let cy = minCY; cy <= maxCY; cy++) {
    let currentOwner = 0;
    let runStart = 0;

    for (let cx = minCX; cx <= maxCX; cx++) {
      const idx = cy * GRID_SIZE + cx;
      const owner = engine.grid[idx];

      if (owner !== currentOwner) {
        if (currentOwner !== 0) {
          const colors = colorMap.get(currentOwner);
          if (colors) {
            ctx.fillStyle = colors.primary;
            const x = runStart * CELL_SIZE;
            const y = cy * CELL_SIZE;
            const w = (cx - runStart) * CELL_SIZE;
            ctx.fillRect(x, y, w, CELL_SIZE);
          }
        }
        currentOwner = owner;
        runStart = cx;
      }
    }

    // Flush remaining run
    if (currentOwner !== 0) {
      const colors = colorMap.get(currentOwner);
      if (colors) {
        ctx.fillStyle = colors.primary;
        const x = runStart * CELL_SIZE;
        const y = cy * CELL_SIZE;
        const w = (maxCX + 1 - runStart) * CELL_SIZE;
        ctx.fillRect(x, y, w, CELL_SIZE);
      }
    }
  }
}

// Draw Battle Royale Toxic Zone
function drawRoyaleZone(ctx: CanvasRenderingContext2D, engine: GameEngine) {
  const centerX = WORLD_SIZE / 2;
  const centerY = WORLD_SIZE / 2;
  const r = engine.royaleZoneRadius;

  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 6;
  ctx.setLineDash([12, 8]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Toxic outer tint
  ctx.beginPath();
  ctx.rect(-500, -500, WORLD_SIZE + 1000, WORLD_SIZE + 1000);
  ctx.arc(centerX, centerY, r, 0, Math.PI * 2, true);
  ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
  ctx.fill();
  ctx.restore();
}

// Draw active ribbon trails
function drawTrails(ctx: CanvasRenderingContext2D, engine: GameEngine) {
  const allChars = [engine.player, ...engine.bots];

  for (const char of allChars) {
    if (!char.alive || char.trail.length === 0) continue;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(char.trail[0].x, char.trail[0].y);
    for (let i = 1; i < char.trail.length; i++) {
      ctx.lineTo(char.trail[i].x, char.trail[i].y);
    }
    // Connect to current head
    ctx.lineTo(char.x, char.y);

    // Trail border
    ctx.lineWidth = CELL_SIZE * 0.92;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = char.strokeColor;
    ctx.stroke();

    // Trail core fill
    ctx.lineWidth = CELL_SIZE * 0.74;
    ctx.strokeStyle = char.trailColor;
    ctx.stroke();

    ctx.restore();
  }
}

// Draw Characters (Paper Box with cute eyes & custom icon)
function drawCharacters(ctx: CanvasRenderingContext2D, engine: GameEngine) {
  const allChars = [engine.player, ...engine.bots];

  // Draw bots first, then player on top
  allChars.sort((a, b) => (a.isBot === b.isBot ? 0 : a.isBot ? -1 : 1));

  for (const char of allChars) {
    if (!char.alive) continue;

    ctx.save();
    ctx.translate(char.x, char.y);

    // Subtle drop shadow
    ctx.shadowColor = 'rgba(15, 23, 42, 0.25)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;

    // Body paper square
    const boxSize = CELL_SIZE * 1.35;
    ctx.fillStyle = char.color;
    ctx.strokeStyle = char.strokeColor;
    ctx.lineWidth = 2.5;

    // Rounded rectangle
    const r = 5;
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(-boxSize / 2, -boxSize / 2, boxSize, boxSize, r);
    } else {
      ctx.rect(-boxSize / 2, -boxSize / 2, boxSize, boxSize);
    }
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.stroke();

    // Expressive Eyes looking in direction of angle
    const eyeDist = 4;
    const eyeSize = 3.2;
    const pupilSize = 1.8;
    const lookX = Math.cos(char.angle) * 1.8;
    const lookY = Math.sin(char.angle) * 1.8;

    // Left eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-eyeDist, -1, eyeSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(-eyeDist + lookX, -1 + lookY, pupilSize, 0, Math.PI * 2);
    ctx.fill();

    // Right eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(eyeDist, -1, eyeSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(eyeDist + lookX, -1 + lookY, pupilSize, 0, Math.PI * 2);
    ctx.fill();

    // Floating Name & Crown badge
    ctx.font = '600 10px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1e293b';

    const displayName = char.isBot ? char.name : `${char.name} 👑`;
    ctx.fillText(displayName, 0, -boxSize / 2 - 6);

    ctx.restore();
  }
}

// Draw Particles
function drawParticles(ctx: CanvasRenderingContext2D, engine: GameEngine) {
  for (const p of engine.particles) {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// Draw Floating Text
function drawFloatingTexts(ctx: CanvasRenderingContext2D, engine: GameEngine) {
  for (const ft of engine.floatingTexts) {
    ctx.save();
    ctx.globalAlpha = ft.alpha;
    ctx.font = `bold ${ft.size}px "Fredoka", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = ft.color;
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 4;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }
}

// Arena outer boundary
function drawArenaBorders(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#334155';
  ctx.strokeRect(0, 0, WORLD_SIZE, WORLD_SIZE);

  // Diagonal paper tape hazard pattern on borders
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#cbd5e1';
  ctx.strokeRect(7, 7, WORLD_SIZE - 14, WORLD_SIZE - 14);
  ctx.restore();
}
