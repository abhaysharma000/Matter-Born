import { DiscoveryMilestoneConfig, ScanPowerTierConfig, ExplorationUpgradeItem } from '../types/exploration';

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

// Anti-Farming & Point Economy
export const METERS_PER_EXPLORATION_POINT = 5; // 1 EP per 5m of new peak distance (0.2 EP / meter)
export const MAX_EXPLORATION_BONUS_PERCENT = 65; // Hard cap on stat bonus (+65% max)

/**
 * REWARD SYSTEM 1: Exploration Milestones & Points Rewards
 * Milestones awarded strictly once per expedition upon reaching new distances from origin.
 * The farther the player physically travels, the more EP they earn.
 */
export const EXPLORATION_MILESTONES: DiscoveryMilestoneConfig[] = [
  {
    distanceMeters: 100,
    tier: 'SCOUT',
    title: 'First Walk',
    codename: 'ZONE-FIRST-WALK',
    badge: '⭐',
    accentColor: '#10B981', // Emerald
    bonusTitle: 'First Walk Milestone',
    bonusDescription: 'Walked 100 meters in the real world.',
    explorationXp: 100,
    explorationCoins: 50,
    explorationPointsReward: 25,
  },
  {
    distanceMeters: 250,
    tier: 'RANGER',
    title: 'Neighborhood Scout',
    codename: 'ZONE-NEIGHBORHOOD',
    badge: '⭐',
    accentColor: '#059669', // Green
    bonusTitle: 'Neighborhood Scout',
    bonusDescription: 'Walked 250 meters in the real world.',
    explorationXp: 250,
    explorationCoins: 120,
    explorationPointsReward: 70,
  },
  {
    distanceMeters: 500,
    tier: 'VANGUARD',
    title: 'City Ranger',
    codename: 'ZONE-CITY-RANGER',
    badge: '⭐',
    accentColor: '#0284C7', // Sky Blue
    bonusTitle: 'City Ranger',
    bonusDescription: 'Walked 500 meters in the real world.',
    explorationXp: 500,
    explorationCoins: 250,
    explorationPointsReward: 150,
  },
  {
    distanceMeters: 1000,
    tier: 'APEX',
    title: 'Cybertron Voyager',
    codename: 'ZONE-CYBERTRON',
    badge: '⭐',
    accentColor: '#D97706', // Amber
    bonusTitle: 'Cybertron Voyager',
    bonusDescription: 'Walked 1,000 meters in the real world.',
    explorationXp: 1000,
    explorationCoins: 500,
    explorationPointsReward: 350,
  },
  {
    distanceMeters: 2000,
    tier: 'ENERGON',
    title: 'Grand Explorer',
    codename: 'ZONE-GRAND-EXPLORER',
    badge: '⭐',
    accentColor: '#7C3AED', // Purple
    bonusTitle: 'Grand Explorer',
    bonusDescription: 'Walked 2,000 meters in the real world.',
    explorationXp: 2000,
    explorationCoins: 1000,
    explorationPointsReward: 700,
  },
  {
    distanceMeters: 3000,
    tier: 'MYTHIC',
    title: 'Mythic Matrix Catalyst',
    codename: 'ZONE-MYTHIC',
    badge: '🔴',
    accentColor: '#DC2626', // Red
    bonusTitle: 'Supreme Transformation Matrix',
    bonusDescription: 'Supreme expedition achievement: maximum bounded power scaling and custom visual energy aura.',
    explorationXp: 2000,
    explorationCoins: 0,
    explorationPointsReward: 1000,
  },
];

/**
 * REWARD SYSTEM 2: Distance-Based Scan Power / Forge Tiers
 * Distance at the exact instant of scanning scales the robot's potential power budget.
 */
