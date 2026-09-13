/**
 * Animatrix Real-World Exploration & Live OpenStreetMap Types
 */

export type ExplorationState =
  | 'IDLE'                   // Waiting for player to press START EXPEDITION
  | 'LOCATION_PERMISSION'    // Requesting device geolocation access
  | 'EXPEDITION_STARTING'    // Capturing initial GPS position as Expedition Origin
  | 'EXPLORING'              // Live GPS tracking; player physically moving outdoors
  | 'MILESTONE_APPROACHING'  // Approaching next milestone destination zone (< 50m)
  | 'DISCOVERY_UNLOCKED'     // Milestone reached! Discovery opportunity unlocked
  | 'WAITING_FOR_STATIONARY' // Player is at milestone but still moving; prompted to stop
  | 'SCAN_READY'             // Device is verified stationary; [ SCAN OBJECT ] button enabled
  | 'SCANNING'               // Player activated scanner; existing camera/photo pipeline open
  | 'TRANSFORMATION'         // Gemini Multimodal AI extracting Object DNA & transmuting
  | 'BATTLE_READY'           // Mech generated with exploration perks; ready for 3D arena
  | 'COMPLETED';             // Expedition completed

export type DiscoveryTier =
  | 'SCOUT'       // 5m - Local Scout
  | 'RANGER'      // 50m - Ranger Discovery
  | 'VANGUARD'    // 250m - Vanguard Discovery
  | 'APEX'        // 500m - Apex Discovery
  | 'ENERGON'     // 1000m - Cybertronian Artifact / Energon
  | 'ELITE'       // 2000m - Elite Titan Relic
  | 'MYTHIC'      // 3000m - Prime Matrix Catalyst
  | 'RECON'
  | 'COMMON'
  | 'UNCOMMON'
  | 'RARE'
  | 'EPIC';

export type ScanPowerTierName =
  | 'LOCAL'
  | 'SCOUT'
  | 'RANGER'
  | 'VANGUARD'
  | 'ELITE'
  | 'EPIC'
  | 'TITAN'
  | 'MYTHIC';

export interface ScanPowerTierConfig {
  tier: ScanPowerTierName;
  minDistanceMeters: number;
  maxDistanceMeters: number;
  powerBonusPercent: number; // e.g. 20 for +20%
  powerMultiplier: number; // e.g. 1.20
  budgetRating: number; // e.g. 165
  label: string;
  badge: string;
  accentColor: string;
  description: string;
}

export interface ExplorationScanMetadata {
  expeditionId: string;
  scanDistanceMeters: number;
  scanTier: ScanPowerTierName;
  tierBadge: string;
  powerMultiplier: number;
  explorationBonusPercent: number;
  budgetRating: number;
  statBuffs: {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
    abilityDamage: number;
  };
  objectTraitPerk: string;
  scannedAt: number;
  originLocked: boolean;
  causalExplanation: string;
}

export type ExplorationUpgradeType = 'mobility' | 'defense' | 'attack' | 'ability' | 'scanner';

export interface ExplorationUpgradeItem {
  id: ExplorationUpgradeType;
  name: string;
  description: string;
  icon: string;
  level: number;
  maxLevel: number;
  baseCost: number;
  costMultiplier: number;
  statBenefitLabel: string;
}

export type GpsStatus =
  | 'GPS READY'
  | 'GPS SEARCHING'
  | 'GPS WEAK'
  | 'GPS UNAVAILABLE'
  | 'GPS DENIED';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface GeoLocationReading extends GeoPoint {
  accuracy: number;        // in meters
  altitude?: number | null;
  heading?: number | null; // in degrees
  speed?: number | null;   // in meters/sec
  timestamp: number;
  isIpFallback?: boolean;
  locationLabel?: string;
}

export interface ExplorationOrigin extends GeoPoint {
  timestamp: number;
  label: string; // "Expedition Origin" - Never home address
}

export interface DiscoveryMilestoneConfig {
  distanceMeters: number;
  tier: DiscoveryTier;
  title: string;
  codename: string;
  badge: string;
  accentColor: string;
  bonusTitle: string;
  bonusDescription: string;
  explorationXp: number;
  explorationCoins: number;
  explorationPointsReward: number; // EP granted on reaching milestone
}

export interface DiscoveryZone {
  id: string;
  milestoneDistance: number;
  tier: DiscoveryTier;
  title: string;
  codename: string;
  latitude: number;
  longitude: number;
  unlocked: boolean;
  claimed: boolean;
  bonusTitle: string;
  bonusDescription: string;
  accentColor: string;
}

export interface ExplorationSession {
  id: string;
  adventureName?: string;
  state: ExplorationState;
  origin: ExplorationOrigin | null;
  currentLocation: GeoLocationReading | null;
  distanceExplored: number;      // meters traveled from origin
  maxDistanceReached: number;    // peak distance
  speedMps: number;             // meters/sec
  isStationary: boolean;        // whether device is stationary
  stationaryDuration: number;   // seconds continuously stationary
  gpsStatus: GpsStatus;
  gpsStatusMessage?: string;
  activeMilestone: DiscoveryMilestoneConfig | null;
  nextMilestone: DiscoveryMilestoneConfig | null;
  unlockedTiers: DiscoveryTier[];
  activeDiscoveryZone: DiscoveryZone | null;
  breadcrumbs: Array<{ lat: number; lng: number; timestamp: number }>;
  startedAt: number;
  completedAt?: number;
  isSimulated: boolean;

  // Reward System 1: Exploration Points (EP)
  explorationPoints: number;              // Current total EP available
  sessionPointsEarned: number;            // Points accumulated during this specific expedition
  claimedMilestones: number[];            // Milestone distances already claimed during this expedition (anti-farming)

  // Reward System 2: Distance-Based Scan Power / Forge Potential
  currentScanTier: ScanPowerTierName;     // Tier calculated from current distance
  currentScanPowerMultiplier: number;    // e.g. 1.20 for +20%
  currentScanPowerBonus: number;         // e.g. 20 for +20%
}

export interface ExplorationDiscoveryContext {
  expeditionId: string;
  tier: DiscoveryTier;
  distanceMeters: number;
  milestoneTitle: string;
  bonusTitle: string;
  bonusDescription: string;
  explorationCoins: number;
  explorationXp: number;
  explorationPoints?: number;
  scanPowerTier: ScanPowerTierName;
  scanPowerMultiplier: number;
  scanPowerBonusPercent: number;
  scanPowerBadge: string;
}
