import React, { useState, useEffect } from 'react';
import { 
  User, 
  Trophy, 
  Swords, 
  Target, 
  Calendar, 
  Check, 
  Edit3, 
  Zap, 
  Gem, 
  Medal, 
  X,
  Flame,
  Compass,
  Users,
  UserPlus,
  Trash2,
  Play,
  Copy
} from 'lucide-react';
import { PlatformUser, GameRoom } from '../../types/platform';
import { FriendProfile, FriendRequest } from '../../types/multiplayer';
import { getLifetimeExplorationStats } from '../../utils/forgeManager';
import { multiplayerManager, getOrCreatePlayerId } from '../../utils/multiplayerManager';
import { sound } from '../../utils/audio';

interface ProfileModalProps {
  user: PlatformUser;
  onUpdateUser: (updatedUser: PlatformUser) => void;
  onClose: () => void;
  onLaunchFriendBattle?: (friend: FriendProfile, room?: GameRoom) => void;
  onOpenAuth?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  user,
  onUpdateUser,
  onClose,
  onLaunchFriendBattle,
  onOpenAuth,
}) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'friends'>('stats');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(user.name);
  const [friends, setFriends] = useState<FriendProfile[]>(() => {
    const list = multiplayerManager.getFriends();
    if (list.length > 0) return list;
    return user.friends || [];
  });
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>(() =>
    multiplayerManager.getCachedFriendRequests()
  );
  const [newFriendInput, setNewFriendInput] = useState('');
  const [addFriendFeedback, setAddFriendFeedback] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const myPilotId = getOrCreatePlayerId();


  const lifetimeStats = getLifetimeExplorationStats();

  useEffect(() => {
    const handleFriendsUpdated = (e: any) => {
      if (Array.isArray(e.detail)) {
        setFriends(e.detail);
      }
    };
    const handleIncomingReq = (e: any) => {
      if (Array.isArray(e.detail)) {
        setIncomingRequests(e.detail);
      }
    };
    window.addEventListener('mb_friends_updated', handleFriendsUpdated);
    window.addEventListener('mb_incoming_friend_request', handleIncomingReq);
    return () => {
      window.removeEventListener('mb_friends_updated', handleFriendsUpdated);
      window.removeEventListener('mb_incoming_friend_request', handleIncomingReq);
    };
  }, []);

  const handleAddManualFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    const tag = newFriendInput.trim();
    if (!tag) return;

    sound.playClick();
    setAddFriendFeedback(`Sending friend request to ${tag}...`);

    // 1. Send live friend request over Wi-Fi server
    await multiplayerManager.sendFriendRequest(tag);

    // 2. Try finding live teammate on the Wi-Fi server
    const livePilot = await multiplayerManager.searchPilot(tag);
    if (livePilot) {
      multiplayerManager.addFriend(livePilot);
      const updated = multiplayerManager.getFriends();
      setFriends(updated);
      onUpdateUser({ ...user, friends: updated });
      setNewFriendInput('');
      setAddFriendFeedback(`✓ Friend request sent to ${livePilot.name} (${tag})! They will see an alert to accept.`);
      setTimeout(() => setAddFriendFeedback(null), 4500);
      return;
    }

    // 3. Fallback to local friend record
    const mockFriend: FriendProfile = {
      id: tag.startsWith('mb-pilot-') ? tag : `pilot-${Date.now()}`,
      name: tag,
      level: Math.floor(3 + Math.random() * 15),
      rankTier: 'Platinum',
      robotName: 'Custom Combat Robot',
      robotClass: 'Warrior',
      faction: Math.random() > 0.5 ? 'Autobot' : 'Decepticon',
      status: 'online',
      addedAt: Date.now(),
    };

    multiplayerManager.addFriend(mockFriend);
    const updated = multiplayerManager.getFriends();
    setFriends(updated);
    onUpdateUser({ ...user, friends: updated });
    setNewFriendInput('');
    setAddFriendFeedback(`✓ Friend request sent to ${tag}!`);
    setTimeout(() => setAddFriendFeedback(null), 4000);
  };

  const handleAcceptRequest = async (req: FriendRequest) => {
    sound.playVictory();
    await multiplayerManager.respondFriendRequest(req.id, true, req);
    setIncomingRequests((prev) => prev.filter((r) => r.id !== req.id));
    const updated = multiplayerManager.getFriends();
    setFriends(updated);
    onUpdateUser({ ...user, friends: updated });
    setAddFriendFeedback(`✓ Accepted ${req.fromName}'s friend request!`);
    setTimeout(() => setAddFriendFeedback(null), 3500);
  };

  const handleDeclineRequest = async (req: FriendRequest) => {
    sound.playClick();
    await multiplayerManager.respondFriendRequest(req.id, false);
    setIncomingRequests((prev) => prev.filter((r) => r.id !== req.id));
  };

  const handleBattleFriend = async (friend: FriendProfile) => {
    sound.playClick();
    setAddFriendFeedback(`⚔️ Challenging ${friend.name}... Sent combat invite to their screen!`);
    setTimeout(() => setAddFriendFeedback(null), 4000);

    const challengeRes = await multiplayerManager.sendBattleInvite(friend.id, 'classic');
    const roomCode = challengeRes.roomCode || `MATE-${Math.floor(1000 + Math.random() * 9000)}`;

    const friendRoom: GameRoom = {
      id: `vs-${friend.id}-${Date.now()}`,
      code: roomCode,
      name: `1v1 vs ${friend.name}`,
      region: 'local-direct',
      mode: 'classic',
      hostName: user.name || 'You',
      currentPlayers: 1,
      maxPlayers: 2,
      isPrivate: true,
      ping: 8,
      mapScale: 'Standard',
      botsEnabled: true,
    };

    if (onLaunchFriendBattle) {
      onLaunchFriendBattle(friend, friendRoom);
    }
  };

  const handleRemoveFriend = (friendId: string) => {
    sound.playClick();
    multiplayerManager.removeFriend(friendId);
    const updated = multiplayerManager.getFriends();
    setFriends(updated);
    onUpdateUser({ ...user, friends: updated });
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempName.trim()) {
      onUpdateUser({
        ...user,
        name: tempName.trim(),
      });
    }
    setIsEditingName(false);
  };

  const totalMatches = user?.totalMatches || 0;
  const winRate = totalMatches > 0 ? (((user?.victories || 0) / totalMatches) * 100).toFixed(1) : '0';
  const kdRatio = totalMatches > 0 ? (((user?.totalKills || 0) / totalMatches)).toFixed(1) : '0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-2xl rounded-2xl bg-[#F4F9F4] border border-[#CFE2D3] p-6 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto text-[#143823]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-[#E8F2EA] hover:bg-[#DFEDE2] text-[#4D6957] hover:text-[#143823] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Profile Header */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-600 to-green-700 flex items-center justify-center text-white shadow-md shadow-emerald-700/20 border-2 border-emerald-400">
              <User className="w-10 h-10" />
            </div>
            <span className="absolute -bottom-1 -right-1 text-xs font-black bg-[#F4F9F4] text-emerald-900 border border-emerald-400 px-2 py-0.5 rounded-md shadow-xs">
              Lv. {user.level}
            </span>
          </div>

          <div className="space-y-1 text-center sm:text-left flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              {isEditingName ? (
                <form onSubmit={handleSaveName} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    maxLength={16}
                    className="px-2.5 py-1 rounded bg-[#E8F2EA] border border-emerald-500 text-[#143823] font-bold text-lg focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <>
                  <h2 className="text-2xl font-black font-heading text-[#143823]">
                    {user.name}
                  </h2>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="text-[#587563] hover:text-emerald-700 p-1"
                    title="Edit Gamer Tag"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </>
              )}

              {user.clanTag && (
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                  [{user.clanTag}]
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <p className="text-xs text-[#4D6957]">
                {user.title} • Tier: <strong className="text-emerald-800">{user.rankTier}</strong> ({user.rankPoints} RP)
              </p>
              
              {/* Account Auth Badge */}
              <div className="flex items-center gap-1.5">
                {user.authProvider === 'google' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    Google Account: {user.email || 'Linked'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Guest Account
                  </span>
                )}
                {onOpenAuth && (
                  <button
                    type="button"
                    onClick={onOpenAuth}
                    className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                  >
                    {user.authProvider === 'google' ? 'Switch Account' : 'Link Google Account'}
                  </button>
                )}
              </div>
            </div>

            {/* Level XP Progress Bar */}
            <div className="pt-2 max-w-sm space-y-1">
              <div className="flex justify-between text-[11px] text-[#4D6957]">
                <span>XP Progress to Lv. {user.level + 1}</span>
                <span className="font-mono text-emerald-800 font-bold">{user.currentXp} / {user.maxXp} XP</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#CFE2D3] overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                  style={{ width: `${(user.currentXp / user.maxXp) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Currencies Badge */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#E8F2EA] border border-[#CFE2D3]">
            <div className="flex items-center gap-1.5 text-sm font-black text-amber-800" title="Exploration Points available for The Forge">
              <Zap className="w-4 h-4 text-amber-600 fill-amber-500" />
              <span>{lifetimeStats.currentEp.toLocaleString()} EP</span>
            </div>
            <div className="w-[1px] h-4 bg-[#BCD8C3]" />
            <div className="flex items-center gap-1.5 text-sm font-black text-emerald-700">
              <Gem className="w-4 h-4" />
              <span>{user.gems.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Tab Switcher: Overview vs Friends */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#E8F2EA] border border-[#CFE2D3]">
          <button
            onClick={() => setActiveTab('stats')}
            className={`py-2 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'stats'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-[#4D6957] hover:text-[#143823]'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Career & Statistics</span>
          </button>
          <button
            id="profile-friends-tab"
            data-testid="profile-friends-tab"
            onClick={() => setActiveTab('friends')}
            className={`py-2 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer relative ${
              activeTab === 'friends'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-[#4D6957] hover:text-[#143823]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Friend List ({friends.length})</span>
            {friends.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
        </div>

        {activeTab === 'friends' ? (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* My Pilot ID Share Card */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-emerald-100/90 to-teal-100/70 border border-emerald-400/60 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xs font-black shadow-xs">
                  🪪
                </div>
                <div>
                  <div className="text-[10px] uppercase font-black tracking-wider text-emerald-900">Your Pilot ID (Give to Friends)</div>
                  <div className="font-mono font-black text-xs text-[#0E3323]">{myPilotId}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  sound.playBonus();
                  navigator.clipboard.writeText(myPilotId);
                  setCopiedId(true);
                  setTimeout(() => setCopiedId(false), 2000);
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[11px] font-black flex items-center gap-1 cursor-pointer transition-all shadow-xs"
              >
                {copiedId ? <span>✓ Copied!</span> : <span>📋 Copy ID</span>}
              </button>
            </div>

            {/* Add Friend Input Bar */}
            <form onSubmit={handleAddManualFriend} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={newFriendInput}
                  onChange={(e) => setNewFriendInput(e.target.value)}
                  placeholder="Enter Friend's Pilot ID or Gamer Tag..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#E8F2EA] border border-[#CFE2D3] text-sm text-[#143823] placeholder-[#769380] font-medium focus:outline-hidden focus:border-emerald-500"
                />
                <UserPlus className="w-4 h-4 text-[#4D6957] absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 shrink-0"
              >
                <span>Add Friend</span>
              </button>
            </form>

            {addFriendFeedback && (
              <div className="text-xs font-bold text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 animate-in fade-in">
                {addFriendFeedback}
              </div>
            )}

            {/* Incoming Requests Roster */}
            {incomingRequests.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-emerald-100/90 border border-emerald-400 space-y-2">
                <div className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-emerald-700 animate-bounce" />
                  <span>Incoming Friend Requests ({incomingRequests.length})</span>
                </div>
                <div className="space-y-2">
                  {incomingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-2.5 rounded-xl bg-white/95 border border-emerald-300 flex items-center justify-between gap-2 shadow-xs"
                    >
                      <div>
                        <div className="text-xs font-bold text-[#143823] flex items-center gap-1.5">
                          <span>{req.fromName}</span>
                          <span className="text-[10px] font-mono text-emerald-700 font-semibold">({req.fromPilotId})</span>
                        </div>
                        <div className="text-[11px] text-[#4D6957]">
                          Robot: <span className="font-semibold text-emerald-800">{req.fromRobotName}</span> • Lv.{req.fromLevel}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleDeclineRequest(req)}
                          className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-colors cursor-pointer"
                        >
                          Ignore
                        </button>
                        <button
                          onClick={() => handleAcceptRequest(req)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-colors cursor-pointer shadow-xs active:scale-95"
                        >
                          Accept
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Friends Roster List */}
            {friends.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#E8F2EA]/60 border border-dashed border-[#CFE2D3] text-center space-y-2">
                <Users className="w-10 h-10 text-[#769380] mx-auto opacity-50" />
                <h4 className="font-bold text-sm text-[#143823]">No Friends in List Yet</h4>
                <p className="text-xs text-[#587563] max-w-sm mx-auto">
                  Explore the Real-World Map to discover nearby players and tap their radar markers to add them to your friend list!
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[46vh] overflow-y-auto pr-1">
                {friends.map((friend) => (
                  <div
                    key={friend.id}
                    className="p-3.5 rounded-xl bg-[#E8F2EA] border border-[#CFE2D3] flex items-center justify-between gap-3 hover:border-emerald-400 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold font-mono text-sm border border-emerald-500 shadow-xs relative">
                        <span>{friend.name.substring(0, 2).toUpperCase()}</span>
                        <span className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                          friend.status === 'in-battle' ? 'bg-rose-500' :
                          friend.status === 'exploring' ? 'bg-amber-500' : 'bg-emerald-500'
                        }`} />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-[#143823] flex items-center gap-2">
                          <span>{friend.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 border border-emerald-300 text-emerald-800 font-mono">
                            Lv.{friend.level}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#4D6957] flex items-center gap-1.5 mt-0.5">
                          <span className="font-semibold text-emerald-800">{friend.robotName}</span>
                          <span>•</span>
                          <span className="capitalize">{friend.status}</span>
                          {friend.distanceMeters && (
                            <>
                              <span>•</span>
                              <span>📍 {friend.distanceMeters}m away</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleBattleFriend(friend)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95"
                      >
                        <Swords className="w-3.5 h-3.5" />
                        <span>Battle</span>
                      </button>
                      <button
                        onClick={() => handleRemoveFriend(friend.id)}
                        className="p-1.5 rounded-lg hover:bg-rose-100 text-[#769380] hover:text-rose-600 transition-colors cursor-pointer"
                        title="Remove Friend"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>

        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950 via-[#0d2a1b] to-emerald-950 text-emerald-100 border border-emerald-700/50 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
            <span className="flex items-center gap-1.5">
              <Compass className="w-4 h-4" />
              <span>REAL-WORLD EXPEDITION CAREER</span>
            </span>
            <span className="font-mono text-[10px] text-emerald-300/80">Authoritative Haversine</span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <div className="p-2 rounded-lg bg-black/30 border border-emerald-600/30">
              <div className="text-xs text-emerald-300 font-medium">Total Distance</div>
              <div className="font-mono font-black text-base text-white mt-0.5">{lifetimeStats.formattedTotalDistance}</div>
            </div>
            <div className="p-2 rounded-lg bg-black/30 border border-emerald-600/30">
              <div className="text-xs text-emerald-300 font-medium">Best Expedition</div>
              <div className="font-mono font-black text-base text-white mt-0.5">{lifetimeStats.formattedBestExpedition}</div>
            </div>
            <div className="p-2 rounded-lg bg-black/30 border border-emerald-600/30">
              <div className="text-xs text-emerald-300 font-medium">Lifetime EP Earned</div>
              <div className="font-mono font-black text-base text-amber-400 mt-0.5">⚡{lifetimeStats.totalEpEarned.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Career Statistics Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-[#E8F2EA] border border-[#CFE2D3] text-center space-y-1">
            <div className="text-[10px] uppercase font-bold text-[#4D6957] flex items-center justify-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-600" />
              <span>Matches Won</span>
            </div>
            <div className="text-xl font-black text-[#143823]">{user.victories}</div>
            <div className="text-[11px] text-[#587563]">{winRate}% Win Rate</div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#E8F2EA] border border-[#CFE2D3] text-center space-y-1">
            <div className="text-[10px] uppercase font-bold text-[#4D6957] flex items-center justify-center gap-1">
              <Swords className="w-3.5 h-3.5 text-rose-600" />
              <span>Total Kills</span>
            </div>
            <div className="text-xl font-black text-[#143823]">{user.totalKills}</div>
            <div className="text-[11px] text-[#587563]">{kdRatio} Kills / Match</div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#E8F2EA] border border-[#CFE2D3] text-center space-y-1">
            <div className="text-[10px] uppercase font-bold text-[#4D6957] flex items-center justify-center gap-1">
              <Target className="w-3.5 h-3.5 text-emerald-600" />
              <span>Peak Territory</span>
            </div>
            <div className="text-xl font-black text-emerald-800">{user.peakTerritory}%</div>
            <div className="text-[11px] text-[#587563]">Record Conquest</div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#E8F2EA] border border-[#CFE2D3] text-center space-y-1">
            <div className="text-[10px] uppercase font-bold text-[#4D6957] flex items-center justify-center gap-1">
              <Medal className="w-3.5 h-3.5 text-teal-600" />
              <span>Total Matches</span>
            </div>
            <div className="text-xl font-black text-[#143823]">{user.totalMatches}</div>
            <div className="text-[11px] text-[#587563]">Competitive Ranked</div>
          </div>
        </div>

        {/* Recent Match History */}
        <div className="space-y-3">
          <h4 className="font-heading font-black text-base text-[#143823] flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-700" />
            <span>Recent Match History</span>
          </h4>

          <div className="divide-y divide-[#CFE2D3] rounded-xl bg-[#E8F2EA] border border-[#CFE2D3] overflow-hidden">
            {user.matchHistory.map((match) => (
              <div key={match.id} className="p-3.5 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="font-bold text-[#143823] flex items-center gap-2">
                    <span>{match.gameTitle}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#DFEFE2] text-emerald-900 uppercase font-semibold border border-[#BCD8C3]">
                      {match.mode}
                    </span>
                  </div>
                  <div className="text-[#4D6957]">
                    Ranked #{match.rank} • {match.kills} Kills
                  </div>
                </div>

                <div className="text-right space-y-0.5">
                  <div className="font-mono font-bold text-emerald-800 text-sm">
                    {match.territory}%
                  </div>
                  <div className="text-[11px] text-emerald-700 font-bold">
                    +{match.xpEarned} XP
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
};
