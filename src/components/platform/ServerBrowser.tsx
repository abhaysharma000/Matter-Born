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
  Sparkles,
  Search,
  X,
  Zap,
  Swords,
  ChevronRight
} from 'lucide-react';
import { GameRoom } from '../../types/platform';
import { SERVER_REGIONS, PUBLIC_LOBBIES } from '../../data/platformData';
import { GameMode } from '../../types';
import { sound } from '../../utils/audio';

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
  const [newRoomName, setNewRoomName] = useState('Friend Battle Arena');
  const [newRoomMode, setNewRoomMode] = useState<GameMode>('classic');
  const [newRoomMaxPlayers, setNewRoomMaxPlayers] = useState(12);
  const [newRoomBots, setNewRoomBots] = useState(true);
  const [generatedRoomCode] = useState(() => `ROBOT-${Math.floor(1000 + Math.random() * 9000)}`);

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
    sound.playClick();
    navigator.clipboard.writeText(generatedRoomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleQuickPlay = () => {
    sound.playClick();
    const available = filteredRooms.find((r) => r.currentPlayers < r.maxPlayers);
    if (available) {
      onJoinRoom(available);
    } else if (PUBLIC_LOBBIES.length > 0) {
      onJoinRoom(PUBLIC_LOBBIES[0]);
    }
  };

  const handleCreateRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    const created: GameRoom = {
      id: `custom-${Date.now()}`,
      code: generatedRoomCode,
      name: newRoomName || 'My Battle Room',
      region: selectedRegion,
      mode: newRoomMode,
      hostName: 'You',
      currentPlayers: 1,
      maxPlayers: newRoomMaxPlayers,
      isPrivate: true,
      ping: 25,
      mapScale: 'Standard',
      botsEnabled: newRoomBots,
    };
    setIsCreatingRoom(false);
    onLaunchCustomRoom(created);
  };

  const getModeLabel = (mode: string) => {
    switch (mode) {
      case 'rush': return '2-Min Blitz';
      case 'royale': return 'Battle Royale';
      default: return 'Classic Arena';
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5 pb-20 select-none">
      
      {/* Top Card: Clean Title & Action Buttons */}
      <div className="p-4 sm:p-6 rounded-2xl bg-[#FAF8F5] border border-[#E0DCD1] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300">
              <Globe2 className="w-5 h-5 text-emerald-700" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black font-heading text-[#14532D]">
              Play with Friends
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#4D6957]">
            Hop into a match or create a room to invite your friends.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={handleQuickPlay}
            className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-current text-amber-300" />
            <span>QUICK MATCH</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setIsCreatingRoom(true);
            }}
            className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-[#E8F2EA] hover:bg-[#D8E8DC] active:scale-95 border border-[#BCD8C3] text-[#143823] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-700" />
            <span>CREATE ROOM</span>
          </button>
        </div>
      </div>

      {/* Region Selector Pills */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-[#4D6957] block">Select Server Region</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {SERVER_REGIONS.map((region) => {
            const isSelected = selectedRegion === region.id;
            return (
              <button
                key={region.id}
                onClick={() => {
                  sound.playClick();
                  setSelectedRegion(region.id);
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-800 text-white border-emerald-900 shadow-sm'
                    : 'bg-[#FAF8F5] border-[#E0DCD1] text-[#143823] hover:bg-[#F2EFE8]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xl">{region.flag}</span>
                  <div className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isSelected ? 'bg-emerald-900/60 text-emerald-200' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    <Wifi className="w-2.5 h-2.5" />
                    <span>{region.ping}ms</span>
                  </div>
                </div>
                <div className="font-bold text-xs mt-1.5 truncate">{region.name}</div>
                <div className={`text-[10px] truncate ${isSelected ? 'text-emerald-200' : 'text-[#55685C]'}`}>
                  {region.activePlayers.toLocaleString()} players
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & Mode Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#55685C]" />
          <input
            type="text"
            placeholder="Search room name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#FAF8F5] border border-[#E0DCD1] text-xs sm:text-sm text-[#143823] placeholder-[#8A9B8F] focus:outline-none focus:border-emerald-600 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#55685C] hover:text-[#143823]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Mode filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {[
            { id: 'all', label: 'All Modes' },
            { id: 'classic', label: 'Arena' },
            { id: 'rush', label: 'Blitz 60s' },
            { id: 'royale', label: 'Royale' },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => {
                sound.playClick();
                setModeFilter(mode.id);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                modeFilter === mode.id
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-[#FAF8F5] text-[#4D6957] hover:text-[#143823] border border-[#E0DCD1]'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lobby Room Cards - Mobile First Layout */}
      <div className="space-y-2.5">
        {filteredRooms.map((room) => {
          const isFull = room.currentPlayers >= room.maxPlayers;
          const fillRatio = room.currentPlayers / room.maxPlayers;
          return (
            <div
              key={room.id}
              className="p-3.5 sm:p-4 rounded-2xl bg-[#FAF8F5] border border-[#E0DCD1] hover:border-emerald-500/50 shadow-xs flex items-center justify-between gap-3 transition-all"
            >
              {/* Left Details */}
              <div className="min-w-0 space-y-1 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-xs sm:text-sm text-[#14532D] truncate">
                    {room.name}
                  </span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-[#EDE9DE] text-[#4D6957] border border-[#DCD6C8]">
                    {room.code}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    room.mode === 'rush' 
                      ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                      : room.mode === 'royale'
                      ? 'bg-rose-100 text-rose-900 border border-rose-300'
                      : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  }`}>
                    {getModeLabel(room.mode)}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-[#55685C]">
                  <span>Host: <strong className="text-[#143823]">{room.hostName}</strong></span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-[#55685C]" />
                    <span className={fillRatio > 0.85 ? 'text-amber-800 font-bold' : 'text-[#143823]'}>
                      {room.currentPlayers}/{room.maxPlayers} players
                    </span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    {room.ping}ms
                  </span>
                </div>
              </div>

              {/* Right Action Button */}
              <button
                onClick={() => {
                  sound.playClick();
                  onJoinRoom(room);
                }}
                disabled={isFull}
                className={`py-2 px-4 sm:px-5 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                  isFull
                    ? 'bg-[#EAE5DA] text-[#8A9B8F] cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-xs'
                }`}
              >
                <span>{isFull ? 'FULL' : 'JOIN'}</span>
                {!isFull && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          );
        })}

        {filteredRooms.length === 0 && (
          <div className="p-8 text-center rounded-2xl bg-[#FAF8F5] border border-[#E0DCD1] space-y-3">
            <p className="text-xs sm:text-sm font-semibold text-[#55685C]">
              No open rooms found matching your search.
            </p>
            <button
              onClick={() => {
                sound.playClick();
                setIsCreatingRoom(true);
              }}
              className="py-2 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all cursor-pointer"
            >
              Create the First Room
            </button>
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      {isCreatingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#FAF8F5] border border-[#E0DCD1] p-5 sm:p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => {
                sound.playClick();
                setIsCreatingRoom(false);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-[#EDE9DE] hover:bg-[#E0DCD1] text-[#55685C] hover:text-[#143823] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-lg font-heading font-black text-[#14532D] flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-700" />
                <span>Create a Private Room</span>
              </h3>
              <p className="text-xs text-[#55685C] mt-1">
                Choose game rules and share the room code with friends!
              </p>
            </div>

            <form onSubmit={handleCreateRoomSubmit} className="space-y-4">
              {/* Room Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#143823]">Room Name</label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  maxLength={24}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#D5CFC2] text-xs sm:text-sm text-[#143823] focus:outline-none focus:border-emerald-600"
                />
              </div>

              {/* Game Mode */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#143823]">Game Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewRoomMode('classic')}
                    className={`py-2 px-2 text-xs font-bold rounded-xl border text-center transition-colors cursor-pointer ${
                      newRoomMode === 'classic'
                        ? 'bg-emerald-700 text-white border-emerald-800'
                        : 'bg-white border-[#D5CFC2] text-[#4D6957] hover:text-[#143823]'
                    }`}
                  >
                    Arena
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRoomMode('rush')}
                    className={`py-2 px-2 text-xs font-bold rounded-xl border text-center transition-colors cursor-pointer ${
                      newRoomMode === 'rush'
                        ? 'bg-emerald-700 text-white border-emerald-800'
                        : 'bg-white border-[#D5CFC2] text-[#4D6957] hover:text-[#143823]'
                    }`}
                  >
                    Blitz 60s
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRoomMode('royale')}
                    className={`py-2 px-2 text-xs font-bold rounded-xl border text-center transition-colors cursor-pointer ${
                      newRoomMode === 'royale'
                        ? 'bg-emerald-700 text-white border-emerald-800'
                        : 'bg-white border-[#D5CFC2] text-[#4D6957] hover:text-[#143823]'
                    }`}
                  >
                    Royale
                  </button>
                </div>
              </div>

              {/* Max Players */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#143823]">Max Players</span>
                  <span className="text-emerald-800 font-bold">{newRoomMaxPlayers} Players</span>
                </div>
                <input
                  type="range"
                  min={4}
                  max={20}
                  step={2}
                  value={newRoomMaxPlayers}
                  onChange={(e) => setNewRoomMaxPlayers(Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
              </div>

              {/* AI Bots Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#D5CFC2]">
                <div className="text-xs">
                  <div className="font-bold text-[#143823]">Fill with Practice Robots</div>
                  <div className="text-[#55685C] text-[11px]">Adds robots if friends haven't joined yet</div>
                </div>
                <input
                  type="checkbox"
                  checked={newRoomBots}
                  onChange={(e) => setNewRoomBots(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                />
              </div>

              {/* Shareable Room Code */}
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-emerald-800">Your Share Code</div>
                  <div className="font-mono font-black text-lg text-[#14532D]">{generatedRoomCode}</div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'COPIED' : 'COPY'}</span>
                </button>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center gap-2.5">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>START ROOM</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingRoom(false)}
                  className="px-4 py-3 rounded-xl bg-[#EDE9DE] hover:bg-[#E0DCD1] text-[#55685C] font-bold text-xs sm:text-sm transition-colors cursor-pointer"
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
