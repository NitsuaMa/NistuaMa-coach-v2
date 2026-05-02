
import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  writeBatch, 
  doc,
  Timestamp 
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
  AlertCircle
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
  const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null);
  const [selectedSessionLogs, setSelectedSessionLogs] = useState<ExerciseLog[]>([]);
  const [editedLogs, setEditedLogs] = useState<Record<string, Partial<ExerciseLog>>>({});
  const [isSaving, setIsSaving] = useState(false);

  const [isEditMode, setIsEditMode] = useState(false);
  const [editedSessionNotes, setEditedSessionNotes] = useState<string>('');

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

  const handleBatchUpdate = async () => {
    if (Object.keys(editedLogs).length === 0) return;
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
        setSelectedSession(prev => prev ? { ...prev, notes: editedSessionNotes } : null);
      }
      await batch.commit();
      setEditedLogs({});
      setIsEditMode(false);
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
                {viewDate.toLocaleString('default', { month: 'long' })}
              </h2>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#68717A] mt-1">{viewDate.getFullYear()}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="text-[#68717A] hover:text-white hover:bg-white/10 rounded-2xl h-12 w-12 transition-all">
              <ChevronLeft className="w-8 h-8" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleNextMonth} className="text-[#68717A] hover:text-white hover:bg-white/10 rounded-2xl h-12 w-12 transition-all">
              <ChevronRight className="w-8 h-8" />
            </Button>
          </div>
        </div>

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
                    setSelectedSession(daySessions[0]);
                  }
                }}
                className={cn(
                  "min-h-[100px] p-4 rounded-3xl border transition-all relative group flex flex-col items-center justify-between",
                  daySessions.length > 0 ? "cursor-pointer" : "cursor-default",
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

      <Dialog open={!!selectedSession} onOpenChange={(open) => !open && setSelectedSession(null)}>
        <DialogContent className="max-w-4xl bg-[#0A2E46] border border-[#115E8D]/30 rounded-[40px] p-0 overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
          {selectedSession && (
            <>
              <DialogHeader className="p-8 border-b border-white/10 shrink-0 relative overflow-hidden bg-white/5">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Dumbbell className="w-32 h-32 text-white" />
                </div>
                <div className="flex items-center gap-6 relative z-10">
                  <div className={cn(
                    "w-16 h-16 rounded-3xl flex flex-col items-center justify-center border-2 shadow-[0_0_30px_rgba(0,0,0,0.2)]",
                    selectedSession.routineName?.includes('B') 
                      ? "bg-[#F06C22]/10 border-[#F06C22]/50 text-[#F06C22]" 
                      : "bg-[#38BDF8]/10 border-[#38BDF8]/50 text-[#38BDF8]"
                  )}>
                    <span className="text-2xl font-black italic uppercase leading-none">{selectedSession.routineName?.split(' ')[1] || 'S'}</span>
                    <span className="text-[10px] font-bold opacity-60 mt-1">{selectedSession.trainerInitials}</span>
                  </div>
                  <div>
                    <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter text-white leading-none">
                      {new Date(selectedSession.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </DialogTitle>
                    <DialogDescription className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-2">
                      Routine {selectedSession.routineName || 'Special'} • {selectedSessionLogs.length} Units Logged
                    </DialogDescription>
                  </div>
                </div>

                <div className="absolute right-8 top-1/2 -translate-y-1/2 flex items-center gap-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (isEditMode) {
                        setEditedLogs({});
                        setEditedSessionNotes(selectedSession.notes || '');
                      }
                      setIsEditMode(!isEditMode);
                    }}
                    className={cn(
                      "font-black uppercase tracking-widest text-xs h-10 px-4 rounded-xl border-white/20 transition-all",
                      isEditMode ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
                    )}
                  >
                    {isEditMode ? "Cancel Edit" : "Edit Data"}
                  </Button>
                  {isEditMode && (
                    <Button 
                      onClick={handleBatchUpdate}
                      disabled={isSaving}
                      className="bg-[#F06C22] hover:bg-[#d95d18] text-white font-black uppercase italic text-sm tracking-widest h-14 px-8 rounded-2xl shadow-[0_4px_20px_rgba(240,108,34,0.3)]"
                    >
                      {isSaving ? "Updating..." : "Save Changes"}
                    </Button>
                  )}
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {selectedSessionLogs.length > 0 ? (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {selectedSessionLogs.map((log) => {
                        const machine = machines.find(m => m.id === log.machineId);
                        const isEdited = !!editedLogs[log.id!];
                        const currentData = { ...log, ...editedLogs[log.id!] };
                        const quality = currentData.repQuality || 0;
                        
                        let borderClass = "border-white/10";
                        if (quality >= 4.5) borderClass = "border-l-4 border-l-emerald-500 border-white/10";
                        else if (quality >= 3) borderClass = "border-l-4 border-l-amber-500 border-white/10";
                        else if (quality > 0) borderClass = "border-l-4 border-l-rose-500 border-white/10";

                        return (
                          <div 
                            key={log.id} 
                            className={cn(
                              "flex flex-col p-5 rounded-3xl bg-slate-800 transition-all gap-4",
                              borderClass,
                              isEdited && isEditMode ? "shadow-[0_0_20px_rgba(240,108,34,0.1)] ring-1 ring-[#F06C22]/50" : "hover:border-white/20"
                            )}
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                                <Dumbbell className="w-6 h-6 text-white" />
                              </div>
                              <div className="flex-1">
                                <h4 className="text-lg font-black uppercase tracking-tight text-white leading-none mb-1 truncate">{machine?.name || 'Unknown Machine'}</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unit Log Data</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-4 gap-2">
                              <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-black/20 border border-white/5">
                                <span className="text-[9px] font-black uppercase text-slate-500 text-center tracking-widest">Weight</span>
                                {isEditMode ? (
                                  <Input 
                                    value={currentData.weight || ''}
                                    onChange={(e) => handleLogEdit(log.id!, 'weight', e.target.value)}
                                    className="h-10 border-0 bg-transparent text-center font-black text-xl text-white focus-visible:ring-1 focus-visible:ring-[#F06C22] p-0"
                                  />
                                ) : (
                                  <div className="h-10 flex items-center justify-center font-black text-xl text-white">{currentData.weight || '-'}</div>
                                )}
                              </div>
                              <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-black/20 border border-white/5">
                                <span className="text-[9px] font-black uppercase text-slate-500 text-center tracking-widest">Reps</span>
                                {isEditMode ? (
                                  <Input 
                                    value={currentData.reps || ''}
                                    onChange={(e) => handleLogEdit(log.id!, 'reps', e.target.value)}
                                    className="h-10 border-0 bg-transparent text-center font-black text-xl text-white focus-visible:ring-1 focus-visible:ring-[#F06C22] p-0"
                                  />
                                ) : (
                                  <div className="h-10 flex items-center justify-center font-black text-xl text-white">{currentData.reps || '-'}</div>
                                )}
                              </div>
                              <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-black/20 border border-white/5">
                                <span className="text-[9px] font-black uppercase text-slate-500 text-center tracking-widest">Hold/s</span>
                                {isEditMode ? (
                                  <Input 
                                    value={currentData.seconds || ''}
                                    onChange={(e) => handleLogEdit(log.id!, 'seconds', e.target.value)}
                                    className="h-10 border-0 bg-transparent text-center font-black text-xl text-white focus-visible:ring-1 focus-visible:ring-[#F06C22] p-0"
                                  />
                                ) : (
                                  <div className="h-10 flex items-center justify-center font-black text-xl text-white">{currentData.seconds || '-'}</div>
                                )}
                              </div>
                              <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-black/20 border border-white/5">
                                <span className="text-[9px] font-black uppercase text-slate-500 text-center tracking-widest">Quality</span>
                                {isEditMode ? (
                                  <Input 
                                    type="number"
                                    min="0"
                                    max="5"
                                    step="0.5"
                                    value={currentData.repQuality || ''}
                                    onChange={(e) => handleLogEdit(log.id!, 'repQuality', parseFloat(e.target.value) || 0)}
                                    className="h-10 border-0 bg-transparent text-center font-black text-xl text-white focus-visible:ring-1 focus-visible:ring-[#F06C22] p-0"
                                  />
                                ) : (
                                  <div className="h-10 flex items-center justify-center font-black text-xl text-white">{currentData.repQuality || '-'}</div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Session Notes Section */}
                    <div className="mt-8 flex flex-col gap-4 p-6 rounded-3xl bg-slate-800 border border-white/10">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#68717A]">Session Notes</h4>
                      {isEditMode ? (
                        <Textarea
                          value={editedSessionNotes}
                          onChange={(e) => setEditedSessionNotes(e.target.value)}
                          placeholder="Add notes about this session..."
                          className="min-h-[120px] bg-slate-900 border-white/10 text-white placeholder:text-slate-500 resize-none focus-visible:ring-1 focus-visible:ring-[#F06C22] font-medium"
                        />
                      ) : (
                        <div className="min-h-[120px] whitespace-pre-wrap text-slate-300 font-medium">
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
    </div>
  );
}
