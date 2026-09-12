import { 
  CombatObservationMetrics, 
  DetectedPlayerPattern 
} from '../types/tacticalDirector';

interface AttackEvent {
  timestamp: number;
  isMelee: boolean;
  isSpecial: boolean;
  distanceToTarget: number;
}

interface HitEvent {
  timestamp: number;
  damage: number;
  type: 'melee' | 'ranged' | 'special';
}

interface DamageTakenEvent {
  timestamp: number;
  damage: number;
}

interface MovementSample {
  timestamp: number;
  distanceToEnemy: number;
  playerPos: { x: number; z: number };
}

export class CombatObserver {
  private windowDurationMs: number;
  
  // Rolling event buffers (pruned regularly)
  private attacks: AttackEvent[] = [];
  private hits: HitEvent[] = [];
  private damageTaken: DamageTakenEvent[] = [];
  private dashes: number[] = []; // timestamps
  private jumps: number[] = []; // timestamps
  private specials: number[] = []; // timestamps
  private samples: MovementSample[] = [];

  private lastRecordedPos: { x: number; z: number } | null = null;
  private totalDistanceTraveled: number = 0;
  private lastSampleTime: number = 0;

  constructor(windowDurationSeconds: number = 20) {
    this.windowDurationMs = windowDurationSeconds * 1000;
  }

  /**
   * Called whenever the player initiates an attack
   */
  public recordPlayerAttack(distanceToEnemy: number, isSpecial: boolean = false) {
    const now = performance.now();
    const isMelee = distanceToEnemy <= 5.5 && !isSpecial;
    this.attacks.push({
      timestamp: now,
      isMelee,
      isSpecial,
      distanceToTarget: distanceToEnemy,
    });
    this.pruneOldEvents(now);
  }

  /**
   * Called when player lands a hit on any target
   */
  public recordPlayerHitLanded(damage: number, type: 'melee' | 'ranged' | 'special') {
    const now = performance.now();
    this.hits.push({ timestamp: now, damage, type });
    this.pruneOldEvents(now);
  }

  /**
   * Called when player executes a dash / dodge
   */
  public recordPlayerDash() {
    const now = performance.now();
    this.dashes.push(now);
    this.pruneOldEvents(now);
  }

  /**
   * Called when player executes a jump
   */
  public recordPlayerJump() {
    const now = performance.now();
    this.jumps.push(now);
    this.pruneOldEvents(now);
  }

  /**
   * Called when player triggers their special ability
   */
  public recordPlayerSpecialAbility() {
    const now = performance.now();
    this.specials.push(now);
    this.pruneOldEvents(now);
  }

  /**
   * Called when player takes damage
   */
  public recordDamageTaken(amount: number) {
    const now = performance.now();
    this.damageTaken.push({ timestamp: now, damage: amount });
    this.pruneOldEvents(now);
  }

  /**
   * Called periodically (e.g. every 200-300ms from game loop) to track positions & distances
   */
  public samplePosition(playerPos: { x: number; z: number }, primaryEnemyPos: { x: number; z: number } | null) {
    const now = performance.now();
    if (now - this.lastSampleTime < 250) return; // 4 samples per second is optimal
    this.lastSampleTime = now;

    if (this.lastRecordedPos) {
      const step = Math.hypot(playerPos.x - this.lastRecordedPos.x, playerPos.z - this.lastRecordedPos.z);
      this.totalDistanceTraveled += step;
    }
    this.lastRecordedPos = { x: playerPos.x, z: playerPos.z };

    let distanceToEnemy = 15;
    if (primaryEnemyPos) {
      distanceToEnemy = Math.hypot(playerPos.x - primaryEnemyPos.x, playerPos.z - primaryEnemyPos.z);
    }

    this.samples.push({
      timestamp: now,
      distanceToEnemy,
      playerPos: { x: playerPos.x, z: playerPos.z },
    });

    this.pruneOldEvents(now);
  }

  /**
   * Prune rolling buffers outside windowDurationMs
   */
  private pruneOldEvents(now: number) {
    const cutoff = now - this.windowDurationMs;
    this.attacks = this.attacks.filter((a) => a.timestamp >= cutoff);
    this.hits = this.hits.filter((h) => h.timestamp >= cutoff);
    this.damageTaken = this.damageTaken.filter((d) => d.timestamp >= cutoff);
    this.dashes = this.dashes.filter((t) => t >= cutoff);
    this.jumps = this.jumps.filter((t) => t >= cutoff);
    this.specials = this.specials.filter((t) => t >= cutoff);
    this.samples = this.samples.filter((s) => s.timestamp >= cutoff);
  }

