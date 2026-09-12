import React, { useState, useEffect } from 'react';
import { Navbar } from './components/platform/Navbar';
import { GameCatalog } from './components/platform/GameCatalog';
import { ArmoryShop } from './components/platform/ArmoryShop';
import { ForgeScreen } from './components/platform/ForgeScreen';
import { Tournaments } from './components/platform/Tournaments';
import { ClanWars } from './components/platform/ClanWars';
import { DeveloperPortal } from './components/platform/DeveloperPortal';
import { ProfileModal } from './components/platform/ProfileModal';
import { DailyQuestsModal } from './components/platform/DailyQuestsModal';
import { CybertronPassModal } from './components/platform/CybertronPassModal';
import { PlatformGamePlayer } from './components/platform/PlatformGamePlayer';
import { ExplorationScreen } from './components/exploration/ExplorationScreen';
import { CreatureMorphModal } from './components/morph/CreatureMorphModal';
import { MobileBottomNav } from './components/platform/MobileBottomNav';
import { PlatformUser, GameRoom, DailyQuest } from './types/platform';
import { GameMode, MatchStats } from './types';
import { BattleCreature } from './types/creature';
import { ExplorationDiscoveryContext } from './types/exploration';
import { OBJECT_PRESETS } from './data/creaturePresets';
import { INITIAL_USER, DEFAULT_DAILY_QUESTS } from './data/platformData';
import { sound } from './utils/audio';
import confetti from 'canvas-confetti';

const USER_STORAGE_KEY = 'paperio_platform_user_v2';
const QUESTS_STORAGE_KEY = 'paperio_platform_quests_v2';

