import React from 'react';
import { GameEngine } from '../game/GameEngine';
import { sound } from '../utils/audio';
import { Play, RotateCcw, Menu, Volume2, VolumeX } from 'lucide-react';

interface PauseModalProps {
  engine: GameEngine;
  onResume: () => void;
  onRestart: () => void;
  onReturnToMenu: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  engine,
  onResume,
  onRestart,
  onReturnToMenu,
}) => {
  const [isMuted, setIsMuted] = React.useState(sound.isMuted);

  const handleMuteToggle = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
    if (!muted) sound.playClick();
  };

  return (
    <div
      id="pause-modal"
      className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md"
    >
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col items-center gap-5 text-white text-center">
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight font-heading">
          GAME PAUSED
        </h2>

        {/* Current status */}
        <div className="w-full grid grid-cols-2 gap-2 bg-slate-800/50 p-3 rounded-2xl border border-slate-700/60 text-xs">
          <div>
            <span className="text-slate-400">Territory</span>
            <p className="font-extrabold text-base text-emerald-400">
              {(engine?.player?.territoryPercentage ?? 0).toFixed(1)}%
            </p>
          </div>
          <div>
            <span className="text-slate-400">Kills</span>
            <p className="font-extrabold text-base text-rose-400">
              {engine.player.kills}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-2.5">
          <button
            id="pause-btn-resume"
            onClick={() => {
              sound.playClick();
              onResume();
            }}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 font-extrabold text-base shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all transform active:scale-98"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>RESUME</span>
          </button>

          <button
            id="pause-btn-restart"
            onClick={() => {
              sound.playClick();
              onRestart();
            }}
            className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RESTART MATCH</span>
          </button>

          <div className="w-full grid grid-cols-2 gap-2">
            <button
              id="pause-btn-mute"
              onClick={handleMuteToggle}
              className="py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              <span>{isMuted ? 'Unmute' : 'Mute'}</span>
            </button>

            <button
              id="pause-btn-menu"
              onClick={() => {
                sound.playClick();
                onReturnToMenu();
              }}
              className="py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Menu className="w-4 h-4" />
              <span>Menu</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
