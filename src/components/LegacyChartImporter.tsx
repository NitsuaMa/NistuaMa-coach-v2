import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  X, 
  Scan, 
  CheckCircle2, 
  AlertTriangle, 
  History, 
  FileText, 
  ArrowRight,
  Edit2,
  Trash2,
  Calendar,
  User,
  Activity,
  Dumbbell,
  Copy,
  Plus
} from 'lucide-react';
import { Client, Machine, Trainer, WorkoutSession, ExerciseLog } from '../types';
import { processLegacyChart, ExtractedSession } from '../services/geminiService';
import { db } from '../firebase';
import { collection, writeBatch, doc, serverTimestamp, getDocs, query, where, increment } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ImporterProps {
  clients: Client[];
  machines: Machine[];
  trainers: Trainer[];
  initialClientId?: string;
  onComplete?: () => void;
}

interface ValidationLog {
  id: string;
  name: string;
  weight: number;
  reps: number | null;
  repsLeft?: number;
  repsRight?: number;
  isTSC: boolean;
  machineId?: string;
  isAnomalous?: boolean;
  anomalyReason?: string;
}

interface ValidationSession {
  id: string;
  sessionNumber: number;
  date: string;
  trainer: string;
  trainerId?: string;
  machines: ValidationLog[];
}

