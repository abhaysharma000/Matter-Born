import React from 'react';
import { 
  Swords, 
  Compass, 
  Anvil, 
  Crown 
} from 'lucide-react';
import { sound } from '../../utils/audio';

interface MobileBottomNavProps {
  activeTab: 'games' | 'armory' | 'forge' | 'tournaments' | 'clans' | 'developer' | 'expedition';
  onSelectTab: (tab: 'games' | 'armory' | 'forge' | 'tournaments' | 'clans' | 'developer' | 'expedition') => void;
  onOpenPass: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenPass,
}) => {
  const handleNav = (tab: 'games' | 'forge' | 'expedition') => {
    sound.playClick();
    onSelectTab(tab);
  };

  const handlePass = () => {
    sound.playClick();
    onOpenPass();
  };

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#E2ECE4]/95 backdrop-blur-xl border-t border-[#CADCD0] pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 px-3 select-none shadow-[0_-4px_16px_rgba(14,51,35,0.08)]"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* 1. Arena Tab */}
        <button
          onClick={() => handleNav('games')}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-2 rounded-xl transition-transform active:scale-90 cursor-pointer ${
            activeTab === 'games' ? 'text-emerald-700' : 'text-[#3E6953] hover:text-[#0E3323]'
          }`}
        >
          <div
            className={`w-9 h-8 rounded-xl flex items-center justify-center transition-all ${
              activeTab === 'games'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'bg-transparent text-[#3E6953]'
            }`}
          >
            <Swords className="w-4 h-4" />
          </div>
          <span className={`text-[10px] tracking-tight mt-0.5 ${activeTab === 'games' ? 'font-black' : 'font-semibold'}`}>
            Arena
          </span>
        </button>

        {/* 2. Expedition / Walk Tab */}
        <button
          onClick={() => handleNav('expedition')}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-2 rounded-xl transition-transform active:scale-90 cursor-pointer ${
            activeTab === 'expedition' ? 'text-emerald-700' : 'text-[#3E6953] hover:text-[#0E3323]'
          }`}
        >
          <div
            className={`w-9 h-8 rounded-xl flex items-center justify-center transition-all ${
              activeTab === 'expedition'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'bg-transparent text-[#3E6953]'
            }`}
          >
            <Compass className="w-4 h-4" />
          </div>
          <span className={`text-[10px] tracking-tight mt-0.5 ${activeTab === 'expedition' ? 'font-black' : 'font-semibold'}`}>
            Explore
          </span>
        </button>

        {/* 3. The Forge Tab */}
        <button
          onClick={() => handleNav('forge')}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-2 rounded-xl transition-transform active:scale-90 cursor-pointer ${
            activeTab === 'forge' ? 'text-amber-800' : 'text-[#3E6953] hover:text-[#0E3323]'
          }`}
        >
          <div
            className={`w-9 h-8 rounded-xl flex items-center justify-center transition-all ${
              activeTab === 'forge'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'bg-transparent text-[#3E6953]'
            }`}
          >
            <Anvil className="w-4 h-4" />
          </div>
          <span className={`text-[10px] tracking-tight mt-0.5 ${activeTab === 'forge' ? 'font-black' : 'font-semibold'}`}>
            Forge
          </span>
        </button>

        {/* 4. Cybertron Pass Tab */}
        <button
          onClick={handlePass}
          className="flex flex-col items-center justify-center min-w-[56px] py-1 px-2 rounded-xl transition-transform active:scale-90 cursor-pointer text-amber-800"
        >
          <div className="w-9 h-8 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-500 text-amber-950 flex items-center justify-center shadow-xs">
            <Crown className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-black tracking-tight mt-0.5 text-amber-900">
            Pass S1
          </span>
        </button>
      </div>
    </nav>
  );
};
