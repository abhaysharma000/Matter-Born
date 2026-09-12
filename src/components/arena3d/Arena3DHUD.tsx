import React, { useState } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Pause, 
  Play, 
  Wind, 
  Swords, 
  Skull,
  Layers,
  X,
  ArrowUp,
  Activity,
  Brain,
  Sparkles,
  ChevronRight,
  Compass,
  Anvil
} from 'lucide-react';
import { BattleCreature } from '../../types/creature';
import { ArenaHUDState } from '../../game3d/ThreeArenaEngine';
import { VirtualJoystick } from './VirtualJoystick';
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
  onAttack: (pressed: boolean) => void;
  onSpecialAbility: (pressed: boolean) => void;
  onDash: (pressed: boolean) => void;
  onJump: (pressed: boolean) => void;
  onPauseToggle: () => void;
  isPaused: boolean;
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
  onAttack,
  onSpecialAbility,
  onDash,
  onJump,
  onPauseToggle,
  isPaused,
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
    <div className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-between p-3 sm:p-5 select-none font-sans overflow-hidden">
      
      {/* Top Header Bar: Clean & Minimal */}
      <div className="flex items-start justify-between gap-3 w-full">
        
        {/* Left: Creature Health & Status (Simplified, Clean, Large & Readable) */}
        <div className="pointer-events-auto flex items-center gap-3 p-2.5 sm:p-3 rounded-2xl bg-[#071610]/90 backdrop-blur-md border border-[#184635] shadow-xl min-w-[190px] sm:min-w-[240px]">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white shrink-0 border border-emerald-400/30 shadow-md"
            style={{ backgroundColor: creature.visualParams?.primaryColor || '#059669' }}
          >
            {creature.name.charAt(0)}
          </div>

          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-white truncate max-w-[120px] sm:max-w-[150px] tracking-wide">
                {creature.name}
              </span>
              <span className="text-[11px] text-emerald-300 font-mono font-bold">
                {hudState.playerHp} / {hudState.playerMaxHp}
              </span>
            </div>

            {/* Large Readable Health Bar */}
            <div className="h-3 w-full rounded-full bg-[#0E281E] border border-[#1C4D3A] overflow-hidden relative shadow-inner">
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
          </div>
        </div>

        {/* Center: Real-Time AI Adaptation Banner Notification (Animated) */}
        {showAdaptationBanner && (
          <div 
            id="ai-adaptation-toast"
            className="pointer-events-auto flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-[#091B14]/95 backdrop-blur-md border border-amber-500/60 text-white text-xs shadow-xl animate-in slide-in-from-top-4 duration-300 max-w-sm sm:max-w-md"
          >
            <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-amber-400 text-[10px] uppercase tracking-wider">
                  Enemy Strategy Shift!
                </span>
                <span className="text-[10px] text-[#A1D2BC]">
                  Countering {recentEvent.patternDetected.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setDismissedAdaptationId(recentEvent.id)}
                className="p-1 text-[#6DAA8E] hover:text-white cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Center: Material Advantage Notice (Only if active and no banner) */}
        {!showAdaptationBanner && hudState.materialAdvantageNotice && (
          <div className="pointer-events-none hidden sm:inline-block px-3 py-1 rounded-full bg-[#091B14]/95 backdrop-blur-md border border-[#2BE29E]/50 text-[#2BE29E] text-xs font-bold shadow-md">
            {hudState.materialAdvantageNotice}
          </div>
        )}

        {/* Right: Enemies Alive, Timer, Sound & Pause */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Match Score & Timer */}
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-[#071610]/90 backdrop-blur-md border border-[#184635] text-xs font-bold text-white shadow-xl">
            <div className="flex items-center gap-1.5 text-rose-400 font-mono font-black" title="Opponents Remaining">
              <Skull className="w-4 h-4 text-rose-400" />
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
            className="p-2.5 rounded-2xl bg-[#071610]/90 backdrop-blur-md border border-[#184635] hover:bg-[#0E281E] text-[#6DAA8E] hover:text-white transition-colors shadow-xl cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-[#2BE29E]" />}
          </button>

          {/* Pause Toggle */}
          <button
            onClick={onPauseToggle}
            className="p-2.5 rounded-2xl bg-[#071610]/90 backdrop-blur-md border border-[#184635] hover:bg-[#0E281E] text-[#6DAA8E] hover:text-white transition-colors shadow-xl cursor-pointer"
            title={isPaused ? 'Resume' : 'Pause'}
          >
            {isPaused ? <Play className="w-4 h-4 text-[#2BE29E]" /> : <Pause className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mini-Map Radar: Top Right */}
      <div className="absolute top-16 sm:top-18 right-3 sm:right-5 pointer-events-auto z-20">
        <MiniMap hudState={hudState} />
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

        {/* Bottom Right: Clean Ergonomic Action Cluster */}
        <div className="pointer-events-auto relative w-44 h-44 sm:w-48 sm:h-48 flex items-end justify-end select-none touch-none">
          
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

    </div>
  );
};
