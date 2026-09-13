import { BattleCreature } from './creature';
import { GameMode } from '../types';

export interface FriendProfile {
  id: string;
  name: string;
  level: number;
  rankTier: string;
  robotName: string;
  robotClass: string;
  faction: 'Autobot' | 'Decepticon';
  status: 'online' | 'exploring' | 'in-room' | 'in-battle' | 'offline';
  distanceMeters?: number;
  latitude?: number;
  longitude?: number;
  addedAt: number;
}

export interface PlayerPresence {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  heading?: number;
  level: number;
  rankTier: string;
  robotName: string;
  robotClass: string;
  faction: 'Autobot' | 'Decepticon';
  status: 'exploring' | 'in-room' | 'in-battle' | 'online' | 'offline';
  lastSeen: number;
  isFriend?: boolean;
}

export interface RoomMember {
  id: string;
  name: string;
  isHost: boolean;
  creature: BattleCreature;
  isReady: boolean;
  ping: number;
}

export interface MultiplayerRoom {
  code: string;
  name: string;
  hostId: string;
  mode: GameMode;
  maxPlayers: number;
  players: RoomMember[];
  status: 'waiting' | 'in-match';
  createdAt: number;
  botsEnabled: boolean;
}

export interface CombatSyncPacket {
  senderId: string;
  senderName: string;
  creature?: BattleCreature;
  x: number;
  y: number;
  z: number;
  rotation: number;
  currentHp: number;
  maxHp: number;
  isAttacking: boolean;
  isDashing: boolean;
  isJumping: boolean;
  attackType?: 'normal' | 'special';
  timestamp: number;
}

export interface DamageSyncEvent {
  targetId: string;
  attackerId: string;
  damage: number;
  isCritical?: boolean;
  remainingHp: number;
  timestamp: number;
}

export interface FriendRequest {
  id: string;
  fromPilotId: string;
  fromName: string;
  fromRobotName: string;
  fromRobotClass?: string;
  fromFaction?: 'Autobot' | 'Decepticon';
  fromLevel: number;
  toPilotId: string;
  timestamp: number;
  status: 'pending' | 'accepted' | 'declined';
  acceptedAt?: number;
}

export interface BattleInvite {
  id: string;
  roomId: string;
  roomCode: string;
  roomName: string;
  fromPilotId: string;
  fromName: string;
  fromRobotName: string;
  fromLevel: number;
  toPilotId: string;
  mode: GameMode;
  timestamp: number;
  status: 'pending' | 'accepted' | 'declined';
}

