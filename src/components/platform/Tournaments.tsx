import React, { useState } from 'react';
import { 
  Trophy, 
  Clock, 
  Gem, 
  Coins, 
  Users, 
  Medal, 
  Crown, 
  ShieldCheck, 
  Sparkles,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { Tournament, PlatformUser } from '../../types/platform';
import { ACTIVE_TOURNAMENTS } from '../../data/platformData';
import confetti from 'canvas-confetti';

interface TournamentsProps {
  user: PlatformUser;
  onUpdateUser: (updatedUser: PlatformUser) => void;
  onEnterMatch: (mode: 'classic' | 'rush') => void;
}

export const Tournaments: React.FC<TournamentsProps> = ({
  user,
  onUpdateUser,
  onEnterMatch,
}) => {
  const [tournaments, setTournaments] = useState<Tournament[]>(ACTIVE_TOURNAMENTS);
  const [selectedTourney, setSelectedTourney] = useState<Tournament>(ACTIVE_TOURNAMENTS[0]);
  const [registeredIds, setRegisteredIds] = useState<string[]>(['blitz-frenzy']);
  const [notice, setNotice] = useState<string | null>(null);

  const isRegistered = registeredIds.includes(selectedTourney.id);

  const handleRegister = (tourney: Tournament) => {
    if (user.coins < tourney.entryFeeCoins) {
      setNotice(`Insufficient coins! Entry fee is ${tourney.entryFeeCoins} Coins.`);
      setTimeout(() => setNotice(null), 3000);
      return;
    }

    const updatedUser = {
      ...user,
      coins: user.coins - tourney.entryFeeCoins,
    };
    onUpdateUser(updatedUser);
    setRegisteredIds((prev) => [...prev, tourney.id]);
    setNotice(`Registered for "${tourney.title}"! Jump into the arena to submit scores.`);
    setTimeout(() => setNotice(null), 3500);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.5 } });
  };

  // Convert seconds to human readable
  const formatTimeRemaining = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="w-full space-y-8 pb-16">
      {notice && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-slate-900 border border-cyan-500 shadow-2xl text-cyan-300 font-bold text-sm flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{notice}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black font-heading text-white flex items-center gap-2.5">
            <Trophy className="w-7 h-7 text-amber-400" />
            <span>Competitive Arena Tournaments</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Compete against global contenders, climb seasonal rankings, and take home massive Gem prize pools.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span>Season 4 Reset in <strong>4 days</strong></span>
        </div>
      </div>

      {/* Tournament Cards Carousel / Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {tournaments.map((tourney) => {
          const registered = registeredIds.includes(tourney.id);
          const isSelected = selectedTourney.id === tourney.id;

          return (
            <div
              key={tourney.id}
              onClick={() => setSelectedTourney(tourney)}
              className={`p-5 rounded-2xl border cursor-pointer transition-all space-y-4 relative overflow-hidden ${
                isSelected
                  ? 'bg-slate-900 border-amber-500/80 shadow-xl shadow-amber-950/30 ring-1 ring-amber-500/50'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  {tourney.status} Championship
                </span>
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Ends in {formatTimeRemaining(tourney.endsInSeconds)}
                </span>
              </div>

              <div>
                <h3 className="font-heading font-black text-lg text-white">
                  {tourney.title}
                </h3>
                <p className="text-xs text-cyan-400 font-medium mt-0.5">
                  Mode: {tourney.gameMode}
                </p>
              </div>

              {/* Prize & Entry stats */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-center">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Prize Pool</div>
                  <div className="text-sm font-black text-cyan-300 flex items-center justify-center gap-1">
                    <Gem className="w-3.5 h-3.5 text-cyan-400" />
                    {tourney.prizePoolGems.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Entry Fee</div>
                  <div className="text-sm font-black text-amber-300 flex items-center justify-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    {tourney.entryFeeCoins}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Entrants</div>
                  <div className="text-sm font-black text-slate-200 flex items-center justify-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    {tourney.totalParticipants.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                {registered ? (
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Registered & Competing
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">
                    Registration open for all ranks
                  </span>
                )}
                <span className="text-xs font-bold text-cyan-400 flex items-center gap-1">
                  View Standings <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Tournament Standings Leaderboard & Quick Launch */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-xl font-heading font-black text-white flex items-center gap-2">
              <Medal className="w-5 h-5 text-amber-400" />
              <span>Current Standings: {selectedTourney.title}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Rankings refresh every match completion. Top 10 players receive guaranteed Gem rewards.
            </p>
          </div>

          <div>
            {isRegistered ? (
              <button
                onClick={() => onEnterMatch(selectedTourney.id === 'blitz-frenzy' ? 'rush' : 'classic')}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
              >
                <Crown className="w-4 h-4" />
                <span>PLAY TOURNAMENT ROUND</span>
              </button>
            ) : (
              <button
                onClick={() => handleRegister(selectedTourney)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-500/25 active:scale-95 transition-all"
              >
                <Coins className="w-4 h-4" />
                <span>REGISTER NOW ({selectedTourney.entryFeeCoins} Coins)</span>
              </button>
            )}
          </div>
        </div>

        {/* Standings Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-xs text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 font-bold">Rank</th>
                <th className="py-3 px-4 font-bold">Player & Clan</th>
                <th className="py-3 px-4 font-bold">Conquered Territory</th>
                <th className="py-3 px-4 font-bold text-right">Prize Allocation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {selectedTourney.topPlayers.map((player) => {
                const isTop1 = player.rank === 1;
                const isTop2 = player.rank === 2;
                const isTop3 = player.rank === 3;

                return (
                  <tr key={player.rank} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2 font-black">
                        {isTop1 ? (
                          <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-xs">
                            1
                          </span>
                        ) : isTop2 ? (
                          <span className="w-6 h-6 rounded-full bg-slate-300 text-slate-950 flex items-center justify-center text-xs">
                            2
                          </span>
                        ) : isTop3 ? (
                          <span className="w-6 h-6 rounded-full bg-amber-700 text-white flex items-center justify-center text-xs">
                            3
                          </span>
                        ) : (
                          <span className="text-slate-400 pl-2">#{player.rank}</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>{player.name}</span>
                        {player.clanTag && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                            [{player.clanTag}]
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-cyan-400">
                      {player.score}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <span className="inline-flex items-center gap-1 font-black text-xs text-cyan-300 bg-cyan-950/60 px-2.5 py-1 rounded-md border border-cyan-500/30">
                        <Gem className="w-3 h-3 text-cyan-400" />
                        +{player.rewardGems} Gems
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Fair Play & Anti-Cheat Ticker */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-3 text-xs text-slate-400">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>
            Protected by <strong>PaperIO Shield™</strong> server-side authoritative physics and ribbon slicing verification.
          </span>
        </div>
      </div>
    </div>
  );
};
