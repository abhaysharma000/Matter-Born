import { ExplorationScanMetadata } from './exploration';

export type CreatureElement = 'fire' | 'electric' | 'nature' | 'ice' | 'cyber' | 'void' | 'rock';
export type CreatureRarity = 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic';
export type BodyShape = 'behemoth' | 'serpent' | 'arachnid' | 'humanoid' | 'golem' | 'avian' | 'hydra' | 'mech';
export type WeaponSkillType =
  | 'swords'
  | 'flamethrower'
  | 'double_guns'
  | 'mage_spell'
  | 'fighter'
  | 'archer_bow'
  | 'magic_fist'
  | 'electric_stun_gun'
  | 'launcher'
  | 'disk_thrower'
  | 'laser_gun';

export type AbilityVfxType =
  | 'nova'
  | 'beam'
  | 'vortex'
  | 'missiles'
  | 'spikes'
  | 'lightning'
  | 'singularity'
  | 'chain_lightning'
  | 'matrix_burst'
  | 'airstrike'
  | 'sonic_wave'
  | 'mortar_barrage'
  | 'railgun'
  | 'magma_flamethrower'
  | 'cyclone'
  | 'decoy_burst'
  | 'interceptor_ram'
  | 'cyclops_ray'
  | 'siege_cannon'
  | 'swords'
  | 'flamethrower'
  | 'double_guns'
  | 'mage_spell'
  | 'fighter'
  | 'archer_bow'
  | 'magic_fist'
  | 'electric_stun_gun'
  | 'launcher'
  | 'disk_thrower'
  | 'laser_gun'
  | 'bulletstorm'
  | 'astral_singularity'
  | 'arrow_volley'
  | 'chakram_swarm';

export type ObjectArchetype =
  | 'cup_mug'
  | 'bottle_can'
  | 'phone_tech'
  | 'footwear_shoe'
  | 'plant_organic'
  | 'audio_headset'
  | 'tool_blade'
  | 'spherical_fruit'
  | 'apparel_fabric'
  | 'generic_item';

export interface CreatureVisualParams {
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
  bodyShape: BodyShape;
  scale: number;
  hornsOrCrest: boolean;
  wings: boolean;
  tail: boolean;
  spikes: boolean;
  armorPlates: boolean;
  floatingOrbs: boolean;
  auraParticleType: string;
  // Distinct real-world object features
  objectArchetype?: ObjectArchetype;
  hasHandle?: boolean;
  hasScreen?: boolean;
  hasCapOrLid?: boolean;
  hasCordOrTail?: boolean;
  hasKeypadOrButtons?: boolean;
  hasBladesOrTines?: boolean;
  hasSoleTread?: boolean;
  hasSucculentSpines?: boolean;
  hasHeadbandArc?: boolean;
  metallicFactor?: number;
  roughnessFactor?: number;
  // Advanced Object DNA 2.0 parameters
  geometryHints?: string[];
  primaryShape?: string;
  shapeArchetype?: 'cylinder' | 'sheet_slab' | 'sphere_round' | 'cuboid_box';
  topColors?: string[];
  visualFingerprint?: VisualFingerprintDNA;
  visualTransmutation?: VisualTransmutationContract;
}

// ==========================================
// VISUAL TRANSMUTATION 2.0 CONTRACT
// ==========================================

export interface BodyProportions {
  width: number;  // e.g. 0.8 to 1.6
  height: number; // e.g. 0.8 to 1.6
  depth: number;  // e.g. 0.8 to 1.6
}

export interface FeaturePlacement {
  feature: string;
  placement: 'shoulder' | 'chest' | 'back' | 'head' | 'arm' | 'hip' | 'leg' | 'feet';
  meshType:
    | 'ring_handle'
    | 'wheel_hub'
    | 'screen_hud'
    | 'vent_exhaust'
    | 'strut_brace'
    | 'strap_band'
    | 'hinge_pivot'
    | 'tine_blade'
    | 'cap_crest'
    | 'tread_plate'
    | 'branch_crest'
    | 'antenna_spike'
    | 'button_node'
    | 'box_flap'
    | 'canister_core'
    | 'generic_panel';
  scale?: number;
  label?: string;
}

