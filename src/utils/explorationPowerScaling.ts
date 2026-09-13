import { BattleCreature, CombatDNA } from '../types/creature';
import { 
  ScanPowerTierConfig, 
  ScanPowerTierName, 
  ExplorationScanMetadata 
} from '../types/exploration';
import { 
  SCAN_POWER_TIERS, 
  EXPLORATION_MILESTONES, 
  METERS_PER_EXPLORATION_POINT,
  MAX_EXPLORATION_BONUS_PERCENT 
} from '../constants/explorationConfig';

/**
 * Returns the corresponding Scan Power Tier configuration for a given distance in meters.
 * Deterministic and local — no network latency or API dependencies.
 */
export function getScanPowerTierConfig(distanceMeters: number): ScanPowerTierConfig {
  const safeDist = Math.max(0, Number(distanceMeters) || 0);

  for (let i = SCAN_POWER_TIERS.length - 1; i >= 0; i--) {
    const tier = SCAN_POWER_TIERS[i];
    if (safeDist >= tier.minDistanceMeters) {
      return tier;
    }
  }

  return SCAN_POWER_TIERS[0];
}

/**
 * Calculates continuous & milestone exploration points earned with anti-farming protection.
 * - Continuous points: awarded only for advancing new peak distance (maxDistanceReached)
 * - Milestone points: awarded strictly once per milestone reached during this expedition
 */
export function calculateExplorationRewardPoints(
  maxDistanceReached: number,
  claimedMilestones: number[]
): {
  continuousPoints: number;
  milestoneBonusPoints: number;
  totalSessionPoints: number;
  newMilestonesToClaim: number[];
} {
  const safePeak = Math.max(0, Number(maxDistanceReached) || 0);

  // Guaranteed EP on every 10m covered (100 EP per 10m interval)
  const tenMeterIntervals = Math.floor(safePeak / 10);
  const continuousPoints = tenMeterIntervals * 100;

  const newMilestonesToClaim: number[] = [];

  for (const milestone of EXPLORATION_MILESTONES) {
    if (safePeak >= milestone.distanceMeters) {
      if (!claimedMilestones.includes(milestone.distanceMeters)) {
        newMilestonesToClaim.push(milestone.distanceMeters);
      }
    }
  }

  return {
    continuousPoints,
    milestoneBonusPoints: 0,
    totalSessionPoints: continuousPoints,
    newMilestonesToClaim,
  };
}

/**
 * Analyzes object-specific properties to derive authentic trait specialization.
 * Section 13: Distance bonuses enhance the object's existing identity rather than erase it.
 */
export function deriveObjectTraitPerk(creature: Partial<BattleCreature>): {
  perkName: string;
  perkDescription: string;
  combatDnaBuffs: Partial<CombatDNA>;
} {
  const name = (creature.originalObject || creature.name || '').toLowerCase();
  const archetype = creature.visualParams?.objectArchetype || 'generic_item';
  const material = creature.materialPhysics?.materialName?.toLowerCase() || '';

  // 1. Footwear / Sneaker / Shoe -> Traction & Mobility
  if (
    archetype === 'footwear_shoe' ||
    name.includes('shoe') ||
    name.includes('sneaker') ||
    name.includes('boot') ||
    name.includes('sandal') ||
    material.includes('rubber')
  ) {
    return {
      perkName: 'Vulcanized Grip & Traction Surge',
      perkDescription: 'Dynamic ground grip increases sprint traction (+25%) and rotational turn agility.',
      combatDnaBuffs: {
        traction: 0.95,
        turnRate: 0.85,
        mobility: 0.88,
      },
    };
  }

  // 2. Metal Tool / Blade / Industrial -> Impact Poise & Hardening
  if (
    archetype === 'tool_blade' ||
    name.includes('tool') ||
    name.includes('knife') ||
    name.includes('blade') ||
    name.includes('hammer') ||
    name.includes('wrench') ||
    name.includes('drill') ||
    material.includes('steel') ||
    material.includes('metal')
  ) {
    return {
      perkName: 'Hardened Alloy Impact Core',
      perkDescription: 'Dense forged metallurgy boosts collision knockback (+30%) and kinetic armor absorption.',
      combatDnaBuffs: {
        meleePower: 0.92,
        knockbackResistance: 0.88,
        armorAbsorption: 0.85,
      },
    };
  }

  // 3. Plant / Organic / Fruit -> Nano-Regeneration & Vitality
  if (
    archetype === 'plant_organic' ||
    archetype === 'spherical_fruit' ||
    name.includes('plant') ||
    name.includes('flower') ||
    name.includes('succulent') ||
    name.includes('apple') ||
    name.includes('fruit') ||
    name.includes('tree') ||
    material.includes('chlorophyll') ||
    material.includes('organic')
  ) {
    return {
      perkName: 'Cellular Bioreactive Lattice',
      perkDescription: 'Organic matrix enables continuous passive repair and rapid environmental recovery.',
      combatDnaBuffs: {
        regenerationRate: 0.85,
        heatResistance: 0.75,
      },
    };
  }

  // 4. Electronics / Laptop / Phone -> Special Ability & Cooldown
  if (
    archetype === 'phone_tech' ||
    archetype === 'audio_headset' ||
    name.includes('phone') ||
    name.includes('laptop') ||
    name.includes('computer') ||
    name.includes('keyboard') ||
    name.includes('headphone') ||
    name.includes('screen') ||
    material.includes('silicon') ||
    material.includes('circuit')
  ) {
    return {
      perkName: 'Overclocked Silicon Pulse Array',
      perkDescription: 'High-frequency micro-processing accelerates special ability recharge and ranged precision.',
      combatDnaBuffs: {
        rangedPower: 0.90,
        electricalResistance: 0.85,
      },
    };
  }

  // 5. Ceramic / Glass / Cup / Mug -> Rigid Shield Dispersion
  if (
    archetype === 'cup_mug' ||
    archetype === 'bottle_can' ||
    name.includes('mug') ||
    name.includes('cup') ||
    name.includes('glass') ||
    name.includes('bottle') ||
    material.includes('ceramic') ||
    material.includes('glass')
  ) {
    return {
      perkName: 'Crystalline Thermal Shielding',
      perkDescription: 'Vitreous ceramic insulation deflects high thermal bursts and reinforces defensive poise.',
      combatDnaBuffs: {
        heatResistance: 0.92,
        defense: 0.85,
      },
    };
  }

  // Generic / Default Real-World Object
  return {
    perkName: 'Expedition Kinetic Calibration',
    perkDescription: 'Real-world physical density tuned for balanced athletic combat response in the 3D arena.',
    combatDnaBuffs: {
      mobility: 0.75,
      meleePower: 0.75,
      defense: 0.75,
    },
  };
}

