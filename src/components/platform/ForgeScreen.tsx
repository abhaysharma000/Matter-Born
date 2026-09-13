import React, { useState, useEffect } from 'react';
import {
  Zap,
  Star,
  Compass,
  Swords,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { BattleCreature } from '../../types/creature';
import { ForgeUpgradeId, ForgeUpgradesState, ForgeCombatBonuses } from '../../types/forge';
import { FORGE_UPGRADES_CONFIG } from '../../constants/forgeConfig';
import {
  getExplorationPoints,
  getForgeUpgrades,
  purchaseForgeUpgrade,
  getForgeCombatBonuses,
  getNextUpgradeCost
} from '../../utils/forgeManager';
import { sound } from '../../utils/audio';

interface ForgeScreenProps {
  creature: BattleCreature;
  onNavigateTab: (tab: 'arena' | 'expedition' | 'roster' | 'forge') => void;
}

export const ForgeScreen: React.FC<ForgeScreenProps> = ({ creature, onNavigateTab }) => {
  const [ep, setEp] = useState<number>(getExplorationPoints());
  const [upgrades, setUpgrades] = useState<ForgeUpgradesState>(getForgeUpgrades());
  const [, setBonuses] = useState<ForgeCombatBonuses>(getForgeCombatBonuses());
  const [lastUpgradedId, setLastUpgradedId] = useState<ForgeUpgradeId | null>(null);
  const [purchaseNotice, setPurchaseNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync with Forge updates
  useEffect(() => {
    const handleUpdate = () => {
      const currentEp = getExplorationPoints();
      const currentUpgrades = getForgeUpgrades();
      setEp(currentEp);
      setUpgrades(currentUpgrades);
      setBonuses(getForgeCombatBonuses(currentUpgrades));
    };

    window.addEventListener('animatrix_forge_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('animatrix_forge_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const handleUpgrade = (id: ForgeUpgradeId) => {
    const res = purchaseForgeUpgrade(id);
    if (res.success) {
      sound.playBonus();
      const newEp = res.remainingEp ?? getExplorationPoints();
      setEp(newEp);
      const newUpgrades = getForgeUpgrades();
      setUpgrades(newUpgrades);
      setBonuses(getForgeCombatBonuses(newUpgrades));
      setLastUpgradedId(id);
      setErrorMessage(null);

      setPurchaseNotice(res.benefitNotice || '✨ UPGRADE!');

      setTimeout(() => {
        setLastUpgradedId(null);
        setPurchaseNotice(null);
      }, 3500);
    } else {
      sound.playError();
      setErrorMessage(res.error || 'Not enough EP yet. Explore more to earn some!');
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  // 4 Specific Tiles as requested in Part 11:
  // 1. ❤️ INCREASE HEALTH
  // 2. 🔥 FASTER FIRING
  // 3. ✨ UPGRADE SPECIAL
  // 4. ⚔️ INCREASE DAMAGE
  const tileDefinitions: Array<{
    id: ForgeUpgradeId;
    title: string;
    icon: string;
    description: string;
    badgeColor: string;
  }> = [
    {
      id: 'alloy_armor',
      title: 'HEALTH',
      icon: '❤️',
      description: 'Increases robot max health',
      badgeColor: 'border-rose-500/40 text-rose-300',
    },
    {
      id: 'energon_overdrive',
      title: 'FIRE RATE',
      icon: '🔥',
      description: 'Reduces projectile cooldown',
      badgeColor: 'border-amber-500/40 text-amber-300',
    },
    {
      id: 'special_core',
      title: 'SPECIAL',
      icon: '✨',
      description: 'Increases special ability damage',
      badgeColor: 'border-teal-400/40 text-teal-200',
    },
    {
      id: 'impact_amplifier',
      title: 'DAMAGE',
      icon: '⚔️',
      description: 'Increases basic attack damage',
      badgeColor: 'border-emerald-500/40 text-emerald-300',
    },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto px-3 sm:px-4 py-3 sm:py-5 space-y-4 sm:space-y-5 select-none">
      
      {/* Top Header Card - Dark Sci-Fi Teal Panel */}
      <div className="rounded-3xl bg-[#0B1E17] border border-[#184635] p-4 sm:p-6 shadow-xl shadow-black/30 relative overflow-hidden">
        {/* Futuristic glowing backdrop effect */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          {/* Current Fighter (Part 11 & Part 15) */}
          <div className="flex items-center gap-3.5">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg border-2 border-emerald-400/40 shrink-0"
              style={{ backgroundColor: creature.visualParams?.primaryColor || '#0D9488' }}
            >
              {creature.name.charAt(0)}
            </div>
            <div>
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-[#6EE7B7]">
                CURRENT FIGHTER
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                {creature.name}
              </h1>
              <span className="text-xs text-[#A7D7BC]">
                {creature.element} Robot • Ready for Battle
              </span>
            </div>
          </div>

          {/* Player EP (Energy Points) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-[#081812] border border-[#205742] shadow-inner">
              <span className="text-2xl">⭐</span>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block">
                  ENERGY POINTS
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono text-white leading-none">
                  {ep.toLocaleString()} <span className="text-xs font-sans font-bold text-amber-400">EP</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Celebration Notification Toast */}
      {purchaseNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/90 border-2 border-emerald-400 text-emerald-100 text-sm font-black flex items-center justify-between gap-3 shadow-lg shadow-emerald-950/40 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{purchaseNotice}</span>
          </div>
          <button
            onClick={() => onNavigateTab('arena')}
            className="px-3 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 text-xs font-black flex items-center gap-1 cursor-pointer"
          >
            <Swords className="w-3.5 h-3.5" />
            <span>Battle</span>
          </button>
        </div>
      )}

      {/* Error Message Toast */}
      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-amber-950/90 border-2 border-amber-400 text-amber-100 text-sm font-bold flex items-center justify-between gap-3 shadow-lg shadow-amber-950/40 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => onNavigateTab('expedition')}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 text-xs font-black flex items-center gap-1 cursor-pointer shrink-0"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>EXPLORE</span>
          </button>
        </div>
      )}

      {/* EXACTLY FOUR UPGRADE TILES (Part 11) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
        {tileDefinitions.map((tile) => {
          const currentStars = upgrades[tile.id] || 0;
          const isMax = currentStars >= 10;
          const nextCost = getNextUpgradeCost(tile.id, currentStars);
          const canAfford = nextCost !== null && ep >= nextCost;
          const isJustUpgraded = lastUpgradedId === tile.id;

          return (
            <div
              key={tile.id}
              className={`rounded-3xl p-4 sm:p-5 border transition-all duration-200 flex flex-col justify-between ${
                isJustUpgraded
                  ? 'bg-[#103024] border-emerald-400 ring-2 ring-emerald-400/40 shadow-xl shadow-emerald-900/30'
                  : 'bg-[#0B1E17] border-[#184635] hover:border-[#2A6B53] shadow-lg shadow-black/20'
              }`}
            >
              <div>
                {/* Title & Icon */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl sm:text-2xl">{tile.icon}</span>
                    <h3 className="font-heading font-black text-white text-base sm:text-lg tracking-wide">
                      {tile.title}
                    </h3>
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-[#081812] border ${tile.badgeColor}`}>
                    {isMax ? 'MAXED' : `${currentStars}/10`}
                  </span>
                </div>

                {/* 10 Star Progression (Part 12) */}
                <div className="my-3 py-2.5 px-3 rounded-2xl bg-[#081812] border border-[#163B2D]">
                  <div className="flex items-center justify-between mb-1.5 text-xs">
                    <span className="text-[11px] font-bold text-[#A7D7BC]">Power Level</span>
                    <span className="font-mono font-black text-amber-300 text-xs">
                      {isMax ? 'MAX LEVEL' : `${currentStars} / 10`}
                    </span>
                  </div>

                  {/* 10 Stars Visual Bar */}
                  <div className="grid grid-cols-10 gap-1 sm:gap-1.5">
                    {Array.from({ length: 10 }).map((_, index) => {
                      const isStarFilled = index < currentStars;
                      return (
                        <div
                          key={index}
                          className={`h-7 rounded-lg flex items-center justify-center transition-all ${
                            isStarFilled
                              ? 'bg-gradient-to-t from-amber-600 to-amber-400 text-amber-950 shadow-xs shadow-amber-500/30'
                              : 'bg-[#0E261E] text-[#1E4D3C]'
                          }`}
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              isStarFilled ? 'fill-current' : 'fill-none'
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Per-Star Benefit and Current Bonus */}
                  <div className="mt-2.5 pt-2 border-t border-[#133327] flex items-center justify-between text-[11px] font-mono">
                    <span className="text-[#8BBFA2]">
                      {tile.id === 'alloy_armor' && '+100 HP / star'}
                      {tile.id === 'energon_overdrive' && '+1.0/s Fire Rate / star'}
                      {tile.id === 'special_core' && '+10 Special / star'}
                      {tile.id === 'impact_amplifier' && '+20 Damage / star'}
                    </span>
                    <span className="font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                      {tile.id === 'alloy_armor' && `+${currentStars * 100} HP on Main Page`}
                      {tile.id === 'energon_overdrive' && `+${(currentStars * 1.0).toFixed(1)}/s Fire Rate`}
                      {tile.id === 'special_core' && `+${currentStars * 10} Special Dmg`}
                      {tile.id === 'impact_amplifier' && `+${currentStars * 20} Damage`}
                    </span>
                  </div>
                </div>

                {/* Cost Label */}
                <div className="text-xs text-[#A7D7BC] font-medium mb-3">
                  {isMax ? (
                    <span className="text-emerald-400 font-bold">★ Fully upgraded to maximum strength!</span>
                  ) : (
                    <span>
                      Cost: <strong className="text-white font-mono font-black text-sm">{nextCost} EP</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* Action Button (Part 12 & 13) */}
              <div>
                {isMax ? (
                  <button
                    disabled
                    className="w-full py-3 rounded-2xl bg-[#122E23] border border-[#1E4D3C] text-emerald-400 font-black text-xs uppercase tracking-wider cursor-default flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>MAX LEVEL</span>
                  </button>
                ) : canAfford ? (
                  <button
                    onClick={() => handleUpgrade(tile.id)}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-emerald-950 font-black text-sm uppercase tracking-wider shadow-md shadow-emerald-500/25 active:scale-95 transition-transform cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Zap className="w-4 h-4 fill-current" />
                    <span>UPGRADE ({nextCost} EP)</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onNavigateTab('expedition')}
                    className="w-full py-3 rounded-2xl bg-[#122E23] hover:bg-[#1A4232] border border-[#205742] text-[#A7D7BC] hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    title="Click to explore and earn more EP"
                  >
                    <Compass className="w-4 h-4 text-emerald-400" />
                    <span>Need {nextCost! - ep} EP • EXPLORE</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Simple Bottom Bar: Back to Arena */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => onNavigateTab('expedition')}
          className="px-4 py-2.5 rounded-2xl bg-[#0B1E17] hover:bg-[#122E23] border border-[#184635] text-[#A7D7BC] hover:text-white text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Compass className="w-4 h-4 text-emerald-400" />
          <span>Walk Outdoors for EP</span>
        </button>

        <button
          onClick={() => onNavigateTab('arena')}
          className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-2 shadow-sm transition-transform active:scale-95 cursor-pointer"
        >
          <Swords className="w-4 h-4" />
          <span>Go to Arena</span>
        </button>
      </div>

    </div>
  );
};