export function LegacyChartImporter({ clients, machines, trainers, initialClientId, onComplete }: ImporterProps) {
  const [selectedClientId, setSelectedClientId] = useState<string>(initialClientId || '');
  const [files, setFiles] = useState<{ name: string; base64: string; mimeType: string; previewUrl: string }[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState('');
  const [validationSessions, setValidationSessions] = useState<ValidationSession[]>([]);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement> | { target: { files: FileList | null } }) => {
    const files = e.target.files;
    if (files) {
      (Array.from(files) as File[]).forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64Content = (event.target?.result as string).split(',')[1];
          setFiles(prev => [...prev, {
            name: file.name,
            base64: base64Content,
            mimeType: file.type,
            previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : ''
          }]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const runOCR = async () => {
    if (!selectedClientId || files.length === 0) return;

    setIsScanning(true);
    setScanProgress('Waking Vision Engine...');
    setValidationSessions([]);

    try {
      const allExtracted: ExtractedSession[] = [];

      for (const file of files) {
        setScanProgress(`Analyzing ${file.name}...`);
        const result = await processLegacyChart(file.base64, file.mimeType);
        allExtracted.push(...result);
      }

      // Map and identify anomalies
      let mappedSessions: ValidationSession[] = allExtracted.map((s, sIdx) => {
        // Resolve trainer
        const trainerMatch = trainers.find(t => 
          t.initials.toLowerCase() === s.trainer.toLowerCase() || 
          t.fullName.toLowerCase().includes(s.trainer.toLowerCase())
        );

        return {
          id: `v-sess-${sIdx}-${Date.now()}`,
          sessionNumber: s.sessionNumber,
          date: s.date,
          trainer: s.trainer,
          trainerId: trainerMatch?.id,
          machines: s.machines.map((m, mIdx) => {
            const machineMatch = machines.find(mach => 
              mach.name.toLowerCase() === m.name.toLowerCase() ||
              m.name.toLowerCase().includes(mach.name.toLowerCase())
            );

            // Initial Anomaly Detection: Basic checks
            let isAnomalous = false;
            let anomalyReason = '';
            if (m.weight > 500) {
              isAnomalous = true;
              anomalyReason = 'Extreme Weight Detected';
            }
            // Flag if both weight AND reps are 0/null
            if ((!m.weight || m.weight === 0) && (!m.reps || m.reps === 0) && !m.repsLeft && !m.repsRight) {
              isAnomalous = true;
              anomalyReason = 'Missing Performance Data';
            }
            if (m.reps !== null && m.reps > 40 && !m.isTSC) {
              isAnomalous = true;
              anomalyReason = 'High Reps (Non-TSC)';
            }
            if (!machineMatch) {
              isAnomalous = true;
              anomalyReason = 'Unknown Machine';
            }

            return {
              id: `v-log-${sIdx}-${mIdx}-${Date.now()}`,
              name: m.name,
              weight: m.weight,
              reps: m.reps,
              repsLeft: m.repsLeft,
              repsRight: m.repsRight,
              isTSC: m.isTSC,
              machineId: machineMatch?.id,
              isAnomalous,
              anomalyReason
            };
          })
        };
      });

      // Sort by date before cross-session analysis
      mappedSessions.sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());

      // Second pass: Weight Anomaly Detection (Comparison with previous sessions)
      mappedSessions = mappedSessions.map((session, sIdx) => {
        if (sIdx === 0) return session; // No previous session to compare to

        return {
          ...session,
          machines: session.machines.map(log => {
            if (!log.machineId) return log;

            // Find this machine in previous sessions
            let prevWeight = -1;
            for (let i = sIdx - 1; i >= 0; i--) {
              const prevLog = mappedSessions[i].machines.find(m => m.machineId === log.machineId);
              if (prevLog && prevLog.weight > 0) {
                prevWeight = prevLog.weight;
                break;
              }
            }

            if (prevWeight !== -1) {
              const weightDiff = Math.abs(log.weight - prevWeight);
              if (weightDiff > 10) {
                return {
                  ...log,
                  isAnomalous: true,
                  anomalyReason: log.anomalyReason 
                    ? `${log.anomalyReason} | Weight Jump: ${weightDiff}lb` 
                    : `Weight Jump: ${weightDiff}lb`
                };
              }
            }

            return log;
          })
        };
      });

      setValidationSessions(mappedSessions);
      setScanProgress('OCR Pipeline Complete');
    } catch (err) {
      console.error(err);
      setScanProgress('Engine Failure: Check Logs');
    } finally {
      setIsScanning(false);
    }
  };

  const updateLogData = (sessionId: string, logId: string, field: string, value: any) => {
    setValidationSessions(prev => prev.map(s => {
      if (s.id !== sessionId) return s;
      return {
        ...s,
        machines: s.machines.map(l => {
          if (l.id !== logId) return l;
          return { ...l, [field]: value };
        })
      };
    }));
  };

  const duplicateLog = (sessionId: string, logId: string) => {
    setValidationSessions(prev => prev.map(s => {
      if (s.id !== sessionId) return s;
      const logToDup = s.machines.find(l => l.id === logId);
      if (!logToDup) return s;
      
      const newLog = { 
        ...logToDup, 
        id: `v-log-dup-${Date.now()}-${Math.random()}`,
        name: logToDup.name.includes('(Set 2)') ? logToDup.name : `${logToDup.name} (Set 2)`
      };
      
      return {
        ...s,
        machines: [...s.machines, newLog]
      };
    }));
  };

  const finalizeImport = async () => {
    if (!selectedClientId || isFinalizing) return;
    setIsFinalizing(true);

    try {
      const batch = writeBatch(db);
      
      // We need to fetch existing sessions to ensure sessionNumber doesn't conflict?
      // Or just append. User said "completely reconstructing their performance history".
      
      for (const vSess of validationSessions) {
        const sessionRef = doc(collection(db, 'sessions'));
        const sessionData: Partial<WorkoutSession> = {
          clientId: selectedClientId,
          sessionType: 'Standard',
          sessionNumber: vSess.sessionNumber,
          date: vSess.date,
          trainerInitials: vSess.trainer,
          trainerId: vSess.trainerId || '',
          status: 'Completed',
          createdAt: serverTimestamp(),
          endTime: serverTimestamp()
        };
        batch.set(sessionRef, sessionData);

        for (const vLog of vSess.machines) {
          if (!vLog.machineId) continue;
          const logRef = doc(collection(db, 'exerciseLogs'));
          const logData: Partial<ExerciseLog> = {
            sessionId: sessionRef.id,
            clientId: selectedClientId,
            machineId: vLog.machineId,
            weight: String(vLog.weight),
            reps: vLog.isTSC ? '' : String(vLog.reps || ''),
            repsLeft: vLog.repsLeft,
            repsRight: vLog.repsRight,
            seconds: vLog.isTSC ? String(vLog.reps || '') : '',
            isTSC: vLog.isTSC,
            isStaticHold: vLog.isTSC,
            repQuality: 3,
            createdAt: serverTimestamp()
          };
          batch.set(logRef, logData);
        }
      }

      // Update client session tally
      const maxSessionNum = validationSessions.length > 0 
        ? Math.max(...validationSessions.map(s => s.sessionNumber)) 
        : 0;
      
      const clientRef = doc(db, 'clients', selectedClientId);
      batch.update(clientRef, {
        completedSessions: increment(validationSessions.length),
        sessionCount: maxSessionNum, // Set to highest imported session number
        updatedAt: serverTimestamp()
      });

      await batch.commit();
      if (onComplete) onComplete();
    } catch (err) {
      console.error(err);
      alert('Finalization failed. Check Firestore quotas.');
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 p-4 sm:p-6 bg-slate-950 min-h-screen text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic text-white flex items-center gap-2">
            <Scan className="w-8 h-8 text-[#F06C22]" />
            OCR Legacy Pipeline
          </h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
            Multimodal Chart Recognition Engine v3.1
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
            <SelectTrigger className="w-[240px] bg-slate-900 border-slate-800 text-white font-bold h-11">
              <SelectValue placeholder="Select Target Client..." />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 text-white">
              {clients.map(c => (
                <SelectItem key={c.id} value={c.id!} className="hover:bg-slate-800 focus:bg-slate-800">
                  {c.firstName} {c.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {validationSessions.length > 0 && (
            <Button 
              onClick={finalizeImport}
              disabled={isFinalizing || validationSessions.some(s => !s.date)}
              className="bg-[#F06C22] hover:bg-[#F06C22]/90 text-white font-black px-6 h-11 tracking-widest uppercase text-xs disabled:opacity-50"
            >
              {isFinalizing ? 'Committing...' : '[ Finalize & Import Data ]'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Input/Upload */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="bg-[#0A2E46]/30 border-slate-800 overflow-hidden">
            <CardHeader className="bg-slate-900/50 py-3 border-b border-slate-800">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400">
                Data Source Upload
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div 
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  handleFileSelect({ target: { files: e.dataTransfer.files } } as any);
                }}
                className="w-full aspect-video border-2 border-dashed border-slate-700 bg-slate-900/50 rounded-xl flex flex-col items-center justify-center p-6 cursor-pointer hover:border-[#F06C22]/50 hover:bg-slate-800/30 transition-all group"
              >
                <input 
                  type="file" 
                  multiple 
                  accept="image/*,application/pdf" 
                  ref={fileInputRef}
                  className="hidden" 
                  onChange={handleFileSelect}
                />
                <Upload className="w-10 h-10 text-slate-600 group-hover:text-[#F06C22] mb-3 transition-colors" />
                <p className="text-sm font-black text-slate-300 uppercase tracking-tighter">Drop Chart Images</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase mt-2">JPG, PNG, or PDF supported</p>
              </div>

              {files.length > 0 && (
                <div className="mt-6 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Queue ({files.length})</p>
                  <div className="grid grid-cols-2 gap-2">
                    {files.map((file, idx) => (
                      <div key={idx} className="relative group bg-slate-900 border border-slate-800 rounded-lg overflow-hidden aspect-[4/3]">
                        {file.previewUrl ? (
                          <img src={file.previewUrl} className="w-full h-full object-cover opacity-60" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-800">
                            <FileText className="w-8 h-8 text-slate-600" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button onClick={() => removeFile(idx)} className="p-2 bg-red-600/20 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all">
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="absolute bottom-1 left-1 right-1 px-1 py-0.5 bg-black/50 backdrop-blur-sm rounded text-[8px] font-bold truncate">
                          {file.name}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <Button 
                    variant="outline"
                    className="w-full border-slate-700 bg-slate-900 text-white font-bold h-12 mt-4 hover:bg-slate-800"
                    onClick={runOCR}
                    disabled={isScanning || !selectedClientId}
                  >
                    {isScanning ? (
                      <Scan className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Scan className="w-4 h-4 mr-2" />
                    )}
                    {isScanning ? scanProgress : 'INITIALIZE OCR LOGIC'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Validation HUD */}
        <div className="lg:col-span-8 flex flex-col">
          <Card className="bg-[#0A2E46] border-slate-800 flex-1 flex flex-col min-h-[600px] shadow-2xl">
            <CardHeader className="py-4 border-b border-slate-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-widest text-[#F06C22]">
                  Validation HUD
                </CardTitle>
                <CardDescription className="text-[10px] font-bold text-slate-400">
                  Verify extracted patterns before database commit
                </CardDescription>
              </div>
              {validationSessions.length > 0 && (
                <div className="flex gap-4 items-center">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-white uppercase">{validationSessions.length} Sessions</p>
                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">Verified Alignment</p>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0 overflow-hidden flex-1 relative">
              <AnimatePresence mode="wait">
                {validationSessions.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full flex flex-col items-center justify-center p-12 text-center"
                  >
                    <div className="w-20 h-20 bg-slate-900/50 rounded-full flex items-center justify-center mb-6">
                      <History className="w-10 h-10 text-slate-700" />
                    </div>
                    <h3 className="text-lg font-black text-slate-500 uppercase tracking-widest mb-2 italic">Idle - Waiting for Feed</h3>
                    <p className="text-xs text-slate-600 max-w-xs leading-relaxed">
                      Upload high-resolution scans of paper charts to initiate the multimodal clinical extraction pipeline.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 space-y-6 overflow-y-auto max-h-[800px] scrollbar-thin scrollbar-thumb-slate-700"
                  >
                    {validationSessions.map((session) => (
                      <div key={session.id} className="space-y-3">
                        <div className="flex items-center gap-3 bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                          <Badge className="bg-slate-800 text-white border-slate-700 font-black">
                            S#{session.sessionNumber}
                          </Badge>
                          <div className="flex-1 flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                              <Calendar className={cn("w-3 h-3 transition-colors", !session.date ? "text-red-500 animate-pulse" : "text-slate-500")} />
                              <input 
                                type="date"
                                value={session.date}
                                onChange={e => setValidationSessions(prev => prev.map(s => s.id === session.id ? { ...s, date: e.target.value } : s))}
                                className={cn(
                                  "bg-transparent border transition-all text-[10px] font-black uppercase tracking-widest focus:ring-0 px-2 py-1 rounded",
                                  !session.date ? "border-red-500 text-red-500 bg-red-500/10" : "border-transparent text-[#F06C22]"
                                )}
                              />
                            </div>
                            <div className="flex items-center gap-1.5 border-l border-slate-800 pl-4">
                              <User className="w-3 h-3 text-slate-500" />
                              <span className="text-[10px] font-black text-slate-300 uppercase">Trainer:</span>
                              <input 
                                value={session.trainer}
                                onChange={e => setValidationSessions(prev => prev.map(s => s.id === session.id ? { ...s, trainer: e.target.value } : s))}
                                className="bg-transparent border-none text-[10px] font-black text-white uppercase focus:ring-0 w-16"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {session.machines.map((log) => (
                            <div 
                              key={log.id} 
                              className={cn(
                                "p-3 rounded border bg-slate-900 shadow-lg relative group transition-all",
                                log.isAnomalous ? "border-amber-500 bg-amber-500/10" : "border-slate-800 hover:border-slate-700"
                              )}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex-1 mr-2">
                                  <input 
                                    value={log.name} 
                                    onChange={e => updateLogData(session.id, log.id, 'name', e.target.value)}
                                    className="bg-transparent border-none text-[9px] font-black text-white uppercase tracking-tighter w-full focus:ring-0 p-0"
                                  />
                                </div>
                                {log.isAnomalous && (
                                  <div className="group/tip relative cursor-help">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                    <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-amber-600 text-white text-[8px] font-bold rounded shadow-xl opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none z-10">
                                      {log.anomalyReason}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="flex-1">
                                  <label className="text-[7px] font-black text-slate-500 uppercase block mb-1">Weight</label>
                                  <input 
                                    type="number"
                                    value={log.weight}
                                    onChange={e => updateLogData(session.id, log.id, 'weight', parseInt(e.target.value) || 0)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-xs font-black text-white focus:border-[#F06C22] focus:ring-0"
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="text-[7px] font-black text-slate-500 uppercase block mb-1">
                                    {log.isTSC ? 'Secs (TSC)' : 'Reps (Dyn)'}
                                  </label>
                                  <div className="space-y-1">
                                    <input 
                                      type="number"
                                      value={log.reps ?? 0}
                                      onChange={e => updateLogData(session.id, log.id, 'reps', parseInt(e.target.value) || 0)}
                                      className={cn(
                                        "w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-xs font-black focus:ring-0",
                                        log.isTSC ? "text-emerald-400 focus:border-emerald-500" : "text-white focus:border-[#F06C22]"
                                      )}
                                    />
                                    {log.isTSC && (
                                      <Badge variant="outline" className="text-[8px] font-black bg-emerald-500/10 text-emerald-500 border-emerald-500/30 px-1 py-0 h-4">
                                        TSC PROTOCOL (90s)
                                      </Badge>
                                    )}
                                    {log.repsLeft !== undefined && log.repsRight !== undefined && (
                                      <div className="text-[9px] font-black text-slate-400 mt-1 uppercase border-t border-slate-800 pt-1">
                                        L: {log.repsLeft} | R: {log.repsRight}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3">
                                <div className="flex-1 text-[7px] font-black text-slate-500 uppercase tracking-widest bg-slate-950/50 px-2 py-0.5 rounded border border-slate-800">
                                  {log.isAnomalous ? 'Manual Check Req.' : 'Verified Match'}
                                </div>
                                <div className="flex gap-1">
                                  <button 
                                    onClick={() => duplicateLog(session.id, log.id)}
                                    className="p-1 bg-slate-800 text-slate-400 hover:text-[#F06C22] hover:bg-[#F06C22]/10 rounded transition-colors group/dup"
                                    title="Duplicate Entry (e.g. Torso Rotation L/R)"
                                  >
                                    <Copy size={10} />
                                  </button>
                                  <button 
                                    onClick={() => {
                                      setValidationSessions(prev => prev.map(s => {
                                        if (s.id !== session.id) return s;
                                        return {
                                          ...s,
                                          machines: s.machines.filter(l => l.id !== log.id)
                                        };
                                      }))
                                    }}
                                    className="p-1 bg-slate-800 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
