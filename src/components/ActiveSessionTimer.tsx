
import React, { useState, useEffect } from 'react';

interface ActiveSessionTimerProps {
  startTime: any;
  paused?: boolean;
}

export function ActiveSessionTimer({ startTime, paused }: ActiveSessionTimerProps) {
  const [elapsed, setElapsed] = useState<number>(0);

  useEffect(() => {
    if (!startTime || paused) return;

    // Convert Firestore Timestamp to Date if necessary
    const start = startTime?.toDate ? startTime.toDate() : new Date(startTime);
    
    // When unpausing, we might need to adjust start time or just calculate diff?
    // Actually, simple elapsed diff based on start works for "global" time.
    // If it's a "total session time", it usually includes pause? 
    // Usually timer PAUSE means the clock stops ticking.
    // If I want it to stop, I need to track accumulated time.
    
    const updateTime = () => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
      setElapsed(diff > 0 ? diff : 0);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [startTime, paused]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2">
      <span className="tabular-nums font-mono text-sm text-slate-400">
        {formatTime(elapsed)}
      </span>
    </div>
  );
}
