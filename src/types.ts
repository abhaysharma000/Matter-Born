export type GameMode = 'easy' | 'moderate' | 'hard' | 'classic' | 'rush' | 'royale';
export type GameState = 'menu' | 'playing' | 'paused' | 'gameover' | 'victory';

export interface SkinConfig {
  id: string;
  name: string;
  primaryColor: string;
  trailColor: string;
  strokeColor: string;
  darkColor: string;
  icon: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface CellCoord {
  cx: number;
  cy: number;
}

export interface TrailNode {
  x: number;
  y: number;
  cx: number;
  cy: number;
}

export type BotPersonality = 'aggressive' | 'cautious' | 'expander' | 'hunter';

export interface Character {
  id: number;
  name: string;
  color: string;
  trailColor: string;
  strokeColor: string;
  darkColor: string;
  icon: string;
  isBot: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  targetAngle: number;
  speed: number;
  alive: boolean;
  kills: number;
  territoryCount: number;
  territoryPercentage: number;
  trail: TrailNode[];
  personality?: BotPersonality;
  botTarget?: Point | null;
  botTimer?: number;
  respawnTime?: number;
  deathReason?: string;
  deathX?: number;
  deathY?: number;
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  size: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface KillFeedItem {
  id: string;
  text: string;
  killerColor: string;
  victimColor: string;
  timestamp: number;
}

export interface LeaderboardEntry {
  id: number;
  name: string;
  color: string;
  percentage: number;
  kills: number;
  isPlayer: boolean;
  rank: number;
  icon: string;
}

export interface MatchStats {
  percentage: number;
  kills: number;
  timeSurvivedSeconds: number;
  rank: number;
  totalCompetitors: number;
  mode: GameMode;
  date: string;
  killerName?: string;
  deathReason?: string;
  isVictory: boolean;
}

export interface PersistentStats {
  highScorePercentage: number;
  mostKillsInGame: number;
  totalGames: number;
  totalKills: number;
  victories: number;
  favoriteSkinId: string;
  playerName: string;
}
