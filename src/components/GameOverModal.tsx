import React, { useEffect } from 'react';
import { MatchStats } from '../types';
import { sound } from '../utils/audio';
import confetti from 'canvas-confetti';
import {
  RotateCcw,
  Menu,
  Trophy,
  Skull,
  Clock,
  Crown,
  Percent,
  Sparkles,
} from 'lucide-react';

interface GameOverModalProps {
  stats: MatchStats;
  isNewRecord: boolean;
  onPlayAgain: () => void;
  onReturnToMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stats,
  isNewRecord,
  onPlayAgain,
  onReturnToMenu,
}) => {
  useEffect(() => {
    if (stats.isVictory || stats.rank === 1 || isNewRecord) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [stats.isVictory, stats.rank, isNewRecord]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  return (
    <div
      id="game-over-modal"
      className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
    >
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 flex flex-col items-center gap-6 text-white text-center">
        {/* Title / Banner */}
        <div className="flex flex-col items-center">
          {stats.isVictory ? (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 border border-amber-400/40 flex items-center justify-center mb-3 shadow-lg shadow-amber-500/10">
                <Crown className="w-9 h-9 animate-bounce" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-amber-300 font-heading">
                VICTORY!
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm mt-1 font-semibold">
                You conquered the paper arena and dominated all rivals!
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-3xl bg-rose-500/20 text-rose-400 border border-rose-400/40 flex items-center justify-center mb-3 shadow-lg shadow-rose-500/10">
                <Skull className="w-9 h-9" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-rose-400 font-heading">
                ELIMINATED
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm mt-1 font-semibold">
                {stats.deathReason || 'Better luck on your next conquest!'}
              </p>
            </div>
          )}

          {isNewRecord && (
            <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-black animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>NEW PERSONAL BEST!</span>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="w-full grid grid-cols-2 gap-3">
          {/* Territory */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5 flex flex-col items-center justify-center">
            <div className="flex items-center gap-1 text-slate-400 text-xs font-semibold mb-1">
              <Percent className="w-3.5 h-3.5 text-emerald-400" />
              <span>Territory</span>
            </div>
            <span className="text-2xl font-black text-emerald-400">
              {(stats?.percentage ?? 0).toFixed(1)}%
            </span>
          </div>

          {/* Rank */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5 flex flex-col items-center justify-center">
            <div className="flex items-center gap-1 text-slate-400 text-xs font-semibold mb-1">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Final Rank</span>
            </div>
            <span className="text-2xl font-black text-amber-300">
              #{stats.rank} / {stats.totalCompetitors}
            </span>
          </div>

          {/* Kills */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5 flex flex-col items-center justify-center">
            <div className="flex items-center gap-1 text-slate-400 text-xs font-semibold mb-1">
              <Skull className="w-3.5 h-3.5 text-rose-400" />
              <span>Kills</span>
            </div>
            <span className="text-2xl font-black text-rose-400">
              {stats.kills}
            </span>
          </div>

          {/* Time */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5 flex flex-col items-center justify-center">
            <div className="flex items-center gap-1 text-slate-400 text-xs font-semibold mb-1">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Survived</span>
            </div>
            <span className="text-2xl font-black text-indigo-300">
              {formatTime(stats.timeSurvivedSeconds)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-2.5">
          <button
            id="gameover-btn-again"
            onClick={() => {
              sound.playClick();
              onPlayAgain();
            }}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-base shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transform active:scale-98 transition-all"
          >
            <RotateCcw className="w-5 h-5" />
            <span>PLAY AGAIN</span>
          </button>

          <button
            id="gameover-btn-menu"
            onClick={() => {
              sound.playClick();
              onReturnToMenu();
            }}
            className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <Menu className="w-4 h-4" />
            <span>CHANGE SKINS & MODES</span>
          </button>
        </div>
      </div>
    </div>
  );
};
