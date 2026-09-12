import React, { useState } from 'react';
import { 
  Play, 
  Camera, 
  Swords, 
  Globe, 
  Zap, 
  Heart, 
  Shield, 
  Sparkles,
  Crown,
  ChevronRight,
  Compass,
  Anvil
} from 'lucide-react';
import { BattleCreature } from '../../types/creature';
import { OBJECT_PRESETS } from '../../data/creaturePresets';
import { PlatformUser } from '../../types/platform';
import { INITIAL_USER } from '../../data/platformData';
import { LobbyPetStage } from './LobbyPetStage';
import { CreatureMorphModal } from '../morph/CreatureMorphModal';
import { CybertronPassModal } from './CybertronPassModal';
import { getForgeCombatBonuses } from '../../utils/forgeManager';
import confetti from 'canvas-confetti';

interface GameCatalogProps {
  onLaunchGame: (gameId: string, mode?: 'classic' | 'rush' | 'royale') => void;
  onOpenServers: () => void;
  onOpenExpedition?: () => void;
  onOpenForge?: () => void;
  activeCreature?: BattleCreature;
  onSelectCreature?: (creature: BattleCreature) => void;
  user?: PlatformUser;
  onUpdateUser?: (updatedUser: PlatformUser) => void;
  onOpenPass?: () => void;
}

