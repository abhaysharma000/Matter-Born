import React, { useState } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Pause, 
  Play, 
  Wind, 
  Swords, 
  Skull,
  Bot,
  Layers,
  X,
  ArrowUp,
  ArrowLeft,
  Activity,
  Brain,
  Sparkles,
  ChevronRight,
  Compass,
  Anvil,
  Users
} from 'lucide-react';
import { BattleCreature } from '../../types/creature';
import { ArenaHUDState } from '../../game3d/ThreeArenaEngine';
import { VirtualJoystick } from './VirtualJoystick';
import { TouchLookJoystick } from './TouchLookJoystick';
import { MiniMap } from './MiniMap';
import { CombatDnaBlueprintView } from '../morph/CombatDnaBlueprintView';
import { TacticalInspectorModal } from './TacticalInspectorModal';
import { DetectedPlayerPattern } from '../../types/tacticalDirector';

interface Arena3DHUDProps {
  creature: BattleCreature;
  hudState: ArenaHUDState | null;
  isMuted: boolean;
  onToggleMute: () => void;
  onMoveInput: (vector: { x: number; z: number }) => void;
  onRotateCamera?: (deltaYaw: number, deltaPitch: number) => void;
  onAttack: (pressed: boolean) => void;
  onSpecialAbility: (pressed: boolean) => void;
  onDash: (pressed: boolean) => void;
  onJump: (pressed: boolean) => void;
  onPauseToggle: () => void;
  isPaused: boolean;
  onExit?: () => void;
  onVoiceCommand?: (command: string) => void;
  onKineticTap?: () => void;
  onTriggerAdaptation?: (forcedPattern?: DetectedPlayerPattern) => void;
}

