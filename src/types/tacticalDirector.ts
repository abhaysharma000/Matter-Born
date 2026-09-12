import { CombatDNA, RealWorldEnvironment, BattleCreature } from './creature';

export type DetectedPlayerPattern =
  | 'RANGED_HEAVY'
  | 'MELEE_HEAVY'
  | 'AGGRESSIVE_RUSH'
  | 'DEFENSIVE_PLAY'
  | 'HIGH_DODGE'
  | 'HIGH_MOBILITY'
  | 'LONG_RANGE_KITING'
  | 'REPEATED_DASH'
  | 'ABILITY_SPAM'
  | 'LOW_MOBILITY'
  | 'BALANCED';

export type PredefinedTacticalStrategy =
  | 'AGGRESSIVE_RUSH'
  | 'CLOSE_COMBAT'
  | 'KEEP_DISTANCE'
  | 'RANGED_PRESSURE'
  | 'DEFENSIVE'
  | 'EVADE_AND_COUNTER'
  | 'CONTROL_ARENA'
  | 'SPECIAL_ABILITY_FOCUS';

export interface CombatObservationMetrics {
  attacksAttempted: number;
  attacksLanded: number;
  meleeAttacks: number;
  rangedAttacks: number;
  dodgeFrequency: number;
  dashFrequency: number;
  movementDistance: number;
  preferredCombatRange: number;
  timeSpentNearEnemy: number; // < 6 units
  timeSpentFarFromEnemy: number; // > 10 units
  damageDealtMelee: number;
  damageDealtRanged: number;
  damageDealtSpecial: number;
  damageReceived: number;
  specialUsageCount: number;
  repeatedMovementPatterns: string[];
  aggressionLevel: number; // 0.0 to 1.0
  defensiveBehavior: number; // 0.0 to 1.0
  windowDurationSeconds: number;
  sampleCount: number;
}

export interface GeminiTacticalRequestPayload {
  playerProfile: {
    name: string;
    robotClass?: string;
    element: string;
    combatDna?: CombatDNA;
    stats: { hp: number; attack: number; defense: number; speed: number };
    strengths?: string[];
    weaknesses?: string[];
  };
  enemyProfile: {
    name: string;
    robotClass?: string;
    element: string;
    combatDna?: CombatDNA;
    stats: { hp: number; attack: number; defense: number; speed: number };
    strengths?: string[];
    weaknesses?: string[];
  };
  arenaState: {
    environment: {
      name: string;
      weather: string;
      surfaceType: string;
      hazardNotice?: string;
    };
    distanceToPlayer: number;
    playerHpPercent: number;
    enemyHpPercent: number;
  };
  combatObservation: {
    attackDistribution: { melee: number; ranged: number; special: number; accuracy: number };
    movementBehavior: { avgRange: number; mobilityRate: number; timeNear: number; timeFar: number };
    dodgeBehavior: { dashesCount: number; dodgeFreq: number };
    preferredRange: number;
    detectedPlayerPattern: DetectedPlayerPattern;
    aggressionLevel: number;
    metrics: CombatObservationMetrics;
  };
  currentEnemyStrategy: PredefinedTacticalStrategy;
  recentStrategyHistory: PredefinedTacticalStrategy[];
}

export interface GeminiTacticalDecision {
  patternDetected: DetectedPlayerPattern;
  confidence: number; // 0.0 to 1.0
  currentStrategy: PredefinedTacticalStrategy;
  newStrategy: PredefinedTacticalStrategy;
  reason: string;
  preferredRange: number; // target distance in 3D units
  aggression: number; // 0.0 to 1.0
  attackFrequency: number; // 0.0 to 1.0
  dodgeFrequency: number; // 0.0 to 1.0
  dashFrequency: number; // 0.0 to 1.0
  specialPriority: number; // 0.0 to 1.0
  movementBias: 'CLOSE_DISTANCE' | 'MAINTAIN_RANGE' | 'FLANK_AND_CIRCLE' | 'RETREAT_TO_SAFETY' | 'SEEK_CENTER';
  targetPriority: 'PRESSURE_PLAYER' | 'INTERRUPT_RANGED' | 'OUTLAST_AND_COUNTER' | 'ZONE_HAZARDS' | 'BURST_ABILITY';
  counterToPlayer: string;
}

export interface TacticalPolicy {
  strategy: PredefinedTacticalStrategy;
  preferredRange: number;
  aggression: number;
  attackCadenceMultiplier: number; // lower = faster attacks
  dodgeDashProbability: number;
  strafeTendency: number;
  specialAbilityPriority: number;
  movementBias: string;
  targetPriority: string;
  counterLabel: string;
  reason: string;
  lastAdaptedTime: number;
  patternDetected: DetectedPlayerPattern;
  confidence: number;
  isAiAdapted: boolean;
}

export interface TacticalAdaptationEvent {
  id: string;
  timestamp: number;
  patternDetected: DetectedPlayerPattern;
  previousStrategy: PredefinedTacticalStrategy;
  newStrategy: PredefinedTacticalStrategy;
  counterTitle: string;
  reason: string;
  confidence: number;
}