export interface TransmutationMapping {
  originalFeature: string;
  robotFeature: string;
  visualEffect: string;
  consequence?: string;
}

export interface VisualTransmutationContract {
  silhouette:
    | 'rectangular_box'
    | 'cylindrical_bottle'
    | 'spherical_orb'
    | 'thin_plate_clam'
    | 'backrest_strut'
    | 'tubular_frame'
    | 'columnar_tower'
    | 'branching_arbor'
    | 'aerodynamic_wedge'
    | 'compact_faceted'
    | string;
  bodyProportions: BodyProportions;
  primaryColor: string;
  secondaryColor: string;
  accentColors: string[];
  surfaceMaterial:
    | 'metal'
    | 'rubber'
    | 'plastic'
    | 'ceramic'
    | 'glass'
    | 'wood'
    | 'cardboard'
    | 'fabric'
    | 'stone'
    | string;
  roughness: number; // 0.0 to 1.0
  metallic: number; // 0.0 to 1.0
  signatureFeatures: string[];
  geometryMotifs: string[];
  armorPatterns: string[];
  mechanicalDetails: string[];
  featurePlacement: FeaturePlacement[];
  transmutationMappings: TransmutationMapping[];
}

// ==========================================
// OBJECT RECOGNITION 2.0: STRUCTURED OBJECT DNA
// ==========================================

export interface ObjectIdentityDNA {
  canonicalName: string;
  objectCategory: string;
  specificDescription: string;
  recognitionConfidence: number; // 0.0 to 1.0
  alternativeInterpretations?: string[];
  isForegroundDominant?: boolean;
}

export interface VisualIdentityDNA {
  silhouetteDescription: string;
  dominantColors: string[];
  secondaryColors: string[];
  colorDistribution: string;
  shape: string;
  proportions: string;
  surfaceAppearance: string;
  distinctiveVisualFeatures: string[];
}

export interface PhysicalIdentityDNA {
  estimatedSizeClass: 'micro' | 'compact' | 'medium' | 'large' | 'colossal';
  estimatedMassClass: string; // e.g. "Lightweight (~0.35 kg visual estimate)"
  materialCandidates: string[];
  structuralComplexity: 'simple' | 'moderate' | 'complex' | 'ultra-complex';
  rigidity: 'flexible' | 'semi-rigid' | 'rigid' | 'ultra-rigid';
  flexibility: number; // 0 to 100
  density: 'featherweight' | 'light' | 'medium' | 'heavy' | 'superdense';
  likelyPhysicalProperties: string[];
}

export interface VisualFingerprintDNA {
  primaryShape: string;
  aspectRatio: string;
  primaryColor: string;
  secondaryColor: string;
  signatureFeatures: string[];
  surface: string;
  geometryHints: string[];
  mustPreserveFeatures: string[];
}

export interface PropertyConsequence {
  property: string;
  effect: string;
  isBuff: boolean;
}

export interface DerivedMechanic {
  physicalProperty: string;
  mechanic: string;
  gameplayEffect: string;
  magnitude: number; // relative modifier, e.g. +0.25 for +25%
}

export interface CombatDNA {
  mobility: number; // 0.0 to 1.0 (baseline 0.5)
  acceleration: number; // 0.0 to 1.0 (sprint & dash ramp-up)
  turnRate: number; // 0.0 to 1.0 (rotational agility)
  massClass: number; // 0.0 to 1.0 (0.1 micro to 0.95 colossal)
  knockbackResistance: number; // 0.0 to 1.0 (resistance to being displaced)
  
  meleePower: number; // 0.0 to 1.0 (close-quarters strike & collision impact)
  rangedPower: number; // 0.0 to 1.0 (projectile projectile damage)
  defense: number; // 0.0 to 1.0 (armor durability)
  armorAbsorption?: number; // 0.0 to 1.0 (kinetic damage mitigation scalar)
  impactForce?: number; // 0.0 to 1.0 (knockback & impact impulse scalar)
  
