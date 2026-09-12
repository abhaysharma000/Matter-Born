import React from 'react';
import { Trophy, Skull, Swords, Clock, Sparkles, RefreshCw, Play, Home, ArrowRight } from 'lucide-react';
import { Arena3DMatchStats } from '../../types/creature';

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
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="w-full max-w-md rounded-2xl bg-[#091B14] border border-[#184635] p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl text-center relative my-auto max-h-[92vh] overflow-y-auto text-white">
        
        {/* Banner */}
        <div className="space-y-2">
          {stats.isVictory ? (
            <div className="inline-flex p-3 rounded-full bg-[#0E281E] text-amber-400 border border-amber-500/40 shadow-lg shadow-amber-500/10 animate-bounce">
              <Trophy className="w-10 h-10" />
            </div>
          ) : (
            <div className="inline-flex p-3 rounded-full bg-rose-950/70 text-rose-400 border border-rose-600/40 shadow-lg">
              <Skull className="w-10 h-10" />
            </div>
          )}

          <h2 className={`text-2xl sm:text-3xl font-black font-heading tracking-wide ${stats.isVictory ? 'text-amber-300' : 'text-white'}`}>
            {stats.isVictory ? 'ARENA CHAMPION!' : 'SURVIVAL ENDED'}
          </h2>

          <div className="inline-block px-3 py-1 rounded-full bg-[#0E281E] border border-[#1C4D3A] text-xs font-bold text-[#2BE29E]">
            Rank #{stats.rank} of {stats.totalCombatants} Fighters
          </div>
        </div>

        {/* Creature Recap */}
        <div className="p-3 rounded-xl bg-[#071610] border border-[#143B2C] space-y-1">
          <div className="text-xs text-[#6DAA8E]">Battle Robot</div>
          <div className="text-base font-black text-white">{stats.creatureName}</div>
          <div className="text-xs text-[#A1D2BC]">
            Transformed from: <span className="text-[#2BE29E] font-semibold">{stats.originalObject}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 text-left">
          <div className="p-3 rounded-xl bg-[#071610] border border-[#143B2C] space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-[#6DAA8E]">
              <Swords className="w-3 h-3 text-amber-400" />
              <span>Kills</span>
            </div>
            <div className="text-lg font-black text-white font-mono">{stats.kills}</div>
          </div>

          <div className="p-3 rounded-xl bg-[#071610] border border-[#143B2C] space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-[#6DAA8E]">
              <Clock className="w-3 h-3 text-[#2BE29E]" />
              <span>Survived</span>
            </div>
            <div className="text-lg font-black text-white font-mono">{formatTime(stats.survivalTimeSeconds)}</div>
          </div>

          <div className="p-3 rounded-xl bg-[#071610] border border-[#143B2C] space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-[#6DAA8E]">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>Damage</span>
            </div>
            <div className="text-lg font-black text-white font-mono">{stats.damageDealt}</div>
          </div>
        </div>

        {/* Real World × AI × Gaming Telemetry */}
        <div className="p-3 rounded-xl bg-[#071610] border border-[#143B2C] text-left space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="text-[#2BE29E] flex items-center gap-1">
              <span>🌐</span> COMBAT TELEMETRY
            </span>
            <span className="text-[#6DAA8E] font-mono text-[10px]">
              {stats.environmentUsed || 'Standard Arena'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
            <div className="p-2 rounded-lg bg-[#0E281E] border border-[#184635]">
              <div className="text-amber-400 font-black text-sm font-mono">{stats.materialAdvantageHits || 0}</div>
              <div className="text-[#6DAA8E] text-[9px] uppercase">Material Hits</div>
            </div>
            <div className="p-2 rounded-lg bg-[#0E281E] border border-[#184635]">
              <div className="text-[#2BE29E] font-black text-sm font-mono">{stats.kineticSurgesTriggered || 0}</div>
              <div className="text-[#6DAA8E] text-[9px] uppercase">Kinetic Surges</div>
            </div>
            <div className="p-2 rounded-lg bg-[#0E281E] border border-[#184635]">
              <div className="text-cyan-400 font-black text-sm font-mono">{stats.voiceCommandsIssued || 0}</div>
              <div className="text-[#6DAA8E] text-[9px] uppercase">Voice Orders</div>
            </div>
          </div>
        </div>

        {/* Rewards Earned */}
        <div className="flex items-center justify-around p-3 rounded-xl bg-[#071610] border border-[#184635]">
          <div className="text-center">
            <div className="text-[10px] text-[#6DAA8E] uppercase font-bold">XP Gained</div>
            <div className="text-base font-black text-[#2BE29E] font-mono">+{stats.earnedXp} XP</div>
          </div>
          <div className="h-6 w-px bg-[#184635]" />
          <div className="text-center">
            <div className="text-[10px] text-[#6DAA8E] uppercase font-bold">Arena Rating</div>
            <div className="text-base font-black text-amber-400 font-mono">+{Math.max(10, Math.round(stats.score / 25))} 🏆</div>
          </div>
        </div>

        {/* Forge Progression Callout */}
        <div className="p-2.5 rounded-xl bg-[#0E281E] border border-[#1C4D3A] text-xs text-[#A1D2BC] flex items-center gap-2 text-left">
          <span className="text-base">⚡</span>
          <span>Earn <strong>Exploration Points (EP)</strong> on real-world walks to upgrade your robot at <strong>The Forge</strong>!</span>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            onClick={onPlayAgain}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 active:scale-95 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>PLAY AGAIN WITH THIS ROBOT</span>
          </button>

          <button
            onClick={onSnapNewObject}
            className="w-full py-3 rounded-xl bg-[#0E281E] hover:bg-[#143B2C] border border-[#1C4D3A] hover:border-[#2BE29E] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#2BE29E]" />
            <span>SCAN ANOTHER OBJECT</span>
          </button>

          <button
            onClick={onReturnToLobby}
            className="w-full py-2.5 rounded-xl bg-transparent hover:bg-[#0E281E] text-[#6DAA8E] hover:text-white text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Back to Main Menu</span>
          </button>
        </div>

      </div>
    </div>
  );
};
