import React, { useState, useEffect } from 'react';
import { GameEngine } from '../game/GameEngine';
import { MiniMap } from './MiniMap';
import { LeaderboardEntry } from '../types';
import { sound } from '../utils/audio';
import {
  Volume2,
  VolumeX,
  Pause,
  Crown,
  Skull,
  Maximize2,
  Minimize2,
  Flame,
  Timer,
  ShieldAlert,
} from 'lucide-react';

interface HUDProps {
  engine: GameEngine;
  onPauseToggle: () => void;
  isPaused: boolean;
}

export const HUD: React.FC<HUDProps> = ({ engine, onPauseToggle, isPaused }) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isMuted, setIsMuted] = useState<boolean>(sound.isMuted);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [territoryPercent, setTerritoryPercent] = useState<number>(0);
  const [kills, setKills] = useState<number>(0);
  const [playerRank, setPlayerRank] = useState<number>(1);
  const [rushTime, setRushTime] = useState<number>(120);

  useEffect(() => {
    const interval = setInterval(() => {
      if (engine.gameState === 'playing') {
        const board = engine.getLeaderboard();
        setLeaderboard(board.slice(0, 5));
        setTerritoryPercent(engine.player.territoryPercentage);
        setKills(engine.player.kills);

        const rankIndex = board.findIndex((b) => b.isPlayer);
        setPlayerRank(rankIndex !== -1 ? rankIndex + 1 : board.length);
        setRushTime(Math.ceil(engine.rushTimeRemaining));
      }
    }, 150);

    return () => clearInterval(interval);
  }, [engine]);

  const handleMuteToggle = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
    if (!muted) sound.playClick();
  };

  const handleFullscreenToggle = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
    sound.playClick();
  };

  const formatRushTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      id="game-hud"
      className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-5 select-none"
    >
      {/* Top Bar */}
      <div className="flex items-start justify-between w-full gap-3">
        {/* Top-Left: Player Stats Card */}
        <div
          id="hud-player-stats"
          className="pointer-events-auto flex flex-col gap-1.5 bg-slate-900/85 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-slate-700/60 shadow-xl text-white min-w-[150px] sm:min-w-[180px]"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-md shadow-sm border border-white/20"
                style={{ backgroundColor: engine.player.color }}
              />
              <span className="font-bold text-sm sm:text-base truncate max-w-[90px] sm:max-w-[120px]">
                {engine.player.name}
              </span>
            </div>
            <div className="flex items-center gap-1 bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full text-xs font-black">
              <Crown className="w-3 h-3 text-amber-400" />
              <span>#{playerRank}</span>
            </div>
          </div>

          {/* Territory Conquest Bar */}
          <div className="mt-1">
            <div className="flex justify-between items-baseline text-xs mb-1">
              <span className="text-slate-400 font-medium">Territory</span>
              <span className="font-extrabold text-sm text-emerald-400">
                {(territoryPercent ?? 0).toFixed(1)}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.max(2, territoryPercent))}%`,
                  backgroundColor: engine.player.color,
                }}
              />
            </div>
          </div>

          {/* Kills Counter */}
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
            <div className="flex items-center gap-1 text-slate-300">
              <Skull className="w-3.5 h-3.5 text-rose-400" />
              <span>Kills</span>
            </div>
            <span className="font-black text-rose-400 text-sm">{kills}</span>
          </div>
        </div>

        {/* Top-Center: Game Mode & Timer / Royale Status */}
        <div className="flex flex-col items-center gap-1.5">
          {engine.gameMode === 'rush' && (
            <div
              id="hud-timer-badge"
              className="pointer-events-auto flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-600/90 backdrop-blur-md text-white border border-indigo-400/30 shadow-lg text-sm font-bold"
            >
              <Timer className="w-4 h-4 text-indigo-200 animate-spin" />
              <span>{formatRushTime(rushTime)}</span>
            </div>
          )}

          {engine.gameMode === 'royale' && (
            <div
              id="hud-royale-badge"
              className="pointer-events-auto flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600/90 backdrop-blur-md text-white border border-rose-400/30 shadow-lg text-xs sm:text-sm font-bold animate-pulse"
            >
              <ShieldAlert className="w-4 h-4 text-rose-200" />
              <span>Toxic Storm Shrinking</span>
            </div>
          )}

          {/* Killfeed Ticker */}
          <div className="flex flex-col items-center gap-1">
            {engine.killFeed.slice(0, 2).map((item) => (
              <div
                key={item.id}
                className="px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-sm text-xs font-semibold text-slate-200 border border-slate-700/50 shadow animate-fade-in flex items-center gap-1.5"
              >
                <Flame className="w-3 h-3 text-amber-400 shrink-0" />
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top-Right: Leaderboard & Controls */}
        <div className="flex flex-col items-end gap-2.5">
          {/* Quick Action Buttons */}
          <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md p-1 rounded-xl border border-slate-700/60 shadow-lg">
            <button
              id="hud-btn-mute"
              onClick={handleMuteToggle}
              title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
            <button
              id="hud-btn-fullscreen"
              onClick={handleFullscreenToggle}
              title="Toggle Fullscreen"
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              id="hud-btn-pause"
              onClick={onPauseToggle}
              title="Pause Game"
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <Pause className="w-4 h-4 text-amber-400" />
            </button>
          </div>

          {/* Live Leaderboard */}
          <div
            id="hud-leaderboard"
            className="pointer-events-auto bg-slate-900/85 backdrop-blur-md rounded-2xl border border-slate-700/60 shadow-xl p-2.5 min-w-[170px] sm:min-w-[210px] text-white"
          >
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Leaderboard</span>
              <span>Map %</span>
            </div>
            <div className="flex flex-col gap-1">
              {leaderboard.map((entry) => (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    entry.isPlayer
                      ? 'bg-amber-500/20 text-white font-bold ring-1 ring-amber-400/60'
                      : 'text-slate-300 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate max-w-[120px]">
                    <span
                      className={`text-[10px] font-black ${
                        entry.rank === 1
                          ? 'text-amber-400'
                          : entry.rank === 2
                          ? 'text-slate-300'
                          : entry.rank === 3
                          ? 'text-amber-600'
                          : 'text-slate-500'
                      }`}
                    >
                      {entry.rank === 1 ? '👑' : `${entry.rank}.`}
                    </span>
                    <div
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="truncate">{entry.name}</span>
                  </div>
                  <span
                    className={`text-xs font-bold ${
                      entry.isPlayer ? 'text-amber-300' : 'text-slate-400'
                    }`}
                  >
                    {(entry?.percentage ?? 0).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar: MiniMap & Controls hint */}
      <div className="flex items-end justify-between w-full">
        {/* Bottom-Left: MiniMap */}
        <div className="pointer-events-auto">
          <MiniMap engine={engine} />
        </div>

        {/* Bottom-Center: Controls Hint */}
        <div
          id="hud-controls-hint"
          className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-900/75 backdrop-blur-md text-[11px] font-medium text-slate-400 border border-slate-800 shadow"
        >
          <span>Use <strong className="text-white">WASD</strong> or <strong className="text-white">Arrow Keys</strong> to steer</span>
          <span className="text-slate-600">|</span>
          <span>Or <strong className="text-white">Click & Drag</strong> mouse/touch</span>
        </div>

        {/* Bottom-Right: Quick Exit to territory advice */}
        <div className="pointer-events-none opacity-80 text-right text-[11px] font-bold text-slate-400 hidden sm:block">
          <p className="bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
            Cut enemy trails to eliminate them!
          </p>
        </div>
      </div>
    </div>
  );
};
