import React, { useEffect } from 'react';
import {
  Trophy,
  Swords,
  Clock,
  Sparkles,
  RefreshCw,
  Play,
  Home,
  Star,
  Coins,
  Zap,
} from 'lucide-react';
import { Arena3DMatchStats } from '../../types/creature';
import { sound } from '../../utils/audio';

interface MatchResultModalProps {
  stats: Arena3DMatchStats;
  onPlayAgain: () => void;
  onSnapNewObject: () => void;
  onReturnToLobby: () => void;
}

export const MatchResultModal: React.FC<MatchResultModalProps> = ({
  stats,
  onPlayAgain,
  onSnapNewObject,
  onReturnToLobby,
}) => {
  useEffect(() => {
    if (stats.isVictory) {
      sound.playBonus();
    }
  }, [stats.isVictory]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const trophiesWon = stats.trophies ?? (stats.isVictory ? 35 + stats.kills * 5 : Math.max(5, stats.kills * 5));
  const starsCount = stats.isVictory ? 3 : stats.rank <= 3 ? 2 : 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3 bg-black/85 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-sm sm:max-w-md rounded-3xl bg-gradient-to-b from-[#0B241B] via-[#071912] to-[#040E0A] border-2 border-[#2BE29E]/50 p-3.5 sm:p-5 shadow-2xl text-center relative overflow-y-auto max-h-[96vh] text-white my-auto">
        
        {/* Glowing Ambient Backdrop Accent */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#2BE29E]/20 rounded-full blur-2xl pointer-events-none" />

        {/* Victory / Defeat Header */}
        <div className="relative space-y-1.5 pt-1">
          {/* Stars Celebration */}
          <div className="flex items-center justify-center gap-1.5 mb-1">
            {[1, 2, 3].map((starNum) => (
              <div
                key={starNum}
                className={`transition-all duration-500 transform ${
                  starNum <= starsCount
                    ? 'text-amber-400 scale-110 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                    : 'text-stone-700 scale-90'
                }`}
              >
                <Star className={`w-6 h-6 sm:w-7 sm:h-7 ${starNum <= starsCount ? 'fill-amber-400' : 'fill-stone-800'}`} />
              </div>
            ))}
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#103D2C] border border-[#2BE29E]/60 text-xs font-black tracking-wider uppercase text-[#2BE29E]">
            {stats.isVictory ? (
              <>
                <Trophy className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>#1 ARENA CHAMPION!</span>
              </>
            ) : (
              <>
                <span>RANK #{stats.rank} OF {stats.totalCombatants}</span>
              </>
            )}
          </div>

          <h2 className={`text-2xl sm:text-3xl font-black font-heading tracking-wide ${stats.isVictory ? 'text-amber-300 drop-shadow-sm' : 'text-white'}`}>
            {stats.isVictory ? 'VICTORY!' : 'GREAT MATCH!'}
          </h2>

          <p className="text-xs text-[#A1D2BC] font-semibold truncate max-w-[280px] sm:max-w-[340px] mx-auto">
            🤖 <span className="text-white font-bold">{stats.creatureName}</span>
          </p>
        </div>

        {/* Rewards & Stats 4-Box Grid (Clean, colorful, satisfying) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-3.5">
          {/* Kills */}
          <div className="p-2.5 rounded-2xl bg-[#092218] border border-[#165039] flex flex-col items-center justify-center">
            <div className="flex items-center gap-1 text-[10px] font-bold text-amber-300 uppercase">
              <Swords className="w-3 h-3 text-amber-400" />
              <span>KOs</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-white mt-0.5">
              {stats.kills}
            </div>
          </div>

          {/* Coins Won */}
          <div className="p-2.5 rounded-2xl bg-[#092218] border border-[#165039] flex flex-col items-center justify-center">
            <div className="flex items-center gap-1 text-[10px] font-bold text-yellow-300 uppercase">
              <Coins className="w-3 h-3 text-yellow-400" />
              <span>Coins</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-yellow-300 mt-0.5">
              +{stats.earnedCoins}
            </div>
          </div>

          {/* XP Won */}
          <div className="p-2.5 rounded-2xl bg-[#092218] border border-[#165039] flex flex-col items-center justify-center">
            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-300 uppercase">
              <Zap className="w-3 h-3 text-[#2BE29E]" />
              <span>XP</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-[#2BE29E] mt-0.5">
              +{stats.earnedXp}
            </div>
          </div>

          {/* Trophies */}
          <div className="p-2.5 rounded-2xl bg-[#092218] border border-[#165039] flex flex-col items-center justify-center">
            <div className="flex items-center gap-1 text-[10px] font-bold text-amber-400 uppercase">
              <Trophy className="w-3 h-3 text-amber-400" />
              <span>Trophies</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-amber-400 mt-0.5">
              +{trophiesWon}
            </div>
          </div>
        </div>

        {/* Small extra stats row (Duration & Damage) */}
        <div className="flex items-center justify-center gap-4 py-1.5 px-3 rounded-xl bg-[#071912]/80 border border-[#144433] text-[11px] text-[#78B49B] font-semibold">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-[#2BE29E]" />
            <span>Time: <strong className="text-white">{formatTime(stats.survivalTimeSeconds)}</strong></span>
          </div>
          <div className="h-3 w-px bg-[#165039]" />
          <div className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>Dmg: <strong className="text-white">{stats.damageDealt}</strong></span>
          </div>
        </div>

        {/* Kid-Friendly Forge Tip */}
        <div className="mt-3 p-2 rounded-xl bg-[#0D2E21] border border-[#1F6B4C] text-[11px] text-emerald-200 flex items-center justify-center gap-1.5">
          <span className="text-sm">⚡</span>
          <span>Walk outdoors to earn <strong>Exploration Points</strong> for forge upgrades!</span>
        </div>

        {/* Action Buttons (Large, simple, easy for kids) */}
        <div className="space-y-2 mt-4">
          <button
            onClick={() => {
              sound.playClick();
              onPlayAgain();
            }}
            className="w-full py-3 sm:py-3.5 rounded-2xl bg-gradient-to-r from-[#2BE29E] via-[#20CE8C] to-[#12A86F] hover:from-[#35EEA9] hover:to-[#22CA8C] text-[#072418] font-black text-sm sm:text-base uppercase tracking-wider shadow-lg shadow-emerald-950/60 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-[#072418] text-[#072418]" />
            <span>PLAY AGAIN</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                sound.playClick();
                onSnapNewObject();
              }}
              className="py-2.5 px-2 rounded-xl bg-[#0E281E] hover:bg-[#143B2C] border border-[#1C4D3A] hover:border-[#2BE29E] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#2BE29E]" />
              <span>Scan Object</span>
            </button>

            <button
              id="btn-result-return-lobby"
              onPointerDown={(e) => {
                e.stopPropagation();
                sound.playClick();
                onReturnToLobby();
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                sound.playClick();
                onReturnToLobby();
              }}
              onClick={(e) => {
                e.stopPropagation();
                sound.playClick();
                onReturnToLobby();
              }}
              className="py-2.5 px-2 rounded-xl bg-[#071610] hover:bg-[#0E281E] border border-[#163D2E] text-[#8AC1A9] hover:text-white text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-95"
            >
              <Home className="w-3.5 h-3.5 text-[#6DAA8E]" />
              <span>LOBBY</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
