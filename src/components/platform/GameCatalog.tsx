import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Camera, 
  Swords, 
  Zap, 
  Heart, 
  Shield, 
  Sparkles,
  Crown,
  ChevronRight,
  Compass,
  Anvil,
  Users,
  Trash2,
  Plus
} from 'lucide-react';
import { BattleCreature } from '../../types/creature';
import { GameMode } from '../../types';
import { OBJECT_PRESETS } from '../../data/creaturePresets';
import { PlatformUser, GameRoom } from '../../types/platform';
import { INITIAL_USER } from '../../data/platformData';
import { LobbyPetStage } from './LobbyPetStage';
import { CreatureMorphModal } from '../morph/CreatureMorphModal';
import { CybertronPassModal } from './CybertronPassModal';
import { PlayWithFriendsModal } from './PlayWithFriendsModal';
import { getForgeCombatBonuses } from '../../utils/forgeManager';
import { ForgeCombatBonuses } from '../../types/forge';
import { 
  getPlayerRobots, 
  savePlayerRobot, 
  setActivePlayerRobot, 
  deletePlayerRobot, 
  getActivePlayerRobot 
} from '../../utils/robotStorage';
import confetti from 'canvas-confetti';

interface GameCatalogProps {
  onLaunchGame: (gameId: string, mode?: GameMode) => void;
  onLaunchFriendRoom?: (room: GameRoom) => void;
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
  onLaunchFriendRoom,
  onOpenExpedition,
  onOpenForge,
  activeCreature: externalActiveCreature,
  onSelectCreature,
  user: externalUser,
  onUpdateUser,
  onOpenPass,
}) => {
  const [internalCreature, setInternalCreature] = useState<BattleCreature>(() => getActivePlayerRobot());
  const [playerRobots, setPlayerRobots] = useState<BattleCreature[]>(() => getPlayerRobots());
  const [localUser, setLocalUser] = useState<PlatformUser>(INITIAL_USER);

  // Sync playerRobots when activeCreature changes
  useEffect(() => {
    setPlayerRobots(getPlayerRobots());
  }, [externalActiveCreature]);

  const currentUser = externalUser || localUser;
  const handleUserChange = (u: PlatformUser) => {
    setLocalUser(u);
    if (onUpdateUser) onUpdateUser(u);
  };

  const activeCreature = externalActiveCreature || internalCreature;
  const setActiveCreature = (c: BattleCreature) => {
    setInternalCreature(c);
    setActivePlayerRobot(c);
    if (onSelectCreature) onSelectCreature(c);
  };

  const [isMorphModalOpen, setIsMorphModalOpen] = useState(false);
  const [isCybertronPassOpen, setIsCybertronPassOpen] = useState(false);
  const [isSwitchRobotOpen, setIsSwitchRobotOpen] = useState(false);
  const [isPlayWithFriendsOpen, setIsPlayWithFriendsOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState<'easy' | 'moderate' | 'hard'>('easy');

  const [forgeBonuses, setForgeBonuses] = useState<ForgeCombatBonuses>(getForgeCombatBonuses);

  // Synchronize immediately whenever Forge upgrades are purchased or updated
  useEffect(() => {
    const handleForgeUpdate = () => {
      setForgeBonuses(getForgeCombatBonuses());
    };
    window.addEventListener('animatrix_forge_updated', handleForgeUpdate);
    window.addEventListener('storage', handleForgeUpdate);
    window.addEventListener('focus', handleForgeUpdate);
    return () => {
      window.removeEventListener('animatrix_forge_updated', handleForgeUpdate);
      window.removeEventListener('storage', handleForgeUpdate);
      window.removeEventListener('focus', handleForgeUpdate);
    };
  }, []);

  const baseHp = activeCreature.stats?.hp || 1000;
  const baseAtk = activeCreature.stats?.attack || 140;
  const baseSpecial = activeCreature.specialAbility?.damage || 220;
  const baseFireRate = 8.0;

  // Exact additive increases requested:
  // Health: +100 HP per star
  // Damage: +20 Damage per star
  // Fire Rate: +1.0/s per star
  // Special: +10 per star
  const hp = baseHp + (forgeBonuses.healthAdd || 0);
  const atk = baseAtk + (forgeBonuses.damageAdd || 0);
  const fireRate = (baseFireRate + (forgeBonuses.fireRateAdd || 0)).toFixed(1);
  const specialDmg = baseSpecial + (forgeBonuses.specialAdd || 0);

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
                    Transformers Cybertron: Gold Pass
                  </span>
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-400 text-amber-950 shrink-0 shadow-xs">
                    SEASON 1 • ₹500
                  </span>
                </div>
                <p className="text-[11px] text-emerald-300/90 truncate mt-0.5">
                  Optimus Prime, Megatron, Bumblebee & 9 Legendary Cybertron Mechs
                </p>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleOpenCybertronPass();
              }}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-amber-950 font-black text-xs shrink-0 flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-transform active:scale-95 cursor-pointer"
            >
              <Crown className="w-3.5 h-3.5 fill-amber-950" />
              <span>Gold Pass ₹500</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Column: Battle Control & Simple High-Impact Stats */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4 rounded-3xl bg-[#F4F8F5] border border-[#CBDED2] p-5 sm:p-6 shadow-xl">
          
          {/* Header: Current Fighter with Switch Button */}
          <div className="flex items-center justify-between border-b border-[#CADCD0] pb-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#3E6953]">
                CURRENT FIGHTER
              </div>
              <h1 className="text-2xl sm:text-3xl font-black font-heading text-[#0E3323] tracking-wide truncate max-w-[220px]">
                {activeCreature.name}
              </h1>
            </div>
            <button
              onClick={() => setIsSwitchRobotOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-[#E2EFE5] hover:bg-[#D5E5DA] border border-[#CADCD0] text-xs font-bold text-[#0E3323] transition-colors cursor-pointer shadow-xs active:scale-95"
            >
              Switch
            </button>
          </div>

          {/* 4 Large, Readable Primary Stats */}
          <div className="grid grid-cols-2 gap-3">
            {/* Health */}
            <div className="p-3.5 rounded-2xl bg-[#E6F0E9] border border-[#CBDED2] flex flex-col justify-between shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-[#3E6953]">
                <span className="flex items-center gap-1.5">
                  <span className="text-base">❤️</span>
                  <span>Health</span>
                </span>
                {forgeBonuses.healthAdd > 0 && (
                  <span className="text-[10px] font-mono font-black text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">
                    +{forgeBonuses.healthAdd}
                  </span>
                )}
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-mono font-black text-[#0E3323]">
                {hp.toLocaleString()}
              </div>
            </div>

            {/* Damage */}
            <div className="p-3.5 rounded-2xl bg-[#E6F0E9] border border-[#CBDED2] flex flex-col justify-between shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-[#3E6953]">
                <span className="flex items-center gap-1.5">
                  <span className="text-base">⚔️</span>
                  <span>Damage</span>
                </span>
                {forgeBonuses.damageAdd > 0 && (
                  <span className="text-[10px] font-mono font-black text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                    +{forgeBonuses.damageAdd}
                  </span>
                )}
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-mono font-black text-[#0E3323]">
                {atk}
              </div>
            </div>

            {/* Fire Rate */}
            <div className="p-3.5 rounded-2xl bg-[#E6F0E9] border border-[#CBDED2] flex flex-col justify-between shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-[#3E6953]">
                <span className="flex items-center gap-1.5">
                  <span className="text-base">🔥</span>
                  <span>Fire Rate</span>
                </span>
                {forgeBonuses.fireRateAdd > 0 && (
                  <span className="text-[10px] font-mono font-black text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">
                    +{forgeBonuses.fireRateAdd.toFixed(1)}/s
                  </span>
                )}
              </div>
              <div className="mt-2 text-xl sm:text-2xl font-mono font-black text-[#0E3323]">
                {fireRate} <span className="text-xs font-sans text-[#3E6953]">/ sec</span>
              </div>
            </div>

            {/* Special */}
            <div className="p-3.5 rounded-2xl bg-[#E6F0E9] border border-[#CBDED2] flex flex-col justify-between shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-[#3E6953]">
                <span className="flex items-center gap-1.5">
                  <span className="text-base">✨</span>
                  <span>Special</span>
                </span>
                {forgeBonuses.specialAdd > 0 && (
                  <span className="text-[10px] font-mono font-black text-teal-800 bg-teal-100 px-1.5 py-0.5 rounded border border-teal-300">
                    +{forgeBonuses.specialAdd}
                  </span>
                )}
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-mono font-black text-[#0E3323]">
                {specialDmg}
              </div>
            </div>
          </div>

          {/* Mode Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#3E6953]">
              <span>BATTLE MODE</span>
              <span className="text-emerald-700 font-bold">
                {selectedMode === 'easy' ? 'EASY • BOTS GO EASY' : selectedMode === 'moderate' ? 'MODERATE • 1-2 BOTS TARGET' : 'HARD • ALL BOTS HUNT YOU'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#DCE8DE] border border-[#CADCD0] text-xs font-bold">
              <button
                onClick={() => setSelectedMode('easy')}
                className={`py-2 rounded-lg transition-all cursor-pointer ${
                  selectedMode === 'easy'
                    ? 'bg-emerald-600 text-white shadow-md font-black'
                    : 'text-[#2B5742] hover:text-[#0E3323]'
                }`}
              >
                Easy
              </button>
              <button
                onClick={() => setSelectedMode('moderate')}
                className={`py-2 rounded-lg transition-all cursor-pointer ${
                  selectedMode === 'moderate'
                    ? 'bg-emerald-600 text-white shadow-md font-black'
                    : 'text-[#2B5742] hover:text-[#0E3323]'
                }`}
              >
                Moderate
              </button>
              <button
                onClick={() => setSelectedMode('hard')}
                className={`py-2 rounded-lg transition-all cursor-pointer ${
                  selectedMode === 'hard'
                    ? 'bg-emerald-600 text-white shadow-md font-black'
                    : 'text-[#2B5742] hover:text-[#0E3323]'
                }`}
              >
                Hard
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              onClick={() => onLaunchGame('animatrix-3d-arena', selectedMode)}
              className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] text-white font-black text-lg tracking-wider flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <Play className="w-6 h-6 fill-current" />
              <span>BATTLE NOW</span>
            </button>

            {/* Play with Friends (Multiplayer Rooms) */}
            <button
              onClick={() => setIsPlayWithFriendsOpen(true)}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#092218] hover:bg-[#0E2E20] active:scale-[0.98] border-2 border-emerald-500/70 hover:border-emerald-400 text-emerald-300 font-black text-sm tracking-wider flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-950/30 transition-all cursor-pointer"
            >
              <Users className="w-5 h-5 text-emerald-400" />
              <span>PLAY WITH FRIENDS (MULTIPLAYER)</span>
              <span className="text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full ml-1">
                Lobbies
              </span>
            </button>

            {/* Create Your Fighter (Scan Object) */}
            <button
              onClick={() => setIsMorphModalOpen(true)}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#E2EFE5] hover:bg-[#D5E5DA] active:scale-[0.98] border-2 border-emerald-600/50 hover:border-emerald-600 text-emerald-950 font-black text-sm tracking-wider flex items-center justify-center gap-2.5 shadow-md shadow-emerald-950/10 transition-all cursor-pointer"
            >
              <Camera className="w-5 h-5 text-emerald-700" />
              <span>CREATE YOUR FIGHTER</span>
            </button>
          </div>

        </div>

      </div>

      {/* Switch Fighter Quick Modal */}
      {isSwitchRobotOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#F4F8F5] border border-[#CBDED2] rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#CADCD0] pb-3">
              <div>
                <h3 className="font-heading font-black text-lg text-[#0E3323]">Choose Your Robot</h3>
                <p className="text-xs text-[#3E6953]">
                  {playerRobots.length} Robot{playerRobots.length > 1 ? 's' : ''} in your collection
                </p>
              </div>
              <button 
                onClick={() => setIsSwitchRobotOpen(false)}
                className="w-8 h-8 rounded-full bg-[#E2EFE5] text-[#3E6953] hover:text-[#0E3323] flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Scan New Robot Button */}
            <button
              onClick={() => {
                setIsSwitchRobotOpen(false);
                setIsMorphModalOpen(true);
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-950/20 cursor-pointer active:scale-95 transition-all"
            >
              <Camera className="w-4 h-4 text-white" />
              <span>SCAN ANY OBJECT & MAKE ROBOT</span>
            </button>

            {/* Player's Robots List */}
            <div className="max-h-[55vh] overflow-y-auto space-y-2 pr-1">
              <div className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider px-1">
                Your Hangar Robots
              </div>
              {playerRobots.map((c) => {
                const isSelected = activeCreature.name === c.name || activeCreature.id === c.id;
                const isStarter = c.id === 'robot-template-1';
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setActiveCreature(c);
                      setIsSwitchRobotOpen(false);
                    }}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-emerald-100 border-emerald-500 text-[#0E3323] shadow-xs'
                        : 'bg-[#E6F0E9] border-[#CBDED2] text-[#3E6953] hover:border-emerald-500/50 hover:text-[#0E3323]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#DCE8DE] flex items-center justify-center text-xl shrink-0 border border-[#CADCD0]">
                        🤖
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-[#0E3323] truncate flex items-center gap-1.5">
                          <span>{c.name}</span>
                          {isStarter && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-100 text-cyan-800 border border-cyan-300">
                              Starter
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#3E6953] truncate">
                          From: {c.originalObject || 'Object Scan'}
                        </div>
                        <div className="text-[10px] text-emerald-800 font-mono font-bold mt-0.5">
                          ❤️ {c.stats?.hp || 1000} HP • ⚔️ {c.stats?.attack || 140} DMG
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isSelected ? (
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300">
                          ACTIVE
                        </span>
                      ) : (
                        <button className="text-xs font-bold text-emerald-800 px-2.5 py-1 rounded-lg bg-[#DCE8DE] hover:bg-emerald-600 hover:text-white transition-colors">
                          Select
                        </button>
                      )}

                      {!isStarter && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const updated = deletePlayerRobot(c.id);
                            setPlayerRobots(updated);
                            if (activeCreature.id === c.id) {
                              setActiveCreature(updated[0]);
                            }
                          }}
                          className="p-1.5 rounded-lg text-stone-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Delete custom robot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
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
            const updated = savePlayerRobot(newCreature);
            setPlayerRobots(updated);
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

      {/* Play With Friends Modal */}
      <PlayWithFriendsModal
        isOpen={isPlayWithFriendsOpen}
        onClose={() => setIsPlayWithFriendsOpen(false)}
        onLaunchFriendRoom={(room) => {
          if (onLaunchFriendRoom) {
            onLaunchFriendRoom(room);
          } else {
            onLaunchGame('animatrix-3d-arena', room.mode);
          }
        }}
        defaultMode={selectedMode}
      />

    </div>
  );
};
