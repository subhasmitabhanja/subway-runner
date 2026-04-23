import { motion } from 'motion/react';
import { Play, Trophy, Zap } from 'lucide-react';

interface MenuProps {
  onStart: () => void;
  highScore: number;
}

export default function Menu({ onStart, highScore }: MenuProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950"
    >
      {/* Background Graphic Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-black" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] opacity-10">
          <div className="w-full h-full bg-[radial-gradient(circle_at_center,_#38bdf8_0%,_transparent_70%)] blur-3xl animate-pulse" />
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-12">
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <div className="text-sky-400 text-xs font-bold uppercase tracking-[0.4em] mb-4">Neural Link Established</div>
          <h1 className="text-8xl md:text-9xl font-black tracking-tighter text-white uppercase leading-none">
            Cyber<br /><span className="text-sky-500">Runner</span>
          </h1>
          <div className="mt-6 h-1 w-24 bg-sky-500 mx-auto" />
        </motion.div>

        <div className="flex flex-col items-center gap-6 w-full max-w-sm">
          <button
            onClick={onStart}
            className="group relative w-full py-6 bg-sky-500 text-white font-black text-xl uppercase tracking-[0.2em] rounded-full shadow-[0_0_30px_rgba(14,165,233,0.4)] hover:bg-sky-400 transition-all active:scale-95"
          >
            <div className="relative z-10 flex items-center justify-center gap-3">
              <Play size={20} fill="white" />
              Initialize Run
            </div>
          </button>

          {highScore > 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="px-6 py-3 bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-full flex items-center gap-3"
            >
              <Trophy size={16} className="text-yellow-400" />
              <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Personal Best</span>
              <span className="text-white font-black tabular-nums">{highScore}</span>
            </motion.div>
          )}

          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.3em] animate-pulse mt-4">
            Tap anywhere to interface
          </div>
        </div>
      </div>

      <div className="absolute bottom-12 left-12 right-12 flex justify-between items-end">
        <div className="text-[10px] font-mono text-slate-600 uppercase tracking-[0.5em] leading-relaxed">
          System: Active<br />Zone: Industrial Sector 7<br />Uplink: Secure
        </div>
        <div className="flex gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="w-1 h-1 bg-sky-500/30 rounded-full" />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
