import React, { useState, useEffect } from 'react';
import { Wifi, Server, Check, RefreshCw, X, Shield, Users, Radio } from 'lucide-react';
import { multiplayerManager } from '../../utils/multiplayerManager';
import { sound } from '../../utils/audio';

interface LanServerModalProps {
  onClose: () => void;
}

export const LanServerModal: React.FC<LanServerModalProps> = ({ onClose }) => {
  const [hostUrl, setHostUrl] = useState(() => multiplayerManager.getServerHostUrl());
  const [status, setStatus] = useState<'idle' | 'checking' | 'connected' | 'error'>('idle');
  const [latency, setLatency] = useState<number | null>(null);
  const [activeCount, setActiveCount] = useState<number>(0);
  const [feedback, setFeedback] = useState<string | null>(null);

  const testConnection = async (targetUrl = hostUrl) => {
    setStatus('checking');
    const start = Date.now();
    try {
      const clean = targetUrl.trim().replace(/\/+$/, '');
      const res = await fetch(`${clean}/api/health`, { method: 'GET' });
      const elapsed = Date.now() - start;
      if (res.ok) {
        setStatus('connected');
        setLatency(elapsed);
        // Query active teammates
        try {
          const activeRes = await fetch(`${clean}/api/multiplayer/presence/active`);
          if (activeRes.ok) {
            const data = await activeRes.json();
            setActiveCount(Array.isArray(data.players) ? data.players.length : 0);
          }
        } catch {}
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  const handleSave = () => {
    sound.playClick();
    const clean = hostUrl.trim().replace(/\/+$/, '');
    multiplayerManager.setServerHostUrl(clean);
    setFeedback('Server configuration saved!');
    testConnection(clean);
    setTimeout(() => {
      setFeedback(null);
      onClose();
    }, 1200);
  };

  const handleResetDefault = () => {
    sound.playClick();
    const defaultHost = 'http://172.32.1.134:3000';
    setHostUrl(defaultHost);
    testConnection(defaultHost);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-[#F4F9F5] border-2 border-[#184635] rounded-3xl p-5 shadow-2xl space-y-4 text-[#0E3323] relative overflow-hidden"
        style={{
          boxShadow: '0 25px 50px -12px rgba(14, 51, 35, 0.4), 0 0 40px rgba(43, 226, 158, 0.2)'
        }}
      >
        {/* Header decoration */}
        <div className="flex items-center justify-between border-b border-[#CFE2D3] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-black font-heading text-[#0E3323]">
                Wi-Fi LAN Server
              </h3>
              <p className="text-xs text-[#4D6957]">
                Local Multi-Device Teammate Sync
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-2 rounded-xl bg-[#E8F2EA] hover:bg-[#DCE8DE] text-[#4D6957] hover:text-[#0E3323] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Status Card */}
        <div className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
          status === 'connected'
            ? 'bg-emerald-100/70 border-emerald-400 text-emerald-950'
            : status === 'checking'
            ? 'bg-amber-100/70 border-amber-300 text-amber-950'
            : 'bg-red-100/70 border-red-300 text-red-950'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-3 h-3 rounded-full ${
              status === 'connected'
                ? 'bg-emerald-500 animate-ping'
                : status === 'checking'
                ? 'bg-amber-500 animate-pulse'
                : 'bg-red-500'
            }`} />
            <div>
              <div className="text-xs font-black uppercase tracking-wider">
                {status === 'connected' ? 'Server Connected' : status === 'checking' ? 'Checking Link...' : 'Offline / Host Unreachable'}
              </div>
              <div className="text-[11px] opacity-80 font-mono">
                {status === 'connected' && latency !== null ? `Latency: ${latency}ms • ${activeCount} Players Online` : 'Verify laptop is on same Wi-Fi'}
              </div>
            </div>
          </div>
          <button
            onClick={() => testConnection()}
            disabled={status === 'checking'}
            className="p-2 rounded-xl bg-white/70 hover:bg-white text-[#0E3323] border border-black/10 shadow-xs cursor-pointer active:scale-95"
            title="Ping Server"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${status === 'checking' ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Host URL Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#143823] flex items-center justify-between">
            <span>Server IP & Port (Laptop on Wi-Fi)</span>
            <button
              type="button"
              onClick={handleResetDefault}
              className="text-[11px] text-emerald-700 hover:underline font-bold cursor-pointer"
            >
              Reset to 172.32.1.134
            </button>
          </label>
          <div className="relative">
            <input
              type="text"
              value={hostUrl}
              onChange={(e) => setHostUrl(e.target.value)}
              placeholder="http://172.32.1.134:3000"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#E8F2EA] border border-[#CFE2D3] font-mono text-xs text-[#0E3323] focus:outline-hidden focus:border-emerald-600 shadow-inner"
            />
            <Server className="w-4 h-4 text-[#4D6957] absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
          <p className="text-[11px] text-[#4D6957]">
            Make sure your team's phones and your laptop are on the same Wi-Fi network.
          </p>
        </div>

        {/* Info box for teammates */}
        <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 text-[11px] text-emerald-900 space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-emerald-800">
            <Users className="w-3.5 h-3.5" />
            <span>4-Player Team Instructions:</span>
          </div>
          <p>
            1. Keep laptop running <code>node dist/server.cjs</code> or <code>npm run dev</code> on Wi-Fi.
          </p>
          <p>
            2. Install the APK on all 4 phones.
          </p>
          <p>
            3. Open <strong>Explore</strong> tab to see all teammates live on OpenStreetMap with radar beacons!
          </p>
        </div>

        {feedback && (
          <div className="p-2 rounded-xl bg-emerald-600 text-white text-xs font-bold text-center animate-in fade-in">
            ✓ {feedback}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-[#E8F2EA] hover:bg-[#DCE8DE] text-[#0E3323] font-bold text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Save & Connect</span>
          </button>
        </div>
      </div>
    </div>
  );
};
