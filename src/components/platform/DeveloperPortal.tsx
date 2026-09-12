import React, { useState } from 'react';
import { 
  Code2, 
  Rocket, 
  Terminal, 
  Cpu, 
  DollarSign, 
  Users, 
  Layers, 
  CheckCircle2, 
  Copy, 
  Check, 
  Send,
  Sparkles,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const DeveloperPortal: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'sdk' | 'submit'>('overview');

  // Submit form state
  const [gameTitle, setGameTitle] = useState('');
  const [developerEmail, setDeveloperEmail] = useState('');
  const [gameUrl, setGameUrl] = useState('');
  const [gameCategory, setGameCategory] = useState('Territory');
  const [submitted, setSubmitted] = useState(false);

  const sdkCodeSample = `// Paper.io Platform Game SDK Integration
import { PaperPlatformSDK } from '@paperio/game-sdk';

// 1. Initialize with your registered Game ID
const sdk = new PaperPlatformSDK({
  gameId: 'your-custom-io-game',
  version: '1.4.0',
});

// 2. Connect to Multiplayer Edge Matchmaker
const match = await sdk.matchmaking.findMatch({
  region: 'auto',
  maxPlayers: 16,
  roomType: 'ranked-ffa'
});

// 3. Post Match Results (Awards Platform XP & Coins)
sdk.events.on('gameOver', (stats) => {
  sdk.leaderboard.submitScore({
    score: stats.territoryPercentage,
    kills: stats.eliminations,
    survivalSeconds: stats.duration
  });
});`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(sdkCodeSample);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameTitle || !developerEmail) return;
    setSubmitted(true);
    confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
  };

  return (
    <div className="w-full space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black font-heading text-white flex items-center gap-2.5">
            <Code2 className="w-7 h-7 text-cyan-400" />
            <span>Developer & Publishing Portal</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Build, publish, and monetize your web multiplayer IO games on the Paper.io platform ecosystem.
          </p>
        </div>

        {/* Action button */}
        <button
          onClick={() => setActiveTab('submit')}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-sm flex items-center gap-2 shadow-lg shadow-cyan-500/25 active:scale-95 transition-all"
        >
          <Rocket className="w-4 h-4" />
          <span>SUBMIT YOUR GAME</span>
        </button>
      </div>

      {/* Portal Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'overview'
              ? 'bg-slate-800 text-cyan-400 border border-cyan-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Platform Capabilities & Reach
        </button>
        <button
          onClick={() => setActiveTab('sdk')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'sdk'
              ? 'bg-slate-800 text-cyan-400 border border-cyan-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          SDK & API Documentation
        </button>
        <button
          onClick={() => setActiveTab('submit')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'submit'
              ? 'bg-slate-800 text-cyan-400 border border-cyan-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Game Submission Form
        </button>
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metric Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
              <div className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>Monthly Active Gamers</span>
              </div>
              <div className="text-3xl font-black font-heading text-white">25,400,000+</div>
              <div className="text-xs text-emerald-400 font-semibold">+18% MoM Growth across mobile & desktop</div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
              <div className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-amber-400" />
                <span>Edge WebSocket Infrastructure</span>
              </div>
              <div className="text-3xl font-black font-heading text-white">99.98% Uptime</div>
              <div className="text-xs text-slate-400">Sub-30ms latencies across 4 planetary server clusters</div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
              <div className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>Developer Revenue Split</span>
              </div>
              <div className="text-3xl font-black font-heading text-white">70% / 30%</div>
              <div className="text-xs text-slate-400">Monthly wire payouts for rewarded ads and IAP gems</div>
            </div>
          </div>

          {/* Feature Pillars */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 space-y-5">
            <h3 className="text-xl font-heading font-black text-white">
              Why Publish on the Paper.io Gaming Platform?
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Turnkey Multiplayer Netcode</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Don't worry about spin-up servers, state synchronization, or anti-cheat. Plug your game directly into our matchmaking and room routing engine.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Cross-Game Progression & Profiles</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Players carry their gamer tags, level prestige, Coins, and cosmetic unlocks across all approved partner games in our catalog.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: SDK Docs */}
      {activeTab === 'sdk' && (
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 space-y-5 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-cyan-400" />
              <h3 className="font-heading font-black text-lg text-white">
                Paper.io SDK Quickstart (TypeScript / JavaScript)
              </h3>
            </div>
            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'COPIED TO CLIPBOARD' : 'COPY CODE'}</span>
            </button>
          </div>

          <div className="rounded-xl bg-slate-950 p-4 font-mono text-xs text-slate-300 overflow-x-auto border border-slate-800/80 leading-relaxed">
            <pre>{sdkCodeSample}</pre>
          </div>

          <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-xs text-cyan-200 space-y-1">
            <p className="font-bold">✨ Instant Sandbox Testing:</p>
            <p className="text-slate-400">
              You can test your build in local dev mode by appending <code>?dev_mode=true</code> to your game iframe URL.
            </p>
          </div>
        </div>
      )}

      {/* Tab: Submit Game */}
      {activeTab === 'submit' && (
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 space-y-6 shadow-xl max-w-2xl mx-auto">
          <div>
            <h3 className="text-xl font-heading font-black text-white flex items-center gap-2">
              <Rocket className="w-5 h-5 text-cyan-400" />
              <span>Submit Your IO Game to the Catalog</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Our review committee reviews submissions within 48 business hours.
            </p>
          </div>

          {submitted ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-xl font-bold text-white">Submission Received!</h4>
              <p className="text-sm text-slate-300 max-w-md mx-auto">
                We have registered <strong>"{gameTitle}"</strong> for testing on our staging servers. Our developer relations team will email {developerEmail} shortly.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
              >
                Submit Another Game
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmitGame} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Game Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hexagon Drift Arena"
                  value={gameTitle}
                  onChange={(e) => setGameTitle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Developer / Studio Email</label>
                <input
                  type="email"
                  required
                  placeholder="developer@studio.io"
                  value={developerEmail}
                  onChange={(e) => setDeveloperEmail(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Playable WebGL / HTML5 URL</label>
                <input
                  type="url"
                  placeholder="https://yourgame.io/embed"
                  value={gameUrl}
                  onChange={(e) => setGameUrl(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Primary Category</label>
                <select
                  value={gameCategory}
                  onChange={(e) => setGameCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="Territory">Territory Conquest</option>
                  <option value="Snake/Slither">Snake / Slither</option>
                  <option value="Battle Royale">Battle Royale</option>
                  <option value="Action">Action / Shooter</option>
                  <option value="3D Worlds">3D Physics World</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 active:scale-95 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>SUBMIT FOR REVIEW</span>
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
