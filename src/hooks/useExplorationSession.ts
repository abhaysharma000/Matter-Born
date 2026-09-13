import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ExplorationSession,
  ExplorationState,
  GeoLocationReading,
  ExplorationOrigin,
  DiscoveryZone,
  DiscoveryMilestoneConfig,
  GpsStatus,
  ExplorationDiscoveryContext,
} from '../types/exploration';
import { multiplayerManager } from '../utils/multiplayerManager';
import { PlayerPresence } from '../types/multiplayer';
import {
  EXPLORATION_MILESTONES,
  MIN_STATIONARY_DURATION,
  MIN_MOVEMENT_THRESHOLD,
  GPS_ACCURACY_THRESHOLD,
  LOCATION_UPDATE_INTERVAL,
  DISCOVERY_RADIUS,
  DEFAULT_DEMO_COORDINATES,
  EXPLORATION_STORAGE_KEY,
  LIFETIME_EP_STORAGE_KEY,
} from '../constants/explorationConfig';
import {
  calculateHaversineDistance,
  calculateDestinationPoint,
  validateGpsReading,
} from '../utils/geoUtils';
import {
  getScanPowerTierConfig,
  calculateExplorationRewardPoints,
} from '../utils/explorationPowerScaling';
import {
  getExplorationPoints,
  setExplorationPoints,
  recordExpeditionProgress,
  resetExplorationPoints,
} from '../utils/forgeManager';
import { sound } from '../utils/audio';

export interface EpRewardToast {
  id: string;
  epAmount: number;
  milestoneTitle?: string;
  milestoneReached?: boolean;
  distanceMeters: number;
}

