/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, useCallback, MouseEvent, TouchEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crosshair, Trophy, RotateCcw, ShieldAlert, Languages, FastForward, Volume2, VolumeX, Music } from 'lucide-react';
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
import { COLORS, PHYSICS, UI_STRINGS, LEVEL_OPTS } from './constants';

const MUSIC_URL = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"; // Placeholder for an energetic track

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [gameState, setGameState] = useState<GameState>('START');
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [shake, setShake] = useState(0);
  const [isMuted, setIsMuted] = useState(true);

  // Game loop state refs to avoid re-renders
  const stateRef = useRef({
    rockets: [] as Rocket[],
    interceptors: [] as Rocket[],
    explosions: [] as Explosion[],
    particles: [] as Particle[],
    stars: Array.from({ length: 150 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      z: Math.random() * 1000,
      size: Math.random() * 2,
    })),
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
    level: 1,
  });

  const initLevel = useCallback((lv = 1, keepScore = false) => {
    if (!keepScore) {
      stateRef.current.score = 0;
      setScore(0);
      stateRef.current.cities.forEach(c => c.isDestroyed = false);
    }
    
    // Partially restore cities and launchers each level
    stateRef.current.launchers.forEach(l => {
      l.isDestroyed = false;
      l.ammo = l.maxAmmo;
    });

    stateRef.current.rockets = [];
    stateRef.current.interceptors = [];
    stateRef.current.explosions = [];
    stateRef.current.particles = [];
    stateRef.current.level = lv;
    setLevel(lv);
    
    // Set level difficulty
    const opt = LEVEL_OPTS.find(o => o.level === lv) || LEVEL_OPTS[0];
    stateRef.current.spawnInterval = opt.spawnRate;
    
    setGameState('PLAYING');
  }, []);

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.play().catch(e => console.log("Autoplay blocked", e));
      } else {
        audioRef.current.pause();
      }
      setIsMuted(!isMuted);
    }
  };

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
    if (gameState !== 'PLAYING' || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }

    const clickX = clientX - rect.left;
    const clickY = clientY - rect.top;

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

  const drawLaser = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    vx: number,
    vy: number,
    size = 25
  ) => {
    const angle = Math.atan2(vy, vx);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Outer glow
    ctx.shadowBlur = 15;
    ctx.shadowColor = COLORS.INTERCEPTOR;
    
    // Laser core
    const gradient = ctx.createLinearGradient(-size, 0, 0, 0);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(0.5, COLORS.INTERCEPTOR);
    gradient.addColorStop(1, '#fff');

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-size, 0);
    ctx.lineTo(0, 0);
    ctx.stroke();

    // Pulse effect
    const pulse = (Math.sin(Date.now() / 50) + 1) / 2;
    ctx.lineWidth = 1 + pulse * 2;
    ctx.strokeStyle = '#fff';
    ctx.stroke();

    ctx.restore();
  }, []);

  const drawSoldierTurret = useCallback((
    ctx: CanvasRenderingContext2D,
    l: Launcher,
    height: number
  ) => {
    ctx.save();
    ctx.translate(l.x, height - 10);

    if (l.isDestroyed) {
      // Wreckage
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(-25, -5, 50, 5);
      ctx.restore();
      return;
    }

    // 1. Draw Turret Base (Futuristic Platform)
    ctx.fillStyle = '#2d333b';
    ctx.strokeStyle = COLORS.INTERCEPTOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-35, -15, 70, 15, [5, 5, 0, 0]);
    ctx.fill();
    ctx.stroke();

    // 2. Draw Soldier (Stylized fully armed)
    // Body/Armor
    ctx.fillStyle = '#1c2128';
    ctx.beginPath();
    ctx.roundRect(-12, -35, 12, 20, 3); // Soldier body leaning
    ctx.fill();
    ctx.strokeStyle = '#444c56';
    ctx.stroke();

    // Helmet with glow visor
    ctx.fillStyle = '#1c2128';
    ctx.beginPath();
    ctx.arc(-6, -42, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Visor glow
    ctx.fillStyle = COLORS.INTERCEPTOR;
    ctx.fillRect(-8, -43, 6, 2);

    // 3. The Laser Cannon
    ctx.save();
    // Rotation logic would ideally follow the mouse, but for now we follow general interceptor direction/static
    ctx.translate(0, -30);
    
    // Cannon body
    ctx.fillStyle = '#30363d';
    ctx.beginPath();
    ctx.roundRect(-5, -8, 40, 12, 2);
    ctx.fill();
    ctx.stroke();

    // Cannon energy coils
    ctx.strokeStyle = COLORS.INTERCEPTOR;
    ctx.lineWidth = 1;
    for(let i=0; i<3; i++) {
      ctx.beginPath();
      ctx.moveTo(5 + i*10, -5);
      ctx.lineTo(5 + i*10, 1);
      ctx.stroke();
    }

    // Muzzle glow if firing or just idle
    const pulse = (Math.sin(Date.now() / 100) + 1) / 2;
    ctx.shadowBlur = 5 * pulse;
    ctx.shadowColor = COLORS.INTERCEPTOR;
    ctx.fillStyle = COLORS.INTERCEPTOR;
    ctx.fillRect(35, -4, 4, 4);

    ctx.restore();
    ctx.restore();
  }, []);

  const drawAlienShip = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size = 20
  ) => {
    ctx.save();
    ctx.translate(x, y);
    
    // Add subtle tilt/wobble
    const wobble = Math.sin(Date.now() / 500) * 0.1;
    ctx.rotate(wobble);

    // Glow Effect
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
    glow.addColorStop(0, 'rgba(255, 62, 0, 0.4)');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(-size, -size, size * 2, size * 2);

    // Main Body (Saucer)
    ctx.fillStyle = COLORS.ENEMY;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.8, size * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Glass Dome
    ctx.fillStyle = 'rgba(0, 242, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(0, -size * 0.05, size * 0.3, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 242, 255, 0.8)';
    ctx.stroke();

    // Spinning Lights
    const time = Date.now() / 150;
    for (let i = 0; i < 4; i++) {
      const angle = time + (i * Math.PI / 2);
      const lx = Math.cos(angle) * size * 0.5;
      const ly = Math.sin(angle) * size * 0.05; // Flattened orbit
      
      const brightness = (Math.sin(angle) + 1) / 2;
      ctx.fillStyle = `rgba(255, 204, 0, ${0.4 + brightness * 0.6})`;
      ctx.beginPath();
      ctx.arc(lx, size * 0.08 + ly, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }, []);

  const draw = useCallback((ctx: CanvasRenderingContext2D, time: number) => {
    const { width, height } = ctx.canvas;
    
    // Background space flight animation
    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, width, height);

    // Update and draw stars
    ctx.fillStyle = '#fff';
    const speed = gameState === 'START' ? 8 : 1;
    stateRef.current.stars.forEach(star => {
      // Perspective calculation
      const k = 128 / star.z;
      const x = star.x * k + width / 2;
      const y = star.y * k + height / 2;
      const size = (1 - star.z / 1000) * 2;

      star.z -= speed;
      if (star.z <= 0) {
        star.z = 1000;
        star.x = (Math.random() - 0.5) * width * 2;
        star.y = (Math.random() - 0.5) * height * 2;
      }

      const alpha = 1 - star.z / 1000;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // Background gradient overlay
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, 'rgba(5, 7, 10, 0.4)');
    bgGrad.addColorStop(1, 'rgba(10, 16, 24, 0.8)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    if (shake > 0) {
      ctx.save();
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
      setShake(s => Math.max(0, s - 0.5));
    }

    const currentLevelOpt = LEVEL_OPTS.find(o => o.level === stateRef.current.level) || LEVEL_OPTS[0];

    // Spawn Enemy Rockets
    if (gameState === 'PLAYING') {
      if (time - stateRef.current.lastSpawn > stateRef.current.spawnInterval) {
        const id = Math.random().toString(36).substr(2, 9);
        const startX = Math.random() * width;
        
        // Pick random target among cities and launchers
        const targets = [...stateRef.current.cities, ...stateRef.current.launchers].filter(t => !t.isDestroyed);
        if (targets.length > 0) {
          const target = targets[Math.floor(Math.random() * targets.length)];
          const baseSpeed = PHYSICS.ROCKET_SPEED_RANGE[0] + Math.random() * (PHYSICS.ROCKET_SPEED_RANGE[1] - PHYSICS.ROCKET_SPEED_RANGE[0]);
          stateRef.current.rockets.push({
            id,
            start: { x: startX, y: 0 },
            end: { x: target.x, y: height - 20 },
            pos: { x: startX, y: 0 },
            speed: baseSpeed * currentLevelOpt.speedMult,
            type: 'ENEMY',
            color: COLORS.ENEMY,
          });
          stateRef.current.lastSpawn = time;
          // Ramp up difficulty within level
          stateRef.current.spawnInterval = Math.max(currentLevelOpt.spawnRate / 2, currentLevelOpt.spawnRate - (stateRef.current.score / 500) * 100);
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

      // Draw trail with energy beam style
      const trailGrad = ctx.createLinearGradient(r.start.x, r.start.y, r.pos.x, r.pos.y);
      trailGrad.addColorStop(0, 'transparent');
      trailGrad.addColorStop(1, 'rgba(255, 62, 0, 0.4)');
      
      ctx.beginPath();
      ctx.moveTo(r.start.x, r.start.y);
      ctx.lineTo(r.pos.x, r.pos.y);
      ctx.strokeStyle = trailGrad;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw detailed alien ship shape
      drawAlienShip(ctx, r.pos.x, r.pos.y, 18);

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
      const distToTarget = Math.sqrt((r.pos.x - r.end.x)**2 + (r.pos.y - r.end.y)**2);
      if (distToTarget < r.speed) {
        stateRef.current.explosions.push({
          id: r.id,
          pos: { x: r.end.x, y: r.end.y }, // Snap to exact click point
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

      // Draw laser interceptor shape
      drawLaser(ctx, r.pos.x, r.pos.y, vx, vy, 35);

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

    // Draw Soldier Turrets
    stateRef.current.launchers.forEach(l => {
      drawSoldierTurret(ctx, l, height);
      
      // Ammo grid style dots
      if (!l.isDestroyed) {
        ctx.fillStyle = COLORS.INTERCEPTOR;
        const cols = l.id === 'C' ? 10 : 5;
        const dotSize = 4;
        const gap = 3;
        const startX = l.x - ((cols * (dotSize + gap)) / 2) + gap / 2;
        
        for(let i=0; i<l.ammo; i++) {
          const r = Math.floor(i/cols);
          const c = i % cols;
          ctx.fillRect(startX + c*(dotSize+gap), height - 60 - r*(dotSize+gap), dotSize, dotSize);
        }
      }
    });

    // Draw Earth Bases
    stateRef.current.cities.forEach(c => {
      if (!c.isDestroyed) {
        ctx.fillStyle = '#0d1117';
        ctx.strokeStyle = '#30363d';
        ctx.lineWidth = 1;
        // Base structure
        ctx.beginPath();
        ctx.moveTo(c.x - 25, height);
        ctx.lineTo(c.x - 15, height - 35);
        ctx.lineTo(c.x + 15, height - 35);
        ctx.lineTo(c.x + 25, height);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Energy core pulse
        const pulse = (Math.sin(Date.now() / 200) + 1) / 2;
        ctx.fillStyle = `rgba(0, 242, 255, ${0.2 + pulse * 0.3})`;
        ctx.beginPath();
        ctx.arc(c.x, height - 15, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Signal tower
        ctx.strokeStyle = '#30363d';
        ctx.beginPath();
        ctx.moveTo(c.x, height - 35);
        ctx.lineTo(c.x, height - 50);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#000';
        ctx.fillRect(c.x - 25, height - 5, 50, 5);
      }
    });

    // Ground line
    ctx.strokeStyle = '#2d333b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(width, height);
    ctx.stroke();

    // Game Over / Level Clear / Success Checks
    if (gameState === 'PLAYING') {
      const allLaunchersDown = stateRef.current.launchers.every(l => l.isDestroyed);
      const allCitiesDown = stateRef.current.cities.every(c => c.isDestroyed);
      
      if (allLaunchersDown || allCitiesDown) {
        setGameState('GAMEOVER');
      } else if (stateRef.current.score >= currentLevelOpt.target) {
        if (stateRef.current.level >= LEVEL_OPTS.length) {
          setGameState('SUCCESS');
        } else {
          setGameState('LEVEL_CLEAR');
        }
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
    <div className="relative w-full h-screen overflow-hidden font-display cinematic-bg select-none touch-none">
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

      <audio ref={audioRef} src={MUSIC_URL} loop />

      {/* HEADER HUD */}
      <div className="absolute top-0 left-0 right-0 p-8 pt-10 pointer-events-none flex justify-between items-start z-10">
        <div className="title-block">
          <h1 className="title-text text-accent-primary text-5xl animate-pulse">
            VICTOR EARTH<br />DEFENSE
          </h1>
          <p className="label-mono text-white/80 mt-2">
            VICTOR 地球防御 // VER. 1.0.5
          </p>
        </div>

        <div className="flex flex-col items-end gap-6">
          <div className="flex items-center gap-4 pointer-events-auto">
            <button 
              onClick={toggleMute}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 transition-colors border border-white/20 rounded-sm text-white label-mono"
              title={isMuted ? "Unmute Music" : "Mute Music"}
            >
              {isMuted ? <VolumeX size={14} className="text-accent-secondary" /> : <Volume2 size={14} className="text-accent-primary" />}
              <span>{isMuted ? "OFF" : "ON"}</span>
            </button>
            <div className="flex flex-col items-end">
              <span className="label-mono text-accent-primary text-[10px]">{t.level}</span>
              <span className="text-2xl font-bold text-white leading-none">{level}</span>
            </div>
            <button 
              onClick={() => setLang(l => l === 'en' ? 'zh' : 'en')}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 transition-colors border border-white/20 rounded-sm text-white label-mono"
            >
              <Languages size={14} className="text-accent-primary" />
              <span>{lang === 'en' ? '中文' : 'ENGLISH'}</span>
            </button>
          </div>

          <div className="stats-block text-right">
            <div className="label-mono opacity-60">TARGET: {LEVEL_OPTS.find(o => o.level === level)?.target}</div>
            <div className="score-display">
              {score.toString().padStart(4, '0')}
            </div>
            <div className="label-mono opacity-60">{t.score}</div>
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
                    initial={{ scale: 2, opacity: 0, z: -500 }}
                    animate={{ scale: 1, opacity: 1, z: 0 }}
                    transition={{ 
                      duration: 2.5, 
                      ease: [0.16, 1, 0.3, 1], // Custom cinematic curves
                    }}
                    className="flex flex-col items-center perspective-1000"
                  >
                    <div className="gotg-subtitle mb-4">A MARVELOUS DEFENSE GAME // VOL. 1</div>
                    <h1 
                      className="gotg-title text-8xl md:text-[10rem] title-glow leading-none select-none"
                      data-text="VICTOR EARTH"
                    >
                      VICTOR EARTH
                    </h1>
                    <h1 
                      className="gotg-title text-5xl md:text-7xl title-glow mt-[-1rem] select-none opacity-90"
                      data-text="DEFENSE"
                    >
                      DEFENSE
                    </h1>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 2, duration: 1 }}
                    className="space-y-12 w-full px-4"
                  >
                    <p className="text-accent-primary/80 text-sm md:text-xl font-mono uppercase tracking-[0.1em] md:tracking-[0.3em] max-w-7xl mx-auto leading-relaxed border-y border-accent-primary/20 py-4 whitespace-nowrap overflow-hidden text-ellipsis">
                      {t.objective}
                    </p>
                    <button
                      onClick={() => initLevel(1)}
                      className="group relative px-20 py-5 border border-accent-primary/50 text-accent-primary font-display text-2xl tracking-[0.4em] transition-all hover:bg-accent-primary hover:text-bg-dark active:scale-95 overflow-hidden shadow-[0_0_20px_rgba(0,242,255,0.2)] hover:shadow-[0_0_40px_rgba(0,242,255,0.4)]"
                    >
                      <motion.div 
                        className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-[-20deg]"
                      />
                      {t.start}
                    </button>
                  </motion.div>
                </>
              )}

              {gameState === 'LEVEL_CLEAR' && (
                <>
                  <div className="flex justify-center mb-4 text-accent-primary">
                    <Trophy size={100} />
                  </div>
                  <h2 className="title-text text-accent-primary text-7xl">{t.levelClear}</h2>
                  <p className="label-mono text-white/60 text-lg">{t.levelMessage}</p>
                  <div className="score-display text-8xl">{score.toString().padStart(4, '0')}</div>
                  <button
                    onClick={() => initLevel(level + 1, true)}
                    className="inline-flex items-center gap-4 px-12 py-5 border-2 border-accent-primary text-accent-primary hover:bg-accent-primary hover:text-bg-dark transition-all text-xl"
                  >
                    <FastForward size={24} />
                    {t.nextLevel}
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
                    onClick={() => initLevel(1)}
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
                    onClick={() => initLevel(1)}
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

