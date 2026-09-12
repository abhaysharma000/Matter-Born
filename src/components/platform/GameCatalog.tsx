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
  const [selectedMode, setSelectedMode] = useState<'classic' | 'rush' | 'royale'>('classic');

  const hp = activeCreature.stats?.hp || 450;
  const atk = activeCreature.stats?.attack || 85;
  const def = activeCreature.stats?.defense || 60;
  const spd = activeCreature.stats?.speed || 14;

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

          {/* Transformers Cybertronian Pass Banner (Premium Monetization Model) */}
          <div 
            onClick={handleOpenCybertronPass}
            className="rounded-2xl bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-white p-3.5 sm:p-4 shadow-sm border border-emerald-500/40 flex items-center justify-between gap-3 cursor-pointer hover:border-amber-400/60 transition-all group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
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
                <p className="text-[11px] text-emerald-200/90 truncate mt-0.5">
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

        {/* Right Column: Battle Control & Stats */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4 rounded-2xl bg-[#F4F9F4] border border-[#CFE2D3] p-5 sm:p-6 shadow-sm">
          
          {/* Mode Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#4D6957]">Game Mode</label>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#DFEFE2] border border-[#BCD8C3] text-xs font-bold">
              <button
                onClick={() => setSelectedMode('classic')}
                className={`py-2 rounded-lg transition-colors ${
                  selectedMode === 'classic'
                    ? 'bg-emerald-700 text-white shadow-xs font-bold'
                    : 'text-[#4D6957] hover:text-[#143823]'
                }`}
              >
                Arena
              </button>
              <button
                onClick={() => setSelectedMode('rush')}
                className={`py-2 rounded-lg transition-colors ${
                  selectedMode === 'rush'
                    ? 'bg-emerald-700 text-white shadow-xs font-bold'
                    : 'text-[#4D6957] hover:text-[#143823]'
                }`}
              >
                Blitz 60s
              </button>
              <button
                onClick={() => setSelectedMode('royale')}
                className={`py-2 rounded-lg transition-colors ${
                  selectedMode === 'royale'
                    ? 'bg-emerald-700 text-white shadow-xs font-bold'
                    : 'text-[#4D6957] hover:text-[#143823]'
                }`}
              >
                Royale
              </button>
            </div>
          </div>

          {/* Clean Combat Stats */}
          <div className="space-y-2.5 pt-1">
            <div className="text-xs font-semibold text-[#4D6957]">Combat Specs</div>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-[#E8F2EA] border border-[#CFE2D3] space-y-1">
                <div className="flex items-center justify-between text-[#4D6957]">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3 text-emerald-600" />
                    <span>Health</span>
                  </span>
                  <span className="font-bold text-[#143823]">{hp}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[#CFE2D3] overflow-hidden">
                  <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${Math.min(100, (hp / 600) * 100)}%` }} />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#E8F2EA] border border-[#CFE2D3] space-y-1">
                <div className="flex items-center justify-between text-[#4D6957]">
                  <span className="flex items-center gap-1">
                    <Swords className="w-3 h-3 text-amber-600" />
                    <span>Attack</span>
                  </span>
                  <span className="font-bold text-[#143823]">{atk}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[#CFE2D3] overflow-hidden">
                  <div className="h-full bg-amber-600 rounded-full" style={{ width: `${Math.min(100, (atk / 120) * 100)}%` }} />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#E8F2EA] border border-[#CFE2D3] space-y-1">
                <div className="flex items-center justify-between text-[#4D6957]">
                  <span className="flex items-center gap-1">
                    <Shield className="w-3 h-3 text-teal-600" />
                    <span>Armor</span>
                  </span>
                  <span className="font-bold text-[#143823]">{def}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[#CFE2D3] overflow-hidden">
                  <div className="h-full bg-teal-600 rounded-full" style={{ width: `${Math.min(100, (def / 100) * 100)}%` }} />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#E8F2EA] border border-[#CFE2D3] space-y-1">
                <div className="flex items-center justify-between text-[#4D6957]">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3 text-green-600" />
                    <span>Speed</span>
                  </span>
                  <span className="font-bold text-[#143823]">{spd}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[#CFE2D3] overflow-hidden">
                  <div className="h-full bg-green-600 rounded-full" style={{ width: `${Math.min(100, (spd / 20) * 100)}%` }} />
                </div>
              </div>
            </div>

            {/* Special Ability */}
            {activeCreature.specialAbility && (
              <div className="px-3 py-2 rounded-xl bg-[#E8F2EA] border border-[#CFE2D3] flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-bold text-[#143823]">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{activeCreature.specialAbility.name}</span>
                </span>
                <span className="font-bold text-emerald-800">
                  {activeCreature.specialAbility.damage} DMG
                </span>
              </div>
            )}

            {/* Real-World Expedition Heritage Perk */}
            {activeCreature.explorationBonusTitle && (
              <div className="px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-950 via-teal-950 to-emerald-900 border border-emerald-500/40 text-white flex items-center justify-between text-xs shadow-xs">
                <span className="flex items-center gap-1.5 font-bold text-amber-300">
                  <Compass className="w-3.5 h-3.5 text-amber-400" />
                  <span>{activeCreature.explorationBonusTitle}</span>
                </span>
                <span className="font-bold text-emerald-300 text-[10px] uppercase">
                  {activeCreature.explorationDistanceMeters}m • {activeCreature.explorationTier || 'SCOUT'}
                </span>
              </div>
            )}

            {/* Forge Bonuses Indicator */}
            {(() => {
              const fb = getForgeCombatBonuses();
              const hasBonuses = fb.damageBonusPercent > 0 || fb.healthBonusPercent > 0 || fb.fireRateBonusPercent > 0 || fb.specialBonusPercent > 0;
              if (!hasBonuses) return null;
              return (
                <div 
                  onClick={onOpenForge}
                  className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 border border-amber-500/50 text-amber-200 flex items-center justify-between text-xs shadow-xs cursor-pointer hover:border-amber-400 transition-colors"
                  title="Click to view upgrades in The Forge"
                >
                  <span className="flex items-center gap-1.5 font-bold text-amber-300">
                    <Anvil className="w-3.5 h-3.5 text-amber-400" />
                    <span>Forge Multipliers</span>
                  </span>
                  <span className="font-mono font-bold text-amber-300 text-[11px]">
                    +{fb.damageBonusPercent}% ATK • +{fb.healthBonusPercent}% HP
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <button
              onClick={() => onLaunchGame('animatrix-3d-arena', selectedMode)}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-black text-base flex items-center justify-center gap-2 shadow-md shadow-emerald-700/20 transition-all cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>BATTLE NOW</span>
            </button>

            {onOpenForge && (
              <button
                onClick={onOpenForge}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-800 to-amber-900 hover:from-amber-700 hover:to-amber-800 active:scale-[0.99] border border-amber-600/70 text-amber-100 font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Anvil className="w-4 h-4 text-amber-400" />
                <span>The Forge • Power Up Robot</span>
              </button>
            )}

            {onOpenExpedition && (
              <button
                onClick={onOpenExpedition}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-900 to-teal-900 hover:from-emerald-800 hover:to-teal-800 active:scale-[0.99] border border-emerald-600/60 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Compass className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '12s' }} />
                <span>Explore Map • Earn Points by Walking</span>
              </button>
            )}

            <button
              onClick={() => setIsMorphModalOpen(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-[#E8F2EA] hover:bg-[#DFEDE2] active:scale-[0.99] border border-[#BCD8C3] text-[#143823] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4 text-emerald-700" />
              <span>Scan Real Object to Build Robot</span>
            </button>

            <button
              onClick={onOpenServers}
              className="w-full text-center py-1.5 text-xs text-[#4D6957] hover:text-emerald-900 transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Play with Friends • Online Servers</span>
            </button>
          </div>

        </div>

      </div>

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
