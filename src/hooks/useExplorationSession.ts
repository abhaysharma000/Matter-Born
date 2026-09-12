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
import {
  EXPLORATION_MILESTONES,
  MIN_STATIONARY_DURATION,
  MIN_MOVEMENT_THRESHOLD,
  GPS_ACCURACY_THRESHOLD,
  LOCATION_UPDATE_INTERVAL,
  DISCOVERY_RADIUS,
  DEFAULT_DEMO_COORDINATES,
  EXPLORATION_STORAGE_KEY,
} from '../constants/explorationConfig';
import {
  calculateHaversineDistance,
  calculateDestinationPoint,
  validateGpsReading,
} from '../utils/geoUtils';

export function useExplorationSession() {
  const [session, setSession] = useState<ExplorationSession>(() => {
    try {
      const stored = localStorage.getItem(EXPLORATION_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Ensure state is valid
        return {
          ...parsed,
          gpsStatus: 'GPS SEARCHING' as GpsStatus,
          isStationary: false,
          stationaryDuration: 0,
        };
      }
    } catch {
      // ignore
    }
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

  // Save session changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        EXPLORATION_STORAGE_KEY,
        JSON.stringify({
          id: session.id,
          state: session.state,
          origin: session.origin,
          currentLocation: session.currentLocation,
          distanceExplored: session.distanceExplored,
          maxDistanceReached: session.maxDistanceReached,
          unlockedTiers: session.unlockedTiers,
          breadcrumbs: session.breadcrumbs.slice(-50), // keep latest 50
          startedAt: session.startedAt,
          isSimulated: session.isSimulated,
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
  ]);

  // Generate discovery zones radially around the expedition origin
  const generateDiscoveryZones = useCallback((origin: ExplorationOrigin): DiscoveryZone[] => {
    // Generate zones at distinct bearings (e.g. North-East 45°, East 90°, South-East 135°, South 180°, etc.)
    const bearings = [45, 120, 210, 315, 270];
    return EXPLORATION_MILESTONES.map((milestone, idx) => {
      const bearing = bearings[idx % bearings.length];
      const point = calculateDestinationPoint(
        origin.latitude,
        origin.longitude,
        milestone.distanceMeters,
        bearing
      );
      return {
        id: `zone-${milestone.distanceMeters}`,
        milestoneDistance: milestone.distanceMeters,
        tier: milestone.tier,
        title: milestone.title,
        codename: milestone.codename,
        latitude: point.latitude,
        longitude: point.longitude,
        unlocked: false,
        claimed: false,
        bonusTitle: milestone.bonusTitle,
        bonusDescription: milestone.bonusDescription,
        accentColor: milestone.accentColor,
      };
    });
  }, []);

  // Update Discovery zones when origin is established
  useEffect(() => {
    if (session.origin) {
      const zones = generateDiscoveryZones(session.origin);
      // Mark unlocked if already reached
      const updated = zones.map((z) => ({
        ...z,
        unlocked: session.distanceExplored >= z.milestoneDistance,
      }));
      setDiscoveryZones(updated);
    }
  }, [session.origin, generateDiscoveryZones, session.distanceExplored]);

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

        lastReadingRef.current = reading;

        // Calculate real-world Haversine distance from origin
        const rawDistance = calculateHaversineDistance(
          prev.origin.latitude,
          prev.origin.longitude,
          reading.latitude,
          reading.longitude
        );

        // Filter out microscopic standing jitter (< 3 meters)
        const distance = rawDistance < 3 ? 0 : rawDistance;
        const maxDist = Math.max(prev.maxDistanceReached, distance);

        // Update breadcrumb trail (sample every 10m or 5s)
        const breadcrumbs = [...prev.breadcrumbs];
        const lastCrumb = breadcrumbs[breadcrumbs.length - 1];
        if (
          !lastCrumb ||
          calculateHaversineDistance(
            lastCrumb.lat,
            lastCrumb.lng,
            reading.latitude,
            reading.longitude
          ) >= 8
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

        // State machine evaluation
        let nextState: ExplorationState = prev.state;
        if (
          prev.state === 'EXPLORING' ||
          prev.state === 'MILESTONE_APPROACHING' ||
          prev.state === 'DISCOVERY_UNLOCKED' ||
          prev.state === 'WAITING_FOR_STATIONARY' ||
          prev.state === 'SCAN_READY'
        ) {
          if (activeMilestone) {
            // Milestone reached!
            if (isConfirmedStationary) {
              nextState = 'SCAN_READY';
            } else {
              nextState = 'WAITING_FOR_STATIONARY';
            }
          } else if (nextMilestone && nextMilestone.distanceMeters - maxDist <= 50) {
            nextState = 'MILESTONE_APPROACHING';
          } else {
            nextState = 'EXPLORING';
          }
        }

        return {
          ...prev,
          currentLocation: reading,
          distanceExplored: Math.round(distance),
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
        };
      });
    },
    []
  );

  // Geolocation watcher
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
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionError('LOCATION ACCESS REQUIRED: Exploration Mode uses your device location to measure real-world exploration.');
          setSession((s) => ({ ...s, gpsStatus: 'GPS DENIED', state: 'IDLE' }));
        } else {
          setSession((s) => ({ ...s, gpsStatus: 'GPS UNAVAILABLE', gpsStatusMessage: err.message }));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 2500,
      }
    );
  }, [processLocationReading]);

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
  const startExpedition = useCallback(async () => {
    setPermissionError(null);
    setSession((s) => ({ ...s, state: 'LOCATION_PERMISSION', gpsStatus: 'GPS SEARCHING' }));

    if (!navigator.geolocation) {
      setPermissionError('Geolocation API not supported on this device.');
      setSession((s) => ({ ...s, state: 'IDLE', gpsStatus: 'GPS UNAVAILABLE' }));
      return;
    }

    // Capture single initial fix as the origin
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const originPoint: ExplorationOrigin = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          timestamp: Date.now(),
          label: 'Expedition Origin',
        };

        const currentReading: GeoLocationReading = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy || 10,
          altitude: pos.coords.altitude,
          heading: pos.coords.heading,
          speed: 0,
          timestamp: Date.now(),
        };

        lastReadingRef.current = currentReading;

        setSession({
          id: `exp-${Date.now()}`,
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
        });

        startGeolocationWatcher();
      },
      (err) => {
        console.warn('Initial geolocation failed:', err);
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionError('LOCATION ACCESS REQUIRED: Exploration Mode uses your device location to measure real-world exploration.');
          setSession((s) => ({ ...s, state: 'IDLE', gpsStatus: 'GPS DENIED' }));
        } else {
          setPermissionError('GPS SIGNAL UNAVAILABLE: Unable to acquire GPS lock. Move to an open area outdoors.');
          setSession((s) => ({ ...s, state: 'IDLE', gpsStatus: 'GPS UNAVAILABLE', gpsStatusMessage: err.message }));
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [startGeolocationWatcher]);

  // DEV ONLY: Explicitly start simulated GPS mode (clearly segregated for development/demo testing)
  const startDevSimulatedExpedition = useCallback(() => {
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

    setSession({
      id: `exp-sim-${Date.now()}`,
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
    });
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

    setSession({
      id: `exp-${Date.now()}`,
      state: 'IDLE',
      origin: null,
      currentLocation: null,
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
    });
    setDiscoveryZones([]);
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

  // Demo / Simulation Controls: Walk Step / Jump
  const simulateWalkStep = useCallback((metersToAdd: number) => {
    setSession((prev) => {
      const origin = prev.origin || {
        latitude: DEFAULT_DEMO_COORDINATES.latitude,
        longitude: DEFAULT_DEMO_COORDINATES.longitude,
        timestamp: Date.now(),
        label: 'Expedition Origin',
      };

      const newDistance = prev.distanceExplored + metersToAdd;
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

      const breadcrumbs = [...prev.breadcrumbs, { lat: newCoord.latitude, lng: newCoord.longitude, timestamp: Date.now() }];

      return {
        ...prev,
        origin,
        currentLocation: simulatedReading,
        distanceExplored: Math.round(newDistance),
        maxDistanceReached: Math.max(prev.maxDistanceReached, Math.round(newDistance)),
        speedMps: 1.4,
        isStationary: false,
        stationaryDuration: 0,
        state: activeMilestone ? 'WAITING_FOR_STATIONARY' : 'EXPLORING',
        activeMilestone,
        nextMilestone,
        unlockedTiers,
        breadcrumbs,
        isSimulated: true,
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

      const hasMilestone = prev.activeMilestone !== null;
      return {
        ...prev,
        currentLocation: stoppedReading,
        speedMps: 0,
        isStationary: true,
        stationaryDuration: MIN_STATIONARY_DURATION + 1,
        state: hasMilestone ? 'SCAN_READY' : 'EXPLORING',
      };
    });
  }, []);

  // Construct Discovery Context for handoff to Camera / Object DNA pipeline
  const getDiscoveryContext = useCallback((): ExplorationDiscoveryContext | null => {
    if (!session.activeMilestone) {
      // Basic Scout Tier if not at milestone yet
      return {
        expeditionId: session.id,
        tier: 'COMMON',
        distanceMeters: session.distanceExplored,
        milestoneTitle: 'Scout Opportunity',
        bonusTitle: 'Reconnaissance Optics',
        bonusDescription: 'Scouted directly in the real world — standard alloy calibration unlocked.',
        explorationCoins: 100,
        explorationXp: 50,
      };
    }
    return {
      expeditionId: session.id,
      tier: session.activeMilestone.tier,
      distanceMeters: session.distanceExplored,
      milestoneTitle: session.activeMilestone.title,
      bonusTitle: session.activeMilestone.bonusTitle,
      bonusDescription: session.activeMilestone.bonusDescription,
      explorationCoins: session.activeMilestone.explorationCoins,
      explorationXp: session.activeMilestone.explorationXp,
    };
  }, [session.activeMilestone, session.distanceExplored, session.id]);

  return {
    session,
    discoveryZones,
    permissionError,
    startExpedition,
    startDevSimulatedExpedition,
    startNewExpedition,
    openScanMode,
    handleScanCompleted,
    simulateWalkStep,
    simulateStopWalking,
    isSimulatingWalk,
    getDiscoveryContext,
  };
}