  /**
   * Aggregate current metrics across the active observation window
   */
  public getMetrics(): CombatObservationMetrics {
    const now = performance.now();
    this.pruneOldEvents(now);

    const attacksAttempted = this.attacks.length;
    const attacksLanded = this.hits.length;

    let meleeAttacks = 0;
    let rangedAttacks = 0;
    for (const a of this.attacks) {
      if (a.isSpecial) continue;
      if (a.isMelee) meleeAttacks++;
      else rangedAttacks++;
    }

    let damageDealtMelee = 0;
    let damageDealtRanged = 0;
    let damageDealtSpecial = 0;
    for (const h of this.hits) {
      if (h.type === 'melee') damageDealtMelee += h.damage;
      else if (h.type === 'ranged') damageDealtRanged += h.damage;
      else if (h.type === 'special') damageDealtSpecial += h.damage;
    }

    const damageReceived = this.damageTaken.reduce((acc, cur) => acc + cur.damage, 0);

    // Distance and time-zone metrics
    let totalDist = 0;
    let countNear = 0;
    let countFar = 0;
    for (const s of this.samples) {
      totalDist += s.distanceToEnemy;
      if (s.distanceToEnemy <= 6.0) countNear++;
      if (s.distanceToEnemy >= 10.5) countFar++;
    }

    const sampleCount = Math.max(1, this.samples.length);
    const preferredCombatRange = Number((totalDist / sampleCount).toFixed(1));
    const timeSpentNearEnemy = Number(((countNear / sampleCount) * (this.windowDurationMs / 1000)).toFixed(1));
    const timeSpentFarFromEnemy = Number(((countFar / sampleCount) * (this.windowDurationMs / 1000)).toFixed(1));

    // Mobility rate: approximate distance moved per second
    const windowSecs = this.windowDurationMs / 1000;
    const mobilityRate = Math.min(1.0, (this.totalDistanceTraveled / Math.max(1, windowSecs)) / 14);

    // Aggression calculation: combines forward presence, attack frequency, and close-range engagement
    const attackFrequencyNormalized = Math.min(1.0, attacksAttempted / 8);
    const closeRatio = countNear / sampleCount;
    const rawAggression = closeRatio * 0.45 + attackFrequencyNormalized * 0.45 + (meleeAttacks / Math.max(1, attacksAttempted)) * 0.10;
    const aggressionLevel = Number(Math.min(1.0, Math.max(0.1, rawAggression)).toFixed(2));

    // Defensive behavior: combines retreating, dash usage when hit, and staying at range
    const farRatio = countFar / sampleCount;
    const dashFactor = Math.min(1.0, this.dashes.length / 4);
    const rawDefensive = farRatio * 0.45 + dashFactor * 0.35 + (damageReceived > 0 && attacksAttempted <= 2 ? 0.20 : 0);
    const defensiveBehavior = Number(Math.min(1.0, Math.max(0.05, rawDefensive)).toFixed(2));

    const repeatedMovementPatterns: string[] = [];
    if (this.dashes.length >= 3) repeatedMovementPatterns.push('RAPID_EVASION_DASHING');
    if (this.jumps.length >= 3) repeatedMovementPatterns.push('FREQUENT_AERIAL_JUMPING');
    if (farRatio >= 0.65) repeatedMovementPatterns.push('PERIMETER_ORBIT_KITING');
    if (closeRatio >= 0.65) repeatedMovementPatterns.push('STICKY_CLOSE_QUARTERS');

    return {
      attacksAttempted,
      attacksLanded,
      meleeAttacks,
      rangedAttacks,
      dodgeFrequency: this.dashes.length,
      dashFrequency: this.dashes.length,
      movementDistance: Number(this.totalDistanceTraveled.toFixed(1)),
      preferredCombatRange,
      timeSpentNearEnemy,
      timeSpentFarFromEnemy,
      damageDealtMelee,
      damageDealtRanged,
      damageDealtSpecial,
      damageReceived,
      specialUsageCount: this.specials.length,
      repeatedMovementPatterns,
      aggressionLevel,
      defensiveBehavior,
      windowDurationSeconds: windowSecs,
      sampleCount,
    };
  }

