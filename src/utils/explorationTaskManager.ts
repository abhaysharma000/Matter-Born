import { ExplorationTask, ExplorationTaskState } from '../types/explorationTask';
import { addExplorationPoints } from './forgeManager';
import { sound } from './audio';

const STORAGE_KEY = 'mb_exploration_tasks_v2';

export const EXPLORATION_TASK_PRESETS: ExplorationTask[] = [
  {
    id: 'task-scout-50m',
    title: 'Perimeter Scout',
    description: 'Walk and cover at least 50 meters in the real world.',
    rewardEp: 100,
    targetDistanceMeters: 50,
    tier: 'BRONZE',
    category: 'WALK',
    icon: '🧭',
  },
  {
    id: 'task-patrol-120m',
    title: 'Sector Patrol',
    description: 'Explore the territory and cover 120 meters outdoor or indoor.',
    rewardEp: 200,
    targetDistanceMeters: 120,
    tier: 'SILVER',
    category: 'WALK',
    icon: '🛡️',
  },
  {
    id: 'task-recon-250m',
    title: 'Long-Range Recon',
    description: 'Embark on a deep expedition and cover 250 meters.',
    rewardEp: 300,
    targetDistanceMeters: 250,
    tier: 'GOLD',
    category: 'EXPEDITION',
    icon: '⚡',
  },
  {
    id: 'task-speed-70m',
    title: 'Rapid Response Recon',
    description: 'Pace briskly across the ground for 70 meters.',
    rewardEp: 100,
    targetDistanceMeters: 70,
    tier: 'BRONZE',
    category: 'SPEED',
    icon: '👟',
  },
  {
    id: 'task-frontier-160m',
    title: 'Frontier Sweep',
    description: 'Survey surrounding radar perimeter for 160 meters.',
    rewardEp: 200,
    targetDistanceMeters: 160,
    tier: 'SILVER',
    category: 'RADAR',
    icon: '📡',
  },
  {
    id: 'task-marathon-350m',
    title: 'Titan March Expedition',
    description: 'Endurance march across 350 meters for maximum Energy Points.',
    rewardEp: 300,
    targetDistanceMeters: 350,
    tier: 'GOLD',
    category: 'EXPEDITION',
    icon: '👑',
  },
];

class ExplorationTaskManager {
  private state: ExplorationTaskState;

  constructor() {
    this.state = this.loadState();
    // Default active task to the 100 EP 50m task if none selected
    if (!this.state.activeTaskId) {
      this.state.activeTaskId = 'task-scout-50m';
      this.saveState();
    }
  }

  private loadState(): ExplorationTaskState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return {
            activeTaskId: parsed.activeTaskId || 'task-scout-50m',
            taskStartDistance: Number(parsed.taskStartDistance) || 0,
            taskCurrentProgressMeters: Number(parsed.taskCurrentProgressMeters) || 0,
            completedTaskIds: Array.isArray(parsed.completedTaskIds) ? parsed.completedTaskIds : [],
            claimedTaskIds: Array.isArray(parsed.claimedTaskIds) ? parsed.claimedTaskIds : [],
            lastResetTimestamp: Number(parsed.lastResetTimestamp) || Date.now(),
          };
        }
      }
    } catch {}

    return {
      activeTaskId: 'task-scout-50m',
      taskStartDistance: 0,
      taskCurrentProgressMeters: 0,
      completedTaskIds: [],
      claimedTaskIds: [],
      lastResetTimestamp: Date.now(),
    };
  }

  private saveState(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      window.dispatchEvent(new CustomEvent('mb_task_state_changed', { detail: this.state }));
    } catch {}
  }

  public getTasks(): ExplorationTask[] {
    return EXPLORATION_TASK_PRESETS;
  }

  public getState(): ExplorationTaskState {
    return { ...this.state };
  }

  public getActiveTask(): ExplorationTask | null {
    if (!this.state.activeTaskId) return null;
    return EXPLORATION_TASK_PRESETS.find(t => t.id === this.state.activeTaskId) || null;
  }

  public activateTask(taskId: string, currentTotalDistanceMeters: number): boolean {
    const task = EXPLORATION_TASK_PRESETS.find(t => t.id === taskId);
    if (!task) return false;

    this.state.activeTaskId = taskId;
    this.state.taskStartDistance = currentTotalDistanceMeters;
    this.state.taskCurrentProgressMeters = 0;
    this.saveState();

    sound.playClick();
    return true;
  }

  public updateDistanceProgress(currentTotalDistanceMeters: number): {
    completedJustNow: boolean;
    activeTask: ExplorationTask | null;
    progressMeters: number;
    targetMeters: number;
  } {
    const task = this.getActiveTask();
    if (!task) {
      return { completedJustNow: false, activeTask: null, progressMeters: 0, targetMeters: 0 };
    }

    // If already claimed or completed, don't re-trigger
    const isClaimed = this.state.claimedTaskIds.includes(task.id);
    const isCompleted = this.state.completedTaskIds.includes(task.id);

    // Calculate distance covered since this task was activated
    const delta = Math.max(0, currentTotalDistanceMeters - this.state.taskStartDistance);
    this.state.taskCurrentProgressMeters = Math.min(task.targetDistanceMeters, delta);

    let completedJustNow = false;

    if (!isCompleted && !isClaimed && delta >= task.targetDistanceMeters) {
      this.state.completedTaskIds.push(task.id);
      completedJustNow = true;
      sound.playBonus();
    }

    this.saveState();

    return {
      completedJustNow,
      activeTask: task,
      progressMeters: this.state.taskCurrentProgressMeters,
      targetMeters: task.targetDistanceMeters,
    };
  }

  public claimReward(taskId: string): { success: boolean; rewardedEp: number } {
    const task = EXPLORATION_TASK_PRESETS.find(t => t.id === taskId);
    if (!task) return { success: false, rewardedEp: 0 };

    if (this.state.claimedTaskIds.includes(taskId)) {
      return { success: false, rewardedEp: 0 };
    }

    // Mark completed if not yet
    if (!this.state.completedTaskIds.includes(taskId)) {
      this.state.completedTaskIds.push(taskId);
    }

    this.state.claimedTaskIds.push(taskId);
    this.saveState();

    // Directly credit EP to player's persistent Forge bank!
    addExplorationPoints(task.rewardEp);
    sound.playVictory();

    // Auto-advance to the next uncliamed task if any
    const nextTask = EXPLORATION_TASK_PRESETS.find(t => !this.state.claimedTaskIds.includes(t.id));
    if (nextTask) {
      this.state.activeTaskId = nextTask.id;
      this.state.taskCurrentProgressMeters = 0;
      this.saveState();
    }

    return { success: true, rewardedEp: task.rewardEp };
  }

  public resetAllTasks(): void {
    this.state = {
      activeTaskId: 'task-scout-50m',
      taskStartDistance: 0,
      taskCurrentProgressMeters: 0,
      completedTaskIds: [],
      claimedTaskIds: [],
      lastResetTimestamp: Date.now(),
    };
    this.saveState();
    sound.playClick();
  }
}

export const explorationTaskManager = new ExplorationTaskManager();
