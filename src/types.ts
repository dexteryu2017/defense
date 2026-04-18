export type GameState = 'START' | 'PLAYING' | 'SUCCESS' | 'GAMEOVER' | 'LEVEL_CLEAR';

export interface Point {
  x: number;
  y: number;
}

export interface Rocket {
  id: string;
  start: Point;
  end: Point;
  pos: Point;
  speed: number;
  type: 'ENEMY' | 'INTERCEPTOR';
  color: string;
  target?: Point;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export interface Explosion {
  id: string;
  pos: Point;
  radius: number;
  maxRadius: number;
  growthRate: number;
  isFading: boolean;
}

export interface City {
  id: string;
  x: number;
  isDestroyed: boolean;
}

export interface Launcher {
  id: string;
  x: number;
  ammo: number;
  maxAmmo: number;
  isDestroyed: boolean;
}

export interface GameSettings {
  language: 'zh' | 'en';
  score: number;
  round: number;
  rocketsToSpawn: number;
}
