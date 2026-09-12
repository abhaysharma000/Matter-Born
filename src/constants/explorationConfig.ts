import { DiscoveryMilestoneConfig } from '../types/exploration';

/**
 * Animatrix Real-World Exploration Constants & Rules
 * Centralized configuration — no magic numbers scattered in the codebase.
 */

// Safety & Stationary Detection
export const MIN_STATIONARY_DURATION = 3.0; // seconds player must remain stationary
export const MIN_MOVEMENT_THRESHOLD = 0.7; // m/s (~2.5 km/h) threshold below which player is considered stopped
export const GPS_ACCURACY_THRESHOLD = 45; // meters: readings above this indicate weak signal
export const MAX_REASONABLE_SPEED = 12.0; // m/s (~43 km/h): movement above this is flagged as vehicular/teleport
export const LOCATION_UPDATE_INTERVAL = 2000; // ms between GPS checks
export const DISCOVERY_RADIUS = 35; // meters: radius around a discovery beacon where player is considered arrived

// Exploration Milestones (Physical movement unlocks discovery opportunity, NOT raw +100 attack stats)
export const EXPLORATION_MILESTONES: DiscoveryMilestoneConfig[] = [
  {
    distanceMeters: 250,
    tier: 'COMMON',
    title: 'Scout Discovery',
    codename: 'ZONE-ALPHA',
    badge: '🟢',
    accentColor: '#10B981', // Emerald
    bonusTitle: 'Reconnaissance Optics',
    bonusDescription: 'Unlocks lightweight alloy frame calibration and Scout-tier transmutation perks.',
    explorationXp: 120,
    explorationCoins: 250,
  },
  {
    distanceMeters: 500,
    tier: 'UNCOMMON',
    title: 'Vanguard Discovery',
    codename: 'ZONE-BRAVO',
    badge: '🔵',
    accentColor: '#0EA5E9', // Sky Blue
    bonusTitle: 'Vanguard Kinetic Infusion',
    bonusDescription: 'Enables high-tensile material synthesis and +10% boost to evasive thruster response.',
    explorationXp: 280,
    explorationCoins: 500,
  },
  {
    distanceMeters: 750,
    tier: 'RARE',
    title: 'Apex Discovery',
    codename: 'ZONE-CHARLIE',
    badge: '🟣',
    accentColor: '#8B5CF6', // Purple
    bonusTitle: 'Apex Resonance Core',
    bonusDescription: 'Unlocks rare elemental harmonic tuning, accelerating special ability cooldown recharge.',
    explorationXp: 450,
    explorationCoins: 850,
  },
  {
    distanceMeters: 1000,
    tier: 'EPIC',
    title: 'Cybertronian Artifact',
    codename: 'ZONE-DELTA',
    badge: '🟡',
    accentColor: '#F59E0B', // Amber
    bonusTitle: 'Energon Matrix Capacitor',
    bonusDescription: 'Empowers scanned object with Cybertronian energy channels, granting enhanced impact stagger.',
    explorationXp: 750,
    explorationCoins: 1500,
  },
  {
    distanceMeters: 2000,
    tier: 'ELITE',
    title: 'Elite Titan Relic',
    codename: 'ZONE-ECHO',
    badge: '🟠',
    accentColor: '#EA580C', // Orange
    bonusTitle: 'Titan Sub-Core Reactor',
    bonusDescription: 'Unlocks dense ballistic hardening and hyper-shield dispersion upon special deployment.',
    explorationXp: 1200,
    explorationCoins: 2200,
  },
  {
    distanceMeters: 3000,
    tier: 'MYTHIC',
    title: 'Prime Matrix Catalyst',
    codename: 'ZONE-OMEGA',
    badge: '🔴',
    accentColor: '#EF4444', // Red
    bonusTitle: 'Mythic Transformation Matrix',
    bonusDescription: 'Ultimate expedition reward: synthesizes supreme hybrid chassis with custom visual energy aura.',
    explorationXp: 2000,
    explorationCoins: 4000,
  },
];

// Fallback Default Geolocation (used when initializing before permission or for demo)
// San Francisco Ferry Building / Embarcadero waterfront (open area, ideal demonstration)
export const DEFAULT_DEMO_COORDINATES = {
  latitude: 37.7955,
  longitude: -122.3937,
};

// Storage Key
export const EXPLORATION_STORAGE_KEY = 'animatrix_exploration_session_v2';
