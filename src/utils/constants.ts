import { SkinConfig } from '../types';

export const GRID_SIZE = 140; // 140 x 140 grid = 19,600 tiles
export const CELL_SIZE = 18; // 18px per cell -> 2520 x 2520 world
export const WORLD_SIZE = GRID_SIZE * CELL_SIZE;

export const BASE_RADIUS_CELLS = 5; // Starting territory radius (~10x10 base)
export const BOT_COUNT = 8; // Active bots in arena
export const PLAYER_ID = 1; // Player is always ID 1

export const BASE_SPEED = 180; // px/sec
export const TURN_SPEED = Math.PI * 4; // Radians per sec for smooth turning

export const SKINS: SkinConfig[] = [
  {
    id: 'coral',
    name: 'Electric Coral',
    primaryColor: '#ff4757',
    trailColor: '#ff6b81',
    strokeColor: '#b33939',
    darkColor: '#d63031',
    icon: 'crown',
  },
  {
    id: 'cyan',
    name: 'Cyber Cyan',
    primaryColor: '#00d2d3',
    trailColor: '#48dbfb',
    strokeColor: '#01a3a4',
    darkColor: '#00cec9',
    icon: 'zap',
  },
  {
    id: 'emerald',
    name: 'Neon Emerald',
    primaryColor: '#2ed573',
    trailColor: '#7bed9f',
    strokeColor: '#1e824c',
    darkColor: '#26af5f',
    icon: 'leaf',
  },
  {
    id: 'violet',
    name: 'Royal Violet',
    primaryColor: '#a55eea',
    trailColor: '#c784f9',
    strokeColor: '#7030a0',
    darkColor: '#8854d0',
    icon: 'star',
  },
  {
    id: 'gold',
    name: 'Solar Amber',
    primaryColor: '#ffa502',
    trailColor: '#ffc048',
    strokeColor: '#d35400',
    darkColor: '#e67e22',
    icon: 'flame',
  },
  {
    id: 'magenta',
    name: 'Hot Pink',
    primaryColor: '#ff3f80',
    trailColor: '#ff69b4',
    strokeColor: '#c2185b',
    darkColor: '#e91e63',
    icon: 'heart',
  },
  {
    id: 'azure',
    name: 'Ocean Azure',
    primaryColor: '#1e90ff',
    trailColor: '#70a1ff',
    strokeColor: '#0984e3',
    darkColor: '#2980b9',
    icon: 'shield',
  },
  {
    id: 'lava',
    name: 'Lava Orange',
    primaryColor: '#ff6348',
    trailColor: '#ff7f50',
    strokeColor: '#d35400',
    darkColor: '#eb4d4b',
    icon: 'rocket',
  },
  {
    id: 'mint',
    name: 'Mint Pastel',
    primaryColor: '#10ac84',
    trailColor: '#1dd1a1',
    strokeColor: '#0e7e61',
    darkColor: '#05c46b',
    icon: 'diamond',
  },
];

export const BOT_NAMES = [
  'ShadowFox',
  'TurboNinja',
  'PaperKing',
  'Vortex',
  'PixelQueen',
  'Blaze',
  'Luna',
  'Frosty',
  'CyberSamurai',
  'NeonViper',
  'Zenith',
  'Thunder',
  'Quantum',
  'Starlight',
  'Echo',
];

export const ICONS_LIST = [
  'crown',
  'zap',
  'flame',
  'star',
  'shield',
  'leaf',
  'heart',
  'rocket',
  'diamond',
];
