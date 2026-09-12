import React, { useState } from 'react';
import { 
  User, 
  Trophy, 
  Swords, 
  Target, 
  Calendar, 
  Check, 
  Edit3, 
  Coins, 
  Gem, 
  Medal, 
  X,
  Flame
} from 'lucide-react';
import { PlatformUser } from '../../types/platform';

interface ProfileModalProps {
  user: PlatformUser;
  onUpdateUser: (updatedUser: PlatformUser) => void;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  user,
  onUpdateUser,
  onClose,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(user.name);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempName.trim()) {
      onUpdateUser({
        ...user,
        name: tempName.trim(),
      });
    }
    setIsEditingName(false);
  };

  const winRate = user.totalMatches > 0 ? ((user.victories / user.totalMatches) * 100).toFixed(1) : '0';
  const kdRatio = user.totalMatches > 0 ? (user.totalKills / user.totalMatches).toFixed(1) : '0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-2xl rounded-2xl bg-[#F4F9F4] border border-[#CFE2D3] p-6 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto text-[#143823]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-[#E8F2EA] hover:bg-[#DFEDE2] text-[#4D6957] hover:text-[#143823] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Profile Header */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-600 to-green-700 flex items-center justify-center text-white shadow-md shadow-emerald-700/20 border-2 border-emerald-400">
              <User className="w-10 h-10" />
            </div>
            <span className="absolute -bottom-1 -right-1 text-xs font-black bg-[#F4F9F4] text-emerald-900 border border-emerald-400 px-2 py-0.5 rounded-md shadow-xs">
              Lv. {user.level}
            </span>
          </div>

          <div className="space-y-1 text-center sm:text-left flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              {isEditingName ? (
                <form onSubmit={handleSaveName} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    maxLength={16}
                    className="px-2.5 py-1 rounded bg-[#E8F2EA] border border-emerald-500 text-[#143823] font-bold text-lg focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <>
                  <h2 className="text-2xl font-black font-heading text-[#143823]">
                    {user.name}
                  </h2>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="text-[#587563] hover:text-emerald-700 p-1"
                    title="Edit Gamer Tag"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </>
              )}

              {user.clanTag && (
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                  [{user.clanTag}]
                </span>
              )}
            </div>

            <p className="text-xs text-[#4D6957]">
              {user.title} • Tier: <strong className="text-emerald-800">{user.rankTier}</strong> ({user.rankPoints} RP)
            </p>

            {/* Level XP Progress Bar */}
            <div className="pt-2 max-w-sm space-y-1">
              <div className="flex justify-between text-[11px] text-[#4D6957]">
                <span>XP Progress to Lv. {user.level + 1}</span>
                <span className="font-mono text-emerald-800 font-bold">{user.currentXp} / {user.maxXp} XP</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#CFE2D3] overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                  style={{ width: `${(user.currentXp / user.maxXp) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Currencies Badge */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#E8F2EA] border border-[#CFE2D3]">
            <div className="flex items-center gap-1.5 text-sm font-black text-amber-700">
              <Coins className="w-4 h-4" />
              <span>{user.coins.toLocaleString()}</span>
            </div>
            <div className="w-[1px] h-4 bg-[#BCD8C3]" />
            <div className="flex items-center gap-1.5 text-sm font-black text-emerald-700">
              <Gem className="w-4 h-4" />
              <span>{user.gems.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Career Statistics Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-[#E8F2EA] border border-[#CFE2D3] text-center space-y-1">
            <div className="text-[10px] uppercase font-bold text-[#4D6957] flex items-center justify-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-600" />
              <span>Matches Won</span>
            </div>
            <div className="text-xl font-black text-[#143823]">{user.victories}</div>
            <div className="text-[11px] text-[#587563]">{winRate}% Win Rate</div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#E8F2EA] border border-[#CFE2D3] text-center space-y-1">
            <div className="text-[10px] uppercase font-bold text-[#4D6957] flex items-center justify-center gap-1">
              <Swords className="w-3.5 h-3.5 text-rose-600" />
              <span>Total Kills</span>
            </div>
            <div className="text-xl font-black text-[#143823]">{user.totalKills}</div>
            <div className="text-[11px] text-[#587563]">{kdRatio} Kills / Match</div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#E8F2EA] border border-[#CFE2D3] text-center space-y-1">
            <div className="text-[10px] uppercase font-bold text-[#4D6957] flex items-center justify-center gap-1">
              <Target className="w-3.5 h-3.5 text-emerald-600" />
              <span>Peak Territory</span>
            </div>
            <div className="text-xl font-black text-emerald-800">{user.peakTerritory}%</div>
            <div className="text-[11px] text-[#587563]">Record Conquest</div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#E8F2EA] border border-[#CFE2D3] text-center space-y-1">
            <div className="text-[10px] uppercase font-bold text-[#4D6957] flex items-center justify-center gap-1">
              <Medal className="w-3.5 h-3.5 text-teal-600" />
              <span>Total Matches</span>
            </div>
            <div className="text-xl font-black text-[#143823]">{user.totalMatches}</div>
            <div className="text-[11px] text-[#587563]">Competitive Ranked</div>
          </div>
        </div>

        {/* Recent Match History */}
        <div className="space-y-3">
          <h4 className="font-heading font-black text-base text-[#143823] flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-700" />
            <span>Recent Match History</span>
          </h4>

          <div className="divide-y divide-[#CFE2D3] rounded-xl bg-[#E8F2EA] border border-[#CFE2D3] overflow-hidden">
            {user.matchHistory.map((match) => (
              <div key={match.id} className="p-3.5 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="font-bold text-[#143823] flex items-center gap-2">
                    <span>{match.gameTitle}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#DFEFE2] text-emerald-900 uppercase font-semibold border border-[#BCD8C3]">
                      {match.mode}
                    </span>
                  </div>
                  <div className="text-[#4D6957]">
                    Ranked #{match.rank} • {match.kills} Kills
                  </div>
                </div>

                <div className="text-right space-y-0.5">
                  <div className="font-mono font-bold text-emerald-800 text-sm">
                    {match.territory}%
                  </div>
                  <div className="text-[11px] text-amber-700 font-semibold">
                    +{match.coinsEarned} 🟡  +{match.xpEarned} XP
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
