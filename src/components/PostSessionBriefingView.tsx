import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Client, WorkoutSession, ExerciseLog, Trainer } from '../types';
import { Activity, Trophy, Clock, Dumbbell, Star, ChevronRight, Check } from 'lucide-react';
import { MACHINE_LIST } from '../data/machine-database';

interface PostSessionBriefingViewProps {
  client: Client;
  session: WorkoutSession;
  logs: ExerciseLog[];
  authTrainer: Trainer | null;
  onFinalize: (postData: { clientFeel: string; noteContent: string; notePriority: 'High' | 'Medium' | 'Low' }) => void;
  isSyncing?: boolean;
}

export function PostSessionBriefingView({
  client,
  session,
  logs,
  authTrainer,
  onFinalize,
  isSyncing
}: PostSessionBriefingViewProps) {
  const [clientFeel, setClientFeel] = useState<string>('Good');
  const [noteContent, setNoteContent] = useState('');
  const [notePriority, setNotePriority] = useState<'High' | 'Medium' | 'Low'>('Medium');

  // Auto-Calculated Data
  const totalTonnage = logs.reduce((acc, log) => {
    if (log.isTSC || log.isStaticHold) return acc;
    const w = parseFloat(log.weight || '0');
    const r = parseFloat(log.reps || '0');
    return acc + (isNaN(w) || isNaN(r) ? 0 : w * r);
  }, 0);

  const totalReps = logs.reduce((acc, log) => {
    if (log.isTSC || log.isStaticHold) return acc;
    const r = parseFloat(log.reps || '0');
    return acc + (isNaN(r) ? 0 : r);
  }, 0);

  const totalTimeUnderLoad = logs.reduce((acc, log) => {
    const s = parseFloat(log.seconds || '0');
    return acc + (isNaN(s) ? 0 : s);
  }, 0);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const eliteSets = logs.filter(l => l.repQuality === 3).length;

  const handleFinalize = () => {
    onFinalize({
      clientFeel,
      noteContent: noteContent.trim(),
      notePriority
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#0A2E46] text-white overflow-hidden absolute inset-0 z-50">
      {/* Header */}
      <div className="px-6 py-8 border-b border-white/5 bg-[#0e171e]">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 text-[#38BDF8] mb-2">
              <Trophy className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Victory HUD</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-black uppercase tracking-tighter">
              Session Complete
            </h2>
            <p className="text-slate-400 font-medium mt-2">
              Great work. Here are {client.firstName}'s numbers for today.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar pb-32">
        {/* Victory Metrics Board */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800 border border-slate-700/50 rounded-3xl p-5 flex flex-col justify-center relative overflow-hidden shadow-lg">
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] rotate-12">
               <Dumbbell className="w-32 h-32 text-white" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#68717A] relative z-10">Total Tonnage</span>
            <span className="text-3xl lg:text-4xl font-black text-[#F06C22] tracking-tighter mt-1 relative z-10">
              {totalTonnage.toLocaleString()}<span className="text-lg text-[#F06C22]/50 ml-1">lbs</span>
            </span>
          </div>

          <div className="bg-slate-800 border border-slate-700/50 rounded-3xl p-5 flex flex-col justify-center relative overflow-hidden shadow-lg">
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] rotate-12">
               <Activity className="w-32 h-32 text-white" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#68717A] relative z-10">Total Reps</span>
            <span className="text-3xl lg:text-4xl font-black text-white tracking-tighter mt-1 relative z-10">
              {totalReps}
            </span>
          </div>

          <div className="bg-slate-800 border border-slate-700/50 rounded-3xl p-5 flex flex-col justify-center relative overflow-hidden shadow-lg">
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] rotate-12">
               <Clock className="w-32 h-32 text-white" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#68717A] relative z-10">Time Under Load</span>
            <span className="text-3xl lg:text-4xl font-black text-[#38BDF8] tracking-tighter mt-1 relative z-10">
              {formatTime(totalTimeUnderLoad)}
            </span>
          </div>

          <div className="bg-slate-800 border border-slate-700/50 rounded-3xl p-5 flex flex-col justify-center relative overflow-hidden shadow-lg">
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] rotate-12">
               <Star className="w-32 h-32 text-white" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#68717A] relative z-10">Elite Sets</span>
            <span className="text-3xl lg:text-4xl font-black text-emerald-500 tracking-tighter mt-1 relative z-10 flex items-baseline gap-1">
              {eliteSets} <span className="text-sm text-emerald-500/50 uppercase tracking-widest">/ {logs.length}</span>
            </span>
          </div>
        </div>

        {/* Clinical Logging Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Client Subjective Feel */}
          <div className="bg-[#0e171e] border border-slate-700/50 rounded-3xl p-6 shadow-lg space-y-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#68717A]">Recovery Tracking</span>
              <h3 className="text-xl font-black text-white mt-1">How does the client feel?</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {['Wiped Out', 'Good', 'Energized'].map(feel => (
                <button
                  key={feel}
                  onClick={() => setClientFeel(feel)}
                  className={`flex-1 py-4 px-6 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${
                    clientFeel === feel 
                      ? 'bg-[#38BDF8] text-[#0A2E46] shadow-[0_0_20px_rgba(56,189,248,0.2)] scale-105' 
                      : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 hover:bg-slate-750'
                  }`}
                >
                  {feel}
                </button>
              ))}
            </div>
          </div>

          {/* Post-Session Notes */}
          <div className="bg-[#0e171e] border border-slate-700/50 rounded-3xl p-6 shadow-lg space-y-4 flex flex-col">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#68717A]">Clinical Log</span>
              <h3 className="text-xl font-black text-white mt-1">Post-Session Notes</h3>
            </div>
            <div className="flex-1 flex flex-col gap-3">
              <Textarea 
                placeholder="Log any closing observations. These will feed into the next Pre-Session Briefing."
                value={noteContent}
                onChange={e => setNoteContent(e.target.value)}
                className="flex-1 bg-slate-900 border-slate-700 text-white resize-none min-h-[100px]"
              />
              <div className="flex items-center gap-3">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400 shrink-0">Priority for Next Time:</span>
                <Select value={notePriority} onValueChange={(v: any) => setNotePriority(v)}>
                  <SelectTrigger className="w-[140px] bg-slate-900 border-slate-700 text-white font-bold h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-white">
                    <SelectItem value="High" className="font-bold text-amber-500">High Priority</SelectItem>
                    <SelectItem value="Medium" className="font-bold">Medium</SelectItem>
                    <SelectItem value="Low" className="font-bold text-slate-400">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="absolute bottom-6 right-6 md:bottom-8 md:right-8 left-6 md:left-auto flex justify-end shrink-0 z-50">
        <Button 
          onClick={handleFinalize}
          disabled={isSyncing}
          className="w-full md:w-auto px-8 md:px-12 h-20 bg-[#F06C22] hover:bg-[#d95d18] text-white rounded-3xl shadow-[0_10px_30px_rgba(240,108,34,0.4)] transition-all font-black uppercase text-sm md:text-lg tracking-[0.2em] flex items-center justify-center gap-3 hover:scale-105 active:scale-95 disabled:hover:scale-100 disabled:opacity-50"
        >
          {isSyncing ? (
            'Syncing...'
          ) : (
            <>
              Finalize Session & Return to Hub
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center ml-2 border border-white/30">
                <ChevronRight className="w-5 h-5 text-white" />
              </div>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
