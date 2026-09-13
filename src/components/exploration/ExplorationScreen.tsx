import React, { useState } from 'react';
import {
  Zap,
  Trophy,
  Sparkles,
  RotateCcw,
  Camera,
  Anvil,
  AlertTriangle,
  Footprints,
  Sliders,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Radio,
  Compass,
  Play,
  Navigation,
  ListChecks,
} from 'lucide-react';
import { useExplorationSession } from '../../hooks/useExplorationSession';
import { ExplorationMap } from './ExplorationMap';
import { MIN_STATIONARY_DURATION } from '../../constants/explorationConfig';
import { formatExplorationDistance } from '../../utils/geoUtils';
import { ExplorationDiscoveryContext } from '../../types/exploration';
import { ExplorationUpgradesModal } from './ExplorationUpgradesModal';
import { ExplorationTasksModal } from './ExplorationTasksModal';
import { ActiveTaskBanner } from './ActiveTaskBanner';
import { sound } from '../../utils/audio';

interface ExplorationScreenProps {
  onOpenScanPipeline: (context: ExplorationDiscoveryContext) => void;
  onBackToLobby?: () => void;
  onNavigateToForge?: () => void;
}

export const ExplorationScreen: React.FC<ExplorationScreenProps> = ({
  onOpenScanPipeline,
  onBackToLobby,
  onNavigateToForge,
}) => {
  const {
    session,
    discoveryZones,
    permissionError,
    recentReward,
    clearRecentReward,
    startExpedition,
    startDevSimulatedExpedition,
    startNewExpedition,
    openScanMode,
    spendExplorationPoints,
    simulateWalkStep,
    simulateStopWalking,
    getDiscoveryContext,
    isInIframe,
    resetAllPointsToZero,
    nearbyPlayers,
  } = useExplorationSession();

  const [showDemoTools, setShowDemoTools] = useState(false);
  const [showUpgradesModal, setShowUpgradesModal] = useState(false);
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [startSuccessMsg, setStartSuccessMsg] = useState<string | null>(null);

  const {
    state,
    origin,
    currentLocation,
    distanceExplored,
    speedMps,
    isStationary,
    stationaryDuration,
    gpsStatus,
    activeMilestone,
    nextMilestone,
    breadcrumbs,
    isSimulated,
    explorationPoints = 0,
    sessionPointsEarned = 0,
  } = session;

  const handleStartExploration = async (forceSim: boolean = false) => {
    sound.playClick();
    setIsStarting(true);

    if (forceSim || isInIframe) {
      startDevSimulatedExpedition('Satellite Rover');
      sound.playBonus();
      setStartSuccessMsg('🛰️ Satellite Rover Exploration Active!');
      setTimeout(() => setStartSuccessMsg(null), 3500);
      setIsStarting(false);
      return;
    }

    if (!navigator.geolocation) {
      startDevSimulatedExpedition('Satellite Rover');
      sound.playBonus();
      setStartSuccessMsg('🛰️ Exploration Started (Virtual Rover Active)');
      setTimeout(() => setStartSuccessMsg(null), 3500);
      setIsStarting(false);
      return;
    }

    // Call startExpedition directly, which handles position reuse & robust high/standard accuracy fallback
    try {
      await startExpedition('Real-World Walk');
      sound.playBonus();
      setStartSuccessMsg('🧭 Live GPS Exploration Started!');
      setTimeout(() => setStartSuccessMsg(null), 3500);
    } catch (err) {
      console.warn('Expedition start error:', err);
    } finally {
      setIsStarting(false);
    }
  };

  const handleScanClick = () => {
    const context = getDiscoveryContext();
    if (context) {
      openScanMode();
      onOpenScanPipeline(context);
    }
  };

  // Calculate progress percent to next reward
  const progressPercent = nextMilestone
    ? Math.min(100, Math.max(0, (distanceExplored / nextMilestone.distanceMeters) * 100))
    : 100;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-3.5 select-none pb-12 px-2 sm:px-4">
      {/* 1. Header Bar: Clean, Minimal, Uncluttered */}
      <div className="rounded-2xl bg-[#091B14] border border-[#144433] p-3.5 sm:p-4 shadow-lg relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <h1 className="text-lg sm:text-xl font-black text-white tracking-wide">
            REAL-WORLD EXPLORATION
          </h1>
          {isSimulated && (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-500/40">
              Virtual Rover
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Main Working Explore Button in Header */}
          {!origin || state === 'IDLE' ? (
            <button
              onClick={() => handleStartExploration(false)}
              disabled={isStarting}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 hover:from-emerald-300 hover:to-teal-200 active:scale-95 text-emerald-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
              title="Start Exploration"
            >
              <Compass className="w-4 h-4 text-emerald-950" />
              <span>{isStarting ? 'STARTING...' : 'START EXPLORATION'}</span>
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <div className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[11px] sm:text-xs font-black flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>ACTIVE ({formatExplorationDistance(distanceExplored)})</span>
              </div>
              <button
                onClick={startNewExpedition}
                className="px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl bg-[#0E2F23] hover:bg-[#144433] text-emerald-200 border border-[#1E5F46] text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                title="Reset or stop current walk"
              >
                <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Reset</span>
              </button>
              <button
                onClick={resetAllPointsToZero}
                className="px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-500/40 text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                title="Reset EP points to 0"
              >
                <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Reset EP</span>
              </button>
            </div>
          )}

          <button
            onClick={() => setShowTasksModal(true)}
            className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-emerald-950 font-black text-[11px] sm:text-xs uppercase tracking-wide flex items-center gap-1 sm:gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
            title="Open Exploration Tasks Menu (Earn 100, 200, 300 EP)"
          >
            <ListChecks className="w-3.5 h-3.5" />
            <span>Tasks</span>
          </button>

          {onNavigateToForge && (
            <button
              onClick={onNavigateToForge}
              className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-amber-950 font-black text-[11px] sm:text-xs uppercase tracking-wide flex items-center gap-1 sm:gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
              title="Spend your EP in The Forge"
            >
              <Anvil className="w-3.5 h-3.5 text-amber-950" />
              <span>Forge ({explorationPoints} EP)</span>
            </button>
          )}

          <button
            onClick={() => setShowDemoTools(!showDemoTools)}
            className={`p-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              showDemoTools
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-[#0E2F23] text-emerald-400 border-[#1E5F46] hover:text-white'
            }`}
            title="Toggle Indoor Step Simulator"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Success Notification Toast */}
      {startSuccessMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/90 border-2 border-emerald-400 text-emerald-100 text-sm font-black flex items-center justify-between gap-3 shadow-lg shadow-emerald-950/50 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{startSuccessMsg}</span>
          </div>
          <button
            onClick={() => setStartSuccessMsg(null)}
            className="p-1 rounded-lg text-emerald-300 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Prominent Explore Launchpad Banner (When not yet started or idle) */}
      {(!origin || state === 'IDLE') && (
        <div className="rounded-2xl bg-gradient-to-br from-[#0B241B] via-[#0D2C20] to-[#071912] border-2 border-emerald-500/50 p-5 sm:p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-5">
            <div className="space-y-2 text-center md:text-left max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black uppercase tracking-wider">
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                <span>Live GPS & Radar Exploration</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                Start Your Exploration Journey
              </h2>
              <p className="text-xs sm:text-sm text-[#A1D2BC] leading-relaxed">
                Step into corridors, venues, or outdoor pathways. Your physical movement generates Energy Points (EP) for The Forge and unlocks dynamic 3D battle robot transmutations from real-world objects around you.
              </p>
              <div className="flex items-center gap-4 pt-1 text-xs text-emerald-300/80 justify-center md:justify-start flex-wrap">
                <span className="flex items-center gap-1">📍 Real-World Waypoints</span>
                <span className="flex items-center gap-1">⚡ 100 EP every 10m</span>
                <span className="flex items-center gap-1">🤖 Scan Artifacts at 10m+</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 w-full md:w-auto shrink-0">
              <button
                onClick={() => handleStartExploration(false)}
                disabled={isStarting}
                className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 hover:from-emerald-300 hover:to-teal-200 active:scale-95 text-emerald-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-500/30 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{isStarting ? 'STARTING...' : 'START EXPLORATION'}</span>
              </button>

              <button
                onClick={() => handleStartExploration(true)}
                disabled={isStarting}
                className="px-5 py-2.5 rounded-xl bg-[#091D15] hover:bg-[#113326] text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <Radio className="w-3.5 h-3.5 text-amber-400" />
                <span>Start Virtual Rover (Indoor / Preview)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. The 3 Essential Metrics: EP We Have, EP Collecting, Next Reward */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Metric 1: EP WE HAVE */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#091B14] border border-[#144433] shadow-md flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-xl text-amber-400 shrink-0 shadow-inner">
            <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-black uppercase tracking-wider text-[#6DAA8E]">
                EP WE HAVE
              </div>
              <button
                onClick={resetAllPointsToZero}
                className="text-[10px] font-bold text-amber-400 hover:text-amber-200 underline cursor-pointer"
                title="Reset EP to 0"
              >
                Reset to 0
              </button>
            </div>
            <div className="font-mono font-black text-2xl sm:text-3xl text-amber-400 truncate">
              {explorationPoints} <span className="text-sm font-sans font-bold text-amber-300/80">EP</span>
            </div>
            <div className="text-[10px] font-bold text-[#6DAA8E] truncate">
              Total available in Forge
            </div>
          </div>
        </div>

        {/* Metric 2: EP WE ARE COLLECTING */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#091B14] border border-[#144433] shadow-md flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-xl text-[#2BE29E] shrink-0 shadow-inner">
            <Sparkles className="w-5 h-5 text-[#2BE29E]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-black uppercase tracking-wider text-[#6DAA8E]">
              EP COLLECTING
            </div>
            <div className="font-mono font-black text-2xl sm:text-3xl text-[#2BE29E] truncate">
              +{sessionPointsEarned} <span className="text-sm font-sans font-bold text-emerald-300/80">EP</span>
            </div>
            <div className="text-[10px] font-bold text-emerald-300/80 truncate">
              {formatExplorationDistance(distanceExplored)} walked this session
            </div>
          </div>
        </div>

        {/* Metric 3: NEXT REWARD */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#091B14] border border-[#144433] shadow-md flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#0E2F23] border border-[#1B563F] flex items-center justify-center text-xl text-amber-400 shrink-0 shadow-inner">
            <Trophy className="w-5 h-5 text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-black uppercase tracking-wider text-[#6DAA8E]">
              NEXT REWARD
            </div>
            <div className="font-mono font-black text-2xl sm:text-3xl text-white truncate">
              {nextMilestone ? formatExplorationDistance(nextMilestone.distanceMeters) : 'MAX TIER'}
            </div>
            <div className="text-[10px] font-bold text-emerald-400 truncate">
              {nextMilestone
                ? `${Math.max(0, nextMilestone.distanceMeters - distanceExplored)}m to go (+${nextMilestone.explorationPointsReward} EP)`
                : 'All rewards unlocked!'}
            </div>
            {/* Progress bar */}
            {nextMilestone && (
              <div className="w-full h-1.5 bg-[#071610] rounded-full mt-1.5 overflow-hidden border border-[#144433]">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-[#2BE29E] rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Reward Toast Notification */}
      {recentReward && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-amber-950 font-bold text-xs flex items-center justify-between shadow-lg border-2 border-amber-500 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-900 text-amber-200 flex items-center justify-center font-black text-base shadow-sm shrink-0">
              ⚡
            </div>
            <div>
              <div className="font-black text-sm tracking-wide">
                +{recentReward.epAmount} EP COLLECTED!
              </div>
              <div className="text-[11px] text-amber-900/90 font-semibold mt-0.5">
                {recentReward.milestoneReached
                  ? `Reached Milestone: ${recentReward.milestoneTitle || 'Discovery Milestone'}`
                  : `Walked ${recentReward.distanceMeters}m from start`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onNavigateToForge && (
              <button
                onClick={onNavigateToForge}
                className="px-3 py-1.5 rounded-xl bg-amber-950 hover:bg-amber-900 text-amber-100 font-black text-xs uppercase transition-all shadow-xs cursor-pointer active:scale-95"
              >
                Spend in Forge
              </button>
            )}
            <button
              onClick={clearRecentReward}
              className="p-1.5 rounded-lg text-amber-950 hover:bg-amber-400/80 font-bold text-sm cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 4. Location Access / Fallback (If GPS permission is denied or pending) */}
      {(permissionError || gpsStatus === 'GPS DENIED') && (
        <div className="p-4 sm:p-5 rounded-2xl bg-[#1D1007] border border-amber-600/70 text-amber-200 space-y-3 shadow-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-black text-sm text-white tracking-wide">
                  GPS PERMISSION NOTICE
                </h3>
                {isInIframe && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Embedded Browser Preview
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-200/90 leading-relaxed">
                {permissionError || 'Location permission was not granted or GPS signal is weak.'}
              </p>
              <div className="text-[11px] text-amber-300/80 bg-black/40 p-2.5 rounded-xl border border-amber-500/20">
                To allow device location: click the <span className="font-bold text-white">🔒 lock / site settings icon</span> on the left of your browser address bar (<span className="font-mono text-emerald-300">localhost:3000</span>), set <span className="font-bold text-white">Location</span> to <span className="font-bold text-emerald-300">Allow</span>, and click <span className="font-bold text-amber-200">Retry GPS</span> below.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 pt-1 flex-wrap">
            <button
              onClick={() => window.open(window.location.href, '_blank')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-black uppercase tracking-wide flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in Dedicated Tab for GPS</span>
            </button>
            <button
              onClick={() => handleStartExploration(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black uppercase tracking-wide flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Play Virtual Satellite Rover</span>
            </button>
            <button
              onClick={() => handleStartExploration(false)}
              className="px-3.5 py-2 rounded-xl bg-[#2A1608] hover:bg-[#381F0C] text-amber-300 text-xs font-bold border border-amber-600/40 transition-all cursor-pointer"
            >
              Retry GPS
            </button>
          </div>
        </div>
      )}

      {/* 5. Indoor Step Simulator Drawer (Toggleable for testing) */}
      {showDemoTools && (
        <div className="p-3.5 rounded-2xl bg-[#091B14] border border-amber-500/40 text-amber-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span className="font-black text-xs uppercase tracking-wider text-amber-300">
                INDOOR STEP SIMULATOR
              </span>
            </div>
            <span className="text-[11px] text-[#6DAA8E]">For testing indoors</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs font-bold">
            {!origin && (
              <button
                onClick={() => handleStartExploration(true)}
                className="py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white col-span-2 sm:col-span-1 cursor-pointer"
              >
                Set Start Point
              </button>
            )}
            <button
              onClick={() => simulateWalkStep(5)}
              className="py-2 px-2.5 rounded-xl bg-[#0E2F23] hover:bg-[#144433] text-emerald-200 border border-[#1E5F46] flex items-center justify-center gap-1 cursor-pointer"
            >
              <Footprints className="w-3.5 h-3.5" />
              <span>+5m</span>
            </button>
            <button
              onClick={() => simulateWalkStep(10)}
              className="py-2 px-2.5 rounded-xl bg-[#0E2F23] hover:bg-[#144433] text-emerald-200 border border-[#1E5F46] flex items-center justify-center gap-1 cursor-pointer"
            >
              <Footprints className="w-3.5 h-3.5" />
              <span>+10m</span>
            </button>
            <button
              onClick={() => simulateWalkStep(20)}
              className="py-2 px-2.5 rounded-xl bg-[#0E2F23] hover:bg-[#144433] text-emerald-200 border border-[#1E5F46] flex items-center justify-center gap-1 cursor-pointer"
            >
              <Footprints className="w-3.5 h-3.5" />
              <span>+20m</span>
            </button>
            <button
              onClick={() => simulateWalkStep(35)}
              className="py-2 px-2.5 rounded-xl bg-[#0E2F23] hover:bg-[#144433] text-emerald-200 border border-[#1E5F46] flex items-center justify-center gap-1 cursor-pointer"
            >
              <Footprints className="w-3.5 h-3.5" />
              <span>+35m</span>
            </button>
            <button
              onClick={simulateStopWalking}
              className="py-2 px-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-black flex items-center justify-center gap-1 col-span-2 sm:col-span-1 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Stop Walking</span>
            </button>
          </div>
        </div>
      )}

      {/* 5.5 Exploration Missions Active Task HUD Banner */}
      <ActiveTaskBanner
        onOpenTasksModal={() => setShowTasksModal(true)}
        currentDistanceExplored={distanceExplored}
      />

      {/* 6. The Map: Full Hero Experience */}
      <div className="w-full h-[480px] sm:h-[540px] md:h-[600px] relative rounded-2xl overflow-hidden border border-[#18533C] shadow-2xl">
        <ExplorationMap
          origin={origin}
          currentLocation={currentLocation}
          discoveryZones={discoveryZones}
          distanceExplored={distanceExplored}
          breadcrumbs={breadcrumbs}
          speedMps={speedMps}
          isStationary={isStationary}
          gpsStatus={gpsStatus}
          nextMilestoneTitle={nextMilestone?.title}
          nextMilestoneDistance={nextMilestone?.distanceMeters}
          nearbyPlayers={nearbyPlayers}
          onBackToLobby={onBackToLobby}
        />
      </div>

      {/* 7. Scan Object CTA & Action State (Unlocks as user walks) */}
      <div className="rounded-2xl bg-[#091B14] border border-[#144433] p-4 shadow-md space-y-3">
        {state === 'WAITING_FOR_STATIONARY' || (!isStationary && activeMilestone) ? (
          <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🛑</span>
              <div>
                <div className="font-black text-sm text-white">
                  STOP WALKING TO SCAN
                </div>
                <div className="text-xs text-amber-300/90">
                  Find a safe spot in the corridor and stand still for a moment.
                </div>
              </div>
            </div>
            <div className="text-xs font-mono font-bold text-amber-400 bg-amber-950/60 px-3 py-1.5 rounded-lg border border-amber-500/30">
              Standing still: {(stationaryDuration ?? 0).toFixed(0)}s / {MIN_STATIONARY_DURATION}s
            </div>
          </div>
        ) : activeMilestone || distanceExplored >= 10 ? (
          <div className="p-3.5 rounded-xl bg-[#0E2F23] border border-[#2BE29E]/40 text-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span className="font-black text-sm text-white">
                  DISCOVERY SCAN READY!
                </span>
              </div>
              <span className="text-xs text-emerald-300 font-bold">
                Safe to scan
              </span>
            </div>
            <p className="text-xs text-[#A1D2BC]">
              Point your camera at any real-world object to scan it into a battle robot!
            </p>
            <button
              onClick={handleScanClick}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 hover:from-amber-300 hover:to-amber-200 text-amber-950 font-black text-base shadow-xl active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Camera className="w-5 h-5 text-amber-950" />
              <span>SCAN OBJECT NOW</span>
              <ChevronRight className="w-5 h-5 text-amber-950" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-emerald-300">
            <div className="flex items-center gap-2">
              <Footprints className="w-4 h-4 text-[#2BE29E] shrink-0" />
              <span>
                {!origin
                  ? 'Start exploration to begin tracking movement and unlock object scans!'
                  : 'Walk at least 10m from start to unlock your first object scan opportunity!'}
              </span>
            </div>
            {!origin ? (
              <button
                onClick={() => handleStartExploration(false)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-emerald-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <Compass className="w-4 h-4" />
                <span>START EXPLORATION</span>
              </button>
            ) : (
              <button
                onClick={() => simulateWalkStep(10)}
                className="px-3 py-1.5 rounded-xl bg-[#0E2F23] hover:bg-[#144433] text-emerald-300 border border-[#1E5F46] text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Footprints className="w-3.5 h-3.5" />
                <span>Step Forward (+10m)</span>
              </button>
            )}
          </div>
        )}

        {/* Safety Footer */}
        <div className="flex items-center gap-2 text-[11px] text-[#5A8E77] pt-2 border-t border-[#144433]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#2BE29E] shrink-0" />
          <span>Always watch your surroundings while exploring. Walk first, stop safely before scanning.</span>
        </div>
      </div>

      {/* Upgrades Workshop Modal */}
      <ExplorationUpgradesModal
        isOpen={showUpgradesModal}
        onClose={() => setShowUpgradesModal(false)}
        explorationPoints={explorationPoints}
        onSpendPoints={spendExplorationPoints}
      />

      {/* Exploration Missions / Tasks Modal */}
      <ExplorationTasksModal
        isOpen={showTasksModal}
        onClose={() => setShowTasksModal(false)}
        currentDistanceExplored={distanceExplored}
      />
    </div>
  );
};
