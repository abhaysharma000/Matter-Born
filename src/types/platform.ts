import { SkinConfig, GameMode } from '../types';
import { FriendProfile } from './multiplayer';

export interface PlatformGame {
  id: string;
  title: string;
  tagline: string;
  description: string;
  category: 'Territory' | 'Snake/Slither' | 'Battle Royale' | 'Action' | '3D Worlds';
  rating: number;
  playerCount: number;
  featured: boolean;
  badge?: 'HOT' | 'NEW' | 'ORIGINAL' | 'UPDATED' | 'AI HACKATHON';
  color: string;
  secondaryColor: string;
  thumbnailIcon: string;
  tags: string[];
  isPlayableInternal: boolean;
}

export interface ServerRegion {
  id: string;
  name: string;
  location: string;
  flag: string;
  ping: number;
  activePlayers: number;
  activeMatches: number;
  status: 'Optimal' | 'Good' | 'Heavy';
}

export interface GameRoom {
  id: string;
  code: string;
  name: string;
  region: string;
  mode: GameMode;
  hostName: string;
  currentPlayers: number;
  maxPlayers: number;
  isPrivate: boolean;
  ping: number;
  mapScale: 'Compact' | 'Standard' | 'Mega';
  botsEnabled: boolean;
  friendFighters?: FriendProfile[];
}

export interface ShopItem {
  id: string;
  name: string;
  type: 'skin' | 'trail' | 'crown' | 'effect';
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  priceCoins: number;
  priceGems: number;
  icon: string;
  previewColor: string;
  trailColor?: string;
  description: string;
  skinConfig?: SkinConfig;
  unlocked?: boolean;
}

export interface PlatformUser {
  id: string;
  name: string;
  authProvider?: 'guest' | 'google';
  email?: string;
  avatarUrl?: string;
  googleId?: string;
  avatarIcon: string;
  title: string;
  level: number;
  currentXp: number;
  maxXp: number;
  coins: number;
  gems: number;
  rankTier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Grandmaster';
  rankPoints: number;
  equippedSkinId: string;
  equippedTrailId: string;
  equippedCrownId: string;
  unlockedItemIds: string[];
  hasCybertronPass?: boolean;
  unlockedTransformerIds?: string[];
  equippedTransformerId?: string;
  totalMatches: number;
  victories: number;
  totalKills: number;
  peakTerritory: number;
  clanName?: string;
  clanTag?: string;
  friends?: FriendProfile[];
  matchHistory: {
    id: string;
    gameTitle: string;
    mode: GameMode;
    territory: number;
    kills: number;
    rank: number;
    coinsEarned: number;
    xpEarned: number;
    timestamp: number;
  }[];
}

export interface Tournament {
  id: string;
  title: string;
  gameMode: string;
  status: 'Live' | 'Upcoming' | 'Finished';
  endsInSeconds: number;
  entryFeeCoins: number;
  prizePoolGems: number;
  totalParticipants: number;
  topPlayers: {
    rank: number;
    name: string;
    score: string;
    clanTag?: string;
    rewardGems: number;
  }[];
}

export interface Clan {
  id: string;
  name: string;
  tag: string;
  color: string;
  level: number;
  membersCount: number;
  maxMembers: number;
  controlledTerritoryPct: number;
  totalWins: number;
  leader: string;
  description: string;
}

export interface DailyQuest {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  rewardCoins: number;
  rewardGems: number;
  completed: boolean;
  claimed: boolean;
}
