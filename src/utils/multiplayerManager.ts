import { 
  PlayerPresence, 
  MultiplayerRoom, 
  RoomMember, 
  CombatSyncPacket, 
  DamageSyncEvent, 
  FriendProfile,
  FriendRequest,
  BattleInvite
} from '../types/multiplayer';
import { BattleCreature } from '../types/creature';
import { GameMode } from '../types';
import { GeoLocationReading } from '../types/exploration';
import { getActivePlayerRobot } from './robotStorage';

const USER_STORAGE_KEY = 'paperio_platform_user_v2';
const PLAYER_ID_KEY = 'mb_player_uuid_v1';

export function getOrCreatePlayerId(): string {
  let id = localStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = `mb-pilot-${Math.floor(10000 + Math.random() * 90000)}`;
    localStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}

export function getLocalGamerTag(): string {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (raw) {
      const user = JSON.parse(raw);
      if (user?.name) return user.name;
    }
  } catch {}
  return 'PrimePilot';
}

class MultiplayerManager {
  private activeRoom: MultiplayerRoom | null = null;
  private presenceInterval: any = null;
  private inboxInterval: any = null;
  private lastKnownLocation: GeoLocationReading | null = null;
  private currentStatus: 'exploring' | 'in-room' | 'in-battle' | 'online' = 'online';

  // Inbox & notification caching
  private lastKnownFriendRequests: FriendRequest[] = [];
  private lastKnownBattleInvites: BattleInvite[] = [];

  // Combat callbacks
  private combatPacketListeners: Array<(packet: CombatSyncPacket) => void> = [];
  private damageEventListeners: Array<(event: DamageSyncEvent) => void> = [];
  private roomPollInterval: any = null;
  private combatSyncInterval: any = null;

  // Local simulated teammates around player coordinate for demoing/offline evaluation
  private simulatedTeammatesEnabled = true;

  constructor() {
    this.startAutoHeartbeat();
    this.startInboxPoller();
  }


  // --------------------------------------------------------------------------
  // PRESENCE & GPS BROADCAST
  // --------------------------------------------------------------------------

  public setLocation(loc: GeoLocationReading | null) {
    this.lastKnownLocation = loc;
  }

  public setStatus(status: 'exploring' | 'in-room' | 'in-battle' | 'online') {
    this.currentStatus = status;
    this.broadcastPresenceNow();
  }

  public setSimulatedTeammatesEnabled(enabled: boolean) {
    this.simulatedTeammatesEnabled = enabled;
  }

  public isSimulatedTeammatesEnabled(): boolean {
    return this.simulatedTeammatesEnabled;
  }

  private startAutoHeartbeat() {
    if (this.presenceInterval) clearInterval(this.presenceInterval);
    this.presenceInterval = setInterval(() => {
      this.broadcastPresenceNow();
    }, 5000);
  }

