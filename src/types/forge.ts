export type ForgeUpgradeId =
  | 'impact_amplifier'
  | 'energon_overdrive'
  | 'special_core'
  | 'alloy_armor';

export type ForgeUpgradeCategory = 'DAMAGE' | 'FIRE_RATE' | 'SPECIAL' | 'HEALTH';

export interface ForgeUpgradeDefinition {
  id: ForgeUpgradeId;
  name: string;
  category: ForgeUpgradeCategory;
  statLabel: string;
  tagline: string;
  description: string;
  icon: string;
  maxLevel: number;
  costCurve: number[]; // e.g. [100, 200, 350, 550, 800]
  progressionLabels: string[]; // Progression strings for Levels 0 through 5
  benefitPerLevelPercent: number;
}

export interface ForgeUpgradesState {
  impact_amplifier: number;
  energon_overdrive: number;
  special_core: number;
  alloy_armor: number;
}

export interface ForgeCombatBonuses {
  damageMultiplier: number;
  damageBonusPercent: number;
  damageAdd: number;
  fireRateMultiplier: number;
  fireRateBonusPercent: number;
  fireRateAdd: number;
  specialMultiplier: number;
  specialBonusPercent: number;
  specialAdd: number;
  specialCdFactor: number;
  healthMultiplier: number;
  healthBonusPercent: number;
  healthAdd: number;
  levels: ForgeUpgradesState;
}

export interface ForgePurchaseResult {
  success: boolean;
  upgradeId?: ForgeUpgradeId;
  oldLevel?: number;
  newLevel?: number;
  costPaid?: number;
  remainingEp?: number;
  benefitNotice?: string;
  error?: string;
}