export function useExplorationSession() {
  const [recentReward, setRecentReward] = useState<EpRewardToast | null>(null);
  const clearRecentReward = useCallback(() => setRecentReward(null), []);

  const [session, setSession] = useState<ExplorationSession>(() => {
    // Load lifetime EP
    let lifetimeEp = getExplorationPoints();

    try {
      const stored = localStorage.getItem(EXPLORATION_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Wipe corrupted teleport sessions or oversized EP (> 1,000,000)
        if (Number(parsed.distanceExplored) > 100000 || Number(parsed.explorationPoints) > 1000000) {
          localStorage.removeItem(EXPLORATION_STORAGE_KEY);
          lifetimeEp = 0;
        } else {
          const maxDist = parsed.maxDistanceReached ?? parsed.distanceExplored ?? 0;
          const currentDist = Number(parsed.distanceExplored) || 0;
          let activeMilestone: DiscoveryMilestoneConfig | null = null;
          let nextMilestone: DiscoveryMilestoneConfig | null = EXPLORATION_MILESTONES[0];
          for (let i = 0; i < EXPLORATION_MILESTONES.length; i++) {
            const m = EXPLORATION_MILESTONES[i];
            if (maxDist >= m.distanceMeters) {
              activeMilestone = m;
              nextMilestone = EXPLORATION_MILESTONES[i + 1] || null;
            } else {
              if (!nextMilestone || nextMilestone.distanceMeters <= maxDist) {
                nextMilestone = m;
              }
              break;
            }
          }

          const tierConfig = getScanPowerTierConfig(currentDist);
          const claimedMilestones = Array.isArray(parsed.claimedMilestones) ? parsed.claimedMilestones : [];
          const savedEp = Number(parsed.explorationPoints) || lifetimeEp;

          // Ensure all properties exist and are valid numbers
          return {
            id: parsed.id || `exp-${Date.now()}`,
            adventureName: parsed.adventureName || 'My Adventure',
            state: (parsed.state || 'IDLE') as ExplorationState,
            origin: parsed.origin || null,
            currentLocation: parsed.currentLocation || null,
            distanceExplored: currentDist,
            maxDistanceReached: Number(maxDist) || 0,
            speedMps: Number(parsed.speedMps) || 0,
            isStationary: false,
            stationaryDuration: 0,
            gpsStatus: 'GPS READY' as GpsStatus,
            gpsStatusMessage: undefined,
            activeMilestone: parsed.activeMilestone || activeMilestone,
            nextMilestone: parsed.nextMilestone !== undefined ? parsed.nextMilestone : nextMilestone,
            unlockedTiers: Array.isArray(parsed.unlockedTiers) ? parsed.unlockedTiers : [],
            activeDiscoveryZone: parsed.activeDiscoveryZone || null,
            breadcrumbs: Array.isArray(parsed.breadcrumbs) ? parsed.breadcrumbs : [],
            startedAt: Number(parsed.startedAt) || Date.now(),
            isSimulated: Boolean(parsed.isSimulated),
            explorationPoints: savedEp,
            sessionPointsEarned: Number(parsed.sessionPointsEarned) || 0,
            claimedMilestones,
            currentScanTier: tierConfig.tier,
            currentScanPowerMultiplier: tierConfig.powerMultiplier,
            currentScanPowerBonus: tierConfig.powerBonusPercent,
          };
        }
      }
    } catch {
      // ignore
    }

    const defaultTierConfig = getScanPowerTierConfig(0);
    return {
      id: `exp-${Date.now()}`,
      state: 'IDLE' as ExplorationState,
      origin: null,
      currentLocation: null,
      distanceExplored: 0,
      maxDistanceReached: 0,
      speedMps: 0,
      isStationary: false,
      stationaryDuration: 0,
      gpsStatus: 'GPS READY' as GpsStatus,
      gpsStatusMessage: undefined,
      activeMilestone: null,
      nextMilestone: EXPLORATION_MILESTONES[0],
      unlockedTiers: [],
      activeDiscoveryZone: null,
      breadcrumbs: [],
      startedAt: Date.now(),
      isSimulated: false,
      explorationPoints: lifetimeEp,
      sessionPointsEarned: 0,
      claimedMilestones: [],
      currentScanTier: defaultTierConfig.tier,
      currentScanPowerMultiplier: defaultTierConfig.powerMultiplier,
      currentScanPowerBonus: defaultTierConfig.powerBonusPercent,
    };
  });

  const [discoveryZones, setDiscoveryZones] = useState<DiscoveryZone[]>([]);
  const [isSimulatingWalk, setIsSimulatingWalk] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // References for non-react async tracking
  const watchIdRef = useRef<number | null>(null);
  const lastReadingRef = useRef<GeoLocationReading | null>(null);
  const stationaryTimerRef = useRef<number | null>(null);
  const stationaryDurationRef = useRef<number>(0);
  const simulationIntervalRef = useRef<number | null>(null);

  // Sync with Forge updates across windows / components
  useEffect(() => {
    const handleForgeUpdate = () => {
      const current = getExplorationPoints();
      setSession((prev) => (prev.explorationPoints !== current ? { ...prev, explorationPoints: current } : prev));
    };
    window.addEventListener('animatrix_forge_updated', handleForgeUpdate);
    return () => window.removeEventListener('animatrix_forge_updated', handleForgeUpdate);
  }, []);

  // Real-World Multiplayer Teammates & Nearby Players Presence Sync
  const [nearbyPlayers, setNearbyPlayers] = useState<PlayerPresence[]>([]);

  useEffect(() => {
    multiplayerManager.setLocation(session.currentLocation);
    multiplayerManager.setStatus('exploring');
  }, [session.currentLocation]);

  useEffect(() => {
    let isMounted = true;
    const pollActivePlayers = async () => {
      try {
        const players = await multiplayerManager.fetchActivePlayers();
        if (isMounted) setNearbyPlayers(players);
      } catch {}
    };

    pollActivePlayers();
    const interval = setInterval(pollActivePlayers, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Safeguard: Automatically clean up any corrupted EP value on mount/render (> 1,000,000 EP)
  useEffect(() => {
    if (session.explorationPoints > 1000000) {
      resetExplorationPoints();
      setSession((prev) => ({
        ...prev,
        explorationPoints: 0,
        sessionPointsEarned: 0,
      }));
    }
  }, [session.explorationPoints]);

  // Save session changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        EXPLORATION_STORAGE_KEY,
        JSON.stringify({
          id: session.id,
          adventureName: session.adventureName,
          state: session.state,
          origin: session.origin,
          currentLocation: session.currentLocation,
          distanceExplored: session.distanceExplored,
          maxDistanceReached: session.maxDistanceReached,
          speedMps: session.speedMps ?? 0,
          unlockedTiers: session.unlockedTiers,
          breadcrumbs: session.breadcrumbs.slice(-50), // keep latest 50
          startedAt: session.startedAt,
          isSimulated: session.isSimulated,
          explorationPoints: session.explorationPoints ?? 0,
          sessionPointsEarned: session.sessionPointsEarned ?? 0,
          claimedMilestones: session.claimedMilestones ?? [],
          currentScanTier: session.currentScanTier ?? 'LOCAL',
          currentScanPowerMultiplier: session.currentScanPowerMultiplier ?? 1.0,
          currentScanPowerBonus: session.currentScanPowerBonus ?? 0,
        })
      );
    } catch {
      // storage quota or private mode
    }
  }, [
    session.id,
    session.state,
    session.origin,
    session.distanceExplored,
    session.maxDistanceReached,
    session.unlockedTiers,
    session.breadcrumbs,
    session.startedAt,
    session.isSimulated,
    session.explorationPoints,
    session.sessionPointsEarned,
    session.claimedMilestones,
    session.currentScanTier,
    session.currentScanPowerMultiplier,
    session.currentScanPowerBonus,
  ]);

  // Discovery zones removed from map per user request
  const generateDiscoveryZones = useCallback((_origin: ExplorationOrigin): DiscoveryZone[] => {
    return [];
  }, []);

  // Update Discovery zones (kept empty per request)
  useEffect(() => {
    setDiscoveryZones([]);
  }, []);

  // Handle incoming verified GPS reading
  const processLocationReading = useCallback(
    (reading: GeoLocationReading) => {
      setSession((prev) => {
        // If not exploring or idle, just update current location
        if (!prev.origin) {
          return {
            ...prev,
            currentLocation: reading,
            gpsStatus: 'GPS READY',
          };
        }

        // Validate reading against previous reading
        const validation = validateGpsReading(reading, lastReadingRef.current);
        if (!validation.isValid) {
          return {
            ...prev,
            currentLocation: reading,
            gpsStatus: validation.isWeakSignal ? 'GPS WEAK' : 'GPS READY',
            gpsStatusMessage: validation.reason,
          };
        }

        // Calculate incremental step distance from last valid reading
        let stepDist = 0;
        if (lastReadingRef.current) {
          const delta = calculateHaversineDistance(
            lastReadingRef.current.latitude,
            lastReadingRef.current.longitude,
            reading.latitude,
            reading.longitude
          );
          // Count genuine walking movements (>= 0.6m and <= 25m to filter jitter/teleport)
          if (delta >= 0.6 && delta <= 25) {
            stepDist = delta;
          }
        }

        lastReadingRef.current = reading;

        // Radial distance from expedition origin
        const rawRadialDistance = calculateHaversineDistance(
          prev.origin.latitude,
          prev.origin.longitude,
          reading.latitude,
          reading.longitude
        );

        // Safeguard: If distance from origin is an implausible cross-country/teleport jump (> 3000m), realign origin immediately
        let radialDistance = rawRadialDistance;
        if (rawRadialDistance > 3000) {
          prev.origin = {
            latitude: reading.latitude,
            longitude: reading.longitude,
            timestamp: Date.now(),
            label: 'Expedition Origin',
          };
          radialDistance = 0;
        }

        // Effective distance: credit either radial distance from start OR cumulative path walked!
        const pathDistance = (prev.distanceExplored || 0) + stepDist;
        const currentEffectiveDistance = Math.min(3000, Math.max(radialDistance, pathDistance));
        const maxDist = Math.max(prev.maxDistanceReached || 0, currentEffectiveDistance);

        // Update breadcrumb trail (sample every 2m for detailed paths)
        const breadcrumbs = [...prev.breadcrumbs];
        const lastCrumb = breadcrumbs[breadcrumbs.length - 1];
        if (
          !lastCrumb ||
          calculateHaversineDistance(
            lastCrumb.lat,
            lastCrumb.lng,
            reading.latitude,
            reading.longitude
          ) >= 2.0
        ) {
          breadcrumbs.push({
            lat: reading.latitude,
            lng: reading.longitude,
            timestamp: reading.timestamp,
          });
        }

        // Determine milestones
        let activeMilestone: DiscoveryMilestoneConfig | null = null;
        let nextMilestone: DiscoveryMilestoneConfig | null = EXPLORATION_MILESTONES[0];
        const unlockedTiers: typeof prev.unlockedTiers = [...prev.unlockedTiers];

        for (let i = 0; i < EXPLORATION_MILESTONES.length; i++) {
          const m = EXPLORATION_MILESTONES[i];
          if (maxDist >= m.distanceMeters) {
            activeMilestone = m;
            nextMilestone = EXPLORATION_MILESTONES[i + 1] || null;
            if (!unlockedTiers.includes(m.tier)) {
              unlockedTiers.push(m.tier);
            }
          } else {
            if (!nextMilestone || nextMilestone.distanceMeters <= maxDist) {
              nextMilestone = m;
            }
            break;
          }
        }

        // Calculate Scan Power Tier and Exploration Points
        const scanTierConfig = getScanPowerTierConfig(currentEffectiveDistance);
        const rewardCalc = calculateExplorationRewardPoints(maxDist, prev.claimedMilestones || []);
        const newlyEarnedEp = Math.max(0, rewardCalc.totalSessionPoints - (prev.sessionPointsEarned || 0));
        
        let updatedTotalEp = getExplorationPoints();
        if (newlyEarnedEp > 0) {
          updatedTotalEp = updatedTotalEp + newlyEarnedEp;
          setExplorationPoints(updatedTotalEp);
          recordExpeditionProgress(maxDist, newlyEarnedEp);
          try {
            sound.playBonus();
          } catch {
            // ignore
          }
          setRecentReward({
            id: `${Date.now()}-${Math.random()}`,
            epAmount: newlyEarnedEp,
            milestoneTitle: activeMilestone?.title || `${Math.floor(maxDist / 10) * 10}m Frontier Reached`,
            milestoneReached: rewardCalc.newMilestonesToClaim.length > 0 || maxDist >= 10,
            distanceMeters: Math.round(maxDist),
          });
        }
        const updatedClaimed = Array.from(new Set([...(prev.claimedMilestones || []), ...rewardCalc.newMilestonesToClaim]));

        // Check stationary condition
        const isCurrentlyStationary = validation.effectiveSpeed < MIN_MOVEMENT_THRESHOLD;
        let newStationaryDuration = prev.stationaryDuration;
        if (isCurrentlyStationary) {
          newStationaryDuration += 1.0; // increments with GPS ticks
        } else {
          newStationaryDuration = 0;
        }
        stationaryDurationRef.current = newStationaryDuration;
        const isConfirmedStationary = newStationaryDuration >= MIN_STATIONARY_DURATION;

        // State machine evaluation: any verified stop allows scanning with current tier!
        let nextState: ExplorationState = prev.state;
        if (
          prev.state === 'EXPLORING' ||
          prev.state === 'MILESTONE_APPROACHING' ||
          prev.state === 'DISCOVERY_UNLOCKED' ||
          prev.state === 'WAITING_FOR_STATIONARY' ||
          prev.state === 'SCAN_READY'
        ) {
          if (isConfirmedStationary) {
            nextState = 'SCAN_READY';
          } else if (activeMilestone) {
            nextState = 'WAITING_FOR_STATIONARY';
          } else if (nextMilestone && nextMilestone.distanceMeters - maxDist <= 50) {
            nextState = 'MILESTONE_APPROACHING';
          } else {
            nextState = 'EXPLORING';
          }
        }

        return {
          ...prev,
          currentLocation: reading,
          distanceExplored: Math.round(currentEffectiveDistance),
          maxDistanceReached: Math.round(maxDist),
          speedMps: validation.effectiveSpeed,
          isStationary: isConfirmedStationary,
          stationaryDuration: newStationaryDuration,
          gpsStatus: 'GPS READY',
          gpsStatusMessage: undefined,
          activeMilestone,
          nextMilestone,
          unlockedTiers,
          breadcrumbs,
          state: nextState,
          explorationPoints: updatedTotalEp,
          sessionPointsEarned: rewardCalc.totalSessionPoints,
          claimedMilestones: updatedClaimed,
          currentScanTier: scanTierConfig.tier,
          currentScanPowerMultiplier: scanTierConfig.powerMultiplier,
          currentScanPowerBonus: scanTierConfig.powerBonusPercent,
        };
      });
    },
    []
  );

  // Geolocation watcher with resilient accuracy fallback
  const startGeolocationWatcher = useCallback(() => {
    if (!navigator.geolocation) {
      setPermissionError('Geolocation is not supported by your browser.');
      setSession((s) => ({ ...s, gpsStatus: 'GPS UNAVAILABLE' }));
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    setSession((s) => ({ ...s, gpsStatus: 'GPS SEARCHING' }));

    const startWatcher = (highAccuracy: boolean) => {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const reading: GeoLocationReading = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy || 10,
            altitude: pos.coords.altitude,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
            timestamp: pos.timestamp || Date.now(),
          };
          processLocationReading(reading);
        },
        (err) => {
          console.warn('Geolocation watch error:', err);
          // If high accuracy timed out on PC / Wi-Fi, fall back to standard accuracy
          if (highAccuracy && (err.code === err.TIMEOUT || err.code === err.POSITION_UNAVAILABLE)) {
            console.log('Switching watchPosition to standard accuracy fallback...');
            startWatcher(false);
            return;
          }
          if (err.code === err.PERMISSION_DENIED) {
            const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
            if (isInIframe) {
              setPermissionError(
                'EMBEDDED PREVIEW DETECTED: Web browsers restrict location prompts inside iframes. Open the app in a new tab for native device GPS, or tap "Start Virtual Satellite Rover" to play immediately!'
              );
            } else {
              setPermissionError('LOCATION ACCESS REQUIRED: Location permission is needed for outdoor GPS tracking. You can also explore with Virtual Satellite Rover.');
            }
            setSession((s) => ({ ...s, gpsStatus: 'GPS DENIED', state: 'IDLE' }));
          } else {
            setSession((s) => ({ ...s, gpsStatus: 'GPS UNAVAILABLE', gpsStatusMessage: err.message }));
          }
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout: highAccuracy ? 8000 : 15000,
          maximumAge: 1000,
        }
      );
    };

    startWatcher(true);
  }, [processLocationReading]);

  // Reliable IP Geolocation fallback for devices without dedicated satellite GPS or offline APK mode
  const fetchIpFallbackLocation = useCallback(async () => {
    try {
      let data: any = null;
      try {
        const res = await fetch('/api/ip-location');
        data = await res.json();
      } catch {
        // Direct public fallback if standalone APK is not connected to local dev server
        const directRes = await fetch('https://ipwho.is/');
        data = await directRes.json();
      }
      if (data && (data.success || data.latitude) && data.latitude && data.longitude) {
        setSession((prev) => {
          // If we already have a real GPS fix, keep it
          if (prev.currentLocation && !prev.currentLocation.isIpFallback) return prev;
          const reading: GeoLocationReading = {
            latitude: data.latitude,
            longitude: data.longitude,
            accuracy: 80,
            altitude: null,
            heading: null,
            speed: 0,
            timestamp: Date.now(),
            isIpFallback: true,
            locationLabel: `${data.city ? data.city + ', ' : ''}${data.region || data.country || ''}`,
          };
          return {
            ...prev,
            currentLocation: reading,
            gpsStatus: 'GPS READY',
          };
        });
      }
    } catch (err) {
      console.warn('IP fallback note:', err);
    }
  }, []);

  // Automatic location detection on mount:
  // Immediately queries user location (using fast standard Wi-Fi/IP accuracy, followed by high-accuracy)
  // so the player position pin and surrounding map show up accurately right away without needing to click start first!
  useEffect(() => {
    if (!navigator.geolocation) {
      fetchIpFallbackLocation();
      return;
    }

    // Fast initial position fetch
    const fetchInitialFix = () => {
      setSession((s) => (s.gpsStatus === 'GPS READY' ? s : { ...s, gpsStatus: 'GPS SEARCHING' }));

      // Also schedule fast IP fallback in parallel so player is never stuck with an empty map
      const ipFallbackTimer = setTimeout(() => {
        fetchIpFallbackLocation();
      }, 2500);

      // Fast standard accuracy query (instant on Wi-Fi / IP)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(ipFallbackTimer);
          const reading: GeoLocationReading = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy || 15,
            altitude: pos.coords.altitude,
            heading: pos.coords.heading,
            speed: 0,
            timestamp: pos.timestamp || Date.now(),
          };
          processLocationReading(reading);
        },
        (err) => {
          console.warn('Initial standard geolocation probe note:', err);
          if (err.code === err.PERMISSION_DENIED) {
            clearTimeout(ipFallbackTimer);
            fetchIpFallbackLocation();
            return;
          }
          // Secondary attempt with high accuracy
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              clearTimeout(ipFallbackTimer);
              const reading: GeoLocationReading = {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy || 10,
                altitude: pos.coords.altitude,
                heading: pos.coords.heading,
                speed: 0,
                timestamp: pos.timestamp || Date.now(),
              };
              processLocationReading(reading);
            },
            (err2) => {
              console.warn('Secondary geolocation probe note:', err2);
              clearTimeout(ipFallbackTimer);
              fetchIpFallbackLocation();
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
          );
        },
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 }
      );
    };

    fetchInitialFix();
  }, [processLocationReading, fetchIpFallbackLocation]);

  // Clean up watchers on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (simulationIntervalRef.current !== null) {
        clearInterval(simulationIntervalRef.current);
      }
    };
  }, []);

  // Action: Start Expedition
  const startExpedition = useCallback(async (customAdventureName?: string) => {
    const finalAdventureName = customAdventureName?.trim() || 'My Adventure';
    setPermissionError(null);
    setSession((s) => ({ ...s, adventureName: finalAdventureName, state: 'LOCATION_PERMISSION', gpsStatus: 'GPS SEARCHING' }));

    if (!navigator.geolocation) {
      setPermissionError('Geolocation API not supported on this device.');
      setSession((s) => ({ ...s, state: 'IDLE', gpsStatus: 'GPS UNAVAILABLE' }));
      return;
    }

    const establishExpeditionWithOrigin = (currentReading: GeoLocationReading) => {
      const originPoint: ExplorationOrigin = {
        latitude: currentReading.latitude,
        longitude: currentReading.longitude,
        timestamp: Date.now(),
        label: 'Expedition Origin',
      };

      lastReadingRef.current = currentReading;

      const defaultTier = getScanPowerTierConfig(0);
      setSession((prev) => ({
        id: `exp-${Date.now()}`,
        adventureName: finalAdventureName,
        state: 'EXPLORING',
        origin: originPoint,
        currentLocation: currentReading,
        distanceExplored: 0,
        maxDistanceReached: 0,
        speedMps: 0,
        isStationary: true,
        stationaryDuration: MIN_STATIONARY_DURATION,
        gpsStatus: 'GPS READY',
        activeMilestone: null,
        nextMilestone: EXPLORATION_MILESTONES[0],
        unlockedTiers: [],
        activeDiscoveryZone: null,
        breadcrumbs: [{ lat: originPoint.latitude, lng: originPoint.longitude, timestamp: Date.now() }],
        startedAt: Date.now(),
        isSimulated: false,
        explorationPoints: prev.explorationPoints ?? 0,
        sessionPointsEarned: 0,
        claimedMilestones: [],
        currentScanTier: defaultTier.tier,
        currentScanPowerMultiplier: defaultTier.powerMultiplier,
        currentScanPowerBonus: defaultTier.powerBonusPercent,
      }));

      startGeolocationWatcher();
    };

    // If we already have a recent valid location in session, we can start immediately!
    const existing = lastReadingRef.current || session.currentLocation;
    if (existing && existing.latitude && existing.longitude) {
      establishExpeditionWithOrigin(existing);
      return;
    }

    // Capture initial fix: Try high accuracy first, gracefully fall back to standard accuracy
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const reading: GeoLocationReading = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy || 10,
          altitude: pos.coords.altitude,
          heading: pos.coords.heading,
          speed: 0,
          timestamp: Date.now(),
        };
        establishExpeditionWithOrigin(reading);
      },
      (err) => {
        console.warn('High-accuracy initial geolocation failed, trying standard accuracy:', err);
        if (err.code === err.PERMISSION_DENIED) {
          const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
          if (isInIframe) {
            setPermissionError(
              'EMBEDDED PREVIEW DETECTED: Web browsers restrict location prompts inside iframes. Open the app in a new tab for native device GPS, or tap "Start Virtual Satellite Rover" to play immediately!'
            );
          } else {
            setPermissionError(
              'LOCATION ACCESS DENIED: Device location permission is needed for outdoor GPS mode. Please click the lock icon in your address bar to allow location.'
            );
          }
          setSession((s) => ({ ...s, state: 'IDLE', gpsStatus: 'GPS DENIED' }));
          return;
        }

        // Standard accuracy fallback (queries Wi-Fi / IP BSSID, instant and accurate on PC/Laptop)
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const reading: GeoLocationReading = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy || 25,
              altitude: pos.coords.altitude,
              heading: pos.coords.heading,
              speed: 0,
              timestamp: Date.now(),
            };
            establishExpeditionWithOrigin(reading);
          },
          (err2) => {
            console.warn('Standard fallback also failed, attempting IP location fallback:', err2);
            fetch('/api/ip-location')
              .then((r) => r.json())
              .then((data) => {
                if (data && data.success && data.latitude && data.longitude) {
                  const ipReading: GeoLocationReading = {
                    latitude: data.latitude,
                    longitude: data.longitude,
                    accuracy: 80,
                    altitude: null,
                    heading: null,
                    speed: 0,
                    timestamp: Date.now(),
                    isIpFallback: true,
                    locationLabel: `${data.city ? data.city + ', ' : ''}${data.region || ''}`,
                  };
                  establishExpeditionWithOrigin(ipReading);
                } else {
                  setPermissionError('GPS SIGNAL UNAVAILABLE: Unable to acquire GPS lock. Move to an open area, or switch to Virtual Satellite Rover.');
                  setSession((s) => ({ ...s, state: 'IDLE', gpsStatus: 'GPS UNAVAILABLE', gpsStatusMessage: err2.message }));
                }
              })
              .catch(() => {
                setPermissionError('GPS SIGNAL UNAVAILABLE: Unable to acquire GPS lock. Move to an open area, or switch to Virtual Satellite Rover.');
                setSession((s) => ({ ...s, state: 'IDLE', gpsStatus: 'GPS UNAVAILABLE', gpsStatusMessage: err2.message }));
              });
          },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 30000 }
        );
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
    );
  }, [startGeolocationWatcher, session.currentLocation]);

  // DEV ONLY: Explicitly start simulated GPS mode (clearly segregated for development/demo testing)
  const startDevSimulatedExpedition = useCallback((customAdventureName?: string) => {
    const finalAdventureName = customAdventureName?.trim() || 'My Adventure';
    setPermissionError(null);
    const demoOrigin: ExplorationOrigin = {
      latitude: DEFAULT_DEMO_COORDINATES.latitude,
      longitude: DEFAULT_DEMO_COORDINATES.longitude,
      timestamp: Date.now(),
      label: 'Expedition Origin (Dev Site)',
    };
    const demoReading: GeoLocationReading = {
      ...demoOrigin,
      accuracy: 5,
      speed: 0,
    };

    const defaultTier = getScanPowerTierConfig(0);
    setSession((prev) => ({
      id: `exp-sim-${Date.now()}`,
      adventureName: finalAdventureName,
      state: 'EXPLORING',
      origin: demoOrigin,
      currentLocation: demoReading,
      distanceExplored: 0,
      maxDistanceReached: 0,
      speedMps: 0,
      isStationary: true,
      stationaryDuration: MIN_STATIONARY_DURATION,
      gpsStatus: 'GPS READY',
      activeMilestone: null,
      nextMilestone: EXPLORATION_MILESTONES[0],
      unlockedTiers: [],
      activeDiscoveryZone: null,
      breadcrumbs: [{ lat: demoOrigin.latitude, lng: demoOrigin.longitude, timestamp: Date.now() }],
      startedAt: Date.now(),
      isSimulated: true,
      explorationPoints: prev.explorationPoints ?? 0,
      sessionPointsEarned: 0,
      claimedMilestones: [],
      currentScanTier: defaultTier.tier,
      currentScanPowerMultiplier: defaultTier.powerMultiplier,
      currentScanPowerBonus: defaultTier.powerBonusPercent,
    }));
  }, []);

  // Action: Reset & Start New Expedition
  const startNewExpedition = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (simulationIntervalRef.current !== null) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
    setIsSimulatingWalk(false);
    lastReadingRef.current = null;
    resetExplorationPoints();

    const defaultTier = getScanPowerTierConfig(0);
    setSession((prev) => ({
      id: `exp-${Date.now()}`,
      state: 'IDLE',
      origin: null,
      currentLocation: prev.currentLocation,
      distanceExplored: 0,
      maxDistanceReached: 0,
      speedMps: 0,
      isStationary: false,
      stationaryDuration: 0,
      gpsStatus: 'GPS READY',
      activeMilestone: null,
      nextMilestone: EXPLORATION_MILESTONES[0],
      unlockedTiers: [],
      activeDiscoveryZone: null,
      breadcrumbs: [],
      startedAt: Date.now(),
      isSimulated: false,
      explorationPoints: 0,
      sessionPointsEarned: 0,
      claimedMilestones: [],
      currentScanTier: defaultTier.tier,
      currentScanPowerMultiplier: defaultTier.powerMultiplier,
      currentScanPowerBonus: defaultTier.powerBonusPercent,
    }));
    setDiscoveryZones([]);
  }, []);

  // Action: Reset All Points to 0 (Fresh mobile walk testing)
  const resetAllPointsToZero = useCallback(() => {
    resetExplorationPoints();
    setSession((prev) => ({
      ...prev,
      explorationPoints: 0,
      sessionPointsEarned: 0,
    }));
  }, []);

  // Action: Enter Scan Mode (User tapped [SCAN OBJECT] while stationary)
  const openScanMode = useCallback(() => {
    setSession((s) => {
      if (s.state === 'SCAN_READY' || s.state === 'DISCOVERY_UNLOCKED') {
        return { ...s, state: 'SCANNING' };
      }
      return s;
    });
  }, []);

  // Action: Complete scan and return to ready state
  const handleScanCompleted = useCallback(() => {
    setSession((s) => ({ ...s, state: 'BATTLE_READY' }));
  }, []);

  // Spend exploration points (for permanent upgrades)
  const spendExplorationPoints = useCallback((amount: number): boolean => {
    let success = false;
    const current = getExplorationPoints();
    if (current >= amount) {
      const remaining = current - amount;
      setExplorationPoints(remaining);
      setSession((prev) => ({ ...prev, explorationPoints: remaining }));
      success = true;
    }
    return success;
  }, []);

  // Demo / Simulation Controls: Walk Step / Jump
  const simulateWalkStep = useCallback((metersToAdd: number) => {
    setSession((prev) => {
      const origin = prev.origin || {
        latitude: prev.currentLocation?.latitude || DEFAULT_DEMO_COORDINATES.latitude,
        longitude: prev.currentLocation?.longitude || DEFAULT_DEMO_COORDINATES.longitude,
        timestamp: Date.now(),
        label: 'Expedition Origin',
      };

      const newDistance = prev.distanceExplored + metersToAdd;
      const maxDist = Math.max(prev.maxDistanceReached, Math.round(newDistance));
      // Walk heading East (90 degrees)
      const newCoord = calculateDestinationPoint(origin.latitude, origin.longitude, newDistance, 90);
      const simulatedReading: GeoLocationReading = {
        latitude: newCoord.latitude,
        longitude: newCoord.longitude,
        accuracy: 4,
        speed: 1.4, // walking speed 1.4 m/s
        heading: 90,
        timestamp: Date.now(),
      };

      lastReadingRef.current = simulatedReading;

      let activeMilestone: DiscoveryMilestoneConfig | null = null;
      let nextMilestone: DiscoveryMilestoneConfig | null = EXPLORATION_MILESTONES[0];
      const unlockedTiers = [...prev.unlockedTiers];

      for (let i = 0; i < EXPLORATION_MILESTONES.length; i++) {
        const m = EXPLORATION_MILESTONES[i];
        if (newDistance >= m.distanceMeters) {
          activeMilestone = m;
          nextMilestone = EXPLORATION_MILESTONES[i + 1] || null;
          if (!unlockedTiers.includes(m.tier)) {
            unlockedTiers.push(m.tier);
          }
        } else {
          nextMilestone = m;
          break;
        }
      }

      // Calculate rewards and scan tier
      const scanTierConfig = getScanPowerTierConfig(newDistance);
      const rewardCalc = calculateExplorationRewardPoints(maxDist, prev.claimedMilestones || []);
      const newlyEarnedEp = Math.max(0, rewardCalc.totalSessionPoints - (prev.sessionPointsEarned || 0));
      
      let updatedTotalEp = getExplorationPoints();
      if (newlyEarnedEp > 0) {
        updatedTotalEp = updatedTotalEp + newlyEarnedEp;
        setExplorationPoints(updatedTotalEp);
        recordExpeditionProgress(maxDist, newlyEarnedEp);
        setRecentReward({
          id: `${Date.now()}-${Math.random()}`,
          epAmount: newlyEarnedEp,
          milestoneTitle: activeMilestone?.title,
          milestoneReached: rewardCalc.newMilestonesToClaim.length > 0,
          distanceMeters: Math.round(maxDist),
        });
      }
      const updatedClaimed = Array.from(new Set([...(prev.claimedMilestones || []), ...rewardCalc.newMilestonesToClaim]));

      const breadcrumbs = [...prev.breadcrumbs, { lat: newCoord.latitude, lng: newCoord.longitude, timestamp: Date.now() }];

      return {
        ...prev,
        origin,
        currentLocation: simulatedReading,
        distanceExplored: Math.round(newDistance),
        maxDistanceReached: maxDist,
        speedMps: 1.4,
        isStationary: false,
        stationaryDuration: 0,
        state: activeMilestone ? 'WAITING_FOR_STATIONARY' : 'EXPLORING',
        activeMilestone,
        nextMilestone,
        unlockedTiers,
        breadcrumbs,
        isSimulated: true,
        explorationPoints: updatedTotalEp,
        sessionPointsEarned: rewardCalc.totalSessionPoints,
        claimedMilestones: updatedClaimed,
        currentScanTier: scanTierConfig.tier,
        currentScanPowerMultiplier: scanTierConfig.powerMultiplier,
        currentScanPowerBonus: scanTierConfig.powerBonusPercent,
      };
    });
  }, []);

  // Demo: Simulate coming to a complete stop (triggers stationary detection safely)
  const simulateStopWalking = useCallback(() => {
    setSession((prev) => {
      if (!prev.currentLocation) return prev;
      const stoppedReading: GeoLocationReading = {
        ...prev.currentLocation,
        speed: 0,
        timestamp: Date.now(),
      };
      lastReadingRef.current = stoppedReading;

      return {
        ...prev,
        currentLocation: stoppedReading,
        speedMps: 0,
        isStationary: true,
        stationaryDuration: MIN_STATIONARY_DURATION + 1,
        state: 'SCAN_READY',
      };
    });
  }, []);

  // Construct Discovery Context for handoff to Camera / Object DNA pipeline
  const getDiscoveryContext = useCallback((): ExplorationDiscoveryContext | null => {
    const scanTierConfig = getScanPowerTierConfig(session.distanceExplored);
    const activeMilestone = session.activeMilestone;

    return {
      expeditionId: session.id,
      tier: activeMilestone?.tier || 'RECON',
      distanceMeters: session.distanceExplored,
      milestoneTitle: activeMilestone?.title || `${scanTierConfig.label} Opportunity`,
      bonusTitle: activeMilestone?.bonusTitle || `${scanTierConfig.label} Kinetic Tuning`,
      bonusDescription: activeMilestone?.bonusDescription || `${scanTierConfig.powerBonusPercent}% power boost unlocked at current distance.`,
      explorationCoins: activeMilestone?.explorationCoins || 100,
      explorationXp: activeMilestone?.explorationXp || 50,
      explorationPoints: session.explorationPoints,
      scanPowerTier: scanTierConfig.tier,
      scanPowerMultiplier: scanTierConfig.powerMultiplier,
      scanPowerBonusPercent: scanTierConfig.powerBonusPercent,
      scanPowerBadge: scanTierConfig.badge,
    };
  }, [session.activeMilestone, session.distanceExplored, session.id, session.explorationPoints]);

  return {
    session,
    discoveryZones,
    permissionError,
    recentReward,
    clearRecentReward,
    startExpedition,
    startDevSimulatedExpedition,
    startVirtualExpedition: startDevSimulatedExpedition,
    startNewExpedition,
    openScanMode,
    handleScanCompleted,
    spendExplorationPoints,
    simulateWalkStep,
    simulateStopWalking,
    isSimulatingWalk,
    getDiscoveryContext,
    isInIframe: typeof window !== 'undefined' && window.self !== window.top,
    clearPermissionError: () => setPermissionError(null),
    resetAllPointsToZero,
    nearbyPlayers,
  };
}
