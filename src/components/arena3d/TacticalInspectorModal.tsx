import React, { useState } from 'react';
import { 
  X, 
  Brain, 
  Sparkles, 
  Crosshair, 
  ShieldAlert, 
  Activity, 
  Zap, 
  Flame, 
  History, 
  CheckCircle2, 
  ArrowRight,
  RefreshCw,
  Gauge
} from 'lucide-react';
import { 
  TacticalPolicy, 
  TacticalAdaptationEvent, 
  CombatObservationMetrics,
  DetectedPlayerPattern,
  PredefinedTacticalStrategy
} from '../../types/tacticalDirector';

interface TacticalInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  policy?: TacticalPolicy;
  metrics?: CombatObservationMetrics;
  recentEvent?: TacticalAdaptationEvent | null;
  history?: TacticalAdaptationEvent[];
  onTriggerAdaptation?: (forcedPattern?: DetectedPlayerPattern) => void;
}

export const TacticalInspectorModal: React.FC<TacticalInspectorModalProps> = ({
  isOpen,
  onClose,
  policy,
  metrics,
  recentEvent,
  history = [],
  onTriggerAdaptation,
}) => {
  const [activeTab, setActiveTab] = useState<'director' | 'metrics' | 'history'>('director');
  const [isSimulating, setIsSimulating] = useState(false);

  if (!isOpen) return null;

  const currentStrategy = policy?.strategy || 'KEEP_DISTANCE';
  const detectedPattern = policy?.patternDetected || 'BALANCED';
  const confidence = policy ? Math.round(policy.confidence * 100) : 75;

  const totalAttacks = metrics?.attacksAttempted || 0;
  const rangedAttacks = metrics?.rangedAttacks || 0;
  const meleeAttacks = metrics?.meleeAttacks || 0;
  const rangedPercent = totalAttacks > 0 ? Math.round((rangedAttacks / totalAttacks) * 100) : 50;
  const meleePercent = totalAttacks > 0 ? Math.round((meleeAttacks / totalAttacks) * 100) : 50;

  const handleSimulate = (pattern: DetectedPlayerPattern) => {
    if (!onTriggerAdaptation) return;
    setIsSimulating(true);
    onTriggerAdaptation(pattern);
    setTimeout(() => {
      setIsSimulating(false);
    }, 1200);
  };

  const getStrategyBadgeColor = (strat: PredefinedTacticalStrategy) => {
    switch (strat) {
      case 'AGGRESSIVE_RUSH':
      case 'CLOSE_COMBAT':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'KEEP_DISTANCE':
      case 'RANGED_PRESSURE':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'EVADE_AND_COUNTER':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'DEFENSIVE':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'SPECIAL_ABILITY_FOCUS':
        return 'bg-rose-100 text-rose-900 border-rose-300';
      default:
        return 'bg-neutral-100 text-neutral-800 border-neutral-300';
    }
  };

  return (
    <div 
      id="tactical-inspector-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-xs pointer-events-auto"
    >
      <div 
        id="tactical-inspector-dialog"
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-[#FAF8F5] border border-[#D5CFC2] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E4D8] bg-[#F4EFE6]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-700">
              <Brain className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#14532D]">Adaptive Gemini Combat Director</h2>
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                  60 FPS FSM Active
                </span>
              </div>
              <p className="text-xs text-[#55685C]">
                Real-time player pattern detection & high-level AI counter-adaptation
              </p>
            </div>
          </div>
          <button
            id="close-tactical-inspector"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-[#EAE5DA] text-[#6B7C70] hover:text-[#18251E] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-[#E8E4D8] bg-[#F7F4EC] px-5 text-xs font-semibold text-[#55685C]">
          <button
            onClick={() => setActiveTab('director')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'director'
                ? 'border-amber-600 text-amber-900 font-bold'
                : 'border-transparent hover:text-[#18251E]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Active Strategy
          </button>
          <button
            onClick={() => setActiveTab('metrics')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'metrics'
                ? 'border-amber-600 text-amber-900 font-bold'
                : 'border-transparent hover:text-[#18251E]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Combat Observation ({metrics?.windowDurationSeconds || 20}s Window)
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-amber-600 text-amber-900 font-bold'
                : 'border-transparent hover:text-[#18251E]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Adaptation Log ({history.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 max-h-[calc(90vh-140px)] text-[#18251E]">
          {activeTab === 'director' && (
            <div className="space-y-4">
              {/* Primary Adaptation Banner */}
              <div className="p-4 rounded-xl bg-white border border-[#E0DCD1] shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-semibold text-[#6B7C70] uppercase tracking-wider block">
                      Player Combat Pattern Observed
                    </span>
                    <span className="text-lg font-black text-[#14532D] tracking-tight">
                      {detectedPattern.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-semibold text-[#6B7C70] uppercase tracking-wider block">
                      Director Confidence
                    </span>
                    <span className="text-sm font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                      {confidence}%
                    </span>
                  </div>
                </div>

                <div className="h-px bg-[#EAE5DA]" />

                {/* Counter Strategy */}
                <div>
                  <span className="text-[11px] font-semibold text-[#6B7C70] uppercase tracking-wider block mb-1">
                    Enemy AI Tactical Counter
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider border ${getStrategyBadgeColor(currentStrategy)}`}>
                      {currentStrategy.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs font-semibold text-[#14532D]">
                      {policy?.counterLabel || 'Adaptive Pressure'}
                    </span>
                  </div>
                </div>

                {/* Director Reasoning */}
                <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#EAE5DA] text-xs text-[#44564B] leading-relaxed">
                  <span className="font-bold text-[#14532D] block mb-0.5">🧠 AI Rationale:</span>
                  {policy?.reason || 'Monitoring player engagement distance, projectile distribution, and dash frequency to determine counter-strategy.'}
                </div>
              </div>

              {/* Concrete FSM Execution Parameters */}
              <div className="p-4 rounded-xl bg-white border border-[#E0DCD1] shadow-xs space-y-3">
                <h3 className="text-xs font-bold text-[#14532D] uppercase tracking-wider flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-emerald-700" />
                  Deterministic 60 FPS Parameters Injected
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-2.5 rounded-lg bg-[#F7F4EC] border border-[#EAE5DA] text-center">
                    <span className="text-[10px] text-[#6B7C70] block">Target Range</span>
                    <span className="text-sm font-bold text-[#18251E] font-mono">
                      {policy?.preferredRange ?? 3.5}m
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#F7F4EC] border border-[#EAE5DA] text-center">
                    <span className="text-[10px] text-[#6B7C70] block">Aggression</span>
                    <span className="text-sm font-bold text-[#18251E] font-mono">
                      {Math.round((policy?.aggression ?? 0.7) * 100)}%
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#F7F4EC] border border-[#EAE5DA] text-center">
                    <span className="text-[10px] text-[#6B7C70] block">Attack Cadence</span>
                    <span className="text-sm font-bold text-[#18251E] font-mono">
                      {policy?.attackCadenceMultiplier ?? 1.0}x
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#F7F4EC] border border-[#EAE5DA] text-center">
                    <span className="text-[10px] text-[#6B7C70] block">Dash/Dodge</span>
                    <span className="text-sm font-bold text-[#18251E] font-mono">
                      {Math.round((policy?.dodgeDashProbability ?? 0.3) * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Demo Moment Controls */}
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-600" />
                    Demo Moment — Test Tactical Reactions
                  </h3>
                  <span className="text-[10px] text-amber-800 font-medium">Instant Evaluation</span>
                </div>
                <p className="text-xs text-amber-900/80">
                  Simulate different player habits to observe how the AI Director changes the opponent robot's physical strategy:
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    id="demo-ranged-shift"
                    onClick={() => handleSimulate('RANGED_HEAVY')}
                    disabled={isSimulating}
                    className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 hover:bg-amber-100/50 text-xs font-bold text-amber-900 shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Crosshair className="w-3.5 h-3.5 text-blue-600" />
                    Simulate Ranged Player → Enemy Rush
                  </button>
                  <button
                    id="demo-melee-shift"
                    onClick={() => handleSimulate('MELEE_HEAVY')}
                    disabled={isSimulating}
                    className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 hover:bg-amber-100/50 text-xs font-bold text-amber-900 shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Flame className="w-3.5 h-3.5 text-amber-600" />
                    Simulate Melee Player → Enemy Evade
                  </button>
                  <button
                    id="demo-dash-shift"
                    onClick={() => handleSimulate('REPEATED_DASH')}
                    disabled={isSimulating}
                    className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 hover:bg-amber-100/50 text-xs font-bold text-amber-900 shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-purple-600" />
                    Simulate Dash Player → Ranged Pressure
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'metrics' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white border border-[#E0DCD1] shadow-xs space-y-4">
                <h3 className="text-xs font-bold text-[#14532D] uppercase tracking-wider">
                  Rolling Observation Telemetry ({metrics?.windowDurationSeconds || 20}s Window)
                </h3>

                {/* Attack Ratio Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#55685C]">Attack Distribution:</span>
                    <span className="font-mono font-bold text-[#18251E]">
                      {rangedAttacks} Ranged ({rangedPercent}%) vs {meleeAttacks} Melee ({meleePercent}%)
                    </span>
                  </div>
                  <div className="h-3 w-full bg-[#EAE5DA] rounded-full overflow-hidden flex border border-[#D5CFC2]">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${rangedPercent}%` }}
                      title={`Ranged: ${rangedPercent}%`}
                    />
                    <div 
                      className="h-full bg-amber-500 transition-all duration-300"
                      style={{ width: `${meleePercent}%` }}
                      title={`Melee: ${meleePercent}%`}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-[#6B7C70]">
                    <span>🔵 Ranged Projectiles</span>
                    <span>🟠 Melee / Close Claws</span>
                  </div>
                </div>

                {/* Telemetry Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#EAE5DA]">
                    <span className="text-[10px] text-[#6B7C70] block">Attacks Attempted</span>
                    <span className="text-base font-bold text-[#14532D] font-mono">
                      {totalAttacks}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#EAE5DA]">
                    <span className="text-[10px] text-[#6B7C70] block">Attacks Landed</span>
                    <span className="text-base font-bold text-[#14532D] font-mono">
                      {metrics?.attacksLanded || 0}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#EAE5DA]">
                    <span className="text-[10px] text-[#6B7C70] block">Avg Combat Range</span>
                    <span className="text-base font-bold text-[#14532D] font-mono">
                      {metrics?.preferredCombatRange || 0}m
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#EAE5DA]">
                    <span className="text-[10px] text-[#6B7C70] block">Dashes Executed</span>
                    <span className="text-base font-bold text-[#14532D] font-mono">
                      {metrics?.dashFrequency || 0}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#EAE5DA]">
                    <span className="text-[10px] text-[#6B7C70] block">Aggression Index</span>
                    <span className="text-base font-bold text-[#14532D] font-mono">
                      {Math.round((metrics?.aggressionLevel || 0.5) * 100)}%
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#EAE5DA]">
                    <span className="text-[10px] text-[#6B7C70] block">Damage Received</span>
                    <span className="text-base font-bold text-rose-700 font-mono">
                      {metrics?.damageReceived || 0}
                    </span>
                  </div>
                </div>

                {/* Repeated movement patterns */}
                {metrics?.repeatedMovementPatterns && metrics.repeatedMovementPatterns.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[11px] font-semibold text-[#6B7C70] block mb-1">
                      Detected Movement Habits:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {metrics.repeatedMovementPatterns.map((pat, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-[#F2EFE8] border border-[#DFD9CD] text-[10px] font-mono font-bold text-[#14532D]">
                          {pat.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              {history.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#6B7C70] bg-white rounded-xl border border-[#E0DCD1]">
                  No adaptations logged yet. Fight in the arena to trigger real-time AI adaptations!
                </div>
              ) : (
                history.map((ev) => (
                  <div key={ev.id} className="p-3.5 rounded-xl bg-white border border-[#E0DCD1] space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#14532D]">
                          {ev.patternDetected.replace(/_/g, ' ')}
                        </span>
                        <ArrowRight className="w-3 h-3 text-[#94A3B8]" />
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getStrategyBadgeColor(ev.newStrategy)}`}>
                          {ev.newStrategy.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#6B7C70] font-mono">
                        Confidence: {ev.confidence}%
                      </span>
                    </div>
                    <p className="text-xs text-[#44564B]">
                      {ev.reason}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#E8E4D8] bg-[#F4EFE6] text-xs text-[#55685C]">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Asynchronous Gemini Tactical Loop • Safe 60 FPS</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#14532D] hover:bg-[#0E3E20] text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Resume Battle
          </button>
        </div>
      </div>
    </div>
  );
};
