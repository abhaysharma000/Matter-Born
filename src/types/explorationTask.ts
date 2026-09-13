export interface ExplorationTask {
  id: string;
  title: string;
  description: string;
  rewardEp: number; // 100, 200, 300
  targetDistanceMeters: number; // 50m for 100 EP, 120m for 200 EP, 250m for 300 EP
  tier: 'BRONZE' | 'SILVER' | 'GOLD';
  category: 'WALK' | 'SPEED' | 'RADAR' | 'EXPEDITION';
  icon: string;
}

export interface ExplorationTaskState {
  activeTaskId: string | null;
  taskStartDistance: number; // distanceExplored when task was activated
  taskCurrentProgressMeters: number; // meters walked while task is active
  completedTaskIds: string[]; // tasks completed this cycle
  claimedTaskIds: string[]; // tasks claimed
  lastResetTimestamp: number;
}
