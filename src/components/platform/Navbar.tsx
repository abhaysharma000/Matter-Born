import React, { useState, useEffect } from 'react';
import { 
  Swords, 
  Volume2, 
  VolumeX, 
  Bot,
  Globe,
  Trophy,
  Crown,
  Compass,
  Anvil,
  Zap
} from 'lucide-react';
import { PlatformUser } from '../../types/platform';
import { getExplorationPoints } from '../../utils/forgeManager';

interface NavbarProps {
  activeTab: 'games' | 'servers' | 'armory' | 'forge' | 'tournaments' | 'clans' | 'developer' | 'expedition';
  onSelectTab: (tab: 'games' | 'servers' | 'armory' | 'forge' | 'tournaments' | 'clans' | 'developer' | 'expedition') => void;
  user: PlatformUser;
  onOpenProfile: () => void;
  onOpenQuests: () => void;
  onQuickPlay: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  pendingQuestsCount: number;
  onOpenPass?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  user,
  onOpenProfile,
  soundEnabled,
  onToggleSound,
  onOpenPass,
}) => {
  const [ep, setEp] = useState<number>(getExplorationPoints());

  useEffect(() => {
    const handleUpdate = () => {
      setEp(getExplorationPoints());
    };
    window.addEventListener('animatrix_forge_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('animatrix_forge_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);
  return (
    <header className="sticky top-0 z-40 w-full bg-[#0D2E21]/95 backdrop-blur-xl border-b border-[#1B523B] px-4 sm:px-6 py-3 select-none transition-colors">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
        
        {/* Left: Brand / Logo */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => onSelectTab('games')}
            className="flex items-center gap-2.5 group transition-transform active:scale-95 text-left cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-md shadow-emerald-500/20">
              <div className="w-full h-full rounded-[10px] bg-[#071912] flex items-center justify-center">
                <Bot className="w-5 h-5 text-emerald-400 group-hover:rotate-12 transition-transform" />
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-heading font-black text-lg sm:text-xl tracking-wider text-white">
                Matter-Born
              </span>
            </div>
          </button>

          {/* Desktop Navigation - Clean 4 Tabs */}
          <nav className="hidden md:flex items-center gap-1.5">
            <button
              onClick={() => onSelectTab('games')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'games'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-black'
                  : 'text-[#8BA996] hover:text-white hover:bg-[#123024]'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Arena</span>
            </button>

            <button
              onClick={() => onSelectTab('expedition')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'expedition'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-black'
                  : 'text-[#8BA996] hover:text-white hover:bg-[#123024]'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span>Explore</span>
            </button>

            <button
              onClick={() => onSelectTab('forge')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'forge'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30 font-black'
                  : 'text-[#8BA996] hover:text-white hover:bg-[#123024]'
              }`}
            >
              <Anvil className="w-3.5 h-3.5 text-amber-400" />
              <span>Forge</span>
            </button>

            <button
              onClick={() => onSelectTab('servers')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'servers'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-black'
                  : 'text-[#8BA996] hover:text-white hover:bg-[#123024]'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-teal-400" />
              <span>Servers</span>
            </button>

            {/* Cybertronian Season Pass Shortcut */}
            <button
              onClick={() => {
                if (onOpenPass) {
                  onOpenPass();
                } else {
                  onSelectTab('games');
                }
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-amber-950 shadow-xs active:scale-95 cursor-pointer"
              title="Transformers Cybertronian Pass Season 1"
            >
              <Crown className="w-3.5 h-3.5" />
              <span>Pass S1</span>
            </button>
          </nav>
        </div>

        {/* Right Section: Currencies, Audio, Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Exploration Points (EP) for The Forge */}
          <button
            onClick={() => onSelectTab('forge')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-950/80 to-amber-900/80 hover:from-amber-900 hover:to-amber-800 border border-amber-500/50 text-xs font-black text-amber-300 transition-colors shadow-sm active:scale-95 cursor-pointer"
            title="Exploration Points (EP) - Click to upgrade your mech in The Forge"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
            <span className="font-mono">{ep.toLocaleString()}</span>
            <span className="text-[10px] text-amber-400 font-sans font-black">EP</span>
          </button>

          {/* Gems */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0E2A1F] border border-[#1E5C44] text-xs font-bold text-emerald-200">
            <span className="text-sm">💎</span>
            <span>{user.gems.toLocaleString()}</span>
          </div>

          {/* Audio toggle */}
          <button
            onClick={onToggleSound}
            className="p-2 rounded-xl bg-[#0E2A1F] hover:bg-[#153D2D] border border-[#1E5C44] text-[#8BA996] hover:text-white transition-colors cursor-pointer"
            title={soundEnabled ? 'Mute Sound' : 'Unmute Sound'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-stone-500" />}
          </button>

          {/* Player Avatar */}
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl bg-[#0E2A1F] hover:bg-[#153D2D] border border-[#1E5C44] transition-colors cursor-pointer"
            title="View Profile & Stats"
          >
            <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-black">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-bold text-emerald-200">
              Lv.{user.level}
            </span>
          </button>

        </div>

      </div>
    </header>
  );
};
