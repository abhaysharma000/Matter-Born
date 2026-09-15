import React, { useState, useEffect } from 'react';
import { 
  Swords, 
  Volume2, 
  VolumeX, 
  Bot,
  Trophy,
  Crown,
  Compass,
  Anvil,
  Zap,
  Wifi
} from 'lucide-react';
import { PlatformUser } from '../../types/platform';
import { getExplorationPoints } from '../../utils/forgeManager';

interface NavbarProps {
  activeTab: 'games' | 'armory' | 'forge' | 'tournaments' | 'clans' | 'developer' | 'expedition';
  onSelectTab: (tab: 'games' | 'armory' | 'forge' | 'tournaments' | 'clans' | 'developer' | 'expedition') => void;
  user: PlatformUser;
  onOpenProfile: () => void;
  onOpenQuests: () => void;
  onQuickPlay: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  pendingQuestsCount: number;
  onOpenPass?: () => void;
  onOpenServerSettings?: () => void;
  onOpenAuth?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  user,
  onOpenProfile,
  soundEnabled,
  onToggleSound,
  onOpenPass,
  onOpenServerSettings,
  onOpenAuth,
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
    <header className="sticky top-0 z-40 w-full bg-[#E2ECE4]/95 backdrop-blur-xl border-b border-[#CADCD0] px-3 sm:px-6 py-2 sm:py-3 select-none transition-colors shadow-xs">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Left: Brand / Logo */}
        <div className="flex items-center gap-3 sm:gap-6 min-w-0">
          <button
            onClick={() => onSelectTab('games')}
            className="flex items-center gap-2 group transition-transform active:scale-95 text-left cursor-pointer min-w-0"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 p-0.5 shadow-md shadow-emerald-600/20 shrink-0">
              <div className="w-full h-full rounded-[10px] bg-[#0E3323] flex items-center justify-center">
                <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-300 group-hover:rotate-12 transition-transform" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-heading font-black text-sm sm:text-xl tracking-wider text-[#0E3323] truncate">
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
                  : 'text-[#2B5742] hover:text-[#0E3323] hover:bg-[#D5E3D8]'
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
                  : 'text-[#2B5742] hover:text-[#0E3323] hover:bg-[#D5E3D8]'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-amber-600" />
              <span>Explore</span>
            </button>

            <button
              onClick={() => onSelectTab('forge')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'forge'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30 font-black'
                  : 'text-[#2B5742] hover:text-[#0E3323] hover:bg-[#D5E3D8]'
              }`}
            >
              <Anvil className="w-3.5 h-3.5 text-amber-600" />
              <span>Forge</span>
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
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          
          {/* Exploration Points (EP) for The Forge */}
          <button
            onClick={() => onSelectTab('forge')}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-gradient-to-r from-amber-100 to-amber-200 hover:from-amber-200 hover:to-amber-300 border border-amber-400/80 text-[11px] sm:text-xs font-black text-amber-950 transition-colors shadow-xs active:scale-95 cursor-pointer shrink-0"
            title="Exploration Points (EP) - Click to upgrade your mech in The Forge"
          >
            <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600 fill-amber-500 animate-pulse" />
            <span className="font-mono">{ep.toLocaleString()}</span>
            <span className="text-[9px] sm:text-[10px] text-amber-800 font-sans font-black">EP</span>
          </button>

          {/* Gems */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#DCE8DE] border border-[#CADCD0] text-xs font-bold text-[#0E3323]">
            <span className="text-sm">💎</span>
            <span>{user.gems.toLocaleString()}</span>
          </div>

          {/* Wi-Fi LAN Server Settings */}
          <button
            id="navbar-wifi-server-btn"
            onClick={onOpenServerSettings}
            className="p-1.5 sm:p-2 rounded-xl bg-[#DCE8DE] hover:bg-[#D3E0D6] border border-[#CADCD0] text-emerald-800 hover:text-emerald-950 transition-colors cursor-pointer flex items-center gap-1 shrink-0"
            title="Wi-Fi LAN Server Settings & Teammates"
          >
            <Wifi className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-700" />
            <span className="hidden md:inline text-[10px] font-black uppercase tracking-wider">LAN</span>
          </button>

          {/* Audio toggle */}
          <button
            onClick={onToggleSound}
            className="p-1.5 sm:p-2 rounded-xl bg-[#DCE8DE] hover:bg-[#D3E0D6] border border-[#CADCD0] text-[#2B5742] hover:text-[#0E3323] transition-colors cursor-pointer"
            title={soundEnabled ? 'Mute Sound' : 'Unmute Sound'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-700" /> : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-stone-400" />}
          </button>

          {/* Player Avatar & Auth Indicator */}
          <button
            id="navbar-profile-btn"
            data-testid="navbar-profile-btn"
            onClick={onOpenProfile}
            className="flex items-center gap-1.5 pl-1 pr-1.5 sm:pl-1.5 sm:pr-2.5 py-1 rounded-xl bg-[#DCE8DE] hover:bg-[#D3E0D6] border border-[#CADCD0] transition-colors cursor-pointer relative"
            title={user.authProvider === 'google' ? `Logged in with Google: ${user.name}` : `Guest Pilot: ${user.name} (Tap to link Google)`}
          >
            <div className="relative">
              {user.avatarUrl ? (
                <img 
                  src={user.avatarUrl} 
                  alt={user.name} 
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg object-cover border border-emerald-500" 
                />
              ) : (
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-[10px] sm:text-xs font-black">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              {/* Provider indicator dot */}
              <span 
                className={`absolute -top-1 -right-1 w-2 h-2 rounded-full border border-white ${
                  user.authProvider === 'google' ? 'bg-blue-500' : 'bg-amber-500'
                }`} 
                title={user.authProvider === 'google' ? 'Google Connected' : 'Guest Account'}
              />
            </div>
            <span className="hidden xs:inline text-xs font-bold text-[#0E3323]">
              Lv.{user.level}
            </span>
          </button>

        </div>

      </div>
    </header>
  );
};