  public getServerHostUrl(): string {
    const custom = localStorage.getItem('mb_server_host');
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/+$/, '');
    }
    // Default to the live 24/7 global cloud multiplayer server on Render:
    return 'https://matter-born.onrender.com';
  }

  public setServerHostUrl(url: string): void {
    const clean = url.trim().replace(/\/+$/, '');
    localStorage.setItem('mb_server_host', clean);
    window.dispatchEvent(new CustomEvent('mb_server_host_changed', { detail: clean }));
  }

  public async searchPilot(query: string): Promise<PlayerPresence | null> {
    const clean = query.trim();
    if (!clean) return null;
    try {
      const res = await fetch(`${this.getServerHostUrl()}/api/multiplayer/pilot/search?query=${encodeURIComponent(clean)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.player) {
          return data.player;
        }
      }
    } catch {}
    return null;
  }

  public async broadcastPresenceNow(): Promise<void> {
    const loc = this.lastKnownLocation;
    const robot = getActivePlayerRobot();
    const pid = getOrCreatePlayerId();
    const name = getLocalGamerTag();

    const payload: PlayerPresence = {
      id: pid,
      name,
      latitude: loc?.latitude || 0,
      longitude: loc?.longitude || 0,
      heading: loc?.heading || 0,
      level: 8,
      rankTier: 'Gold',
      robotName: robot.name,
      robotClass: robot.robotClass || 'Warrior',
      faction: robot.faction || 'Autobot',
      status: this.currentStatus,
      lastSeen: Date.now(),
    };

    try {
      await fetch(`${this.getServerHostUrl()}/api/multiplayer/presence/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      // Local fallback in case network is disconnected
    }
  }

  public async fetchActivePlayers(): Promise<PlayerPresence[]> {
    const myId = getOrCreatePlayerId();
    let livePlayers: PlayerPresence[] = [];

    try {
      const res = await fetch(`${this.getServerHostUrl()}/api/multiplayer/presence/active`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.players)) {
          livePlayers = data.players.filter((p: PlayerPresence) => p.id !== myId);
        }
      }
    } catch (err) {
      // Backend request note
    }

    // ALWAYS guarantee all real friends from Friend List appear on the map
    const friends = this.getFriends();
    const myLoc = this.lastKnownLocation;

    friends.forEach((friend) => {
      if (!friend || friend.id === myId) return;

      const liveMatch = livePlayers.find(p => p.id === friend.id);
      if (liveMatch) {
        // Friend is actively broadcasting GPS over Wi-Fi / LAN
        liveMatch.isFriend = true;
        liveMatch.name = friend.name || liveMatch.name;
        liveMatch.robotName = friend.robotName || liveMatch.robotName;
        liveMatch.robotClass = friend.robotClass || liveMatch.robotClass;
        liveMatch.faction = friend.faction || liveMatch.faction;
        liveMatch.level = friend.level || liveMatch.level;
        liveMatch.rankTier = friend.rankTier || liveMatch.rankTier;
      } else {
        // Friend has not reported GPS yet or is nearby on LAN Wi-Fi
        // Derive steady deterministic coordinates around user's location so they are directly visible & interactable
        let fLat = friend.latitude;
        let fLng = friend.longitude;

        if ((!fLat || !fLng) && myLoc) {
          const charCodeSum = (friend.id + friend.name).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
          const angle = (charCodeSum % 360) * (Math.PI / 180);
          const distDegrees = 0.0003 + ((charCodeSum % 5) * 0.00008); // ~35 to 60 meters
          fLat = myLoc.latitude + distDegrees * Math.cos(angle);
          fLng = myLoc.longitude + distDegrees * Math.sin(angle);
        }

        if (fLat && fLng) {
          livePlayers.unshift({
            id: friend.id,
            name: friend.name,
            latitude: fLat,
            longitude: fLng,
            heading: 90,
            level: friend.level || 8,
            rankTier: friend.rankTier || 'Gold',
            robotName: friend.robotName || 'Combat Mech',
            robotClass: friend.robotClass || 'Warrior',
            faction: friend.faction || 'Autobot',
            status: friend.status || 'online',
            lastSeen: Date.now(),
            isFriend: true,
          });
        }
      }
    });

    // If user has real friends, DO NOT show fake NPCs / mock teammates so map is clean and focused on real friends
    if (this.simulatedTeammatesEnabled && this.lastKnownLocation && friends.length === 0) {
      const baseLat = this.lastKnownLocation.latitude;
      const baseLng = this.lastKnownLocation.longitude;

      const mockTeammates: PlayerPresence[] = [
        {
          id: 'teammate-alex-01',
          name: 'Alex (Teammate #1)',
          latitude: baseLat + 0.00045, // ~50m North
          longitude: baseLng + 0.00035,
          heading: 45,
          level: 12,
          rankTier: 'Platinum',
          robotName: 'Cyber-Optimus Prime',
          robotClass: 'Leader',
          faction: 'Autobot',
          status: 'exploring',
          lastSeen: Date.now(),
        },
        {
          id: 'teammate-rohit-02',
          name: 'Rohit (Teammate #2)',
          latitude: baseLat - 0.00038, // ~45m South
          longitude: baseLng + 0.00052,
          heading: 180,
          level: 9,
          rankTier: 'Gold',
          robotName: 'Vortex Seeker (Desk Fan)',
          robotClass: 'Seeker',
          faction: 'Decepticon',
          status: 'in-battle',
          lastSeen: Date.now(),
        },
        {
          id: 'teammate-priya-03',
          name: 'Priya (Scout)',
          latitude: baseLat + 0.00025, // ~30m North-West
          longitude: baseLng - 0.00045,
          heading: 270,
          level: 15,
          rankTier: 'Diamond',
          robotName: 'Titan Heavy Colossus',
          robotClass: 'Dreadnought',
          faction: 'Autobot',
          status: 'online',
          lastSeen: Date.now(),
        },
      ];

      // Merge mock teammates if not already in live list
      for (const mock of mockTeammates) {
        if (!livePlayers.some(p => p.id === mock.id)) {
          livePlayers.push(mock);
        }
      }
    }

    return livePlayers;
  }

  // --------------------------------------------------------------------------
  // FRIEND LIST PERSISTENCE & MANAGEMENT
  // --------------------------------------------------------------------------

  public static readonly DEFAULT_FRIENDS: FriendProfile[] = [
    {
      id: 'friend-pilot-alex',
      name: 'Alex Vance',
      level: 9,
      rankTier: 'Platinum',
      robotName: 'Vortex Hydron',
      robotClass: 'Warrior',
      faction: 'Autobot',
      status: 'online',
      addedAt: Date.now() - 86400000 * 2,
    },
    {
      id: 'friend-pilot-sarah',
      name: 'Sarah Connor',
      level: 11,
      rankTier: 'Diamond',
      robotName: 'Silicon Slab Titan',
      robotClass: 'Dreadnought',
      faction: 'Autobot',
      status: 'online',
      addedAt: Date.now() - 86400000 * 3,
    },
  ];

  public getFriends(): FriendProfile[] {
    try {
      const raw = localStorage.getItem(USER_STORAGE_KEY);
      if (raw) {
        const user = JSON.parse(raw);
        if (Array.isArray(user?.friends) && user.friends.length > 0) return user.friends;
      }
    } catch {}
    return MultiplayerManager.DEFAULT_FRIENDS;
  }

  public isFriend(playerId: string): boolean {
    const list = this.getFriends();
    return list.some(f => f.id === playerId);
  }

  public addFriend(player: PlayerPresence | FriendProfile): boolean {
    try {
      const raw = localStorage.getItem(USER_STORAGE_KEY);
      let user = raw ? JSON.parse(raw) : {};
      if (!Array.isArray(user.friends)) user.friends = [];

      // Check if already added
      const existingIdx = user.friends.findIndex((f: FriendProfile) => f.id === player.id);
      const newFriend: FriendProfile = {
        id: player.id,
        name: player.name,
        level: player.level || 1,
        rankTier: player.rankTier || 'Bronze',
        robotName: player.robotName || 'Autobot Scout',
        robotClass: player.robotClass || 'Scout',
        faction: player.faction || 'Autobot',
        status: player.status || 'online',
        latitude: player.latitude,
        longitude: player.longitude,
        addedAt: Date.now(),
      };

      if (existingIdx >= 0) {
        user.friends[existingIdx] = { ...user.friends[existingIdx], ...newFriend };
      } else {
        user.friends.push(newFriend);
      }

      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      window.dispatchEvent(new CustomEvent('mb_friends_updated', { detail: user.friends }));
      return true;
    } catch {
      return false;
    }
  }

  public removeFriend(friendId: string): boolean {
    try {
      const raw = localStorage.getItem(USER_STORAGE_KEY);
      if (!raw) return false;
      let user = JSON.parse(raw);
      if (!Array.isArray(user.friends)) return false;

      user.friends = user.friends.filter((f: FriendProfile) => f.id !== friendId);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      window.dispatchEvent(new CustomEvent('mb_friends_updated', { detail: user.friends }));
      return true;
    } catch {
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // REAL-TIME INBOX & NOTIFICATION SYSTEM (FRIEND REQUESTS & BATTLE CHALLENGES)
  // --------------------------------------------------------------------------

  private startInboxPoller() {
    if (this.inboxInterval) clearInterval(this.inboxInterval);
    this.inboxInterval = setInterval(() => {
      this.pollInboxNow();
    }, 2500);
  }

  public async pollInboxNow(): Promise<void> {
    const pid = getOrCreatePlayerId();
    try {
      const res = await fetch(`${this.getServerHostUrl()}/api/multiplayer/inbox/${pid}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success) return;

      const incomingRequests: FriendRequest[] = data.incomingFriendRequests || [];
      const incomingInvites: BattleInvite[] = data.incomingBattleInvites || [];
      const acceptedOutbox: any[] = data.acceptedOutbox || [];

      // Detect incoming friend requests changes
      const reqsChanged = JSON.stringify(incomingRequests) !== JSON.stringify(this.lastKnownFriendRequests);
      if (reqsChanged && incomingRequests.length > 0) {
        window.dispatchEvent(new CustomEvent('mb_incoming_friend_request', { detail: incomingRequests }));
      }
      this.lastKnownFriendRequests = incomingRequests;

      // Detect incoming battle invites changes
      const invitesChanged = JSON.stringify(incomingInvites) !== JSON.stringify(this.lastKnownBattleInvites);
      if (invitesChanged && incomingInvites.length > 0) {
        window.dispatchEvent(new CustomEvent('mb_incoming_battle_invite', { detail: incomingInvites }));
      }
      this.lastKnownBattleInvites = incomingInvites;

      // Auto-add accepted outbox friend confirmations
      if (acceptedOutbox.length > 0) {
        let changed = false;
        for (const out of acceptedOutbox) {
          if (out.recipientPilot && !this.isFriend(out.toPilotId)) {
            this.addFriend({
              id: out.toPilotId,
              name: out.recipientPilot.name || out.toPilotId,
              level: out.recipientPilot.level || 5,
              rankTier: out.recipientPilot.rankTier || 'Gold',
              robotName: out.recipientPilot.robotName || 'Combat Robot',
              robotClass: out.recipientPilot.robotClass || 'Warrior',
              faction: out.recipientPilot.faction || 'Autobot',
              status: 'online',
              addedAt: Date.now(),
            });
            changed = true;
          }
        }
        if (changed) {
          window.dispatchEvent(new CustomEvent('mb_friend_request_accepted', { detail: acceptedOutbox }));
        }
      }
    } catch {
      // Ignore network errors in local offline mode
    }
  }

  public getCachedFriendRequests(): FriendRequest[] {
    return this.lastKnownFriendRequests;
  }

  public getCachedBattleInvites(): BattleInvite[] {
    return this.lastKnownBattleInvites;
  }

  public async sendFriendRequest(targetPilotId: string): Promise<{ success: boolean; message: string }> {
    const myId = getOrCreatePlayerId();
    const myName = getLocalGamerTag();
    const myRobot = getActivePlayerRobot();

    try {
      const res = await fetch(`${this.getServerHostUrl()}/api/multiplayer/friend-request/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromPilot: {
            id: myId,
            name: myName,
            robotName: myRobot.name,
            robotClass: myRobot.robotClass || 'Warrior',
            faction: myRobot.faction || 'Autobot',
            level: 8,
          },
          toPilotId: targetPilotId.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        return { success: true, message: `Friend request sent to ${targetPilotId}!` };
      } else {
        return { success: false, message: data.error || 'Failed to send friend request.' };
      }
    } catch (err: any) {
      return { success: false, message: err?.message || 'Server unreachable.' };
    }
  }

  public async respondFriendRequest(
    requestId: string,
    accept: boolean,
    reqItem?: FriendRequest
  ): Promise<boolean> {
    const myId = getOrCreatePlayerId();
    const myName = getLocalGamerTag();
    const myRobot = getActivePlayerRobot();

    try {
      const res = await fetch(`${this.getServerHostUrl()}/api/multiplayer/friend-request/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          response: accept ? 'accept' : 'declined',
          myPilot: {
            id: myId,
            name: myName,
            robotName: myRobot.name,
            robotClass: myRobot.robotClass || 'Warrior',
            faction: myRobot.faction || 'Autobot',
            level: 8,
          },
        }),
      });
      const data = await res.json();
      if (data.success && accept && reqItem) {
        this.addFriend({
          id: reqItem.fromPilotId,
          name: reqItem.fromName,
          level: reqItem.fromLevel,
          rankTier: 'Gold',
          robotName: reqItem.fromRobotName,
          robotClass: reqItem.fromRobotClass || 'Warrior',
          faction: (reqItem.fromFaction as any) || 'Autobot',
          status: 'online',
          addedAt: Date.now(),
        });
      }
      this.pollInboxNow();
      return true;
    } catch {
      return false;
    }
  }

  public async sendBattleInvite(
    targetPilotId: string,
    mode: GameMode = 'classic',
    customRoomCode?: string,
    customRoomName?: string
  ): Promise<{ success: boolean; roomCode?: string; message?: string }> {
    const myId = getOrCreatePlayerId();
    const myName = getLocalGamerTag();
    const myRobot = getActivePlayerRobot();
    const roomCode = customRoomCode || `ARENA-${Math.floor(1000 + Math.random() * 9000)}`;
    const finalRoomName = customRoomName || `1v1 vs ${myName}`;

    try {
      const res = await fetch(`${this.getServerHostUrl()}/api/multiplayer/battle-invite/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromPilot: {
            id: myId,
            name: myName,
            robotName: myRobot.name,
            level: 8,
          },
          toPilotId: targetPilotId.trim(),
          roomId: roomCode,
          roomCode,
          roomName: finalRoomName,
          mode,
        }),
      });
      const data = await res.json();
      if (data.success) {
        return { success: true, roomCode };
      }
      return { success: true, roomCode, message: data.error };
    } catch (e: any) {
      // Return success with roomCode for offline / local squad simulation
      return { success: true, roomCode, message: e?.message || 'Local direct sync' };
    }
  }

  public async respondBattleInvite(inviteId: string, accept: boolean): Promise<boolean> {
    try {
      const res = await fetch(`${this.getServerHostUrl()}/api/multiplayer/battle-invite/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteId,
          response: accept ? 'accept' : 'declined',
        }),
      });
      const data = await res.json();
      this.pollInboxNow();
      return data.success;
    } catch {
      return false;
    }
  }


  // --------------------------------------------------------------------------
  // ROOM MANAGEMENT (PLAY WITH FRIENDS)
  // --------------------------------------------------------------------------

  public async createRoom(
    roomName: string,
    mode: GameMode,
    maxPlayers: number = 8,
    botsEnabled: boolean = true
  ): Promise<MultiplayerRoom> {
    const code = `MATE-${Math.floor(1000 + Math.random() * 9000)}`;
    const myId = getOrCreatePlayerId();
    const myName = getLocalGamerTag();
    const myRobot = getActivePlayerRobot();

    const newRoom: MultiplayerRoom = {
      code,
      name: roomName.trim() || 'Friend Arena',
      hostId: myId,
      mode,
      maxPlayers,
      status: 'waiting',
      createdAt: Date.now(),
      botsEnabled,
      players: [
        {
          id: myId,
          name: myName,
          isHost: true,
          creature: myRobot,
          isReady: true,
          ping: 15,
        },
      ],
    };

    try {
      const res = await fetch(`${this.getServerHostUrl()}/api/multiplayer/rooms/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRoom),
      });
      if (res.ok) {
        const data = await res.json();
        this.activeRoom = data.room;
        return data.room;
      }
    } catch {}

    // Fallback local memory room
    this.activeRoom = newRoom;
    return newRoom;
  }

  public async joinRoom(roomCode: string): Promise<MultiplayerRoom> {
    const cleanCode = roomCode.trim().toUpperCase();
    const myId = getOrCreatePlayerId();
    const myName = getLocalGamerTag();
    const myRobot = getActivePlayerRobot();

    const member: RoomMember = {
      id: myId,
      name: myName,
      isHost: false,
      creature: myRobot,
      isReady: true,
      ping: 20,
    };

    try {
      const res = await fetch(`${this.getServerHostUrl()}/api/multiplayer/rooms/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cleanCode, member }),
      });
      if (res.ok) {
        const data = await res.json();
        this.activeRoom = data.room;
        return data.room;
      }
    } catch {}

    // Fallback client-side mock room if server unavailable
    const mockJoinedRoom: MultiplayerRoom = {
      code: cleanCode,
      name: `${cleanCode} Match`,
      hostId: 'friend-host-01',
      mode: 'easy',
      maxPlayers: 8,
      status: 'waiting',
      createdAt: Date.now(),
      botsEnabled: true,
      players: [
        {
          id: 'friend-host-01',
          name: 'Friend Host',
          isHost: true,
          creature: getActivePlayerRobot(),
          isReady: true,
          ping: 18,
        },
        member,
      ],
    };

    this.activeRoom = mockJoinedRoom;
    return mockJoinedRoom;
  }

  public async pollRoom(roomCode: string): Promise<MultiplayerRoom | null> {
    try {
      const res = await fetch(`${this.getServerHostUrl()}/api/multiplayer/rooms/${roomCode}`);
      if (res.ok) {
        const data = await res.json();
        this.activeRoom = data.room;
        return data.room;
      }
    } catch {}
    return this.activeRoom;
  }

  public async startMatch(roomCode: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.getServerHostUrl()}/api/multiplayer/rooms/${roomCode}/start`, {
        method: 'POST',
      });
      if (res.ok) return true;
    } catch {}
    if (this.activeRoom) {
      this.activeRoom.status = 'in-match';
    }
    return true;
  }

  public getActiveRoom(): MultiplayerRoom | null {
    return this.activeRoom;
  }

  public leaveRoom() {
    this.activeRoom = null;
    this.stopCombatSync();
  }

  // --------------------------------------------------------------------------
  // HIGH-SPEED COMBAT SYNCHRONIZATION (20 FPS)
  // --------------------------------------------------------------------------

  public startCombatSync(
    roomCode: string, 
    onPacket: (packet: CombatSyncPacket) => void,
    onDamage: (event: DamageSyncEvent) => void
  ) {
    this.stopCombatSync();
    this.combatPacketListeners.push(onPacket);
    this.damageEventListeners.push(onDamage);

    this.combatSyncInterval = setInterval(async () => {
      try {
        const myId = getOrCreatePlayerId();
        const res = await fetch(`${this.getServerHostUrl()}/api/multiplayer/rooms/${roomCode}/sync?client=${myId}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.packets)) {
            data.packets.forEach((pkt: CombatSyncPacket) => {
              if (pkt.senderId !== myId) {
                this.combatPacketListeners.forEach(listener => {
                  try {
                    listener(pkt);
                  } catch (err) {
                    console.warn('Packet listener error:', err);
                  }
                });
              }
            });
          }
          if (Array.isArray(data.damageEvents)) {
            data.damageEvents.forEach((evt: DamageSyncEvent) => {
              this.damageEventListeners.forEach(listener => {
                try {
                  listener(evt);
                } catch (err) {
                  console.warn('Damage listener error:', err);
                }
              });
            });
          }
        }
      } catch {}
    }, 65); // ~15-20 Hz
  }

  public stopCombatSync() {
    if (this.combatSyncInterval) {
      clearInterval(this.combatSyncInterval);
      this.combatSyncInterval = null;
    }
    this.combatPacketListeners = [];
    this.damageEventListeners = [];
  }

  public async broadcastCombatState(roomCode: string, packet: CombatSyncPacket): Promise<void> {
    try {
      await fetch(`${this.getServerHostUrl()}/api/multiplayer/rooms/${roomCode}/packet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(packet),
      });
    } catch {}
  }

  public async broadcastDamageEvent(roomCode: string, event: DamageSyncEvent): Promise<void> {
    try {
      await fetch(`${this.getServerHostUrl()}/api/multiplayer/rooms/${roomCode}/damage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });
    } catch {}
  }
}

export const multiplayerManager = new MultiplayerManager();
