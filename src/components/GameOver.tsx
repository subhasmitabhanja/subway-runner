import { motion } from 'motion/react';
import { RotateCcw, Home, Skull } from 'lucide-react';

interface GameOverProps {
  score: number;
  highScore: number;
  onRestart: () => void;
  onMenu: () => void;
}

export default function GameOver({ score, highScore, onRestart, onMenu }: GameOverProps) {
  const isNewRecord = score >= highScore && score > 0;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-xl z-50 px-6"
    >
      <div className="relative flex flex-col items-center gap-12 text-center max-w-md w-full">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 20 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="p-8 bg-sky-500/10 rounded-full border border-sky-500/30">
            <Skull size={64} className="text-sky-400" strokeWidth={1} />
          </div>
          <div>
            <h2 className="text-6xl font-black uppercase tracking-tighter text-white">
              Link Lost
            </h2>
            <p className="text-sky-400 font-mono text-[10px] tracking-[0.5em] uppercase mt-2">
              Neural Signal Terminated
            </p>
          </div>
        </motion.div>

        <div className="w-full bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md">
          <div className="flex flex-col items-center mb-10">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] mb-2">Distance Optimized</span>
            <span className="text-7xl font-black text-white tabular-nums tracking-tighter">{score}</span>
            {isNewRecord && (
              <motion.span 
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="mt-4 px-4 py-1 bg-sky-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full"
              >
                Benchmark Exceeded
              </motion.span>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={onRestart}
              className="w-full flex items-center justify-center gap-3 py-5 bg-sky-500 text-white font-black uppercase tracking-widest rounded-full shadow-lg shadow-sky-500/20 hover:bg-sky-400 transition-all active:scale-95"
            >
              <RotateCcw size={18} />
              Re-Initialize
            </button>
            <button
              onClick={onMenu}
              className="w-full flex items-center justify-center gap-3 py-5 bg-slate-900 text-slate-300 font-black uppercase tracking-widest rounded-full border border-slate-800 hover:bg-slate-800 transition-all"
            >
              <Home size={18} />
              Terminal Menu
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
