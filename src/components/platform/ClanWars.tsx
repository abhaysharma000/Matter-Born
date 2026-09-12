import React, { useState } from 'react';
import { 
  Swords, 
  Shield, 
  Users, 
  Trophy, 
  Flame, 
  MapPin, 
  Sparkles, 
  Check, 
  Plus, 
  ChevronRight,
  TrendingUp,
  X
} from 'lucide-react';
import { Clan, PlatformUser } from '../../types/platform';
import { CLANS_DATA } from '../../data/platformData';
import confetti from 'canvas-confetti';

interface ClanWarsProps {
  user: PlatformUser;
  onUpdateUser: (updatedUser: PlatformUser) => void;
}

export const ClanWars: React.FC<ClanWarsProps> = ({
  user,
  onUpdateUser,
}) => {
  const [clans, setClans] = useState<Clan[]>(CLANS_DATA);
  const [activeSector, setActiveSector] = useState<string>('sector-1');
  const [toast, setToast] = useState<string | null>(null);
  const [isCreatingClan, setIsCreatingClan] = useState(false);
  const [newClanName, setNewClanName] = useState('');
  const [newClanTag, setNewClanTag] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleJoinClan = (clan: Clan) => {
    const updated = {
      ...user,
      clanName: clan.name,
      clanTag: clan.tag,
    };
    onUpdateUser(updated);
    showToast(`Enlisted into [${clan.tag}] ${clan.name}!`);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
  };

  const handleContributeWarPower = () => {
    if (!user.clanTag) {
      showToast('You must join a clan first!');
      return;
    }

    // Boost current clan's territory
    setClans((prev) =>
      prev.map((c) => {
        if (c.tag === user.clanTag) {
          return {
            ...c,
            controlledTerritoryPct: Number((c.controlledTerritoryPct + 0.3).toFixed(1)),
            totalWins: c.totalWins + 1,
          };
        }
        return c;
      })
    );

    const updatedUser = {
      ...user,
      currentXp: Math.min(user.maxXp, user.currentXp + 60),
      coins: user.coins + 75,
    };
    onUpdateUser(updatedUser);

    showToast(`Deployed War Power! +75 Coins, +60 Clan XP.`);
  };

  const handleCreateClanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClanName.trim() || !newClanTag.trim()) return;

    if (user.coins < 500) {
      showToast('Need 500 Coins to charter a new Clan!');
      return;
    }

    const created: Clan = {
      id: `clan-${Date.now()}`,
      name: newClanName.trim(),
      tag: newClanTag.trim().toUpperCase(),
      color: '#ec4899',
      level: 1,
      membersCount: 1,
      maxMembers: 50,
      controlledTerritoryPct: 5.0,
      totalWins: 0,
      leader: user.name,
      description: 'Newly chartered conquest faction seeking territory domination.',
    };

    setClans([created, ...clans]);
    const updated = {
      ...user,
      coins: user.coins - 500,
      clanName: created.name,
      clanTag: created.tag,
    };
    onUpdateUser(updated);
    setIsCreatingClan(false);
    showToast(`Clan [${created.tag}] founded!`);
    confetti({ particleCount: 70, spread: 80, origin: { y: 0.5 } });
  };

  return (
    <div className="w-full space-y-8 pb-16">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-slate-900 border border-cyan-500 shadow-2xl text-cyan-300 font-bold text-sm flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black font-heading text-white flex items-center gap-2.5">
            <Swords className="w-7 h-7 text-rose-400" />
            <span>Global Clan Territory Wars</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Enlist with a paper conquest faction. Slice rival ribbon trails to expand your clan's sector control.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleContributeWarPower}
            className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
          >
            <Flame className="w-4 h-4" />
            <span>DEPLOY WAR POWER</span>
          </button>

          <button
            onClick={() => setIsCreatingClan(true)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4 text-cyan-400" />
            <span>Charter Clan (500 🟡)</span>
          </button>
        </div>
      </div>

      {/* Interactive Global Sector Territorial Control Map */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 space-y-5 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-cyan-400" />
            <h3 className="font-heading font-black text-lg text-white">
              Arena World Sector Dominance Map
            </h3>
          </div>
          <div className="text-xs text-slate-400">
            Cycle 12 • Real-time War Contention
          </div>
        </div>

        {/* Visual Territory Grid / Sectors */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {clans.slice(0, 4).map((clan, idx) => {
            const isUserClan = user.clanTag === clan.tag;

            return (
              <div
                key={clan.id}
                className={`p-4 rounded-xl border relative overflow-hidden transition-all ${
                  isUserClan
                    ? 'bg-slate-950 border-cyan-400 shadow-md shadow-cyan-950/40 ring-1 ring-cyan-400'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div
                  className="absolute top-0 left-0 w-1.5 h-full"
                  style={{ backgroundColor: clan.color }}
                />

                <div className="flex items-center justify-between mb-1 pl-1">
                  <span className="font-mono text-xs font-black text-cyan-400">
                    [{clan.tag}]
                  </span>
                  <span className="text-xs font-black text-white">
                    {clan.controlledTerritoryPct}%
                  </span>
                </div>

                <div className="font-bold text-sm text-white pl-1 truncate">
                  {clan.name}
                </div>
                <div className="text-xs text-slate-400 pl-1">
                  Level {clan.level} • {clan.membersCount} Conquerors
                </div>

                {/* Progress bar of territory */}
                <div className="mt-3 w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${clan.controlledTerritoryPct}%`,
                      backgroundColor: clan.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Clan Leaderboard & Enlistment Roster */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-5 shadow-xl">
        <h3 className="text-xl font-heading font-black text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          <span>Faction Standings & Roster</span>
        </h3>

        <div className="divide-y divide-slate-800/60">
          {clans.map((clan, idx) => {
            const isMember = user.clanTag === clan.tag;

            return (
              <div
                key={clan.id}
                className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-800/20 px-2 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-sm shadow"
                    style={{ backgroundColor: clan.color }}
                  >
                    #{idx + 1}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-base text-white">{clan.name}</span>
                      <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                        [{clan.tag}]
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 max-w-md">
                      {clan.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 self-end sm:self-center">
                  <div className="text-right">
                    <div className="text-xs font-bold text-white">
                      {clan.controlledTerritoryPct}% Territory
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {clan.totalWins.toLocaleString()} Wins
                    </div>
                  </div>

                  <div>
                    {isMember ? (
                      <span className="px-3.5 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        YOUR CLAN
                      </span>
                    ) : (
                      <button
                        onClick={() => handleJoinClan(clan)}
                        className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow transition-colors active:scale-95"
                      >
                        ENLIST
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Charter Clan Modal */}
      {isCreatingClan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setIsCreatingClan(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-xl font-heading font-black text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-rose-400" />
                <span>Charter a New Clan</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Establish an arena faction and rally paper warriors to claim worldwide dominance.
              </p>
            </div>

            <form onSubmit={handleCreateClanSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Clan Name</label>
                <input
                  type="text"
                  placeholder="e.g. Apex Vanguard"
                  value={newClanName}
                  onChange={(e) => setNewClanName(e.target.value)}
                  maxLength={20}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Clan Tag (3-4 characters)</label>
                <input
                  type="text"
                  placeholder="e.g. APEX"
                  value={newClanTag}
                  onChange={(e) => setNewClanTag(e.target.value.toUpperCase())}
                  maxLength={4}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono uppercase text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                <span>Charter Fee:</span>
                <span className="font-bold text-amber-400">500 Coins</span>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white font-extrabold text-sm shadow-lg shadow-rose-500/25 active:scale-95 transition-all"
                >
                  ESTABLISH CLAN
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingClan(false)}
                  className="px-4 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-sm hover:bg-slate-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
