export const COLORS = {
  BACKGROUND: '#05070a',
  ENEMY: '#ff3e00',
  INTERCEPTOR: '#00f2ff',
  EXPLOSION: '#ffffff',
  CITY: '#161b22',
  LAUNCHER: '#21262d',
  TEXT: '#ffffff',
  CROSSHAIR: '#00f2ff',
  WARNING: '#ffcc00',
  UI_ACCENT: '#00f2ff',
};

export const PHYSICS = {
  ROCKET_SPEED_RANGE: [0.5, 1.2],
  INTERCEPTOR_SPEED: 7,
  EXPLOSION_MAX_RADIUS: 60,
  EXPLOSION_GROWTH: 2.5,
  WIN_SCORE: 2500, // Final game score to win
  KILL_POINTS: 20,
};

export const LEVEL_OPTS = [
  { level: 1, target: 400, speedMult: 1.0, spawnRate: 1200 },
  { level: 2, target: 900, speedMult: 1.2, spawnRate: 1000 },
  { level: 3, target: 1500, speedMult: 1.4, spawnRate: 800 },
  { level: 4, target: 2200, speedMult: 1.6, spawnRate: 600 },
  { level: 5, target: 3000, speedMult: 1.8, spawnRate: 500 },
];

export const UI_STRINGS = {
  en: {
    title: 'Victor Earth Defense',
    start: 'START GAME',
    restart: 'PLAY AGAIN',
    nextLevel: 'NEXT LEVEL',
    gameOver: 'DEFENSE FAILED',
    success: 'MISSION SUCCESS',
    levelClear: 'LEVEL SECURED',
    score: 'SCORE',
    ammo: 'AMMO',
    level: 'LEVEL',
    objective: 'Protect Earth and your defense batteries from the alien invasion.',
    winMessage: 'Planet Earth is safe... for now.',
    lossMessage: 'Earth has fallen into darkness.',
    levelMessage: 'Prepare for the next wave.',
  },
  zh: {
    title: 'Victor 地球防御',
    start: '开始游戏',
    restart: '再玩一次',
    nextLevel: '下一关',
    gameOver: '防御失败',
    success: '任务成功',
    levelClear: '本关已守住',
    score: '得分',
    ammo: '弹药',
    level: '关卡',
    objective: '保卫地球家园与防御系统，抵御外星势力的全面入侵。',
    winMessage: '地球暂时脱离了危险。',
    lossMessage: '地球防线已全面崩溃。',
    levelMessage: '准备迎接下一波进攻。',
  }
};
