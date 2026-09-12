import React, { useState } from 'react';
import {
  MapPin,
  Zap,
  Trophy,
  Sparkles,
  Star,
  RotateCcw,
  Camera,
  Anvil,
  AlertTriangle,
  Footprints,
  Sliders,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useExplorationSession } from '../../hooks/useExplorationSession';
import { ExplorationMap } from './ExplorationMap';
import {
  EXPLORATION_MILESTONES,
  MIN_STATIONARY_DURATION,
} from '../../constants/explorationConfig';
import { formatExplorationDistance } from '../../utils/geoUtils';
import { ExplorationDiscoveryContext } from '../../types/exploration';
import { ExplorationUpgradesModal } from './ExplorationUpgradesModal';

interface ExplorationScreenProps {
  onOpenScanPipeline: (context: ExplorationDiscoveryContext) => void;
  onBackToLobby?: () => void;
  onNavigateToForge?: () => void;
}

const ADVENTURE_SUGGESTIONS = [
  'Afternoon Park Walk',
  'School Commute',
  'Weekend Hike',
  'Robot Hunt',
];

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
  } = useExplorationSession();

  const [adventureInput, setAdventureInput] = useState('Afternoon Park Walk');
  const [showDemoTools, setShowDemoTools] = useState(false);
  const [showUpgradesModal, setShowUpgradesModal] = useState(false);

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
    adventureName = 'Robot Hunt',
    explorationPoints = 0,
    sessionPointsEarned = 0,
  } = session;

  const handleStart = (isSim: boolean = false) => {
    const finalName = adventureInput.trim() || 'My Adventure';
    if (isSim) {
      startDevSimulatedExpedition(finalName);
    } else {
      startExpedition(finalName);
    }
  };

  const handleScanClick = () => {
    const context = getDiscoveryContext();
    if (context) {
      openScanMode();
      onOpenScanPipeline(context);
    }
  };

  // 5 simple milestone targets for child-friendly progress
  const simpleMilestones = EXPLORATION_MILESTONES.slice(0, 5);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 select-none pb-12 px-2 sm:px-4">
      {/* 1. Header Banner */}
      <div className="rounded-2xl bg-[#091B14] border border-[#144433] p-4 sm:p-5 shadow-lg relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-widest text-[#2BE29E]">
                EXPLORE
              </span>
              {origin && (
                <>
                  <span className="text-[#1A5C43]">•</span>
                  <span className="text-xs font-bold text-emerald-200 bg-[#0E2F23] px-2.5 py-0.5 rounded-full border border-[#18533C]">
                    🧭 {adventureName}
                  </span>
                </>
              )}
              {isSimulated && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-500/40">
                  Simulated
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide mt-0.5">
              GO FARTHER. EARN MORE EP.
            </h1>
            <p className="text-xs text-[#6DAA8E] mt-0.5">
              Walk in the real world to earn EP points and power up your robot in The Forge!
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onNavigateToForge && (
              <button
                onClick={onNavigateToForge}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-amber-950 font-black text-xs uppercase tracking-wide flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                title="Spend your EP in The Forge"
              >
                <Anvil className="w-4 h-4 text-amber-950" />
                <span>The Forge ({explorationPoints} EP)</span>
              </button>
            )}

            {origin && (
              <button
                onClick={startNewExpedition}
                className="px-3 py-2 rounded-xl bg-[#0E2F23] hover:bg-[#144433] text-emerald-200 border border-[#1E5F46] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Start a new adventure"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>New Adventure</span>
              </button>
            )}

            <button
              onClick={() => setShowDemoTools(!showDemoTools)}
              className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                showDemoTools
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-[#0E2F23] text-emerald-400 border-[#1E5F46] hover:text-white'
              }`}
              title="Toggle Dev Step Simulator"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Name Your Adventure (shown if adventure has not yet started) */}
        {!origin && (
          <div className="mt-4 pt-4 border-t border-[#144433] space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-300">
              NAME YOUR ADVENTURE
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <input
                type="text"
                value={adventureInput}
                onChange={(e) => setAdventureInput(e.target.value)}
                placeholder="Name your adventure..."
                maxLength={30}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#071610] border border-[#1A5C43] text-white font-bold text-sm focus:outline-none focus:border-[#2BE29E] transition-colors placeholder:text-stone-500"
              />
              <button
                onClick={() => handleStart(false)}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#2BE29E] to-[#1AB87E] hover:from-[#35EEA9] hover:to-[#22CA8C] text-[#072418] font-black text-sm uppercase tracking-wide shadow-lg shadow-emerald-950/50 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>START ADVENTURE</span>
                <ChevronRight className="w-4 h-4 text-[#072418]" />
              </button>
            </div>
            {/* Quick Name Suggestions */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-[#5A8E77] text-[11px]">Quick picks:</span>
              {ADVENTURE_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setAdventureInput(suggestion)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    adventureInput === suggestion
                      ? 'bg-[#18533C] text-[#2BE29E] border border-[#2BE29E]'
                      : 'bg-[#0B241B] text-emerald-300/80 hover:text-emerald-200 border border-[#144433]'
                  }`}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. Three Primary Metrics (Part 6) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Metric 1: You've Gone */}
        <div className="p-4 rounded-2xl bg-[#091B14] border border-[#144433] shadow-md flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#0E2F23] border border-[#1B563F] flex items-center justify-center text-xl shrink-0">
            📍
          </div>
          <div>
            <div className="text-[11px] font-black uppercase tracking-wider text-[#6DAA8E]">
              YOU'VE GONE
            </div>
            <div className="font-mono font-black text-2xl sm:text-3xl text-white">
              {formatExplorationDistance(distanceExplored)}
            </div>
          </div>
        </div>

        {/* Metric 2: EP Earned */}
        <div className="p-4 rounded-2xl bg-[#091B14] border border-[#144433] shadow-md flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-xl text-amber-400 shrink-0">
            ⚡
          </div>
          <div>
            <div className="text-[11px] font-black uppercase tracking-wider text-[#6DAA8E]">
              EXPLORATION POINTS
            </div>
            <div className="font-mono font-black text-2xl sm:text-3xl text-amber-400">
              {explorationPoints} <span className="text-sm font-sans font-bold text-amber-300/80">EP</span>
            </div>
            {sessionPointsEarned > 0 && (
              <div className="text-[10px] font-bold text-[#2BE29E]">
                +{sessionPointsEarned} earned this walk!
              </div>
            )}
          </div>
        </div>

        {/* Metric 3: Next Reward */}
        <div className="p-4 rounded-2xl bg-[#091B14] border border-[#144433] shadow-md flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#0E2F23] border border-[#1B563F] flex items-center justify-center text-xl text-emerald-400 shrink-0">
            🏆
          </div>
          <div>
            <div className="text-[11px] font-black uppercase tracking-wider text-[#6DAA8E]">
              NEXT REWARD
            </div>
            <div className="font-mono font-black text-2xl sm:text-3xl text-[#2BE29E]">
              {nextMilestone ? formatExplorationDistance(nextMilestone.distanceMeters) : 'MAX REACHED'}
            </div>
            {nextMilestone && distanceExplored < nextMilestone.distanceMeters && (
              <div className="text-[10px] font-bold text-[#6DAA8E]">
                {Math.max(0, nextMilestone.distanceMeters - distanceExplored)}m to go!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Visual Star Milestone Bar (Part 7) */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-[#091B14] border border-[#144433] shadow-md space-y-2.5">
        <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
          <span className="flex items-center gap-1.5">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span>ADVENTURE MILESTONES</span>
          </span>
          <span className="text-[#6DAA8E] text-[11px]">Walk to reach the next star!</span>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {simpleMilestones.map((milestone) => {
            const isReached = distanceExplored >= milestone.distanceMeters;
            return (
              <div
                key={milestone.distanceMeters}
                className={`py-2 px-1 rounded-xl border text-center transition-all ${
                  isReached
                    ? 'bg-[#124230] border-[#2BE29E] text-white shadow-sm'
                    : 'bg-[#071610] border-[#143B2C] text-[#4F7E68]'
                }`}
              >
                <div className="flex items-center justify-center mb-0.5">
                  <Star
                    className={`w-4 h-4 ${
                      isReached ? 'text-amber-400 fill-amber-400 animate-bounce-gentle' : 'text-[#2E5E4A]'
                    }`}
                  />
                </div>
                <div className="font-mono font-black text-xs">
                  {formatExplorationDistance(milestone.distanceMeters)}
                </div>
                <div
                  className={`text-[10px] font-bold mt-0.5 ${
                    isReached ? 'text-amber-300' : 'text-[#4F7E68]'
                  }`}
                >
                  +{milestone.explorationPointsReward} EP
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Reward Toast */}
      {recentReward && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-amber-950 font-bold text-xs flex items-center justify-between shadow-lg border-2 border-amber-500">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-900 text-amber-200 flex items-center justify-center font-black text-base shadow-sm shrink-0">
              ⚡
            </div>
            <div>
              <div className="font-black text-sm tracking-wide">
                +{recentReward.epAmount} EP EARNED!
              </div>
              <div className="text-[11px] text-amber-900/90 font-semibold mt-0.5">
                {recentReward.milestoneReached
                  ? `Reached Milestone: ${recentReward.milestoneTitle || 'Discovery Star'}`
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
                Forge
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

      {/* 5. Permission / GPS Alert */}
      {(permissionError || gpsStatus === 'GPS DENIED') && (
        <div className="p-4 rounded-2xl bg-[#2A1608] border border-amber-600/60 text-amber-200 space-y-2.5">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-black text-sm text-white">LOCATION ACCESS NEEDED</h3>
              <p className="text-xs text-amber-300/90 mt-0.5">
                Turn on location to explore outdoors and earn EP points as you walk.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => handleStart(false)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase cursor-pointer"
            >
              Try Again
            </button>
            <button
              onClick={() => handleStart(true)}
              className="px-4 py-2 rounded-xl bg-[#144433] hover:bg-[#1A5C43] text-emerald-200 text-xs font-bold cursor-pointer"
            >
              Use Simulator
            </button>
          </div>
        </div>
      )}

      {/* 6. DEV ONLY SIMULATION DRAWER (Kept tidy and compact) */}
      {showDemoTools && (
        <div className="p-3.5 rounded-2xl bg-[#091B14] border border-amber-500/40 text-amber-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span className="font-black text-xs uppercase tracking-wider text-amber-300">
                DEV STEP SIMULATOR
              </span>
            </div>
            <span className="text-[11px] text-[#6DAA8E]">For testing indoors</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs font-bold">
            {!origin && (
              <button
                onClick={() => handleStart(true)}
                className="py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white col-span-2 sm:col-span-1 cursor-pointer"
              >
                Set Start Point
              </button>
            )}
            <button
              onClick={() => simulateWalkStep(50)}
              className="py-2 px-2.5 rounded-xl bg-[#0E2F23] hover:bg-[#144433] text-emerald-200 border border-[#1E5F46] flex items-center justify-center gap-1 cursor-pointer"
            >
              <Footprints className="w-3.5 h-3.5" />
              <span>+50m</span>
            </button>
            <button
              onClick={() => simulateWalkStep(150)}
              className="py-2 px-2.5 rounded-xl bg-[#0E2F23] hover:bg-[#144433] text-emerald-200 border border-[#1E5F46] flex items-center justify-center gap-1 cursor-pointer"
            >
              <Footprints className="w-3.5 h-3.5" />
              <span>+150m</span>
            </button>
            <button
              onClick={() => simulateWalkStep(250)}
              className="py-2 px-2.5 rounded-xl bg-[#0E2F23] hover:bg-[#144433] text-emerald-200 border border-[#1E5F46] flex items-center justify-center gap-1 cursor-pointer"
            >
              <Footprints className="w-3.5 h-3.5" />
              <span>+250m</span>
            </button>
            <button
              onClick={() => simulateWalkStep(500)}
              className="py-2 px-2.5 rounded-xl bg-[#0E2F23] hover:bg-[#144433] text-emerald-200 border border-[#1E5F46] flex items-center justify-center gap-1 cursor-pointer"
            >
              <Footprints className="w-3.5 h-3.5" />
              <span>+500m</span>
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

      {/* 7. The Map: HERO of the Screen */}
      <div className="w-full h-[380px] sm:h-[460px] relative rounded-2xl overflow-hidden border border-[#18533C] shadow-2xl">
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
          onBackToLobby={onBackToLobby}
        />
      </div>

      {/* 8. Scan Object CTA & Action State */}
      <div className="rounded-2xl bg-[#091B14] border border-[#144433] p-4 shadow-md space-y-3">
        {!origin ? (
          <div className="flex items-center justify-between gap-3 text-xs text-emerald-300">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#2BE29E]" />
              <span>Name your adventure above and tap <strong>START ADVENTURE</strong> to explore.</span>
            </div>
          </div>
        ) : state === 'WAITING_FOR_STATIONARY' || (!isStationary && activeMilestone) ? (
          <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🛑</span>
              <div>
                <div className="font-black text-sm text-white">
                  STOP WALKING TO SCAN
                </div>
                <div className="text-xs text-amber-300/90">
                  Find a safe spot on the sidewalk and stand still for a few seconds.
                </div>
              </div>
            </div>
            <div className="text-xs font-mono font-bold text-amber-400 bg-amber-950/60 px-3 py-1.5 rounded-lg border border-amber-500/30">
              Standing still: {(stationaryDuration ?? 0).toFixed(0)}s / {MIN_STATIONARY_DURATION}s
            </div>
          </div>
        ) : activeMilestone || distanceExplored >= 50 ? (
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
          <div className="flex items-center justify-between text-xs text-emerald-300">
            <div className="flex items-center gap-2">
              <Footprints className="w-4 h-4 text-[#2BE29E]" />
              <span>Walk at least 50m outdoors to unlock your first object scan opportunity!</span>
            </div>
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
    </div>
  );
};
