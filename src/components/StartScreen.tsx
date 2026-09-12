import React, { useState, useEffect } from 'react';
import { GameMode, PersistentStats, SkinConfig } from '../types';
import { ICONS_LIST, SKINS } from '../utils/constants';
import { sound } from '../utils/audio';
import {
  Play,
  Trophy,
  Crown,
  Zap,
  Flame,
  Star,
  Shield,
  Leaf,
  Heart,
  Rocket,
  Diamond,
  Volume2,
  VolumeX,
  HelpCircle,
  Timer,
  Swords,
  Sparkles,
  Info,
} from 'lucide-react';

interface StartScreenProps {
  onStartGame: (name: string, skin: SkinConfig, mode: GameMode) => void;
  savedStats: PersistentStats;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  onStartGame,
  savedStats,
}) => {
  const [playerName, setPlayerName] = useState<string>(
    savedStats.playerName || 'Player'
  );
  const [selectedSkin, setSelectedSkin] = useState<SkinConfig>(
    SKINS.find((s) => s.id === savedStats.favoriteSkinId) || SKINS[0]
  );
  const [selectedIcon, setSelectedIcon] = useState<string>(
    selectedSkin.icon || 'crown'
  );
  const [gameMode, setGameMode] = useState<GameMode>('classic');
  const [isMuted, setIsMuted] = useState<boolean>(sound.isMuted);
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(false);

  useEffect(() => {
    setSelectedIcon(selectedSkin.icon);
  }, [selectedSkin]);

  const handleStart = () => {
    sound.playClick();
    const finalSkin: SkinConfig = {
      ...selectedSkin,
      icon: selectedIcon,
    };
    onStartGame(playerName, finalSkin, gameMode);
  };

  const handleMuteToggle = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
    if (!muted) sound.playClick();
  };

  const renderIconComponent = (iconName: string, className = 'w-5 h-5') => {
    switch (iconName) {
      case 'crown':
        return <Crown className={className} />;
      case 'zap':
        return <Zap className={className} />;
      case 'flame':
        return <Flame className={className} />;
      case 'star':
        return <Star className={className} />;
      case 'shield':
        return <Shield className={className} />;
      case 'leaf':
        return <Leaf className={className} />;
      case 'heart':
        return <Heart className={className} />;
      case 'rocket':
        return <Rocket className={className} />;
      case 'diamond':
        return <Diamond className={className} />;
      default:
        return <Crown className={className} />;
    }
  };

  return (
    <div
      id="start-screen-modal"
      className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto"
    >
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 flex flex-col gap-6 text-white my-auto">
        {/* Top Header Buttons */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>v2.0 Arena</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="start-btn-howto"
              onClick={() => {
                sound.playClick();
                setShowHowToPlay(true);
              }}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
              title="How to Play"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              id="start-btn-mute"
              onClick={handleMuteToggle}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
          </div>
        </div>

        {/* Title Logo */}
        <div className="text-center flex flex-col items-center">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight flex items-center gap-2 font-heading">
            <span className="text-rose-500">PAPER</span>
            <span className="text-cyan-400">.IO</span>
            <span className="text-xs uppercase bg-amber-500 text-slate-950 px-2 py-0.5 rounded-md font-extrabold tracking-normal align-middle">
              ARENA
            </span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 font-medium">
            Conquer territory, slice competitor trails, rule the paper kingdom!
          </p>
        </div>

        {/* Character Preview & Name Input */}
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/60">
          {/* Animated Avatar Box */}
          <div className="relative group shrink-0">
            <div
              className="w-16 h-16 rounded-2xl shadow-lg flex items-center justify-center relative transition-transform transform group-hover:scale-105"
              style={{
                backgroundColor: selectedSkin.primaryColor,
                border: `3px solid ${selectedSkin.strokeColor}`,
              }}
            >
              {/* Cute Eyes */}
              <div className="absolute -top-1.5 flex gap-2">
                <div className="w-3 h-3 rounded-full bg-white flex items-center justify-center shadow-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                </div>
                <div className="w-3 h-3 rounded-full bg-white flex items-center justify-center shadow-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                </div>
              </div>

              {/* Icon badge */}
              <div className="text-white drop-shadow-sm">
                {renderIconComponent(selectedIcon, 'w-7 h-7')}
              </div>
            </div>
          </div>

          {/* Name Input */}
          <div className="w-full flex flex-col gap-1.5">
            <label
              htmlFor="player-name-input"
              className="text-xs font-bold text-slate-400 uppercase tracking-wider"
            >
              Player Nickname
            </label>
            <input
              id="player-name-input"
              type="text"
              maxLength={14}
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-bold text-base focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
            />
          </div>
        </div>

        {/* Color / Skin Palette Selector */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Paper Color
            </span>
            <span className="text-xs font-semibold text-slate-300">
              {selectedSkin.name}
            </span>
          </div>
          <div className="grid grid-cols-5 sm:grid-cols-9 gap-2">
            {SKINS.map((skin) => (
              <button
                key={skin.id}
                id={`skin-btn-${skin.id}`}
                onClick={() => {
                  sound.playClick();
                  setSelectedSkin(skin);
                }}
                className={`h-9 rounded-xl transition-all relative flex items-center justify-center ${
                  selectedSkin.id === skin.id
                    ? 'ring-2 ring-white scale-110 shadow-lg z-10'
                    : 'hover:scale-105 opacity-80 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: skin.primaryColor,
                  border: `2px solid ${skin.strokeColor}`,
                }}
                title={skin.name}
              >
                {selectedSkin.id === skin.id && (
                  <div className="w-2 h-2 rounded-full bg-white shadow" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Icon / Emblem Selector */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Emblem
          </span>
          <div className="grid grid-cols-5 sm:grid-cols-9 gap-2">
            {ICONS_LIST.map((iconName) => (
              <button
                key={iconName}
                id={`icon-btn-${iconName}`}
                onClick={() => {
                  sound.playClick();
                  setSelectedIcon(iconName);
                }}
                className={`h-9 rounded-xl flex items-center justify-center transition-all border ${
                  selectedIcon === iconName
                    ? 'bg-slate-700 border-white text-white scale-105 shadow'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {renderIconComponent(iconName, 'w-4 h-4')}
              </button>
            ))}
          </div>
        </div>

        {/* Game Mode Selector */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Game Mode
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              id="mode-btn-classic"
              onClick={() => {
                sound.playClick();
                setGameMode('classic');
              }}
              className={`p-2.5 rounded-xl border flex flex-col items-center text-center gap-1 transition-all ${
                gameMode === 'classic'
                  ? 'bg-rose-500/20 border-rose-500 text-white font-bold'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              <Crown className="w-4 h-4 text-rose-400" />
              <span className="text-xs font-bold">Classic</span>
              <span className="text-[10px] text-slate-400">Conquer 100%</span>
            </button>

            <button
              id="mode-btn-rush"
              onClick={() => {
                sound.playClick();
                setGameMode('rush');
              }}
              className={`p-2.5 rounded-xl border flex flex-col items-center text-center gap-1 transition-all ${
                gameMode === 'rush'
                  ? 'bg-indigo-500/20 border-indigo-500 text-white font-bold'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              <Timer className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold">2-Min Rush</span>
              <span className="text-[10px] text-slate-400">Timed Score</span>
            </button>

            <button
              id="mode-btn-royale"
              onClick={() => {
                sound.playClick();
                setGameMode('royale');
              }}
              className={`p-2.5 rounded-xl border flex flex-col items-center text-center gap-1 transition-all ${
                gameMode === 'royale'
                  ? 'bg-amber-500/20 border-amber-500 text-white font-bold'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              <Swords className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold">Battle Royale</span>
              <span className="text-[10px] text-slate-400">Shrinking Zone</span>
            </button>
          </div>
        </div>

        {/* High Scores Summary */}
        <div className="grid grid-cols-3 gap-2 bg-slate-800/40 p-3 rounded-2xl border border-slate-800 text-center">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-500">
              Best Map %
            </span>
            <span className="text-base font-extrabold text-emerald-400">
              {(savedStats?.highScorePercentage ?? 0).toFixed(1)}%
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-500">
              Max Kills
            </span>
            <span className="text-base font-extrabold text-rose-400">
              {savedStats.mostKillsInGame}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-500">
              Victories
            </span>
            <span className="text-base font-extrabold text-amber-400">
              {savedStats.victories}
            </span>
          </div>
        </div>

        {/* Big PLAY Button */}
        <button
          id="start-btn-play"
          onClick={handleStart}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-black text-xl tracking-wide shadow-xl hover:shadow-rose-500/30 flex items-center justify-center gap-2 transform active:scale-98 transition-all"
        >
          <Play className="w-6 h-6 fill-white" />
          <span>PLAY ARENA</span>
        </button>
      </div>

      {/* How to Play Modal */}
      {showHowToPlay && (
        <div
          id="howto-modal"
          className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        >
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 text-white flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 font-bold text-lg">
                <Info className="w-5 h-5 text-cyan-400" />
                <span>How to Play Paper.io</span>
              </div>
              <button
                id="howto-close-btn"
                onClick={() => {
                  sound.playClick();
                  setShowHowToPlay(false);
                }}
                className="text-slate-400 hover:text-white font-bold text-sm px-2 py-1 rounded bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3 text-sm text-slate-300">
              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-xs">
                  1
                </div>
                <div>
                  <strong className="text-white">Conquer Land:</strong> Leave your
                  base to draw a trail. Circle back to your territory to claim all
                  enclosed area!
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 font-bold flex items-center justify-center shrink-0 text-xs">
                  2
                </div>
                <div>
                  <strong className="text-white">Eliminate Opponents:</strong> If
                  an opponent is outside their territory, run across their trail
                  to slice them and claim a kill!
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 text-xs">
                  3
                </div>
                <div>
                  <strong className="text-white">Protect Your Tail:</strong> While
                  outside your base, your trail is vulnerable. Don&apos;t let anyone
                  cross it or run into your own trail!
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center shrink-0 text-xs">
                  4
                </div>
                <div>
                  <strong className="text-white">Controls:</strong> Steer using{' '}
                  <strong>Arrow Keys</strong>, <strong>WASD</strong>, or by{' '}
                  <strong>clicking/dragging</strong> on desktop & mobile touchscreens.
                </div>
              </div>
            </div>

            <button
              id="howto-gotit-btn"
              onClick={() => {
                sound.playClick();
                setShowHowToPlay(false);
              }}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition-colors mt-2"
            >
              Got It!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
