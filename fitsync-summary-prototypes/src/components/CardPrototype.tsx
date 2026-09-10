import { motion } from 'motion/react';
import React from 'react';
import { Theme, WORKOUT_DATA } from '../data';
import { Dumbbell } from 'lucide-react';

interface CardPrototypeProps {
  theme: Theme;
}

export function CardPrototype({ theme }: CardPrototypeProps) {
  const getThemeClasses = () => {
    switch (theme) {
      case 'carbon':
        return 'bg-zinc-950 text-zinc-300 border-zinc-800';
      case 'ash':
        return 'bg-white text-black border-4 border-black';
      case 'canvas':
        return 'bg-[#F2EFE9] text-[#3D3A35] border-[#E2DED5] shadow-lg';
    }
  };

  const getAccentColor = () => {
    switch (theme) {
      case 'carbon': return 'text-[#00FF66]';
      case 'ash': return 'text-black';
      case 'canvas': return 'text-[#8C4B31]'; // Soft terracotta
    }
  };

  const getGridBlock = (isActive: boolean) => {
    switch (theme) {
      case 'carbon':
        return isActive ? 'bg-[#00FF66] shadow-[0_0_8px_rgba(0,255,102,0.4)]' : 'bg-zinc-800/50';
      case 'ash':
        return isActive ? 'bg-black' : 'border border-zinc-300 bg-white';
      case 'canvas':
        return isActive ? 'bg-[#8A7969]' : 'bg-[#EAE4DC]';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      key={theme}
      // Fixed aspect ratio similar to Instagram portrait (4:5) for easy sharing
      className={`relative w-full max-w-sm aspect-[4/5] p-8 flex flex-col justify-between overflow-hidden border ${getThemeClasses()} transition-colors duration-500`}
    >
      {/* Decorative background noise for Canvas theme */}
      {theme === 'canvas' && (
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/stucco.png")' }}></div>
      )}

      {/* HEADER */}
      <div className="flex justify-between items-start z-10">
        <div className="flex flex-col">
          <span className="font-mono text-xs tracking-widest opacity-60">
            SESSION.
            <span className={getAccentColor()}>{WORKOUT_DATA.sessionNum.toString().padStart(3, '0')}</span>
          </span>
          <span className={`font-display font-medium mt-1 uppercase ${theme === 'ash' ? 'text-2xl tracking-tighter' : 'text-lg tracking-tight'}`}>
            {WORKOUT_DATA.focus.join(' / ')}
          </span>
        </div>
        <div className="text-right flex flex-col items-end">
          <span className="font-mono text-xs tracking-wider opacity-60">{WORKOUT_DATA.date}</span>
          <span className="font-mono text-[10px] tracking-widest opacity-40 uppercase mt-0.5">{WORKOUT_DATA.weekday}</span>
        </div>
      </div>

      {/* CORE METRICS */}
      <div className="z-10 py-8">
        <div className="grid grid-cols-2 gap-y-8 gap-x-4">
          <div className="flex flex-col">
            <span className="font-mono text-[10px] tracking-widest opacity-50 mb-1">VOLUME(KG)</span>
            <span className={`font-display text-4xl font-bold tracking-tighter ${getAccentColor()}`}>
              {WORKOUT_DATA.volume.toLocaleString()}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-[10px] tracking-widest opacity-50 mb-1">TIME(MIN)</span>
            <span className="font-display text-4xl font-bold tracking-tighter">
              {WORKOUT_DATA.duration}
            </span>
          </div>
          <div className="flex flex-col col-span-2">
            <span className="font-mono text-[10px] tracking-widest opacity-50 mb-1">TOTAL SETS</span>
            <span className="font-display text-4xl font-bold tracking-tighter">
              {WORKOUT_DATA.sets}
            </span>
            
            {/* HORIZONTAL CONTINUOUS ACTIVITY GRID */}
            <div className="mt-6 flex flex-col gap-1.5">
              <span className="font-mono text-[8px] tracking-widest opacity-40">ACTIVITY (LAST 28 DAYS)</span>
              <div className="flex flex-row gap-1 w-full">
                {WORKOUT_DATA.historyGrid.map((isActive, i) => (
                  <div 
                    key={i} 
                    className={`h-3 flex-1 rounded-[1px] transition-colors ${getGridBlock(isActive === 1)}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: Branding */}
      <div className="flex items-end justify-between z-10">
        <div className="flex flex-col gap-1 opacity-50">
          <span className="font-mono text-[8px] tracking-widest uppercase">Consistency</span>
          <span className="font-mono text-[8px] tracking-widest uppercase">Is The Key</span>
        </div>

        {/* Logo / Watermark */}
        <div className="flex flex-col items-end opacity-60">
          <Dumbbell className={`w-5 h-5 mb-1 ${theme === 'carbon' ? getAccentColor() : ''}`} />
          <span className="font-display font-semibold text-xs tracking-widest">FitSync</span>
        </div>
      </div>
    </motion.div>
  );
}