export default function App() {
  const [activeTab, setActiveTab] = useState<'games' | 'armory' | 'forge' | 'tournaments' | 'clans' | 'developer' | 'expedition'>('games');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isQuestsOpen, setIsQuestsOpen] = useState(false);
  const [isCybertronPassOpen, setIsCybertronPassOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Active Creature selected in Lobby
  const [selectedCreature, setSelectedCreature] = useState<BattleCreature>(
    OBJECT_PRESETS[0].defaultCreature
  );

  // Real-World Expedition Scan Handoff State
  const [activeExplorationContext, setActiveExplorationContext] = useState<ExplorationDiscoveryContext | null>(null);
  const [isExplorationMorphOpen, setIsExplorationMorphOpen] = useState(false);

  // Active Playable Game State
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [activeGameTitle, setActiveGameTitle] = useState<string>('Paper.io 2 Arena');
  const [activeMode, setActiveMode] = useState<GameMode>('classic');
  const [activeRoom, setActiveRoom] = useState<GameRoom | null>(null);

  // Platform User State
  const [user, setUser] = useState<PlatformUser>(() => {
    try {
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    return INITIAL_USER;
  });

  // Daily Quests State
  const [quests, setQuests] = useState<DailyQuest[]>(() => {
    try {
      const stored = localStorage.getItem(QUESTS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    return DEFAULT_DAILY_QUESTS;
  });

  // Persist User changes
  const handleUpdateUser = (updatedUser: PlatformUser) => {
    setUser(updatedUser);
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
    } catch {
      // ignore
    }
  };

  // Persist Quests changes
  const handleUpdateQuests = (updatedQuests: DailyQuest[]) => {
    setQuests(updatedQuests);
    try {
      localStorage.setItem(QUESTS_STORAGE_KEY, JSON.stringify(updatedQuests));
    } catch {
      // ignore
    }
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sound.setMuted(!next);
  };

  // Launching games
  const handleLaunchGame = (gameId: string, mode: GameMode = 'classic') => {
    setActiveGameId(gameId);
    setActiveGameTitle('Matter-Born: Object Creature Arena');
    setActiveMode(mode);
    setActiveRoom(null);
  };

  const handleJoinRoom = (room: GameRoom) => {
    setActiveGameId('animatrix-3d-arena');
    setActiveGameTitle('Matter-Born: Object Creature Arena');
    setActiveMode(room.mode);
    setActiveRoom(room);
  };

  const handleLaunchCustomRoom = (customRoom: GameRoom) => {
    setActiveGameId('animatrix-3d-arena');
    setActiveGameTitle('Matter-Born: Object Creature Arena');
    setActiveMode(customRoom.mode);
    setActiveRoom(customRoom);
  };

  const handleExitToPlatform = () => {
    setActiveGameId(null);
    setActiveRoom(null);
  };

  // When a match concludes inside the 3D player
  const handleMatchComplete = (earnedCoins: number, earnedXp: number, kills: number) => {
    // 1. Calculate XP and Level ups
    let newXp = user.currentXp + earnedXp;
    let newLevel = user.level;
    let newMaxXp = user.maxXp;

    if (newXp >= newMaxXp) {
      newXp = newXp - newMaxXp;
      newLevel += 1;
      newMaxXp = Math.round(newMaxXp * 1.25);
    }

    // 2. Update rank points (RP)
    const rpGained = Math.round(kills * 25 + 50);
    const newRankPoints = user.rankPoints + rpGained;
    let newRankTier = user.rankTier;
    if (newRankPoints > 3000) newRankTier = 'Grandmaster';
    else if (newRankPoints > 2400) newRankTier = 'Diamond';
    else if (newRankPoints > 1800) newRankTier = 'Platinum';
    else if (newRankPoints > 1200) newRankTier = 'Gold';
    else if (newRankPoints > 600) newRankTier = 'Silver';

    // 3. Construct match history record
    const historyItem = {
      id: `match-${Date.now()}`,
      gameTitle: 'Matter-Born Arena',
      mode: 'classic' as GameMode,
      territory: 100,
      kills,
      rank: kills >= 4 ? 1 : 2,
      coinsEarned: earnedCoins,
      xpEarned: earnedXp,
      timestamp: Date.now(),
    };

    const updatedUser: PlatformUser = {
      ...user,
      coins: user.coins + earnedCoins,
      level: newLevel,
      currentXp: newXp,
      maxXp: newMaxXp,
      rankPoints: newRankPoints,
      rankTier: newRankTier,
      totalMatches: user.totalMatches + 1,
      victories: kills >= 4 ? user.victories + 1 : user.victories,
      totalKills: user.totalKills + kills,
      matchHistory: [historyItem, ...user.matchHistory.slice(0, 19)],
    };

    handleUpdateUser(updatedUser);

    // 4. Update Daily Quests progress
    const updatedQuests = quests.map((q) => {
      let currentProgress = q.progress;
      if (q.id === 'quest-2') {
        currentProgress = Math.min(q.target, currentProgress + kills);
      } else {
        currentProgress = Math.min(q.target, currentProgress + 1);
      }
      return {
        ...q,
        progress: currentProgress,
        completed: currentProgress >= q.target,
      };
    });

    handleUpdateQuests(updatedQuests);
  };

  const handleOpenExplorationScan = (context: ExplorationDiscoveryContext) => {
    setActiveExplorationContext(context);
    setIsExplorationMorphOpen(true);
  };

  const handleExplorationCreatureReady = (creature: BattleCreature) => {
    sound.playVictory();
    confetti({
      particleCount: 55,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10B981', '#F59E0B', '#3B82F6'],
    });

    // Reward user with expedition discovery bonus coins & XP
    if (activeExplorationContext) {
      const bonusCoins = activeExplorationContext.explorationCoins || 250;
      const bonusXp = activeExplorationContext.explorationXp || 150;
      setUser((prev) => ({
        ...prev,
        coins: prev.coins + bonusCoins,
        currentXp: prev.currentXp + bonusXp,
      }));
    }

    setSelectedCreature(creature);
    setIsExplorationMorphOpen(false);
    setActiveExplorationContext(null);
    setActiveTab('games'); // Return to lobby with new active expedition fighter
  };

  const pendingQuestsCount = quests.filter((q) => q.completed && !q.claimed).length;

  // If player is actively in a match, render the in-platform game view
  if (activeGameId) {
    return (
      <PlatformGamePlayer
        user={user}
        gameId={activeGameId}
        gameTitle={activeGameTitle}
        room={activeRoom}
        initialCreature={selectedCreature}
        onExitToPlatform={handleExitToPlatform}
        onMatchComplete={handleMatchComplete}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0D281E] bg-[radial-gradient(ellipse_100%_75%_at_50%_0%,#133F2C_0%,#0D281E_70%,#092016_100%)] text-white flex flex-col selection:bg-emerald-500/30 selection:text-emerald-200 font-sans relative overflow-x-hidden">
      
      {/* Platform Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        user={user}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenQuests={() => setIsQuestsOpen(true)}
        onQuickPlay={() => handleLaunchGame('animatrix-3d-arena', 'classic')}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        pendingQuestsCount={pendingQuestsCount}
        onOpenPass={() => setIsCybertronPassOpen(true)}
      />

      {/* Main Content View by Active Tab */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-6 pt-4 sm:pt-6 pb-28 md:pb-12">
        {activeTab === 'games' && (
          <GameCatalog
            onLaunchGame={handleLaunchGame}
            onLaunchFriendRoom={handleLaunchCustomRoom}
            onOpenExpedition={() => setActiveTab('expedition')}
            onOpenForge={() => setActiveTab('forge')}
            activeCreature={selectedCreature}
            onSelectCreature={setSelectedCreature}
            user={user}
            onUpdateUser={handleUpdateUser}
            onOpenPass={() => setIsCybertronPassOpen(true)}
          />
        )}

        {activeTab === 'expedition' && (
          <ExplorationScreen
            onOpenScanPipeline={handleOpenExplorationScan}
            onBackToLobby={() => setActiveTab('games')}
            onNavigateToForge={() => setActiveTab('forge')}
          />
        )}

        {(activeTab === 'forge' || activeTab === 'armory') && (
          <ForgeScreen
            creature={selectedCreature}
            onNavigateTab={(tab) => {
              if (tab === 'arena') {
                handleLaunchGame('animatrix-3d-arena', 'classic');
              } else if (tab === 'expedition') {
                setActiveTab('expedition');
              } else {
                setActiveTab('games');
              }
            }}
          />
        )}

        {activeTab === 'tournaments' && (
          <Tournaments
            user={user}
            onUpdateUser={handleUpdateUser}
            onEnterMatch={(mode) => handleLaunchGame('animatrix-3d-arena', mode)}
          />
        )}

        {activeTab === 'clans' && (
          <ClanWars
            user={user}
            onUpdateUser={handleUpdateUser}
          />
        )}

        {activeTab === 'developer' && (
          <DeveloperPortal />
        )}
      </main>

      {/* Mobile-Native Bottom Navigation Dock */}
      <MobileBottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenPass={() => setIsCybertronPassOpen(true)}
      />

      {/* Desktop Clean Footer (hidden on mobile) */}
      <footer className="hidden md:block border-t border-[#1B523B] bg-[#0A241A] px-4 sm:px-6 py-4 text-[#8BA996] text-xs">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-heading font-black text-emerald-400 text-xs">Matter-Born</span>
            <span className="text-[#32634D]">•</span>
            <span className="text-[#8BA996]">Transform Real-World Objects into 3D Mech Brawlers</span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <button onClick={() => setActiveTab('games')} className="hover:text-emerald-300 transition-colors font-medium">
              Arena
            </button>
            <button onClick={() => setActiveTab('expedition')} className="hover:text-emerald-300 transition-colors font-medium">
              Explore
            </button>
            <button onClick={() => setActiveTab('forge')} className="hover:text-amber-300 transition-colors font-bold text-amber-400">
              Forge
            </button>
            <button onClick={() => setActiveTab('servers')} className="hover:text-emerald-300 transition-colors font-medium">
              Servers
            </button>
          </div>
        </div>
      </footer>

      {/* Profile Modal */}
      {isProfileOpen && (
        <ProfileModal
          user={user}
          onUpdateUser={handleUpdateUser}
          onClose={() => setIsProfileOpen(false)}
        />
      )}

      {/* Daily Quests Modal */}
      {isQuestsOpen && (
        <DailyQuestsModal
          quests={quests}
          user={user}
          onUpdateQuests={handleUpdateQuests}
          onUpdateUser={handleUpdateUser}
          onClose={() => setIsQuestsOpen(false)}
        />
      )}

      {/* Cybertronian Pass Modal (Premium Pass Business Model) */}
      <CybertronPassModal
        isOpen={isCybertronPassOpen}
        onClose={() => setIsCybertronPassOpen(false)}
        user={user}
        onUpdateUser={handleUpdateUser}
        activeCreature={selectedCreature}
        onSelectCreature={setSelectedCreature}
      />

      {/* Real-World Exploration Object Scan Modal */}
      {isExplorationMorphOpen && (
        <CreatureMorphModal
          explorationContext={activeExplorationContext}
          onCreatureReady={handleExplorationCreatureReady}
          onClose={() => {
            setIsExplorationMorphOpen(false);
            setActiveExplorationContext(null);
          }}
        />
      )}
    </div>
  );
}
