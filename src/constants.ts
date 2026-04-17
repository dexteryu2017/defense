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
  INTERCEPTOR_SPEED: 4,
  EXPLOSION_MAX_RADIUS: 40,
  EXPLOSION_GROWTH: 1.5,
  WIN_SCORE: 1000,
  KILL_POINTS: 20,
};

export const UI_STRINGS = {
  en: {
    title: 'Victor Nova Defense',
    start: 'START GAME',
    restart: 'PLAY AGAIN',
    gameOver: 'DEFENSE FAILED',
    success: 'MISSION SUCCESS',
    score: 'SCORE',
    ammo: 'AMMO',
    objective: 'Protect your cities and launchers from falling rockets.',
    winMessage: 'The region is safe... for now.',
    lossMessage: 'The city has fallen.',
  },
  zh: {
    title: 'Victor 新星防御',
    start: '开始游戏',
    restart: '再玩一次',
    gameOver: '防御失败',
    success: '任务成功',
    score: '得分',
    ammo: '弹药',
    objective: '保护你的城市和发射塔，抵御坠落的火箭。',
    winMessage: '该地区已安全……暂时如此。',
    lossMessage: '城市已经沦陷。',
  }
};
