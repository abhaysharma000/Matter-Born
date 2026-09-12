import { 
  DetectedPlayerPattern, 
  PredefinedTacticalStrategy, 
  GeminiTacticalRequestPayload, 
  GeminiTacticalDecision, 
  TacticalPolicy, 
  TacticalAdaptationEvent,
  CombatObservationMetrics
} from '../types/tacticalDirector';
import { CombatObserver } from './CombatObserver';
import { BattleCreature, ActiveFighter, RealWorldEnvironment } from '../types/creature';

export const VALID_STRATEGIES: PredefinedTacticalStrategy[] = [
  'AGGRESSIVE_RUSH',
  'CLOSE_COMBAT',
  'KEEP_DISTANCE',
  'RANGED_PRESSURE',
  'DEFENSIVE',
  'EVADE_AND_COUNTER',
  'CONTROL_ARENA',
  'SPECIAL_ABILITY_FOCUS',
];

export class AdaptiveCombatDirector {
  private observer: CombatObserver;
  private currentStrategy: PredefinedTacticalStrategy = 'KEEP_DISTANCE';
  private strategyHistory: PredefinedTacticalStrategy[] = ['KEEP_DISTANCE'];
  private currentPolicy: TacticalPolicy;

  private isAdapting: boolean = false;
  private lastAdaptationTimestamp: number = 0;
  private matchStartTimestamp: number = 0;
  private minAdaptationCooldownMs: number = 10000; // 10s cooldown
  private initialAdaptationDelayMs: number = 6000; // 6s after start

  private lastObservedPattern: DetectedPlayerPattern = 'BALANCED';
  private onAdaptationCallback?: (event: TacticalAdaptationEvent) => void;

  constructor(observer: CombatObserver) {
    this.observer = observer;
    this.currentPolicy = this.getInitialPolicy('KEEP_DISTANCE');
  }

  public setOnAdaptation(cb: (event: TacticalAdaptationEvent) => void) {
    this.onAdaptationCallback = cb;
  }

  public reset(initialStrategy: PredefinedTacticalStrategy = 'KEEP_DISTANCE') {
    this.currentStrategy = initialStrategy;
    this.strategyHistory = [initialStrategy];
    this.currentPolicy = this.getInitialPolicy(initialStrategy);
    this.isAdapting = false;
    this.lastAdaptationTimestamp = 0;
    this.matchStartTimestamp = performance.now();
    this.lastObservedPattern = 'BALANCED';
  }

  public getCurrentPolicy(): TacticalPolicy {
    return this.currentPolicy;
  }

  public getCurrentStrategy(): PredefinedTacticalStrategy {
    return this.currentStrategy;
  }

  public getLastObservedPattern(): DetectedPlayerPattern {
    return this.lastObservedPattern;
  }

  /**
   * Called on every game loop tick (60 FPS) from ThreeArenaEngine.
   * NEVER blocks the render loop. Only checks timing thresholds to launch
   * an infrequent asynchronous background adaptation request.
   */
  public update(
    player: ActiveFighter,
    primaryEnemy: ActiveFighter,
    environment: RealWorldEnvironment
  ) {
    if (!player || !primaryEnemy || player.isDead || primaryEnemy.isDead) return;

    const now = performance.now();
    if (this.matchStartTimestamp === 0) {
      this.matchStartTimestamp = now;
    }

    // 1. Minimum delay check (give player time to establish playstyle)
    const matchElapsed = now - this.matchStartTimestamp;
    if (matchElapsed < this.initialAdaptationDelayMs) return;

    // 2. Cooldown check: prevent frequent adaptation thrashing
    const timeSinceLastAdaptation = now - this.lastAdaptationTimestamp;
    if (timeSinceLastAdaptation < this.minAdaptationCooldownMs) return;

    if (this.isAdapting) return;

    // 3. Evaluate observation metrics
    const metrics = this.observer.getMetrics();
    const { pattern, confidence } = this.observer.detectPattern(metrics);
    this.lastObservedPattern = pattern;

    // Check if adaptation should trigger:
    // Case A: Periodic interval reached (~14s)
    const isIntervalTrigger = timeSinceLastAdaptation >= 14000;
    
    // Case B: Meaningful tactical event (player strongly shifted to a clear pattern different from current counter)
    const isPatternShiftTrigger = 
      pattern !== 'BALANCED' && 
      confidence >= 0.82 && 
      !this.isStrategyEffectiveAgainstPattern(this.currentStrategy, pattern);

    // Case C: Major HP shift (>35% health loss since last adaptation)
    const enemyHpRatio = primaryEnemy.currentHp / primaryEnemy.maxHp;
    const isCriticalHpTrigger = enemyHpRatio < 0.40 && this.currentStrategy !== 'DEFENSIVE' && this.currentStrategy !== 'EVADE_AND_COUNTER';

    if (isIntervalTrigger || isPatternShiftTrigger || isCriticalHpTrigger) {
      this.requestTacticalAdaptation(player, primaryEnemy, environment, metrics, pattern, confidence);
    }
  }

