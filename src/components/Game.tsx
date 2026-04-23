import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { Coins, Zap } from 'lucide-react';
import { 
  LANE_WIDTH, 
  LANES, 
  WORLD_SPEED, 
  MAX_Z, 
  GRAVITY, 
  JUMP_FORCE, 
  SLIDE_DURATION, 
  PLAYER_DEPTH,
  COLORS 
} from '../constants';
import { Player, Obstacle, Coin, GameStats } from '../types';

interface GameProps {
  onGameOver: (score: number) => void;
}

export default function Game({ onGameOver }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Game State Refs (to avoid re-renders in game loop)
  const playerRef = useRef<Player>({
    lane: 0,
    y: 0,
    isJumping: false,
    isSliding: false,
    slideTimer: 0,
    jumpVelocity: 0
  });
  
  const targetLaneRef = useRef(0);
  const visualLaneRef = useRef(0); // For smooth transition
  
  const obstaclesRef = useRef<Obstacle[]>([]);
  const coinsRef = useRef<Coin[]>([]);
  const particlesRef = useRef<{x: number, y: number, vx: number, vy: number, life: number}[]>([]);
  const statsRef = useRef<GameStats>({
    score: 0,
    distance: 0,
    coins: 0,
    multiplier: 1
  });

  const frameCountRef = useRef(0);
  const [uiStats, setUiStats] = useState<GameStats>({ score: 0, distance: 0, coins: 0, multiplier: 1 });
  const isGameOverRef = useRef(false);

  // Responsive Canvas Sizing
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Controls
  useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGameOverRef.current) return;

      const player = playerRef.current;
      
      switch (e.key) {
        case 'ArrowLeft':
          targetLaneRef.current = Math.max(-1, targetLaneRef.current - 1);
          break;
        case 'ArrowRight':
          targetLaneRef.current = Math.min(1, targetLaneRef.current + 1);
          break;
        case 'ArrowUp':
          if (!player.isJumping) {
            player.isJumping = true;
            player.jumpVelocity = JUMP_FORCE;
            player.isSliding = false; 
          }
          break;
        case 'ArrowDown':
          if (player.isJumping) {
            player.jumpVelocity = -JUMP_FORCE; 
          } else {
            player.isSliding = true;
            player.slideTimer = SLIDE_DURATION;
          }
          break;
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (isGameOverRef.current) return;
      
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      
      const dx = touchEndX - touchStartX;
      const dy = touchEndY - touchStartY;
      
      const player = playerRef.current;

      if (Math.abs(dx) > Math.abs(dy)) {
        if (Math.abs(dx) > 30) {
          if (dx > 0) targetLaneRef.current = Math.min(1, targetLaneRef.current + 1);
          else targetLaneRef.current = Math.max(-1, targetLaneRef.current - 1);
        }
      } else {
        if (Math.abs(dy) > 30) {
          if (dy < 0) { // Swipe Up
            if (!player.isJumping) {
              player.isJumping = true;
              player.jumpVelocity = JUMP_FORCE;
              player.isSliding = false;
            }
          } else { // Swipe Down
            if (player.isJumping) player.jumpVelocity = -JUMP_FORCE;
            else {
              player.isSliding = true;
              player.slideTimer = SLIDE_DURATION;
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  // Helper for 3D Projection
  const project = (x: number, y: number, z: number, width: number, height: number) => {
    const fov = height * 0.8;
    const centerX = width / 2;
    const centerY = height * 0.6; // Horizon placement

    // We want the road to narrow into the distance
    // Scale factor: 1/z (roughly)
    const scale = fov / (z + 1); 
    const px = centerX + x * scale;
    const py = centerY - y * scale;
    
    return { x: px, y: py, scale };
  };

  const spawnObstacle = useCallback(() => {
    const lane = LANES[Math.floor(Math.random() * LANES.length)];
    const id = Math.random().toString(36).substr(2, 9);
    
    // Weighted random for type
    const rand = Math.random();
    let type: Obstacle['type'] = 'barrier';
    let height = 1.5;

    if (rand > 0.7) {
      type = 'train';
      height = 4;
    } else if (rand > 0.4) {
      type = 'barrier';
      height = 1.5;
    } else {
      type = 'ramp';
      height = 0.5;
    }

    obstaclesRef.current.push({ id, lane, z: MAX_Z, type, height });
  }, []);

  const spawnCoin = useCallback(() => {
    const lane = LANES[Math.floor(Math.random() * LANES.length)];
    const id = Math.random().toString(36).substr(2, 9);
    coinsRef.current.push({ id, lane, z: MAX_Z, collected: false });
  }, []);

  // Main Loop
  useEffect(() => {
    let animationFrameId: number;

    const loop = () => {
      if (isGameOverRef.current) return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      // --- 1. Update Logic ---
      frameCountRef.current++;
      
      const player = playerRef.current;
      const stats = statsRef.current;

      // Update Visual Lane (Smooth)
      visualLaneRef.current += (targetLaneRef.current - visualLaneRef.current) * 0.2;
      player.lane = Math.round(visualLaneRef.current);

      // Jump Physics
      if (player.isJumping) {
        player.y += player.jumpVelocity;
        player.jumpVelocity += GRAVITY;
        if (player.y <= 0) {
          player.y = 0;
          player.isJumping = false;
          player.jumpVelocity = 0;
        }
      }

      // Slide Timer
      if (player.isSliding) {
        player.slideTimer--;
        if (player.slideTimer <= 0) {
          player.isSliding = false;
        }
      }

      // Update Obstacles & Coins
      const currentSpeed = WORLD_SPEED + (stats.distance / 5000); // Gradual speed increase
      
      obstaclesRef.current.forEach(obs => { obs.z -= currentSpeed; });
      coinsRef.current.forEach(coin => { coin.z -= currentSpeed; });

      // Collision Detection
      obstaclesRef.current.forEach(obs => {
        // Simple bounding box collision
        // Obstacle reaches player at z = PLAYER_DEPTH
        if (Math.abs(obs.z - PLAYER_DEPTH) < 1) {
          if (obs.lane === targetLaneRef.current) {
            // Collision check based on height/jump
            const playerBottom = player.y;
            const playerTop = player.y + (player.isSliding ? 1 : 2);
            
            const obstacleBottom = 0;
            const obstacleTop = obs.height;

            // Simplified: if barrier and not jumping -> crash
            // If train and not on top -> crash
            if (obs.type === 'barrier' && !player.isJumping) {
               isGameOverRef.current = true;
            } else if (obs.type === 'train' && player.y < obs.height) {
               isGameOverRef.current = true;
            } else if (obs.type === 'ramp') {
               // Ramp logic: if we hit it, boost jump?
               if (!player.isJumping) {
                 player.isJumping = true;
                 player.jumpVelocity = JUMP_FORCE * 1.5;
               }
            }
          }
        }
      });

      // Coin Collection
      coinsRef.current.forEach(coin => {
        if (!coin.collected && Math.abs(coin.z - PLAYER_DEPTH) < 2 && coin.lane === targetLaneRef.current) {
          if (player.y < 3) { // Must be low enough to grab
            coin.collected = true;
            stats.coins++;
            stats.score += 10 * stats.multiplier;
            
            // Emit Particles
            const pos = project(coin.lane * LANE_WIDTH, 1, coin.z, width, height);
            for(let i=0; i<8; i++) {
               particlesRef.current.push({
                  x: pos.x,
                  y: pos.y,
                  vx: (Math.random() - 0.5) * 10,
                  vy: (Math.random() - 0.5) * 10,
                  life: 1.0
               });
            }
          }
        }
      });

      // Update Particles
      particlesRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2; // Gravity
        p.life -= 0.02;
      });
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);

      // Cleanup
      obstaclesRef.current = obstaclesRef.current.filter(obs => obs.z > -10);
      coinsRef.current = coinsRef.current.filter(coin => !coin.collected && coin.z > -10);

      // Spawning
      if (frameCountRef.current % Math.floor(60 / (currentSpeed * 2)) === 0) {
        spawnObstacle();
      }
      if (frameCountRef.current % 40 === 0) {
        spawnCoin();
      }

      // Score
      stats.distance += Math.floor(currentSpeed * 10);
      stats.score = stats.distance + (stats.coins * 50);

      // --- 2. Render ---
      ctx.fillStyle = COLORS.DARK_BG;
      ctx.fillRect(0, 0, width, height);

      // Draw Background Buildings
      ctx.fillStyle = '#050505';
      const buildingWidth = width / 6;
      for (let i = 0; i < 7; i++) {
        const bHeight = 100 + (Math.sin(i * 1.5 + frameCountRef.current * 0.001) * 50 + 50);
        ctx.fillRect(i * buildingWidth - 50, height * 0.6 - bHeight, buildingWidth * 0.8, bHeight);
        // Neon windows on buildings
        ctx.fillStyle = i % 2 === 0 ? COLORS.NEON_PINK + '11' : COLORS.NEON_CYAN + '11';
        for(let j=0; j<5; j++) {
           ctx.fillRect(i * buildingWidth - 30, height * 0.6 - bHeight + 20 + j*30, 10, 10);
        }
        ctx.fillStyle = '#111';
      }

      // Draw Grid/Road
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 2;
      
      // Horizontal Lines (Movement feedback)
      const lineSpacing = 10;
      const offset = (frameCountRef.current * currentSpeed * 2) % lineSpacing;
      for (let z = MAX_Z; z >= 0; z -= lineSpacing) {
        const zz = z - offset;
        if (zz < 0) continue;
        const p1 = project(-5, 0, zz, width, height);
        const p2 = project(5, 0, zz, width, height);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }

      // Lane Borders
      LANES.forEach(l => {
        const p_left = project((l - 0.5) * LANE_WIDTH, 0, 0, width, height);
        const p_right = project((l + 0.5) * LANE_WIDTH, 0, 0, width, height);
        const h_left = project((l - 0.5) * LANE_WIDTH, 0, MAX_Z, width, height);
        const h_right = project((l + 0.5) * LANE_WIDTH, 0, MAX_Z, width, height);

        ctx.strokeStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.moveTo(p_left.x, p_left.y); ctx.lineTo(h_left.x, h_left.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(p_right.x, p_right.y); ctx.lineTo(h_right.x, h_right.y);
        ctx.stroke();
        
        // Neon highlights on center lane
        if (l === 0) {
          ctx.strokeStyle = COLORS.NEON_CYAN + '33';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p_left.x, p_left.y); ctx.lineTo(h_left.x, h_left.y);
          ctx.stroke();
        }
      });

      // Draw Coins (Draw further first)
      coinsRef.current.sort((a, b) => b.z - a.z).forEach(coin => {
        const pos = project(coin.lane * LANE_WIDTH, 1, coin.z, width, height);
        const rad = 10 * pos.scale;
        
        ctx.fillStyle = COLORS.COIN_GOLD;
        ctx.shadowBlur = 10;
        ctx.shadowColor = COLORS.COIN_GOLD;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, rad, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Draw Obstacles
      obstaclesRef.current.sort((a, b) => b.z - a.z).forEach(obs => {
        const bottom = project(obs.lane * LANE_WIDTH, 0, obs.z, width, height);
        const top = project(obs.lane * LANE_WIDTH, obs.height, obs.z, width, height);
        
        const w = (LANE_WIDTH * 0.8) * bottom.scale;
        const h = bottom.y - top.y;

        if (obs.type === 'train') {
          // Draw Train Body
          ctx.fillStyle = COLORS.TRAIN_BODY;
          ctx.fillRect(top.x - w/2, top.y, w, h);
          // Neon Detail
          ctx.strokeStyle = COLORS.NEON_PINK;
          ctx.lineWidth = 2;
          ctx.strokeRect(top.x - w/2, top.y, w, h);
          // Windows
          ctx.fillStyle = COLORS.NEON_CYAN + '66';
          for(let i=0; i<4; i++) {
             ctx.fillRect(top.x - w/2.5, top.y + (h/5) * (i+1), w/1.2, h/10);
          }
        } else if (obs.type === 'barrier') {
          ctx.fillStyle = '#444';
          ctx.fillRect(top.x - w/2, top.y, w, h);
          ctx.strokeStyle = '#ffae00';
          ctx.lineWidth = 4;
          ctx.strokeRect(top.x - w/2, top.y, w, h);
        } else if (obs.type === 'ramp') {
          ctx.fillStyle = '#333';
          ctx.beginPath();
          ctx.moveTo(bottom.x - w/2, bottom.y);
          ctx.lineTo(bottom.x + w/2, bottom.y);
          // Ramp slopes up towards player? No, slopes down away
          // Actually simpler to just draw a block for now or a wedge
          const far = project(obs.lane * LANE_WIDTH, obs.height, obs.z + 5, width, height);
          ctx.lineTo(far.x + w/2, far.y);
          ctx.lineTo(far.x - w/2, far.y);
          ctx.closePath();
          ctx.fill();
        }
      });

      // Draw Player
      const playerPos = project(visualLaneRef.current * LANE_WIDTH, player.y, PLAYER_DEPTH, width, height);
      const playerW = 30 * playerPos.scale;
      const playerH = (player.isSliding ? 30 : 60) * playerPos.scale;

      // Glow
      ctx.shadowBlur = 20;
      ctx.shadowColor = COLORS.NEON_CYAN;
      ctx.fillStyle = player.isSliding ? COLORS.NEON_PINK : COLORS.NEON_CYAN;
      
      // Draw a simple "Cyber Runner" silhouette
      ctx.beginPath();
      if (player.isSliding) {
        ctx.ellipse(playerPos.x, playerPos.y - playerH/2, playerW, playerH/2, 0, 0, Math.PI * 2);
      } else {
        ctx.roundRect(playerPos.x - playerW/2, playerPos.y - playerH, playerW, playerH, 10);
      }
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw Particles
      particlesRef.current.forEach(p => {
        ctx.fillStyle = `rgba(255, 215, 0, ${p.life})`;
        ctx.fillRect(p.x, p.y, 2, 2);
      });

      // Update UI (Throttle state updates)
      if (frameCountRef.current % 10 === 0) {
        setUiStats({ ...stats });
      }

      if (isGameOverRef.current) {
        onGameOver(stats.score);
      } else {
        animationFrameId = requestAnimationFrame(loop);
      }
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [onGameOver, spawnObstacle, spawnCoin]);

  return (
    <div ref={containerRef} className="relative w-full h-full cursor-none">
      <canvas ref={canvasRef} className="w-full h-full" />
      
      {/* UI Overlay */}
      <div className="absolute top-0 left-0 right-0 p-8 flex justify-between items-start pointer-events-none">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-4 bg-slate-900/80 backdrop-blur-md border border-slate-700 px-5 py-2.5 rounded-full shadow-lg">
             <div className="w-6 h-6 bg-yellow-400 rounded-full border-2 border-white shadow-[0_0_10px_#facc15] flex items-center justify-center text-[10px] text-yellow-900 font-bold">$</div>
             <div className="text-2xl font-black tracking-tight text-white tabular-nums">
               {uiStats.coins}
             </div>
          </div>
          <div className="flex items-center gap-4 bg-sky-500/20 backdrop-blur-md border border-sky-500/50 px-5 py-2.5 rounded-full shadow-lg">
              <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-sky-400">Multiplier</span>
              <span className="text-xl font-black text-white tabular-nums">x{uiStats.multiplier}</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
           <div className="text-sky-400 text-[10px] font-bold uppercase tracking-[0.3em] mb-1">System Distance</div>
           <div className="bg-white/10 backdrop-blur-xl border border-white/20 px-8 py-5 rounded-3xl shadow-2xl">
              <div className="text-5xl font-black text-white tabular-nums tracking-tighter">
                {uiStats.score.toLocaleString()}
              </div>
           </div>
        </div>
      </div>

      {/* Side Mission Panel */}
      <div className="absolute left-8 top-[180px] w-56 pointer-events-none hidden md:block">
        <div className="bg-slate-900/40 p-5 rounded-3xl border border-slate-800 backdrop-blur-sm shadow-xl">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-5">Primary Directives</h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-[10px] mb-2 font-bold uppercase tracking-widest">
                <span className="text-slate-400 italic">Sector Progress</span>
                <span className="text-sky-400">{Math.min(100, Math.floor(uiStats.distance / 50))}%</span>
              </div>
              <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-sky-500 transition-all duration-300" 
                  style={{ width: `${Math.min(100, Math.floor(uiStats.distance / 50))}%` }} 
                />
              </div>
            </div>
            <div className="text-[9px] font-mono text-slate-500 uppercase leading-relaxed">
              Environment: Variable<br />Threat Level: High
            </div>
          </div>
        </div>
      </div>

      {/* Control Tips (Mobile/Desktop) */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 px-8 py-3 bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-full flex gap-10 shadow-2xl">
        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
           <span className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sky-400">INTERFACE</span>
           MOVE / ACTIONS
        </div>
      </div>

      {/* Speed Lines Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
         <div className="w-full h-full bg-[radial-gradient(circle_at_center,_transparent_0%,_#000_100%)]" />
      </div>
    </div>
  );
}
