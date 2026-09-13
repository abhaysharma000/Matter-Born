import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Zap, 
  Trophy, 
  Flame, 
  ChevronRight, 
  Sparkles, 
  Compass, 
  RotateCcw, 
  X, 
  Check, 
  Play,
  Award
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ExplorationTask, ExplorationTaskState } from '../../types/explorationTask';
import { explorationTaskManager, EXPLORATION_TASK_PRESETS } from '../../utils/explorationTaskManager';
import { sound } from '../../utils/audio';
import { getExplorationPoints } from '../../utils/forgeManager';

interface ExplorationTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDistanceExplored: number;
  onRewardClaimed?: (rewardEp: number) => void;
}

export const ExplorationTasksModal: React.FC<ExplorationTasksModalProps> = ({
  isOpen,
  onClose,
  currentDistanceExplored,
  onRewardClaimed,
}) => {
  const [taskState, setTaskState] = useState<ExplorationTaskState>(() => explorationTaskManager.getState());
  const [currentEp, setCurrentEp] = useState<number>(() => getExplorationPoints());
  const [claimToast, setClaimToast] = useState<{ msg: string; ep: number } | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      setTaskState(explorationTaskManager.getState());
      setCurrentEp(getExplorationPoints());
    };
    window.addEventListener('mb_task_state_changed', handleUpdate);
    window.addEventListener('mb_forge_updated', handleUpdate);
    return () => {
      window.removeEventListener('mb_task_state_changed', handleUpdate);
      window.removeEventListener('mb_forge_updated', handleUpdate);
    };
  }, []);

  if (!isOpen) return null;

  const handleActivate = (taskId: string) => {
    explorationTaskManager.activateTask(taskId, currentDistanceExplored);
    setTaskState(explorationTaskManager.getState());
  };

  const handleClaim = (taskId: string) => {
    const res = explorationTaskManager.claimReward(taskId);
    if (res.success) {
      confetti({
        particleCount: 65,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#10B981', '#F59E0B', '#3B82F6'],
      });

      setClaimToast({
        msg: `🎉 Task Reward Claimed!`,
        ep: res.rewardedEp,
      });
      setTimeout(() => setClaimToast(null), 3500);

      if (onRewardClaimed) onRewardClaimed(res.rewardedEp);
      setTaskState(explorationTaskManager.getState());
      setCurrentEp(getExplorationPoints());
    }
  };

  const completedCount = taskState.completedTaskIds.length;
  const claimedCount = taskState.claimedTaskIds.length;
  const totalTasks = EXPLORATION_TASK_PRESETS.length;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
      <div 
        className="w-full max-w-xl rounded-3xl bg-[#091B14] border-2 border-[#1E5F46] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#0B251B] via-[#0E3526] to-[#0B251B] border-b border-[#1E5F46] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-xl shadow-inner">
              📋
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-wide text-white">
                  EXPLORATION MISSIONS
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-950 border border-emerald-400 text-emerald-300">
                  {claimedCount}/{totalTasks} Claimed
                </span>
              </div>
              <p className="text-xs text-emerald-300/80 font-medium">
                Complete distance walking tasks & claim 100, 200, or 300 EP!
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Claim Toast */}
        {claimToast && (
          <div className="mx-4 mt-3 p-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 font-black text-xs sm:text-sm flex items-center justify-between shadow-lg shadow-amber-500/30 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-950 fill-amber-950" />
              <span>{claimToast.msg}</span>
            </div>
            <div className="px-2 py-0.5 rounded-lg bg-amber-950 text-amber-200 text-xs font-black">
              +{claimToast.ep} EP
            </div>
          </div>
        )}

        {/* EP Balance Bar */}
        <div className="px-4 py-2.5 bg-[#06140F] border-b border-[#144433] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-emerald-300/90 font-medium">
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span>Walk distance anywhere to advance active mission</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-300 font-bold font-mono">
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>{currentEp} EP Available</span>
          </div>
        </div>

        {/* Tasks List */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-2.5 flex-1 divide-y divide-[#144433]/30">
          {EXPLORATION_TASK_PRESETS.map((task) => {
            const isActive = taskState.activeTaskId === task.id;
            const isCompleted = taskState.completedTaskIds.includes(task.id);
            const isClaimed = taskState.claimedTaskIds.includes(task.id);

            // Calculate progress meters
            let currentProg = 0;
            if (isClaimed || isCompleted) {
              currentProg = task.targetDistanceMeters;
            } else if (isActive) {
              currentProg = taskState.taskCurrentProgressMeters;
            }

            const percent = Math.min(100, Math.round((currentProg / task.targetDistanceMeters) * 100));

            return (
              <div 
                key={task.id}
                className={`pt-2.5 rounded-2xl p-3 sm:p-3.5 transition-all ${
                  isActive 
                    ? 'bg-emerald-950/70 border-2 border-emerald-400/80 shadow-lg shadow-emerald-950/50' 
                    : isClaimed
                    ? 'bg-[#071710]/60 border border-[#113A2B] opacity-75'
                    : 'bg-[#0A2017] border border-[#144433] hover:border-emerald-500/50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left: Icon & Title */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-[#06140F] border border-emerald-500/30 flex items-center justify-center text-xl shrink-0 shadow-inner">
                      {task.icon}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-white truncate">
                          {task.title}
                        </span>

                        {isActive && !isClaimed && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500 text-emerald-950 animate-pulse">
                            ACTIVE
                          </span>
                        )}

                        {isClaimed && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                            CLAIMED ✓
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-emerald-300/80 mt-0.5">
                        {task.description}
                      </p>
                    </div>
                  </div>

                  {/* Right: Reward Badge & Action */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className={`px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1 shadow-md ${
                      task.rewardEp === 300 
                        ? 'bg-amber-500 text-amber-950 border border-amber-300' 
                        : task.rewardEp === 200
                        ? 'bg-emerald-400 text-emerald-950 border border-emerald-300'
                        : 'bg-teal-500 text-teal-950 border border-teal-300'
                    }`}>
                      <Zap className="w-3 h-3 fill-current" />
                      <span>+{task.rewardEp} EP</span>
                    </div>

                    {isCompleted && !isClaimed ? (
                      <button
                        onClick={() => handleClaim(task.id)}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 text-amber-950 font-black text-xs uppercase tracking-wider flex items-center gap-1 shadow-lg shadow-amber-500/40 animate-bounce active:scale-95 transition-all cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>CLAIM EP</span>
                      </button>
                    ) : isClaimed ? (
                      <div className="px-3 py-1 rounded-xl bg-emerald-950 border border-emerald-600/40 text-emerald-400 text-xs font-black flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>DONE</span>
                      </div>
                    ) : isActive ? (
                      <div className="px-3 py-1 rounded-xl bg-emerald-900/60 border border-emerald-400/40 text-emerald-300 text-xs font-bold font-mono">
                        {percent}%
                      </div>
                    ) : (
                      <button
                        onClick={() => handleActivate(task.id)}
                        className="px-3 py-1.5 rounded-xl bg-[#0E2F23] hover:bg-emerald-600 hover:text-emerald-950 text-emerald-200 border border-emerald-500/40 font-bold text-xs uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>START</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-2.5">
                  <div className="flex items-center justify-between text-[10px] font-mono text-emerald-400 mb-1">
                    <span>Target: {task.targetDistanceMeters}m</span>
                    <span>{Math.round(currentProg)}m / {task.targetDistanceMeters}m ({percent}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#06140F] border border-[#144433] overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        isCompleted || isClaimed 
                          ? 'bg-gradient-to-r from-emerald-400 to-teal-300' 
                          : 'bg-gradient-to-r from-emerald-500 to-emerald-300'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-[#071710] border-t border-[#144433] flex items-center justify-between text-xs">
          <button
            onClick={() => {
              explorationTaskManager.resetAllTasks();
              setTaskState(explorationTaskManager.getState());
            }}
            className="text-[11px] text-emerald-400/70 hover:text-emerald-200 flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Missions</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
