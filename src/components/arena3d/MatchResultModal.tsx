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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="w-full max-w-md rounded-2xl bg-[#F4F9F4] border border-[#CFE2D3] p-4 sm:p-7 space-y-4 sm:space-y-6 shadow-2xl text-center relative my-auto max-h-[92vh] overflow-y-auto text-[#143823]">
        
        {/* Banner */}
        <div className="space-y-2">
          {stats.isVictory ? (
            <div className="inline-flex p-3 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300 shadow-md animate-bounce">
              <Trophy className="w-10 h-10" />
            </div>
          ) : (
            <div className="inline-flex p-3 rounded-full bg-rose-100 text-rose-700 border border-rose-300 shadow-md">
              <Skull className="w-10 h-10" />
            </div>
          )}

          <h2 className={`text-2xl sm:text-3xl font-black font-heading ${stats.isVictory ? 'text-emerald-900' : 'text-[#143823]'}`}>
            {stats.isVictory ? 'ARENA CHAMPION!' : 'SURVIVAL ENDED'}
          </h2>

          <div className="inline-block px-3 py-1 rounded-full bg-[#DFEFE2] border border-[#BCD8C3] text-xs font-bold text-[#4D6957]">
            Rank #{stats.rank} of {stats.totalCombatants} Fighters
          </div>
        </div>

        {/* Creature Recap */}
        <div className="p-3 rounded-xl bg-[#E8F2EA] border border-[#CFE2D3] space-y-1">
          <div className="text-xs text-[#4D6957]">Battle Avatar</div>
          <div className="text-base font-black text-emerald-900">{stats.creatureName}</div>
          <div className="text-xs text-[#587563]">
            Synthesized from: <span className="text-[#143823] font-semibold">{stats.originalObject}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 text-left">
          <div className="p-3 rounded-xl bg-[#E8F2EA] border border-[#CFE2D3] space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-[#4D6957]">
              <Swords className="w-3 h-3 text-amber-600" />
              <span>Kills</span>
            </div>
            <div className="text-lg font-black text-[#143823]">{stats.kills}</div>
          </div>

          <div className="p-3 rounded-xl bg-[#E8F2EA] border border-[#CFE2D3] space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-[#4D6957]">
              <Clock className="w-3 h-3 text-emerald-600" />
              <span>Survived</span>
            </div>
            <div className="text-lg font-black text-[#143823]">{formatTime(stats.survivalTimeSeconds)}</div>
          </div>

          <div className="p-3 rounded-xl bg-[#E8F2EA] border border-[#CFE2D3] space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-[#4D6957]">
              <Sparkles className="w-3 h-3 text-teal-600" />
              <span>Damage</span>
            </div>
            <div className="text-lg font-black text-[#143823]">{stats.damageDealt}</div>
          </div>
        </div>

        {/* Real World × AI × Gaming Telemetry */}
        <div className="p-3 rounded-xl bg-[#E8F2EA] border border-[#CFE2D3] text-left space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="text-emerald-900 flex items-center gap-1">
              <span>🌐</span> COMBAT TELEMETRY
            </span>
            <span className="text-[#4D6957] font-mono text-[10px]">
              {stats.environmentUsed || 'Standard Arena'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
            <div className="p-1.5 rounded-lg bg-[#F4F9F4] border border-[#CFE2D3]">
              <div className="text-amber-700 font-black text-sm">{stats.materialAdvantageHits || 0}</div>
              <div className="text-[#587563] text-[9px] uppercase">Material Traits</div>
            </div>
            <div className="p-1.5 rounded-lg bg-[#F4F9F4] border border-[#CFE2D3]">
              <div className="text-emerald-700 font-black text-sm">{stats.kineticSurgesTriggered || 0}</div>
              <div className="text-[#587563] text-[9px] uppercase">Kinetic Surges</div>
            </div>
            <div className="p-1.5 rounded-lg bg-[#F4F9F4] border border-[#CFE2D3]">
              <div className="text-teal-700 font-black text-sm">{stats.voiceCommandsIssued || 0}</div>
              <div className="text-[#587563] text-[9px] uppercase">Voice Orders</div>
            </div>
          </div>
        </div>

        {/* Rewards Earned */}
        <div className="flex items-center justify-around p-3 rounded-xl bg-emerald-100/70 border border-emerald-300">
          <div className="text-center">
            <div className="text-[10px] text-[#4D6957] uppercase font-bold">XP Gained</div>
            <div className="text-base font-black text-emerald-900">+{stats.earnedXp} XP</div>
          </div>
          <div className="h-6 w-px bg-emerald-300" />
          <div className="text-center">
            <div className="text-[10px] text-[#4D6957] uppercase font-bold">Gold Coins</div>
            <div className="text-base font-black text-amber-700">+{stats.earnedCoins} 🪙</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <button
            onClick={onPlayAgain}
            className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-700/20 active:scale-95 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>PLAY AGAIN WITH THIS CREATURE</span>
          </button>

          <button
            onClick={onSnapNewObject}
            className="w-full py-3 rounded-xl bg-[#E8F2EA] hover:bg-[#DFEDE2] border border-[#BCD8C3] text-[#143823] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-700" />
            <span>SNAP ANOTHER OBJECT</span>
          </button>

          <button
            onClick={onReturnToLobby}
            className="w-full py-2.5 rounded-xl bg-transparent hover:bg-[#DFEDE2] text-[#4D6957] hover:text-[#143823] text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Back to Platform Hub</span>
          </button>
        </div>

      </div>
    </div>
  );
};
