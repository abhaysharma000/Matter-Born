import { DiscoveryMilestoneConfig, ScanPowerTierConfig, ExplorationUpgradeItem } from '../types/exploration';

/**
 * Animatrix Real-World Exploration Constants & Rules
 * Centralized configuration — no magic numbers scattered in the codebase.
 */

// Safety & Stationary Detection
export const MIN_STATIONARY_DURATION = 2.0; // seconds player must remain stationary to scan
export const MIN_MOVEMENT_THRESHOLD = 0.35; // m/s (~1.2 km/h) threshold below which player is considered stopped indoors
export const GPS_ACCURACY_THRESHOLD = 30; // meters: tightened threshold for high accuracy GPS positioning
export const MAX_REASONABLE_SPEED = 8.0; // m/s (~28 km/h): movement above this is flagged as vehicular/teleport
export const LOCATION_UPDATE_INTERVAL = 1000; // ms between GPS checks for higher responsiveness
export const DISCOVERY_RADIUS = 8; // meters: radius around a discovery beacon where player is considered arrived

// Anti-Farming & Point Economy
export const METERS_PER_EXPLORATION_POINT = 1; // 1 EP per 1m of indoor exploration
export const MAX_EXPLORATION_BONUS_PERCENT = 65; // Hard cap on stat bonus (+65% max)

/**
 * REWARD SYSTEM 1: Exploration Milestones & Points Rewards
 * Calibrated specifically for indoor hackathon venue traversal starting at 10m minimum!
 */
export const EXPLORATION_MILESTONES: DiscoveryMilestoneConfig[] = [
  {
    distanceMeters: 10,
    tier: 'SCOUT',
    title: 'Hackathon Scout A',
    codename: 'ZONE-HACK-A',
    badge: '⭐',
    accentColor: '#10B981', // Emerald
    bonusTitle: 'Hallway Scout Milestone',
    bonusDescription: 'Walked 10 meters inside the hackathon hall.',
    explorationXp: 100,
    explorationCoins: 50,
    explorationPointsReward: 30,
  },
  {
    distanceMeters: 20,
    tier: 'RANGER',
    title: 'Corridor Ranger B',
    codename: 'ZONE-HACK-B',
    badge: '⭐',
    accentColor: '#059669', // Green
    bonusTitle: 'Corridor Ranger Milestone',
    bonusDescription: 'Walked 20 meters across the building corridor.',
    explorationXp: 250,
    explorationCoins: 120,
    explorationPointsReward: 70,
  },
  {
    distanceMeters: 35,
    tier: 'VANGUARD',
    title: 'Dev Lab Vanguard C',
    codename: 'ZONE-HACK-C',
    badge: '⭐',
    accentColor: '#0284C7', // Sky Blue
    bonusTitle: 'Dev Lab Vanguard Milestone',
    bonusDescription: 'Walked 35 meters to the hackathon lab wing.',
    explorationXp: 500,
    explorationCoins: 250,
    explorationPointsReward: 150,
  },
  {
    distanceMeters: 50,
    tier: 'APEX',
    title: 'Main Hall Apex D',
    codename: 'ZONE-HACK-D',
    badge: '⭐',
    accentColor: '#D97706', // Amber
    bonusTitle: 'Main Hall Apex Milestone',
    bonusDescription: 'Walked 50 meters into the central presentation hall.',
    explorationXp: 1000,
    explorationCoins: 500,
    explorationPointsReward: 350,
  },
  {
    distanceMeters: 75,
    tier: 'ENERGON',
    title: 'Atrium Gateway E',
    codename: 'ZONE-HACK-E',
    badge: '⭐',
    accentColor: '#7C3AED', // Purple
    bonusTitle: 'Atrium Gateway Milestone',
    bonusDescription: 'Walked 75 meters across the complex atrium.',
    explorationXp: 1500,
    explorationCoins: 800,
    explorationPointsReward: 600,
  },
  {
    distanceMeters: 100,
    tier: 'MYTHIC',
    title: 'Grand Hackathon Matrix',
    codename: 'ZONE-HACK-MASTER',
    badge: '🔴',
    accentColor: '#DC2626', // Red
    bonusTitle: 'Supreme Building Mastery',
    bonusDescription: 'Explored 100 meters across the entire hackathon venue. Unlocks maximum power scaling.',
    explorationXp: 2500,
    explorationCoins: 1200,
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
    maxDistanceMeters: 9.99,
    powerBonusPercent: 0,
    powerMultiplier: 1.0,
    budgetRating: 100,
    label: 'LOCAL BOOTH',
    badge: '⚪',
    accentColor: '#64748B',
    description: 'Baseline chassis power at starting booth. Walk 10m+ inside building to forge enhanced mechs.',
  },
  {
    tier: 'SCOUT',
    minDistanceMeters: 10,
    maxDistanceMeters: 19.99,
    powerBonusPercent: 10,
    powerMultiplier: 1.10,
    budgetRating: 125,
    label: 'HACKATHON SCOUT',
    badge: '🟢',
    accentColor: '#10B981',
    description: '10m Hallway reconnaissance (+10% chassis combat potential).',
  },
  {
    tier: 'RANGER',
    minDistanceMeters: 20,
    maxDistanceMeters: 34.99,
    powerBonusPercent: 20,
    powerMultiplier: 1.20,
    budgetRating: 150,
    label: 'CORRIDOR RANGER',
    badge: '🌲',
    accentColor: '#059669',
    description: '20m Building traversal (+20% chassis combat potential).',
  },
  {
    tier: 'VANGUARD',
    minDistanceMeters: 35,
    maxDistanceMeters: 49.99,
    powerBonusPercent: 30,
    powerMultiplier: 1.30,
    budgetRating: 180,
    label: 'DEV LAB VANGUARD',
    badge: '🔵',
    accentColor: '#0284C7',
    description: '35m Wing traversal (+30% chassis combat potential).',
  },
  {
    tier: 'ELITE',
    minDistanceMeters: 50,
    maxDistanceMeters: 74.99,
    powerBonusPercent: 40,
    powerMultiplier: 1.40,
    budgetRating: 220,
    label: 'MAIN HALL APEX',
    badge: '🟣',
    accentColor: '#7C3AED',
    description: '50m Core hall navigation (+40% chassis combat potential).',
  },
  {
    tier: 'EPIC',
    minDistanceMeters: 75,
    maxDistanceMeters: 99.99,
    powerBonusPercent: 50,
    powerMultiplier: 1.50,
    budgetRating: 260,
    label: 'ATRIUM MATRIX',
    badge: '🟡',
    accentColor: '#D97706',
    description: '75m Building expanse (+50% chassis combat potential).',
  },
  {
    tier: 'MYTHIC',
    minDistanceMeters: 100,
    maxDistanceMeters: Infinity,
    powerBonusPercent: 65,
    powerMultiplier: 1.65,
    budgetRating: 320,
    label: 'GRAND HACKATHON MATRIX',
    badge: '🔴',
    accentColor: '#DC2626',
    description: '100m Building apex mastery (+65% max bounded chassis potential).',
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
