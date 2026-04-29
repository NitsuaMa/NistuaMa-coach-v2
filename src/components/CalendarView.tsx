
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  CheckCircle2,
  CalendarDays,
  Users,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { ScheduleEntry, Trainer } from '../types';
import { cn } from '../lib/utils';

export function CalendarView({ 
  schedules, 
  trainers,
  authTrainer,
  isAdmin,
  onSelectClient,
  onStartNewClientOnboarding,
  setView,
  clients
}: { 
  schedules: ScheduleEntry[], 
  trainers: Trainer[],
  authTrainer: Trainer | null,
  isAdmin: boolean,
  onSelectClient?: (id: string) => void,
  onStartNewClientOnboarding?: (name: string) => void,
  setView?: (view: any) => void,
  clients?: any[]
}) {
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTrainerId, setSelectedTrainerId] = useState<string>(
    isAdmin ? 'all' : (authTrainer?.id || 'all')
  );
  const [isSyncing, setIsSyncing] = useState(false);

  const visibleCalendarTrainers = trainers.filter(t => t.isVisibleOnCalendar !== false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await axios.post('/api/trigger-master-sync', { hardReset: false });
      setTimeout(() => setIsSyncing(false), 2000);
    } catch (err) {
      console.error('Sync failed:', err);
      setIsSyncing(false);
    }
  };

  // Optimization: Group trainers by name for faster lookup
  const trainerMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    trainers.forEach(t => {
      map[t.fullName] = t.id!;
    });
    return map;
  }, [trainers]);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const safeToDate = (time: any) => {
    if (!time) return new Date();
    if (typeof time.toDate === 'function') return time.toDate();
    const d = new Date(time);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const getSlotHeader = (date: Date) => {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  const handlePrev = () => {
    const prev = new Date(selectedDate);
    if (viewMode === 'month') prev.setMonth(selectedDate.getMonth() - 1);
    else if (viewMode === 'week') prev.setDate(selectedDate.getDate() - 7);
    else if (viewMode === 'day') prev.setDate(selectedDate.getDate() - 1);
    setSelectedDate(prev);
  };

  const handleNext = () => {
    const next = new Date(selectedDate);
    if (viewMode === 'month') next.setMonth(selectedDate.getMonth() + 1);
    else if (viewMode === 'week') next.setDate(selectedDate.getDate() + 7);
    else if (viewMode === 'day') next.setDate(selectedDate.getDate() + 1);
    setSelectedDate(next);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear();
  };

  const AM_SLOTS = ['07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30'];
  const PM_SLOTS = ['15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'];

  const TRAINER_COLORS = [
    { border: 'border-[#38BDF8]', bg: 'bg-[#38BDF8]/10', text: 'text-[#38BDF8]' },
    { border: 'border-[#10B981]', bg: 'bg-[#10B981]/10', text: 'text-[#10B981]' },
    { border: 'border-[#F06C22]', bg: 'bg-[#F06C22]/10', text: 'text-[#F06C22]' },
    { border: 'border-[#A855F7]', bg: 'bg-[#A855F7]/10', text: 'text-[#A855F7]' },
    { border: 'border-[#22D3EE]', bg: 'bg-[#22D3EE]/10', text: 'text-[#22D3EE]' },
  ];

  const getWeekDays = (date: Date) => {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  };

  const handleClientClick = (session: ScheduleEntry) => {
    if (onSelectClient && setView) {
      const clientName = session.clientName || '';
      const client = clients?.find(c => 
        c.id === session.clientId || 
        c.mindbody_name?.toLowerCase() === clientName.toLowerCase() ||
        `${c.firstName} ${c.lastName}`.toLowerCase() === clientName.toLowerCase()
      );
      if (client) {
        onSelectClient(client.id!);
        setView('profile');
      } else if (onStartNewClientOnboarding) {
        onStartNewClientOnboarding(clientName);
      }
    }
  };

  const renderMonth = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = firstDayOfMonth(year, month);
    const totalDays = daysInMonth(year, month);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const prevMonthDays = daysInMonth(year, month - 1);
    const matrix: { num: number, current: boolean, date: Date }[] = [];

    for (let i = 0; i < 42; i++) {
        const dayNum = i - firstDay + 1;
        if (dayNum <= 0) {
            matrix.push({ num: prevMonthDays + dayNum, current: false, date: new Date(year, month - 1, prevMonthDays + dayNum) });
        } else if (dayNum > totalDays) {
            matrix.push({ num: dayNum - totalDays, current: false, date: new Date(year, month + 1, dayNum - totalDays) });
        } else {
            matrix.push({ num: dayNum, current: true, date: new Date(year, month, dayNum) });
        }
    }

    const filteredSchedules = schedules.filter(s => {
      const tId = trainerMap[s.trainerName];
      const trainerMatches = selectedTrainerId === 'all' || tId === selectedTrainerId;
      return s.status !== 'Cancelled' && trainerMatches;
    });

    return (
      <div className="grid grid-cols-[40px_repeat(7,1fr)] gap-px bg-slate-700 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl">
        <div className="bg-slate-900 border-r border-b border-slate-700" />
        {dayNames.map(d => (
          <div key={d} className="bg-slate-900/90 p-4 text-center border-b border-slate-700">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{d}</span>
          </div>
        ))}
        {matrix.map((day, idx) => {
          const today = isToday(day.date);
          const daySessions = filteredSchedules.filter(s => {
            const d = safeToDate(s.startTime);
            return isSameDay(d, day.date);
          });

          const isRowStart = idx % 7 === 0;

          // Heatmap color logic based on number of sessions
          let heatmapClass = 'bg-slate-900';
          if (day.current && daySessions.length > 0) {
              if (daySessions.length <= 2) heatmapClass = 'bg-[#0A2E46]';
              else if (daySessions.length <= 5) heatmapClass = 'bg-[#114B72]';
              else heatmapClass = 'bg-[#18689D]';
          }

          return (
            <React.Fragment key={idx}>
              {isRowStart && (
                <div 
                  className="bg-slate-800 border-r border-slate-700 flex items-center justify-center cursor-pointer hover:bg-slate-700 transition-colors group/week"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDate(day.date);
                    setViewMode('week');
                  }}
                >
                  <span className="text-[8px] font-black uppercase -rotate-90 text-slate-500 group-hover/week:text-white transition-colors">Week</span>
                </div>
              )}
              <div 
                className={cn(
                  "min-h-[110px] p-4 transition-all group relative cursor-pointer flex flex-col justify-between",
                  !day.current ? 'bg-slate-900/50 opacity-40 grayscale' : heatmapClass,
                  today && 'ring-2 ring-inset ring-[#38BDF8] z-10'
                )}
                onClick={() => {
                  if (day.current) {
                    setSelectedDate(day.date);
                    setViewMode('day');
                  }
                }}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={cn(
                    "text-sm font-black flex items-center justify-center rounded-full transition-all w-8 h-8",
                    today ? 'bg-[#38BDF8] text-white shadow-sm' : 'text-slate-300'
                  )}>
                    {day.num}
                  </span>
                </div>
                
                {day.current && (
                  <div className="flex flex-col mt-auto gap-2">
                    {daySessions.length > 0 ? (
                      <>
                        <span className="text-xs text-slate-400">
                          {daySessions.length} {daySessions.length === 1 ? 'Session' : 'Sessions'}
                        </span>
                        <div className="flex flex-wrap gap-1 items-end h-3">
                          {Array.from(new Set(daySessions.map(s => trainerMap[s.trainerName]).filter(Boolean))).map(tId => {
                            const trainer = visibleCalendarTrainers.find(t => t.id === tId);
                            if (!trainer) return null;
                            const color = TRAINER_COLORS[visibleCalendarTrainers.indexOf(trainer) % TRAINER_COLORS.length];
                            return (
                              <div key={tId} className={cn("w-2 h-2 rounded-full", color.bg)} title={trainer.fullName} />
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <span className="text-xs text-slate-500 pb-4">Open Day</span>
                    )}
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  const renderWeek = () => {
    const weekDays = getWeekDays(selectedDate);
    const allSlots = [...AM_SLOTS, ...PM_SLOTS];

    // Pre-filter sessions for this week to improve performance
    const weekStart = weekDays[0];
    const weekEnd = new Date(weekDays[6]);
    weekEnd.setHours(23, 59, 59, 999);

    const activeSessions = schedules.filter(s => {
      const d = safeToDate(s.startTime);
      return d >= weekStart && d <= weekEnd && s.status !== 'Cancelled';
    });

    return (
      <div className="flex flex-col gap-6">
        {/* Trainer Legend */}
        {visibleCalendarTrainers.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {isAdmin && (
              <button
                onClick={() => setSelectedTrainerId('all')}
                className={cn(
                  "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                  selectedTrainerId === 'all' 
                    ? "bg-white text-[#0A2E46]" 
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                )}
              >
                All Trainers
              </button>
            )}
            {visibleCalendarTrainers.filter(t => isAdmin || t.id === authTrainer?.id).map(trainer => {
              const color = TRAINER_COLORS[visibleCalendarTrainers.indexOf(trainer) % TRAINER_COLORS.length];
              const isSelected = selectedTrainerId === trainer.id || selectedTrainerId === 'all';
              
              return (
                <button
                  key={trainer.id}
                  onClick={() => setSelectedTrainerId(selectedTrainerId === trainer.id ? 'all' : trainer.id!)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border border-transparent",
                    isSelected ? `${color.bg} ${color.text} border-current/20` : "bg-slate-800 text-slate-500 opacity-50 hover:opacity-100 hover:grayscale-0 grayscale"
                  )}
                >
                  <span className={cn("w-2 h-2 rounded-full", isSelected ? "bg-current" : "bg-slate-500")} />
                  {trainer.fullName}
                </button>
              );
            })}
          </div>
        )}

        <div className="bg-[#0A2E46] border border-slate-700 rounded-[32px] overflow-hidden shadow-2xl">
          <table className="w-full border-collapse table-fixed">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-500 border-r border-slate-700 w-20 bg-slate-900/50 text-center">
                  Time
                </th>
                {weekDays.map((date, idx) => {
                  const active = isToday(date);
                  return (
                    <th key={`week-day-${idx}`} className={cn("p-4 text-center border-r border-slate-700 last:border-r-0", active && 'bg-white/[0.05]')}>
                      <p className={cn("text-[10px] font-black uppercase tracking-widest", active ? 'text-white' : 'text-slate-400')}>
                        {date.toLocaleDateString(undefined, { weekday: 'short' })}
                      </p>
                      <p className={cn("text-2xl font-black mt-1 leading-none", active ? 'text-[#38BDF8]' : 'text-white')}>
                        {date.getDate()}
                      </p>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {allSlots.map((slot, sIdx) => {
                const isGap = slot === '15:00' && sIdx > 0;
                return (
                  <React.Fragment key={`week-slot-${slot}`}>
                    {isGap && (
                      <tr className="bg-slate-900/50 h-8 border-y border-slate-700">
                        <td colSpan={8} className="text-center border-slate-700">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">Midday Gap</span>
                        </td>
                      </tr>
                    )}
                    <tr className="border-b border-slate-700 last:border-0 hover:bg-white/[0.02] transition-colors group">
                      <td className="p-3 text-center border-r border-slate-700 bg-slate-900/20 group-hover:bg-slate-900/40">
                        <span className="text-[11px] font-black tracking-tight text-slate-400">{slot}</span>
                      </td>
                      {weekDays.map((date, dIdx) => {
                        const daySessions = activeSessions.filter(s => {
                          const d = safeToDate(s.startTime);
                          const tStr = getSlotHeader(d);
                          return isSameDay(d, date) && tStr === slot;
                        });

                        const active = isToday(date);

                        return (
                          <td 
                            key={`week-cell-${dIdx}-${slot}`} 
                            className={cn(
                              "p-1.5 border-r border-slate-700 last:border-r-0 min-h-[60px] align-top relative",
                              active ? "bg-white/[0.02]" : "",
                              daySessions.length === 0 ? "hover:bg-slate-800/30" : ""
                            )}
                            onClick={() => {
                                setSelectedDate(date);
                                setViewMode('day');
                            }}
                          >
                            <div className="flex flex-col gap-1.5 h-full">
                              {daySessions.length === 0 && (
                                <div className="absolute inset-2 border-2 border-dashed border-slate-700/30 rounded-xl pointer-events-none" />
                              )}
                              {daySessions.map((session, sessIdx) => {
                                const trainer = visibleCalendarTrainers.find(t => t.id === trainerMap[session.trainerName]);
                                const color = trainer && visibleCalendarTrainers.length > 0 ? TRAINER_COLORS[visibleCalendarTrainers.indexOf(trainer) % TRAINER_COLORS.length] : TRAINER_COLORS[0];
                                
                                const tId = trainerMap[session.trainerName];
                                const isTrainerSelected = selectedTrainerId === 'all' || tId === selectedTrainerId;
                                
                                const formatClientName = (fullName: string) => {
                                  if (!fullName) return 'Unknown';
                                  const parts = fullName.trim().split(' ');
                                  if (parts.length > 1) {
                                    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
                                  }
                                  return parts[0];
                                };
                                const formattedName = formatClientName(session.clientName || '');

                                return (
                                  <div
                                    key={session.id || `sess-${sessIdx}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleClientClick(session);
                                    }}
                                    className={cn(
                                      "flex flex-col overflow-hidden p-1.5 rounded-xl border-l-4 shadow-sm transition-all cursor-pointer relative",
                                      isTrainerSelected 
                                        ? `${color.border} opacity-100 hover:brightness-125` 
                                        : "border-slate-700 opacity-20 grayscale",
                                      color.bg
                                    )}
                                  >
                                    <span className="text-[10px] text-white/90 font-medium leading-none mb-1 whitespace-nowrap text-ellipsis overflow-hidden">
                                      {slot}
                                    </span>
                                    <span className="text-xs font-bold text-white truncate whitespace-nowrap text-ellipsis leading-none" title={session.clientName}>
                                      {formattedName}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderDay = () => {
    const allSlots = [...AM_SLOTS, ...PM_SLOTS];
    const filteredTrainers = selectedTrainerId === 'all' 
      ? visibleCalendarTrainers 
      : visibleCalendarTrainers.filter(t => t.id === selectedTrainerId);

    return (
      <div className="bg-[#0A2E46] border border-slate-700 rounded-[32px] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[800px] table-fixed">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-700">
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 border-r border-slate-700 w-24 sticky left-0 bg-slate-900 z-10">Time</th>
                {filteredTrainers.map((trainer) => (
                  <th key={trainer.id} className="p-4 border-r border-slate-700 last:border-r-0 text-center">
                    <div className="flex flex-col items-center gap-1">
                        <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center text-slate-300 font-black text-sm">
                          {trainer.initials}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-white mt-1">{trainer.fullName}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allSlots.map((slot, sIdx) => {
                const isGap = slot === '15:00' && sIdx > 0;
                return (
                  <React.Fragment key={slot}>
                    {isGap && (
                      <tr className="bg-slate-900/50 h-8 border-y border-slate-700">
                        <td colSpan={filteredTrainers.length + 1} className="text-center">
                            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-500">Midday Gap</span>
                        </td>
                      </tr>
                    )}
                    <tr className="border-b border-slate-700 last:border-0 hover:bg-white/[0.02] transition-colors">
                      <td className="p-3 text-center border-r border-slate-700 sticky left-0 bg-[#0A2E46] z-10 text-slate-400">
                        <span className="text-[11px] font-black tracking-tighter">{slot}</span>
                      </td>
                      {filteredTrainers.map((trainer) => {
                        const session = schedules.find(s => {
                          const d = safeToDate(s.startTime);
                          const tStr = getSlotHeader(d);
                          return isSameDay(d, selectedDate) && tStr === slot && s.trainerName === trainer.fullName && s.status !== 'Cancelled';
                        });

                        const color = TRAINER_COLORS[visibleCalendarTrainers.indexOf(trainer) % TRAINER_COLORS.length];

                        return (
                          <td 
                            key={`${trainer.id}-${slot}`} 
                            className="p-1.5 border-r border-slate-700 last:border-r-0 h-[80px]"
                          >
                            {session ? (
                              <div
                                onClick={() => handleClientClick(session)}
                                className={cn(
                                  "p-3 rounded-xl border-l-4 flex flex-col gap-1 transition-all cursor-pointer shadow-sm h-full bg-slate-800/60",
                                  color.border
                                )}
                              >
                                <span className="text-xs font-medium text-slate-400 tabular-nums leading-none tracking-tight">
                                  {slot} - {session.endTime ? getSlotHeader(safeToDate(session.endTime)) : '30m'}
                                </span>
                                <span className="text-sm font-bold truncate text-white leading-tight">
                                  {session.clientName}
                                </span>
                                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-widest leading-none">
                                  {trainer.fullName}
                                </span>
                              </div>
                            ) : (
                                <div className="h-full flex items-center justify-center p-2">
                                  <span className="text-[10px] font-medium uppercase tracking-widest text-slate-500">OPEN SLOT</span>
                                </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-12 w-full overflow-x-hidden p-6 sm:p-8 bg-slate-900 min-h-screen rounded-[40px] border border-slate-800/50 shadow-2xl relative">
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-slate-800/40 to-transparent pointer-events-none rounded-t-[40px]" />
      
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center shadow-inner border border-slate-700">
            <CalendarIcon className="w-7 h-7 text-[#38BDF8]" />
          </div>
          <div>
            <h2 className="text-3xl font-black tracking-tight uppercase italic text-white flex items-center gap-3">
                {viewMode === 'month' ? 'Month View' : viewMode === 'week' ? 'Week View' : 'Day View'}
                <Badge variant="outline" className="text-[8px] font-black h-5 px-2 tracking-widest border-slate-700 text-slate-400 bg-slate-800/50 uppercase not-italic">Read Only</Badge>
            </h2>
            <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] mt-1 border-l-2 border-[#38BDF8] pl-2">
                {viewMode === 'month' 
                  ? selectedDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
                  : viewMode === 'week'
                    ? `${getWeekDays(selectedDate)[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${getWeekDays(selectedDate)[6].toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
                    : selectedDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric', weekday: 'long' })
                }
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 shadow-sm">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSync}
              disabled={isSyncing}
              className="rounded-lg font-black uppercase text-[9px] tracking-widest px-4 h-8 gap-2 text-slate-300 hover:text-white hover:bg-slate-700"
            >
              {isSyncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3 text-[#38BDF8]" />}
              {isSyncing ? 'Syncing' : 'Sync'}
            </Button>
            <div className="w-px h-4 bg-slate-700 mx-1 my-auto" />
            <Button 
              size="sm" 
              onClick={() => setViewMode('month')}
              className={cn("rounded-lg font-black uppercase text-[9px] tracking-widest px-4 h-8 transition-all duration-200", viewMode === 'month' ? "bg-slate-600 text-white shadow-sm" : "bg-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-700/[0.5]")}
            >
              Month
            </Button>
            <Button 
              size="sm" 
              onClick={() => setViewMode('week')}
              className={cn("rounded-lg font-black uppercase text-[9px] tracking-widest px-4 h-8 transition-all duration-200", viewMode === 'week' ? "bg-slate-600 text-white shadow-sm" : "bg-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-700/[0.5]")}
            >
              Week
            </Button>
            <Button 
              size="sm" 
              onClick={() => setViewMode('day')}
              className={cn("rounded-lg font-black uppercase text-[9px] tracking-widest px-4 h-8 transition-all duration-200", viewMode === 'day' ? "bg-slate-600 text-white shadow-sm" : "bg-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-700/[0.5]")}
            >
              Day
            </Button>
          </div>

          <div className="flex items-center bg-slate-800 px-3 py-1 rounded-xl border border-slate-700 gap-2 shadow-sm">
            <Users className="w-3.5 h-3.5 text-[#38BDF8]" />
            <Select value={selectedTrainerId} onValueChange={setSelectedTrainerId}>
              <SelectTrigger className="h-6 border-none bg-transparent focus:ring-0 text-[10px] font-black uppercase tracking-widest min-w-[120px] p-0 shadow-none text-white hover:text-[#38BDF8] transition-colors">
                <SelectValue placeholder="Team Filter" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-700 bg-slate-800 text-white">
                {isAdmin && <SelectItem value="all" className="font-bold focus:bg-slate-700 focus:text-white">Entire Team</SelectItem>}
                {visibleCalendarTrainers.filter(t => isAdmin || t.id === authTrainer?.id).map(t => (
                  <SelectItem key={t.id} value={t.id!} className="font-bold hover:bg-slate-700 focus:bg-slate-700 focus:text-white">{t.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700 shadow-sm">
            <Button variant="ghost" size="icon" onClick={handlePrev} className="rounded-lg h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-700"><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="ghost" onClick={() => setSelectedDate(new Date())} className="rounded-lg font-black uppercase text-[9px] tracking-widest px-4 h-8 text-slate-300 hover:text-white hover:bg-slate-700">Today</Button>
            <Button variant="ghost" size="icon" onClick={handleNext} className="rounded-lg h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-700"><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={viewMode + selectedDate.toISOString() + selectedTrainerId}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.15 }}
          className="relative z-10"
        >
          {viewMode === 'month' && renderMonth()}
          {viewMode === 'week' && renderWeek()}
          {viewMode === 'day' && renderDay()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
