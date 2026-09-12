import {
  ForgeUpgradeId,
  ForgeUpgradesState,
  ForgeCombatBonuses,
  ForgePurchaseResult,
} from '../types/forge';
import {
  FORGE_UPGRADES_CONFIG,
  FORGE_UPGRADES_STORAGE_KEY,
} from '../constants/forgeConfig';
import {
  LIFETIME_EP_STORAGE_KEY,
  EXPLORATION_STORAGE_KEY,
  EXPLORATION_UPGRADES_STORAGE_KEY,
  LIFETIME_DISTANCE_STORAGE_KEY,
  BEST_EXPEDITION_STORAGE_KEY,
  LIFETIME_TOTAL_EP_EARNED_KEY,
} from '../constants/explorationConfig';
import { formatExplorationDistance } from './geoUtils';

const DEFAULT_STARTER_EP = 850;

const DEFAULT_UPGRADES: ForgeUpgradesState = {
  impact_amplifier: 0,
  energon_overdrive: 0,
  special_core: 0,
  alloy_armor: 0,
};

/**
 * Read current Exploration Points (EP)
 */
export function getExplorationPoints(): number {
  try {
    const raw = localStorage.getItem(LIFETIME_EP_STORAGE_KEY);
    if (raw !== null) {
      const val = parseInt(raw, 10);
      if (!isNaN(val) && val >= 0) return val;
    }
    // Seed initial starter balance so players can immediately forge and experience combat power
    localStorage.setItem(LIFETIME_EP_STORAGE_KEY, DEFAULT_STARTER_EP.toString());
    return DEFAULT_STARTER_EP;
  } catch {
    return DEFAULT_STARTER_EP;
  }
}

/**
 * Save Exploration Points (EP)
 */
export function setExplorationPoints(points: number): void {
  try {
    const safe = Math.max(0, Math.round(points));
    localStorage.setItem(LIFETIME_EP_STORAGE_KEY, safe.toString());
    notifyForgeUpdated();
  } catch {
    // ignore
  }
}

/**
 * Read current Forge Upgrades
 */
export function getForgeUpgrades(): ForgeUpgradesState {
  try {
    const raw = localStorage.getItem(FORGE_UPGRADES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        impact_amplifier: Math.min(10, Math.max(0, Number(parsed.impact_amplifier) || 0)),
        energon_overdrive: Math.min(10, Math.max(0, Number(parsed.energon_overdrive) || 0)),
        special_core: Math.min(10, Math.max(0, Number(parsed.special_core) || 0)),
        alloy_armor: Math.min(10, Math.max(0, Number(parsed.alloy_armor) || 0)),
      };
    }

    // Check legacy exploration upgrades if user had them
    const legacyRaw = localStorage.getItem(EXPLORATION_UPGRADES_STORAGE_KEY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw);
      const migrated: ForgeUpgradesState = {
        impact_amplifier: Math.min(10, Math.max(0, Number(legacy.attack) || 0)),
        energon_overdrive: Math.min(10, Math.max(0, Number(legacy.mobility) || 0)),
        special_core: Math.min(10, Math.max(0, Number(legacy.ability) || 0)),
        alloy_armor: Math.min(10, Math.max(0, Number(legacy.defense) || 0)),
      };
      saveForgeUpgrades(migrated);
      return migrated;
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_UPGRADES };
}

/**
 * Save Forge Upgrades
 */
export function saveForgeUpgrades(upgrades: ForgeUpgradesState): void {
  try {
    localStorage.setItem(FORGE_UPGRADES_STORAGE_KEY, JSON.stringify(upgrades));
    notifyForgeUpdated();
  } catch {
    // ignore
  }
}

/**
 * Broadcast event to synchronize all open views (Arena, Lobby, Expedition)
 */
function notifyForgeUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('animatrix_forge_updated', {
      detail: {
        upgrades: getForgeUpgrades(),
        ep: getExplorationPoints(),
      },
    }));
  }
}

/**
 * Calculate the cost to upgrade to the next star
 */
export function getNextUpgradeCost(upgradeId: ForgeUpgradeId, currentLevel: number): number | null {
  if (currentLevel >= 10) return null;
  const config = FORGE_UPGRADES_CONFIG.find((item) => item.id === upgradeId);
  if (!config) return null;
  return config.costCurve[currentLevel] ?? 600;
}

