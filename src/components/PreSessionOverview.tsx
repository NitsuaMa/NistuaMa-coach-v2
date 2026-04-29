import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Play, 
  History, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  ChevronRight,
  Activity,
  Dumbbell,
  Settings2,
  Check,
  X
} from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MACHINE_LIST } from '../data/machine-database';
import { Client, Machine, ExerciseLog, Routine, WorkoutSession, TrainerFocus, SessionNote } from '../types';

interface PreSessionOverviewProps {
  client: Client;
  targetRoutine: Routine | null;
  lastSession: WorkoutSession | null;
  historicalLifts: Record<string, { last: ExerciseLog; previous: ExerciseLog | null }>;
  onStart: (routineType: 'A' | 'B' | 'Free', customMachines?: string[], note?: string) => void;
  onCancel: () => void;
  routines: Routine[];
  trainerFocuses: TrainerFocus[];
  sessionNotes: SessionNote[];
}

export function PreSessionOverview({ 
  client, 
  targetRoutine, 
  lastSession, 
  historicalLifts, 
  onStart,
  onCancel,
  machines,
  routines,
  trainerFocuses,
  sessionNotes
}: PreSessionOverviewProps & { machines: Machine[] }) {
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [selectedRoutineType, setSelectedRoutineType] = useState<'A' | 'B' | 'Free' | 'Create_B' | 'Create_A'>('A');
  const [adjustedMachineIds, setAdjustedMachineIds] = useState<string[]>([]);
  const [adjustmentNote, setAdjustmentNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const routineA = routines.find(r => r.name.includes('Routine A'));
  const routineB = routines.find(r => r.name.includes('Routine B'));
  
  React.useEffect(() => {
    let type: 'A' | 'B' | 'Free' | 'Create_B' | 'Create_A' = 'Free';
    if (targetRoutine) {
      if (targetRoutine.name.includes('Routine A')) type = 'A';
      else if (targetRoutine.name.includes('Routine B')) type = 'B';
    } else if (routineA) {
      type = 'A';
    }
    
    // If target is B, but B doesn't exist, we must be creating B
    if (type === 'B' && !routineB) {
      type = 'Create_B';
    }

    if (selectedRoutineType !== 'Create_A') {
      setSelectedRoutineType(type);
      if (type === 'Create_B' || type === 'Free') setAdjustedMachineIds([]);
      else setAdjustedMachineIds(targetRoutine?.machineIds || routineA?.machineIds || []);
    }
  }, [targetRoutine, routineA, routineB]);

  const handleStart = () => {
    if (selectedRoutineType === 'Create_B') {
      onStart('B', adjustedMachineIds, adjustmentNote);
    } else {
      onStart(selectedRoutineType, adjustedMachineIds, adjustmentNote);
    }
  };

  const orthopedics = client.medicalHistory;
  const globalNotes = client.globalNotes;
  
  const selectedRoutineIds = selectedRoutineType === 'Create_B' || selectedRoutineType === 'Create_A' || selectedRoutineType === 'Free' 
    ? adjustedMachineIds 
    : (selectedRoutineType === 'A' ? (routineA?.machineIds || []) : (routineB?.machineIds || []));

  return (
    <div className="flex-1 flex flex-col gap-6 p-6 md:p-8 h-full overflow-y-auto bg-[#0A2E46] pb-24 text-[#F8F9FA] relative">
      {/* Header & Main Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#0e171e] p-6 rounded-3xl border border-slate-700/50 shadow-lg relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[#115E8D]/30 rounded-2xl flex items-center justify-center border border-[#38BDF8]/30 shadow-[0_0_15px_rgba(56,189,248,0.15)]">
            <Activity className="w-7 h-7 text-[#38BDF8]" />
          </div>
          <div>
            <h2 className="text-4xl md:text-4xl lg:text-5xl font-black uppercase italic tracking-tighter text-white">
              {client.firstName} {client.lastName}
            </h2>
            <p className="text-[#38BDF8] font-bold text-[10px] md:text-xs uppercase tracking-[0.2em] mt-1">Pre-Session Briefing • Audit Mode</p>
          </div>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Button variant="outline" onClick={onCancel} className="flex-1 md:flex-none rounded-xl font-bold uppercase text-[10px] sm:text-xs tracking-widest px-6 bg-white/5 border-white/10 hover:bg-white/10 text-white transition-all h-14">
            Cancel
          </Button>
          {selectedRoutineType !== 'Create_A' && (
            <Button 
              onClick={handleStart}
              className="flex-1 md:flex-none rounded-xl font-black uppercase text-xs sm:text-sm tracking-widest px-8 bg-[#F06C22] hover:bg-[#d95d18] text-white shadow-[0_4px_20px_rgba(240,108,34,0.4)] gap-2 h-14 transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              {isAdjusting ? 'Start Adjusted Session' : 'Start Session'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        {/* Left Column: Alerts, Stats, Routine Selection */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Tactical Alerts */}
          {(orthopedics || globalNotes || (sessionNotes && sessionNotes.length > 0)) && (
            <div className="space-y-3">
              {orthopedics && (
                <div className="bg-amber-900/30 border-l-[6px] border-amber-500 rounded-r-2xl p-4 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
                     <AlertTriangle className="w-12 h-12 text-amber-500" />
                  </div>
                  <div className="flex items-center gap-2 mb-2 relative z-10">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Orthopedic Reminders</span>
                  </div>
                  <p className="text-xs text-amber-100/90 font-medium leading-relaxed relative z-10">{orthopedics}</p>
                </div>
              )}
              {globalNotes && (
                <div className="bg-blue-900/30 border-l-[6px] border-[#38BDF8] rounded-r-2xl p-4 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
                     <History className="w-12 h-12 text-[#38BDF8]" />
                  </div>
                  <div className="flex items-center gap-2 mb-2 relative z-10">
                    <History className="w-4 h-4 text-[#38BDF8]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#38BDF8]">Relevant Notes</span>
                  </div>
                  <p className="text-xs text-blue-100/90 font-medium leading-relaxed relative z-10">{globalNotes}</p>
                </div>
              )}
              {sessionNotes && sessionNotes.length > 0 && !globalNotes && !orthopedics && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#68717A] mb-2 block">Latest Trainer Note</span>
                  <p className="text-xs text-white/80 italic">"{sessionNotes[0].content}"</p>
                </div>
              )}
            </div>
          )}

          {/* Metric Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#0e171e] border border-slate-700/50 rounded-2xl p-4 flex flex-col justify-center items-center text-center shadow-lg hover:border-[#38BDF8]/30 transition-colors">
              <span className="text-2xl font-black text-white">{Object.keys(historicalLifts).length || '0'}</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-[#68717A] mt-1">Total Machines</span>
            </div>
            <div className="bg-[#0e171e] border border-slate-700/50 rounded-2xl p-4 flex flex-col justify-center items-center text-center shadow-lg hover:border-[#38BDF8]/30 transition-colors">
              <span className="text-2xl font-black text-white">
                {lastSession?.startTime && lastSession?.endTime 
                  ? `${Math.round((lastSession.endTime.toDate().getTime() - lastSession.startTime.toDate().getTime()) / 60000)}m`
                  : 'N/A'}
              </span>
              <span className="text-[9px] font-black uppercase tracking-widest text-[#68717A] mt-1">Avg Time</span>
            </div>
            <div className="bg-[#0e171e] border border-slate-700/50 rounded-2xl p-4 flex flex-col justify-center items-center text-center shadow-lg hover:border-[#38BDF8]/30 transition-colors">
              <span className="text-xl font-black text-white px-1 truncate w-full">
                {Object.values(historicalLifts).reduce((acc, { last }) => acc + (parseFloat(last.weight || '0') * parseInt(last.reps || '0')), 0).toLocaleString()} 
              </span>
              <span className="text-[9px] font-black uppercase tracking-widest text-[#68717A] mt-1">Vol (lbs)</span>
            </div>
          </div>

          {/* Routine Selection Dashboard Feel */}
          <div className="bg-[#0e171e] border border-slate-700/50 rounded-3xl p-5 shadow-lg space-y-4">
             <div>
                <span className="text-[10px] font-black text-[#68717A] uppercase tracking-widest">Sequence Intelligence</span>
                <h3 className="text-xl font-black text-white mt-1">Today's Routine</h3>
             </div>
             
             {/* Styled Tab/Dropdown equivalent */}
             <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => { setSelectedRoutineType('A'); setAdjustedMachineIds(routineA?.machineIds || []); }}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                    selectedRoutineType === 'A' || selectedRoutineType === 'Create_A' ? 'bg-[#38BDF8]/10 border-[#38BDF8]/50 text-[#38BDF8]' : 'bg-white/5 border-white/5 text-[#94A3B8] hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="font-black italic uppercase">Routine A</span>
                </button>
                {routineB || client.isRoutineBActive ? (
                  <button 
                    onClick={() => { setSelectedRoutineType('B'); setAdjustedMachineIds(routineB?.machineIds || []); }}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                      selectedRoutineType === 'B' ? 'bg-[#38BDF8]/10 border-[#38BDF8]/50 text-[#38BDF8]' : 'bg-white/5 border-white/5 text-[#94A3B8] hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="font-black italic uppercase">Routine B</span>
                  </button>
                ) : (
                  <button 
                    onClick={() => { setSelectedRoutineType('Create_B'); setAdjustedMachineIds([]); }}
                    className={`p-3 rounded-xl border border-dashed flex flex-col items-center justify-center text-center transition-all ${
                      selectedRoutineType === 'Create_B' ? 'bg-[#38BDF8]/10 border-[#38BDF8]/50 text-[#38BDF8]' : 'bg-white/5 border-white/10 text-[#94A3B8] hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="font-black italic uppercase">Create B</span>
                  </button>
                )}
                <button 
                  onClick={() => { setSelectedRoutineType('Free'); setAdjustedMachineIds([]); }}
                  className={`p-3 rounded-xl border col-span-2 flex flex-col items-center justify-center text-center transition-all ${
                    selectedRoutineType === 'Free' ? 'bg-[#38BDF8]/10 border-[#38BDF8]/50 text-[#38BDF8]' : 'bg-white/5 border-white/5 text-[#94A3B8] hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="font-black italic uppercase">Open Session (Custom)</span>
                </button>
             </div>

             {(selectedRoutineType === 'Create_B' || selectedRoutineType === 'Create_A' || selectedRoutineType === 'Free') && (
               <div className="space-y-4 pt-4 border-t border-white/10 animate-in slide-in-from-top-2">
                 <div className="space-y-2">
                   <div className="flex items-center justify-between">
                     <Label className="text-[9px] font-black uppercase tracking-widest text-[#68717A]">
                       Adjust Machines
                     </Label>
                     {selectedRoutineType === 'Create_A' && adjustedMachineIds.length > 0 && (
                       <Button 
                         size="sm"
                         disabled={isSaving}
                         onClick={async () => {
                           setIsSaving(true);
                           try {
                             if (routineA && routineA.id) {
                               await updateDoc(doc(db, 'routines', routineA.id), { machineIds: adjustedMachineIds });
                             } else {
                               await addDoc(collection(db, 'routines'), {
                                 clientId: client.id,
                                 name: 'Routine A',
                                 machineIds: adjustedMachineIds,
                                 createdAt: serverTimestamp()
                               });
                             }
                             setSelectedRoutineType('A');
                           } finally {
                             setIsSaving(false);
                           }
                         }}
                         className="bg-[#38BDF8] hover:bg-[#0284c7] text-[#0A2E46] font-black uppercase tracking-widest h-7 text-[9px]"
                       >
                         Confirm Routine A
                       </Button>
                     )}
                   </div>
                   <div className="max-h-[250px] overflow-y-auto pr-2 space-y-2 bg-[#0A2E46]/50 rounded-xl p-3 border border-white/5">
                     {machines.map(m => {
                       const isSelected = adjustedMachineIds.includes(m.id);
                       return (
                         <button
                           key={m.id}
                           onClick={() => {
                             setAdjustedMachineIds(prev => 
                               prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id]
                             );
                           }}
                           className={`w-full flex items-center justify-between p-2.5 rounded-lg border ${
                             isSelected ? 'bg-[#38BDF8]/10 border-[#38BDF8]/30 hover:bg-[#38BDF8]/20' : 'bg-transparent border-transparent hover:bg-white/5'
                           }`}
                         >
                           <span className={`text-[10px] font-black uppercase ${isSelected ? 'text-[#38BDF8]' : 'text-[#94A3B8]'}`}>
                             {m.name}
                           </span>
                           {isSelected && <Check className="w-3.5 h-3.5 text-[#38BDF8]" />}
                         </button>
                       );
                     })}
                   </div>
                 </div>
               </div>
             )}
          </div>
        </div>

        {/* Right Column: Execution List (Routine Overview) */}
        <div className="lg:col-span-8">
           <div className="bg-[#0e171e] border border-slate-700/50 rounded-3xl p-6 shadow-lg h-full flex flex-col max-h-[800px]">
              <div className="mb-6 flex items-center justify-between shrink-0">
                 <div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-[#68717A]">Execution List</span>
                   <h3 className="text-2xl font-black text-white mt-1">Routine Overview</h3>
                 </div>
                 <Badge className="bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/30 uppercase font-black tracking-widest text-[9px] flex items-center gap-1.5 px-3 py-1">
                   <Dumbbell className="w-3 h-3" />
                   {selectedRoutineIds.length} Machines
                 </Badge>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                 {selectedRoutineType === 'A' && (!routineA || (routineA.machineIds || []).length === 0) ? (
                   <div className="flex flex-col items-center justify-center p-12 h-full border-[3px] border-dashed border-slate-600 rounded-3xl bg-[#0A2E46]/30">
                     <Dumbbell className="w-14 h-14 text-slate-500 mb-5" />
                     <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400 mb-8 text-center max-w-[200px] leading-relaxed">Client lacks an established A Routine</p>
                     <Button 
                       onClick={() => { setSelectedRoutineType('Create_A'); setAdjustedMachineIds([]); }}
                       className="bg-[#F06C22] hover:bg-[#d95d18] text-white font-black uppercase text-xs tracking-widest px-8 py-6 rounded-xl shadow-[0_4px_20px_rgba(240,108,34,0.4)] transition-all flex items-center gap-2"
                     >
                       <Settings2 className="w-4 h-4" />
                       Initialize A Routine
                     </Button>
                   </div>
                 ) : selectedRoutineType === 'Create_A' && selectedRoutineIds.length === 0 ? (
                   <div className="flex flex-col items-center justify-center p-12 h-full opacity-50">
                     <Dumbbell className="w-12 h-12 text-[#68717A] mb-4" />
                     <p className="text-xs font-black uppercase tracking-widest text-[#68717A] text-center max-w-[200px]">Add machines from the sequence intelligence selector</p>
                   </div>
                 ) : selectedRoutineIds.length === 0 ? (
                   <div className="flex flex-col items-center justify-center p-12 h-full opacity-50">
                     <Dumbbell className="w-12 h-12 text-[#68717A] mb-4" />
                     <p className="text-xs font-black uppercase tracking-widest text-[#68717A]">No machines selected</p>
                   </div>
                 ) : (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
                     {selectedRoutineIds.map((mId, index) => {
                       const machine = machines.find(m => m.id === mId);
                       const knowledge = MACHINE_LIST.find(k => k.id === mId) || MACHINE_LIST.find(k => k.name === machine?.name);
                       
                       return (
                         <div key={mId} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3 group hover:border-[#38BDF8]/30 hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-lg bg-[#0A2E46] border border-white/10 flex items-center justify-center shrink-0 shadow-sm">
                                 <span className="text-[#38BDF8] font-black text-[10px]">{index + 1}</span>
                              </div>
                              <h4 className="text-sm font-black uppercase text-white truncate group-hover:text-[#38BDF8] transition-colors">{machine?.name || mId}</h4>
                            </div>
                            
                            {(knowledge?.setup || knowledge?.execution) && (
                              <div className="flex flex-col gap-1.5 mt-auto">
                                {knowledge?.setup && (
                                  <div className="bg-[#0A2E46] px-2.5 py-2 rounded-lg border border-white/5 flex gap-2 items-center">
                                     <span className="text-[8px] font-black uppercase tracking-widest text-[#68717A] shrink-0 min-w-[36px]">Setup</span>
                                     <span className="text-[10px] text-white/90 font-medium truncate">{knowledge.setup}</span>
                                  </div>
                                )}
                                {knowledge?.execution && (
                                  <div className="bg-[#0A2E46] px-2.5 py-2 rounded-lg border border-white/5 flex gap-2 items-center">
                                     <span className="text-[8px] font-black uppercase tracking-widest text-[#68717A] shrink-0 min-w-[36px]">Turn</span>
                                     <span className="text-[10px] text-white/90 font-medium truncate">{knowledge.execution}</span>
                                  </div>
                                )}
                              </div>
                            )}
                         </div>
                       );
                     })}
                   </div>
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

const Zap = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    stroke="none" 
    className={className}
  >
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
  </svg>
);
