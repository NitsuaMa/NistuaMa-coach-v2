import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  CheckCircle2, 
  ArrowLeft,
  Calendar,
  Zap,
  Target,
  Printer,
  Mail,
  ChevronRight,
  Award,
  ChevronDown,
  LayoutGrid,
  FileText,
  User,
  Quote,
  Flame,
  Binary,
  Map as MapIcon,
  Crosshair
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  addDoc, 
  serverTimestamp,
  doc,
  getDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Client, 
  Trainer, 
  Machine, 
  ProgressReport,
  ExerciseLog
} from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription
} from '@/components/ui/dialog';
import { calculateHighlightedMovements, calculateAttendanceStats } from '../lib/progress-utils';
import { cn } from '../lib/utils';
import { OperationType, handleFirestoreError } from '../lib/firestore-errors';

interface ClientProgressReportViewProps {
  client: Client;
  trainer: Trainer;
  machines: Machine[];
  onBack: () => void;
  existingReportId?: string;
}

export function ClientProgressReportView({ client, trainer, machines, onBack, existingReportId }: ClientProgressReportViewProps) {
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'selection' | 'editing' | 'view'>('selection');
  const [saving, setSaving] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  
  // Entire Report State
  const [report, setReport] = useState<ProgressReport>({
    clientId: client.id!,
    trainerId: trainer.id!,
    trainerName: trainer.fullName,
    date: new Date().toISOString().split('T')[0],
    isManual: false,
    status: 'Draft',
    
    attendance: {
      score: 0,
      totalSessions: 0,
      avgDuration: 0,
      punctuality: '',
      narrative: ''
    },

    highlights: [
      { label: '', startValue: '', currentValue: '', featuredMetric: 'weight' },
      { label: '', startValue: '', currentValue: '', featuredMetric: 'weight' },
      { label: '', startValue: '', currentValue: '', featuredMetric: 'weight' }
    ],

    performanceMatrix: {
      posture: { 
        score: 80, 
        note: '', 
        talkingPoints: [
          { id: 'pos-1', text: 'Ribcage Stability', status: 'black' },
          { id: 'pos-2', text: 'Setup Integrity', status: 'black' },
          { id: 'pos-3', text: 'Bracing Quality', status: 'black' }
        ]
      },
      pace: { 
        score: 80, 
        note: '', 
        talkingPoints: [
          { id: 'pac-1', text: 'Constant Tension', status: 'black' },
          { id: 'pac-2', text: 'Control Velocity', status: 'black' },
          { id: 'pac-3', text: 'Resistance Tolerance', status: 'black' }
        ]
      },
      path: { 
        score: 80, 
        note: '', 
        talkingPoints: [
          { id: 'pat-1', text: 'Active ROM', status: 'black' },
          { id: 'pat-2', text: 'Line of Pull', status: 'black' },
          { id: 'pat-3', text: 'Leverage Optimization', status: 'black' }
        ]
      },
      purpose: { 
        score: 80, 
        note: '', 
        talkingPoints: [
          { id: 'pur-1', text: 'Motor Unit Recruitment', status: 'black' },
          { id: 'pur-2', text: 'Internal Focus', status: 'black' },
          { id: 'pur-3', text: 'Mechanical Edge', status: 'black' }
        ]
      }
    },

    milestones: {
      originalWhy: client.globalNotes || '',
      smartGoal: ''
    },

    strategy: {
      primaryPlan: 'Routine Mastery',
      focusAreas: 'The Next 6 Months: We will transition to Routine B, increasing time-under-tension by 10% to fortify your lumbar spine and ensure your \'Why\' becomes a permanent reality.'
    },
    trainerNotes: '',
    createdAt: null
  });

  const [selectingHighlightIdx, setSelectingHighlightIdx] = useState<number | null>(null);
  const [machineHistory, setMachineHistory] = useState<Record<string, any>>({});

  // Load existing report
  useEffect(() => {
    async function fetchExisting() {
      if (!existingReportId) return;
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'progressReports', existingReportId));
        if (snap.exists()) {
          const data = snap.data() as ProgressReport;
          setReport(prev => ({ 
            ...prev, 
            ...data,
            id: snap.id 
          }));
          setMode(data.status === 'Finalized' ? 'view' : 'editing');
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'progressReports');
      } finally {
        setLoading(false);
      }
    }
    fetchExisting();
  }, [existingReportId]);

  // Load auto data
  useEffect(() => {
    async function loadData() {
      if (mode !== 'editing' || report.isManual || existingReportId) return;
      setLoading(true);
      try {
        const stats = await calculateAttendanceStats(client.id!);
        const defaultHighlights = machines
          .filter(m => m.name.toLowerCase().includes('leg press') || m.name.toLowerCase().includes('row') || m.name.toLowerCase().includes('chest'))
          .slice(0, 3)
          .map(m => m.id!);
        
        const deltas = await calculateHighlightedMovements(client.id!, defaultHighlights);

        setReport(prev => ({
          ...prev,
          attendance: {
            score: stats.attendanceScore,
            totalSessions: stats.totalSessionsCompleted,
            avgDuration: stats.avgDuration,
            punctuality: stats.punctualityNarrative,
            narrative: `Thank you for your consistency, ${client.firstName}. Your commitment to the protocol is driving these results.`
          },
          highlights: deltas.map(d => ({
            machineId: d.machineId,
            label: d.machineName,
            featuredMetric: 'weight' as const,
            startValue: `${d.startingWeight} lbs`,
            currentValue: `${d.currentWeight} lbs`,
            percentageIncrease: d.percentageIncrease
          })).concat(Array(3 - deltas.length).fill({ label: '', startValue: '', currentValue: '', featuredMetric: 'weight', percentageIncrease: 0 })).slice(0, 3)
        }));
      } catch (err) {
        console.error("Auto data failed:", err);
      } finally {
        setLoading(false);
      }
    }
    if (mode === 'editing' && !report.isManual) {
      loadData();
    }
  }, [client, machines, mode, report.isManual, existingReportId]);

  // Load history for selector
  useEffect(() => {
    async function loadAllHistory() {
      if (!client.id || mode !== 'editing') return;
      const allIds = machines.map(m => m.id!);
      try {
        const deltas = await calculateHighlightedMovements(client.id, allIds);
        const historyMap: Record<string, any> = {};
        deltas.forEach(d => {
          historyMap[d.machineId] = d;
        });
        setMachineHistory(historyMap);
      } catch (err) {
        console.error("History selector load failed:", err);
      }
    }
    loadAllHistory();
  }, [client.id, machines, mode]);

  const handleSave = async (status: 'Draft' | 'Finalized' = 'Finalized') => {
    setSaving(true);
    try {
      const sanitizedReport = {
        ...report,
        status,
        updatedAt: serverTimestamp()
      };
      
      let reportId = report.id;
      if (reportId) {
        await updateDoc(doc(db, 'progressReports', reportId), sanitizedReport);
      } else {
        const docRef = await addDoc(collection(db, 'progressReports'), {
          ...sanitizedReport,
          createdAt: serverTimestamp()
        });
        reportId = docRef.id;
        setReport(prev => ({ ...prev, id: docRef.id }));
      }
      
      if (status === 'Finalized') {
        setShowExportOptions(true);
        setMode('view');
      } else {
        alert("Draft saved.");
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'progressReports');
    } finally {
      setSaving(false);
    }
  };

  const handleMachineSelect = async (machine: Machine) => {
    if (selectingHighlightIdx === null) return;
    const deltas = await calculateHighlightedMovements(client.id!, [machine.id!]);
    const d = deltas[0];
    
    const newHighlights = [...report.highlights];
    newHighlights[selectingHighlightIdx] = {
      machineId: machine.id,
      label: machine.name,
      featuredMetric: 'weight',
      startValue: d ? `${d.startingWeight} lbs` : '—',
      currentValue: d ? `${d.currentWeight} lbs` : '—',
      percentageIncrease: d ? d.percentageIncrease : 0
    };
    
    setReport({ ...report, highlights: newHighlights });
    setSelectingHighlightIdx(null);
  };

  // Helper for 1-5 scale indicators with Talking Points
  const PIndicator = ({ 
    score, 
    label, 
    icon: Icon,
    talkingPoints = []
  }: { 
    score: number, 
    label: string, 
    icon: any,
    talkingPoints?: { id: string, text: string, status: string }[]
  }) => {
    // NaN Guard for score
    const safeScore = isNaN(score) ? 0 : score;
    const scaleValue = Math.round(safeScore / 20) || 0; 
    
    // Dynamic color logic based on scale 0-5
    const getScaleColor = (val: number) => {
      if (val === 5) return "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]";
      if (val >= 3) return "bg-[#F06C22] shadow-[0_0_10px_rgba(240,108,34,0.2)]";
      if (val > 0) return "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]";
      return "bg-zinc-800";
    };

    const activeColorClass = getScaleColor(scaleValue);
    const scoreColorClass = scaleValue === 5 ? "text-emerald-500" : scaleValue >= 3 ? "text-[#F06C22]" : scaleValue > 0 ? "text-red-500" : "text-zinc-500";
    
    return (
      <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex flex-col h-full print:bg-white print:border-slate-100 shadow-xl print:shadow-none print:break-inside-avoid">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
              activeColorClass.split(' ')[0].replace('bg-', 'bg-').concat('/20'),
              scoreColorClass
            )}>
              <Icon className="w-4 h-4" />
            </div>
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-white print:text-[#0A2E46]">{label}</h4>
          </div>
          <div className="flex flex-col items-end">
            <span className={cn(
              "text-[10px] font-black italic leading-none mb-1",
              scoreColorClass
            )}>{isNaN(scaleValue) ? 0 : scaleValue} / 5</span>
            <div className="flex gap-0.5 scale-indicator">
              {[1, 2, 3, 4, 5].map((step) => (
                <div 
                  key={step} 
                  className={cn(
                    "w-3.5 h-1.5 rounded-[1px] scale-block transition-all duration-300",
                    step <= scaleValue 
                      ? activeColorClass 
                      : "bg-white/5 print:bg-slate-100"
                  )}
                />
              ))}
            </div>
          </div>
        </div>
        
        <div className="mt-3 space-y-1.5">
          <div className="space-y-1">
            {talkingPoints.length > 0 ? (
              talkingPoints.filter(tp => tp.status === 'green' || tp.status === 'black').map(tp => (
                <div key={tp.id} className="flex items-start gap-1.5 opacity-90">
                  <CheckCircle2 className={cn("w-2.5 h-2.5 mt-0.5 shrink-0", tp.status === 'green' ? "text-emerald-500" : "text-white/30 print:text-slate-400")} />
                  <span className="text-[9px] font-bold text-white/70 print:text-slate-600 leading-tight uppercase tracking-tight selection:bg-slate-800">{tp.text}</span>
                </div>
              ))
            ) : (
              <p className="text-[9px] italic text-white/30 print:text-slate-400">Biological adaptations within clinical parameters.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (mode === 'selection') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 space-y-12 max-w-2xl mx-auto text-center bg-[#0A2E46] rounded-[60px] my-12 border border-white/5 shadow-2xl">
        <div className="space-y-4">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-24 h-24 rounded-[40px] bg-[#F06C22]/10 flex items-center justify-center mx-auto mb-8 border border-[#F06C22]/20 shadow-[0_0_40px_rgba(240,108,34,0.1)]"
          >
            <Award className="w-12 h-12 text-[#F06C22]" />
          </motion.div>
          <h2 className="text-4xl font-black uppercase italic tracking-tighter text-white">Initialize Report</h2>
          <p className="text-[#68717A] font-bold uppercase text-xs tracking-widest leading-relaxed">Choose your documentation methodology for <br /> <span className="text-white">{client.firstName} {client.lastName}</span></p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { setReport(prev => ({ ...prev, isManual: false })); setMode('editing'); }}
            className="flex flex-col items-center p-8 bg-white/5 border-2 border-[#F06C22]/20 rounded-[40px] hover:border-[#F06C22] transition-all group hover:bg-[#F06C22]/[0.02] text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-[#F06C22] flex items-center justify-center mb-6 shadow-lg shadow-[#F06C22]/20 group-hover:scale-110 transition-transform">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-black uppercase italic mb-2 text-white">Auto-Populate</h3>
            <p className="text-[10px] text-[#68717A] font-bold uppercase tracking-widest leading-relaxed">Scan database for sessions, lift deltas, and punctuality patterns.</p>
          </motion.button>

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { setReport(prev => ({ ...prev, isManual: true })); setMode('editing'); setLoading(false); }}
            className="flex flex-col items-center p-8 bg-white/5 border-2 border-dashed border-white/10 rounded-[40px] hover:border-white transition-all group hover:bg-white/5 text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <FileText className="w-7 h-7 text-white/40" />
            </div>
            <h3 className="text-xl font-black uppercase italic mb-2 text-white">Manual Entry</h3>
            <p className="text-[10px] text-[#68717A] font-bold uppercase tracking-widest leading-relaxed">Start with a blank canvas. Ideal for clients with external history.</p>
          </motion.button>
        </div>

        <Button variant="ghost" onClick={onBack} className="text-[#68717A] hover:text-white font-black uppercase tracking-[0.3em] text-[10px] h-12 px-8">
          <ArrowLeft className="w-4 h-4 mr-2" /> Abort Mission
        </Button>
      </div>
    );
  }

  if (mode === 'view') {
    return (
      <div className="min-h-screen bg-[#0A2E46] text-[#FAF9F6] selection:bg-[#F06C22]/30 selection:text-white print:bg-white">
        <style>{`
          @media print {
            @page { size: portrait; margin: 0.5cm; }
            body { background: white !important; color: black !important; }
            .print-area { padding: 0 !important; margin: 0 !important; max-width: none !important; background: white !important; width: 100% !important; }
            .no-print { display: none !important; }
            .report-card { border: none !important; box-shadow: none !important; background: white !important; color: black !important; padding: 0 !important; border-radius: 0 !important; }
            .bg-[#0A2E46] { background: white !important; }
            .text-[#FAF9F6], .text-white { color: #0A2E46 !important; }
            .text-[#68717A] { color: #666 !important; }
            .bg-white\\/5 { background: #fdfdfd !important; border: 1px solid #eee !important; }
            .shadow-2xl, .shadow-xl, .shadow-lg { box-shadow: none !important; }
            .border-white\\/10 { border-color: #eee !important; }
            .text-[#F06C22] { color: #D95B16 !important; font-weight: 900 !important; }
            .bg-[#F06C22] { background: #D95B16 !important; color: white !important; }
            .rounded-[30px], .rounded-[40px] { border-radius: 1rem !important; }
            h1 { font-size: 2.2rem !important; }
            h2 { font-size: 1.2rem !important; }
            h3 { font-size: 1rem !important; }
            h4 { font-size: 0.85rem !important; }
            p, span { font-size: 0.7rem !important; }
            .scale-indicator { gap: 2px !important; }
            .scale-block { height: 6px !important; border-radius: 2px !important; }
          }
        `}</style>

        <div className="max-w-4xl mx-auto px-6 py-4 space-y-4 print-area print:m-0 print:p-0">
          {/* Controls */}
          <div className="flex justify-between items-center no-print print:hidden">
            <Button variant="ghost" onClick={onBack} className="text-white hover:bg-white/10 rounded-2xl gap-2 font-black uppercase italic tracking-widest px-6 print:hidden">
              <ArrowLeft className="w-5 h-5" /> Back
            </Button>
            <div className="flex gap-3 print:hidden">
              <Button onClick={() => setMode('editing')} variant="outline" className="text-white border-white/20 hover:bg-white/5 rounded-2xl gap-2 font-black uppercase italic tracking-widest px-6 print:hidden">
                Edit Data
              </Button>
              <Button onClick={() => window.print()} className="bg-[#F06C22] hover:bg-[#D95B16] text-white rounded-2xl gap-2 font-black uppercase italic tracking-widest px-8 shadow-lg shadow-[#F06C22]/20 print:hidden">
                <Printer className="w-5 h-5" /> Print Report
              </Button>
            </div>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="report-card space-y-3"
          >
            {/* 1. HERO HEADER: ATTENDANCE & DEDICATION */}
            <header className="space-y-3 print:break-inside-avoid">
              <div className="flex flex-col md:flex-row md:items-end justify-between border-b-2 border-[#F06C22] pb-4 gap-4">
                <div>
                  <h1 className="text-4xl font-black uppercase italic tracking-tighter leading-none mb-3 print:text-[#0A2E46]">
                    Performance <br />
                    <span className="text-[#F06C22]">Report Card</span>
                  </h1>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-[8px] font-black uppercase tracking-[0.25em] text-[#68717A]">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#F06C22]" /> 
                      <span className="text-white print:text-[#0A2E46]">{client.firstName} {client.lastName}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#F06C22]" />
                      Report: <span className="text-white print:text-[#0A2E46]">{new Date(report.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-1.5 opacity-80">
                      <CheckCircle2 className="w-3 h-3 text-[#F06C22]/60" />
                      Joined: <span className="text-white/60 print:text-slate-500">Jan 15, 2026</span>
                    </div>
                    <div className="flex items-center gap-1.5 opacity-80">
                      <CheckCircle2 className="w-3 h-3 text-[#F06C22]/60" />
                      Prev Report: <span className="text-white/60 print:text-slate-500">Mar 01, 2026</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end md:text-right">
                  <p className="text-[7px] font-black uppercase tracking-[0.4em] text-[#68717A] mb-1">Authenticated By</p>
                  <p className="text-base font-black uppercase italic tracking-tight print:text-[#0A2E46] leading-none mb-1">{trainer.fullName}</p>
                  <div className="bg-[#F06C22] px-2 py-0.5 rounded-md">
                    <p className="text-[7px] font-black text-white uppercase tracking-widest">Lead Practitioner • MSF Studio</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1 bg-[#F06C22] p-4 rounded-[25px] text-white flex flex-col justify-center items-center text-center shadow-xl shadow-[#F06C22]/30 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                  <Award className="w-10 h-10 mb-2 opacity-50 relative z-10" />
                  <p className="text-4xl font-black italic tracking-tighter leading-none relative z-10">{report.attendance.totalSessions}</p>
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-90 mt-2 relative z-10">Sessions Completed</p>
                  <div className="mt-2 pt-2 border-t border-white/20 w-full relative z-10">
                    <p className="text-[7px] font-black uppercase tracking-widest text-white/80">~4 Hours Invested</p>
                    <p className="text-[6px] font-bold uppercase tracking-tighter opacity-70 italic">(High Growth Efficiency)</p>
                  </div>
                </div>
                <div className="md:col-span-3 bg-white/5 backdrop-blur-md p-5 rounded-[25px] border border-white/10 flex flex-col justify-center print:bg-slate-50 relative">
                  <Quote className="w-10 h-10 text-[#F06C22] absolute top-2 right-4 opacity-10" />
                  <p className="text-base md:text-lg font-black italic uppercase tracking-tight leading-tight text-white print:text-[#0A2E46] max-w-[90%]">
                    "{report.attendance.narrative || `Incredible work, ${client.firstName}. Your dedication to this clinical protocol is exactly what drives meaningful biological change.`}"
                  </p>
                </div>
              </div>
            </header>

            {/* 2. THE TROPHIES: HIGHLIGHTED MOVEMENTS */}
            <section className="space-y-3 print:break-inside-avoid">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                  <TrendingUp className="w-3.5 h-3.5 text-[#F06C22]" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FAF9F6] print:text-[#0A2E46]">Elite Strength Progress</h3>
                </div>
                <div className="h-px bg-white/10 flex-1 print:bg-slate-100"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {report.highlights.map((h, i) => (
                  <div key={i} className="bg-white p-4 rounded-[25px] shadow-xl flex flex-col items-center justify-between min-h-[140px] border border-slate-50 print:border-slate-200 relative group overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                      <Award className="w-16 h-16 text-[#0A2E46]" />
                    </div>
                    <div className="bg-[#0A2E46] text-white px-3 py-1 rounded-full font-black text-[8px] uppercase tracking-[0.2em] mb-1 shadow-md">
                      {h.label || 'Movement'}
                    </div>
                    <div className="flex flex-col items-center text-center relative z-10">
                      <p className="text-4xl font-black text-[#F06C22] italic tracking-tighter drop-shadow-sm">+{h.percentageIncrease || 0}%</p>
                      <p className="text-[8px] font-black text-[#68717A] uppercase tracking-[0.25em] mt-0.5">Force Output Gain</p>
                    </div>
                    <div className="mt-2 text-center border-t border-slate-100 w-full pt-1.5">
                      <p className="text-[8px] font-bold text-[#0A2E46] uppercase tracking-tight">
                        <span className="opacity-40">Prev:</span> {h.startValue} • <span className="text-[#F06C22]">Cur: {h.currentValue}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 3. REINSTATED 4 P'S MATRIX - THE CENTERPIECE */}
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#F06C22] shrink-0">Methodology Mastery: The 4 P's</h3>
                <div className="h-px bg-[#F06C22]/20 flex-1 print:bg-slate-100"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <PIndicator 
                  score={report.performanceMatrix.posture.score}
                  label="Posture"
                  icon={Binary}
                  talkingPoints={report.performanceMatrix.posture.talkingPoints}
                />
                <PIndicator 
                  score={report.performanceMatrix.pace.score}
                  label="Pace"
                  icon={Flame}
                  talkingPoints={report.performanceMatrix.pace.talkingPoints}
                />
                <PIndicator 
                  score={report.performanceMatrix.path.score}
                  label="Path"
                  icon={MapIcon}
                  talkingPoints={report.performanceMatrix.path.talkingPoints}
                />
                <PIndicator 
                  score={report.performanceMatrix.purpose.score}
                  label="Purpose"
                  icon={Crosshair}
                  talkingPoints={report.performanceMatrix.purpose.talkingPoints}
                />
              </div>
            </section>

            {/* 4. STRATEGIC ANCHOR */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-3 print:break-inside-avoid">
              <div className="bg-[#FAF9F6] p-4 rounded-[25px] shadow-lg print:border print:border-slate-100 border border-slate-100 relative group">
                <Quote className="w-8 h-8 text-[#F06C22]/10 absolute top-4 right-4" />
                <div className="space-y-2 relative z-10">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Target className="w-3 h-3 text-[#F06C22]" />
                    <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-[#68717A]">The Core Objective</h4>
                  </div>
                  <div className="border-l-3 border-[#F06C22] pl-3 py-0.5">
                    <p className="text-base md:text-lg font-black italic tracking-tighter text-[#0A2E46] leading-tight">
                      "{report.milestones.originalWhy || "To build enough functional strength to easily keep up with my grandkids without back pain."}"
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-[#0A2E46] p-4 rounded-[25px] shadow-lg border border-white/10 relative overflow-hidden print:bg-slate-50 print:border-slate-100">
                <div className="absolute top-0 right-0 p-2 opacity-5">
                  <FileText className="w-16 h-16 text-white" />
                </div>
                <div className="space-y-2 relative z-10">
                  <div className="flex items-center gap-2">
                    <Zap className="w-3 h-3 text-[#F06C22]" />
                    <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-[#F06C22]">6-Month Roadmap</h4>
                  </div>
                  <div className="bg-white/5 rounded-xl px-3 py-2 print:bg-white print:border print:border-slate-100">
                    <p className="text-[10px] font-bold text-white/90 leading-relaxed uppercase tracking-tight print:text-slate-800">
                      <span className="text-[#F06C22] mr-1">[Rx]</span> {report.strategy.focusAreas || `Transition to Routine B to ensure your 'Why' becomes a permanent reality.`}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* 5. NOTES & FOOTER */}
            <div className="grid grid-cols-3 gap-4 items-stretch print:break-inside-avoid">
              <div className="col-span-2 bg-[#FAF9F6] p-3 rounded-[20px] border border-slate-100 print:border-slate-200 relative">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-3 h-3 text-[#F06C22]" />
                  <h4 className="text-[8px] font-black uppercase tracking-[0.3em] text-[#0A2E46]">Summative Analysis</h4>
                </div>
                <div className="bg-white rounded-xl p-2 shadow-inner min-h-[50px] print:p-0 print:bg-transparent print:shadow-none">
                  <p className="text-[10px] font-medium italic text-[#0A2E46] leading-relaxed print:text-black">
                    {report.trainerNotes || "Incredible work this quarter. Your neurological adaptations are now clearly visible in the data. Your force output is reaching peak clinical efficiency. Keep showing up."}
                  </p>
                </div>
              </div>
              <div className="col-span-1 flex flex-col justify-end text-right space-y-2 pb-2">
                <div className="space-y-1">
                  <div className="text-[7px] font-black uppercase tracking-[0.3em] text-[#68717A] mb-1">
                    Document Ref: MSF-{report.id?.slice(-8).toUpperCase() || 'SYSTEM-NEW'}
                  </div>
                  <div className="h-px bg-[#F06C22]/20 w-3/4 ml-auto" />
                  <div className="text-[12px] font-black italic text-[#F06C22] uppercase tracking-[0.2em] leading-none pt-1">
                    Max Strength <br />
                    Professional
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Selection view handled at start

  // Editing view (Standard form-based UI but matching themes)
  return (
    <div className="min-h-screen bg-[#0A2E46] p-4 sm:p-8 lg:p-12 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-8 pb-32">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 no-print print:hidden sticky top-4 z-50">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack} className="text-white hover:bg-white/10 rounded-2xl w-10 h-10 print:hidden">
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div>
              <h1 className="text-xl font-black uppercase italic tracking-tighter text-white">Refining Report</h1>
              <p className="text-[10px] font-bold text-[#68717A] uppercase tracking-widest mt-0.5">{client.firstName}'s Performance Data</p>
            </div>
          </div>
          <div className="flex gap-3 w-full sm:w-auto print:hidden">
            <Button 
              variant="outline" 
              onClick={() => handleSave('Draft')} 
              disabled={saving}
              className="flex-1 sm:flex-none text-white border-white/20 hover:bg-white/5 rounded-2xl font-black uppercase tracking-widest h-12 print:hidden"
            >
              Save Draft
            </Button>
            <Button 
              onClick={() => handleSave('Finalized')}
              disabled={saving}
              className="flex-1 sm:flex-none bg-[#F06C22] hover:bg-[#D95B16] text-white rounded-2xl font-black uppercase tracking-widest h-12 shadow-lg shadow-[#F06C22]/20 print:hidden"
            >
              Finalize Report
            </Button>
          </div>
        </header>

        <div className="space-y-8">
          {/* Section 1: Attendance */}
          <section className="bg-white rounded-[40px] p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-[#F06C22]" />
            <div className="flex items-center gap-3 mb-8">
              <Calendar className="w-6 h-6 text-[#F06C22]" />
              <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#0A2E46]">Attendance & Dedication</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-[#68717A]">Total Sessions</Label>
                    <Input 
                      type="number"
                      value={report.attendance.totalSessions}
                      onChange={(e) => setReport({ ...report, attendance: { ...report.attendance, totalSessions: parseInt(e.target.value) || 0 }})}
                      className="h-12 rounded-xl font-black text-lg border-2 border-slate-100 focus:border-[#F06C22] transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-[#68717A]">Scale (0-100)</Label>
                    <Input 
                      type="number"
                      value={report.attendance.score}
                      onChange={(e) => setReport({ ...report, attendance: { ...report.attendance, score: parseInt(e.target.value) || 0 }})}
                      className="h-12 rounded-xl font-black text-lg border-2 border-slate-100 focus:border-[#F06C22] transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-[#68717A]">Punctuality Pattern</Label>
                  <Input 
                    value={report.attendance.punctuality}
                    onChange={(e) => setReport({ ...report, attendance: { ...report.attendance, punctuality: e.target.value }})}
                    className="h-12 rounded-xl font-medium border-2 border-slate-100 focus:border-[#F06C22] transition-all"
                    placeholder="e.g. Consistently 5 mins early"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-[#68717A]">Trainer Narrative (The Vibe)</Label>
                <Textarea 
                  value={report.attendance.narrative}
                  onChange={(e) => setReport({ ...report, attendance: { ...report.attendance, narrative: e.target.value }})}
                  className="min-h-[140px] rounded-3xl font-medium border-2 border-slate-100 focus:border-[#F06C22] transition-all p-4 print:border-none print:p-0 print:bg-transparent"
                  placeholder="Celebrate their wins and consistency here..."
                />
              </div>
            </div>
          </section>

          {/* Section 2: Highlights */}
          <section className="bg-white rounded-[40px] p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-[#0A2E46]" />
            <div className="flex items-center gap-3 mb-8">
              <Award className="w-6 h-6 text-[#0A2E46]" />
              <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#0A2E46]">Highlighted Movements</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {report.highlights.map((h, i) => (
                <button 
                  key={i} 
                  onClick={() => setSelectingHighlightIdx(i)}
                  className="flex flex-col p-6 rounded-3xl border-2 border-slate-100 hover:border-[#F06C22] hover:bg-[#F06C22]/[0.02] transition-all text-left group"
                >
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#68717A] mb-4">Slot #{i+1}</p>
                  <h4 className="text-lg font-black uppercase italic tracking-tighter text-[#0A2E46] truncate group-hover:text-[#F06C22] transition-colors">
                    {h.label || 'Select Machine'}
                  </h4>
                  <p className="text-3xl font-black text-[#68717A] mt-2 italic group-hover:text-[#F06C22]">
                    {h.currentValue || '0'}
                  </p>
                </button>
              ))}
            </div>
          </section>

          {/* Section 3: Performance Matrix */}
          <section className="bg-white rounded-[40px] p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-[#68717A]" />
            <div className="flex items-center gap-3 mb-8">
              <LayoutGrid className="w-6 h-6 text-[#68717A]" />
              <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#0A2E46]">Clinical Performance Matrix</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {(['posture', 'pace', 'path', 'purpose'] as const).map((p) => (
                <div key={p} className="space-y-4">
                  <div className="flex justify-between items-end">
                    <Label className="text-[12px] font-black uppercase tracking-widest text-[#0A2E46]">{p}</Label>
                    <span className="text-xs font-black text-[#F06C22]">{Math.round(report.performanceMatrix[p].score / 20) || 1}/5</span>
                  </div>
                  <Slider 
                    value={[report.performanceMatrix[p].score]} 
                    max={100} 
                    onValueChange={(v) => {
                      const val = Array.isArray(v) ? v[0] : v;
                      setReport(prev => ({
                        ...prev,
                        performanceMatrix: {
                          ...prev.performanceMatrix,
                          [p]: { ...prev.performanceMatrix[p], score: val }
                        }
                      }));
                    }}
                    className="cursor-pointer"
                  />
                  <div className="flex flex-wrap gap-2">
                    {report.performanceMatrix[p].talkingPoints.map((tp, tpIdx) => (
                      <Badge 
                        key={tp.id} 
                        variant="outline"
                        onClick={() => {
                          const statuses: ('red' | 'black' | 'green')[] = ['black', 'green', 'red'];
                          const nextStatus = statuses[(statuses.indexOf(tp.status) + 1) % 3];
                          const newTPs = [...report.performanceMatrix[p].talkingPoints];
                          newTPs[tpIdx].status = nextStatus;
                          setReport({
                            ...report,
                            performanceMatrix: {
                              ...report.performanceMatrix,
                              [p]: { ...report.performanceMatrix[p], talkingPoints: newTPs }
                            }
                          });
                        }}
                        className={cn(
                          "cursor-pointer px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.05em] transition-all",
                          tp.status === 'green' ? "bg-emerald-500 text-white border-emerald-500" :
                          tp.status === 'red' ? "bg-red-500 text-white border-red-500" :
                          "bg-slate-100 text-slate-500 border-slate-200"
                        )}
                      >
                        {tp.text}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 4: Roadmap */}
          <section className="bg-white rounded-[40px] p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-[#F06C22]" />
            <div className="flex items-center gap-3 mb-8">
              <MapIcon className="w-6 h-6 text-[#F06C22]" />
              <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#0A2E46]">Strategic Roadmap</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-[#68717A]">Your Original Why</Label>
                <Textarea 
                  value={report.milestones.originalWhy}
                  onChange={(e) => setReport({ ...report, milestones: { ...report.milestones, originalWhy: e.target.value }})}
                  className="min-h-[80px] rounded-3xl font-medium border-2 border-slate-100 focus:border-[#F06C22] transition-all p-4 print:border-none print:p-0 print:bg-transparent"
                  placeholder="Emotional anchor..."
                />
              </div>
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-[#68717A]">The 6-Month Plan</Label>
                <Textarea 
                  value={report.strategy.focusAreas}
                  onChange={(e) => setReport({ ...report, strategy: { ...report.strategy, focusAreas: e.target.value }})}
                  className="min-h-[80px] rounded-3xl font-medium border-2 border-slate-100 focus:border-[#F06C22] transition-all p-4 print:border-none print:p-0 print:bg-transparent"
                  placeholder="How will we anchor the results over the next half year?"
                />
              </div>
            </div>
          </section>

          {/* Section 5: Trainer Notes */}
          <section className="bg-white rounded-[40px] p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-[#0A2E46]" />
            <div className="flex items-center gap-3 mb-8">
              <FileText className="w-6 h-6 text-[#0A2E46]" />
              <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#0A2E46]">Closing Trainer Notes</h2>
            </div>
            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase tracking-widest text-[#68717A]">Lead Practitioner Wrap-Up</Label>
              <Textarea 
                value={report.trainerNotes}
                onChange={(e) => setReport({ ...report, trainerNotes: e.target.value })}
                className="min-h-[120px] rounded-3xl font-medium border-2 border-slate-100 focus:border-[#F06C22] transition-all p-4 print:border-none print:p-0 print:bg-transparent"
                placeholder="Incredible work this quarter... Keep showing up."
              />
            </div>
          </section>
        </div>
      </div>

      {/* Machine Selection Overlay */}
      <Dialog open={selectingHighlightIdx !== null} onOpenChange={() => setSelectingHighlightIdx(null)}>
        <DialogContent className="max-w-2xl rounded-[40px] p-0 overflow-hidden border-none shadow-2xl flex flex-col max-h-[85vh] print:hidden">
          <DialogHeader className="bg-[#0A2E46] p-8 text-white shrink-0">
            <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter">Select Highlight Unit</DialogTitle>
            <DialogDescription className="text-white/40 font-bold uppercase text-[10px] tracking-widest"> Choose a machine to feature in slot #{selectingHighlightIdx !== null ? selectingHighlightIdx + 1 : ''} </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50">
            {machines.map((m) => {
              const history = machineHistory[m.id!];
              return (
                <button
                  key={m.id}
                  onClick={() => handleMachineSelect(m)}
                  className="flex items-center justify-between p- aggregation-4 p-5 rounded-[30px] bg-white border-2 border-transparent hover:border-[#F06C22] transition-all text-left shadow-sm hover:shadow-md group"
                >
                  <div>
                    <p className="font-black uppercase italic tracking-tight text-[#0A2E46] group-hover:text-[#F06C22] transition-colors">{m.name}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{m.order} • Standard Protocol</p>
                  </div>
                  {history && (
                    <div className="text-right">
                      <p className="text-[14px] font-black italic text-[#0A2E46] leading-none mb-1">{history.currentWeight} lbs</p>
                      <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Current Max</p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
