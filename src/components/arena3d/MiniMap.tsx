import React, { useState } from 'react';
import { Skull } from 'lucide-react';
import { ArenaHUDState } from '../../game3d/ThreeArenaEngine';

interface MiniMapProps {
  hudState: ArenaHUDState;
}

export const MiniMap: React.FC<MiniMapProps> = ({ hudState }) => {
  const [hoveredFighter, setHoveredFighter] = useState<{ name: string; hp: number; maxHp: number } | null>(null);

  const arenaRadius = hudState.maxArenaRadius || 36;
  const dangerRadius = hudState.dangerRadius || arenaRadius;
  const fighters = hudState.radarFighters || [];
  const pickups = hudState.radarPickups || [];
  const playerFighter = fighters.find((f) => f.isPlayer);

  // Compact circular radar dimensions
  const size = 80;
  const center = size / 2;
  const radarRadius = center - 5;

  // Map 3D arena coordinates (x, z) to 2D radar coordinates (cx, cy)
  const mapToRadar = (x: number, z: number) => {
    const rx = (x / arenaRadius) * radarRadius;
    const rz = (z / arenaRadius) * radarRadius;
    // Clamp inside circle
    const dist = Math.hypot(rx, rz);
    const maxDist = radarRadius - 2;
    if (dist > maxDist && dist > 0) {
      return {
        cx: center + (rx / dist) * maxDist,
        cy: center + (rz / dist) * maxDist,
      };
    }
    return {
      cx: center + rx,
      cy: center + rz,
    };
  };

  const dangerZoneSvgRadius = Math.max(6, (dangerRadius / arenaRadius) * radarRadius);
  const isDangerShrinking = dangerRadius < arenaRadius - 1;
  const activeEnemies = fighters.filter((f) => !f.isPlayer && !f.isDead);

  return (
    <div className="relative pointer-events-auto select-none group">
      {/* Sleek Circular Radar Container */}
      <div className="relative w-20 h-20 rounded-full bg-[#071610]/95 backdrop-blur-md border-2 border-emerald-500/50 shadow-xl shadow-emerald-950/60 overflow-hidden flex items-center justify-center transition-transform hover:scale-105">
        
        {/* SVG Radar Disc */}
        <svg
          width={size}
          height={size}
          className="rounded-full bg-gradient-to-b from-[#0B251B] to-[#05140E]"
        >
          {/* Subtle Concentric Range Rings */}
          <circle
            cx={center}
            cy={center}
            r={radarRadius * 0.33}
            fill="none"
            stroke="#164E3A"
            strokeWidth="0.6"
            strokeDasharray="2,2"
          />
          <circle
            cx={center}
            cy={center}
            r={radarRadius * 0.66}
            fill="none"
            stroke="#164E3A"
            strokeWidth="0.6"
            strokeDasharray="2,2"
          />
          <circle
            cx={center}
            cy={center}
            r={radarRadius}
            fill="none"
            stroke="#1F694F"
            strokeWidth="0.8"
          />

          {/* Crosshair Axes */}
          <line
            x1={center}
            y1={4}
            x2={center}
            y2={size - 4}
            stroke="#164E3A"
            strokeWidth="0.5"
          />
          <line
            x1={4}
            y1={center}
            x2={size - 4}
            y2={center}
            stroke="#164E3A"
            strokeWidth="0.5"
          />

          {/* Danger Zone Ring (if shrinking) */}
          {isDangerShrinking && (
            <circle
              cx={center}
              cy={center}
              r={dangerZoneSvgRadius}
              fill="rgba(244, 63, 94, 0.08)"
              stroke="#F43F5E"
              strokeWidth="1"
              strokeDasharray="2,2"
              className="animate-pulse"
            />
          )}

          {/* Cardinal North Indicator */}
          <text
            x={center}
            y={8}
            textAnchor="middle"
            fill="#2BE29E"
            fontSize="6"
            fontWeight="900"
            fontFamily="sans-serif"
          >
            N
          </text>

          {/* Tactical Foliage Bushes (Soft Green Translucent Radar Circles) */}
          {hudState.radarBushes?.map((bush, bIdx) => {
            const pt = mapToRadar(bush.x, bush.z);
            const svgR = Math.max(2.4, (bush.radius / arenaRadius) * radarRadius);
            return (
              <g key={`radar-bush-${bIdx}`} transform={`translate(${pt.cx}, ${pt.cy})`}>
                <circle
                  r={svgR}
                  fill="rgba(34, 197, 94, 0.22)"
                  stroke="#22C55E"
                  strokeWidth="0.4"
                />
                <circle r="0.8" fill="#4ADE80" opacity="0.8" />
              </g>
            );
          })}

          {/* Trees (Trunk & Foliage Radar Dots) */}
          {hudState.radarTrees?.map((tree, tIdx) => {
            const pt = mapToRadar(tree.x, tree.z);
            return (
              <g key={`radar-tree-${tIdx}`} transform={`translate(${pt.cx}, ${pt.cy})`}>
                <circle r="1.6" fill="#14532D" stroke="#166534" strokeWidth="0.4" />
                <circle r="0.6" fill="#84CC16" />
              </g>
            );
          })}

          {/* Pickups (Health / Energy Crystals) */}
          {pickups.map((pickup) => {
            const pt = mapToRadar(pickup.x, pickup.z);
            const isHealth = pickup.type === 'health';
            return (
              <g key={pickup.id} transform={`translate(${pt.cx}, ${pt.cy})`}>
                {isHealth ? (
                  <g>
                    <circle r="2" fill="#10B981" />
                    <rect x="-0.75" y="-1.8" width="1.5" height="3.6" fill="#A7F3D0" rx="0.3" />
                    <rect x="-1.8" y="-0.75" width="3.6" height="1.5" fill="#A7F3D0" rx="0.3" />
                  </g>
                ) : (
                  <polygon
                    points="0,-2 1.8,0 0,2 -1.8,0"
                    fill="#F59E0B"
                    stroke="#FDE68A"
                    strokeWidth="0.4"
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
                    <line x1="-1.5" y1="-1.5" x2="1.5" y2="1.5" stroke="#6B7280" strokeWidth="0.8" />
                    <line x1="1.5" y1="-1.5" x2="-1.5" y2="1.5" stroke="#6B7280" strokeWidth="0.8" />
                  </g>
                );
              }

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
                  <circle r="3.2" fill="none" stroke="#EF4444" strokeWidth="0.5" opacity="0.6" />
                  <circle r="2" fill="#EF4444" />
                </g>
              );
            })}

          {/* Player Marker (High-Visibility Emerald Arrow + Radar Ping) */}
          {playerFighter && (() => {
            const pt = mapToRadar(playerFighter.x, playerFighter.z);
            const rotDeg = ((hudState.playerRotation || playerFighter.rotation || 0) * 180) / Math.PI;

            return (
              <g key="player-marker" transform={`translate(${pt.cx}, ${pt.cy})`}>
                {/* Radar Pulse Wave */}
                <circle
                  r="5"
                  fill="none"
                  stroke="#2BE29E"
                  strokeWidth="0.6"
                  opacity="0.5"
                  className="animate-ping"
                />
                <circle
                  r="3.5"
                  fill="#10B981"
                  fillOpacity="0.3"
                />
                {/* Directional Chevron */}
                <g transform={`rotate(${rotDeg})`}>
                  <polygon
                    points="0,-4 2.8,3 0,1.5 -2.8,3"
                    fill="#2BE29E"
                    stroke="#FFFFFF"
                    strokeWidth="0.6"
                  />
                </g>
              </g>
            );
          })()}
        </svg>

        {/* Radar Center Sweep Line Effect */}
        <div className="absolute inset-0 rounded-full border border-emerald-400/20 pointer-events-none" />
      </div>

      {/* Tiny Status Badge: In Bush Stealth */}
      {hudState.isHidingInBush && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-full bg-emerald-950 border border-emerald-400/80 text-[8px] font-mono font-black text-emerald-300 flex items-center gap-0.5 shadow-lg shadow-emerald-950/80 animate-pulse whitespace-nowrap z-20">
          <span>🌿</span>
          <span>HIDDEN</span>
        </div>
      )}

      {/* Tiny Badge: Active Enemies Count */}
      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.2 rounded-full bg-[#05140E]/95 border border-emerald-500/40 text-[9px] font-mono font-black text-emerald-300 flex items-center gap-1 shadow-md whitespace-nowrap">
        <Skull className="w-2.5 h-2.5 text-rose-400" />
        <span>{activeEnemies.length} / 10 AI</span>
      </div>

      {/* Hover Tooltip */}
      {hoveredFighter && (
        <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-[#071610] border border-emerald-500/40 text-white text-[9px] font-mono whitespace-nowrap shadow-lg z-30">
          {hoveredFighter.name}: {hoveredFighter.hp}/{hoveredFighter.maxHp} HP
        </div>
      )}
    </div>
  );
};
