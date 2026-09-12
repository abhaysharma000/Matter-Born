import React, { useState, useEffect } from 'react';
import { X, Sparkles, Zap, Shield, Swords, Activity, Radio, Check, Lock } from 'lucide-react';
import {
  EXPLORATION_UPGRADES_CONFIG,
  EXPLORATION_UPGRADES_STORAGE_KEY,
} from '../../constants/explorationConfig';
import { ExplorationUpgradeItem } from '../../types/exploration';
import { sound } from '../../utils/audio';

interface ExplorationUpgradesModalProps {
  isOpen: boolean;
  onClose: () => void;
  explorationPoints: number;
  onSpendPoints: (amount: number) => boolean;
}

export const ExplorationUpgradesModal: React.FC<ExplorationUpgradesModalProps> = ({
  isOpen,
  onClose,
  explorationPoints,
  onSpendPoints,
}) => {
  const [upgradeLevels, setUpgradeLevels] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(EXPLORATION_UPGRADES_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {};
  });

  const [purchaseFeedback, setPurchaseFeedback] = useState<string | null>(null);

  // Sync with localStorage
  useEffect(() => {
    try {
      localStorage.setItem(EXPLORATION_UPGRADES_STORAGE_KEY, JSON.stringify(upgradeLevels));
    } catch {
      // ignore
    }
  }, [upgradeLevels]);

  if (!isOpen) return null;

  const handleBuyUpgrade = (item: ExplorationUpgradeItem) => {
    const currentLevel = upgradeLevels[item.id] || 0;
    if (currentLevel >= item.maxLevel) return;

    const cost = Math.round(item.baseCost * Math.pow(item.costMultiplier, currentLevel));
    if (explorationPoints < cost) {
      sound.playClick();
      return;
    }

    const success = onSpendPoints(cost);
    if (success) {
      sound.playBonus();
      setUpgradeLevels((prev) => ({
        ...prev,
        [item.id]: (prev[item.id] || 0) + 1,
      }));
      setPurchaseFeedback(`Upgraded ${item.name} to Level ${currentLevel + 1}!`);
      setTimeout(() => setPurchaseFeedback(null), 2500);
    }
  };

  const getUpgradeIcon = (id: string) => {
    switch (id) {
      case 'mobility':
        return <Zap className="w-5 h-5 text-amber-500" />;
      case 'defense':
        return <Shield className="w-5 h-5 text-blue-500" />;
      case 'attack':
        return <Swords className="w-5 h-5 text-rose-500" />;
      case 'ability':
        return <Activity className="w-5 h-5 text-purple-500" />;
      case 'scanner':
        return <Radio className="w-5 h-5 text-emerald-500" />;
      default:
        return <Sparkles className="w-5 h-5 text-amber-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-[#FAF8F5] rounded-3xl border border-[#DCD6C8] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#F3EFE6] border-b border-[#E0DCD0] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                  MATTER BORN FORGE
                </span>
                <span className="text-stone-300">•</span>
                <span className="text-[10px] font-bold text-[#55685C]">EXPEDITION WORKSHOP</span>
              </div>
              <h3 className="font-heading font-black text-lg text-[#143823]">
                Tactical Exploration Upgrades
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* EP Balance Pill */}
            <div className="px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 font-mono font-black text-xs flex items-center gap-1.5 shadow-xs">
              <span className="text-amber-500">⚡</span>
              <span>{explorationPoints} EP</span>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {purchaseFeedback && (
          <div className="px-4 py-2 bg-emerald-100 border-b border-emerald-300 text-emerald-900 text-xs font-bold text-center animate-in fade-in duration-150">
            {purchaseFeedback}
          </div>
        )}

        {/* Upgrades List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
          <p className="text-xs text-[#55685C] leading-relaxed">
            Spend Exploration Points earned from real-world outdoor movement to permanently upgrade all your scanned and transmuted mechs.
          </p>

          <div className="space-y-2.5">
            {EXPLORATION_UPGRADES_CONFIG.map((item) => {
              const currentLevel = upgradeLevels[item.id] || 0;
              const isMaxed = currentLevel >= item.maxLevel;
              const cost = Math.round(item.baseCost * Math.pow(item.costMultiplier, currentLevel));
              const canAfford = explorationPoints >= cost && !isMaxed;

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isMaxed
                      ? 'bg-[#E8EFE9]/60 border-emerald-300/80'
                      : canAfford
                      ? 'bg-[#FFFFFF] border-[#CFD8D1] shadow-xs hover:border-emerald-500'
                      : 'bg-[#F5F2EB] border-[#DDD7CB] opacity-80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#F0EBE1] border border-[#DDD7CB] flex items-center justify-center shrink-0 mt-0.5">
                        {getUpgradeIcon(item.id)}
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="font-heading font-black text-sm text-[#143823]">
                            {item.name}
                          </h4>
                          <span className="px-2 py-0.2 rounded-md bg-stone-200 text-stone-800 text-[10px] font-mono font-bold">
                            Lv. {currentLevel} / {item.maxLevel}
                          </span>
                        </div>
                        <p className="text-xs text-[#55685C]">{item.description}</p>
                        <div className="text-[11px] font-semibold text-emerald-800 pt-0.5">
                          {item.statBenefitLabel}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      {isMaxed ? (
                        <div className="px-3 py-1.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-xs flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>MAXED</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleBuyUpgrade(item)}
                          disabled={!canAfford}
                          className={`px-3.5 py-2 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                            canAfford
                              ? 'bg-emerald-700 hover:bg-emerald-800 text-white active:scale-95'
                              : 'bg-stone-300 text-stone-500 cursor-not-allowed opacity-60'
                          }`}
                        >
                          <span>{cost} EP</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Level Bars */}
                  <div className="flex items-center gap-1 mt-2.5 pt-2 border-t border-[#ECE7DC]">
                    {Array.from({ length: item.maxLevel }).map((_, idx) => (
                      <div
                        key={idx}
                        className={`h-1.5 flex-1 rounded-full ${
                          idx < currentLevel ? 'bg-emerald-600' : 'bg-stone-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-[#F3EFE6] border-t border-[#E0DCD0] flex items-center justify-between text-xs text-[#55685C]">
          <span>Exploration Points are earned automatically as you walk outdoors.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
