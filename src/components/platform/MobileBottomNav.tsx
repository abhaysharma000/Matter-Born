import React from 'react';
import { 
  Swords, 
  Compass, 
  Anvil, 
  Crown, 
  Globe
} from 'lucide-react';
import { sound } from '../../utils/audio';

interface MobileBottomNavProps {
  activeTab: 'games' | 'servers' | 'armory' | 'forge' | 'tournaments' | 'clans' | 'developer' | 'expedition';
  onSelectTab: (tab: 'games' | 'servers' | 'armory' | 'forge' | 'tournaments' | 'clans' | 'developer' | 'expedition') => void;
  onOpenPass: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenPass,
}) => {
  const handleNav = (tab: 'games' | 'servers' | 'forge' | 'expedition') => {
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
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#EDF5EE]/95 backdrop-blur-xl border-t border-[#CFE2D3] pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 px-3 select-none shadow-[0_-8px_20px_rgba(20,56,35,0.06)]"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* 1. Arena Tab */}
        <button
          onClick={() => handleNav('games')}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-2 rounded-xl transition-transform active:scale-90 cursor-pointer ${
            activeTab === 'games' ? 'text-emerald-800' : 'text-[#5C7565] hover:text-[#143823]'
          }`}
        >
          <div
            className={`w-9 h-8 rounded-xl flex items-center justify-center transition-all ${
              activeTab === 'games'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-transparent text-[#5C7565]'
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
            activeTab === 'expedition' ? 'text-emerald-800' : 'text-[#5C7565] hover:text-[#143823]'
          }`}
        >
          <div
            className={`w-9 h-8 rounded-xl flex items-center justify-center transition-all ${
              activeTab === 'expedition'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-transparent text-[#5C7565]'
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
            activeTab === 'forge' ? 'text-amber-900' : 'text-[#5C7565] hover:text-[#143823]'
          }`}
        >
          <div
            className={`w-9 h-8 rounded-xl flex items-center justify-center transition-all ${
              activeTab === 'forge'
                ? 'bg-amber-700 text-white shadow-sm shadow-amber-900/30'
                : 'bg-transparent text-[#5C7565]'
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
          className="flex flex-col items-center justify-center min-w-[56px] py-1 px-2 rounded-xl transition-transform active:scale-90 cursor-pointer text-amber-900"
        >
          <div className="w-9 h-8 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-500 text-amber-950 flex items-center justify-center shadow-xs">
            <Crown className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-black tracking-tight mt-0.5 text-amber-950">
            Pass S1
          </span>
        </button>

        {/* 5. Online / Servers Tab */}
        <button
          onClick={() => handleNav('servers')}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-2 rounded-xl transition-transform active:scale-90 cursor-pointer ${
            activeTab === 'servers' ? 'text-emerald-800' : 'text-[#5C7565] hover:text-[#143823]'
          }`}
        >
          <div
            className={`w-9 h-8 rounded-xl flex items-center justify-center transition-all ${
              activeTab === 'servers'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-transparent text-[#5C7565]'
            }`}
          >
            <Globe className="w-4 h-4" />
          </div>
          <span className={`text-[10px] tracking-tight mt-0.5 ${activeTab === 'servers' ? 'font-black' : 'font-semibold'}`}>
            Servers
          </span>
        </button>
      </div>
    </nav>
  );
};
