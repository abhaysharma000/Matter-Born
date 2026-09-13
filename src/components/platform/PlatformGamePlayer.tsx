import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ArrowLeft, 
  Maximize2, 
  Minimize2, 
  Volume2, 
  VolumeX, 
  Wifi, 
  Pause, 
  Play, 
  Share2, 
  Check, 
  Sparkles, 
  Camera, 
  RotateCcw,
  MessageSquare,
  CloudRain,
  Sun,
  Snowflake,
  Zap,
  RefreshCw,
  Compass
} from 'lucide-react';
import { BattleCreature, Arena3DMatchStats, RealWorldEnvironment } from '../../types/creature';
import { PlatformUser, GameRoom } from '../../types/platform';
import { GameMode } from '../../types';
import { ThreeArenaEngine, ArenaHUDState } from '../../game3d/ThreeArenaEngine';
import { CreatureMorphModal } from '../morph/CreatureMorphModal';
import { Arena3DHUD } from '../arena3d/Arena3DHUD';
import { MatchResultModal } from '../arena3d/MatchResultModal';
import { CreatureChatModal } from '../arena3d/CreatureChatModal';
import { REAL_WORLD_ENVIRONMENTS, detectRealWorldEnvironment } from '../../data/environmentPresets';
import { OBJECT_PRESETS } from '../../data/creaturePresets';
import { sound } from '../../utils/audio';
import { DetectedPlayerPattern } from '../../types/tacticalDirector';
import { lockToLandscape, lockToPortrait } from '../../utils/screenOrientation';
import { multiplayerManager } from '../../utils/multiplayerManager';
import { FriendProfile } from '../../types/multiplayer';
import { getActivePlayerRobot } from '../../utils/robotStorage';

interface PlatformGamePlayerProps {
  user: PlatformUser;
  gameId: string;
  gameTitle: string;
  room?: GameRoom | null;
  mode?: GameMode;
  initialCreature?: BattleCreature | null;
  onExitToPlatform: () => void;
  onMatchComplete: (earnedCoins: number, earnedXp: number, kills: number) => void;
}