export const SCAN_POWER_TIERS: ScanPowerTierConfig[] = [
  {
    tier: 'LOCAL',
    minDistanceMeters: 0,
    maxDistanceMeters: 4.99,
    powerBonusPercent: 0,
    powerMultiplier: 1.0,
    budgetRating: 100,
    label: 'LOCAL FORGE',
    badge: '⚪',
    accentColor: '#64748B',
    description: 'Baseline chassis power. Explore outdoors (50m+) to forge enhanced fighters.',
  },
  {
    tier: 'SCOUT',
    minDistanceMeters: 5,
    maxDistanceMeters: 49.99,
    powerBonusPercent: 5,
    powerMultiplier: 1.05,
    budgetRating: 120,
    label: 'SCOUT FORGE',
    badge: '🟢',
    accentColor: '#10B981',
    description: 'Initial reconnaissance calibration (+5% chassis power potential).',
  },
  {
    tier: 'RANGER',
    minDistanceMeters: 50,
    maxDistanceMeters: 249.99,
    powerBonusPercent: 12,
    powerMultiplier: 1.12,
    budgetRating: 140,
    label: 'RANGER FORGE',
    badge: '🌲',
    accentColor: '#059669',
    description: 'Early perimeter synthesis (+12% chassis power potential).',
  },
  {
    tier: 'VANGUARD',
    minDistanceMeters: 250,
    maxDistanceMeters: 499.99,
    powerBonusPercent: 20,
    powerMultiplier: 1.20,
    budgetRating: 165,
    label: 'VANGUARD FORGE',
    badge: '🔵',
    accentColor: '#0284C7',
    description: 'Field-tested kinetic infusion (+20% chassis power potential).',
  },
  {
    tier: 'ELITE',
    minDistanceMeters: 500,
    maxDistanceMeters: 999.99,
    powerBonusPercent: 30,
    powerMultiplier: 1.30,
    budgetRating: 195,
    label: 'ELITE FORGE',
    badge: '🟣',
    accentColor: '#7C3AED',
    description: 'High-density titan sub-core (+30% chassis power potential).',
  },
  {
    tier: 'EPIC',
    minDistanceMeters: 1000,
    maxDistanceMeters: 1999.99,
    powerBonusPercent: 40,
    powerMultiplier: 1.40,
    budgetRating: 230,
    label: 'CYBERTRONIAN FORGE',
    badge: '🟡',
    accentColor: '#D97706',
    description: 'Energon matrix capacitor (+40% chassis power potential).',
  },
  {
    tier: 'TITAN',
    minDistanceMeters: 2000,
    maxDistanceMeters: 2999.99,
    powerBonusPercent: 50,
    powerMultiplier: 1.50,
    budgetRating: 270,
    label: 'TITAN RELIC FORGE',
    badge: '🟠',
    accentColor: '#EA580C',
    description: 'Titan alloy resonance (+50% chassis power potential).',
  },
  {
    tier: 'MYTHIC',
    minDistanceMeters: 3000,
    maxDistanceMeters: Infinity,
    powerBonusPercent: 65,
    powerMultiplier: 1.65,
    budgetRating: 320,
    label: 'PRIME MATRIX FORGE',
    badge: '🔴',
    accentColor: '#DC2626',
    description: 'Supreme expedition matrix (+65% max bounded chassis potential).',
  },
];

/**
 * Upgrades available to purchase with Exploration Points (EP)
 */
export const EXPLORATION_UPGRADES_CONFIG: ExplorationUpgradeItem[] = [
  {
    id: 'mobility',
    name: 'Kinetic Thrusters',
    description: 'Increases dash speed and sprint agility for all transformed mechs.',
    icon: '⚡',
    level: 0,
    maxLevel: 5,
    baseCost: 200,
    costMultiplier: 1.5,
    statBenefitLabel: '+5% Traversal & Dash Velocity per level',
  },
  {
    id: 'defense',
    name: 'Alloy Hardening',
    description: 'Reinforces structural plating to decrease damage taken in 3D combat.',
    icon: '🛡️',
    level: 0,
    maxLevel: 5,
    baseCost: 250,
    costMultiplier: 1.5,
    statBenefitLabel: '+6% Base Armor & Shielding per level',
  },
  {
    id: 'attack',
    name: 'Impact Amplifiers',
    description: 'Magnifies melee collision force and projectile impact stagger.',
    icon: '⚔️',
    level: 0,
    maxLevel: 5,
    baseCost: 300,
    costMultiplier: 1.5,
    statBenefitLabel: '+5% Strike Damage & Impact Force per level',
  },
  {
    id: 'ability',
    name: 'Energon Capacitor',
    description: 'Accelerates special ability recharge rate and increases blast radius.',
    icon: '🔮',
    level: 0,
    maxLevel: 5,
    baseCost: 350,
    costMultiplier: 1.5,
    statBenefitLabel: '-5% Cooldown & +8% Ability DMG per level',
  },
  {
    id: 'scanner',
    name: 'Optic Radar Suite',
    description: 'Enhances real-world GPS scanning clarity and grants bonus EP from exploration.',
    icon: '📡',
    level: 0,
    maxLevel: 5,
    baseCost: 150,
    costMultiplier: 1.5,
    statBenefitLabel: '+10% Bonus EP accumulation rate per level',
  },
];

// Fallback Default Geolocation (used when initializing before permission or for demo)
// San Francisco Ferry Building / Embarcadero waterfront (open area, ideal demonstration)
export const DEFAULT_DEMO_COORDINATES = {
  latitude: 37.7955,
  longitude: -122.3937,
};

// Storage Keys
export const EXPLORATION_STORAGE_KEY = 'animatrix_exploration_session_v3';
export const EXPLORATION_UPGRADES_STORAGE_KEY = 'animatrix_exploration_upgrades_v1';
export const LIFETIME_EP_STORAGE_KEY = 'animatrix_lifetime_exploration_points_v1';
export const LIFETIME_DISTANCE_STORAGE_KEY = 'animatrix_lifetime_distance_meters_v1';
export const BEST_EXPEDITION_STORAGE_KEY = 'animatrix_best_expedition_distance_meters_v1';
export const LIFETIME_TOTAL_EP_EARNED_KEY = 'animatrix_lifetime_total_ep_earned_v1';