  electricalResistance: number; // 0.0 to 1.0 (insulation vs conductivity)
  heatResistance: number; // 0.0 to 1.0 (thermal tolerance)
  traction: number; // 0.0 to 1.0 (ground friction / slip resistance)
  regenerationRate: number; // 0.0 to 1.0 (organic/nanotech auto-repair rate)
  
  attackStyle: string;
  movementStyle: string;
  
  strengths: string[];
  weaknesses: string[];
  
  derivedMechanics: DerivedMechanic[];
  tacticalSummary?: string;
}

export interface GameplayIdentityDNA {
  combatTier: string;
  suggestedClass: 'Leader' | 'Scout' | 'Seeker' | 'Dreadnought' | 'Infiltrator' | 'Warrior';
  strengths: string[];
  weaknesses: string[];
  movementStyle: string;
  attackStyle: string;
  specialAbilityConcept: string;
  propertyConsequences: PropertyConsequence[];
  combatDna?: CombatDNA;
}

export interface ObjectDNA {
  objectIdentity: ObjectIdentityDNA;
  visualIdentity: VisualIdentityDNA;
  physicalIdentity: PhysicalIdentityDNA;
  signatureFeatures: string[];
  gameplayIdentity: GameplayIdentityDNA;
  visualFingerprint: VisualFingerprintDNA;
  visualTransmutation?: VisualTransmutationContract;
  combatDna?: CombatDNA;
}

export interface CreatureStats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface CreatureAbility {
  name: string;
  description: string;
  cooldown: number; // in seconds
  damage: number;
  vfxType: AbilityVfxType;
  icon?: string;
  effectType?: string;
}

export interface RealWorldMaterialPhysics {
  materialName: string; // e.g. "Ceramic", "Vulcanized Rubber", "Chlorophyll & Cell Walls", "Lithium Battery", "Polymer Plastic"
  heatResistance: number; // 0 to 100
  electricalConductivity: number; // 0 to 100
  impactDurability: number; // 0 to 100
  elasticity: number; // 0 to 100
  density: 'featherweight' | 'light' | 'medium' | 'heavy' | 'superdense';
  counterStrengths: string[]; // e.g. ["Electrical Insulator: Immune to shock stun", "High melting point against fire"]
  counterWeaknesses: string[]; // e.g. ["Brittle crystalline structure: +30% damage from Rock/Blunt impact"]
}

export type WeatherType = 'clear' | 'rain' | 'thunderstorm' | 'heatwave' | 'blizzard' | 'midnight_void';
export type TimeOfDay = 'day' | 'sunset' | 'night';

export interface RealWorldEnvironment {
  id: string;
  name: string;
  weather: WeatherType;
  timeOfDay: TimeOfDay;
  temperatureC: number;
  locationName: string;
  elevation: 'sea_level' | 'mountain' | 'indoor' | 'urban';
  aiHazardName: string;
  aiHazardDescription: string;
  elementalBuff: CreatureElement;
  elementalBuffMultiplier: number;
  elementalNerf?: CreatureElement;
  elementalNerfMultiplier?: number;
  groundFriction: number; // normal 0.88, slick rain 0.96, thick mud 0.75
  fogColor: string;
  skyColor: string;
  ambientColor: string;
  particleType: 'none' | 'rain' | 'embers' | 'snow' | 'spores' | 'lightning';
}

export interface ObjectComplexityAnalysis {
  complexityScore: number; // 0 to 100
  scaleTier: 'micro' | 'compact' | 'medium' | 'large' | 'colossal';
  tierLabel: string; // e.g. "S-Tier Colossal Titan"
  statMultiplier: number; // e.g. 1.8x
  powerRating: number; // e.g. 1420
  physicalMassDesc: string; // e.g. "Heavy Multi-Component Vehicle/Machinery"
  componentCountEst?: number;
  recommendedHp?: number;
  recommendedAttack?: number;
  recommendedDefense?: number;
  recommendedSpeed?: number;
  visualScale?: number;
}

