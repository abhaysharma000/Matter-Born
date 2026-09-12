import React, { useState } from 'react';
import { Compass, Minimize2, Maximize2, Shield, Crosshair, Skull } from 'lucide-react';
import { ArenaHUDState } from '../../game3d/ThreeArenaEngine';

interface MiniMapProps {
  hudState: ArenaHUDState;
}

export const MiniMap: React.FC<MiniMapProps> = ({ hudState }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [hoveredFighter, setHoveredFighter] = useState<{ name: string; hp: number; maxHp: number } | null>(null);

  const arenaRadius = hudState.maxArenaRadius || 36;
  const dangerRadius = hudState.dangerRadius || arenaRadius;
  const fighters = hudState.radarFighters || [];
  const pickups = hudState.radarPickups || [];
  const playerFighter = fighters.find((f) => f.isPlayer);

  // Radar display dimensions (SVG size)
  const size = isMinimized ? 44 : 136;
  const center = size / 2;
  const radarRadius = center - 8; // leave margin for cardinal letters

  // Map 3D arena coordinates (x, z) to 2D radar coordinates (svgX, svgY)
  const mapToRadar = (x: number, z: number) => {
    const rx = (x / arenaRadius) * radarRadius;
    const rz = (z / arenaRadius) * radarRadius;
    return {
      cx: center + rx,
      cy: center + rz,
    };
  };

  const dangerZoneSvgRadius = Math.max(8, (dangerRadius / arenaRadius) * radarRadius);
  const isDangerShrinking = dangerRadius < arenaRadius - 1;

  // Active enemies count
  const activeEnemies = fighters.filter((f) => !f.isPlayer && !f.isDead);

  if (isMinimized) {
    return (
      <div className="pointer-events-auto flex items-center">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#FAF8F5]/95 backdrop-blur-md border border-[#E0DCD1] hover:border-emerald-600/40 text-xs font-semibold text-[#18251E] shadow-md transition-all hover:scale-105 active:scale-95"
          title="Expand Tactical Radar Mini-Map"
        >
          <Compass className="w-3.5 h-3.5 text-emerald-700 animate-spin-slow" />
          <span className="text-[11px] font-bold text-emerald-800">Map</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
        </button>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto flex flex-col items-center p-2 rounded-2xl bg-[#FAF8F5]/92 backdrop-blur-md border border-[#E0DCD1] shadow-lg select-none relative transition-all duration-200">
      {/* Mini-Map Header Bar */}
      <div className="flex items-center justify-between w-full px-1 pb-1 mb-0.5 border-b border-[#EAE5DA] text-[10px]">
        <div className="flex items-center gap-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
          </span>
          <span className="font-black tracking-wider text-emerald-900 uppercase">Radar</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-[#55685C] flex items-center gap-0.5">
            <Skull className="w-2.5 h-2.5 text-rose-600" />
            <span>{activeEnemies.length}</span>
          </span>
          <button
            onClick={() => setIsMinimized(true)}
            className="p-0.5 rounded hover:bg-[#EAE5DA] text-[#788B7F] hover:text-[#18251E] transition-colors"
            title="Minimize Radar"
          >
            <Minimize2 className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>

      {/* SVG Radar Disc */}
      <div className="relative">
        <svg
          width={size}
          height={size}
          className="rounded-full bg-[#F5F2EA] shadow-inner border border-[#E2DDD2]"
        >
          {/* Subtle Polar Grid: Concentric Range Rings */}
          <circle
            cx={center}
            cy={center}
            r={radarRadius * 0.33}
            fill="none"
            stroke="#DDD7CA"
            strokeWidth="0.75"
            strokeDasharray="2,2"
          />
          <circle
            cx={center}
            cy={center}
            r={radarRadius * 0.66}
            fill="none"
            stroke="#DDD7CA"
            strokeWidth="0.75"
            strokeDasharray="2,2"
          />
          <circle
            cx={center}
            cy={center}
            r={radarRadius}
            fill="none"
            stroke="#C8C1B2"
            strokeWidth="1.2"
          />

          {/* Crosshair Axes */}
          <line
            x1={center}
            y1={8}
            x2={center}
            y2={size - 8}
            stroke="#DDD7CA"
            strokeWidth="0.75"
          />
          <line
            x1={8}
            y1={center}
            x2={size - 8}
            y2={center}
            stroke="#DDD7CA"
            strokeWidth="0.75"
          />

          {/* Danger Zone Ring (if shrinking) */}
          {isDangerShrinking && (
            <circle
              cx={center}
              cy={center}
              r={dangerZoneSvgRadius}
              fill="rgba(244, 63, 94, 0.06)"
              stroke="#F43F5E"
              strokeWidth="1.2"
              strokeDasharray="3,2"
              className="animate-pulse"
            />
          )}

          {/* Cardinal Directions */}
          <text
            x={center}
            y={12}
            textAnchor="middle"
            fill="#059669"
            fontSize="8"
            fontWeight="bold"
            fontFamily="sans-serif"
          >
            N
          </text>
          <text
            x={center}
            y={size - 2}
            textAnchor="middle"
            fill="#788B7F"
            fontSize="7"
            fontFamily="sans-serif"
          >
            S
          </text>
          <text
            x={size - 5}
            y={center + 2.5}
            textAnchor="middle"
            fill="#788B7F"
            fontSize="7"
            fontFamily="sans-serif"
          >
            E
          </text>
          <text
            x={5}
            y={center + 2.5}
            textAnchor="middle"
            fill="#788B7F"
            fontSize="7"
            fontFamily="sans-serif"
          >
            W
          </text>

          {/* Pickups (Health / Energy Crystals) */}
          {pickups.map((pickup) => {
            const pt = mapToRadar(pickup.x, pickup.z);
            const isHealth = pickup.type === 'health';
            return (
              <g key={pickup.id} transform={`translate(${pt.cx}, ${pt.cy})`}>
                {isHealth ? (
                  <g>
                    <circle r="3" fill="#10B981" opacity="0.2" />
                    <rect x="-1" y="-2.5" width="2" height="5" fill="#047857" rx="0.5" />
                    <rect x="-2.5" y="-1" width="5" height="2" fill="#047857" rx="0.5" />
                  </g>
                ) : (
                  <polygon
                    points="0,-3 2.5,0 0,3 -2.5,0"
                    fill="#F59E0B"
                    stroke="#B45309"
                    strokeWidth="0.5"
                  />
                )}
              </g>
            );
          })}

          {/* Enemy / Rival Bots */}
          {fighters
            .filter((f) => !f.isPlayer)
            .map((fighter) => {
              const pt = mapToRadar(fighter.x, fighter.z);
              if (fighter.isDead) {
                return (
                  <g key={fighter.id} transform={`translate(${pt.cx}, ${pt.cy})`}>
                    <line x1="-2" y1="-2" x2="2" y2="2" stroke="#9CA3AF" strokeWidth="1" />
                    <line x1="2" y1="-2" x2="-2" y2="2" stroke="#9CA3AF" strokeWidth="1" />
                  </g>
                );
              }

              const hpPct = Math.max(0, Math.min(1, (fighter.currentHp ?? 100) / (fighter.maxHp ?? 100)));

              return (
                <g
                  key={fighter.id}
                  transform={`translate(${pt.cx}, ${pt.cy})`}
                  className="cursor-pointer"
                  onMouseEnter={() =>
                    setHoveredFighter({
                      name: fighter.name || 'Rival Bot',
                      hp: fighter.currentHp || 0,
                      maxHp: fighter.maxHp || 100,
                    })
                  }
                  onMouseLeave={() => setHoveredFighter(null)}
                >
                  {/* Outer Enemy Ping Ring */}
                  <circle r="4.5" fill="none" stroke="#EF4444" strokeWidth="0.6" opacity="0.4" />
                  {/* Enemy Marker */}
                  <circle r="3" fill="#DC2626" stroke="#991B1B" strokeWidth="0.8" />
                  {/* Mini HP Arc / Pip above */}
                  <rect
                    x="-3.5"
                    y="-6"
                    width="7"
                    height="1.5"
                    rx="0.5"
                    fill="#4B5563"
                  />
                  <rect
                    x="-3.5"
                    y="-6"
                    width={7 * hpPct}
                    height="1.5"
                    rx="0.5"
                    fill={hpPct > 0.4 ? '#10B981' : '#EF4444'}
                  />
                </g>
              );
            })}

          {/* Player Marker (High-Visibility Emerald Arrow + Pulse) */}
          {playerFighter && (() => {
            const pt = mapToRadar(playerFighter.x, playerFighter.z);
            const rotDeg = ((hudState.playerRotation || playerFighter.rotation || 0) * 180) / Math.PI;

            return (
              <g key="player-marker" transform={`translate(${pt.cx}, ${pt.cy})`}>
                {/* Radar Pulse Wave */}
                <circle
                  r="7"
                  fill="none"
                  stroke="#059669"
                  strokeWidth="0.8"
                  opacity="0.3"
                  className="animate-ping"
                />
                <circle
                  r="5"
                  fill="#10B981"
                  fillOpacity="0.25"
                />
                {/* Directional Chevron Arrow */}
                <g transform={`rotate(${rotDeg})`}>
                  <polygon
                    points="0,-5.5 3.8,4.2 0,2.2 -3.8,4.2"
                    fill="#047857"
                    stroke="#FFFFFF"
                    strokeWidth="0.9"
                  />
                </g>
              </g>
            );
          })()}
        </svg>

        {/* Hover Tooltip if pointing at an enemy */}
        {hoveredFighter && (
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-[#18251E] text-[#FAF8F5] text-[9px] font-mono whitespace-nowrap shadow-md z-10">
            {hoveredFighter.name}: {hoveredFighter.hp}/{hoveredFighter.maxHp} HP
          </div>
        )}
      </div>

      {/* Arena Range Info */}
      <div className="flex items-center justify-between w-full mt-1 px-1 text-[9px] font-mono text-[#788B7F]">
        <span>Colosseum</span>
        <span className="font-semibold text-emerald-800">{Math.round(dangerRadius)}m</span>
      </div>
    </div>
  );
};
