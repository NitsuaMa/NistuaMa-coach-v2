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
      focusAreas: ''
    },
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
            currentValue: `${d.currentWeight} lbs`
          })).concat(Array(3 - deltas.length).fill({ label: '', startValue: '', currentValue: '', featuredMetric: 'weight' })).slice(0, 3)
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
      currentValue: d ? `${d.currentWeight} lbs` : '—'
    };
    
    setReport({ ...report, highlights: newHighlights });
    setSelectingHighlightIdx(null);
  };

  // Helper for 1-5 scale indicators
  const PIndicator = ({ 
    score, 
    label, 
    description, 
    icon: Icon 
  }: { 
    score: number, 
    label: string, 
    description: string,
    icon: any
  }) => {
    const scaleValue = Math.round(score / 20) || 1; // Map 0-100 to 1-5
    const isHigh = scaleValue >= 4;
    
    return (
      <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 hover:border-white/20 transition-all group">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center transition-colors",
              isHigh ? "bg-[#F06C22]/10 text-[#F06C22]" : "bg-slate-700/30 text-slate-400"
            )}>
              <Icon className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-black uppercase tracking-[0.15em] text-[#FAF9F6]">{label}</h4>
          </div>
          <span className={cn(
            "text-lg font-black italic",
            isHigh ? "text-[#F06C22]" : "text-[#68717A]"
          )}>{scaleValue}</span>
        </div>
        
        <div className="flex gap-1.5 mb-4">
          {[1, 2, 3, 4, 5].map((step) => (
            <div 
              key={step} 
              className={cn(
                "h-2.5 flex-1 rounded-full transition-all duration-500",
                step <= scaleValue 
                  ? (isHigh ? "bg-[#F06C22] shadow-[0_0_15px_rgba(240,108,34,0.4)]" : "bg-[#68717A]") 
                  : "bg-white/5"
              )}
            />
          ))}
        </div>
        
        <p className="text-[10px] font-bold text-[#68717A] uppercase leading-relaxed tracking-wider group-hover:text-slate-300 transition-colors">
          {description}
        </p>
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
      <div className="min-h-screen bg-[#0A2E46] text-[#FAF9F6] selection:bg-[#F06C22]/30 selection:text-white">
        <style>{`
          @media print {
            body { background: white !important; color: black !important; }
            .print-area { padding: 0 !important; max-width: none !important; background: white !important; }
            .no-print { display: none !important; }
            .report-card { border: 1px solid #eee !important; box-shadow: none !important; background: white !important; color: black !important; padding: 40px !important; border-radius: 0 !important; }
            .bg-[#0A2E46] { background: white !important; }
            .text-[#FAF9F6], .text-white { color: #0A2E46 !important; }
            .text-[#68717A] { color: #666 !important; }
            .bg-white\\/5 { background: #f8f8f8 !important; border: 1px solid #eee !important; }
            .shadow-2xl, .shadow-xl { box-shadow: none !important; }
            .border-white\\/10 { border-color: #eee !important; }
            .text-[#F06C22] { color: #D95B16 !important; font-weight: 900 !important; }
          }
        `}</style>

        <div className="max-w-4xl mx-auto px-6 py-12 space-y-12 print-area">
          {/* Controls */}
          <div className="flex justify-between items-center no-print mb-8">
            <Button variant="ghost" onClick={onBack} className="text-white hover:bg-white/10 rounded-2xl gap-2 font-black uppercase italic tracking-widest px-6">
              <ArrowLeft className="w-5 h-5" /> Back
            </Button>
            <div className="flex gap-3">
              <Button onClick={() => setMode('editing')} variant="outline" className="text-white border-white/20 hover:bg-white/5 rounded-2xl gap-2 font-black uppercase italic tracking-widest px-6">
                Edit Data
              </Button>
              <Button onClick={() => window.print()} className="bg-[#F06C22] hover:bg-[#D95B16] text-white rounded-2xl gap-2 font-black uppercase italic tracking-widest px-8 shadow-lg shadow-[#F06C22]/20">
                <Printer className="w-5 h-5" /> Print Report
              </Button>
            </div>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="report-card space-y-12"
          >
            {/* 1. HERO HEADER: ATTENDANCE & DEDICATION */}
            <motion.header 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between border-b-4 border-[#F06C22] pb-8 gap-6">
                <div>
                  <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter leading-none mb-4">
                    Performance <br />
                    <span className="text-[#F06C22]">Report Card</span>
                  </h1>
                  <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-[0.3em] text-[#68717A]">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-[#F06C22]" /> 
                      {client.firstName} {client.lastName}
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#F06C22]" />
                      {new Date(report.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[#68717A] mb-2">Authenticated By</p>
                  <p className="text-lg font-black uppercase italic tracking-tight">{trainer.fullName}</p>
                  <p className="text-[10px] font-bold text-[#F06C22] uppercase tracking-widest mt-1">Lead Practitioner • MSF Studio</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 bg-[#F06C22] p-8 rounded-[40px] text-white flex flex-col justify-center items-center text-center shadow-2xl shadow-[#F06C22]/20">
                  <Award className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-5xl font-black italic tracking-tighter mb-1">{report.attendance.totalSessions}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Sessions Completed</p>
                </div>
                <div className="md:col-span-2 bg-white/5 backdrop-blur-md p-8 rounded-[40px] border border-white/10 flex flex-col justify-center">
                  <Quote className="w-8 h-8 text-[#F06C22] mb-4 opacity-30" />
                  <p className="text-xl md:text-2xl font-black italic uppercase italic tracking-tight leading-snug">
                    "{report.attendance.narrative || `Incredible work, ${client.firstName}. Your dedication to this clinical protocol is exactly what drives meaningful biological change.`}"
                  </p>
                </div>
              </div>
            </motion.header>

            {/* 2. THE TROPHIES: HIGHLIGHTED MOVEMENTS */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-4">
                <h3 className="text-2xl font-black uppercase italic tracking-tighter shrink-0">Highlighted Movements</h3>
                <div className="h-px bg-white/10 flex-1"></div>
              </div>
              <div className="flex flex-col md:flex-row gap-6">
                {report.highlights.map((h, i) => (
                  <div key={i} className="flex-1 bg-white p-8 rounded-[40px] shadow-2xl flex flex-col items-center justify-between min-h-[220px] group hover:scale-[1.02] transition-all">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#0A2E46] opacity-60 group-hover:opacity-100 mb-2">{h.label || 'Movement'}</p>
                    <div className="flex flex-col items-center">
                      <p className="text-5xl font-black text-[#F06C22] italic tracking-tighter">{h.currentValue?.replace(' lbs', '') || '—'}</p>
                      <p className="text-[10px] font-black text-[#0A2E46]/40 uppercase tracking-widest mt-1">Pounds Displaced</p>
                    </div>
                    <div className="mt-4 px-4 py-1.5 bg-[#0A2E46]/5 rounded-full">
                      <p className="text-[9px] font-black text-[#0A2E46] uppercase tracking-widest">Personal Performance High</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* 3. THE CLINICAL MATRIX: THE 4 P'S */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="space-y-8"
            >
              <div className="flex items-center gap-4">
                <h3 className="text-2xl font-black uppercase italic tracking-tighter shrink-0">The 4 P's: Technical Proficiency</h3>
                <div className="h-px bg-white/10 flex-1"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                <PIndicator 
                  score={report.performanceMatrix.posture.score}
                  label="Posture"
                  description="Maintaining ribcage stability and foundational setup throughout the loading phase."
                  icon={Binary}
                />
                <PIndicator 
                  score={report.performanceMatrix.pace.score}
                  label="Pace"
                  description="Controlling the negative and maintaining a constant velocity under accumulated fatigue."
                  icon={Flame}
                />
                <PIndicator 
                  score={report.performanceMatrix.path.score}
                  label="Path"
                  description="Optimizing the line of pull and range of motion to maximize target fiber tension."
                  icon={MapIcon}
                />
                <PIndicator 
                  score={report.performanceMatrix.purpose.score}
                  label="Purpose"
                  description="Intentional execution and motor unit recruitment as you approach the clinical stimulus."
                  icon={Crosshair}
                />
              </div>
            </motion.section>

            {/* 4. THE ROADMAP: THE GOAL & THE PLAN */}
            <motion.section 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="bg-[#FAF9F6] p-10 rounded-[50px] shadow-2xl relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Target className="w-48 h-48 text-[#0A2E46]" />
              </div>
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Target className="w-4 h-4 text-[#F06C22]" />
                    </div>
                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-[#0A2E46]">The Milestone</h4>
                  </div>
                  <p className="text-2xl md:text-3xl font-black italic tracking-tighter text-[#0A2E46] leading-tight">
                    {report.milestones.smartGoal || "Achieve total mastery and load progression across current split."}
                  </p>
                  <div className="h-1 w-12 bg-[#F06C22]"></div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#0A2E46]/10 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-[#0A2E46]" />
                    </div>
                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-[#0A2E46]">The Strategy</h4>
                  </div>
                  <p className="text-sm font-bold text-[#68717A] leading-relaxed uppercase tracking-tight">
                    {report.strategy.focusAreas || `${trainer.fullName} will implement a clinical load-progression strategy focused on ${report.strategy.primaryPlan}. Expect high-density stimulus in upcoming blocks.`}
                  </p>
                </div>
              </div>
              <div className="mt-12 pt-8 border-t border-[#0A2E46]/10 flex justify-between items-center">
                <div className="flex items-center gap-6">
                  <div className="text-[8px] font-black uppercase tracking-[0.3em] text-[#68717A]">
                    Authorized MSF Document
                  </div>
                  <div className="text-[8px] font-black uppercase tracking-[0.3em] text-[#68717A]">
                    Unit ID: {report.id?.slice(-8).toUpperCase() || 'NEW'}
                  </div>
                </div>
                <div className="text-[10px] font-black italic text-[#F06C22] uppercase tracking-[0.2em]">
                  Max Strength Fitness
                </div>
              </div>
            </motion.section>
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
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 no-print sticky top-4 z-50">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack} className="text-white hover:bg-white/10 rounded-2xl w-10 h-10">
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div>
              <h1 className="text-xl font-black uppercase italic tracking-tighter text-white">Refining Report</h1>
              <p className="text-[10px] font-bold text-[#68717A] uppercase tracking-widest mt-0.5">{client.firstName}'s Performance Data</p>
            </div>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <Button 
              variant="outline" 
              onClick={() => handleSave('Draft')} 
              disabled={saving}
              className="flex-1 sm:flex-none text-white border-white/20 hover:bg-white/5 rounded-2xl font-black uppercase tracking-widest h-12"
            >
              Save Draft
            </Button>
            <Button 
              onClick={() => handleSave('Finalized')}
              disabled={saving}
              className="flex-1 sm:flex-none bg-[#F06C22] hover:bg-[#D95B16] text-white rounded-2xl font-black uppercase tracking-widest h-12 shadow-lg shadow-[#F06C22]/20"
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
                  className="min-h-[140px] rounded-3xl font-medium border-2 border-slate-100 focus:border-[#F06C22] transition-all p-4"
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
                <Label className="text-[10px] font-black uppercase tracking-widest text-[#68717A]">The Primary Milestone</Label>
                <Textarea 
                  value={report.milestones.smartGoal}
                  onChange={(e) => setReport({ ...report, milestones: { ...report.milestones, smartGoal: e.target.value }})}
                  className="min-h-[100px] rounded-3xl font-medium border-2 border-slate-100 focus:border-[#F06C22] transition-all p-4"
                  placeholder="What is the next tangible target?"
                />
              </div>
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-[#68717A]">MSF Operational Plan</Label>
                <Textarea 
                  value={report.strategy.focusAreas}
                  onChange={(e) => setReport({ ...report, strategy: { ...report.strategy, focusAreas: e.target.value }})}
                  className="min-h-[100px] rounded-3xl font-medium border-2 border-slate-100 focus:border-[#F06C22] transition-all p-4"
                  placeholder="How will we anchor the results?"
                />
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Machine Selection Overlay */}
      <Dialog open={selectingHighlightIdx !== null} onOpenChange={() => setSelectingHighlightIdx(null)}>
        <DialogContent className="max-w-2xl rounded-[40px] p-0 overflow-hidden border-none shadow-2xl flex flex-col max-h-[85vh]">
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
