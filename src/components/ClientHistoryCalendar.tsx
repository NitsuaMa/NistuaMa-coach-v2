
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
      return;
    }
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
          ...data,
          updatedAt: Timestamp.now()
        });
      });
      await batch.commit();
      setEditedLogs({});
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'exerciseLogs');
    } finally {
      setIsSaving(false);
    }
  };

  const renderCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = firstDayOfMonth(year, month);
    const totalDays = daysInMonth(year, month);
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    const matrix: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) matrix.push(null);
    for (let i = 1; i <= totalDays; i++) matrix.push(new Date(year, month, i));

    return (
      <div className="flex flex-col h-full bg-[#0A2E46] p-6 text-white overflow-hidden">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#F06C22]/10 rounded-2xl flex items-center justify-center border border-[#F06C22]/20 shadow-[0_0_15px_rgba(240,108,34,0.1)]">
              <CalendarIcon className="w-5 h-5 text-[#F06C22]" />
            </div>
            <div>
              <h2 className="text-xl font-black italic uppercase tracking-tighter leading-none">
                {viewDate.toLocaleString('default', { month: 'long' })}
              </h2>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#68717A] mt-1">{year}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="text-white hover:bg-white/10 rounded-xl h-9 w-9">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleNextMonth} className="text-white hover:bg-white/10 rounded-xl h-9 w-9">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px mb-1 shrink-0">
          {dayNames.map(d => (
            <div key={d} className="text-center pb-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-[#68717A]">{d}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 flex-1 min-h-0 overflow-y-auto pr-1">
          {matrix.map((date, idx) => {
            if (!date) return <div key={`empty-${idx}`} className="h-14" />;
            
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
                  "min-h-[56px] p-2 rounded-2xl border transition-all cursor-pointer relative group flex flex-col items-center justify-between",
                  isSelected ? "bg-[#F06C22]/10 border-[#F06C22] shadow-[0_0_20px_rgba(240,108,34,0.1)]" : "bg-white/[0.03] border-white/5 hover:border-white/20",
                  today && !isSelected && "bg-primary/5 border-primary/20",
                  daySessions.length === 0 && "cursor-default hover:border-white/5"
                )}
              >
                <span className={cn(
                  "text-xs font-black leading-none",
                  isSelected ? "text-[#F06C22]" : today ? "text-primary" : "text-white/60"
                )}>
                  {date.getDate()}
                </span>
                
                <div className="flex flex-col gap-1 w-full mt-auto">
                  {daySessions.map((s, sIdx) => (
                    <div 
                      key={s.id || sIdx} 
                      className={cn(
                        "h-3.5 sm:h-4 rounded-lg px-1 flex items-center justify-between border shadow-sm",
                        s.routineName?.toUpperCase().includes('B') 
                          ? "bg-[#F06C22]/20 border-[#F06C22]/30 text-[#F06C22]" 
                          : "bg-[#115E8D]/20 border-[#115E8D]/30 text-[#38BDF8]"
                      )}
                    >
                      <span className="text-[7px] sm:text-[8px] font-black italic">
                        {s.routineName?.toUpperCase().includes('B') ? 'B' : s.routineName?.toUpperCase().includes('A') ? 'A' : 'S'}
                      </span>
                      <span className="text-[6px] sm:text-[7px] font-bold opacity-80">{s.trainerInitials || '--'}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#0A2E46] overflow-hidden rounded-[40px] border border-white/10 shadow-2xl">
      {/* Top Half: Calendar */}
      <div className="h-[45%] border-b border-white/5 overflow-hidden">
        {renderCalendar()}
      </div>

      {/* Bottom Half: Editor */}
      <div className="h-[55%] flex flex-col bg-white overflow-hidden">
        <div className="p-6 border-b shrink-0 bg-slate-50 flex items-center justify-between">
          {selectedSession ? (
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex flex-col items-center justify-center border shadow-sm",
                selectedSession.routineName?.includes('B') 
                  ? "bg-[#F06C22]/10 border-[#F06C22]/20 text-[#F06C22]" 
                  : "bg-[#115E8D]/10 border-[#115E8D]/20 text-[#115E8D]"
              )}>
                <span className="text-[14px] font-black italic uppercase leading-none">{selectedSession.routineName?.split(' ')[1] || 'S'}</span>
                <span className="text-[8px] font-bold opacity-60 mt-1">{selectedSession.trainerInitials}</span>
              </div>
              <div>
                <h3 className="text-lg font-black uppercase italic tracking-tighter leading-none text-slate-900">
                  {new Date(selectedSession.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                  Routine {selectedSession.routineName || 'Special'} • {selectedSessionLogs.length} Units Logged
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 opacity-30">
              <AlertCircle className="w-6 h-6" />
              <p className="text-sm font-black uppercase tracking-widest text-[#68717A]">Select a session above to view details</p>
            </div>
          )}

          {Object.keys(editedLogs).length > 0 && (
            <Button 
              onClick={handleBatchUpdate}
              disabled={isSaving}
              className="bg-[#F06C22] hover:bg-[#d95d18] text-white font-black uppercase italic text-[11px] tracking-widest h-11 px-6 rounded-2xl shadow-[0_4px_20px_rgba(240,108,34,0.3)] animate-pulse"
            >
              {isSaving ? "Updating..." : "Update session record"}
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {selectedSessionLogs.length > 0 ? selectedSessionLogs.map((log) => {
            const machine = machines.find(m => m.id === log.machineId);
            const isEdited = !!editedLogs[log.id!];
            const currentData = { ...log, ...editedLogs[log.id!] };

            return (
              <div 
                key={log.id} 
                className={cn(
                  "p-4 rounded-3xl border-2 flex items-center gap-4 transition-all",
                  isEdited ? "border-[#F06C22]/30 bg-[#F06C22]/[0.02]" : "border-slate-100 bg-white"
                )}
              >
                <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
                  <Dumbbell className="w-5 h-5 text-slate-400" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black uppercase tracking-tight text-slate-900 truncate">{machine?.name || 'Unknown Machine'}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Unit Log Entry</p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-black uppercase text-slate-400 text-center">Weight</span>
                    <Input 
                      value={currentData.weight}
                      onChange={(e) => handleLogEdit(log.id!, 'weight', e.target.value)}
                      className="w-20 h-10 rounded-xl text-center font-black bg-slate-50 border-slate-200 focus:border-[#F06C22] focus:bg-white transition-all shadow-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-black uppercase text-slate-400 text-center">Reps</span>
                    <Input 
                      value={currentData.reps}
                      onChange={(e) => handleLogEdit(log.id!, 'reps', e.target.value)}
                      className="w-16 h-10 rounded-xl text-center font-black bg-slate-50 border-slate-200 focus:border-[#F06C22] focus:bg-white transition-all shadow-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-black uppercase text-slate-400 text-center">Hold (s)</span>
                    <Input 
                      value={currentData.seconds || '0'}
                      onChange={(e) => handleLogEdit(log.id!, 'seconds', e.target.value)}
                      className="w-16 h-10 rounded-xl text-center font-black bg-slate-50 border-slate-200 focus:border-[#F06C22] focus:bg-white transition-all shadow-sm"
                    />
                  </div>
                </div>
              </div>
            );
          }) : selectedSession ? (
            <div className="flex flex-col items-center justify-center p-12 opacity-30 text-center gap-4">
              <Clock className="w-12 h-12" />
              <p className="text-sm font-black uppercase tracking-widest">No exercise logs found for this session</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-12 opacity-5 text-center gap-4">
              <CalendarIcon className="w-24 h-24" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
