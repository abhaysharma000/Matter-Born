import { DiscoveryMilestoneConfig, ScanPowerTierConfig, ExplorationUpgradeItem } from '../types/exploration';

/**
 * Animatrix Real-World Exploration Constants & Rules
 * Centralized configuration — no magic numbers scattered in the codebase.
 */

// Safety & Stationary Detection
export const MIN_STATIONARY_DURATION = 2.0; // seconds player must remain stationary to scan
export const MIN_MOVEMENT_THRESHOLD = 0.30; // m/s (~1.0 km/h) threshold below which player is considered stopped indoors
export const GPS_ACCURACY_THRESHOLD = 85; // meters: relaxed to 85m for consumer devices, laptops & indoor GPS
export const MAX_REASONABLE_SPEED = 12.0; // m/s (~43 km/h): movement above this is flagged as vehicular/teleport
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
    title: '10m Distance Covered',
    codename: 'ZONE-10M',
    badge: '⚡',
    accentColor: '#10B981', // Emerald
    bonusTitle: '10m Distance Covered',
    bonusDescription: 'Walked 10 meters distance. +100 EP earned!',
    explorationXp: 100,
    explorationCoins: 50,
    explorationPointsReward: 100,
  },
  {
    distanceMeters: 20,
    tier: 'RANGER',
    title: '20m Distance Covered',
    codename: 'ZONE-20M',
    badge: '⚡',
    accentColor: '#059669', // Green
    bonusTitle: '20m Distance Covered',
    bonusDescription: 'Walked 20 meters distance. +100 EP earned!',
    explorationXp: 200,
    explorationCoins: 100,
    explorationPointsReward: 100,
  },
  {
    distanceMeters: 30,
    tier: 'VANGUARD',
    title: '30m Distance Covered',
    codename: 'ZONE-30M',
    badge: '⚡',
    accentColor: '#0284C7', // Sky Blue
    bonusTitle: '30m Distance Covered',
    bonusDescription: 'Walked 30 meters distance. +100 EP earned!',
    explorationXp: 300,
    explorationCoins: 150,
    explorationPointsReward: 100,
  },
  {
    distanceMeters: 40,
    tier: 'VANGUARD',
    title: '40m Distance Covered',
    codename: 'ZONE-40M',
    badge: '⚡',
    accentColor: '#0284C7',
    bonusTitle: '40m Distance Covered',
    bonusDescription: 'Walked 40 meters distance. +100 EP earned!',
    explorationXp: 400,
    explorationCoins: 200,
    explorationPointsReward: 100,
  },
  {
    distanceMeters: 50,
    tier: 'APEX',
    title: '50m Distance Covered',
    codename: 'ZONE-50M',
    badge: '⚡',
    accentColor: '#D97706', // Amber
    bonusTitle: '50m Distance Covered',
    bonusDescription: 'Walked 50 meters distance. +100 EP earned!',
    explorationXp: 500,
    explorationCoins: 250,
    explorationPointsReward: 100,
  },
  {
    distanceMeters: 60,
    tier: 'APEX',
    title: '60m Distance Covered',
    codename: 'ZONE-60M',
    badge: '⚡',
    accentColor: '#D97706',
    bonusTitle: '60m Distance Covered',
    bonusDescription: 'Walked 60 meters distance. +100 EP earned!',
    explorationXp: 600,
    explorationCoins: 300,
    explorationPointsReward: 100,
  },
  {
    distanceMeters: 70,
    tier: 'ENERGON',
    title: '70m Distance Covered',
    codename: 'ZONE-70M',
    badge: '⚡',
    accentColor: '#7C3AED', // Purple
    bonusTitle: '70m Distance Covered',
    bonusDescription: 'Walked 70 meters distance. +100 EP earned!',
    explorationXp: 700,
    explorationCoins: 350,
    explorationPointsReward: 100,
  },
  {
    distanceMeters: 80,
    tier: 'ENERGON',
    title: '80m Distance Covered',
    codename: 'ZONE-80M',
    badge: '⚡',
    accentColor: '#7C3AED',
    bonusTitle: '80m Distance Covered',
    bonusDescription: 'Walked 80 meters distance. +100 EP earned!',
    explorationXp: 800,
    explorationCoins: 400,
    explorationPointsReward: 100,
  },
  {
    distanceMeters: 90,
    tier: 'ENERGON',
    title: '90m Distance Covered',
    codename: 'ZONE-90M',
    badge: '⚡',
    accentColor: '#7C3AED',
    bonusTitle: '90m Distance Covered',
    bonusDescription: 'Walked 90 meters distance. +100 EP earned!',
    explorationXp: 900,
    explorationCoins: 450,
    explorationPointsReward: 100,
  },
  {
    distanceMeters: 100,
    tier: 'MYTHIC',
    title: '100m Master Milestone',
    codename: 'ZONE-100M',
    badge: '🔴',
    accentColor: '#DC2626', // Red
    bonusTitle: '100m Distance Covered',
    bonusDescription: 'Explored 100 meters distance. Maximum power scaling unlocked!',
    explorationXp: 1000,
    explorationCoins: 500,
    explorationPointsReward: 100,
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
export const EXPLORATION_STORAGE_KEY = 'animatrix_exploration_session_v4';
export const EXPLORATION_UPGRADES_STORAGE_KEY = 'animatrix_exploration_upgrades_v1';
export const LIFETIME_EP_STORAGE_KEY = 'animatrix_lifetime_exploration_points_v1';
export const LIFETIME_DISTANCE_STORAGE_KEY = 'animatrix_lifetime_distance_meters_v1';
export const BEST_EXPEDITION_STORAGE_KEY = 'animatrix_best_expedition_distance_meters_v1';
export const LIFETIME_TOTAL_EP_EARNED_KEY = 'animatrix_lifetime_total_ep_earned_v1';
