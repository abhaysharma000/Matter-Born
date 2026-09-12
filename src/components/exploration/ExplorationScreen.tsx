import React, { useState } from 'react';
import {
  Compass,
  MapPin,
  Camera,
  Navigation,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Footprints,
  Info,
  ChevronRight,
  Sliders,
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

interface ExplorationScreenProps {
  onOpenScanPipeline: (context: ExplorationDiscoveryContext) => void;
  onBackToLobby?: () => void;
}

export const ExplorationScreen: React.FC<ExplorationScreenProps> = ({
  onOpenScanPipeline,
  onBackToLobby,
}) => {
  const {
    session,
    discoveryZones,
    permissionError,
    startExpedition,
    startDevSimulatedExpedition,
    startNewExpedition,
    openScanMode,
    simulateWalkStep,
    simulateStopWalking,
    getDiscoveryContext,
  } = useExplorationSession();

  const [showDemoTools, setShowDemoTools] = useState(false);

  const {
    state,
    origin,
    currentLocation,
    distanceExplored,
    speedMps,
    isStationary,
    stationaryDuration,
    gpsStatus,
    gpsStatusMessage,
    activeMilestone,
    nextMilestone,
    breadcrumbs,
    isSimulated,
  } = session;

  // Calculate percentage to next milestone
  const prevDistanceTarget = activeMilestone ? activeMilestone.distanceMeters : 0;
  const nextDistanceTarget = nextMilestone ? nextMilestone.distanceMeters : 2000;
  const targetSpan = Math.max(1, nextDistanceTarget - prevDistanceTarget);
  const currentProgressMeters = Math.max(0, distanceExplored - prevDistanceTarget);
  const progressPercent = Math.min(
    100,
    Math.round((currentProgressMeters / targetSpan) * 100)
  );

  const handleScanClick = () => {
    const context = getDiscoveryContext();
    if (context) {
      openScanMode();
      onOpenScanPipeline(context);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 select-none pb-8">
      {/* Top Exploration Header & Progress Card */}
      <div className="rounded-2xl bg-[#F4F9F4] border border-[#CFE2D3] p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DFEFE2] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
              <Compass className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">
                  MATTER BORN
                </span>
                <span className="text-stone-300">•</span>
                <h1 className="font-heading font-black text-lg tracking-wide text-[#143823]">
                  EXPLORATION
                </h1>
                {isSimulated && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-200 text-amber-950 border border-amber-400">
                    DEV SIMULATOR
                  </span>
                )}
              </div>
              <p className="text-xs text-[#4D6957]">
                Physically explore the real world to unlock higher-tier object transmutation discoveries.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* GPS Status Indicator Badge */}
            <div
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${
                gpsStatus === 'GPS READY'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : gpsStatus === 'GPS SEARCHING'
                  ? 'bg-sky-100 text-sky-800 border-sky-300 animate-pulse'
                  : gpsStatus === 'GPS WEAK'
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-red-100 text-red-800 border-red-300'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  gpsStatus === 'GPS READY'
                    ? 'bg-emerald-500'
                    : gpsStatus === 'GPS SEARCHING'
                    ? 'bg-sky-500'
                    : gpsStatus === 'GPS WEAK'
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                }`}
              />
              <span>{gpsStatus}</span>
            </div>

            <button
              onClick={() => setShowDemoTools(!showDemoTools)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                showDemoTools
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-[#E4EFE6] text-[#4D6957] border-[#BCD8C3] hover:text-[#143823]'
              }`}
              title="Toggle evaluation & testing tools"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Dev Simulator</span>
            </button>

            {origin && (
              <button
                onClick={startNewExpedition}
                className="px-3 py-1.5 rounded-xl bg-[#E4EFE6] hover:bg-[#DAEADB] text-[#4D6957] hover:text-[#143823] border border-[#BCD8C3] text-xs font-bold transition-all flex items-center gap-1.5"
                title="Reset expedition origin to current position"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>New Expedition</span>
              </button>
            )}

            {onBackToLobby && (
              <button
                onClick={onBackToLobby}
                className="px-3 py-1.5 rounded-xl bg-[#E4EFE6] hover:bg-[#DAEADB] text-[#4D6957] hover:text-[#143823] border border-[#BCD8C3] text-xs font-bold transition-all"
              >
                Arena
              </button>
            )}
          </div>
        </div>

        {/* Big Metrics Grid (Matching Master Prompt Specifications) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3.5">
          {/* Distance Explored */}
          <div className="p-3 rounded-xl bg-[#E8F2EA] border border-[#CFE2D3]">
            <span className="text-[11px] font-semibold text-[#4D6957] uppercase tracking-wider">
              Distance Explored
            </span>
            <div className="font-mono font-black text-2xl text-[#143823] mt-0.5">
              {formatExplorationDistance(distanceExplored)}
            </div>
            <span className="text-[10px] text-[#4D6957] font-medium">
              Real-World Haversine
            </span>
          </div>

          {/* Next Discovery Milestone */}
          <div className="p-3 rounded-xl bg-[#E8F2EA] border border-[#CFE2D3]">
            <span className="text-[11px] font-semibold text-[#4D6957] uppercase tracking-wider">
              Next Discovery
            </span>
            <div className="font-mono font-black text-2xl text-emerald-800 mt-0.5 truncate">
              {nextMilestone ? formatExplorationDistance(nextMilestone.distanceMeters) : 'MAX REACHED'}
            </div>
            <span className="text-[10px] text-emerald-700 font-bold truncate block">
              {nextMilestone ? nextMilestone.title : 'All Milestones Unlocked'}
            </span>
          </div>

          {/* Device Movement Status */}
          <div className="p-3 rounded-xl bg-[#E8F2EA] border border-[#CFE2D3]">
            <span className="text-[11px] font-semibold text-[#4D6957] uppercase tracking-wider">
              Movement State
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isStationary
                    ? 'bg-emerald-500 ring-2 ring-emerald-300'
                    : 'bg-amber-500 animate-pulse'
                }`}
              />
              <span className="font-black text-sm text-[#143823]">
                {isStationary ? 'STATIONARY' : 'TRAVELING'}
              </span>
            </div>
            <span className="text-[10px] text-[#4D6957] font-medium">
              Speed: {speedMps.toFixed(1)} m/s
            </span>
          </div>

          {/* Active Discovery Opportunity Tier */}
          <div className="p-3 rounded-xl bg-[#E8F2EA] border border-[#CFE2D3]">
            <span className="text-[11px] font-semibold text-[#4D6957] uppercase tracking-wider">
              Discovery Opportunity
            </span>
            <div className="font-black text-sm text-emerald-900 mt-1 flex items-center gap-1 truncate">
              <span>{activeMilestone ? activeMilestone.badge : '🌱'}</span>
              <span className="truncate">{activeMilestone ? activeMilestone.tier : 'SCOUT'}</span>
            </div>
            <span className="text-[10px] text-[#4D6957] font-medium truncate block">
              {activeMilestone ? activeMilestone.bonusTitle : 'Physical move unlocks perks'}
            </span>
          </div>
        </div>

        {/* Milestone Progress Bar */}
        <div className="mt-3.5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-[#143823]">
            <span>Progress to Next Discovery Zone</span>
            <span className="font-mono text-emerald-800">{progressPercent}%</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-[#CFE2D3] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-green-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* DEV ONLY SIMULATION DRAWER (Clearly marked as development-only for evaluation) */}
      {showDemoTools && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-700" />
              <span className="font-black text-xs uppercase tracking-wider">
                DEV ONLY: Simulate GPS (For testing UI without outdoor walking)
              </span>
            </div>
            <span className="text-[11px] text-amber-800 font-medium">
              Production uses live device GPS only
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs font-bold">
            {!origin && (
              <button
                onClick={startDevSimulatedExpedition}
                className="py-2 px-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition-colors col-span-2 sm:col-span-1"
              >
                Set Test Origin
              </button>
            )}
            <button
              onClick={() => simulateWalkStep(50)}
              className="py-2 px-2.5 rounded-xl bg-amber-200 hover:bg-amber-300 text-amber-950 border border-amber-400 transition-colors flex items-center justify-center gap-1"
            >
              <Footprints className="w-3.5 h-3.5" />
              <span>Walk +50m</span>
            </button>
            <button
              onClick={() => simulateWalkStep(150)}
              className="py-2 px-2.5 rounded-xl bg-amber-200 hover:bg-amber-300 text-amber-950 border border-amber-400 transition-colors flex items-center justify-center gap-1"
            >
              <Footprints className="w-3.5 h-3.5" />
              <span>Walk +150m</span>
            </button>
            <button
              onClick={() => simulateWalkStep(250)}
              className="py-2 px-2.5 rounded-xl bg-amber-200 hover:bg-amber-300 text-amber-950 border border-amber-400 transition-colors flex items-center justify-center gap-1"
            >
              <Footprints className="w-3.5 h-3.5" />
              <span>Reach 250m</span>
            </button>
            <button
              onClick={() => simulateWalkStep(500)}
              className="py-2 px-2.5 rounded-xl bg-amber-200 hover:bg-amber-300 text-amber-950 border border-amber-400 transition-colors flex items-center justify-center gap-1"
            >
              <Footprints className="w-3.5 h-3.5" />
              <span>Reach 500m</span>
            </button>
            <button
              onClick={simulateStopWalking}
              className="py-2 px-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-600 transition-colors flex items-center justify-center gap-1 col-span-2 sm:col-span-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Stop Walking</span>
            </button>
          </div>
        </div>
      )}

      {/* Geolocation Denied Banner (Section 23) */}
      {(permissionError || gpsStatus === 'GPS DENIED') && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 shadow-sm space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-heading font-black text-sm uppercase text-amber-950">
                LOCATION ACCESS REQUIRED
              </h3>
              <p className="text-xs text-amber-900 leading-relaxed">
                Exploration Mode uses your device location to measure real-world exploration. Please enable location services in your browser settings to track outdoor movement.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 pt-1">
            <button
              onClick={startExpedition}
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              TRY AGAIN
            </button>
            {onBackToLobby && (
              <button
                onClick={onBackToLobby}
                className="px-4 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-bold transition-all cursor-pointer"
              >
                PLAY ARENA
              </button>
            )}
          </div>
        </div>
      )}

      {/* GPS Signal Unavailable Banner (Section 24) */}
      {gpsStatus === 'GPS UNAVAILABLE' && !permissionError && (
        <div className="p-4 rounded-2xl bg-stone-100 border border-stone-300 text-stone-900 shadow-sm space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-heading font-black text-sm uppercase text-stone-950">
                GPS SIGNAL UNAVAILABLE
              </h3>
              <p className="text-xs text-stone-700 leading-relaxed">
                Unable to acquire accurate GPS position outdoors. Exploration progress is paused until a clear satellite signal is detected.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 pt-1">
            <button
              onClick={startExpedition}
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              TRY AGAIN
            </button>
            {onBackToLobby && (
              <button
                onClick={onBackToLobby}
                className="px-4 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-bold transition-all cursor-pointer"
              >
                PLAY ARENA
              </button>
            )}
          </div>
        </div>
      )}

      {/* Weak Signal Warning */}
      {gpsStatus === 'GPS WEAK' && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
          <span>GPS signal is weak (accuracy ±{Math.round(currentLocation?.accuracy || 50)}m). Move to an open area outdoors for optimal tracking.</span>
        </div>
      )}

      {/* Main Interactive Live Map Component */}
      <div className="w-full h-[400px] sm:h-[480px] relative">
        <ExplorationMap
          origin={origin}
          currentLocation={currentLocation}
          discoveryZones={discoveryZones}
          distanceExplored={distanceExplored}
          breadcrumbs={breadcrumbs}
          onBackToLobby={onBackToLobby}
        />
      </div>

      {/* Action and Objective Card (Section 7, 14, 15, 16) */}
      <div className="rounded-2xl bg-[#F4F9F4] border border-[#CFE2D3] p-4 sm:p-5 shadow-xs space-y-3">
        {/* State Banner & Instruction */}
        {!origin ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#E8F2EA] border border-[#BCD8C3]">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-[#143823] flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-700" />
                <span>Ready to Begin Your Expedition</span>
              </span>
              <p className="text-[11px] text-[#4D6957]">
                Your starting location will become your Expedition Origin. Step outside to begin exploring.
              </p>
            </div>
            <button
              onClick={startExpedition}
              className="py-3 px-6 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <Navigation className="w-4 h-4" />
              <span>START EXPEDITION</span>
            </button>
          </div>
        ) : state === 'EXPLORING' || state === 'MILESTONE_APPROACHING' ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#E8F2EA] border border-[#BCD8C3]">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-[#143823] flex items-center gap-1.5">
                <Footprints className="w-4 h-4 text-emerald-700" />
                <span>Objective: Reach the next discovery zone.</span>
              </span>
              <p className="text-[11px] text-[#4D6957]">
                Walk safely outdoors away from your start point. Reach the next discovery zone to unlock an object scan.
              </p>
            </div>
            <div className="text-xs font-black text-emerald-800 px-3 py-1.5 rounded-lg bg-emerald-100 border border-emerald-300 shrink-0">
              {nextMilestone ? `${Math.max(0, nextMilestone.distanceMeters - distanceExplored)}m to Discovery` : 'Active'}
            </div>
          </div>
        ) : state === 'WAITING_FOR_STATIONARY' || (!isStationary && activeMilestone) ? (
          /* DISCOVERY UNLOCKED + WAITING FOR STATIONARY (Section 14 & 15) */
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">📍</span>
                <span className="font-heading font-black text-sm uppercase text-amber-950">
                  DISCOVERY UNLOCKED
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-950 text-[10px] font-black border border-amber-400">
                  STOP TO SCAN
                </span>
              </div>
              <span className="text-[11px] font-bold text-amber-900">
                STOP MOVING TO SCAN
              </span>
            </div>
            <p className="text-xs text-amber-900 leading-relaxed">
              <strong>CRITICAL SAFETY:</strong> Reach the destination first. Stop before scanning. Find a secure, stationary spot on the sidewalk away from streets and obstacles.
            </p>
            <div className="flex items-center justify-between text-xs font-semibold text-amber-800 pt-1 border-t border-amber-200">
              <div className="flex items-center gap-2">
                <span className="animate-spin text-amber-700">⏳</span>
                <span>Verifying device stationary state ({stationaryDuration.toFixed(1)}s / {MIN_STATIONARY_DURATION}s)...</span>
              </div>
              <button
                disabled
                className="py-2 px-4 rounded-xl bg-stone-300 text-stone-500 font-bold text-xs opacity-70 cursor-not-allowed flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>SCAN OBJECT</span>
              </button>
            </div>
          </div>
        ) : (
          /* SCAN READY (Section 15 & 17) */
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white shadow-lg space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-emerald-700/60 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-400 text-amber-950 flex items-center justify-center font-black text-sm">
                  {activeMilestone ? activeMilestone.badge : '⭐'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-black text-sm text-white">
                      DISCOVERY UNLOCKED
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-emerald-950 text-[10px] font-black uppercase tracking-wider">
                      SCAN READY
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-300">
                    {activeMilestone ? activeMilestone.title : 'Discovery Opportunity'} • {formatExplorationDistance(distanceExplored)} from Origin
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-400/40 uppercase hidden sm:inline-block">
                Stationary Verified
              </span>
            </div>

            <div className="text-xs text-emerald-100 bg-emerald-950/50 p-2.5 rounded-lg border border-emerald-700/40">
              <p className="font-bold text-amber-300">
                {activeMilestone ? activeMilestone.bonusTitle : 'Reconnaissance Perk'}
              </p>
              <p className="text-[11px] text-emerald-200/90 mt-0.5">
                {activeMilestone
                  ? activeMilestone.bonusDescription
                  : 'Stop, scan an ordinary object, and let Gemini transmute it into your battle mech.'}
              </p>
            </div>

            {/* HIGH-VISIBILITY SCAN OBJECT BUTTON */}
            <button
              onClick={handleScanClick}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 text-amber-950 font-black text-base shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Camera className="w-5 h-5 text-amber-950" />
              <span>SCAN OBJECT</span>
              <ChevronRight className="w-4 h-4 text-amber-950" />
            </button>
          </div>
        )}

        {/* Strict Safety Mandate (Section 16) */}
        <div className="flex items-center justify-between text-[11px] text-[#4D6957] pt-1 border-t border-[#DFEFE2]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>
              <strong>Safety Mandate:</strong> Reach the destination first. Stop before scanning. Scan only when stationary and in a safe place.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
