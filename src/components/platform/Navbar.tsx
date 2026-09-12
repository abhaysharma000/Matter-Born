import React from 'react';
import { 
  Swords, 
  ShoppingBag,
  Volume2, 
  VolumeX, 
  Bot,
  Globe,
  Trophy,
  Crown,
  Compass
} from 'lucide-react';
import { PlatformUser } from '../../types/platform';
import { PWAInstallButton } from '../pwa/PWAInstallButton';

interface NavbarProps {
  activeTab: 'games' | 'servers' | 'armory' | 'tournaments' | 'clans' | 'developer' | 'expedition';
  onSelectTab: (tab: 'games' | 'servers' | 'armory' | 'tournaments' | 'clans' | 'developer' | 'expedition') => void;
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
  return (
    <header className="sticky top-0 z-40 w-full bg-[#EDF5EE]/95 backdrop-blur-xl border-b border-[#CFE2D3] px-4 sm:px-6 py-3 select-none transition-colors">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
        
        {/* Left: Brand / Logo */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => onSelectTab('games')}
            className="flex items-center gap-2.5 group transition-transform active:scale-95 text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-green-500 p-0.5 shadow-sm">
              <div className="w-full h-full rounded-[10px] bg-[#EDF5EE] flex items-center justify-center">
                <Bot className="w-5 h-5 text-emerald-700 group-hover:rotate-12 transition-transform" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-heading font-black text-lg tracking-wider text-[#14532D]">
                ANIMATRIX
              </span>
              <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                3D
              </span>
            </div>
          </button>

          {/* Desktop Navigation - Simple, Clean 3 Tabs */}
          <nav className="hidden md:flex items-center gap-1.5">
            <button
              onClick={() => onSelectTab('games')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'games'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-[#4D6957] hover:text-[#143823] hover:bg-[#E2EDE4]'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Arena</span>
            </button>

            <button
              onClick={() => onSelectTab('expedition')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'expedition'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-[#4D6957] hover:text-[#143823] hover:bg-[#E2EDE4]'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-amber-500" />
              <span>Expedition</span>
            </button>

            <button
              onClick={() => onSelectTab('armory')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'armory'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-[#4D6957] hover:text-[#143823] hover:bg-[#E2EDE4]'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Locker</span>
            </button>

            <button
              onClick={() => onSelectTab('servers')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'servers'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-[#4D6957] hover:text-[#143823] hover:bg-[#E2EDE4]'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
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
              <span>Cybertron Pass</span>
              <span className="px-1 py-0.2 rounded bg-amber-950/20 text-[9px] font-black">S1</span>
            </button>
          </nav>
        </div>

        {/* Right Section: Currencies, Audio, Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Gold Coins */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#E4EFE6] border border-[#BCD8C3] text-xs font-bold text-[#143823]">
            <span className="text-sm">🪙</span>
            <span>{user.coins.toLocaleString()}</span>
          </div>

          {/* Gems */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#E4EFE6] border border-[#BCD8C3] text-xs font-bold text-[#143823]">
            <span className="text-sm">💎</span>
            <span>{user.gems.toLocaleString()}</span>
          </div>

          {/* Install App Button */}
          <PWAInstallButton />

          {/* Audio toggle */}
          <button
            onClick={onToggleSound}
            className="p-2 rounded-xl bg-[#E4EFE6] hover:bg-[#DAEADB] border border-[#BCD8C3] text-[#4D6957] hover:text-[#143823] transition-colors"
            title={soundEnabled ? 'Mute Sound' : 'Unmute Sound'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-stone-400" />}
          </button>

          {/* Player Avatar */}
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl bg-[#E4EFE6] hover:bg-[#DAEADB] border border-[#BCD8C3] transition-colors"
            title="View Profile & Stats"
          >
            <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-black">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-bold text-[#143823] hidden sm:inline">
              Lv.{user.level}
            </span>
          </button>

        </div>

      </div>

      {/* Mobile Sub-Navigation Tabs */}
      <div className="md:hidden flex items-center justify-around pt-2.5 mt-2.5 border-t border-[#CFE2D3] text-xs font-bold">
        <button
          onClick={() => onSelectTab('games')}
          className={`flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg transition-colors ${
            activeTab === 'games' ? 'text-white bg-emerald-700' : 'text-[#4D6957]'
          }`}
        >
          <Swords className="w-3.5 h-3.5" />
          <span>Arena</span>
        </button>
        <button
          onClick={() => onSelectTab('expedition')}
          className={`flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg transition-colors ${
            activeTab === 'expedition' ? 'text-white bg-emerald-700' : 'text-[#4D6957]'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Explore</span>
        </button>
        <button
          onClick={() => onSelectTab('armory')}
          className={`flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg transition-colors ${
            activeTab === 'armory' ? 'text-white bg-emerald-700' : 'text-[#4D6957]'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Locker</span>
        </button>
        <button
          onClick={() => onSelectTab('servers')}
          className={`flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg transition-colors ${
            activeTab === 'servers' ? 'text-white bg-emerald-700' : 'text-[#4D6957]'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Servers</span>
        </button>
      </div>
    </header>
  );
};
