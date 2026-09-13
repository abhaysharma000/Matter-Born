import { BattleCreature } from '../types/creature';
import { STARTER_TEMPLATE_ROBOT } from '../data/creaturePresets';

const USER_ROBOTS_STORAGE_KEY = 'mb_user_robots_v1';
const ACTIVE_ROBOT_STORAGE_KEY = 'mb_active_robot_v1';

/**
 * Returns the list of all player robots.
 * If running for the first time, returns the single pre-generated "Template 1" robot.
 */
export function getPlayerRobots(): BattleCreature[] {
  try {
    const raw = localStorage.getItem(USER_ROBOTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse player robots from storage:', err);
  }

  // First time installation / run: single pre-generated robot "Template 1"
  const initialRobots = [STARTER_TEMPLATE_ROBOT];
  try {
    localStorage.setItem(USER_ROBOTS_STORAGE_KEY, JSON.stringify(initialRobots));
  } catch {}
  return initialRobots;
}

/**
 * Gets the active fighting robot. Defaults to Template 1 on first run.
 */
export function getActivePlayerRobot(): BattleCreature {
  try {
    const raw = localStorage.getItem(ACTIVE_ROBOT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.name && parsed.stats && parsed.visualParams) {
        return parsed;
      }
      if (parsed && parsed.name) {
        return {
          ...STARTER_TEMPLATE_ROBOT,
          ...parsed,
          stats: {
            ...STARTER_TEMPLATE_ROBOT.stats,
            ...(parsed.stats || {}),
          },
          visualParams: {
            ...STARTER_TEMPLATE_ROBOT.visualParams,
            ...(parsed.visualParams || {}),
          },
        };
      }
    }
  } catch (err) {
    console.warn('Failed to get active robot:', err);
  }

  // Check if there are player robots
  const robots = getPlayerRobots();
  const active = robots[0] || STARTER_TEMPLATE_ROBOT;
  setActivePlayerRobot(active);
  return active;
}

/**
 * Sets the active fighting robot.
 */
export function setActivePlayerRobot(robot: BattleCreature): void {
  try {
    localStorage.setItem(ACTIVE_ROBOT_STORAGE_KEY, JSON.stringify(robot));
  } catch (err) {
    console.warn('Failed to set active robot:', err);
  }
}

/**
 * Adds a new scanned/crafted robot to the player's collection.
 */
export function savePlayerRobot(newRobot: BattleCreature): BattleCreature[] {
  const robots = getPlayerRobots();
  const existingIdx = robots.findIndex((r) => r.id === newRobot.id);

  let updated: BattleCreature[];
  if (existingIdx >= 0) {
    updated = [...robots];
    updated[existingIdx] = newRobot;
  } else {
    updated = [newRobot, ...robots];
  }

  try {
    localStorage.setItem(USER_ROBOTS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save player robot:', err);
  }

  setActivePlayerRobot(newRobot);
  return updated;
}

/**
 * Updates a robot's custom name.
 */
export function renamePlayerRobot(robotId: string, newName: string): BattleCreature[] {
  const robots = getPlayerRobots();
  const updated = robots.map((r) => {
    if (r.id === robotId) {
      return { ...r, name: newName };
    }
    return r;
  });

  try {
    localStorage.setItem(USER_ROBOTS_STORAGE_KEY, JSON.stringify(updated));
    const active = getActivePlayerRobot();
    if (active.id === robotId) {
      setActivePlayerRobot({ ...active, name: newName });
    }
  } catch (err) {
    console.warn('Failed to rename robot:', err);
  }

  return updated;
}

/**
 * Deletes a custom robot from the collection.
 * Keeps at least Template 1 so the player always has a robot.
 */
export function deletePlayerRobot(robotId: string): BattleCreature[] {
  const robots = getPlayerRobots();
  const filtered = robots.filter((r) => r.id !== robotId);
  const finalRobots = filtered.length > 0 ? filtered : [STARTER_TEMPLATE_ROBOT];

  try {
    localStorage.setItem(USER_ROBOTS_STORAGE_KEY, JSON.stringify(finalRobots));
    const active = getActivePlayerRobot();
    if (active.id === robotId) {
      setActivePlayerRobot(finalRobots[0]);
    }
  } catch (err) {
    console.warn('Failed to delete robot:', err);
  }

  return finalRobots;
}
