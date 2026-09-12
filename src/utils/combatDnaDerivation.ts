import {
  BattleCreature,
  CombatDNA,
  DerivedMechanic,
  RealWorldMaterialPhysics,
} from '../types/creature';

/**
 * Combat DNA Derivation Engine 3.0
 * 
 * Causally maps:
 * REAL OBJECT PHOTO → PHYSICAL PROPERTIES → GAMEPLAY MECHANICS → ACTUAL COMBAT CONSEQUENCE
 * 
 * Deterministic, normalized (0.0 to 1.0, baseline 0.50), with strictly bounded gameplay multipliers
 * to ensure balance while making distinct physical profiles (e.g. Sneaker vs. Heavy Metal V8)
 * immediately distinct in movement, traction, knockback poise, and combat mechanics.
 */

// Helper to clamp values safely between min and max
function clamp(val: number, min = 0.05, max = 0.98): number {
  return Math.max(min, Math.min(max, Math.round(val * 100) / 100));
}

export function deriveCombatDna(creature: Partial<BattleCreature>): CombatDNA {
  const objName = (
    creature.originalObject ||
    creature.objectDna?.objectIdentity?.canonicalName ||
    creature.name ||
    'Physical Artifact'
  ).toLowerCase();

  const matName = (
    creature.materialPhysics?.materialName ||
    creature.visualTransmutation?.surfaceMaterial ||
    creature.objectDna?.physicalIdentity?.materialCandidates?.[0] ||
    ''
  ).toLowerCase();

  const scaleTier = (
    creature.objectComplexity?.scaleTier ||
    creature.objectDna?.physicalIdentity?.estimatedSizeClass ||
    'medium'
  );

  const silhouette = (
    creature.visualTransmutation?.silhouette ||
    creature.visualParams?.primaryShape ||
    ''
  );

  // Baseline stats (balanced baseline = 0.50)
  let mobility = 0.50;
  let acceleration = 0.50;
  let turnRate = 0.50;
  let massClass = 0.50;
  let knockbackResistance = 0.50;
  let meleePower = 0.50;
  let rangedPower = 0.50;
  let defense = 0.50;
  let electricalResistance = 0.50;
  let heatResistance = 0.50;
  let traction = 0.50;
  let regenerationRate = 0.25;

  let attackStyle = 'Kinetic Blaster & Standard Striking';
  let movementStyle = 'Standard Ground Stride';
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const derivedMechanics: DerivedMechanic[] = [];

  // ========================================================
  // 1. PHYSICAL SCALE & MASS TIER DERIVATION
  // ========================================================
  switch (scaleTier) {
    case 'colossal':
      massClass = 0.95;
      knockbackResistance = 0.92;
      defense = 0.85;
      meleePower = 0.82;
      mobility = 0.28;
      acceleration = 0.25;
      turnRate = 0.32;
      movementStyle = 'Colossal Titan Stomp';
      derivedMechanics.push({
        physicalProperty: 'Colossal Physical Mass (>150 kg structure)',
        mechanic: 'Heavy Mass Poise',
        gameplayEffect: '-70% Knockback received from rival attacks & +35% impact shock',
        magnitude: 0.70,
      });
      break;

    case 'large':
      massClass = 0.75;
      knockbackResistance = 0.76;
      defense = 0.70;
      meleePower = 0.68;
      mobility = 0.40;
      acceleration = 0.38;
      turnRate = 0.42;
      movementStyle = 'Heavy Armored Advance';
      derivedMechanics.push({
        physicalProperty: 'Large Industrial Chassis (10-150 kg mass)',
        mechanic: 'Reinforced Impact Displacement',
        gameplayEffect: '-45% Knockback received & +25% melee knockback inflicted',
        magnitude: 0.45,
      });
      break;

    case 'medium':
      massClass = 0.50;
      knockbackResistance = 0.50;
      defense = 0.50;
      mobility = 0.52;
      acceleration = 0.52;
      turnRate = 0.52;
      movementStyle = 'Agile Bipedal Combat Stride';
      break;

    case 'compact':
      massClass = 0.32;
      knockbackResistance = 0.30;
      mobility = 0.70;
      acceleration = 0.72;
      turnRate = 0.70;
      defense = 0.40;
      movementStyle = 'Rapid Infiltrator Skirmish';
      derivedMechanics.push({
        physicalProperty: 'Compact Inertial Mass (<3 kg payload)',
        mechanic: 'Low Inertia Agility',
        gameplayEffect: '+20% Sprint ramp-up speed & -20% dash cooldown',
        magnitude: 0.20,
      });
      break;

    case 'micro':
      massClass = 0.15;
      knockbackResistance = 0.18;
      mobility = 0.88;
      acceleration = 0.90;
      turnRate = 0.88;
      defense = 0.28;
      movementStyle = 'High-Frequency Speed Skitter';
      derivedMechanics.push({
        physicalProperty: 'Micro-Scale Mass Profile (<0.5 kg artifact)',
        mechanic: 'Featherweight Velocity Burst',
        gameplayEffect: '+35% Sprint mobility & rapid pivot, +30% knockback vulnerability',
        magnitude: 0.35,
      });
      weaknesses.push('Vulnerable to heavy knockback displacement due to micro mass');
      break;
  }

  // ========================================================
  // 2. PRIMARY MATERIAL PHYSICS DERIVATION
  // ========================================================
  const isRubber =
    matName.includes('rubber') ||
    objName.includes('shoe') ||
    objName.includes('sneaker') ||
    objName.includes('boot') ||
    objName.includes('tire');

  const isMetal =
    matName.includes('steel') ||
    matName.includes('iron') ||
    matName.includes('metal') ||
    matName.includes('aluminum') ||
    objName.includes('wrench') ||
    objName.includes('drill') ||
    objName.includes('engine') ||
    objName.includes('car') ||
    objName.includes('knife') ||
    objName.includes('can') ||
    objName.includes('bike');

  const isCeramic =
    matName.includes('ceramic') ||
    matName.includes('porcelain') ||
    objName.includes('mug') ||
    objName.includes('cup') ||
    objName.includes('plate') ||
    objName.includes('vase');

  const isPlastic =
    matName.includes('plastic') ||
    matName.includes('polymer') ||
    matName.includes('polycarbonate');

  const isOrganic =
    matName.includes('plant') ||
    matName.includes('chlorophyll') ||
    matName.includes('wood') ||
    matName.includes('leaf') ||
    objName.includes('plant') ||
    objName.includes('tree') ||
    objName.includes('succulent') ||
    objName.includes('flower') ||
    objName.includes('apple') ||
    objName.includes('fruit');

  const isElectronics =
    matName.includes('silicon') ||
    matName.includes('circuit') ||
    objName.includes('laptop') ||
    objName.includes('phone') ||
    objName.includes('computer') ||
    objName.includes('tablet') ||
    objName.includes('keyboard') ||
    objName.includes('screen');

  const isGlass =
    matName.includes('glass') ||
    matName.includes('vitreous') ||
    objName.includes('lens') ||
    objName.includes('mirror') ||
    objName.includes('window');

  const isCardboard =
    matName.includes('cardboard') ||
    matName.includes('cellulose') ||
    matName.includes('paper') ||
    objName.includes('box') ||
    objName.includes('carton') ||
    objName.includes('package');

  // A. Rubber / High-Traction Polymer
  if (isRubber) {
    traction = 0.92;
    mobility += 0.18;
    acceleration += 0.22;
    electricalResistance = 0.88;
    heatResistance = 0.35;
    knockbackResistance -= 0.12;

    derivedMechanics.push({
      physicalProperty: 'Vulcanized Rubber Tread & Sole Grip',
      mechanic: 'High-Traction Ground Adhesion',
      gameplayEffect: 'Zero slip penalty on wet/slick arenas & +25% dash distance',
      magnitude: 0.25,
    });
    derivedMechanics.push({
      physicalProperty: 'Dielectric Rubber Polymer Composition',
      mechanic: 'Static Electrical Insulation',
      gameplayEffect: '-40% Electrical & shock damage, immune to ground charge',
      magnitude: -0.40,
    });
    strengths.push('Immune to wet arena slipping with supreme ground traction');
    strengths.push('High dielectric insulation against electric attacks');
    weaknesses.push('Elastic structure provides less protection against sharp piercing blows');
  }

  // B. Metal / Heavy Structural Alloy
  if (isMetal) {
    massClass += 0.15;
    knockbackResistance += 0.22;
    meleePower += 0.20;
    defense += 0.18;
    electricalResistance = 0.25; // Conductive!
    heatResistance = 0.72;
    acceleration -= 0.10;

    derivedMechanics.push({
      physicalProperty: 'High-Density Ferrous Alloy Hull',
      mechanic: 'Kinetic Momentum Mass',
      gameplayEffect: '+30% Knockback delivered on basic strikes & heavy stagger resistance',
      magnitude: 0.30,
    });
    derivedMechanics.push({
      physicalProperty: 'High Electrical Conductivity',
      mechanic: 'Galvanic Shock Susceptibility',
      gameplayEffect: '+35% Lightning & shock damage received in thunderstorms',
      magnitude: 0.35,
    });
    strengths.push('Devastating kinetic melee impact with high knockback resistance');
    weaknesses.push('High electrical conductivity causes severe shock vulnerability');
  }

  // C. Ceramic / Vitreous
  if (isCeramic) {
    heatResistance = 0.95;
    electricalResistance = 0.85;
    defense += 0.12;
    traction = 0.42; // Slick glazed ceramic

    derivedMechanics.push({
      physicalProperty: 'Vitreous Glazed Ceramic Thermal Shielding',
      mechanic: 'Refractory Thermal Dissipation',
      gameplayEffect: '-55% Fire & heatwave damage taken, immunity to arena burn hazards',
      magnitude: -0.55,
    });
    derivedMechanics.push({
      physicalProperty: 'Brittle Crystalline Lattice',
      mechanic: 'Fracture Vulnerability',
      gameplayEffect: '+25% Damage taken from blunt heavy impact / rock abilities',
      magnitude: 0.25,
    });
    strengths.push('Near complete immunity to fire and extreme heat burn damage');
    weaknesses.push('Brittle structure suffers bonus fracture damage from heavy blunt hits');
  }

  // D. Organic / Plant Chlorophyll
  if (isOrganic) {
    regenerationRate = 0.88;
    heatResistance = 0.22; // Flammable!
    electricalResistance = 0.65;
    mobility += 0.10;

    derivedMechanics.push({
      physicalProperty: 'Photosynthetic / Chlorophyll Cellular Lattice',
      mechanic: 'Biomimetic Energon Regeneration',
      gameplayEffect: 'Heals 5 HP/sec continuously when not taking damage for 4 seconds',
      magnitude: 0.50,
    });
    derivedMechanics.push({
      physicalProperty: 'Combustible Organic Cellulose',
      mechanic: 'Thermal Combustibility',
      gameplayEffect: '+50% Fire burn duration & susceptibility to heatwave arena hazards',
      magnitude: 0.50,
    });
    strengths.push('Passive auto-repair nanotech regeneration when out of direct combat');
    weaknesses.push('Highly vulnerable to fire and incinerating abilities');
  }

  // E. Electronics & Silicon Computing
  if (isElectronics) {
    rangedPower += 0.28;
    turnRate += 0.15;
    electricalResistance = 0.20; // Highly vulnerable to EMP!

    derivedMechanics.push({
      physicalProperty: 'Silicon Microprocessor / Sensor HUD Array',
      mechanic: 'Target Trajectory Calculation',
      gameplayEffect: '+25% Projectile speed and +20% ranged blast radius',
      magnitude: 0.25,
    });
    derivedMechanics.push({
      physicalProperty: 'Unshielded Integrated Circuitry',
      mechanic: 'EMP Susceptibility',
      gameplayEffect: '+40% Stun duration from electric/lightning surges',
      magnitude: 0.40,
    });
    attackStyle = 'High-Precision Energon Blaster Arrays';
    strengths.push('Superior ranged projectile speed, precision, and ability recharge');
    weaknesses.push('Sensitive micro-circuits are vulnerable to EMP and electric stuns');
  }

  // F. Cardboard / Packaging Fiber
  if (isCardboard) {
    massClass = 0.28;
    mobility += 0.16;
    acceleration += 0.18;
    defense -= 0.15;
    heatResistance = 0.18;
    electricalResistance = 0.80;

    derivedMechanics.push({
      physicalProperty: 'Lightweight Corrugated Fluting Structure',
      mechanic: 'Low-Mass Evasive Step',
      gameplayEffect: '-25% Dash stamina cost & snappy sprint velocity',
      magnitude: 0.25,
    });
    derivedMechanics.push({
      physicalProperty: 'Dry Paperboard Fluting',
      mechanic: 'Rapid Combustion',
      gameplayEffect: '+60% Fire damage taken; quickly incinerated by flame attacks',
      magnitude: 0.60,
    });
    strengths.push('Low-inertia chassis enables frequent, low-cost evasive dashes');
    weaknesses.push('Fragile fluting takes extreme damage from fire attacks');
  }

  // ========================================================
  // 3. SPECIFIC SIGNATURE OBJECT OVERRIDES
  // ========================================================
  if (objName.includes('shoe') || objName.includes('sneaker') || objName.includes('boot')) {
    mobility = Math.max(mobility, 0.78);
    acceleration = Math.max(acceleration, 0.82);
    traction = Math.max(traction, 0.94);
    attackStyle = 'Kinetic Sprint Flurries & Stomp Shocks';
    movementStyle = 'High-Traction Evasive Dash Stride';
    
    if (!derivedMechanics.some(m => m.mechanic.includes('Traction'))) {
      derivedMechanics.push({
        physicalProperty: 'Deep-Lug Rubber Outsole Tread',
        mechanic: 'Apex Ground Traction',
        gameplayEffect: 'Maintains 100% control on slick rain arenas & +30% dash distance',
        magnitude: 0.30,
      });
    }
  } else if (objName.includes('wrench') || objName.includes('drill') || objName.includes('hammer') || objName.includes('tool')) {
    meleePower = Math.max(meleePower, 0.82);
    knockbackResistance = Math.max(knockbackResistance, 0.72);
    attackStyle = 'Crushing Rotary Tool Strikes & Heavy Cleaves';
    derivedMechanics.push({
      physicalProperty: 'High-Torque Hardened Tool Head',
      mechanic: 'Armor-Cracking Kinetic Impact',
      gameplayEffect: 'Melee attacks bypass 20% enemy armor & deal +35% knockback',
      magnitude: 0.35,
    });
  } else if (objName.includes('bottle') || objName.includes('thermos') || objName.includes('flask')) {
    rangedPower = Math.max(rangedPower, 0.70);
    turnRate = Math.max(turnRate, 0.62);
    attackStyle = 'Pressurized Fluid-Kinetic Blasts';
    derivedMechanics.push({
      physicalProperty: 'Pressurized Canister Chamber',
      mechanic: 'Hydraulic Pressure Discharge',
      gameplayEffect: 'Special ability charges 20% faster after dashing',
      magnitude: 0.20,
    });
  } else if (objName.includes('chair') || objName.includes('seat')) {
    knockbackResistance = Math.max(knockbackResistance, 0.74);
    defense = Math.max(defense, 0.68);
    derivedMechanics.push({
      physicalProperty: 'Multi-Leg Ground Support Base',
      mechanic: 'Stabilizer Base Locking',
      gameplayEffect: 'Takes -40% displacement from rival charges when stationary',
      magnitude: 0.40,
    });
  }

  // ========================================================
  // 4. CLAMP AND FINALIZE VALUES (Safe Stat Budget)
  // ========================================================
  const finalMobility = clamp(mobility);
  const finalAcceleration = clamp(acceleration);
  const finalTurnRate = clamp(turnRate);
  const finalMassClass = clamp(massClass);
  const finalKnockbackResistance = clamp(knockbackResistance);
  const finalMeleePower = clamp(meleePower);
  const finalRangedPower = clamp(rangedPower);
  const finalDefense = clamp(defense);
  const finalElectricalResistance = clamp(electricalResistance);
  const finalHeatResistance = clamp(heatResistance);
  const finalTraction = clamp(traction);
  const finalRegenerationRate = clamp(regenerationRate);

  // Tactical summary synthesized causally
  let tacticalSummary = '';
  if (finalMobility >= 0.70) {
    tacticalSummary = `A fast, nimble combatant leveraging ${finalTraction >= 0.75 ? 'high-traction grip and snappy evasive dashes' : 'low-mass speed'}. Best played with hit-and-run tactics, avoiding heavy head-on collisions.`;
  } else if (finalMassClass >= 0.70) {
    tacticalSummary = `A crushing heavyweight fighter boasting immense knockback poise and bone-shattering melee force. Slow to accelerate, but nearly immovable in close combat.`;
  } else if (finalRangedPower >= 0.65) {
    tacticalSummary = `An advanced trajectory specialist equipped with calibrated sensor computing. Dominates long-range engagements with fast projectiles and rapid recharge cycles.`;
  } else if (finalRegenerationRate >= 0.60) {
    tacticalSummary = `Possesses organic biomimetic auto-repair nanotech. Excels in prolonged attrition battles by disengaging to rapidly regenerate vital armor integrity.`;
  } else {
    tacticalSummary = `A versatile all-around combat warrior featuring calibrated balance between kinetic strikes, armor protection, and arena stride.`;
  }

  return {
    mobility: finalMobility,
    acceleration: finalAcceleration,
    turnRate: finalTurnRate,
    massClass: finalMassClass,
    knockbackResistance: finalKnockbackResistance,
    meleePower: finalMeleePower,
    rangedPower: finalRangedPower,
    defense: finalDefense,
    armorAbsorption: finalDefense,
    impactForce: finalMeleePower,
    electricalResistance: finalElectricalResistance,
    heatResistance: finalHeatResistance,
    traction: finalTraction,
    regenerationRate: finalRegenerationRate,
    attackStyle,
    movementStyle,
    strengths: strengths.length > 0 ? strengths : ['Balanced combat stride and armor composition'],
    weaknesses: weaknesses.length > 0 ? weaknesses : ['Susceptible to sustained elemental counter-fire'],
    derivedMechanics,
    tacticalSummary,
  };
}
