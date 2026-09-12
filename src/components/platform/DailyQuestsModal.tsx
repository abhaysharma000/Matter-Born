import React from 'react';
import { 
  Scroll, 
  Clock, 
  Gem, 
  Check, 
  Gift, 
  Sparkles, 
  X 
} from 'lucide-react';
import { DailyQuest, PlatformUser } from '../../types/platform';
import confetti from 'canvas-confetti';

interface DailyQuestsModalProps {
  quests: DailyQuest[];
  user: PlatformUser;
  onUpdateQuests: (quests: DailyQuest[]) => void;
  onUpdateUser: (user: PlatformUser) => void;
  onClose: () => void;
}

export const DailyQuestsModal: React.FC<DailyQuestsModalProps> = ({
  quests,
  user,
  onUpdateQuests,
  onUpdateUser,
  onClose,
}) => {
  const handleClaim = (quest: DailyQuest) => {
    if (!quest.completed || quest.claimed) return;

    // Update quest status
    const updatedQuests = quests.map((q) =>
      q.id === quest.id ? { ...q, claimed: true } : q
    );
    onUpdateQuests(updatedQuests);

    // Reward user
    const updatedUser = {
      ...user,
      gems: user.gems + quest.rewardGems,
      currentXp: Math.min(user.maxXp, user.currentXp + (quest.rewardCoins || 120)),
    };
    onUpdateUser(updatedUser);

    confetti({ particleCount: 70, spread: 75, origin: { y: 0.6 } });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-[#F4F9F4] border border-[#CFE2D3] p-6 space-y-5 shadow-2xl relative text-[#143823]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-[#E8F2EA] hover:bg-[#DFEDE2] text-[#4D6957] hover:text-[#143823]"
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <h3 className="text-xl font-heading font-black text-[#143823] flex items-center gap-2">
            <Scroll className="w-5 h-5 text-emerald-700" />
            <span>Daily Missions & Quests</span>
          </h3>
          <p className="text-xs text-[#4D6957] mt-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Refreshes daily in 14 hours</span>
          </p>
        </div>

        {/* Quests List */}
        <div className="space-y-3">
          {quests.map((quest) => {
            const isFinished = quest.completed || quest.progress >= quest.target;
            const canClaim = isFinished && !quest.claimed;

            return (
              <div
                key={quest.id}
                className="p-4 rounded-xl bg-[#E8F2EA] border border-[#CFE2D3] space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-sm text-[#143823]">{quest.title}</h4>
                    <p className="text-xs text-[#4D6957] mt-0.5">{quest.description}</p>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-bold shrink-0">
                    <span className="text-emerald-800 bg-emerald-100/70 border border-emerald-300/80 px-2 py-0.5 rounded-md flex items-center gap-0.5">
                      +{quest.rewardCoins > 0 ? quest.rewardCoins : 120} XP
                    </span>
                    {quest.rewardGems > 0 && (
                      <span className="text-teal-700 flex items-center gap-0.5">
                        <Gem className="w-3 h-3" />
                        +{quest.rewardGems}
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-[#4D6957]">
                    <span>Progress</span>
                    <span className="font-mono text-emerald-800 font-bold">
                      {Math.min(quest.progress, quest.target)} / {quest.target}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#CFE2D3] overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (quest.progress / quest.target) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Claim button */}
                <div className="pt-1">
                  {quest.claimed ? (
                    <div className="text-center py-1.5 rounded-lg bg-[#DFEFE2] border border-[#BCD8C3] text-xs font-bold text-[#587563] flex items-center justify-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>COMPLETED & CLAIMED</span>
                    </div>
                  ) : canClaim ? (
                    <button
                      onClick={() => handleClaim(quest)}
                      className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-700/20 active:scale-95 transition-all"
                    >
                      <Gift className="w-3.5 h-3.5" />
                      <span>CLAIM REWARD</span>
                    </button>
                  ) : (
                    <div className="text-center py-1.5 rounded-lg bg-[#DFEFE2] border border-[#BCD8C3] text-xs font-medium text-[#4D6957]">
                      In Progress...
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
