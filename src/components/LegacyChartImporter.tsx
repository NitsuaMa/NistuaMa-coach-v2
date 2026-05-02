import React, { useState, useRef } from 'react';
import { Client, Machine, WorkoutSession, ExerciseLog } from '../types';
import { GoogleGenAI, Type } from '@google/genai';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, writeBatch, doc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, X, Scan, CheckCircle2, ChevronRight, AlertTriangle, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface ImporterProps {
  clients: Client[];
  machines: Machine[];
  onComplete?: () => void;
}

// Ensure unique keys for preview editing
interface PreviewLog {
  id: string; // temporary id for react keys
  machineName: string;
  weight: string;
  reps: string;
  seconds: string;
  isStaticHold: boolean;
  isTSC: boolean;
  repQuality: number;
}

interface PreviewSession {
  id: string; // temporary id
  date: string; // YYYY-MM-DD
  trainerInitials: string;
  logs: PreviewLog[];
}

export function LegacyChartImporter({ clients, machines, onComplete }: ImporterProps) {
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [images, setImages] = useState<{ url: string; base64: string; mimeType: string }[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState('');
  const [previewSessions, setPreviewSessions] = useState<PreviewSession[]>([]);
  const [isInjecting, setIsInjecting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    processFiles(Array.from(e.dataTransfer.files));
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
    }
  };

  const processFiles = (files: File[]) => {
    files.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Data = event.target?.result as string;
        const base64Content = base64Data.split(',')[1];
        setImages(prev => [...prev, {
          url: URL.createObjectURL(file), // for preview
          base64: base64Content,
          mimeType: file.type
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleScan = async () => {
    if (!selectedClientId) {
      alert("Please select a client first.");
      return;
    }
    if (images.length === 0) {
      alert("Please upload at least one image of the chart.");
      return;
    }

    setIsScanning(true);
    setScanProgress('Initializing Vision AI...');
    setPreviewSessions([]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const parts: any[] = images.map(img => ({
        inlineData: {
          data: img.base64,
          mimeType: img.mimeType
        }
      }));

      parts.push({
        text: `You are an expert transcriber digitized physical workout charts.
Extract the workout data across all provided images.
Merge it into a single correctly formatted JSON array of sessions.
CRITICAL:
1. Sort the sessions chronologically by date (oldest to newest).
2. Filter out any duplicate sessions if the photos overlap.
3. Extract each set's machine name, weight, reps, seconds (if applicable), and quality.
4. "isStaticHold" is true if it was predominantly a timed hold (seconds).
5. Ensure the structure cleanly fits the requested schema.`
      });

      setScanProgress('Analyzing multi-page timeline...');
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: { parts },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING, description: "YYYY-MM-DD" },
                trainerInitials: { type: Type.STRING },
                logs: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      machineName: { type: Type.STRING },
                      weight: { type: Type.STRING },
                      reps: { type: Type.STRING },
                      seconds: { type: Type.STRING },
                      isStaticHold: { type: Type.BOOLEAN },
                      isTSC: { type: Type.BOOLEAN },
                      repQuality: { type: Type.NUMBER }
                    },
                    required: ["machineName"]
                  }
                }
              },
              required: ["date", "logs"]
            }
          }
        }
      });

      setScanProgress('Structuring response...');
      const text = response.text || "[]";
      let parsed = JSON.parse(text);

      if (!Array.isArray(parsed)) parsed = [parsed];
      
      const hydratedSessions: PreviewSession[] = parsed.map((s: any, sIdx: number) => ({
        id: `temp_s_${sIdx}_${Date.now()}`,
        date: s.date || new Date().toISOString().split('T')[0],
        trainerInitials: s.trainerInitials || 'AI',
        logs: Array.isArray(s.logs) ? s.logs.map((l: any, lIdx: number) => ({
          id: `temp_l_${sIdx}_${lIdx}_${Date.now()}`,
          machineName: l.machineName || 'Unknown Machine',
          weight: l.weight?.toString() || '',
          reps: l.reps?.toString() || '',
          seconds: l.seconds?.toString() || '',
          isStaticHold: !!l.isStaticHold,
          isTSC: !!l.isTSC,
          repQuality: Number(l.repQuality) || 3
        })) : []
      }));

      // Sort chronological
      hydratedSessions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      setPreviewSessions(hydratedSessions);

    } catch (err) {
      console.error(err);
      alert("Failed to extract data. Check console for details.");
    } finally {
      setIsScanning(false);
      setScanProgress('');
    }
  };

  const updatePreviewLog = (sId: string, lId: string, field: keyof PreviewLog, value: any) => {
    setPreviewSessions(prev => prev.map(s => {
      if (s.id !== sId) return s;
      return {
        ...s,
        logs: s.logs.map(l => {
          if (l.id !== lId) return l;
          return { ...l, [field]: value };
        })
      };
    }));
  };

  const handleInject = async () => {
    if (!selectedClientId) return;
    setIsInjecting(true);

    try {
      const batch = writeBatch(db);

      for (let i = 0; i < previewSessions.length; i++) {
        const pSession = previewSessions[i];
        
        // Match machine names
        const cleanLogs = pSession.logs.map(pl => {
          // Attempt to find closest machine
          const match = machines.find(m => m.name.toLowerCase() === pl.machineName.toLowerCase())
            || machines.find(m => pl.machineName.toLowerCase().includes(m.name.toLowerCase()));
          
          return {
            ...pl,
            machineId: match ? match.id! : 'unknown_machine'
          };
        }).filter(l => l.machineId !== 'unknown_machine'); // Drop unknown for safety

        if (cleanLogs.length === 0) continue;

        const sessionRef = doc(collection(db, 'workoutSessions'));
        batch.set(sessionRef, {
          clientId: selectedClientId,
          date: pSession.date,
          trainerInitials: pSession.trainerInitials,
          sessionType: 'Workout',
          sessionNumber: i + 1, // Will require reindexing if other sessions exist, but fine for legacy import
          status: 'Completed',
          legacy_filemaker_id: 'AI_IMPORT',
          createdAt: serverTimestamp(),
          endTime: serverTimestamp() // Mark closed
        });

        for (const l of cleanLogs) {
          const logRef = doc(collection(db, 'exerciseLogs'));
          batch.set(logRef, {
            sessionId: sessionRef.id,
            clientId: selectedClientId,
            machineId: l.machineId,
            weight: l.weight,
            reps: l.reps,
            seconds: l.seconds,
            isStaticHold: l.isStaticHold,
            isTSC: l.isTSC,
            repQuality: l.repQuality,
            createdAt: serverTimestamp()
          });
        }
      }

      await batch.commit();
      
      // Cleanup
      setImages([]);
      setPreviewSessions([]);
      setSelectedClientId('');
      if (onComplete) onComplete();
      
    } catch (err) {
      console.error(err);
      alert("Failed to inject data.");
    } finally {
      setIsInjecting(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col">
        <h2 className="text-2xl font-black tracking-tight leading-tight text-white mb-1">Legacy Chart Importer</h2>
        <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Vision AI Matrix for Historical Digitization</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-slate-800 bg-[#0A2E46]/30">
            <CardHeader className="pb-3 border-b border-slate-800/50">
              <CardTitle className="text-sm font-black text-slate-200 uppercase tracking-widest">1. Target Client</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="bg-slate-900 border-slate-700">
                  <SelectValue placeholder="Select Client..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id!}>{c.firstName} {c.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-[#0A2E46]/30">
            <CardHeader className="pb-3 border-b border-slate-800/50">
              <CardTitle className="text-sm font-black text-slate-200 uppercase tracking-widest">2. Upload Photos</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
               <div 
                  className="w-full min-h-32 border-2 border-dashed border-slate-600 bg-slate-900/50 rounded-xl flex flex-col items-center justify-center p-4 cursor-pointer hover:border-orange-500/50 hover:bg-slate-800/50 transition-colors group"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                  />
                  <Upload className="w-8 h-8 text-slate-500 group-hover:text-orange-500 mb-2 transition-colors" />
                  <p className="text-sm font-bold text-slate-400 text-center">Drag & Drop<br/>or Click to Browse</p>
                  <p className="text-[10px] text-slate-500 mt-2 text-center uppercase tracking-wider">Multi-page supported</p>
                </div>

                {images.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative aspect-[3/4] rounded-md overflow-hidden border border-slate-700 bg-slate-900">
                        <img src={img.url} alt={`Upload ${idx}`} className="object-cover w-full h-full opacity-70" />
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                          className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full scale-75 hover:scale-100 transition-transform"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
            </CardContent>
          </Card>

          <Button 
            className="w-full bg-[#F06C22] hover:bg-[#F06C22]/80 text-white font-black uppercase tracking-widest h-14"
            disabled={images.length === 0 || !selectedClientId || isScanning}
            onClick={handleScan}
          >
            {isScanning ? (
              <span className="flex items-center gap-2">
                <Scan className="w-5 h-5 animate-spin" />
                Scanning...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Scan className="w-5 h-5" />
                Scan Charts
              </span>
            )}
          </Button>
          
          {isScanning && (
            <div className="text-center">
              <p className="text-xs text-orange-400 font-bold animate-pulse">{scanProgress}</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-3">
          {previewSessions.length === 0 ? (
            <div className="h-full min-h-64 border-2 border-dashed border-slate-800 bg-slate-900/20 rounded-2xl flex flex-col items-center justify-center p-8">
              <History className="w-16 h-16 text-slate-800 mb-4" />
              <p className="text-slate-500 font-bold text-center">AI Data Grid</p>
              <p className="text-xs text-slate-600 text-center mt-2 max-w-sm">Scan physical charts to generate a chronological timeline. You will be able to review and correct all numbers before injection.</p>
            </div>
          ) : (
            <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
              <div className="border-b border-slate-800 bg-slate-900 p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-black text-white text-lg">Timeline Preview Grid</h3>
                  <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">
                    {previewSessions.length} Sessions Extracted
                  </p>
                </div>
                <Button 
                  onClick={handleInject}
                  disabled={isInjecting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black"
                >
                  {isInjecting ? 'Injecting...' : 'Confirm & Inject History'}
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-8">
                {previewSessions.map((session, sIdx) => (
                  <div key={session.id} className="space-y-2">
                    <div className="flex items-center gap-4 border-b border-slate-800 pb-2">
                      <div className="bg-slate-800 px-3 py-1 rounded text-xs font-black text-slate-300">
                        {session.date}
                      </div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase">
                        Trainer: {session.trainerInitials}
                      </div>
                    </div>

                    <div className="grid gap-1">
                      {session.logs.map((log) => (
                        <div key={log.id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 bg-slate-900/50 hover:bg-slate-800/50 rounded group">
                          <div className="flex-1 min-w-[200px]">
                            <Input 
                              value={log.machineName} 
                              onChange={(e) => updatePreviewLog(session.id, log.id, 'machineName', e.target.value)}
                              className="h-7 text-xs bg-transparent border-b border-transparent focus:border-orange-500 focus:bg-slate-950 rounded-none px-1"
                            />
                          </div>
                          <div className="flex gap-2">
                            <div className="w-20">
                              <label className="text-[8px] text-slate-600 font-bold uppercase tracking-widest px-1">Weight</label>
                              <Input 
                                value={log.weight} 
                                onChange={(e) => updatePreviewLog(session.id, log.id, 'weight', e.target.value)}
                                className="h-7 text-xs bg-transparent border-b border-slate-800 focus:border-orange-500 focus:bg-slate-950 rounded-none px-1 text-center font-bold"
                              />
                            </div>
                            <div className="w-20">
                              <label className="text-[8px] text-slate-600 font-bold uppercase tracking-widest px-1">Reps</label>
                              <Input 
                                value={log.reps} 
                                onChange={(e) => updatePreviewLog(session.id, log.id, 'reps', e.target.value)}
                                className="h-7 text-xs bg-transparent border-b border-slate-800 focus:border-orange-500 focus:bg-slate-950 rounded-none px-1 text-center font-bold"
                              />
                            </div>
                            <div className="w-20">
                              <label className="text-[8px] text-slate-600 font-bold uppercase tracking-widest px-1">Secs</label>
                              <Input 
                                value={log.seconds} 
                                onChange={(e) => updatePreviewLog(session.id, log.id, 'seconds', e.target.value)}
                                className="h-7 text-xs bg-transparent border-b border-slate-800 focus:border-orange-500 focus:bg-slate-950 rounded-none px-1 text-center font-bold text-emerald-400"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