export const PlatformGamePlayer: React.FC<PlatformGamePlayerProps> = ({
  user,
  gameId,
  gameTitle,
  room,
  mode = 'easy',
  initialCreature,
  onExitToPlatform,
  onMatchComplete,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<ThreeArenaEngine | null>(null);
  const onMatchCompleteRef = useRef(onMatchComplete);
  onMatchCompleteRef.current = onMatchComplete;

  const roomRef = useRef(room);
  roomRef.current = room;

  // Active Creature & Morphing State - auto-start with active robot so player spawns immediately
  const [activeCreature, setActiveCreature] = useState<BattleCreature>(() => {
    return initialCreature || getActivePlayerRobot();
  });
  const [showMorphModal, setShowMorphModal] = useState<boolean>(false);
  const [showChatModal, setShowChatModal] = useState<boolean>(false);

  // Real-World Environment State
  const [currentEnvironment, setCurrentEnvironment] = useState<RealWorldEnvironment>(() => detectRealWorldEnvironment());
  const [isMutatingEnv, setIsMutatingEnv] = useState(false);
  const [showEnvDropdown, setShowEnvDropdown] = useState(false);

  // In-Game State
  const [hudState, setHudState] = useState<ArenaHUDState | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [matchResult, setMatchResult] = useState<Arena3DMatchStats | null>(null);

  // Settings & Utilities
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  const roomCode = room ? room.code : '3D-ARENA-01';
  const ping = room ? room.ping : 18;

  const getFriendCombatants = useCallback((): FriendProfile[] => {
    const currentRoom = roomRef.current;
    if (currentRoom?.friendFighters && currentRoom.friendFighters.length > 0) {
      return currentRoom.friendFighters;
    }
    if (
      currentRoom?.code?.startsWith('MATE-') ||
      currentRoom?.code?.startsWith('VS-') ||
      currentRoom?.code?.startsWith('ARENA-') ||
      currentRoom?.isPrivate
    ) {
      return multiplayerManager.getFriends();
    }
    return [];
  }, []);

  // Initialize 3D Engine on mount & lock screen to landscape for combat
  useEffect(() => {
    // Auto-landscape for battle mode controls
    lockToLandscape();

    const engine = new ThreeArenaEngine();
    engineRef.current = engine;

    if (containerRef.current) {
      try {
        engine.initRenderer(containerRef.current);
      } catch (err) {
        console.warn('WebGL init error:', err);
      }
    }

    engine.setCallbacks(
      (hud) => {
        setHudState(hud);
      },
      (stats) => {
        setMatchResult(stats);
        if (onMatchCompleteRef.current) {
          onMatchCompleteRef.current(stats.earnedCoins, stats.earnedXp, stats.kills);
        }
      }
    );

    // Instant match start - friend & host always spawn into match immediately!
    const resolvedCreature = initialCreature || activeCreature || getActivePlayerRobot();
    const currentRoom = roomRef.current;
    const effectiveMode: GameMode = ((currentRoom?.mode || mode || 'easy') as GameMode);
    
    let friendList: FriendProfile[] = [];
    if (currentRoom?.friendFighters && currentRoom.friendFighters.length > 0) {
      friendList = currentRoom.friendFighters;
    } else if (
      currentRoom?.code?.startsWith('MATE-') ||
      currentRoom?.code?.startsWith('VS-') ||
      currentRoom?.code?.startsWith('ARENA-') ||
      currentRoom?.isPrivate
    ) {
      friendList = multiplayerManager.getFriends();
    }

    try {
      engine.applyEnvironment(currentEnvironment);
      engine.startMatch(resolvedCreature, 10, effectiveMode, friendList);

      if (currentRoom?.code) {
        multiplayerManager.joinRoom(currentRoom.code).catch(() => {});
        engine.enableMultiplayer(currentRoom.code);
      }
    } catch (err) {
      console.warn('Failed to start arena match:', err);
    }

    return () => {
      // Restore orientation when leaving battle mode
      lockToPortrait().catch(() => {});
      if (engineRef.current) {
        try {
          engineRef.current.destroy();
        } catch {}
        engineRef.current = null;
      }
    };
  }, []); // Run ONCE on mount to ensure WebGL context is never lost

  // Real-World Device Motion Sensor (Shake phone to charge kinetic energy)
  useEffect(() => {
    let lastShakeTime = 0;
    const handleDeviceMotion = (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity;
      if (!acc) return;
      const total = Math.abs(acc.x || 0) + Math.abs(acc.y || 0) + Math.abs(acc.z || 0);
      const now = performance.now();
      if (total > 24 && now - lastShakeTime > 250) {
        lastShakeTime = now;
        if (engineRef.current) {
          engineRef.current.addKineticEnergy(16);
        }
      }
    };

    window.addEventListener('devicemotion', handleDeviceMotion);
    return () => {
      window.removeEventListener('devicemotion', handleDeviceMotion);
    };
  }, []);

  // Handle Creature Selected from Object Morph Chamber
  const handleCreatureReady = (creature: BattleCreature) => {
    setActiveCreature(creature);
    setShowMorphModal(false);
    setMatchResult(null);
    setIsPaused(false);

    if (engineRef.current) {
      const effectiveMode: GameMode = ((room?.mode || mode || 'easy') as GameMode);
      engineRef.current.applyEnvironment(currentEnvironment);
      engineRef.current.startMatch(creature, 10, effectiveMode, getFriendCombatants());

      if (room?.code) {
        engineRef.current.enableMultiplayer(room.code);
      }
    }
  };

  // Change Environment
  const handleSelectEnvironment = (env: RealWorldEnvironment) => {
    setCurrentEnvironment(env);
    setShowEnvDropdown(false);
    if (engineRef.current) {
      engineRef.current.applyEnvironment(env);
    }
  };

  // AI Mutate Arena using Gemini backend
  const handleAIMutateEnvironment = async () => {
    setIsMutatingEnv(true);
    setShowEnvDropdown(false);
    try {
      const res = await fetch('/api/environment/mutate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationQuery: 'Tokyo Neon Rainfall' + (Math.random() > 0.5 ? ' Heatwave' : ' Thunderstorm'),
          timeOfDay: new Date().getHours() > 18 ? 'night' : 'day',
        }),
      });
      if (res.ok) {
        const mutatedEnv: RealWorldEnvironment = await res.json();
        setCurrentEnvironment(mutatedEnv);
        if (engineRef.current) {
          engineRef.current.applyEnvironment(mutatedEnv);
        }
      }
    } catch {
      // Fallback to random preset
      const otherPresets = REAL_WORLD_ENVIRONMENTS.filter((e) => e.id !== currentEnvironment.id);
      const randomEnv = otherPresets[Math.floor(Math.random() * otherPresets.length)];
      setCurrentEnvironment(randomEnv);
      if (engineRef.current) {
        engineRef.current.applyEnvironment(randomEnv);
      }
    } finally {
      setIsMutatingEnv(false);
    }
  };

  // Combat Input Handlers
  const handleMoveInput = useCallback((vector: { x: number; z: number }) => {
    if (engineRef.current) {
      engineRef.current.inputVector = vector;
    }
  }, []);

  const handleAttack = useCallback((pressed: boolean) => {
    if (engineRef.current) {
      engineRef.current.isAttackPressed = pressed;
    }
  }, []);

  const handleSpecialAbility = useCallback((pressed: boolean) => {
    if (engineRef.current) {
      engineRef.current.isAbilityPressed = pressed;
    }
  }, []);

  const handleDash = useCallback((pressed: boolean) => {
    if (engineRef.current) {
      engineRef.current.isDashPressed = pressed;
    }
  }, []);

  const handleJump = useCallback((pressed: boolean) => {
    if (engineRef.current) {
      engineRef.current.isJumpPressed = pressed;
    }
  }, []);

  const handleTriggerAdaptation = useCallback((forcedPattern?: DetectedPlayerPattern) => {
    if (engineRef.current) {
      engineRef.current.forceTacticalAdaptation(forcedPattern);
    }
  }, []);

  const handleRotateCamera = useCallback((deltaYaw: number, deltaPitch: number) => {
    if (engineRef.current) {
      engineRef.current.rotateCamera(deltaYaw, deltaPitch);
    }
  }, []);

  // Global Keyboard Controls: Z to attack, Shift for dash, Space for jump, WASD/Arrows for move, X for skill
  useEffect(() => {
    const moveKeys = { w: false, a: false, s: false, d: false };

    const updateMovement = () => {
      let x = 0;
      let z = 0;
      if (moveKeys.w) z -= 1;
      if (moveKeys.s) z += 1;
      if (moveKeys.a) x -= 1;
      if (moveKeys.d) x += 1;

      const len = Math.hypot(x, z);
      if (engineRef.current) {
        if (len > 0) {
          engineRef.current.inputVector = { x: x / len, z: z / len };
        } else {
          engineRef.current.inputVector = { x: 0, z: 0 };
        }
      }
    };

    const isInputFocused = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      return target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInputFocused(e)) return;
      const key = e.key.toLowerCase();

      // Movement
      if (key === 'w' || key === 'arrowup') {
        moveKeys.w = true;
        updateMovement();
      } else if (key === 's' || key === 'arrowdown') {
        moveKeys.s = true;
        updateMovement();
      } else if (key === 'a' || key === 'arrowleft') {
        moveKeys.a = true;
        updateMovement();
      } else if (key === 'd' || key === 'arrowright') {
        moveKeys.d = true;
        updateMovement();
      }

      // Attack: Z
      if (key === 'z') {
        handleAttack(true);
      }

      // Dash: Shift
      if (e.key === 'Shift' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        handleDash(true);
      }

      // Jump: Space
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        handleJump(true);
      }

      // Special Ability / Skill: X
      if (key === 'x') {
        handleSpecialAbility(true);
      }

      // 360° Camera Look: Q / E
      if (key === 'q') {
        handleRotateCamera(-0.08, 0);
      } else if (key === 'e') {
        handleRotateCamera(0.08, 0);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (isInputFocused(e)) return;
      const key = e.key.toLowerCase();

      // Movement
      if (key === 'w' || key === 'arrowup') {
        moveKeys.w = false;
        updateMovement();
      } else if (key === 's' || key === 'arrowdown') {
        moveKeys.s = false;
        updateMovement();
      } else if (key === 'a' || key === 'arrowleft') {
        moveKeys.a = false;
        updateMovement();
      } else if (key === 'd' || key === 'arrowright') {
        moveKeys.d = false;
        updateMovement();
      }

      // Attack: Z
      if (key === 'z') {
        handleAttack(false);
      }

      // Dash: Shift
      if (e.key === 'Shift' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        handleDash(false);
      }

      // Jump: Space
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        handleJump(false);
      }

      // Special Ability / Skill: X
      if (key === 'x') {
        handleSpecialAbility(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleAttack, handleDash, handleJump, handleSpecialAbility, handleRotateCamera]);

  // Desktop mouse drag to rotate camera freely
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isMouseDown = false;
    let lastX = 0;
    let lastY = 0;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0 || e.button === 2) {
        isMouseDown = true;
        lastX = e.clientX;
        lastY = e.clientY;
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isMouseDown || !engineRef.current) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      engineRef.current.rotateCamera(dx * 0.0055, -dy * 0.0042);
    };

    const onMouseUp = () => {
      isMouseDown = false;
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // Real-world voice command trigger
  const handleVoiceCommand = useCallback((command: string) => {
    if (engineRef.current) {
      engineRef.current.issueVoiceCommand(command);
    }
  }, []);

  // Real-world kinetic charge tap
  const handleKineticTap = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.addKineticEnergy(20);
    }
  }, []);

  const handlePauseToggle = () => {
    if (!engineRef.current) return;
    const next = !isPaused;
    setIsPaused(next);
    engineRef.current.isPaused = next;
  };

  const handlePlayAgain = () => {
    if (activeCreature && engineRef.current) {
      setMatchResult(null);
      setIsPaused(false);
      engineRef.current.applyEnvironment(currentEnvironment);
      engineRef.current.startMatch(activeCreature, 10, 'easy', getFriendCombatants());
    } else {
      setShowMorphModal(true);
    }
  };

  const handleSnapNewObject = () => {
    setMatchResult(null);
    setShowMorphModal(true);
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sound.setMuted(!next);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleExitToLobby = () => {
    // 1. Immediately exit back to the platform lobby
    onExitToPlatform();

    // 2. Safely destroy engine in background without blocking UI
    try {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    } catch (e) {
      console.warn('Engine destroy error on exit:', e);
    }

    // 3. Reset orientation to portrait
    try {
      lockToPortrait().catch(() => {});
    } catch {}
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none bg-slate-950 font-sans">
      
      {/* Platform Top Header Bar - Only rendered when modal/lobby menu is active, avoiding HUD overlap */}
      {(showMorphModal || matchResult || !activeCreature) && (
        <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-3 sm:px-5 py-2 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80">
          
          {/* Left: Exit to Arena & Title */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              id="btn-platform-exit-lobby"
              onPointerDown={(e) => {
                e.stopPropagation();
                handleExitToLobby();
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                handleExitToLobby();
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleExitToLobby();
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-black transition-colors cursor-pointer active:scale-95"
              title="Return to Arena Lobby"
            >
              <ArrowLeft className="w-4 h-4 text-cyan-400" />
              <span>LOBBY</span>
            </button>

            <span className="font-heading font-black text-white text-sm hidden sm:inline">
              Matter-Born
            </span>
          </div>

          {/* Center: Environment Synchronizer & Morph */}
          <div className="flex items-center gap-2 text-xs">
            
            {/* Environment Pill */}
            <div className="relative">
              <button
                onClick={() => setShowEnvDropdown(!showEnvDropdown)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-semibold transition-colors"
              >
                {currentEnvironment.weather === 'thunderstorm' ? (
                  <CloudRain className="w-3.5 h-3.5 text-cyan-400" />
                ) : currentEnvironment.weather === 'heatwave' ? (
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                ) : currentEnvironment.weather === 'blizzard' ? (
                  <Snowflake className="w-3.5 h-3.5 text-sky-300" />
                ) : (
                  <Compass className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span className="truncate max-w-[100px] sm:max-w-none">{currentEnvironment.name}</span>
              </button>

              {showEnvDropdown && (
                <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 w-56 max-w-[calc(100vw-24px)] rounded-2xl bg-slate-900 border border-slate-800 p-2 shadow-2xl z-50 space-y-1 animate-fadeIn">
                  <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-500">
                    Select Arena Biome
                  </div>
                  {REAL_WORLD_ENVIRONMENTS.map((env) => (
                    <button
                      key={env.id}
                      onClick={() => handleSelectEnvironment(env)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        env.id === currentEnvironment.id
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span>{env.name}</span>
                      <span className="text-[10px] font-mono text-slate-400">{env.temperatureC}°C</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Morph New Object Button */}
            <button
              onClick={() => setShowMorphModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden xs:inline">Morph</span>
            </button>
          </div>

          {/* Right: Sound, Fullscreen & Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={toggleSound}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title={soundEnabled ? 'Mute' : 'Unmute'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* 3D WebGL Canvas Container */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-crosshair touch-none"
      />

      {/* In-Game 3D Heads-Up Display */}
      {activeCreature && !showMorphModal && !matchResult && (
        <Arena3DHUD
          creature={activeCreature}
          hudState={hudState}
          isMuted={!soundEnabled}
          onToggleMute={toggleSound}
          onMoveInput={handleMoveInput}
          onRotateCamera={handleRotateCamera}
          onAttack={handleAttack}
          onSpecialAbility={handleSpecialAbility}
          onDash={handleDash}
          onJump={handleJump}
          onPauseToggle={handlePauseToggle}
          isPaused={isPaused}
          onExit={handleExitToLobby}
          onVoiceCommand={handleVoiceCommand}
          onKineticTap={handleKineticTap}
          onTriggerAdaptation={handleTriggerAdaptation}
        />
      )}

      {/* Object Photo Capture & AI Creature Morph Modal */}
      {showMorphModal && (
        <CreatureMorphModal
          onCreatureReady={handleCreatureReady}
          onClose={activeCreature ? () => setShowMorphModal(false) : undefined}
        />
      )}

      {/* Creature Chat & Persona Dialogue Modal */}
      {showChatModal && activeCreature && (
        <CreatureChatModal
          creature={activeCreature}
          environment={currentEnvironment}
          onClose={() => setShowChatModal(false)}
        />
      )}

      {/* Match Results Modal */}
      {matchResult && (
        <MatchResultModal
          stats={matchResult}
          onPlayAgain={handlePlayAgain}
          onSnapNewObject={handleSnapNewObject}
          onReturnToLobby={handleExitToLobby}
        />
      )}

    </div>
  );
};