export const GameCatalog: React.FC<GameCatalogProps> = ({
  onLaunchGame,
  onOpenServers,
  onOpenExpedition,
  onOpenForge,
  activeCreature: externalActiveCreature,
  onSelectCreature,
  user: externalUser,
  onUpdateUser,
  onOpenPass,
}) => {
  const [internalCreature, setInternalCreature] = useState<BattleCreature>(
    OBJECT_PRESETS[0].defaultCreature
  );
  const [localUser, setLocalUser] = useState<PlatformUser>(INITIAL_USER);

  const currentUser = externalUser || localUser;
  const handleUserChange = (u: PlatformUser) => {
    setLocalUser(u);
    if (onUpdateUser) onUpdateUser(u);
  };

  const activeCreature = externalActiveCreature || internalCreature;
  const setActiveCreature = (c: BattleCreature) => {
    setInternalCreature(c);
    if (onSelectCreature) onSelectCreature(c);
  };

  const [isMorphModalOpen, setIsMorphModalOpen] = useState(false);
  const [isCybertronPassOpen, setIsCybertronPassOpen] = useState(false);
  const [isSwitchRobotOpen, setIsSwitchRobotOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState<'classic' | 'rush' | 'royale'>('classic');

  const baseHp = activeCreature.stats?.hp || 450;
  const baseAtk = activeCreature.stats?.attack || 85;
  const baseSpecial = activeCreature.specialAbility?.damage || 280;
  const baseFireRate = 8.0;

  const forgeBonuses = getForgeCombatBonuses();
  const hp = Math.round(baseHp * (1 + forgeBonuses.healthBonusPercent / 100));
  const atk = Math.round(baseAtk * (1 + forgeBonuses.damageBonusPercent / 100));
  const fireRate = (baseFireRate * (1 + forgeBonuses.fireRateBonusPercent / 100)).toFixed(1);
  const specialDmg = Math.round(baseSpecial * (1 + forgeBonuses.specialBonusPercent / 100));

  const handleOpenCybertronPass = () => {
    if (onOpenPass) {
      onOpenPass();
    } else {
      setIsCybertronPassOpen(true);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 select-none">
      
      {/* 2-Column Hero: 3D Stage + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Column: 3D Mech Stage & Transformers Pass Banner */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-3">
          <LobbyPetStage
            creature={activeCreature}
            onSnapNew={() => setIsMorphModalOpen(true)}
            onPlayBattle={() => onLaunchGame('animatrix-3d-arena', selectedMode)}
          />

          {/* Transformers Cybertronian Pass Banner */}
          <div 
            onClick={handleOpenCybertronPass}
            className="rounded-2xl bg-gradient-to-r from-[#0B2219] via-[#0E2D21] to-[#0B2219] text-white p-3.5 sm:p-4 shadow-lg border border-[#184635] flex items-center justify-between gap-3 cursor-pointer hover:border-amber-400/60 transition-all group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-500 text-amber-950 flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform font-black">
                <Crown className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-heading font-black text-xs sm:text-sm tracking-wide text-white truncate">
                    Transformers Cybertronian Pass
                  </span>
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-400 text-amber-950 shrink-0">
                    SEASON 1
                  </span>
                </div>
                <p className="text-[11px] text-emerald-300/80 truncate mt-0.5">
                  Unlock 9 Legendary Mechs (Optimus, Megatron, Starscream & more)
                </p>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleOpenCybertronPass();
              }}
              className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-xs shrink-0 flex items-center gap-1 shadow-sm transition-transform active:scale-95 cursor-pointer"
            >
              <span>View Pass</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Column: Battle Control & Simple High-Impact Stats */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4 rounded-3xl bg-[#0B1E17] border border-[#184635] p-5 sm:p-6 shadow-2xl">
          
          {/* Header: Current Fighter with Switch Button */}
          <div className="flex items-center justify-between border-b border-[#184635] pb-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#8BA996]">
                CURRENT FIGHTER
              </div>
              <h1 className="text-2xl sm:text-3xl font-black font-heading text-white tracking-wide truncate max-w-[220px]">
                {activeCreature.name}
              </h1>
            </div>
            <button
              onClick={() => setIsSwitchRobotOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-[#0E2A1F] hover:bg-[#153D2D] border border-[#1E5C44] text-xs font-bold text-emerald-300 transition-colors cursor-pointer shadow-sm active:scale-95"
            >
              Switch
            </button>
          </div>

          {/* 4 Large, Readable Primary Stats (Part 4 specification) */}
          <div className="grid grid-cols-2 gap-3">
            {/* Health */}
            <div className="p-3.5 rounded-2xl bg-[#071912] border border-[#184635] flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-bold text-[#8BA996]">
                <span className="flex items-center gap-1.5">
                  <span className="text-base">❤️</span>
                  <span>Health</span>
                </span>
                {forgeBonuses.healthBonusPercent > 0 && (
                  <span className="text-[10px] font-mono font-black text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                    +{forgeBonuses.healthBonusPercent}%
                  </span>
                )}
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-mono font-black text-white">
                {hp.toLocaleString()}
              </div>
            </div>

            {/* Damage */}
            <div className="p-3.5 rounded-2xl bg-[#071912] border border-[#184635] flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-bold text-[#8BA996]">
                <span className="flex items-center gap-1.5">
                  <span className="text-base">⚔️</span>
                  <span>Damage</span>
                </span>
                {forgeBonuses.damageBonusPercent > 0 && (
                  <span className="text-[10px] font-mono font-black text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30">
                    +{forgeBonuses.damageBonusPercent}%
                  </span>
                )}
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-mono font-black text-white">
                {atk}
              </div>
            </div>

            {/* Fire Rate */}
            <div className="p-3.5 rounded-2xl bg-[#071912] border border-[#184635] flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-bold text-[#8BA996]">
                <span className="flex items-center gap-1.5">
                  <span className="text-base">🔥</span>
                  <span>Fire Rate</span>
                </span>
                {forgeBonuses.fireRateBonusPercent > 0 && (
                  <span className="text-[10px] font-mono font-black text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                    +{forgeBonuses.fireRateBonusPercent}%
                  </span>
                )}
              </div>
              <div className="mt-2 text-xl sm:text-2xl font-mono font-black text-white">
                {fireRate} <span className="text-xs font-sans text-[#8BA996]">/ sec</span>
              </div>
            </div>

            {/* Special */}
            <div className="p-3.5 rounded-2xl bg-[#071912] border border-[#184635] flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-bold text-[#8BA996]">
                <span className="flex items-center gap-1.5">
                  <span className="text-base">✨</span>
                  <span>Special</span>
                </span>
                {forgeBonuses.specialBonusPercent > 0 && (
                  <span className="text-[10px] font-mono font-black text-teal-400 bg-teal-950/60 px-1.5 py-0.5 rounded border border-teal-500/30">
                    +{forgeBonuses.specialBonusPercent}%
                  </span>
                )}
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-mono font-black text-white">
                {specialDmg}
              </div>
            </div>
          </div>

          {/* Mode Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#8BA996]">
              <span>BATTLE MODE</span>
              <span className="text-emerald-400 font-mono">
                {selectedMode === 'classic' ? 'STANDARD' : selectedMode === 'rush' ? 'FAST PACED' : 'SURVIVAL'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#071912] border border-[#184635] text-xs font-bold">
              <button
                onClick={() => setSelectedMode('classic')}
                className={`py-2 rounded-lg transition-colors cursor-pointer ${
                  selectedMode === 'classic'
                    ? 'bg-emerald-600 text-white shadow-sm font-black'
                    : 'text-[#8BA996] hover:text-white'
                }`}
              >
                Arena
              </button>
              <button
                onClick={() => setSelectedMode('rush')}
                className={`py-2 rounded-lg transition-colors cursor-pointer ${
                  selectedMode === 'rush'
                    ? 'bg-emerald-600 text-white shadow-sm font-black'
                    : 'text-[#8BA996] hover:text-white'
                }`}
              >
                Blitz 60s
              </button>
              <button
                onClick={() => setSelectedMode('royale')}
                className={`py-2 rounded-lg transition-colors cursor-pointer ${
                  selectedMode === 'royale'
                    ? 'bg-emerald-600 text-white shadow-sm font-black'
                    : 'text-[#8BA996] hover:text-white'
                }`}
              >
                Royale
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              onClick={() => onLaunchGame('animatrix-3d-arena', selectedMode)}
              className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.98] text-[#061810] font-black text-lg tracking-wider flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-500/25 transition-all cursor-pointer"
            >
              <Play className="w-6 h-6 fill-current" />
              <span>BATTLE NOW</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              {onOpenExpedition && (
                <button
                  onClick={onOpenExpedition}
                  className="py-2.5 px-3 rounded-xl bg-[#0E2A1F] hover:bg-[#153D2D] active:scale-[0.98] border border-[#1E5C44] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Compass className="w-4 h-4 text-emerald-400" />
                  <span>EXPLORE</span>
                </button>
              )}

              {onOpenForge && (
                <button
                  onClick={onOpenForge}
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-950/80 to-amber-900/80 hover:from-amber-900 hover:to-amber-800 active:scale-[0.98] border border-amber-500/40 text-amber-200 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Anvil className="w-4 h-4 text-amber-400" />
                  <span>FORGE</span>
                </button>
              )}
            </div>

            <button
              onClick={() => setIsMorphModalOpen(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-[#071912] hover:bg-[#0E2A1F] active:scale-[0.98] border border-[#184635] text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4 text-emerald-400" />
              <span>Make Robot from Real Object</span>
            </button>
          </div>

        </div>

      </div>

      {/* Switch Fighter Quick Modal */}
      {isSwitchRobotOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0B1E17] border border-[#184635] rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#184635] pb-3">
              <h3 className="font-heading font-black text-lg text-white">Choose Your Robot</h3>
              <button 
                onClick={() => setIsSwitchRobotOpen(false)}
                className="w-8 h-8 rounded-full bg-[#071912] text-[#8BA996] hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1">
              {OBJECT_PRESETS.map((preset) => {
                const c = preset.defaultCreature;
                const isSelected = activeCreature.name === c.name;
                return (
                  <div
                    key={preset.id}
                    onClick={() => {
                      setActiveCreature(c);
                      setIsSwitchRobotOpen(false);
                    }}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-emerald-950/60 border-emerald-500 text-white shadow-sm'
                        : 'bg-[#071912] border-[#184635] text-[#8BA996] hover:border-emerald-500/50 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#0E2A1F] flex items-center justify-center text-xl shrink-0">
                        {preset.icon}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-white">{c.name}</div>
                        <div className="text-[11px] text-[#8BA996]">From: {c.originalObject}</div>
                      </div>
                    </div>
                    {isSelected ? (
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-950 px-2 py-1 rounded-lg border border-emerald-500/40">
                        ACTIVE
                      </span>
                    ) : (
                      <button className="text-xs font-bold text-emerald-300 px-2 py-1 rounded-lg bg-[#0E2A1F] hover:bg-emerald-700 hover:text-white transition-colors">
                        Select
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Creature Morph Modal */}
      {isMorphModalOpen && (
        <CreatureMorphModal
          onCreatureReady={(newCreature) => {
            setActiveCreature(newCreature);
            setIsMorphModalOpen(false);
            confetti({ particleCount: 60, spread: 80, origin: { y: 0.5 } });
          }}
          onClose={() => setIsMorphModalOpen(false)}
        />
      )}

      {/* Cybertronian Pass Modal (Premium Monetization Model) */}
      <CybertronPassModal
        isOpen={isCybertronPassOpen}
        onClose={() => setIsCybertronPassOpen(false)}
        user={currentUser}
        onUpdateUser={handleUserChange}
        activeCreature={activeCreature}
        onSelectCreature={setActiveCreature}
      />

    </div>
  );
};
