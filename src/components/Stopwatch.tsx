
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Stopwatch({ 
  initialValue = 0, 
  onLogTSC
}: { 
  initialValue?: number, 
  onLogTSC?: (seconds: number) => void 
}) {
  const [time, setTime] = useState(initialValue);
  const [isActive, setIsActive] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive]);

  const toggle = () => setIsActive(!isActive);

  const reset = () => {
    setIsActive(false);
    setTime(0);
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-900 border-t border-slate-800 p-4 shadow-2xl flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] leading-none mb-1">Workout Timer</span>
          <span className="text-3xl font-black italic tracking-tighter text-white font-mono tabular-nums leading-none">
            {formatTime(time)}
          </span>
        </div>
        
        <div className="h-10 w-[1px] bg-slate-800 mx-2" />

        <div className="flex gap-2">
          <Button 
            size="sm" 
            className={`h-10 px-6 rounded-xl font-black uppercase italic tracking-wider transition-all duration-300 ${isActive ? 'bg-slate-700 hover:bg-slate-600' : 'bg-[#F06C22] hover:bg-[#F06C22]/90 shadow-[0_0_15px_rgba(240,108,34,0.3)]'}`}
            onClick={toggle}
          >
            {isActive ? (
              <><Pause className="w-4 h-4 mr-2" /> Pause</>
            ) : (
              <><Play className="w-4 h-4 mr-2 fill-current" /> Start</>
            )}
          </Button>

          <Button 
            size="icon" 
            variant="outline" 
            className="h-10 w-10 rounded-xl border-slate-700 hover:bg-slate-800 text-slate-400"
            onClick={reset}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {onLogTSC && (
        <Button 
          onClick={() => {
            onLogTSC(time);
            setIsActive(false);
          }}
          className="bg-primary text-white font-black uppercase italic tracking-wider px-6 h-10 rounded-xl shadow-[0_0_20px_rgba(var(--primary),0.3)] animate-pulse hover:animate-none"
        >
          <Timer className="w-4 h-4 mr-2" />
          Log as TSC
        </Button>
      )}
    </div>
  );
}
