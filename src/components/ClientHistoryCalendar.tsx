
import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  writeBatch, 
  doc,
  Timestamp,
  addDoc,
  getDocs,
  limit
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  ChevronLeft, 
  ChevronRight, 
  Dumbbell, 
  Calendar as CalendarIcon,
  Save,
  CheckCircle2,
  Clock,
  AlertCircle,
  PlusCircle,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { WorkoutSession, ExerciseLog, Machine, Trainer } from '../types';
import { cn } from '../lib/utils';
import { OperationType, handleFirestoreError } from '../lib/firestore-errors';

export function ClientHistoryCalendar({ 
  clientId, 
  machines,
  trainers 
}: { 
  clientId: string, 
  machines: Machine[],
  trainers: Trainer[]
}) {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [viewDate, setViewDate] = useState(new Date()); // For month navigation
  const [viewType, setViewType] = useState<'calendar' | 'list'>('calendar');
  const [selectedDaySessions, setSelectedDaySessions] = useState<WorkoutSession[]>([]);
  const [activeSessionIndex, setActiveSessionIndex] = useState(0);
  const [selectedSessionLogs, setSelectedSessionLogs] = useState<ExerciseLog[]>([]);
  const [editedLogs, setEditedLogs] = useState<Record<string, Partial<ExerciseLog>>>({});
  const [isSaving, setIsSaving] = useState(false);

  const [isEditMode, setIsEditMode] = useState(false);
  const [editedSessionNotes, setEditedSessionNotes] = useState<string>('');
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingSession, setIsDeletingSession] = useState(false);
  const [showManualLog, setShowManualLog] = useState(false);
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualTrainerId, setManualTrainerId] = useState('');

  const selectedSession = selectedDaySessions[activeSessionIndex] || null;

  // Fetch all sessions for calendar
  useEffect(() => {
    if (!clientId) return;
    const q = query(
      collection(db, 'sessions'),
      where('clientId', '==', clientId),
      orderBy('date', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setSessions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkoutSession)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'sessions');
    });
    return () => unsubscribe();
  }, [clientId]);

  // Fetch logs for selected session
  useEffect(() => {
    if (!selectedSession) {
      setSelectedSessionLogs([]);
      setEditedLogs({});
      setIsEditMode(false);
      setEditedSessionNotes('');
      return;
    }
    setEditedSessionNotes(selectedSession.notes || '');
    const q = query(
      collection(db, 'exerciseLogs'),
      where('sessionId', '==', selectedSession.id),
      orderBy('createdAt', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setSelectedSessionLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExerciseLog)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'exerciseLogs');
    });
    return () => unsubscribe();
  }, [selectedSession]);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear();
  };

  const sessionsOnDay = (date: Date) => {
    return sessions.filter(s => {
      const d = new Date(s.date + 'T12:00:00');
      return isSameDay(d, date);
    });
  };

  const handleLogEdit = (logId: string, field: keyof ExerciseLog, value: any) => {
    setEditedLogs(prev => ({
      ...prev,
      [logId]: {
        ...prev[logId],
        [field]: value
      }
    }));
  };

  const handleDeleteSession = async () => {
    if (!selectedSession) return;
    setIsDeletingSession(true);
    try {
      const batch = writeBatch(db);
      const sessionRef = doc(db, 'sessions', selectedSession.id!);
      batch.delete(sessionRef);

      // delete logs
      selectedSessionLogs.forEach(log => {
        batch.delete(doc(db, 'exerciseLogs', log.id!));
      });

      await batch.commit();

      if (selectedDaySessions.length <= 1) {
        setSelectedDaySessions([]);
        setActiveSessionIndex(0);
      } else {
        const newSessions = [...selectedDaySessions];
        newSessions.splice(activeSessionIndex, 1);
        setSelectedDaySessions(newSessions);
        setActiveSessionIndex(Math.max(0, activeSessionIndex - 1));
      }
      setShowDeleteConfirm(false);
      setIsEditMode(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'sessions');
    } finally {
      setIsDeletingSession(false);
    }
  };

  const handleCreateManualLog = async () => {
    setIsSaving(true);
    try {
      const qs = query(collection(db, 'sessions'), where('clientId', '==', clientId), orderBy('date', 'desc'), limit(1));
      const res = await getDocs(qs);
      let sessionNumber = 1;
      if (!res.empty) {
        sessionNumber = res.docs[0].data().sessionNumber + 1;
      }
      const trainer = trainers.find(t => t.id === manualTrainerId);
      
      const newSession: WorkoutSession = {
        clientId,
        date: manualDate,
        sessionType: 'Standard',
        startTime: manualDate + 'T12:00:00.000Z',
        endTime: manualDate + 'T12:30:00.000Z',
        trainerInitials: trainer?.initials || 'TR',
        status: 'Completed',
        sessionNumber,
        notes: "Manually inputted past session.",
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'sessions'), newSession);

      // Create empty logs for their top machines to seed
      const recentLogsQ = query(collection(db, 'exerciseLogs'), where('clientId', '==', clientId), orderBy('date', 'desc'), limit(15));
      const recentLogsRes = await getDocs(recentLogsQ);
      const recentMachineIds = Array.from(new Set(recentLogsRes.docs.map(d => d.data().machineId))).slice(0, 5);

      const batch = writeBatch(db);
      recentMachineIds.forEach(mId => {
         const machine = machines.find(m => m.id === mId);
         if (machine) {
           const logRef = doc(collection(db, 'exerciseLogs'));
           const mockLog: ExerciseLog = {
             clientId,
             sessionId: docRef.id,
             machineId: mId,
             weight: '0',
             reps: '0',
             seconds: '0',
             machineSettings: {},
             createdAt: new Date().toISOString()
           };
           batch.set(logRef, mockLog);
         }
      });
      await batch.commit();

      setShowManualLog(false);
      setManualTrainerId('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'sessions');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBatchUpdate = async () => {
    if (Object.keys(editedLogs).length === 0 && editedSessionNotes === selectedSession?.notes) {
      setIsEditMode(false);
      return;
    }
    setIsSaving(true);
    try {
      const batch = writeBatch(db);
      Object.entries(editedLogs).forEach(([logId, data]) => {
        const logRef = doc(db, 'exerciseLogs', logId);
        batch.update(logRef, {
          ...(data as object),
          updatedAt: Timestamp.now()
        });
      });
      if (selectedSession && editedSessionNotes !== selectedSession.notes) {
        const sessionRef = doc(db, 'sessions', selectedSession.id!);
        batch.update(sessionRef, {
          notes: editedSessionNotes,
          updatedAt: Timestamp.now()
        });
      }
      await batch.commit();
      setEditedLogs({});
      setIsEditMode(false);
      
      // Update local state for immediate feedback
      setSelectedSessionLogs(prev => prev.map(log => {
        if (editedLogs[log.id!]) {
            return { ...log, ...editedLogs[log.id!] };
        }
        return log;
      }));
      
      if (selectedSession) {
         const newSessions = [...selectedDaySessions];
         newSessions[activeSessionIndex] = { ...selectedSession, notes: editedSessionNotes };
         setSelectedDaySessions(newSessions);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'exerciseLogs');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0A2E46] overflow-hidden rounded-[40px] border border-white/10 shadow-2xl p-2 sm:p-6 text-white">
        <div className="flex items-center justify-between mb-8 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#F06C22]/10 rounded-2xl flex items-center justify-center border border-[#F06C22]/20 shadow-[0_0_15px_rgba(240,108,34,0.1)]">
              <CalendarIcon className="w-7 h-7 text-[#F06C22]" />
            </div>
            <div>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none">
                {viewType === 'calendar' ? viewDate.toLocaleString('default', { month: 'long' }) : 'Client History'}
              </h2>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#68717A] mt-1">
                {viewType === 'calendar' ? viewDate.getFullYear() : `${sessions.length} Sessions Total`}
              </p>
            </div>
          </div>
          
          <div className="flex bg-slate-800 p-1 rounded-full border border-slate-700 shadow-sm mx-4">
             <button
                onClick={() => setViewType('calendar')}
                className={cn("px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all", viewType === 'calendar' ? "bg-[#38BDF8] text-white shadow-sm" : "text-slate-400 hover:text-white")}
             >Calendar View</button>
             <button
                onClick={() => setViewType('list')}
                className={cn("px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all", viewType === 'list' ? "bg-[#38BDF8] text-white shadow-sm" : "text-slate-400 hover:text-white")}
             >List View</button>
          </div>

          <div className="flex items-center gap-4">
            <Button 
               onClick={() => setShowManualLog(true)}
               variant="outline" 
               className="border-[#F06C22]/50 text-[#F06C22] hover:bg-[#F06C22]/10 font-black tracking-widest uppercase text-[10px] h-12 rounded-2xl px-6"
             >
               <PlusCircle className="w-4 h-4 mr-2" /> Log Past Session
            </Button>
            {viewType === 'calendar' && (
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="text-[#68717A] hover:text-white hover:bg-white/10 rounded-2xl h-12 w-12 transition-all">
                  <ChevronLeft className="w-8 h-8" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleNextMonth} className="text-[#68717A] hover:text-white hover:bg-white/10 rounded-2xl h-12 w-12 transition-all">
                  <ChevronRight className="w-8 h-8" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {viewType === 'calendar' ? (
          <>
            <div className="grid grid-cols-7 gap-2 mb-2 shrink-0">
              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
                <div key={d} className="text-center pb-2">
                  <span className="text-xs font-black uppercase tracking-widest text-[#68717A]">{d}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2 flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar pb-6">
              {(() => {
                const year = viewDate.getFullYear();
                const month = viewDate.getMonth();
                const firstDay = firstDayOfMonth(year, month);
                const totalDays = daysInMonth(year, month);

                const matrix: (Date | null)[] = [];
                for (let i = 0; i < firstDay; i++) matrix.push(null);
                for (let i = 1; i <= totalDays; i++) matrix.push(new Date(year, month, i));

                return matrix.map((date, idx) => {
                if (!date) return <div key={`empty-${idx}`} className="min-h-[100px]" />;
                
                const daySessions = sessionsOnDay(date);
                const isSelected = selectedSession && isSameDay(new Date(selectedSession.date + 'T12:00:00'), date);
                const today = isSameDay(new Date(), date);

                return (
                  <div 
                    key={idx}
                    onClick={() => {
                      if (daySessions.length > 0) {
                        setSelectedDaySessions(daySessions);
                        setActiveSessionIndex(0);
                      }
                    }}
                    className={cn(
                      "min-h-[100px] p-4 rounded-3xl border transition-all relative group flex flex-col items-center justify-between",
                      daySessions.length > 0 ? "cursor-pointer hover:border-white/30" : "cursor-default",
                      isSelected ? "bg-[#F06C22]/10 border-[#F06C22] shadow-[0_0_30px_rgba(240,108,34,0.15)]" : "bg-white/[0.02] border-white/5 hover:border-white/10",
                      today && !isSelected && "bg-[#115E8D]/10 border-[#115E8D]/30"
                    )}
                  >
                    <span className={cn(
                      "text-xl font-black leading-none",
                      isSelected ? "text-[#F06C22]" : today ? "text-[#38BDF8]" : daySessions.length > 0 ? "text-white" : "text-white/20"
                    )}>
                      {date.getDate()}
                    </span>
                    
                    <div className="flex flex-col gap-1 w-full mt-auto">
                      {daySessions.map((s, sIdx) => (
                        <div 
                          key={s.id || sIdx} 
                          className={cn(
                            "h-6 rounded-xl px-2 flex items-center justify-between border shadow-sm",
                            s.routineName?.toUpperCase().includes('B') 
                              ? "bg-[#F06C22]/20 border-[#F06C22]/30 text-[#F06C22]" 
                              : "bg-[#115E8D]/20 border-[#115E8D]/30 text-[#38BDF8]"
                          )}
                        >
                          <span className="text-[10px] font-black italic">
                            {s.routineName?.toUpperCase().includes('B') ? 'B' : s.routineName?.toUpperCase().includes('A') ? 'A' : 'S'}
                          </span>
                          <span className="text-[9px] font-bold opacity-80">{s.trainerInitials || '--'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              });
              })()}
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 custom-scrollbar flex flex-col gap-4">
            {sessions.map(session => {
               const sDate = new Date(session.date + 'T12:00:00');
               return (
                 <div
                   key={session.id}
                   onClick={() => {
                     setSelectedDaySessions([session]);
                     setActiveSessionIndex(0);
                   }}
                   className="flex items-center gap-6 p-6 rounded-[32px] bg-slate-800 border border-slate-700 cursor-pointer hover:border-white/30 transition-all hover:bg-slate-800/80"
                 >
                   <div className="flex flex-col items-center justify-center min-w-[80px]">
                      <span className="text-3xl font-black text-white">{sDate.getDate()}</span>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{sDate.toLocaleDateString('default', { month: 'short' })} '{sDate.getFullYear().toString().substring(2)}</span>
                   </div>
                   
                   <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center border border-slate-700">
                     <span className="text-sm font-black text-slate-300">{session.trainerInitials || 'TR'}</span>
                   </div>

                   <div className="flex-1">
                      <span className="text-lg font-black text-white uppercase tracking-tighter">
                        {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                        Routine {session.routineName || 'Special'}
                      </p>
                   </div>
                 </div>
               );
            })}
          </div>
        )}

      <Dialog open={!!selectedSession} onOpenChange={(open) => {
        if (!open) {
          setSelectedDaySessions([]);
          setActiveSessionIndex(0);
          setIsEditMode(false);
          setEditedLogs({});
        }
      }}>
        <DialogContent className="max-w-4xl bg-[#0A2E46] border border-[#115E8D]/30 rounded-[40px] p-0 overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
           {selectedDaySessions.length > 1 && (
             <div className="bg-[#0A2E46]/90 backdrop-blur-md border-b border-white/10 px-8 py-4 flex gap-4 shrink-0 overflow-x-auto custom-scrollbar">
                {selectedDaySessions.map((sess, i) => (
                   <button
                     key={sess.id}
                     onClick={() => {
                        setActiveSessionIndex(i);
                        setIsEditMode(false);
                     }}
                     className={cn(
                       "px-6 py-2 rounded-2xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all border",
                       activeSessionIndex === i 
                         ? "bg-[#38BDF8]/20 border-[#38BDF8]/50 text-[#38BDF8]" 
                         : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                     )}
                   >
                      Session {i + 1} - {new Date(sess.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                   </button>
                ))}
             </div>
           )}
          {selectedSession && (
            <>
              <DialogHeader className="p-8 border-b border-white/10 shrink-0 relative overflow-hidden bg-white/5">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Dumbbell className="w-32 h-32 text-white" />
                </div>
                <div className="flex items-center gap-6 relative z-10 w-full pr-40">
                  <div className={cn(
                    "w-16 h-16 rounded-3xl flex flex-col items-center justify-center border-2 shadow-[0_0_30px_rgba(0,0,0,0.2)] shrink-0",
                    selectedSession.routineName?.includes('B') 
                      ? "bg-[#F06C22]/10 border-[#F06C22]/50 text-[#F06C22]" 
                      : "bg-[#38BDF8]/10 border-[#38BDF8]/50 text-[#38BDF8]"
                  )}>
                    <span className="text-2xl font-black italic uppercase leading-none">{selectedSession.routineName?.split(' ')[1] || 'S'}</span>
                    <span className="text-[10px] font-bold opacity-60 mt-1">{selectedSession.trainerInitials}</span>
                  </div>
                  <div className="flex-1">
                    <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter text-white leading-none">
                      {new Date(selectedSession.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </DialogTitle>
                    <DialogDescription className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-2">
                      Routine {selectedSession.routineName || 'Special'} • {selectedSessionLogs.length} Units Logged
                    </DialogDescription>
                  </div>
                </div>

                <div className="absolute right-8 top-1/2 -translate-y-1/2 flex items-center gap-4 z-20">
                  {isEditMode && (
                    <Button
                      variant="ghost" 
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-red-500/50 hover:text-red-500 hover:bg-red-500/10 h-10 w-10 p-0 rounded-xl transition-all shrink-0"
                      title="Delete Session"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!isEditMode) {
                        setEditedSessionNotes(selectedSession.notes || '');
                      } else {
                        setEditedLogs({});
                        setEditedSessionNotes('');
                      }
                      setIsEditMode(!isEditMode);
                    }}
                    className={cn(
                      "font-black uppercase tracking-widest text-xs h-10 px-4 rounded-xl border-white/20 transition-all shrink-0",
                      isEditMode ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
                    )}
                  >
                    {isEditMode ? "Cancel Edit" : "Edit Data"}
                  </Button>
                  {isEditMode && (
                    <Button 
                      onClick={handleBatchUpdate}
                      disabled={isSaving}
                      className="bg-[#F06C22] hover:bg-[#d95d18] text-white font-black uppercase italic text-sm tracking-widest h-10 px-8 rounded-xl shadow-[0_4px_20px_rgba(240,108,34,0.3)] shrink-0"
                    >
                      {isSaving ? "Updating..." : "Save Changes"}
                    </Button>
                  )}
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {selectedSessionLogs.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                      {selectedSessionLogs.map((log) => {
                        const machine = machines.find(m => m.id === log.machineId);
                        const isEdited = !!editedLogs[log.id!];
                        const currentData = { ...log, ...editedLogs[log.id!] };
                        const quality = currentData.repQuality || 0;
                        
                        let borderClass = "border-slate-700 bg-slate-800";
                        if (quality >= 4.5) borderClass = "border-emerald-500 bg-emerald-500/10";
                        else if (quality >= 3) borderClass = "border-amber-500 bg-amber-500/10";
                        else if (quality > 0) borderClass = "border-rose-500 bg-rose-500/10";

                        const isCardio = machine?.name.toLowerCase().includes('cardio') || log.type === 'Cardio';
                        const mainMetric = currentData.weight || '-';
                        const secMetric = isCardio ? currentData.seconds || '-' : currentData.reps || '-';

                        return (
                          <div 
                            key={log.id} 
                            className={cn(
                              "flex flex-col p-3 rounded-2xl transition-all border-2", 
                              borderClass,
                              isEdited && isEditMode ? "shadow-[0_0_20px_rgba(240,108,34,0.2)] ring-1 ring-[#F06C22]/50" : ""
                            )}
                          >
                             {isEditMode ? (
                               <div className="flex flex-col gap-2">
                                  <h4 className="text-xs font-black uppercase tracking-tight text-white leading-none truncate mb-1">{machine?.name || 'Unknown'}</h4>
                                  <div className="grid grid-cols-3 gap-1">
                                    <Input 
                                      type="number"
                                      placeholder={isCardio ? "Sec" : "Wt"}
                                      value={isCardio ? parseFloat(String(currentData.seconds || '').replace(/[^0-9.]/g, '')) || '' : parseFloat(String(currentData.weight || '').replace(/[^0-9.]/g, '')) || ''}
                                      onChange={(e) => handleLogEdit(log.id!, isCardio ? 'seconds' : 'weight', e.target.value)}
                                      className="h-8 border-0 bg-black/30 text-center font-black text-xs text-white focus-visible:ring-1 focus-visible:ring-[#F06C22] p-0 rounded-lg"
                                    />
                                    <Input 
                                      type="number"
                                      placeholder={isCardio ? "Res" : "Rep"}
                                      value={isCardio ? 1 : parseFloat(String(currentData.reps || '').replace(/[^0-9.]/g, '')) || ''}
                                      onChange={(e) => {
                                        if (!isCardio) handleLogEdit(log.id!, 'reps', e.target.value);
                                      }}
                                      disabled={isCardio}
                                      className="h-8 border-0 bg-black/30 text-center font-black text-xs text-white focus-visible:ring-1 focus-visible:ring-[#F06C22] p-0 rounded-lg disabled:opacity-50"
                                    />
                                    <Input 
                                      type="number"
                                      min="0"
                                      max="5"
                                      step="0.5"
                                      placeholder="Qual"
                                      value={currentData.repQuality || ''}
                                      onChange={(e) => handleLogEdit(log.id!, 'repQuality', parseFloat(e.target.value) || 0)}
                                      className="h-8 border-0 bg-black/30 text-center font-black text-xs text-white focus-visible:ring-1 focus-visible:ring-[#F06C22] p-0 rounded-lg"
                                    />
                                  </div>
                               </div>
                             ) : (
                               <>
                                 <h4 className="text-sm font-black uppercase tracking-tight text-white leading-none truncate mb-1">{machine?.name || 'Unknown'}</h4>
                                 <p className="text-xs font-bold text-slate-400">
                                   {mainMetric} lbs | {secMetric} {isCardio ? 'sec' : 'reps'}
                                 </p>
                               </>
                             )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Session Notes Section */}
                    <div className="mt-4 flex flex-col gap-2 p-4 rounded-2xl bg-slate-800 border border-white/10">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#68717A]">Session Notes</h4>
                      {isEditMode ? (
                        <Textarea
                          value={editedSessionNotes}
                          onChange={(e) => setEditedSessionNotes(e.target.value)}
                          placeholder="Add notes about this session..."
                          className="min-h-[80px] bg-slate-900 border-white/10 text-white placeholder:text-slate-500 resize-none focus-visible:ring-1 focus-visible:ring-[#F06C22] font-medium text-sm"
                        />
                      ) : (
                        <div className="min-h-[60px] whitespace-pre-wrap text-slate-300 font-medium text-sm">
                          {selectedSession.notes || <span className="text-slate-500 italic">No notes recorded for this session.</span>}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 opacity-30 text-center gap-6">
                    <Clock className="w-16 h-16 text-white" />
                    <p className="text-lg font-black uppercase tracking-widest text-[#68717A]">No exercise logs found for this session</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-red-500" />
              Delete Session?
            </DialogTitle>
            <DialogDescription className="text-slate-400 font-medium">
              Are you sure you want to permanently delete this session? This action cannot be undone and all associated logs will be lost.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)} className="text-slate-400 hover:text-white uppercase font-black tracking-widest text-xs h-12 rounded-xl px-6">Cancel</Button>
            <Button 
              onClick={handleDeleteSession} 
              disabled={isDeletingSession}
              className="bg-red-500 hover:bg-red-600 text-white uppercase font-black tracking-widest text-xs h-12 rounded-xl px-6 transition-all"
            >
              {isDeletingSession ? "Deleting..." : "Permanently Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Session Log Dialog */}
      <Dialog open={showManualLog} onOpenChange={setShowManualLog}>
        <DialogContent className="max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
              <PlusCircle className="w-6 h-6 text-[#F06C22]" />
              Log Past Session
            </DialogTitle>
            <DialogDescription className="text-slate-400 font-medium">
              Create an empty session backbone to retroactively log exercises.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Session Date</label>
              <Input 
                type="date" 
                value={manualDate} 
                onChange={e => setManualDate(e.target.value)} 
                className="h-12 bg-slate-800 border-slate-700 text-white rounded-xl font-medium"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Assigned Trainer</label>
              <select
                value={manualTrainerId}
                onChange={e => setManualTrainerId(e.target.value)}
                className="w-full h-12 bg-slate-800 border-slate-700 text-white rounded-xl font-medium px-4 focus:ring-1 focus:ring-[#F06C22] outline-none"
              >
                <option value="" disabled>Select Trainer...</option>
                {trainers.map(t => (
                  <option key={t.id} value={t.id}>{t.fullName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4 border-t border-slate-800 pt-6">
            <Button variant="ghost" onClick={() => setShowManualLog(false)} className="text-slate-400 hover:text-white uppercase font-black tracking-widest text-xs h-12 rounded-xl px-6">Cancel</Button>
            <Button 
              onClick={handleCreateManualLog} 
              disabled={isSaving || !manualDate || !manualTrainerId}
              className="bg-[#F06C22] hover:bg-[#d95d18] text-white uppercase font-black tracking-widest text-xs h-12 rounded-xl px-6 transition-all"
            >
              {isSaving ? "Creating..." : "Create Backbone"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
