import React, { useState, useEffect } from 'react';
import { UserPlus, Swords, Check, X, ShieldAlert, Sparkles, Radio } from 'lucide-react';
import { FriendRequest, BattleInvite, FriendProfile } from '../../types/multiplayer';
import { GameRoom } from '../../types/platform';
import { multiplayerManager } from '../../utils/multiplayerManager';
import { sound } from '../../utils/audio';

interface IncomingNotificationOverlayProps {
  onJoinBattleRoom: (room: GameRoom) => void;
}

export const IncomingNotificationOverlay: React.FC<IncomingNotificationOverlayProps> = ({
  onJoinBattleRoom,
}) => {
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [battleInvites, setBattleInvites] = useState<BattleInvite[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [squadNotification, setSquadNotification] = useState<{
    friends: FriendProfile[];
    roomCode: string;
    roomName: string;
  } | null>(null);

  useEffect(() => {
    const handleIncomingFriendReq = (e: any) => {
      const list: FriendRequest[] = e.detail || [];
      if (list.length > 0) {
        sound.playNotification();
        setFriendRequests(list);
      }
    };

    const handleIncomingBattleInv = (e: any) => {
      const list: BattleInvite[] = e.detail || [];
      if (list.length > 0) {
        sound.playAlarm();
        setBattleInvites(list);
      }
    };

    const handleFriendAccepted = (e: any) => {
      const list: any[] = e.detail || [];
      if (list.length > 0) {
        sound.playVictory();
        const first = list[0];
        setToastMessage(`🎉 ${first.recipientPilot?.name || 'Your friend'} accepted your friend request!`);
        setTimeout(() => setToastMessage(null), 4000);
      }
    };

    const handleFriendRoomInvited = (e: any) => {
      const detail = e.detail;
      if (detail && detail.friends && detail.friends.length > 0) {
        sound.playAlarm();
        setSquadNotification(detail);
        setTimeout(() => setSquadNotification(null), 6000);
      }
    };

    window.addEventListener('mb_incoming_friend_request', handleIncomingFriendReq);
    window.addEventListener('mb_incoming_battle_invite', handleIncomingBattleInv);
    window.addEventListener('mb_friend_request_accepted', handleFriendAccepted);
    window.addEventListener('mb_friend_room_invited', handleFriendRoomInvited);

    // Initial check
    setFriendRequests(multiplayerManager.getCachedFriendRequests());
    setBattleInvites(multiplayerManager.getCachedBattleInvites());

    return () => {
      window.removeEventListener('mb_incoming_friend_request', handleIncomingFriendReq);
      window.removeEventListener('mb_incoming_battle_invite', handleIncomingBattleInv);
      window.removeEventListener('mb_friend_request_accepted', handleFriendAccepted);
      window.removeEventListener('mb_friend_room_invited', handleFriendRoomInvited);
    };
  }, []);

  const handleAcceptFriend = async (req: FriendRequest) => {
    sound.playVictory();
    await multiplayerManager.respondFriendRequest(req.id, true, req);
    setFriendRequests((prev) => prev.filter((r) => r.id !== req.id));
    setToastMessage(`✓ Added ${req.fromName} (${req.fromRobotName}) to your friends!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleDeclineFriend = async (req: FriendRequest) => {
    sound.playClick();
    await multiplayerManager.respondFriendRequest(req.id, false);
    setFriendRequests((prev) => prev.filter((r) => r.id !== req.id));
  };

  const handleAcceptBattle = (inv: BattleInvite) => {
    sound.playClick();
    // Fire and forget response in background so we don't stall UI transition
    multiplayerManager.respondBattleInvite(inv.id, true).catch(() => {});
    setBattleInvites((prev) => prev.filter((i) => i.id !== inv.id));

    const friendList = multiplayerManager.getFriends();
    const gameRoom: GameRoom = {
      id: inv.roomId,
      code: inv.roomCode,
      name: inv.roomName,
      region: 'local-direct',
      mode: inv.mode || 'classic',
      hostName: inv.fromName,
      currentPlayers: 2,
      maxPlayers: 2,
      isPrivate: true,
      ping: 8,
      mapScale: 'Standard',
      botsEnabled: true,
      friendFighters: friendList,
    };

    onJoinBattleRoom(gameRoom);
  };

  const handleDeclineBattle = async (inv: BattleInvite) => {
    sound.playClick();
    await multiplayerManager.respondBattleInvite(inv.id, false);
    setBattleInvites((prev) => prev.filter((i) => i.id !== inv.id));
  };

  if (friendRequests.length === 0 && battleInvites.length === 0 && !toastMessage && !squadNotification) {
    return null;
  }

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] w-[94%] max-w-md space-y-2 pointer-events-auto animate-in slide-in-from-top-4 duration-300">
      {/* Squad Friends Invitation Alert Card */}
      {squadNotification && (
        <div
          className="p-4 rounded-3xl bg-gradient-to-r from-[#062418] via-[#0B3524] to-[#041910] text-white border-2 border-emerald-400 shadow-2xl space-y-2 relative overflow-hidden animate-bounce"
          style={{
            boxShadow: '0 20px 40px -10px rgba(16, 185, 129, 0.6), 0 0 30px rgba(52, 211, 153, 0.4)',
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center shadow-lg font-black">
                <Swords className="w-6 h-6 text-[#041910]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-400/40">
                    SQUAD INVITE ACCEPTED
                  </span>
                  <span className="text-[10px] font-mono text-emerald-300">Room {squadNotification.roomCode}</span>
                </div>
                <h4 className="font-heading font-black text-sm text-white mt-0.5">
                  Friends Entering Match!
                </h4>
                <p className="text-xs text-emerald-200 mt-0.5">
                  ⭐ {squadNotification.friends.map((f: any) => f.name).join(' & ')} accepted and spawned into arena!
                </p>
              </div>
            </div>
            <button
              onClick={() => setSquadNotification(null)}
              className="p-1 rounded-lg text-emerald-400/70 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-600 text-white font-bold text-xs shadow-2xl flex items-center justify-between border border-emerald-400">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-200 animate-spin" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 text-white/80 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Battle Invites - Highest Priority Alert */}
      {battleInvites.map((inv) => (
        <div
          key={inv.id}
          className="p-4 rounded-3xl bg-gradient-to-r from-[#2A0808] via-[#3B0E0E] to-[#1A0505] text-white border-2 border-rose-500 shadow-2xl space-y-3 relative overflow-hidden"
          style={{
            boxShadow: '0 20px 40px -10px rgba(225, 29, 72, 0.5), 0 0 30px rgba(244, 63, 94, 0.3)',
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-lg animate-bounce">
                <Swords className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-300 border border-rose-400/40 animate-pulse">
                    Combat Challenge
                  </span>
                  <span className="text-[10px] font-mono text-rose-300">Room {inv.roomCode}</span>
                </div>
                <h4 className="font-heading font-black text-sm text-white mt-0.5">
                  {inv.fromName} challenged you!
                </h4>
                <p className="text-[11px] text-rose-200/80">
                  Robot: {inv.fromRobotName} • Mode: {inv.mode}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleDeclineBattle(inv)}
              className="p-1.5 rounded-xl bg-black/40 text-rose-300 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => handleDeclineBattle(inv)}
              className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-rose-200 font-bold text-xs transition-colors cursor-pointer"
            >
              Decline
            </button>
            <button
              onClick={() => handleAcceptBattle(inv)}
              className="flex-2 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-xs shadow-lg flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
            >
              <Swords className="w-4 h-4" />
              <span>ACCEPT & FIGHT NOW</span>
            </button>
          </div>
        </div>
      ))}

      {/* Friend Requests */}
      {friendRequests.map((req) => (
        <div
          key={req.id}
          className="p-4 rounded-3xl bg-[#091E16] text-[#E8F0EA] border-2 border-emerald-500 shadow-2xl space-y-3 relative overflow-hidden"
          style={{
            boxShadow: '0 20px 40px -10px rgba(16, 185, 129, 0.5), 0 0 30px rgba(43, 226, 158, 0.3)',
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg">
                <UserPlus className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    Incoming Friend Request
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">Lv.{req.fromLevel}</span>
                </div>
                <h4 className="font-heading font-black text-sm text-white mt-0.5">
                  {req.fromName}{' '}
                  <span className="font-mono text-xs font-normal text-emerald-300">
                    ({req.fromPilotId})
                  </span>
                </h4>
                <p className="text-[11px] text-[#A5C4B0]">
                  Robot: <span className="font-semibold text-emerald-300">{req.fromRobotName}</span>{' '}
                  ({req.fromRobotClass || 'Warrior'})
                </p>
              </div>
            </div>
            <button
              onClick={() => handleDeclineFriend(req)}
              className="p-1.5 rounded-xl bg-black/40 text-emerald-300 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => handleDeclineFriend(req)}
              className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Ignore
            </button>
            <button
              onClick={() => handleAcceptFriend(req)}
              className="flex-2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-xs shadow-lg flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Accept Request</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