/**
 * Applies distance-based power budget scaling to a generated BattleCreature.
 * Respects existing Object DNA and provides transparent causal explanation.
 * Hard-capped so real-world distance creates tangible power without breaking combat balance.
 */
export function applyExplorationPowerToCreature(
  baseCreature: BattleCreature,
  scanDistanceMeters: number,
  expeditionId: string
): BattleCreature {
  const safeDistance = Math.max(0, Math.round(Number(scanDistanceMeters) || 0));
  const tierConfig = getScanPowerTierConfig(safeDistance);

  // Bounded multiplier (1.0 to 1.65)
  const multiplier = Math.min(
    1 + MAX_EXPLORATION_BONUS_PERCENT / 100,
    Math.max(1.0, tierConfig.powerMultiplier)
  );
  const bonusFraction = multiplier - 1; // e.g. 0.20 for +20%

  // Compute bounded stat increments
  const baseHp = baseCreature.stats?.hp || 200;
  const baseAttack = baseCreature.stats?.attack || 60;
  const baseDefense = baseCreature.stats?.defense || 55;
  const baseSpeed = baseCreature.stats?.speed || 50;
  const baseAbilityDmg = baseCreature.specialAbility?.damage || 75;

  const hpBonus = Math.round(baseHp * bonusFraction * 0.7); // capped scaling
  const attackBonus = Math.round(baseAttack * bonusFraction * 0.8);
  const defenseBonus = Math.round(baseDefense * bonusFraction * 0.6);
  const speedBonus = Math.round(baseSpeed * bonusFraction * 0.35);
  const abilityDmgBonus = Math.round(baseAbilityDmg * bonusFraction * 0.75);

  const scaledStats = {
    hp: baseHp + hpBonus,
    attack: baseAttack + attackBonus,
    defense: baseDefense + defenseBonus,
    speed: baseSpeed + speedBonus,
  };

  const scaledAbility = baseCreature.specialAbility ? {
    ...baseCreature.specialAbility,
    damage: baseAbilityDmg + abilityDmgBonus,
    cooldown: Math.max(3.5, Number((baseCreature.specialAbility.cooldown * (1 - bonusFraction * 0.25)).toFixed(1))),
  } : {
    name: 'Kinetic Overdrive',
    description: 'Discharges stored expedition energy in a radial shockwave.',
    damage: 75 + abilityDmgBonus,
    cooldown: 5.0,
    vfxType: 'nova' as const,
  };

  // Trait specialization
  const { perkName, perkDescription, combatDnaBuffs } = deriveObjectTraitPerk(baseCreature);

  // Blend combat DNA
  const existingCombatDna = baseCreature.combatDna;
  const blendedCombatDna: CombatDNA = {
    mobility: Math.min(1.0, Math.max(0.2, (existingCombatDna?.mobility || 0.5) + (combatDnaBuffs.mobility ? 0.15 * bonusFraction : 0.08 * bonusFraction))),
    acceleration: Math.min(1.0, (existingCombatDna?.acceleration || 0.5) + 0.1 * bonusFraction),
    turnRate: Math.min(1.0, (existingCombatDna?.turnRate || 0.5) + (combatDnaBuffs.turnRate ? 0.2 * bonusFraction : 0.05 * bonusFraction)),
    massClass: existingCombatDna?.massClass || 0.5,
    knockbackResistance: Math.min(1.0, (existingCombatDna?.knockbackResistance || 0.5) + (combatDnaBuffs.knockbackResistance ? 0.2 * bonusFraction : 0.05 * bonusFraction)),
    meleePower: Math.min(1.0, (existingCombatDna?.meleePower || 0.5) + (combatDnaBuffs.meleePower ? 0.2 * bonusFraction : 0.1 * bonusFraction)),
    rangedPower: Math.min(1.0, (existingCombatDna?.rangedPower || 0.5) + (combatDnaBuffs.rangedPower ? 0.2 * bonusFraction : 0.08 * bonusFraction)),
    defense: Math.min(1.0, (existingCombatDna?.defense || 0.5) + (combatDnaBuffs.defense ? 0.2 * bonusFraction : 0.08 * bonusFraction)),
    armorAbsorption: Math.min(1.0, (existingCombatDna?.armorAbsorption || 0.4) + (combatDnaBuffs.armorAbsorption ? 0.2 * bonusFraction : 0.06 * bonusFraction)),
    impactForce: Math.min(1.0, (existingCombatDna?.impactForce || 0.5) + 0.1 * bonusFraction),
    electricalResistance: Math.min(1.0, (existingCombatDna?.electricalResistance || 0.4) + (combatDnaBuffs.electricalResistance || 0)),
    heatResistance: Math.min(1.0, (existingCombatDna?.heatResistance || 0.4) + (combatDnaBuffs.heatResistance || 0)),
    traction: Math.min(1.0, (existingCombatDna?.traction || 0.5) + (combatDnaBuffs.traction ? 0.2 * bonusFraction : 0.05 * bonusFraction)),
    regenerationRate: Math.min(1.0, (existingCombatDna?.regenerationRate || 0.1) + (combatDnaBuffs.regenerationRate ? 0.3 * bonusFraction : 0)),
    attackStyle: existingCombatDna?.attackStyle || 'Balanced Kinetic Strike',
    movementStyle: existingCombatDna?.movementStyle || 'Bipedal Strider',
    strengths: existingCombatDna?.strengths || [perkName],
    weaknesses: existingCombatDna?.weaknesses || ['Energy Drain'],
    derivedMechanics: existingCombatDna?.derivedMechanics || [],
    tacticalSummary: existingCombatDna?.tacticalSummary || `Forged with ${tierConfig.label} (+${tierConfig.powerBonusPercent}% power boost).`,
  };

  // Honest, deterministic AI causal explanation
  const causalExplanation = safeDistance === 0
    ? `Local Forge (0m): Baseline chassis power. Object DNA preserves authentic ${baseCreature.originalObject || 'artifact'} characteristics. Walk inside the venue (10m+) to forge enhanced fighters.`
    : `GPS measured ${safeDistance}m real-world exploration. Deterministic forge calculation assigned ${tierConfig.label} (+${tierConfig.powerBonusPercent}% power potential). Object DNA from your ${baseCreature.originalObject || 'artifact'} preserved authentic shape and materials, while unlocking ${perkName}.`;

  const metadata: ExplorationScanMetadata = {
    expeditionId: expeditionId || `exp-${Date.now()}`,
    scanDistanceMeters: safeDistance,
    scanTier: tierConfig.tier,
    tierBadge: tierConfig.badge,
    powerMultiplier: multiplier,
    explorationBonusPercent: tierConfig.powerBonusPercent,
    budgetRating: tierConfig.budgetRating,
    statBuffs: {
      hp: hpBonus,
      attack: attackBonus,
      defense: defenseBonus,
      speed: speedBonus,
      abilityDamage: abilityDmgBonus,
    },
    objectTraitPerk: perkName,
    scannedAt: Date.now(),
    originLocked: true,
    causalExplanation,
  };

  return {
    ...baseCreature,
    stats: scaledStats,
    specialAbility: scaledAbility,
    combatDna: blendedCombatDna,
    explorationDistanceMeters: safeDistance,
    explorationTier: tierConfig.label,
    explorationBonusTitle: perkName,
    explorationBonusPerk: perkDescription,
    explorationMetadata: metadata,
  };
}
