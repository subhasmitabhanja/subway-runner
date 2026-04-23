export enum GameState {
  MENU,
  PLAYING,
  GAMEOVER,
}

export interface Player {
  lane: number; // -1, 0, 1
  y: number; // For jumping
  isJumping: boolean;
  isSliding: boolean;
  slideTimer: number;
  jumpVelocity: number;
}

export interface Obstacle {
  id: string;
  lane: number;
  z: number; // Distance from player (camera depth)
  type: 'barrier' | 'train' | 'ramp';
  height: number;
}

export interface Coin {
  id: string;
  lane: number;
  z: number;
  collected: boolean;
}

export interface GameStats {
  score: number;
  distance: number;
  coins: number;
  multiplier: number;
}
