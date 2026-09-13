import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Sparkles, 
  ChevronRight, 
  Compass, 
  CheckCircle2, 
  ListChecks, 
  Play, 
  Award 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { explorationTaskManager } from '../../utils/explorationTaskManager';
import { ExplorationTask, ExplorationTaskState } from '../../types/explorationTask';
import { sound } from '../../utils/audio';

interface ActiveTaskBannerProps {
  onOpenTasksModal: () => void;
  currentDistanceExplored: number;
}

export const ActiveTaskBanner: React.FC<ActiveTaskBannerProps> = ({
  onOpenTasksModal,
  currentDistanceExplored,
}) => {
  const [taskState, setTaskState] = useState<ExplorationTaskState>(() => explorationTaskManager.getState());

  useEffect(() => {
    // Whenever currentDistanceExplored updates, report progress to task manager
    explorationTaskManager.updateDistanceProgress(currentDistanceExplored);
    setTaskState(explorationTaskManager.getState());
  }, [currentDistanceExplored]);

  useEffect(() => {
    const handleUpdate = () => {
      setTaskState(explorationTaskManager.getState());
    };
    window.addEventListener('mb_task_state_changed', handleUpdate);
    return () => {
      window.removeEventListener('mb_task_state_changed', handleUpdate);
    };
  }, []);

  const activeTask = explorationTaskManager.getActiveTask();
  if (!activeTask) {
    return (
      <div className="rounded-2xl bg-[#091B14] border border-[#144433] p-3 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ListChecks className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold text-white">No Active Mission Selected</span>
        </div>
        <button
          onClick={onOpenTasksModal}
          className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black text-xs uppercase tracking-wider flex items-center gap-1 shadow-md transition-all cursor-pointer"
        >
          <span>Select Mission</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  const isCompleted = taskState.completedTaskIds.includes(activeTask.id);
  const isClaimed = taskState.claimedTaskIds.includes(activeTask.id);
  const currentProg = isClaimed || isCompleted 
    ? activeTask.targetDistanceMeters 
    : taskState.taskCurrentProgressMeters;

  const percent = Math.min(100, Math.round((currentProg / activeTask.targetDistanceMeters) * 100));

  const handleClaim = (e: React.MouseEvent) => {
    e.stopPropagation();
    const res = explorationTaskManager.claimReward(activeTask.id);
    if (res.success) {
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.7 },
        colors: ['#10B981', '#F59E0B', '#3B82F6'],
      });
      setTaskState(explorationTaskManager.getState());
    }
  };

  return (
    <div 
      onClick={onOpenTasksModal}
      className="rounded-2xl bg-gradient-to-r from-[#091B14] via-[#0D261D] to-[#091B14] border-2 border-[#1E5F46] hover:border-emerald-400/80 p-3 sm:p-3.5 shadow-xl transition-all cursor-pointer select-none group"
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: Icon & Mission Info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#06140F] border border-emerald-400/40 flex items-center justify-center text-lg shadow-inner shrink-0 group-hover:scale-105 transition-transform">
            {activeTask.icon}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                ACTIVE MISSION
              </span>
              <span className="px-2 py-0.2 rounded-full text-[9px] font-black uppercase bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                +{activeTask.rewardEp} EP
              </span>
            </div>
            <div className="text-xs sm:text-sm font-black text-white truncate">
              {activeTask.title}
            </div>
          </div>
        </div>

        {/* Right: Progress Pill & Action Button */}
        <div className="flex items-center gap-2 shrink-0">
          {isCompleted && !isClaimed ? (
            <button
              onClick={handleClaim}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-amber-950 font-black text-xs uppercase tracking-wider flex items-center gap-1 shadow-lg shadow-amber-500/30 animate-bounce active:scale-95 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 fill-current" />
              <span>CLAIM +{activeTask.rewardEp} EP</span>
            </button>
          ) : isClaimed ? (
            <div className="px-2.5 py-1 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-xs font-black flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>CLAIMED</span>
            </div>
          ) : (
            <div className="text-right">
              <div className="text-xs font-black font-mono text-emerald-300">
                {Math.round(currentProg)}m / {activeTask.targetDistanceMeters}m
              </div>
              <div className="text-[9px] font-bold text-emerald-400/80">
                {percent}% Done
              </div>
            </div>
          )}

          <div className="w-7 h-7 rounded-xl bg-[#0E2F23] border border-[#1E5F46] text-emerald-300 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-emerald-950 transition-colors">
            <ListChecks className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Progress Track */}
      <div className="mt-2.5 w-full h-1.5 rounded-full bg-[#06140F] border border-[#144433] overflow-hidden">
        <div 
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};
