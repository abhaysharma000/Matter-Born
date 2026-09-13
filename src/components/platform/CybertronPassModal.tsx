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
  Star,
  CheckCircle2,
  CreditCard,
  Rocket
} from 'lucide-react';
import { PlatformUser } from '../../types/platform';
import { BattleCreature } from '../../types/creature';
import { OBJECT_PRESETS, ObjectPresetSample } from '../../data/creaturePresets';
import { savePlayerRobot, setActivePlayerRobot } from '../../utils/robotStorage';
import confetti from 'canvas-confetti';

interface CybertronPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: PlatformUser;
  onUpdateUser: (updatedUser: PlatformUser) => void;
  activeCreature: BattleCreature;
  onSelectCreature: (creature: BattleCreature) => void;
}

export const CYBERTRON_PASS_PRICE_INR = 500;
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
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [justPurchased, setJustPurchased] = useState(false);

  if (!isOpen) return null;

  const hasPass = !!user.hasCybertronPass;
  // Filter out starter template 1 — only true Cybertronian Transformers in Pass S1
  const transformerPresets = OBJECT_PRESETS.filter(p => p.id !== 'starter-template-1');
  const allTransformerIds = transformerPresets.map(p => p.id);
  const unlockedIds = user.unlockedTransformerIds || (hasPass ? allTransformerIds : ['bumble-sneaker']);

  const grantGoldPass = (paymentMethod: string) => {
    const updated: PlatformUser = {
      ...user,
      hasCybertronPass: true,
      coins: user.coins + 2500, // Bonus 2,500 coins for pass purchase
      gems: user.gems + 50,     // Bonus 50 gems
      unlockedTransformerIds: allTransformerIds,
    };
    onUpdateUser(updated);
    setIsCheckoutOpen(false);
    setJustPurchased(true);
    setPurchaseError(null);

    // Auto-save Optimus Prime to player's robots collection if available
    const optimus = transformerPresets.find(p => p.id === 'optimus-truck-mug');
    if (optimus) {
      savePlayerRobot(optimus.defaultCreature);
    }

    confetti({ 
      particleCount: 120, 
      spread: 90, 
      origin: { y: 0.5 },
      colors: ['#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6']
    });
  };

  const handlePayINR = () => {
    grantGoldPass('INR_UPI_CARD');
  };

  const handlePurchaseWithCoins = () => {
    if (user.coins < CYBERTRON_PASS_COST_COINS) {
      setPurchaseError(`Requires ${CYBERTRON_PASS_COST_COINS} Coins. You currently have ${user.coins} Coins.`);
      return;
    }
    const updated: PlatformUser = {
      ...user,
      coins: user.coins - CYBERTRON_PASS_COST_COINS,
      hasCybertronPass: true,
      unlockedTransformerIds: allTransformerIds,
    };
    onUpdateUser(updated);
    setPurchaseError(null);
    confetti({ particleCount: 80, spread: 80, origin: { y: 0.5 } });
  };

  const handlePurchaseWithGems = () => {
    if (user.gems < CYBERTRON_PASS_COST_GEMS) {
      setPurchaseError(`Requires ${CYBERTRON_PASS_COST_GEMS} Gems. You currently have ${user.gems} Gems.`);
      return;
    }
    const updated: PlatformUser = {
      ...user,
      gems: user.gems - CYBERTRON_PASS_COST_GEMS,
      hasCybertronPass: true,
      unlockedTransformerIds: allTransformerIds,
    };
    onUpdateUser(updated);
    setPurchaseError(null);
    confetti({ particleCount: 80, spread: 80, origin: { y: 0.5 } });
  };

  const handleActivateTrial = () => {
    grantGoldPass('FREE_TRIAL');
  };

  const handleEquipRobot = (preset: ObjectPresetSample) => {
    const isUnlocked = hasPass || unlockedIds.includes(preset.id);
    if (!isUnlocked) {
      setPurchaseError(`Upgrade to Cybertron Gold Pass (₹500) to unlock ${preset.defaultCreature.name}!`);
      return;
    }
    // Save to player's persistent hangar and select as active
    savePlayerRobot(preset.defaultCreature);
    setActivePlayerRobot(preset.defaultCreature);
    onSelectCreature(preset.defaultCreature);
    
    const updated: PlatformUser = {
      ...user,
      equippedTransformerId: preset.id,
    };
    onUpdateUser(updated);
    confetti({ particleCount: 35, spread: 55, origin: { y: 0.6 } });
  };

  const filteredPresets = transformerPresets.filter(p => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'autobot') return p.defaultCreature.faction === 'Autobot';
    if (selectedFilter === 'decepticon') return p.defaultCreature.faction === 'Decepticon';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md select-none">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-[#081912] border-2 border-amber-500/60 shadow-2xl shadow-amber-500/20 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header: Cybertronian Transformers Banner */}
        <div className="relative p-5 sm:p-6 bg-gradient-to-r from-amber-950 via-[#1A261A] to-stone-950 text-white overflow-hidden shrink-0 border-b border-amber-500/30">
          {/* Decorative background glow */}
          <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-56 h-56 rounded-full bg-red-500/20 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-amber-500/30">
                  <Crown className="w-3.5 h-3.5 fill-amber-950" />
                  <span>GOLD PASS • SEASON 1</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[11px] font-black tracking-wide">
                  ₹500 OFFICIAL PASS
                </span>
                {hasPass && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-[11px] font-black flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>ACTIVE VIP</span>
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-black font-heading tracking-wide flex items-center gap-2.5 text-white">
                <span className="text-amber-400">Transformers:</span>
                <span>Cybertron Wars</span>
              </h2>
              <p className="text-xs sm:text-sm text-stone-300/90 max-w-2xl leading-relaxed">
                Lead the war for Cybertron with <strong className="text-amber-400">Optimus Prime</strong> (Autobot Leader), <strong className="text-purple-400">Mega-Tronus</strong> (Decepticon Emperor), and 9 iconic battle mechs.
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Pass Purchase / Upgrade Controls */}
          {!hasPass ? (
            <div className="mt-4 pt-4 border-t border-white/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="text-xs text-amber-200/90 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
                <span>Unlock all 9 Transformers + 2,500 Coins + 2x Walk EP Boost</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Main ₹500 Buy Button */}
                <button
                  onClick={() => setIsCheckoutOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-amber-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/30 transition-transform active:scale-95 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>BUY PASS FOR ₹{CYBERTRON_PASS_PRICE_INR}</span>
                </button>

                <button
                  onClick={handlePurchaseWithCoins}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0E2A1F] hover:bg-[#153D2D] border border-emerald-500/40 text-emerald-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <span>{CYBERTRON_PASS_COST_COINS} Coins</span>
                </button>

                <button
                  onClick={handleActivateTrial}
                  className="px-2.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-stone-300 font-bold text-xs transition-colors cursor-pointer"
                  title="Test pass instantly"
                >
                  <span>Free Trial</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 pt-3 border-t border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-300 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>You own the Season 1 Gold Pass! All 9 Cybertronian Transformers are unlocked in your hangar.</span>
            </div>
          )}

          {purchaseError && (
            <div className="mt-2 text-xs font-semibold text-rose-300 bg-rose-950/60 px-3 py-1.5 rounded-lg border border-rose-500/40">
              {purchaseError}
            </div>
          )}
        </div>

        {/* Filter Bar & User Currency status */}
        <div className="px-5 py-3 bg-[#0B2117] border-b border-[#184635] flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedFilter === 'all'
                  ? 'bg-amber-400 text-amber-950 font-black shadow-sm'
                  : 'text-[#8BA996] hover:text-white bg-[#061810]'
              }`}
            >
              All Transformers ({transformerPresets.length})
            </button>
            <button
              onClick={() => setSelectedFilter('autobot')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedFilter === 'autobot'
                  ? 'bg-red-600 text-white font-black shadow-sm shadow-red-600/30'
                  : 'text-[#8BA996] hover:text-white bg-[#061810]'
              }`}
            >
              Autobots (Optimus, Bumblebee)
            </button>
            <button
              onClick={() => setSelectedFilter('decepticon')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedFilter === 'decepticon'
                  ? 'bg-purple-600 text-white font-black shadow-sm shadow-purple-600/30'
                  : 'text-[#8BA996] hover:text-white bg-[#061810]'
              }`}
            >
              Decepticons (Megatron, Starscream)
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono font-bold text-emerald-400">
            <span className="flex items-center gap-1 bg-[#061810] px-2.5 py-1 rounded-lg border border-[#184635]">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>{user.coins}</span>
            </span>
            <span className="flex items-center gap-1 bg-[#061810] px-2.5 py-1 rounded-lg border border-[#184635]">
              <Gem className="w-3.5 h-3.5 text-cyan-400" />
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
                      ? 'bg-[#0F2D1F] border-2 border-emerald-400 shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400/50'
                      : isUnlocked
                      ? 'bg-[#0A1F16] border-[#1A4B36] hover:border-emerald-500/60 shadow-md'
                      : 'bg-[#071710]/90 border-[#123324] opacity-85'
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Tier Number & Badges */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-amber-400/20 border border-amber-400/30 text-[10px] font-mono font-bold text-amber-300">
                          Tier {index + 1}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                            isDecepticon
                              ? 'bg-purple-950 text-purple-300 border border-purple-500/40'
                              : 'bg-red-950 text-red-300 border border-red-500/40'
                          }`}
                        >
                          {preset.defaultCreature.faction}
                        </span>
                        <span className="text-[10px] font-bold text-[#8BA996] uppercase">
                          {preset.defaultCreature.robotClass || 'Commander'}
                        </span>
                      </div>

                      <div className="text-xs font-mono font-black text-amber-400">
                        ⚡ {powerRating} PWR
                      </div>
                    </div>

                    {/* Robot Name & Origin */}
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-[#061810] border border-[#1E5C44] flex items-center justify-center text-2xl shrink-0 shadow-inner">
                        {preset.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-heading font-black text-sm text-white truncate">
                          {preset.defaultCreature.name}
                        </h4>
                        <div className="text-[11px] text-emerald-300/80 truncate">
                          Morphed: <strong className="text-white">{preset.name}</strong>
                        </div>
                        <div className="text-[10px] text-amber-300/80 italic truncate mt-0.5">
                          Special: {preset.defaultCreature.specialAbility?.name}
                        </div>
                      </div>
                    </div>

                    {/* Combat Specs mini-bars */}
                    <div className="grid grid-cols-4 gap-1.5 pt-1 text-[10px] font-mono text-center">
                      <div className="p-1 rounded bg-[#061810] border border-[#143B2A]">
                        <span className="text-rose-400 font-bold">HP {preset.defaultCreature.stats.hp}</span>
                      </div>
                      <div className="p-1 rounded bg-[#061810] border border-[#143B2A]">
                        <span className="text-amber-400 font-bold">ATK {preset.defaultCreature.stats.attack}</span>
                      </div>
                      <div className="p-1 rounded bg-[#061810] border border-[#143B2A]">
                        <span className="text-sky-400 font-bold">DEF {preset.defaultCreature.stats.defense}</span>
                      </div>
                      <div className="p-1 rounded bg-[#061810] border border-[#143B2A]">
                        <span className="text-emerald-400 font-bold">SPD {preset.defaultCreature.stats.speed}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Action: Equip / Locked */}
                  <div className="pt-2.5 border-t border-[#143B2A] flex items-center justify-between">
                    <div className="text-[11px]">
                      {isUnlocked ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Unlocked with Pass</span>
                        </span>
                      ) : (
                        <span className="text-amber-400/80 font-bold flex items-center gap-1">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Gold Pass Exclusive</span>
                        </span>
                      )}
                    </div>

                    {isCurrentlyEquipped ? (
                      <button
                        disabled
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center gap-1.5 shadow-xs cursor-default"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>ACTIVE</span>
                      </button>
                    ) : isUnlocked ? (
                      <button
                        onClick={() => handleEquipRobot(preset)}
                        className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-[#061810] font-black text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                      >
                        <Swords className="w-3.5 h-3.5" />
                        <span>EQUIP MECH</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsCheckoutOpen(true)}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-xs flex items-center gap-1 transition-all shadow-md active:scale-95 cursor-pointer"
                      >
                        <Crown className="w-3.5 h-3.5 fill-amber-950" />
                        <span>UNLOCK ₹500</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3 sm:p-4 bg-[#0B2117] border-t border-[#184635] flex items-center justify-between text-xs text-[#8BA996]">
          <span>Official Season 1 Pass • All 9 Transformers ready for 3D battle arena.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#0E2A1F] hover:bg-[#153D2D] border border-[#1E5C44] text-white font-bold cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>

      {/* ₹500 Gold Pass Instant Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg animate-in fade-in zoom-in-95 duration-150">
          <div className="w-full max-w-md bg-[#0A1F16] border-2 border-amber-400/80 rounded-3xl p-6 space-y-5 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-[#184635] pb-3">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400 fill-amber-400" />
                <h3 className="font-heading font-black text-lg text-white">Order Summary: Gold Pass</h3>
              </div>
              <button 
                onClick={() => setIsCheckoutOpen(false)}
                className="w-8 h-8 rounded-full bg-[#061810] text-[#8BA996] hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#061810] border border-[#184635] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-heading font-black text-amber-400 text-sm">
                    Transformers Cybertron: Season 1 Gold Pass
                  </div>
                  <div className="text-xs text-[#8BA996]">Premium VIP Lifetime Season Access</div>
                </div>
                <div className="text-2xl font-mono font-black text-amber-400">
                  ₹500
                </div>
              </div>

              <div className="pt-2 border-t border-[#184635] space-y-1.5 text-xs text-stone-300">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Instant unlock of Optimus Prime, Megatron & 7 more mechs</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Bonus +2,500 Gold Coins & +50 Cybertronian Gems</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>2x Walking Exploration Points (EP) boost</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Gold Autobot / Decepticon VIP Commander Badge</span>
                </div>
              </div>
            </div>

            <button
              onClick={handlePayINR}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-amber-950 font-black text-sm tracking-wide shadow-xl shadow-amber-500/30 transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              <span>PAY ₹500 & ACTIVATE GOLD PASS</span>
            </button>

            <button
              onClick={() => setIsCheckoutOpen(false)}
              className="w-full py-2 text-center text-xs text-[#8BA996] hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