export interface BattleCreature {
  id: string;
  name: string;
  originalObject: string;
  objectFeature: string;
  faction?: 'Autobot' | 'Decepticon';
  robotClass?: 'Leader' | 'Scout' | 'Seeker' | 'Dreadnought' | 'Infiltrator' | 'Warrior' | 'Mage' | 'Fighter' | 'Archer' | 'Magic Fist';
  primaryWeapon?: WeaponSkillType;
  weaponType?: WeaponSkillType;
  element: CreatureElement;
  rarity: CreatureRarity;
  lore: string;
  stats: CreatureStats;
  specialAbility: CreatureAbility;
  visualParams: CreatureVisualParams;
  materialPhysics?: RealWorldMaterialPhysics;
  objectComplexity?: ObjectComplexityAnalysis;
  objectDna?: ObjectDNA;
  combatDna?: CombatDNA;
  visualTransmutation?: VisualTransmutationContract;
  capturedImageUrl?: string;
  explorationDistanceMeters?: number;
  explorationTier?: string;
  explorationBonusTitle?: string;
  explorationBonusPerk?: string;
  explorationMetadata?: ExplorationScanMetadata;
  createdAt: number;
  wins?: number;
  matchesPlayed?: number;
}

export interface ActiveFighter {
  id: string;
  creature: BattleCreature;
  isPlayer: boolean;
  x: number;
  z: number;
  y: number;
  rotation: number;
  currentHp: number;
  maxHp: number;
  currentEnergy: number;
  maxEnergy: number;
  level: number;
  kills: number;
  attackCooldown: number;
  abilityCooldown: number;
  dashCooldown: number;
  isDashing: boolean;
  isJumping?: boolean;
  jumpVelocityY?: number;
  knockbackVx?: number;
  knockbackVz?: number;
  invulnerabilityTimer?: number;
  timeSinceLastDamage?: number;
  isAttacking: boolean;
  isCastingAbility: boolean;
  isHit: boolean;
  hitTimer?: number;
  isDead: boolean;
  targetId?: string | null;
  // Robot Ability Status Effects & Buffs
  shieldHp?: number;
  shieldDuration?: number;
  isSilenced?: boolean;
  silenceDuration?: number;
  isStunned?: boolean;
  stunDuration?: number;
  burnDuration?: number;
  isBerserk?: boolean;
  berserkDuration?: number;
  isStealthed?: boolean;
  stealthDuration?: number;
  defenseBuffPercent?: number;
  defenseBuffDuration?: number;
  speedMultiplier?: number;
  // Cached Combat DNA
  combatDna?: CombatDNA;
}

export interface AttackProjectile {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  vy?: number;
  damage: number;
  color: string;
  radius: number;
  element: CreatureElement;
  lifetime: number;
  vfxType?: AbilityVfxType;
  isHoming?: boolean;
  homingTargetId?: string;
  isPiercing?: boolean;
  isSingularity?: boolean;
  isMortar?: boolean;
  isCyclone?: boolean;
  weaponType?: WeaponSkillType;
  pierceCount?: number;
  ricochetCount?: number;
  aoeRadius?: number;
  burnDuration?: number;
  stunDuration?: number;
  knockbackForce?: number;
  spinSpeed?: number;
  hasDodgedPlayer?: boolean;
}

export interface DamageFloater {
  id: string;
  text: string;
  x: number;
  y: number;
  z: number;
  color: string;
  isCrit: boolean;
  opacity: number;
}

export interface ArenaPickup {
  id: string;
  type: 'health' | 'energy' | 'power_crystal';
  x: number;
  z: number;
  value: number;
  color: string;
}

export interface Arena3DMatchStats {
  creatureName: string;
  originalObject: string;
  rank: number;
  totalCombatants: number;
  kills: number;
  damageDealt: number;
  survivalTimeSeconds: number;
  isVictory: boolean;
  earnedXp: number;
  earnedCoins: number;
  score?: number;
  trophies?: number;
  environmentUsed?: string;
  materialAdvantageHits?: number;
  voiceCommandsIssued?: number;
  kineticSurgesTriggered?: number;
}