export const Arena3DHUD: React.FC<Arena3DHUDProps> = ({
  creature,
  hudState,
  isMuted,
  onToggleMute,
  onMoveInput,
  onRotateCamera,
  onAttack,
  onSpecialAbility,
  onDash,
  onJump,
  onPauseToggle,
  isPaused,
  onExit,
  onTriggerAdaptation,
}) => {
  const [showMaterialDrawer, setShowMaterialDrawer] = useState(false);
  const [showTacticalInspector, setShowTacticalInspector] = useState(false);
  const [dismissedAdaptationId, setDismissedAdaptationId] = useState<string | null>(null);

  if (!hudState) return null;

  const currentStrategy = hudState.tacticalPolicy?.strategy || 'ACTIVE';
  const recentEvent = hudState.recentAdaptationEvent;
  const showAdaptationBanner = recentEvent && recentEvent.id !== dismissedAdaptationId;

  const hpRatio = Math.max(0, Math.min(1, hudState.playerHp / (hudState.playerMaxHp || 1)));
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-between p-2.5 sm:p-4 select-none font-sans overflow-hidden">
      
      {/* Top Header Bar: Clean, Unified & Minimal */}
      <div className="relative z-40 flex items-start justify-between gap-2 sm:gap-3 w-full">
        
        {/* Left Corner: Quick Exit Arrow + Small Circular Radar MiniMap + Creature Health & Status */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2.5">
          {/* Quick Exit to Lobby Button (Left) */}
          {onExit && (
            <button
              type="button"
              id="btn-hud-left-exit"
              onClick={(e) => {
                e.stopPropagation();
                onExit();
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                onExit();
              }}
              className="p-2 sm:p-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 active:scale-95 text-white font-black shadow-xl cursor-pointer transition-all border border-rose-400/50 flex items-center justify-center shrink-0"
              title="Exit to Lobby"
            >
              <ArrowLeft className="w-4 h-4 stroke-[3]" />
            </button>
          )}

          {/* Circular MiniMap in Left Corner */}
          <MiniMap hudState={hudState} />

          {/* Creature Health & Status */}
          <div className="flex items-center gap-2 sm:gap-2.5 p-2 sm:p-2.5 rounded-2xl bg-[#071610]/92 backdrop-blur-md border border-[#184635] shadow-xl min-w-[130px] sm:min-w-[200px]">
            <div
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-black text-xs sm:text-sm text-white shrink-0 border border-emerald-400/30 shadow-md"
              style={{ backgroundColor: creature.visualParams?.primaryColor || '#059669' }}
            >
              {creature.name.charAt(0)}
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between text-xs gap-1.5">
                <span className="font-black text-white truncate max-w-[80px] sm:max-w-[130px] tracking-wide text-[11px] sm:text-xs">
                  {creature.name}
                </span>
                <span className="text-[10px] sm:text-[11px] text-emerald-300 font-mono font-bold">
                  {hudState.playerHp}/{hudState.playerMaxHp}
                </span>
              </div>

              {/* Large Readable Health Bar */}
              <div className="h-2.5 sm:h-3 w-full rounded-full bg-[#0E281E] border border-[#1C4D3A] overflow-hidden relative shadow-inner">
                <div
                  className={`h-full transition-all duration-200 rounded-full ${
                    hpRatio > 0.5
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm shadow-emerald-400/50'
                      : hpRatio > 0.25
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                      : 'bg-gradient-to-r from-rose-600 to-red-500 animate-pulse'
                  }`}
                  style={{ width: `${hpRatio * 100}%` }}
                />
              </div>

              {/* Bush Stealth Hiding Indicator */}
              {hudState.isHidingInBush && (
                <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-emerald-300 font-mono font-bold tracking-wider animate-pulse pt-0.5">
                  <span>🌿</span>
                  <span>HIDDEN (2.5x CRIT)</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center: Real-Time AI Adaptation Banner Notification (Animated) */}
        {showAdaptationBanner && (
          <div 
            id="ai-adaptation-toast"
            className="pointer-events-auto hidden md:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#091B14]/95 backdrop-blur-md border border-amber-500/60 text-white text-xs shadow-xl animate-in slide-in-from-top-4 duration-300 max-w-xs sm:max-w-md"
          >
            <div className="w-5 h-5 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-3 h-3 animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-amber-400 text-[10px] uppercase tracking-wider">
                  Strategy Shift!
                </span>
                <span className="text-[10px] text-[#A1D2BC] truncate">
                  {recentEvent.patternDetected.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
            <button
              onClick={() => setDismissedAdaptationId(recentEvent.id)}
              className="p-0.5 text-[#6DAA8E] hover:text-white cursor-pointer"
              title="Dismiss"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Right: Opponents Alive, Timer, Sound & Prominent Exit to Lobby */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
          {/* Match Score & Timer */}
          <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-2xl bg-[#071610]/92 backdrop-blur-md border border-[#184635] text-xs font-bold text-white shadow-xl">
            {hudState.friendCombatantsCount && hudState.friendCombatantsCount > 0 ? (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-mono font-black" title={`Squad Friends in Match: ${hudState.friendNames?.join(', ')}`}>
                <Users className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span className="text-[11px] text-emerald-200 font-bold">
                  {hudState.friendCombatantsCount} FRIENDS + {Math.max(0, 10 - hudState.friendCombatantsCount)} BOTS
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-cyan-300 font-mono font-black" title="10 AI-Integrated NPCs Spawned">
                <Bot className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span className="text-[11px] text-cyan-200">10 AI BOTS</span>
              </div>
            )}
            <span className="text-[#1C4D3A] font-bold">|</span>
            <div className="flex items-center gap-1 text-rose-400 font-mono font-black" title="Opponents Remaining">
              <Skull className="w-3.5 h-3.5 text-rose-400" />
              <span>{hudState.aliveCount} left</span>
            </div>
            <span className="text-[#1C4D3A] font-bold">|</span>
            <div className="text-emerald-300 font-mono font-bold text-xs" title="Match Survival Time">
              ⏱️ {formatTime(hudState.survivalSeconds)}
            </div>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={onToggleMute}
            className="p-2 sm:p-2.5 rounded-2xl bg-[#071610]/92 backdrop-blur-md border border-[#184635] hover:bg-[#0E281E] text-[#6DAA8E] hover:text-white transition-colors shadow-xl cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-[#2BE29E]" />}
          </button>

          {/* Dedicated Return to Lobby Exit Button (No Pause clutter!) */}
          {onExit && (
            <button
              type="button"
              id="btn-hud-lobby-exit"
              onClick={(e) => {
                e.stopPropagation();
                onExit();
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                onExit();
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-500 active:scale-95 text-white text-xs font-black tracking-wider border-2 border-rose-400 shadow-xl shadow-rose-950/60 transition-all cursor-pointer pointer-events-auto shrink-0 z-50 select-none"
              title="Exit Match to Lobby"
            >
              <ArrowLeft className="w-4 h-4 stroke-[3]" />
              <span>EXIT LOBBY</span>
            </button>
          )}
        </div>
      </div>

      {/* Bottom Controls Area */}
      <div className="flex items-end justify-between w-full pb-1">
        
        {/* Bottom Left: Virtual Joystick */}
        <div className="pointer-events-auto">
          <VirtualJoystick onMove={onMoveInput} />
        </div>

        {/* Center: Desktop Controls Reminder Bar */}
        <div className="hidden lg:flex pointer-events-auto items-center gap-3 px-4 py-2 rounded-full bg-[#071610]/90 backdrop-blur-md border border-[#184635] shadow-xl text-xs text-[#A1D2BC] font-medium">
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-[#0E281E] border border-[#1C4D3A] text-[10px] font-mono text-[#2BE29E] font-bold">WASD</kbd>
            <span>Move</span>
          </span>
          <span className="text-[#184635]">•</span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-[#0E281E] border border-[#1C4D3A] text-[10px] font-mono text-[#2BE29E] font-bold">Z</kbd>
            <span>Attack</span>
          </span>
          <span className="text-[#184635]">•</span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-[#0E281E] border border-[#1C4D3A] text-[10px] font-mono text-[#2BE29E] font-bold">SHIFT</kbd>
            <span>Dash</span>
          </span>
          <span className="text-[#184635]">•</span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-[#0E281E] border border-[#1C4D3A] text-[10px] font-mono text-[#2BE29E] font-bold">SPACE</kbd>
            <span>Jump</span>
          </span>
        </div>

        {/* Right Half Screen: Direct 360° Touch-to-Look Zone (Swipe/Drag to Look) */}
        {onRotateCamera && <TouchLookJoystick onRotate={onRotateCamera} />}

        {/* Bottom Right: Clean Ergonomic Action Cluster */}
        <div className="pointer-events-auto relative z-20 w-44 h-44 sm:w-48 sm:h-48 flex items-end justify-end select-none touch-none">
          
          {/* Evade / Dash Button (SHIFT) */}
          <div className="absolute top-1 left-2 sm:left-3 flex flex-col items-center">
            <button
              onPointerDown={() => onDash(true)}
              onPointerUp={() => onDash(false)}
              disabled={hudState.dashCooldownRemaining > 0}
              className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all shadow-md active:scale-95 ${
                hudState.dashCooldownRemaining > 0
                  ? 'bg-[#0A1A14] border border-[#143B2C] text-stone-500'
                  : 'bg-[#0E281E] border border-[#2BE29E]/50 text-[#2BE29E] hover:border-[#2BE29E] shadow-sm shadow-[#2BE29E]/20'
              }`}
            >
              <Wind className="w-4 h-4 sm:w-5 sm:h-5" />
              {hudState.dashCooldownRemaining > 0 && (
                <span className="absolute inset-0 rounded-xl bg-[#071610]/90 flex items-center justify-center text-[10px] font-mono font-bold text-[#6DAA8E]">
                  {hudState.dashCooldownRemaining}s
                </span>
              )}
            </button>
            <div className="flex items-center gap-0.5 mt-1">
              <span className="text-[9px] text-[#A1D2BC] font-semibold">Dash</span>
              <span className="hidden sm:inline text-[8px] px-1 py-0.2 rounded bg-[#0A1A14] border border-[#143B2C] text-[#6DAA8E] font-mono">SHIFT</span>
            </div>
          </div>

          {/* Jump Button (SPACE) */}
          <div className="absolute bottom-1 left-0 flex flex-col items-center">
            <button
              onPointerDown={() => onJump(true)}
              onPointerUp={() => onJump(false)}
              className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#0E281E] border border-[#2BE29E]/50 text-[#2BE29E] hover:border-[#2BE29E] flex items-center justify-center transition-all shadow-md shadow-[#2BE29E]/20 active:scale-95"
            >
              <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <div className="flex items-center gap-0.5 mt-1">
              <span className="text-[9px] text-[#A1D2BC] font-semibold">Jump</span>
              <span className="hidden sm:inline text-[8px] px-1 py-0.2 rounded bg-[#0A1A14] border border-[#143B2C] text-[#6DAA8E] font-mono">SPACE</span>
            </div>
          </div>

          {/* Special Ability Button (X) */}
          <div className="absolute top-0 right-10 sm:right-12 flex flex-col items-center">
            <button
              onPointerDown={() => onSpecialAbility(true)}
              onPointerUp={() => onSpecialAbility(false)}
              disabled={hudState.abilityCooldownRemaining > 0 || hudState.playerIsSilenced}
              className={`relative w-12 h-12 sm:w-13 sm:h-13 rounded-2xl flex flex-col items-center justify-center transition-all shadow-lg active:scale-95 ${
                hudState.abilityCooldownRemaining > 0
                  ? 'bg-[#0A1A14] border border-[#143B2C] text-stone-500'
                  : 'bg-gradient-to-tr from-amber-500 to-amber-400 border border-amber-300 text-amber-950 shadow-amber-500/30'
              }`}
            >
              <span className="text-base leading-none">
                {creature.specialAbility?.icon || '⚡'}
              </span>
              {hudState.abilityCooldownRemaining > 0 && (
                <span className="absolute inset-0 rounded-2xl bg-[#071610]/90 flex items-center justify-center text-[10px] font-mono font-bold text-amber-400">
                  {hudState.abilityCooldownRemaining}s
                </span>
              )}
            </button>
            <div className="flex items-center gap-0.5 mt-1">
              <span className="text-[9px] text-amber-300 font-semibold">Skill</span>
              <span className="hidden sm:inline text-[8px] px-1 py-0.2 rounded bg-[#0A1A14] border border-[#143B2C] text-amber-300 font-mono">X</span>
            </div>
          </div>

          {/* Primary Attack Button (Z) */}
          <div className="absolute bottom-0 right-0 flex flex-col items-center">
            <button
              onPointerDown={() => onAttack(true)}
              onPointerUp={() => onAttack(false)}
              className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-500 to-[#2BE29E] border-2 border-emerald-300 text-white flex items-center justify-center shadow-xl shadow-emerald-500/40 active:scale-90 transition-transform"
            >
              <Swords className="w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow-sm" />
            </button>
            <div className="flex items-center gap-0.5 mt-1">
              <span className="text-[9px] text-emerald-300 font-bold">Attack</span>
              <span className="hidden sm:inline text-[8px] px-1.5 py-0.2 rounded bg-[#0A1A14] border border-[#143B2C] text-emerald-300 font-mono font-bold">Z</span>
            </div>
          </div>

        </div>

      </div>

      {/* Real-World Combat DNA & Material Physics Inspection Modal */}
      {showMaterialDrawer && (
        <div className="fixed inset-0 pointer-events-auto z-50 flex items-center justify-center p-3 sm:p-5 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white border border-[#BCD8C3] p-4 sm:p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#E0DCD1]">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-700" />
                <div>
                  <h3 className="font-heading font-black text-[#14532D] text-sm sm:text-base">
                    Active Combat DNA & Physics
                  </h3>
                  <p className="text-[11px] text-[#55685C]">
                    Real-World Object Physics → Deterministic 3D Mechanics
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMaterialDrawer(false)}
                className="p-1.5 rounded-lg bg-[#FAF8F5] hover:bg-[#F2EFE8] text-[#55685C] hover:text-[#18251E] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Combat DNA Blueprint Component */}
            <CombatDnaBlueprintView creature={creature} variant="full" showComparisonHint={true} />

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowMaterialDrawer(false)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-sm"
              >
                Resume Battle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adaptive Gemini Combat Director Inspector Modal */}
      <TacticalInspectorModal
        isOpen={showTacticalInspector}
        onClose={() => setShowTacticalInspector(false)}
        policy={hudState.tacticalPolicy}
        metrics={hudState.observationMetrics}
        recentEvent={hudState.recentAdaptationEvent}
        history={hudState.tacticalAdaptationHistory}
        onTriggerAdaptation={onTriggerAdaptation}
      />

      {/* Game Paused Fullscreen Modal with Explicit Exit to Lobby Option */}
      {isPaused && (
        <div className="fixed inset-0 z-50 pointer-events-auto flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-[#091E16] border border-emerald-500/40 p-6 shadow-2xl flex flex-col items-center text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
              <Pause className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white font-heading tracking-wide">
                BATTLE PAUSED
              </h2>
              <p className="text-xs text-[#8BA996] mt-1">
                {creature.name} • Survival: {formatTime(hudState.survivalSeconds)}
              </p>
            </div>

            <div className="w-full grid grid-cols-2 gap-2 p-3 rounded-2xl bg-[#071610] border border-[#184635] text-xs">
              <div>
                <div className="text-[10px] text-[#6DAA8E] font-bold uppercase">OPPONENTS</div>
                <div className="text-sm font-black text-white font-mono mt-0.5">{hudState.aliveCount} Left</div>
              </div>
              <div>
                <div className="text-[10px] text-[#6DAA8E] font-bold uppercase">HEALTH</div>
                <div className="text-sm font-black text-emerald-400 font-mono mt-0.5">
                  {hudState.playerHp}/{hudState.playerMaxHp}
                </div>
              </div>
            </div>

            <div className="w-full space-y-2 pt-2">
              <button
                type="button"
                onClick={onPauseToggle}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-emerald-500/30 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>RESUME MATCH</span>
              </button>

              {onExit && (
                <button
                  type="button"
                  id="btn-pause-lobby-exit"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onExit();
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                    onExit();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onExit();
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 border border-rose-400/50 text-white font-black text-sm tracking-wide shadow-lg shadow-rose-900/30 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4 stroke-[3]" />
                  <span>EXIT TO LOBBY</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