/**
 * Perform atomic purchase of a Forge upgrade (1 star per purchase, max 10 stars)
 */
export function purchaseForgeUpgrade(upgradeId: ForgeUpgradeId): ForgePurchaseResult {
  const currentEp = getExplorationPoints();
  const upgrades = getForgeUpgrades();
  const currentLevel = upgrades[upgradeId] ?? 0;

  if (currentLevel >= 10) {
    return {
      success: false,
      error: 'Upgrade already maxed out at 10 stars!',
    };
  }

  const cost = getNextUpgradeCost(upgradeId, currentLevel);
  if (cost === null) {
    return {
      success: false,
      error: 'Invalid upgrade configuration.',
    };
  }

  if (currentEp < cost) {
    return {
      success: false,
      costPaid: cost,
      remainingEp: currentEp,
      error: 'Not enough EP yet. Explore more to earn some!',
    };
  }

  // Atomic state deduction & upgrade
  const remainingEp = currentEp - cost;
  const newLevel = currentLevel + 1;
  const updatedUpgrades: ForgeUpgradesState = {
    ...upgrades,
    [upgradeId]: newLevel,
  };

  try {
    localStorage.setItem(LIFETIME_EP_STORAGE_KEY, remainingEp.toString());
    localStorage.setItem(FORGE_UPGRADES_STORAGE_KEY, JSON.stringify(updatedUpgrades));
    notifyForgeUpdated();
  } catch (err) {
    return {
      success: false,
      error: 'Failed to write to local storage.',
    };
  }

  // Child-friendly short celebration messages (Part 13)
  let benefitNotice = '✨ UPGRADE!';
  if (upgradeId === 'alloy_armor') {
    benefitNotice = '✨ UPGRADE! Health increased!';
  } else if (upgradeId === 'energon_overdrive') {
    benefitNotice = '🔥 FASTER! Your robot fires faster!';
  } else if (upgradeId === 'special_core') {
    benefitNotice = '✨ POWER! Special ability boosted!';
  } else if (upgradeId === 'impact_amplifier') {
    benefitNotice = '⚔️ STRONGER! Attack damage increased!';
  }

  return {
    success: true,
    upgradeId,
    oldLevel: currentLevel,
    newLevel,
    costPaid: cost,
    remainingEp,
    benefitNotice,
  };
}

/**
 * Calculate authoritative combat multipliers based on current Forge upgrades
 */
export function getForgeCombatBonuses(upgrades?: ForgeUpgradesState): ForgeCombatBonuses {
  const current = upgrades || getForgeUpgrades();

  const dmgLevel = Math.min(10, current.impact_amplifier || 0);
  const fireLevel = Math.min(10, current.energon_overdrive || 0);
  const specialLevel = Math.min(10, current.special_core || 0);
  const hpLevel = Math.min(10, current.alloy_armor || 0);

  return {
    damageBonusPercent: dmgLevel * 5, // +5% per star, up to +50% at 10 stars
    damageMultiplier: 1 + (dmgLevel * 0.05),

    fireRateBonusPercent: fireLevel * 5, // +5% firing speed per star, up to +50% at 10 stars
    fireRateMultiplier: 1 + (fireLevel * 0.05),

    specialBonusPercent: specialLevel * 5, // +5% special power per star, up to +50% at 10 stars
    specialMultiplier: 1 + (specialLevel * 0.05),
    specialCdFactor: Math.max(0.70, 1 - (specialLevel * 0.03)), // ~3% cd reduction per star, max 30%

    healthBonusPercent: hpLevel * 5, // +5% per star, up to +50% at 10 stars
    healthMultiplier: 1 + (hpLevel * 0.05),

    levels: current,
  };
}

/**
 * Record real-world incremental progress for lifetime statistics
 */
