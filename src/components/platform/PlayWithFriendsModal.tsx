import React, { useState, useEffect } from 'react';
import { 
  Users, 
  X, 
  Copy, 
  Check, 
  Play, 
  Sparkles, 
  Swords, 
  Shield, 
  Share2,
  Bot,
  UserCheck
} from 'lucide-react';
import { GameRoom } from '../../types/platform';
import { GameMode } from '../../types';
import { sound } from '../../utils/audio';
import { multiplayerManager } from '../../utils/multiplayerManager';
import { FriendProfile } from '../../types/multiplayer';

interface PlayWithFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchFriendRoom: (room: GameRoom) => void;
  defaultMode?: GameMode;
}

export const PlayWithFriendsModal: React.FC<PlayWithFriendsModalProps> = ({
  isOpen,
  onClose,
  onLaunchFriendRoom,
  defaultMode = 'easy',
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [copiedCode, setCopiedCode] = useState(false);
  const [generatedCode] = useState(() => `MATE-${Math.floor(1000 + Math.random() * 9000)}`);
  
  // Friends roster state
  const [friends, setFriends] = useState<FriendProfile[]>(() => multiplayerManager.getFriends());

  useEffect(() => {
    const handleUpdate = () => setFriends(multiplayerManager.getFriends());
    window.addEventListener('mb_friends_updated', handleUpdate);
    return () => window.removeEventListener('mb_friends_updated', handleUpdate);
  }, []);

  // Create Room state
  const [roomName, setRoomName] = useState('Hackathon Arena');
  const [mode, setMode] = useState<GameMode>(defaultMode);
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [botsEnabled, setBotsEnabled] = useState(true);

  // Join Room state
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    sound.playClick();
    navigator.clipboard.writeText(generatedCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCreateAndPlay = async (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();

    // Invite all friends currently in friend list to this Friend Arena
    const friendList = friends.length > 0 ? friends : multiplayerManager.getFriends();
    const finalRoomName = roomName.trim() || 'Friend Arena';

    for (const f of friendList) {
      try {
        await multiplayerManager.sendBattleInvite(f.id, mode, generatedCode, finalRoomName);
      } catch {}
    }

    // Broadcast local invitation event so players/HUD display invitation toast & banner
    window.dispatchEvent(
      new CustomEvent('mb_friend_room_invited', {
        detail: {
          friends: friendList,
          roomCode: generatedCode,
          roomName: finalRoomName,
        },
      })
    );

    try {
      await multiplayerManager.createRoom(finalRoomName, mode, maxPlayers, botsEnabled);
    } catch {}

    const newRoom: GameRoom = {
      id: `friend-${Date.now()}`,
      code: generatedCode,
      name: finalRoomName,
      region: 'local-direct',
      mode,
      hostName: 'You',
      currentPlayers: 1 + friendList.length,
      maxPlayers,
      isPrivate: true,
      ping: 8,
      mapScale: 'Standard',
      botsEnabled,
      friendFighters: friendList,
    };
    onLaunchFriendRoom(newRoom);
    onClose();
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinCodeInput.trim().toUpperCase();
    if (!cleanCode) {
      setJoinError('Please enter a valid room code.');
      return;
    }
    sound.playClick();
    try {
      await multiplayerManager.joinRoom(cleanCode);
    } catch {}

    const joinedRoom: GameRoom = {
      id: `joined-${cleanCode}`,
      code: cleanCode,
      name: `${cleanCode} Match`,
      region: 'local-direct',
      mode: 'classic',
      hostName: 'Friend',
      currentPlayers: 2,
      maxPlayers: 8,
      isPrivate: true,
      ping: 12,
      mapScale: 'Standard',
      botsEnabled: true,
    };
    onLaunchFriendRoom(joinedRoom);
    onClose();
  };

  const handleDirectChallengeFriend = async (friend: FriendProfile) => {
    sound.playClick();
    const challengeCode = `VS-${friend.name.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    try {
      await multiplayerManager.createRoom(`Match vs ${friend.name}`, 'easy', 4, true);
    } catch {}

    const challengeRoom: GameRoom = {
      id: `vs-${friend.id}-${Date.now()}`,
      code: challengeCode,
      name: `1v1 vs ${friend.name}`,
      region: 'local-direct',
      mode: 'classic',
      hostName: 'You',
      currentPlayers: 2,
      maxPlayers: 4,
      isPrivate: true,
      ping: 8,
      mapScale: 'Standard',
      botsEnabled: true,
    };
    onLaunchFriendRoom(challengeRoom);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
      <div 
        className="w-full max-w-lg rounded-3xl bg-[#091E16] border border-[#1E5C43] shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#184635] flex items-center justify-between bg-gradient-to-r from-[#0B251B] to-[#071912]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
              <Users className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black font-heading text-white tracking-wide flex items-center gap-2">
                <span>Play with Friends</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-400 text-emerald-950">
                  Direct Lobbies
                </span>
              </h2>
              <p className="text-xs text-[#8BA996]">
                Battle teammates inside the hackathon hall via room codes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#0E2A1F] hover:bg-[#153D2D] border border-[#184635] text-stone-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher: Create Room vs Join Room */}
        <div className="px-5 pt-4">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-[#071912] border border-[#184635]">
            <button
              onClick={() => {
                sound.playClick();
                setActiveTab('create');
              }}
              className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'create'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-[#8BA996] hover:text-white'
              }`}
            >
              Host Match & Invite
            </button>
            <button
              onClick={() => {
                sound.playClick();
                setActiveTab('join');
              }}
              className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'join'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-[#8BA996] hover:text-white'
              }`}
            >
              Join with Code
            </button>
          </div>
        </div>

        {/* Tab Body */}
        <div className="p-5 overflow-y-auto max-h-[70vh]">
          {activeTab === 'create' ? (
            <form onSubmit={handleCreateAndPlay} className="space-y-4">
              {/* Shareable Room Code Card */}
              <div className="p-4 rounded-2xl bg-[#071912] border border-emerald-500/30 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                    YOUR ROOM CODE
                  </div>
                  <div className="font-mono text-2xl sm:text-3xl font-black text-white tracking-widest mt-0.5">
                    {generatedCode}
                  </div>
                  <p className="text-[11px] text-[#8BA996] mt-0.5">
                    Share this code with hackathon friends to join your match
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-3.5 py-2.5 rounded-xl bg-[#0E2A1F] hover:bg-[#153D2D] border border-emerald-500/50 text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>

              {/* Room Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#8BA996] uppercase tracking-wider">
                  Match Title
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Hackathon Arena"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#071912] border border-[#184635] text-white text-sm focus:outline-hidden focus:border-emerald-400 transition-colors"
                />
              </div>

              {/* Battle Mode Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#8BA996] uppercase tracking-wider">
                  Game Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('easy')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                      mode === 'easy'
                        ? 'bg-emerald-600/30 border-emerald-400 text-white font-black'
                        : 'bg-[#071912] border-[#184635] text-[#8BA996] hover:text-white'
                    }`}
                  >
                    <Swords className="w-4 h-4" />
                    <span>Easy</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('moderate')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                      mode === 'moderate'
                        ? 'bg-emerald-600/30 border-emerald-400 text-white font-black'
                        : 'bg-[#071912] border-[#184635] text-[#8BA996] hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Moderate</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('hard')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                      mode === 'hard'
                        ? 'bg-emerald-600/30 border-emerald-400 text-white font-black'
                        : 'bg-[#071912] border-[#184635] text-[#8BA996] hover:text-white'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    <span>Hard</span>
                  </button>
                </div>
              </div>

              {/* Match Options: Fill with Bots */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#071912] border border-[#184635]">
                <div className="flex items-center gap-2.5">
                  <Bot className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="text-xs font-bold text-white">Fill Remaining Slots with Bots</div>
                    <div className="text-[11px] text-[#8BA996]">Guarantees fast action if waiting for friends</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={botsEnabled}
                  onChange={(e) => setBotsEnabled(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
              </div>

              {/* Start Button */}
              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.98] text-[#061810] font-black text-base tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 transition-all cursor-pointer mt-2"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>START FRIEND ARENA</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#8BA996] uppercase tracking-wider">
                  Enter Friend's Room Code
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={joinCodeInput}
                    onChange={(e) => {
                      setJoinCodeInput(e.target.value);
                      if (joinError) setJoinError(null);
                    }}
                    placeholder="e.g. MATE-4921"
                    className="w-full px-4 py-3 rounded-xl bg-[#071912] border border-[#184635] text-white font-mono text-lg tracking-wider focus:outline-hidden focus:border-emerald-400 uppercase placeholder:text-stone-600"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text) setJoinCodeInput(text.trim().toUpperCase());
                      } catch {
                        // ignore clipboard read permission error
                      }
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg bg-[#0E2A1F] hover:bg-[#153D2D] border border-[#1E5C43] text-emerald-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Paste
                  </button>
                </div>
                {joinError && (
                  <p className="text-xs text-rose-400 font-bold">{joinError}</p>
                )}
              </div>

              {/* Instant Friend Quick Rooms */}
              <div className="space-y-2 pt-2">
                <div className="text-[11px] font-bold text-[#8BA996] uppercase tracking-wider">
                  Available Local Lobbies
                </div>
                <div className="space-y-2">
                  {[
                    { code: 'HACK-ROOM-1', name: 'Hackathon Hall A', players: '3/8', mode: 'Arena' },
                    { code: 'HACK-ROOM-2', name: 'Dev Lounge Blitz', players: '5/8', mode: 'Blitz 60s' },
                  ].map((lobby) => (
                    <div
                      key={lobby.code}
                      onClick={() => setJoinCodeInput(lobby.code)}
                      className="p-3 rounded-xl bg-[#071912] border border-[#184635] hover:border-emerald-500/50 flex items-center justify-between gap-3 cursor-pointer transition-colors group"
                    >
                      <div>
                        <div className="font-bold text-xs text-white group-hover:text-emerald-300 transition-colors">
                          {lobby.name}
                        </div>
                        <div className="font-mono text-[11px] text-emerald-400 mt-0.5">
                          {lobby.code} • {lobby.mode}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#8BA996]">
                          {lobby.players}
                        </span>
                        <span className="text-xs font-black text-emerald-400 group-hover:translate-x-0.5 transition-transform">
                          →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Join Button */}
              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.98] text-[#061810] font-black text-base tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 transition-all cursor-pointer mt-4"
              >
                <Users className="w-5 h-5" />
                <span>JOIN FRIEND ROOM</span>
              </button>
            </form>
          )}

          {/* Added Friends Quick Challenge Roster */}
          {friends.length > 0 && (
            <div className="space-y-2 pt-4 mt-4 border-t border-[#184635]/60">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#8BA996] uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Your Friends ({friends.length})</span>
                </span>
                <span className="text-[10px] text-emerald-400/80">Tap to Challenge</span>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {friends.map((f) => (
                  <div
                    key={f.id}
                    className="p-2.5 rounded-xl bg-[#071912] border border-[#184635] hover:border-emerald-500/50 flex items-center justify-between gap-2 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{f.name}</div>
                        <div className="text-[10px] text-[#8BA996] truncate">{f.robotName} • Lvl {f.level}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDirectChallengeFriend(f)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600 border border-emerald-500/50 text-emerald-300 hover:text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0"
                    >
                      <Swords className="w-3 h-3" />
                      <span>Battle</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