  /**
   * Deterministically classifies the player's dominant tactical pattern
   * based strictly on sufficient evidence.
   */
  public detectPattern(metrics: CombatObservationMetrics): { pattern: DetectedPlayerPattern; confidence: number; evidence: string } {
    const totalAttacks = metrics.attacksAttempted;
    const dashes = metrics.dashFrequency;
    const specials = metrics.specialUsageCount;

    // Minimum action threshold to avoid premature false adaptation
    if (totalAttacks < 2 && dashes < 2 && metrics.sampleCount < 6) {
      return {
        pattern: 'BALANCED',
        confidence: 0.45,
        evidence: 'Insufficient telemetry samples gathered yet.',
      };
    }

    const rangedRatio = totalAttacks > 0 ? metrics.rangedAttacks / totalAttacks : 0;
    const meleeRatio = totalAttacks > 0 ? metrics.meleeAttacks / totalAttacks : 0;

    // 1. RANGED_HEAVY: High proportion of ranged attacks & maintains medium/long distance
    if ((metrics.rangedAttacks >= 3 && rangedRatio >= 0.65) || (metrics.rangedAttacks >= 2 && metrics.preferredCombatRange >= 9.0)) {
      const conf = Math.min(0.96, 0.70 + rangedRatio * 0.26);
      return {
        pattern: 'RANGED_HEAVY',
        confidence: Number(conf.toFixed(2)),
        evidence: `Player executed ${metrics.rangedAttacks} ranged attacks (${Math.round(rangedRatio * 100)}%) at an average range of ${metrics.preferredCombatRange}m.`,
      };
    }

    // 2. LONG_RANGE_KITING: High time far from enemy + ranged or evasion
    if (metrics.timeSpentFarFromEnemy > (metrics.windowDurationSeconds * 0.55) && metrics.preferredCombatRange >= 10.0) {
      return {
        pattern: 'LONG_RANGE_KITING',
        confidence: 0.89,
        evidence: `Player stayed at long range (>10m) for ${metrics.timeSpentFarFromEnemy}s of the active combat window.`,
      };
    }

    // 3. MELEE_HEAVY: High proportion of close-range attacks and stays close
    if (metrics.meleeAttacks >= 3 && meleeRatio >= 0.65) {
      const conf = Math.min(0.95, 0.70 + meleeRatio * 0.25);
      return {
        pattern: 'MELEE_HEAVY',
        confidence: Number(conf.toFixed(2)),
        evidence: `Player initiated ${metrics.meleeAttacks} close-range attacks (${Math.round(meleeRatio * 100)}%) inside 5.5m.`,
      };
    }

    // 4. AGGRESSIVE_RUSH: High aggression index, moving forward relentlessly
    if (metrics.aggressionLevel >= 0.72 && metrics.preferredCombatRange <= 6.5) {
      return {
        pattern: 'AGGRESSIVE_RUSH',
        confidence: 0.88,
        evidence: `Player exhibits relentless pressure (Aggression Index: ${metrics.aggressionLevel}) maintaining close proximity.`,
      };
    }

    // 5. REPEATED_DASH / HIGH_DODGE: High dash usage
    if (dashes >= 3) {
      return {
        pattern: 'REPEATED_DASH',
        confidence: 0.90,
        evidence: `Player triggered ${dashes} dashes/evasions in the last ${metrics.windowDurationSeconds}s.`,
      };
    }

    // 6. ABILITY_SPAM: Rapid special ability triggering
    if (specials >= 2) {
      return {
        pattern: 'ABILITY_SPAM',
        confidence: 0.86,
        evidence: `Player activated their special ability ${specials} times in rapid sequence.`,
      };
    }

    // 7. DEFENSIVE_PLAY: Low attacks, high evasion or retreat
    if (metrics.defensiveBehavior >= 0.65 && totalAttacks <= 2) {
      return {
        pattern: 'DEFENSIVE_PLAY',
        confidence: 0.82,
        evidence: `Player plays cautiously with high retreat ratio and minimal direct engagements.`,
      };
    }

    // 8. HIGH_MOBILITY vs LOW_MOBILITY
    if (metrics.movementDistance > 45) {
      return {
        pattern: 'HIGH_MOBILITY',
        confidence: 0.78,
        evidence: `Player covered high lateral distance (${metrics.movementDistance}m), continuously repositioning.`,
      };
    } else if (metrics.movementDistance < 10 && metrics.sampleCount >= 10) {
      return {
        pattern: 'LOW_MOBILITY',
        confidence: 0.75,
        evidence: `Player stands largely stationary (${metrics.movementDistance}m traveled) during combat.`,
      };
    }

    return {
      pattern: 'BALANCED',
      confidence: 0.70,
      evidence: `Player alternates between attack ranges and movement patterns evenly.`,
    };
  }

  /**
   * Reset buffers upon match start or restart
   */
  public reset() {
    this.attacks = [];
    this.hits = [];
    this.damageTaken = [];
    this.dashes = [];
    this.jumps = [];
    this.specials = [];
    this.samples = [];
    this.lastRecordedPos = null;
    this.totalDistanceTraveled = 0;
    this.lastSampleTime = 0;
  }
}
