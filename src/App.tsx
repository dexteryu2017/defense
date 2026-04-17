/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, useCallback, MouseEvent, TouchEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crosshair, Trophy, RotateCcw, ShieldAlert, Languages } from 'lucide-react';
import { 
  Rocket, 
  Explosion, 
  City, 
  Launcher, 
  GameState, 
  Point, 
  GameSettings,
  Particle
} from './types';
import { COLORS, PHYSICS, UI_STRINGS } from './constants';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>('START');
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const [score, setScore] = useState(0);
  const [shake, setShake] = useState(0);

  // Game loop state refs to avoid re-renders
  const stateRef = useRef({
    rockets: [] as Rocket[],
    interceptors: [] as Rocket[],
    explosions: [] as Explosion[],
    particles: [] as Particle[],
    cities: Array.from({ length: 6 }, (_, i) => ({
      id: `city-${i}`,
      x: 0,
      isDestroyed: false,
    })) as City[],
    launchers: [
      { id: 'L', x: 0, ammo: 20, maxAmmo: 20, isDestroyed: false },
      { id: 'C', x: 0, ammo: 40, maxAmmo: 40, isDestroyed: false },
      { id: 'R', x: 0, ammo: 20, maxAmmo: 20, isDestroyed: false },
    ] as Launcher[],
    lastSpawn: 0,
    spawnInterval: 1200,
    isGameOver: false,
    score: 0,
  });

  const initLevel = useCallback(() => {
    stateRef.current.cities.forEach(c => c.isDestroyed = false);
    stateRef.current.launchers.forEach(l => {
      l.isDestroyed = false;
      l.ammo = l.maxAmmo;
    });
    stateRef.current.rockets = [];
    stateRef.current.interceptors = [];
    stateRef.current.explosions = [];
    stateRef.current.particles = [];
    stateRef.current.score = 0;
    setScore(0);
    setGameState('PLAYING');
  }, []);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Distribute cities and launchers
    const w = canvas.width;
    const h = canvas.height;
    
    const margin = w * 0.1;
    const availableW = w - margin * 2;
    
    // Launchers at edges and center
    stateRef.current.launchers[0].x = margin;
    stateRef.current.launchers[1].x = w / 2;
    stateRef.current.launchers[2].x = w - margin;

    // Cities in between
    const step = availableW / 7;
    stateRef.current.cities[0].x = margin + step * 1;
    stateRef.current.cities[1].x = margin + step * 2;
    stateRef.current.cities[2].x = margin + step * 3;
    stateRef.current.cities[3].x = margin + step * 4;
    stateRef.current.cities[4].x = margin + step * 5;
    stateRef.current.cities[5].x = margin + step * 6;
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  const addParticles = (x: number, y: number, color: string, count = 10) => {
    for (let i = 0; i < count; i++) {
      stateRef.current.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 1.0,
        color
      });
    }
  };

  const handleClick = (e: MouseEvent | TouchEvent) => {
    if (gameState !== 'PLAYING') return;

    let clickX, clickY;
    if ('touches' in e) {
      clickX = e.touches[0].clientX;
      clickY = e.touches[0].clientY;
    } else {
      clickX = (e as MouseEvent).clientX;
      clickY = (e as MouseEvent).clientY;
    }

    const { launchers } = stateRef.current;
    
    // Find closest launcher with ammo
    let bestLauncher = -1;
    let minDist = Infinity;

    launchers.forEach((l, idx) => {
      if (!l.isDestroyed && l.ammo > 0) {
        const d = Math.abs(l.x - clickX);
        if (d < minDist) {
          minDist = d;
          bestLauncher = idx;
        }
      }
    });

    if (bestLauncher !== -1) {
      const l = launchers[bestLauncher];
      l.ammo--;
      
      const id = Math.random().toString(36).substr(2, 9);
      stateRef.current.interceptors.push({
        id,
        start: { x: l.x, y: window.innerHeight - 20 },
        end: { x: clickX, y: clickY },
        pos: { x: l.x, y: window.innerHeight - 20 },
        speed: PHYSICS.INTERCEPTOR_SPEED,
        type: 'INTERCEPTOR',
        color: COLORS.INTERCEPTOR,
        target: { x: clickX, y: clickY }
      });
    }
  };

  const drawMissile = useCallback((
    ctx: CanvasRenderingContext2D, 
    x: number, 
    y: number, 
    vx: number, 
    vy: number, 
    color: string, 
    size = 10
  ) => {
    const angle = Math.atan2(vy, vx) + Math.PI / 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    
    ctx.fillStyle = color;
    
    // Missile Body
    const width = size * 0.3;
    const height = size;
    ctx.fillRect(-width / 2, -height / 2, width, height);
    
    // Nose Cone (pointed tip)
    ctx.beginPath();
    ctx.moveTo(-width / 2, -height / 2);
    ctx.lineTo(0, -height);
    ctx.lineTo(width / 2, -height / 2);
    ctx.fill();
    
    // Fins
    ctx.beginPath();
    // Left fin
    ctx.moveTo(-width / 2, 0);
    ctx.lineTo(-width * 1.5, height / 2);
    ctx.lineTo(-width / 2, height / 2);
    // Right fin
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width * 1.5, height / 2);
    ctx.lineTo(width / 2, height / 2);
    ctx.fill();

    // Engine glow
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, height / 2, width / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }, []);

  const draw = useCallback((ctx: CanvasRenderingContext2D, time: number) => {
    const { width, height } = ctx.canvas;
    
    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#05070a');
    bgGrad.addColorStop(1, '#0a1018');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    if (shake > 0) {
      ctx.save();
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
      setShake(s => Math.max(0, s - 0.5));
    }

    // Spawn Enemy Rockets
    if (gameState === 'PLAYING') {
      if (time - stateRef.current.lastSpawn > stateRef.current.spawnInterval) {
        const id = Math.random().toString(36).substr(2, 9);
        const startX = Math.random() * width;
        
        // Pick random target among cities and launchers
        const targets = [...stateRef.current.cities, ...stateRef.current.launchers].filter(t => !t.isDestroyed);
        if (targets.length > 0) {
          const target = targets[Math.floor(Math.random() * targets.length)];
          stateRef.current.rockets.push({
            id,
            start: { x: startX, y: 0 },
            end: { x: target.x, y: height - 20 },
            pos: { x: startX, y: 0 },
            speed: PHYSICS.ROCKET_SPEED_RANGE[0] + Math.random() * (PHYSICS.ROCKET_SPEED_RANGE[1] - PHYSICS.ROCKET_SPEED_RANGE[0]),
            type: 'ENEMY',
            color: COLORS.ENEMY,
          });
          stateRef.current.lastSpawn = time;
          // Ramp up difficulty
          stateRef.current.spawnInterval = Math.max(400, 1200 - (stateRef.current.score / 100) * 50);
        }
      }
    }

    // Update & Draw Explosions
    stateRef.current.explosions = stateRef.current.explosions.filter(exp => {
      if (!exp.isFading) {
        exp.radius += exp.growthRate;
        if (exp.radius >= exp.maxRadius) exp.isFading = true;
      } else {
        exp.radius -= exp.growthRate * 0.5;
      }

      const alpha = Math.max(0, exp.radius / exp.maxRadius);
      
      const grad = ctx.createRadialGradient(exp.pos.x, exp.pos.y, 0, exp.pos.x, exp.pos.y, exp.radius);
      grad.addColorStop(0, `rgba(255, 62, 0, ${alpha * 0.8})`);
      grad.addColorStop(0.6, `rgba(255, 204, 0, ${alpha * 0.4})`);
      grad.addColorStop(1, 'transparent');
      
      ctx.beginPath();
      ctx.arc(exp.pos.x, exp.pos.y, exp.radius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      
      ctx.lineWidth = 2;
      ctx.strokeStyle = `rgba(255, 62, 0, ${alpha})`;
      ctx.stroke();

      return exp.radius > 0;
    });

    // Update & Draw Rockets
    stateRef.current.rockets = stateRef.current.rockets.filter(r => {
      const dx = r.end.x - r.start.x;
      const dy = r.end.y - r.start.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const vx = (dx / dist) * r.speed;
      const vy = (dy / dist) * r.speed;

      r.pos.x += vx;
      r.pos.y += vy;

      // Check collision with explosions
      const hit = stateRef.current.explosions.some(exp => {
        const d = Math.sqrt((r.pos.x - exp.pos.x) ** 2 + (r.pos.y - exp.pos.y) ** 2);
        return d < exp.radius;
      });

      if (hit) {
        stateRef.current.score += PHYSICS.KILL_POINTS;
        setScore(stateRef.current.score);
        addParticles(r.pos.x, r.pos.y, COLORS.ENEMY);
        return false;
      }

      // Check reached target
      if (r.pos.y >= r.end.y) {
        // Destroy target
        [...stateRef.current.cities, ...stateRef.current.launchers].forEach(t => {
          if (Math.abs(t.x - r.end.x) < 5) t.isDestroyed = true;
        });
        stateRef.current.explosions.push({
          id: Math.random().toString(),
          pos: r.pos,
          radius: 0,
          maxRadius: 60,
          growthRate: 3,
          isFading: false
        });
        setShake(10);
        return false;
      }

      // Draw trail with gradient
      const trailGrad = ctx.createLinearGradient(r.start.x, r.start.y, r.pos.x, r.pos.y);
      trailGrad.addColorStop(0, 'transparent');
      trailGrad.addColorStop(1, COLORS.ENEMY);
      
      ctx.beginPath();
      ctx.moveTo(r.start.x, r.start.y);
      ctx.lineTo(r.pos.x, r.pos.y);
      ctx.strokeStyle = trailGrad;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw detailed missile shape
      drawMissile(ctx, r.pos.x, r.pos.y, vx, vy, COLORS.ENEMY, 12);

      return true;
    });

    // Update & Draw Interceptors
    stateRef.current.interceptors = stateRef.current.interceptors.filter(r => {
      const dx = r.end.x - r.start.x;
      const dy = r.end.y - r.start.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const vx = (dx / dist) * r.speed;
      const vy = (dy / dist) * r.speed;

      r.pos.x += vx;
      r.pos.y += vy;

      // Draw crosshair at target
      ctx.strokeStyle = COLORS.CROSSHAIR;
      ctx.lineWidth = 1;
      const s = 10;
      ctx.save();
      ctx.translate(r.end.x, r.end.y);
      ctx.rotate(Math.PI / 4);
      ctx.beginPath();
      ctx.moveTo(-s, 0); ctx.lineTo(s, 0);
      ctx.moveTo(0, -s); ctx.lineTo(0, s);
      ctx.stroke();
      ctx.restore();

      // Check reached target
      if (Math.sqrt((r.pos.x - r.end.x)**2 + (r.pos.y - r.end.y)**2) < r.speed) {
        stateRef.current.explosions.push({
          id: r.id,
          pos: r.pos,
          radius: 0,
          maxRadius: PHYSICS.EXPLOSION_MAX_RADIUS,
          growthRate: PHYSICS.EXPLOSION_GROWTH,
          isFading: false
        });
        return false;
      }

      // Draw trail
      ctx.beginPath();
      ctx.moveTo(r.start.x, r.start.y);
      ctx.lineTo(r.pos.x, r.pos.y);
      ctx.strokeStyle = r.color;
      ctx.stroke();

      // Draw detailed interceptor shape
      drawMissile(ctx, r.pos.x, r.pos.y, vx, vy, COLORS.INTERCEPTOR, 10);

      return true;
    });

    // Particles
    stateRef.current.particles = stateRef.current.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.02;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.fillRect(p.x, p.y, 2, 2);
      ctx.globalAlpha = 1.0;
      return p.life > 0;
    });

    // Draw Launchers
    stateRef.current.launchers.forEach(l => {
      if (l.isDestroyed) {
        ctx.fillStyle = '#0a0a0a';
        ctx.strokeStyle = '#222';
      } else {
        ctx.fillStyle = '#21262d';
        ctx.strokeStyle = COLORS.INTERCEPTOR;
      }
      
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(l.x - 30, height - 40, 60, 40, [8, 8, 0, 0]);
      ctx.fill();
      if (!l.isDestroyed) ctx.stroke();
      
      // Ammo grid style dots
      if (!l.isDestroyed) {
        ctx.fillStyle = COLORS.INTERCEPTOR;
        const cols = l.id === 'C' ? 10 : 5;
        const rows = l.maxAmmo / cols;
        const dotSize = 4;
        const gap = 3;
        const startX = l.x - ((cols * (dotSize + gap)) / 2) + gap / 2;
        
        for(let i=0; i<l.ammo; i++) {
          const r = Math.floor(i/cols);
          const c = i % cols;
          ctx.fillRect(startX + c*(dotSize+gap), height - 20 - r*(dotSize+gap), dotSize, dotSize);
        }
      }
    });

    // Draw Cities
    stateRef.current.cities.forEach(c => {
      if (!c.isDestroyed) {
        ctx.fillStyle = '#161b22';
        ctx.strokeStyle = '#21262d';
        ctx.lineWidth = 1;
        ctx.fillRect(c.x - 30, height - 30, 60, 30);
        ctx.strokeRect(c.x - 30, height - 30, 60, 30);
        
        // City tops
        ctx.fillRect(c.x - 25, height - 45, 15, 15);
        ctx.fillRect(c.x + 5, height - 40, 15, 10);
      } else {
        ctx.fillStyle = '#000';
        ctx.fillRect(c.x - 30, height - 5, 60, 5);
      }
    });

    // Ground line
    ctx.strokeStyle = '#2d333b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(width, height);
    ctx.stroke();

    // Game Over / Success Checks
    if (gameState === 'PLAYING') {
      const allLaunchersDown = stateRef.current.launchers.every(l => l.isDestroyed);
      const allCitiesDown = stateRef.current.cities.every(c => c.isDestroyed);
      if (allLaunchersDown || allCitiesDown) {
        setGameState('GAMEOVER');
      } else if (stateRef.current.score >= PHYSICS.WIN_SCORE) {
        setGameState('SUCCESS');
      }
    }

    if (shake > 0) ctx.restore();

  }, [gameState, shake]);

  useEffect(() => {
    let frameId: number;
    const loop = (time: number) => {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) draw(ctx, time);
      }
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [draw]);

  const t = UI_STRINGS[lang];

  return (
    <div className="relative w-full h-screen overflow-hidden font-display bg-bg-dark select-none touch-none">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onTouchStart={handleClick}
        className="block w-full h-full cursor-crosshair"
      />

      {/* DEFEND Watermark */}
      {gameState === 'PLAYING' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
          <span className="status-bg-text text-white">DEFEND</span>
        </div>
      )}

      {/* HEADER HUD */}
      <div className="absolute top-0 left-0 right-0 p-8 pt-10 pointer-events-none flex justify-between items-start z-10">
        <div className="title-block">
          <h1 className="title-text text-accent-primary text-5xl">
            VICTOR NOVA<br />DEFENSE
          </h1>
          <p className="label-mono text-white/80 mt-2">
            VICTOR 新星防御 // VER. 1.0.4
          </p>
        </div>

        <div className="flex flex-col items-end gap-6">
          <button 
            onClick={() => setLang(l => l === 'en' ? 'zh' : 'en')}
            className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 transition-colors border border-white/20 rounded-sm text-white label-mono"
          >
            <Languages size={14} className="text-accent-primary" />
            <span>{lang === 'en' ? '中文' : 'ENGLISH'}</span>
          </button>

          <div className="stats-block text-right">
            <div className="label-mono opacity-60">TARGET SCORE: {PHYSICS.WIN_SCORE}</div>
            <div className="score-display">
              {score.toString().padStart(4, '0')}
            </div>
            <div className="label-mono opacity-60">CURRENT POINTS / 当前得分</div>
          </div>
        </div>
      </div>

      {/* Overlays */}
      <AnimatePresence>
        {gameState !== 'PLAYING' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-bg-dark/90 backdrop-blur-xl p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-2xl w-full text-center space-y-12"
            >
              {gameState === 'START' && (
                <>
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <h1 className="title-text text-accent-primary text-7xl md:text-9xl">
                      VICTOR NOVA<br />DEFENSE
                    </h1>
                  </motion.div>
                  <p className="text-white/60 text-xl font-mono uppercase tracking-widest max-w-lg mx-auto leading-relaxed">
                    {t.objective}
                  </p>
                  <button
                    onClick={initLevel}
                    className="group relative px-16 py-6 border-2 border-accent-primary text-accent-primary font-display text-2xl tracking-[0.2em] transition-all hover:bg-accent-primary hover:text-bg-dark active:scale-95"
                  >
                    {t.start}
                  </button>
                </>
              )}

              {gameState === 'GAMEOVER' && (
                <>
                  <div className="flex justify-center mb-4">
                    <ShieldAlert size={100} className="text-accent-secondary" />
                  </div>
                  <h2 className="title-text text-accent-secondary text-7xl">{t.gameOver}</h2>
                  <p className="label-mono text-white/60 text-lg">{t.lossMessage}</p>
                  <div className="score-display text-8xl">{score.toString().padStart(4, '0')}</div>
                  <button
                    onClick={initLevel}
                    className="inline-flex items-center gap-4 px-12 py-5 border-2 border-accent-secondary text-accent-secondary hover:bg-accent-secondary hover:text-white transition-all text-xl"
                  >
                    <RotateCcw size={24} />
                    {t.restart}
                  </button>
                </>
              )}

              {gameState === 'SUCCESS' && (
                <>
                  <div className="flex justify-center mb-4 text-accent-warning">
                    <Trophy size={100} />
                  </div>
                  <h2 className="title-text text-accent-warning text-7xl">{t.success}</h2>
                  <p className="label-mono text-white/60 text-lg">{t.winMessage}</p>
                  <div className="score-display text-8xl">{score.toString().padStart(4, '0')}</div>
                  <button
                    onClick={initLevel}
                    className="inline-flex items-center gap-4 px-12 py-5 border-2 border-accent-warning text-accent-warning hover:bg-accent-warning hover:text-bg-dark transition-all text-xl"
                  >
                    <RotateCcw size={24} />
                    {t.restart}
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decorative Scanline Effect */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] z-40 opacity-10" />
    </div>
  );
}

