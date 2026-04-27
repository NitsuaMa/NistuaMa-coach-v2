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
            @page { size: portrait; margin: 0.5cm; }
            body { background: white !important; color: black !important; }
            .print-area { padding: 0 !important; margin: 0 !important; max-width: none !important; background: white !important; width: 100% !important; }
            .no-print { display: none !important; }
            .report-card { border: none !important; box-shadow: none !important; background: white !important; color: black !important; padding: 0 !important; border-radius: 0 !important; space-y: 6 !important; }
            .bg-[#0A2E46] { background: white !important; }
            .text-[#FAF9F6], .text-white { color: #0A2E46 !important; }
            .text-[#68717A] { color: #666 !important; }
            .bg-white\\/5 { background: #fdfdfd !important; border: 1px solid #eee !important; }
            .shadow-2xl, .shadow-xl, .shadow-lg { box-shadow: none !important; }
            .border-white\\/10 { border-color: #eee !important; }
            .text-[#F06C22] { color: #D95B16 !important; font-weight: 900 !important; }
            .bg-[#F06C22] { background: #D95B16 !important; color: white !important; }
            .rounded-[40px], .rounded-[50px], .rounded-[60px] { border-radius: 1.5rem !important; }
            h1 { font-size: 2.5rem !important; }
            h2 { font-size: 1.5rem !important; }
            h3 { font-size: 1.25rem !important; }
            p { font-size: 0.875rem !important; }
          }
        `}</style>

        <div className="max-w-4xl mx-auto px-6 py-6 space-y-6 print-area">
          {/* Controls */}
          <div className="flex justify-between items-center no-print mb-4">
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
            className="report-card space-y-6"
          >
            {/* 1. HERO HEADER: ATTENDANCE & DEDICATION */}
            <motion.header 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between border-b-4 border-[#F06C22] pb-4 gap-4">
                <div>
                  <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter leading-none mb-2 print:text-[#0A2E46]">
                    Performance <br />
                    <span className="text-[#F06C22]">Report Card</span>
                  </h1>
                  <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-[0.3em] text-[#68717A]">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-[#F06C22]" /> 
                      {client.firstName} {client.lastName}
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-[#F06C22]" />
                      {new Date(report.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end md:text-right">
                  <p className="text-[8px] font-black uppercase tracking-[0.4em] text-[#68717A] mb-1">Authenticated By</p>
                  <p className="text-base font-black uppercase italic tracking-tight print:text-[#0A2E46]">{trainer.fullName}</p>
                  <p className="text-[9px] font-bold text-[#F06C22] uppercase tracking-widest">Lead Practitioner • MSF Studio</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1 bg-[#F06C22] p-6 rounded-[30px] text-white flex flex-col justify-center items-center text-center shadow-xl shadow-[#F06C22]/20 print:border print:border-[#F06C22]/20">
                  <Award className="w-10 h-10 mb-2 opacity-50" />
                  <p className="text-4xl font-black italic tracking-tighter mb-0.5">{report.attendance.totalSessions}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-80">Sessions Completed Since Joining</p>
                </div>
                <div className="md:col-span-2 bg-white/5 backdrop-blur-md p-6 rounded-[30px] border border-white/10 flex flex-col justify-center print:bg-slate-50">
                  <Quote className="w-6 h-6 text-[#F06C22] mb-2 opacity-30" />
                  <p className="text-lg font-black italic uppercase tracking-tight leading-snug print:text-[#0A2E46]">
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
              className="space-y-4"
            >
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-black uppercase italic tracking-tighter shrink-0 print:text-[#0A2E46]">Highlighted Movements</h3>
                <div className="h-px bg-white/10 flex-1 print:bg-slate-200"></div>
              </div>
              <div className="flex flex-col md:flex-row gap-4">
                {report.highlights.map((h, i) => (
                  <div key={i} className="flex-1 bg-white p-6 rounded-[30px] shadow-xl flex flex-col items-center justify-between min-h-[180px] group border border-slate-50 print:border-slate-200">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#0A2E46] opacity-60 mb-2">{h.label || 'Movement'}</p>
                    <div className="flex flex-col items-center">
                      <p className="text-4xl font-black text-[#F06C22] italic tracking-tighter">+{h.percentageIncrease || 0}% Strength Increase</p>
                      <p className="text-[9px] font-black text-[#68717A] uppercase tracking-widest mt-1">Previous: {h.startValue} | Current: {h.currentValue}</p>
                    </div>
                    <div className="mt-3 px-3 py-1 bg-[#0A2E46]/5 rounded-full">
                      <p className="text-[8px] font-black text-[#0A2E46] uppercase tracking-[0.1em]">Superior Growth Velocity</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* 3. THE ROADMAP: THE GOAL & THE PLAN */}
            <motion.section 
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="bg-[#FAF9F6] p-8 rounded-[40px] shadow-xl relative overflow-hidden group print:border print:border-slate-200"
            >
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Quote className="w-4 h-4 text-[#F06C22]" />
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0A2E46]">Your Original Why</h4>
                  </div>
                  <p className="text-xl font-black italic tracking-tighter text-[#0A2E46] leading-tight">
                    "{report.milestones.originalWhy || "To build enough functional strength to easily keep up with my grandkids without back pain."}"
                  </p>
                  <div className="h-0.5 w-10 bg-[#F06C22]"></div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#0A2E46]" />
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0A2E46]">The 6-Month Plan</h4>
                  </div>
                  <p className="text-xs font-bold text-[#68717A] leading-relaxed uppercase tracking-tight">
                    {report.strategy.focusAreas || `${trainer.fullName} will implement a clinical load-progression strategy focused on ${report.strategy.primaryPlan}. We will transition to Routine B, increasing time-under-tension by 10% to ensure your 'Why' becomes a reality.`}
                  </p>
                </div>
              </div>
            </motion.section>

            {/* 4. TRAINER NOTES */}
            <motion.section 
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white/5 backdrop-blur-sm p-6 rounded-[30px] border border-white/10 print:bg-slate-50 print:border-slate-200"
            >
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-[#F06C22]" />
                <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-[#FAF9F6] print:text-[#0A2E46]">Closing Practitioner Notes</h4>
              </div>
              <p className="text-sm font-medium italic text-[#FAF9F6] opacity-90 leading-relaxed print:text-[#0A2E46]">
                {report.trainerNotes || "Incredible work this quarter. Your focus on pacing has completely transformed your lower body strength. Keep showing up."}
              </p>
            </motion.section>

            <footer className="pt-2 flex justify-between items-center text-[8px] font-black uppercase tracking-[0.3em] text-[#68717A]">
              <div className="flex items-center gap-4">
                <span>Authorized MSF Clinical Document</span>
                <span>Unit ID: {report.id?.slice(-8).toUpperCase() || 'NEW'}</span>
              </div>
              <div className="text-[#F06C22]">Max Strength Fitness Studio</div>
            </footer>
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
                <Label className="text-[10px] font-black uppercase tracking-widest text-[#68717A]">Your Original Why</Label>
                <Textarea 
                  value={report.milestones.originalWhy}
                  onChange={(e) => setReport({ ...report, milestones: { ...report.milestones, originalWhy: e.target.value }})}
                  className="min-h-[80px] rounded-3xl font-medium border-2 border-slate-100 focus:border-[#F06C22] transition-all p-4"
                  placeholder="Emotional anchor..."
                />
              </div>
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-[#68717A]">The 6-Month Plan</Label>
                <Textarea 
                  value={report.strategy.focusAreas}
                  onChange={(e) => setReport({ ...report, strategy: { ...report.strategy, focusAreas: e.target.value }})}
                  className="min-h-[80px] rounded-3xl font-medium border-2 border-slate-100 focus:border-[#F06C22] transition-all p-4"
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
                className="min-h-[120px] rounded-3xl font-medium border-2 border-slate-100 focus:border-[#F06C22] transition-all p-4"
                placeholder="Incredible work this quarter... Keep showing up."
              />
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