export function recordExpeditionProgress(distanceMeters: number, epEarned: number): void {
  try {
    const safeDist = Math.max(0, Math.round(distanceMeters));
    const safeEp = Math.max(0, Math.round(epEarned));

    // 1. Update Best Expedition Peak
    const prevBest = Number(localStorage.getItem(BEST_EXPEDITION_STORAGE_KEY)) || 0;
    if (safeDist > prevBest) {
      localStorage.setItem(BEST_EXPEDITION_STORAGE_KEY, safeDist.toString());
    }

    // 2. Accumulate Lifetime Total EP Earned
    if (safeEp > 0) {
      const prevTotalEp = Number(localStorage.getItem(LIFETIME_TOTAL_EP_EARNED_KEY)) || DEFAULT_STARTER_EP;
      localStorage.setItem(LIFETIME_TOTAL_EP_EARNED_KEY, (prevTotalEp + safeEp).toString());
    }
  } catch {
    // ignore
  }
}

/**
 * Fetch comprehensive lifetime exploration statistics
 */
export function getLifetimeExplorationStats(): {
  totalDistanceMeters: number;
  formattedTotalDistance: string;
  bestExpeditionMeters: number;
  formattedBestExpedition: string;
  totalEpEarned: number;
  currentEp: number;
} {
  let bestExpedition = 0;
  let totalDistance = 0;
  let totalEpEarned = DEFAULT_STARTER_EP;
  const currentEp = getExplorationPoints();

  try {
    bestExpedition = Number(localStorage.getItem(BEST_EXPEDITION_STORAGE_KEY)) || 0;
    totalDistance = Number(localStorage.getItem(LIFETIME_DISTANCE_STORAGE_KEY)) || bestExpedition;
    totalEpEarned = Number(localStorage.getItem(LIFETIME_TOTAL_EP_EARNED_KEY)) || Math.max(currentEp, DEFAULT_STARTER_EP);

    // Also check current active session if peak is higher
    const rawSession = localStorage.getItem(EXPLORATION_STORAGE_KEY);
    if (rawSession) {
      const parsed = JSON.parse(rawSession);
      const sessionPeak = Number(parsed.maxDistanceReached || parsed.distanceExplored) || 0;
      if (sessionPeak > bestExpedition) {
        bestExpedition = sessionPeak;
      }
      if (sessionPeak > totalDistance) {
        totalDistance = sessionPeak;
      }
    }
  } catch {
    // ignore
  }

  return {
    totalDistanceMeters: totalDistance,
    formattedTotalDistance: formatExplorationDistance(totalDistance),
    bestExpeditionMeters: bestExpedition,
    formattedBestExpedition: formatExplorationDistance(bestExpedition),
    totalEpEarned,
    currentEp,
  };
}

/**
 * Fetch real-world exploration metrics for the "Expedition Rewards" connection card
 */
export function getExpeditionConnectionStats(): {
  totalDistanceMeters: number;
  formattedDistance: string;
  highestTierLabel: string;
  highestTierBadge: string;
  lifetimeEp: number;
} {
  let distance = 0;
  let tierLabel = 'SCOUT';
  let tierBadge = '🌱';

  try {
    const rawSession = localStorage.getItem(EXPLORATION_STORAGE_KEY);
    if (rawSession) {
      const parsed = JSON.parse(rawSession);
      distance = Number(parsed.maxDistanceReached || parsed.distanceExplored) || 0;
      if (parsed.activeMilestone?.tier) {
        tierLabel = parsed.activeMilestone.tier;
        tierBadge = parsed.activeMilestone.badge || '🌱';
      } else if (distance >= 2000) {
        tierLabel = 'TITAN';
        tierBadge = '👑';
      } else if (distance >= 1000) {
        tierLabel = 'CYBERTRONIAN';
        tierBadge = '🔮';
      } else if (distance >= 500) {
        tierLabel = 'APEX';
        tierBadge = '💎';
      } else if (distance >= 250) {
        tierLabel = 'VANGUARD';
        tierBadge = '⚡';
      } else if (distance >= 50) {
        tierLabel = 'RANGER';
        tierBadge = '🧭';
      }
    }
  } catch {
    // ignore
  }

  return {
    totalDistanceMeters: distance,
    formattedDistance: formatExplorationDistance(distance),
    highestTierLabel: tierLabel,
    highestTierBadge: tierBadge,
    lifetimeEp: getExplorationPoints(),
  };
}
