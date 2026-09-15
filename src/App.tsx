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
import { LanServerModal } from './components/platform/LanServerModal';
import { IncomingNotificationOverlay } from './components/platform/IncomingNotificationOverlay';
import { AuthModal } from './components/platform/AuthModal';
import { PlatformUser, GameRoom, DailyQuest } from './types/platform';
import { GameMode, MatchStats } from './types';
import { BattleCreature } from './types/creature';
import { ExplorationDiscoveryContext } from './types/exploration';
import { OBJECT_PRESETS } from './data/creaturePresets';
import { INITIAL_USER, DEFAULT_DAILY_QUESTS } from './data/platformData';
import { sound } from './utils/audio';
import { resetExplorationPoints } from './utils/forgeManager';
import { getActivePlayerRobot, savePlayerRobot, setActivePlayerRobot } from './utils/robotStorage';
import confetti from 'canvas-confetti';

const USER_STORAGE_KEY = 'paperio_platform_user_v2';
const QUESTS_STORAGE_KEY = 'paperio_platform_quests_v2';
const AUTH_PROMPTED_KEY = 'mb_auth_prompted_v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<'games' | 'armory' | 'forge' | 'tournaments' | 'clans' | 'developer' | 'expedition'>('games');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(() => !localStorage.getItem(AUTH_PROMPTED_KEY));

  // One-time enforce zero EP for fresh walking progression
  useEffect(() => {
    const RESET_FLAG = 'mb_enforce_zero_ep_fresh_v1';
    if (!localStorage.getItem(RESET_FLAG)) {
      localStorage.setItem(RESET_FLAG, 'true');
      resetExplorationPoints();
    }
  }, []);
  const [isQuestsOpen, setIsQuestsOpen] = useState(false);
  const [isCybertronPassOpen, setIsCybertronPassOpen] = useState(false);
  const [isLanServerOpen, setIsLanServerOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Active Creature selected in Lobby: defaults to Template 1
  const [selectedCreature, setSelectedCreature] = useState<BattleCreature>(() => getActivePlayerRobot());

  // Real-World Expedition Scan Handoff State
  const [activeExplorationContext, setActiveExplorationContext] = useState<ExplorationDiscoveryContext | null>(null);
  const [isExplorationMorphOpen, setIsExplorationMorphOpen] = useState(false);

  // Active Playable Game State
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [activeGameTitle, setActiveGameTitle] = useState<string>('Paper.io 2 Arena');
  const [activeMode, setActiveMode] = useState<GameMode>('easy');
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

  // Sync friends updates
  useEffect(() => {
    const handleFriendsUpdated = (e: any) => {
      if (Array.isArray(e.detail)) {
        setUser((prev) => ({ ...prev, friends: e.detail }));
      }
    };
    window.addEventListener('mb_friends_updated', handleFriendsUpdated);
    return () => window.removeEventListener('mb_friends_updated', handleFriendsUpdated);
  }, []);

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
  const handleLaunchGame = (gameId: string, mode: GameMode = 'easy') => {
    setActiveGameId(gameId);
    setActiveGameTitle('Matter-Born: Object Creature Arena');
    setActiveMode(mode);
    setActiveRoom(null);
  };

  const handleJoinRoom = (room: GameRoom) => {
    const activeRobot = selectedCreature || getActivePlayerRobot();
    setSelectedCreature(activeRobot);
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

    savePlayerRobot(creature);
    setSelectedCreature(creature);
    setIsExplorationMorphOpen(false);
    setActiveExplorationContext(null);
    setActiveTab('games'); // Return to lobby with new active expedition fighter
  };

  const handleSelectCreature = (c: BattleCreature) => {
    setActivePlayerRobot(c);
    setSelectedCreature(c);
  };

  const pendingQuestsCount = quests.filter((q) => q.completed && !q.claimed).length;

  // If player is actively in a match, render the in-platform game view
  if (activeGameId) {
    return (
      <>
        <PlatformGamePlayer
          user={user}
          gameId={activeGameId}
          gameTitle={activeGameTitle}
          room={activeRoom}
          mode={activeMode}
          initialCreature={selectedCreature || getActivePlayerRobot()}
          onExitToPlatform={handleExitToPlatform}
          onMatchComplete={handleMatchComplete}
        />
        <IncomingNotificationOverlay onJoinBattleRoom={handleJoinRoom} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#E8F0EA] text-[#0E3323] flex flex-col font-sans selection:bg-[#2BE29E] selection:text-[#05110B]">
      {/* Dynamic Cybertronian Navigation Header */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        user={user}
        onOpenProfile={() => setIsProfileOpen(true)}
        pendingQuestsCount={pendingQuestsCount}
        onOpenQuests={() => setIsQuestsOpen(true)}
        onOpenPass={() => setIsCybertronPassOpen(true)}
        onOpenServerSettings={() => setIsLanServerOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((prev) => !prev)}
        onQuickPlay={() => handleLaunchGame('animatrix-3d-arena', activeMode)}
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
            onSelectCreature={handleSelectCreature}
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
      <footer className="hidden md:block border-t border-[#CADCD0] bg-[#E2ECE4] px-4 sm:px-6 py-4 text-[#3E6953] text-xs">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-heading font-black text-emerald-700 text-xs">Matter-Born</span>
            <span className="text-[#A3C0AD]">•</span>
            <span className="text-[#3E6953]">Transform Real-World Objects into 3D Mech Brawlers</span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <button onClick={() => setActiveTab('games')} className="hover:text-emerald-800 transition-colors font-medium cursor-pointer">
              Arena
            </button>
            <button onClick={() => setActiveTab('expedition')} className="hover:text-emerald-800 transition-colors font-medium cursor-pointer">
              Explore
            </button>
            <button onClick={() => setActiveTab('forge')} className="hover:text-amber-700 transition-colors font-bold text-amber-700 cursor-pointer">
              Forge
            </button>
            <button onClick={() => setIsLanServerOpen(true)} className="hover:text-emerald-800 transition-colors font-medium cursor-pointer">
              Servers
            </button>
          </div>
        </div>
      </footer>

      {/* Live Wi-Fi Notifications: Friend Requests & Battle Challenges */}
      <IncomingNotificationOverlay onJoinBattleRoom={handleJoinRoom} />

      {/* Profile Modal */}
      {isProfileOpen && (
        <ProfileModal
          user={user}
          onUpdateUser={handleUpdateUser}
          onClose={() => setIsProfileOpen(false)}
          onOpenAuth={() => {
            setIsProfileOpen(false);
            setIsAuthOpen(true);
          }}
          onLaunchFriendBattle={(friend, room) => {
            setIsProfileOpen(false);
            if (room) {
              handleJoinRoom(room);
            }
          }}
        />
      )}

      {/* Google Sign-In & Guest Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => {
          localStorage.setItem(AUTH_PROMPTED_KEY, 'true');
          setIsAuthOpen(false);
        }}
        currentUser={user}
        onAuthSuccess={(updatedUser) => {
          localStorage.setItem(AUTH_PROMPTED_KEY, 'true');
          handleUpdateUser(updatedUser);
        }}
      />

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

      {/* Wi-Fi LAN Server Settings Modal */}
      {isLanServerOpen && (
        <LanServerModal onClose={() => setIsLanServerOpen(false)} />
      )}
    </div>
  );
}
