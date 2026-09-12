import React, { useState } from 'react';
import { 
  X, 
  Crown, 
  Sparkles, 
  Lock, 
  Check, 
  Swords, 
  Shield, 
  Zap, 
  Coins, 
  Gem, 
  ChevronRight,
  Flame,
  Award,
  Star
} from 'lucide-react';
import { PlatformUser } from '../../types/platform';
import { BattleCreature } from '../../types/creature';
import { OBJECT_PRESETS, ObjectPresetSample } from '../../data/creaturePresets';
import confetti from 'canvas-confetti';

interface CybertronPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: PlatformUser;
  onUpdateUser: (updatedUser: PlatformUser) => void;
  activeCreature: BattleCreature;
  onSelectCreature: (creature: BattleCreature) => void;
}

export const CYBERTRON_PASS_COST_COINS = 500;
export const CYBERTRON_PASS_COST_GEMS = 25;

export const CybertronPassModal: React.FC<CybertronPassModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateUser,
  activeCreature,
  onSelectCreature,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'autobot' | 'decepticon'>('all');
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  if (!isOpen) return null;

  const hasPass = !!user.hasCybertronPass;
  const unlockedIds = user.unlockedTransformerIds || (hasPass ? OBJECT_PRESETS.map(p => p.id) : ['bumble-volt-battery']);

  const handlePurchaseWithCoins = () => {
    if (user.coins < CYBERTRON_PASS_COST_COINS) {
      setPurchaseError(`Requires ${CYBERTRON_PASS_COST_COINS} Coins. You have ${user.coins}.`);
      return;
    }
    const updated: PlatformUser = {
      ...user,
      coins: user.coins - CYBERTRON_PASS_COST_COINS,
      hasCybertronPass: true,
      unlockedTransformerIds: OBJECT_PRESETS.map(p => p.id),
    };
    onUpdateUser(updated);
    setPurchaseError(null);
    confetti({ particleCount: 80, spread: 80, origin: { y: 0.5 } });
  };

  const handlePurchaseWithGems = () => {
    if (user.gems < CYBERTRON_PASS_COST_GEMS) {
      setPurchaseError(`Requires ${CYBERTRON_PASS_COST_GEMS} Gems. You have ${user.gems}.`);
      return;
    }
    const updated: PlatformUser = {
      ...user,
      gems: user.gems - CYBERTRON_PASS_COST_GEMS,
      hasCybertronPass: true,
      unlockedTransformerIds: OBJECT_PRESETS.map(p => p.id),
    };
    onUpdateUser(updated);
    setPurchaseError(null);
    confetti({ particleCount: 80, spread: 80, origin: { y: 0.5 } });
  };

  const handleActivateTrial = () => {
    const updated: PlatformUser = {
      ...user,
      hasCybertronPass: true,
      unlockedTransformerIds: OBJECT_PRESETS.map(p => p.id),
    };
    onUpdateUser(updated);
    setPurchaseError(null);
    confetti({ particleCount: 90, spread: 90, origin: { y: 0.5 } });
  };

  const handleEquipRobot = (preset: ObjectPresetSample) => {
    const isUnlocked = hasPass || unlockedIds.includes(preset.id);
    if (!isUnlocked) {
      setPurchaseError(`Upgrade to Cybertron Pass to unlock ${preset.defaultCreature.name}!`);
      return;
    }
    onSelectCreature(preset.defaultCreature);
    const updated: PlatformUser = {
      ...user,
      equippedTransformerId: preset.id,
    };
    onUpdateUser(updated);
    confetti({ particleCount: 25, spread: 45, origin: { y: 0.7 } });
  };

  const filteredPresets = OBJECT_PRESETS.filter(p => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'autobot') return p.defaultCreature.faction === 'Autobot';
    if (selectedFilter === 'decepticon') return p.defaultCreature.faction === 'Decepticon';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm select-none">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-[#F4F9F4] border-2 border-emerald-500/50 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header: Cybertron Pass Banner */}
        <div className="relative p-5 sm:p-6 bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-950 text-white overflow-hidden shrink-0">
          {/* Decorative background glow */}
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-emerald-500/20 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-cyan-500/20 blur-2xl pointer-events-none" />

          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-amber-950 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                  <Crown className="w-3 h-3" />
                  <span>SEASON 1 PASS</span>
                </span>
                {hasPass ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-400 text-emerald-950 text-[10px] font-black tracking-wider flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>PREMIUM PASS ACTIVE</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-900/80 border border-emerald-400/30 text-emerald-200 text-[10px] font-bold">
                    PREMIUM BUSINESS MODEL
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-black font-heading tracking-wide flex items-center gap-2">
                <span>Transformers Cybertronian Pass</span>
              </h2>
              <p className="text-xs text-emerald-200/90 max-w-xl">
                Unlock 9 iconic 3D Cybertronian battle mechs. Custom engineered chassis, plasma weaponry, and real-world physical combat derivation.
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Pass Purchase / Upgrade Controls */}
          {!hasPass && (
            <div className="mt-4 pt-4 border-t border-white/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="text-xs text-emerald-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                <span>Get Instant Access to all 9 Legendary Autobots & Decepticons</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handlePurchaseWithCoins}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>{CYBERTRON_PASS_COST_COINS} Coins</span>
                </button>

                <button
                  onClick={handlePurchaseWithGems}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-cyan-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Gem className="w-3.5 h-3.5" />
                  <span>{CYBERTRON_PASS_COST_GEMS} Gems</span>
                </button>

                <button
                  onClick={handleActivateTrial}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs transition-colors cursor-pointer"
                  title="Test the premium pass instantly"
                >
                  <span>Free Trial</span>
                </button>
              </div>
            </div>
          )}

          {purchaseError && (
            <div className="mt-2 text-xs font-semibold text-rose-300 bg-rose-950/40 px-3 py-1 rounded-lg border border-rose-400/30">
              {purchaseError}
            </div>
          )}
        </div>

        {/* Filter Bar & User Currency status */}
        <div className="px-5 py-3 bg-[#E8F2EA] border-b border-[#CFE2D3] flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                selectedFilter === 'all'
                  ? 'bg-emerald-700 text-white'
                  : 'text-[#4D6957] hover:text-[#143823] bg-white/60'
              }`}
            >
              All Mechs ({OBJECT_PRESETS.length})
            </button>
            <button
              onClick={() => setSelectedFilter('autobot')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                selectedFilter === 'autobot'
                  ? 'bg-blue-600 text-white'
                  : 'text-[#4D6957] hover:text-[#143823] bg-white/60'
              }`}
            >
              Autobots
            </button>
            <button
              onClick={() => setSelectedFilter('decepticon')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                selectedFilter === 'decepticon'
                  ? 'bg-purple-700 text-white'
                  : 'text-[#4D6957] hover:text-[#143823] bg-white/60'
              }`}
            >
              Decepticons
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono font-bold text-[#14532D]">
            <span className="flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-amber-600" />
              <span>{user.coins}</span>
            </span>
            <span className="flex items-center gap-1">
              <Gem className="w-3.5 h-3.5 text-cyan-600" />
              <span>{user.gems}</span>
            </span>
          </div>
        </div>

        {/* Scrollable Transformer Roster List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredPresets.map((preset, index) => {
              const isUnlocked = hasPass || unlockedIds.includes(preset.id);
              const isCurrentlyEquipped = activeCreature.name === preset.defaultCreature.name;
              const isDecepticon = preset.defaultCreature.faction === 'Decepticon';
              const powerRating = preset.defaultCreature.objectComplexity?.powerRating || 1200;

              return (
                <div
                  key={preset.id}
                  className={`rounded-2xl p-4 border transition-all flex flex-col justify-between gap-3 ${
                    isCurrentlyEquipped
                      ? 'bg-emerald-50 border-2 border-emerald-600 shadow-md ring-1 ring-emerald-400'
                      : isUnlocked
                      ? 'bg-white border-[#CFE2D3] hover:border-emerald-300 shadow-xs'
                      : 'bg-stone-100/80 border-stone-300/80 opacity-90'
                  }`}
                >
                  <div className="space-y-2">
                    {/* Tier Number & Badges */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-[#E8F2EA] text-[10px] font-mono font-bold text-[#14532D]">
                          Tier {index + 1}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                            isDecepticon
                              ? 'bg-purple-100 text-purple-900 border border-purple-300'
                              : 'bg-blue-100 text-blue-900 border border-blue-300'
                          }`}
                        >
                          {preset.defaultCreature.faction}
                        </span>
                        <span className="text-[10px] font-bold text-[#55685C] uppercase">
                          {preset.defaultCreature.robotClass || 'Fighter'}
                        </span>
                      </div>

                      <div className="text-xs font-mono font-bold text-emerald-800">
                        ⚡ {powerRating}
                      </div>
                    </div>

                    {/* Robot Name & Origin */}
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-[#E8F2EA] border border-[#BCD8C3] flex items-center justify-center text-2xl shrink-0 shadow-inner">
                        {preset.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-heading font-black text-sm text-[#14532D] truncate">
                          {preset.defaultCreature.name}
                        </h4>
                        <div className="text-[11px] text-[#4D6957]">
                          From: <strong className="text-emerald-900">{preset.name}</strong>
                        </div>
                        <div className="text-[10px] text-[#55685C] italic truncate mt-0.5">
                          {preset.defaultCreature.specialAbility?.name}
                        </div>
                      </div>
                    </div>

                    {/* Combat Specs mini-bars */}
                    <div className="grid grid-cols-4 gap-1.5 pt-1 text-[10px] font-mono text-center">
                      <div className="p-1 rounded bg-[#F4F9F4] border border-[#DFEFE2]">
                        <span className="text-rose-700 font-bold">HP {preset.defaultCreature.stats.hp}</span>
                      </div>
                      <div className="p-1 rounded bg-[#F4F9F4] border border-[#DFEFE2]">
                        <span className="text-amber-700 font-bold">ATK {preset.defaultCreature.stats.attack}</span>
                      </div>
                      <div className="p-1 rounded bg-[#F4F9F4] border border-[#DFEFE2]">
                        <span className="text-blue-700 font-bold">DEF {preset.defaultCreature.stats.defense}</span>
                      </div>
                      <div className="p-1 rounded bg-[#F4F9F4] border border-[#DFEFE2]">
                        <span className="text-emerald-700 font-bold">SPD {preset.defaultCreature.stats.speed}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Action: Equip / Locked */}
                  <div className="pt-2 border-t border-stone-200/80 flex items-center justify-between">
                    <div className="text-[11px]">
                      {isUnlocked ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Unlocked with Pass</span>
                        </span>
                      ) : (
                        <span className="text-stone-500 font-semibold flex items-center gap-1">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Pass Exclusive</span>
                        </span>
                      )}
                    </div>

                    {isCurrentlyEquipped ? (
                      <button
                        disabled
                        className="px-4 py-1.5 rounded-xl bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-default"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>EQUIPPED</span>
                      </button>
                    ) : isUnlocked ? (
                      <button
                        onClick={() => handleEquipRobot(preset)}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
                      >
                        <Swords className="w-3.5 h-3.5" />
                        <span>EQUIP MECH</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          handlePurchaseWithCoins();
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold text-xs flex items-center gap-1 transition-all shadow-xs active:scale-95 cursor-pointer"
                      >
                        <Crown className="w-3.5 h-3.5" />
                        <span>GET PASS</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3 sm:p-4 bg-[#E8F2EA] border-t border-[#CFE2D3] flex items-center justify-between text-xs text-[#4D6957]">
          <span>Custom morphed objects from camera are always free to transform anytime.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white hover:bg-stone-50 border border-[#BCD8C3] text-[#14532D] font-bold cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