  /**
   * Checks if current strategy is already a natural counter to the pattern
   */
  private isStrategyEffectiveAgainstPattern(strategy: PredefinedTacticalStrategy, pattern: DetectedPlayerPattern): boolean {
    if (pattern === 'RANGED_HEAVY' && (strategy === 'AGGRESSIVE_RUSH' || strategy === 'CLOSE_COMBAT')) return true;
    if (pattern === 'MELEE_HEAVY' && (strategy === 'KEEP_DISTANCE' || strategy === 'EVADE_AND_COUNTER')) return true;
    if (pattern === 'LONG_RANGE_KITING' && (strategy === 'AGGRESSIVE_RUSH' || strategy === 'CONTROL_ARENA')) return true;
    if (pattern === 'DEFENSIVE_PLAY' && (strategy === 'SPECIAL_ABILITY_FOCUS' || strategy === 'AGGRESSIVE_RUSH')) return true;
    if (pattern === 'REPEATED_DASH' && (strategy === 'RANGED_PRESSURE' || strategy === 'CONTROL_ARENA')) return true;
    return false;
  }

  /**
   * Dispatches asynchronous server-side Gemini request with fallback guarantees
   */
  private async requestTacticalAdaptation(
    player: ActiveFighter,
    primaryEnemy: ActiveFighter,
    environment: RealWorldEnvironment,
    metrics: CombatObservationMetrics,
    pattern: DetectedPlayerPattern,
    patternConfidence: number
  ) {
    this.isAdapting = true;
    this.lastAdaptationTimestamp = performance.now();

    const distance = Math.hypot(player.x - primaryEnemy.x, player.z - primaryEnemy.z);

    const payload: GeminiTacticalRequestPayload = {
      playerProfile: {
        name: player.creature.name,
        robotClass: player.creature.robotClass,
        element: player.creature.element,
        combatDna: player.combatDna || player.creature.combatDna,
        stats: player.creature.stats,
        strengths: player.creature.objectDna?.gameplayIdentity?.strengths,
        weaknesses: player.creature.objectDna?.gameplayIdentity?.weaknesses,
      },
      enemyProfile: {
        name: primaryEnemy.creature.name,
        robotClass: primaryEnemy.creature.robotClass,
        element: primaryEnemy.creature.element,
        combatDna: primaryEnemy.combatDna || primaryEnemy.creature.combatDna,
        stats: primaryEnemy.creature.stats,
        strengths: primaryEnemy.creature.objectDna?.gameplayIdentity?.strengths,
        weaknesses: primaryEnemy.creature.objectDna?.gameplayIdentity?.weaknesses,
      },
      arenaState: {
        environment: {
          name: environment.name,
          weather: environment.weather,
          surfaceType: environment.elevation,
          hazardNotice: environment.aiHazardName,
        },
        distanceToPlayer: Number(distance.toFixed(1)),
        playerHpPercent: Math.round((player.currentHp / player.maxHp) * 100),
        enemyHpPercent: Math.round((primaryEnemy.currentHp / primaryEnemy.maxHp) * 100),
      },
      combatObservation: {
        attackDistribution: {
          melee: metrics.meleeAttacks,
          ranged: metrics.rangedAttacks,
          special: metrics.specialUsageCount,
          accuracy: metrics.attacksAttempted > 0 ? Number((metrics.attacksLanded / metrics.attacksAttempted).toFixed(2)) : 0,
        },
        movementBehavior: {
          avgRange: metrics.preferredCombatRange,
          mobilityRate: Number(metrics.movementDistance.toFixed(1)),
          timeNear: metrics.timeSpentNearEnemy,
          timeFar: metrics.timeSpentFarFromEnemy,
        },
        dodgeBehavior: {
          dashesCount: metrics.dashFrequency,
          dodgeFreq: metrics.dodgeFrequency,
        },
        preferredRange: metrics.preferredCombatRange,
        detectedPlayerPattern: pattern,
        aggressionLevel: metrics.aggressionLevel,
        metrics,
      },
      currentEnemyStrategy: this.currentStrategy,
      recentStrategyHistory: this.strategyHistory.slice(-4),
    };

    let decision: GeminiTacticalDecision | null = null;
    let isAiGenerated = false;

    try {
      // 4000ms strict timeout using AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch('/api/combat/tactical-director', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (this.validateDecision(data)) {
          decision = data;
          isAiGenerated = !!(data as unknown as { isAIGenerated?: boolean }).isAIGenerated;
        }
      }
    } catch {
      // Network failure, timeout, or server unavailable
      decision = null;
    }

    // Failsafe behavior: If Gemini output is missing, invalid, or timed out,
    // immediately evaluate deterministic tactical rule engine
    if (!decision) {
      decision = this.generateDeterministicTacticalDecision(payload, pattern, patternConfidence);
      isAiGenerated = false;
    }

    this.applyTacticalDecision(decision, isAiGenerated);
    this.isAdapting = false;
  }

  /**
   * Validates Gemini output strictly against predefined schema and strategies
   */
  private validateDecision(data: any): data is GeminiTacticalDecision {
    if (!data || typeof data !== 'object') return false;
    if (!VALID_STRATEGIES.includes(data.newStrategy)) return false;
    if (typeof data.confidence !== 'number' || data.confidence < 0 || data.confidence > 1) return false;
    if (typeof data.preferredRange !== 'number' || data.preferredRange < 2 || data.preferredRange > 25) return false;
    if (typeof data.aggression !== 'number') return false;
    return true;
  }

  /**
   * Deterministic local Tactical Engine (Guaranteed 100% reliable fallback)
   */
  public generateDeterministicTacticalDecision(
    payload: GeminiTacticalRequestPayload,
    pattern: DetectedPlayerPattern,
    confidence: number
  ): GeminiTacticalDecision {
    const current = this.currentStrategy;
    let newStrategy: PredefinedTacticalStrategy = 'AGGRESSIVE_RUSH';
    let reason = '';
    let counterToPlayer = '';
    let preferredRange = 4.0;
    let aggression = 0.85;
    let attackFreq = 0.80;
    let dodgeFreq = 0.40;
    let dashFreq = 0.75;
    let specialPriority = 0.60;
    let movementBias: GeminiTacticalDecision['movementBias'] = 'CLOSE_DISTANCE';
    let targetPriority: GeminiTacticalDecision['targetPriority'] = 'PRESSURE_PLAYER';

    switch (pattern) {
      case 'RANGED_HEAVY':
      case 'LONG_RANGE_KITING':
        newStrategy = 'AGGRESSIVE_RUSH';
        preferredRange = 3.2;
        aggression = 0.90;
        dashFreq = 0.85;
        attackFreq = 0.85;
        movementBias = 'CLOSE_DISTANCE';
        targetPriority = 'PRESSURE_PLAYER';
        counterToPlayer = 'Close distance rapidly + aggressive melee interruption';
        reason = `Player relies on ranged attacks from ${payload.combatObservation.preferredRange}m. Closing distance to disrupt projectile aiming.`;
        break;

      case 'MELEE_HEAVY':
      case 'AGGRESSIVE_RUSH':
        newStrategy = 'EVADE_AND_COUNTER';
        preferredRange = 9.5;
        aggression = 0.45;
        dodgeFreq = 0.85;
        dashFreq = 0.80;
        attackFreq = 0.65;
        movementBias = 'FLANK_AND_CIRCLE';
        targetPriority = 'OUTLAST_AND_COUNTER';
        counterToPlayer = 'Evade rush attacks + punish cooldown recovery';
        reason = `Player is aggressively pressing close quarters. Lateral evasion and counter-attacks will exploit their forward overextension.`;
        break;

      case 'REPEATED_DASH':
      case 'HIGH_DODGE':
      case 'HIGH_MOBILITY':
        newStrategy = 'RANGED_PRESSURE';
        preferredRange = 11.0;
        aggression = 0.60;
        attackFreq = 0.90;
        movementBias = 'MAINTAIN_RANGE';
        targetPriority = 'INTERRUPT_RANGED';
        counterToPlayer = 'Wide-spread projectile barrage to catch dash recovery';
        reason = `Player uses frequent evasive dashes. Sustained ranged projectile pressure will tag them during cooldown windows.`;
        break;

      case 'DEFENSIVE_PLAY':
      case 'LOW_MOBILITY':
        newStrategy = 'SPECIAL_ABILITY_FOCUS';
        preferredRange = 5.5;
        aggression = 0.75;
        specialPriority = 0.95;
        movementBias = 'SEEK_CENTER';
        targetPriority = 'BURST_ABILITY';
        counterToPlayer = 'Corner target + unleash high-impact special burst';
        reason = `Player remains stationary and defensive. Charging special ability to break through guard posture.`;
        break;

      case 'ABILITY_SPAM':
        newStrategy = 'KEEP_DISTANCE';
        preferredRange = 13.5;
        aggression = 0.35;
        dodgeFreq = 0.75;
        movementBias = 'RETREAT_TO_SAFETY';
        targetPriority = 'OUTLAST_AND_COUNTER';
        counterToPlayer = 'Zone outside blast radius until ability exhausts';
        reason = `Player spams high-damage abilities. Maintaining safe perimeter distance until their cooldowns trigger.`;
        break;

      default:
        // BALANCED
        newStrategy = current === 'KEEP_DISTANCE' ? 'AGGRESSIVE_RUSH' : 'CLOSE_COMBAT';
        preferredRange = 5.0;
        aggression = 0.70;
        counterToPlayer = 'Adaptive balanced pressure';
        reason = `Player displays balanced combat tactics. Maintaining adaptable engagement posture.`;
        break;
    }

    return {
      patternDetected: pattern,
      confidence: Math.max(0.70, confidence),
      currentStrategy: current,
      newStrategy,
      reason,
      preferredRange,
      aggression,
      attackFrequency: attackFreq,
      dodgeFrequency: dodgeFreq,
      dashFrequency: dashFreq,
      specialPriority,
      movementBias,
      targetPriority,
      counterToPlayer,
    };
  }

  /**
   * Applies the validated decision to the active TacticalPolicy
   */
  private applyTacticalDecision(decision: GeminiTacticalDecision, isAiGenerated: boolean) {
    const prevStrategy = this.currentStrategy;
    this.currentStrategy = decision.newStrategy;
    this.strategyHistory.push(decision.newStrategy);

    // Map tactical parameters to concrete FSM execution policy
    this.currentPolicy = {
      strategy: decision.newStrategy,
      preferredRange: Math.max(2.5, Math.min(16.0, decision.preferredRange)),
      aggression: Math.max(0.1, Math.min(1.0, decision.aggression)),
      attackCadenceMultiplier: Number((1.6 - decision.attackFrequency * 0.9).toFixed(2)), // 0.7s to 1.5s
      dodgeDashProbability: Math.max(0.1, Math.min(0.9, decision.dashFrequency)),
      strafeTendency: decision.movementBias === 'FLANK_AND_CIRCLE' ? 0.85 : 0.25,
      specialAbilityPriority: decision.specialPriority,
      movementBias: decision.movementBias,
      targetPriority: decision.targetPriority,
      counterLabel: decision.counterToPlayer,
      reason: decision.reason,
      lastAdaptedTime: performance.now(),
      patternDetected: decision.patternDetected,
      confidence: decision.confidence,
      isAiAdapted: isAiGenerated,
    };

    // Notify HUD and system listeners
    if (this.onAdaptationCallback) {
      this.onAdaptationCallback({
        id: `adapt-${Date.now()}`,
        timestamp: Date.now(),
        patternDetected: decision.patternDetected,
        previousStrategy: prevStrategy,
        newStrategy: decision.newStrategy,
        counterTitle: decision.counterToPlayer,
        reason: decision.reason,
        confidence: Math.round(decision.confidence * 100),
      });
    }
  }

  /**
   * Helper to create initial default policy
   */
  private getInitialPolicy(strategy: PredefinedTacticalStrategy): TacticalPolicy {
    return {
      strategy,
      preferredRange: 12.0,
      aggression: 0.50,
      attackCadenceMultiplier: 1.2,
      dodgeDashProbability: 0.30,
      strafeTendency: 0.30,
      specialAbilityPriority: 0.50,
      movementBias: 'MAINTAIN_RANGE',
      targetPriority: 'PRESSURE_PLAYER',
      counterLabel: 'Probing player combat style',
      reason: 'Initial match phase. Evaluating player attack distribution and agility.',
      lastAdaptedTime: performance.now(),
      patternDetected: 'BALANCED',
      confidence: 0.50,
      isAiAdapted: false,
    };
  }

  /**
   * Forces an immediate tactical adaptation (e.g. from developer testing or manual inspector trigger)
   */
  public async forceAdaptation(
    player?: ActiveFighter | null,
    primaryEnemy?: ActiveFighter | null,
    environment?: RealWorldEnvironment | null,
    forcedPattern?: DetectedPlayerPattern
  ): Promise<TacticalPolicy> {
    if (!player || !primaryEnemy || !environment) {
      return this.currentPolicy;
    }
    const metrics = this.observer.getMetrics();
    const detected = this.observer.detectPattern(metrics);
    const pattern = forcedPattern || detected.pattern;
    const confidence = forcedPattern ? 0.95 : detected.confidence;

    this.isAdapting = false; // Reset waiting state
    await this.requestTacticalAdaptation(player, primaryEnemy, environment, metrics, pattern, confidence);
    return this.currentPolicy;
  }
}
