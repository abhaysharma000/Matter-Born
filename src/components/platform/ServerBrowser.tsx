import React, { useState } from 'react';
import { 
  Globe2, 
  Wifi, 
  Users, 
  Plus, 
  Copy, 
  Check, 
  Play, 
  Sliders, 
  ShieldCheck, 
  Sparkles,
  Flame,
  Search,
  RefreshCw,
  X
} from 'lucide-react';
import { GameRoom, ServerRegion } from '../../types/platform';
import { SERVER_REGIONS, PUBLIC_LOBBIES } from '../../data/platformData';
import { GameMode } from '../../types';

interface ServerBrowserProps {
  onJoinRoom: (room: GameRoom) => void;
  onLaunchCustomRoom: (customRoom: GameRoom) => void;
}

export const ServerBrowser: React.FC<ServerBrowserProps> = ({
  onJoinRoom,
  onLaunchCustomRoom,
}) => {
  const [selectedRegion, setSelectedRegion] = useState<string>('us-east');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCreatingRoom, setIsCreatingRoom] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Custom room form state
  const [newRoomName, setNewRoomName] = useState('Party Arena');
  const [newRoomMode, setNewRoomMode] = useState<GameMode>('classic');
  const [newRoomScale, setNewRoomScale] = useState<'Compact' | 'Standard' | 'Mega'>('Standard');
  const [newRoomMaxPlayers, setNewRoomMaxPlayers] = useState(16);
  const [newRoomBots, setNewRoomBots] = useState(true);
  const [generatedRoomCode] = useState(() => `PAPER-${Math.floor(1000 + Math.random() * 9000)}`);

  const filteredRooms = PUBLIC_LOBBIES.filter((room) => {
    const matchesRegion = room.region === selectedRegion;
    const matchesMode = modeFilter === 'all' || room.mode === modeFilter;
    const matchesSearch =
      room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.hostName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRegion && matchesMode && matchesSearch;
  });

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedRoomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCreateRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const created: GameRoom = {
      id: `custom-${Date.now()}`,
      code: generatedRoomCode,
      name: newRoomName || 'Custom Room',
      region: selectedRegion,
      mode: newRoomMode,
      hostName: 'You',
      currentPlayers: 1,
      maxPlayers: newRoomMaxPlayers,
      isPrivate: true,
      ping: 25,
      mapScale: newRoomScale,
      botsEnabled: newRoomBots,
    };
    setIsCreatingRoom(false);
    onLaunchCustomRoom(created);
  };

  return (
    <div className="w-full space-y-8 pb-16">
      {/* Header with Title and Create Room Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black font-heading text-white flex items-center gap-2.5">
            <span className="text-2xl">🏟️</span>
            <span>3D Battle Colosseums & Party Lobbies</span>
          </h2>
          <p className="text-sm font-semibold text-indigo-300 mt-1">
            Join live multiplayer creature arenas or host a private party match with custom rules!
          </p>
        </div>

        <button
          onClick={() => setIsCreatingRoom(true)}
          className="game-btn game-btn-yellow px-5 py-2.5 rounded-2xl font-black text-sm flex items-center gap-2 shadow-lg active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>HOST PARTY ROOM</span>
        </button>
      </div>

      {/* Regional Nodes Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {SERVER_REGIONS.map((region) => {
          const isSelected = selectedRegion === region.id;
          return (
            <button
              key={region.id}
              onClick={() => setSelectedRegion(region.id)}
              className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden ${
                isSelected
                  ? 'bg-slate-900 border-cyan-500 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/50'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{region.flag}</span>
                <div className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <Wifi className="w-3 h-3" />
                  <span>{region.ping} ms</span>
                </div>
              </div>

              <div className="font-bold text-sm text-white">{region.name}</div>
              <div className="text-xs text-slate-400 mb-2">{region.location}</div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/80 text-slate-400">
                <span>{region.activePlayers.toLocaleString()} players</span>
                <span className="text-cyan-400 font-semibold">{region.status}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Lobby Browser Controls & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search room name, code, host..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        {/* Mode filter pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setModeFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              modeFilter === 'all'
                ? 'bg-slate-800 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            All Modes
          </button>
          <button
            onClick={() => setModeFilter('classic')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              modeFilter === 'classic'
                ? 'bg-slate-800 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            Classic 100%
          </button>
          <button
            onClick={() => setModeFilter('rush')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              modeFilter === 'rush'
                ? 'bg-slate-800 text-amber-400 border border-amber-500/30'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            2-Min Rush
          </button>
          <button
            onClick={() => setModeFilter('royale')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              modeFilter === 'royale'
                ? 'bg-slate-800 text-rose-400 border border-rose-500/30'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            Battle Royale
          </button>
        </div>
      </div>

      {/* Lobbies Table / List */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-bold">Room & Code</th>
                <th className="py-3.5 px-4 font-bold">Mode</th>
                <th className="py-3.5 px-4 font-bold">Scale</th>
                <th className="py-3.5 px-4 font-bold">Players</th>
                <th className="py-3.5 px-4 font-bold">Ping</th>
                <th className="py-3.5 px-4 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredRooms.map((room) => {
                const isFull = room.currentPlayers >= room.maxPlayers;
                return (
                  <tr key={room.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>{room.name}</span>
                        <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                          {room.code}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">Host: {room.hostName}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded ${
                        room.mode === 'classic'
                          ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20'
                          : room.mode === 'rush'
                          ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                      }`}>
                        {room.mode === 'classic' ? 'Classic 100%' : room.mode === 'rush' ? '2-Min Rush' : 'Battle Royale'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-xs font-medium text-slate-300">
                      {room.mapScale} Arena
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span className={`font-bold ${isFull ? 'text-rose-400' : 'text-slate-200'}`}>
                          {room.currentPlayers} / {room.maxPlayers}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        {room.ping} ms
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onJoinRoom(room)}
                        disabled={isFull}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          isFull
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20 active:scale-95'
                        }`}
                      >
                        {isFull ? 'Full' : 'JOIN MATCH'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredRooms.length === 0 && (
          <div className="py-12 text-center space-y-2">
            <p className="text-slate-400 text-sm font-medium">No active lobbies in this region matching filters.</p>
            <button
              onClick={() => setIsCreatingRoom(true)}
              className="px-4 py-2 rounded-lg bg-slate-800 text-cyan-400 text-xs font-bold hover:bg-slate-700"
            >
              Host the First Room
            </button>
          </div>
        )}
      </div>

      {/* Create Custom Room Modal */}
      {isCreatingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setIsCreatingRoom(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-xl font-heading font-black text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-cyan-400" />
                <span>Host Custom Party Room</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Customize rules, share your room code with friends, and conquer together.
              </p>
            </div>

            <form onSubmit={handleCreateRoomSubmit} className="space-y-4">
              {/* Room Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Room Name</label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  maxLength={24}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Game Mode */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Game Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewRoomMode('classic')}
                    className={`py-2 px-2 text-xs font-bold rounded-xl border text-center transition-colors ${
                      newRoomMode === 'classic'
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Classic 100%
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRoomMode('rush')}
                    className={`py-2 px-2 text-xs font-bold rounded-xl border text-center transition-colors ${
                      newRoomMode === 'rush'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    2-Min Rush
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRoomMode('royale')}
                    className={`py-2 px-2 text-xs font-bold rounded-xl border text-center transition-colors ${
                      newRoomMode === 'royale'
                        ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Battle Royale
                  </button>
                </div>
              </div>

              {/* Map Scale */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Arena Scale</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Compact', 'Standard', 'Mega'] as const).map((scale) => (
                    <button
                      key={scale}
                      type="button"
                      onClick={() => setNewRoomScale(scale)}
                      className={`py-1.5 text-xs font-semibold rounded-lg border text-center ${
                        newRoomScale === scale
                          ? 'bg-slate-800 border-cyan-500 text-cyan-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {scale}
                    </button>
                  ))}
                </div>
              </div>

              {/* Max Players Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">Max Players</span>
                  <span className="text-cyan-400 font-bold">{newRoomMaxPlayers} Players</span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={32}
                  step={4}
                  value={newRoomMaxPlayers}
                  onChange={(e) => setNewRoomMaxPlayers(Number(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>

              {/* AI Bots Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-xs">
                  <div className="font-bold text-white">Fill with Intelligent AI Bots</div>
                  <div className="text-slate-400 text-[11px]">Keeps arena active while waiting for players</div>
                </div>
                <input
                  type="checkbox"
                  checked={newRoomBots}
                  onChange={(e) => setNewRoomBots(e.target.checked)}
                  className="w-4 h-4 accent-cyan-500 rounded"
                />
              </div>

              {/* Shareable Room Code */}
              <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-cyan-400">Shareable Room Code</div>
                  <div className="font-mono font-black text-lg text-white">{generatedRoomCode}</div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition-colors"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'COPIED' : 'COPY'}</span>
                </button>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>START CUSTOM ARENA</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingRoom(false)}
                  className="px-4 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-sm hover:bg-slate-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
