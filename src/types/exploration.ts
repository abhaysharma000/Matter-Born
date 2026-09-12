/**
 * Animatrix Real-World Exploration & Live Google Maps Types
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
  | 'COMMON'      // 250m - Scout Discovery
  | 'UNCOMMON'    // 500m - Vanguard Discovery
  | 'RARE'        // 750m - Apex Discovery
  | 'EPIC'        // 1000m - Cybertronian Artifact
  | 'ELITE'       // 2000m - Elite Discovery
  | 'MYTHIC';     // 3000m - Prime Matrix Catalyst

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
}
