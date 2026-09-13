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

const DEFAULT_STARTER_EP = 0;

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
      if (!isNaN(val) && val >= 0) {
        // Automatically sanitize and wipe corrupted values from cross-continent origin jumps (> 1,000,000 EP)
        if (val > 1000000) {
          localStorage.setItem(LIFETIME_EP_STORAGE_KEY, '0');
          localStorage.removeItem(EXPLORATION_STORAGE_KEY);
          return 0;
        }
        return val;
      }
    }
    // Default 0 EP so players start fresh and earn EP by physical walking
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
    let safe = Math.max(0, Math.round(points));
    // Guard against crazy corrupted values (> 1,000,000 EP)
    if (safe > 1000000) safe = 0;
    localStorage.setItem(LIFETIME_EP_STORAGE_KEY, safe.toString());
    notifyForgeUpdated();
  } catch {
    // ignore
  }
}

/**
 * Add Exploration Points (EP)
 */
export function addExplorationPoints(delta: number): number {
  const current = getExplorationPoints();
  const next = Math.max(0, current + Math.round(delta));
  setExplorationPoints(next);
  return next;
}

/**
 * Reset Exploration Points to 0 (for fresh walk tracking)
 */
export function resetExplorationPoints(): void {
  try {
    localStorage.setItem(LIFETIME_EP_STORAGE_KEY, '0');
    localStorage.setItem(LIFETIME_TOTAL_EP_EARNED_KEY, '0');
    localStorage.setItem(LIFETIME_DISTANCE_STORAGE_KEY, '0');
    localStorage.setItem(BEST_EXPEDITION_STORAGE_KEY, '0');
    localStorage.removeItem(EXPLORATION_STORAGE_KEY);
    notifyForgeUpdated();
  } catch (err) {
    console.warn('Reset EP error:', err);
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
    benefitNotice = '✨ UPGRADE! Health +100 HP!';
  } else if (upgradeId === 'energon_overdrive') {
    benefitNotice = '🔥 FASTER! Fire Rate +1.0/s!';
  } else if (upgradeId === 'special_core') {
    benefitNotice = '✨ POWER! Special Damage +10!';
  } else if (upgradeId === 'impact_amplifier') {
    benefitNotice = '⚔️ STRONGER! Damage +20!';
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

  // Exact star bonuses requested by user:
  // Health: +100 HP per star
  // Damage: +20 Damage per star
  // Fire Rate: +1.0/s Fire Rate per star
  // Special: +10 Special Damage per star
  const healthAdd = hpLevel * 100;
  const damageAdd = dmgLevel * 20;
  const fireRateAdd = fireLevel * 1.0;
  const specialAdd = specialLevel * 10;

  return {
    damageAdd,
    damageBonusPercent: dmgLevel * 5,
    damageMultiplier: 1 + (dmgLevel * 0.05),

    fireRateAdd,
    fireRateBonusPercent: fireLevel * 5,
    fireRateMultiplier: (8.0 + fireRateAdd) / 8.0,

    specialAdd,
    specialBonusPercent: specialLevel * 5,
    specialMultiplier: 1 + (specialLevel * 0.05),
    specialCdFactor: Math.max(0.70, 1 - (specialLevel * 0.03)),

    healthAdd,
    healthBonusPercent: hpLevel * 5,
    healthMultiplier: (1000 + healthAdd) / 1000,

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
