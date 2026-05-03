import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, 
  ComposedChart, Bar, Line
} from 'recharts';
import { 
  mockClientSessions, mockTrainerNotes 
} from './mockData';
import { AlertTriangle, Activity, Dumbbell, ShieldAlert } from 'lucide-react';
import { cn } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function TrainerDashboard() {
  const importantNotes = mockTrainerNotes.filter(n => n.isImportant);

  return (
    <div className="h-full min-h-[calc(100vh-5rem)] w-full overflow-hidden bg-[#0A2E46] p-6 lg:p-8 flex flex-col gap-6 custom-scrollbar">
      
      {/* Header & Benchmark */}
      <div className="flex items-center justify-between shrink-0 mb-2 gap-4">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white leading-none mb-2">
            Micro Analytics
          </h1>
          <p className="text-sm font-bold uppercase tracking-widest text-[#38BDF8]">
            Client Name: Jane Doe | 55 F
          </p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 max-w-sm text-right">
           <span className="text-xs font-black uppercase tracking-widest text-emerald-400 block mb-1">Demographic Benchmark</span>
           <span className="text-sm font-bold text-emerald-100">You are progressing <strong className="text-emerald-400 font-black">15% faster</strong> than the MSF average for a 55-year-old female.</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-6 pr-4 pb-12">
        {/* Critical Alert Hub */}
        {importantNotes.length > 0 && (
          <div className="shrink-0 flex flex-col gap-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#68717A] ml-2">Critical Alert Hub</h3>
            {importantNotes.map(note => (
              <div key={note.id} className="bg-rose-500/10 border border-rose-500/50 rounded-2xl p-4 flex items-center gap-4">
                 <ShieldAlert className="w-8 h-8 text-rose-500 shrink-0" />
                 <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-black uppercase text-rose-400 tracking-widest">{note.date}</span>
                      <span className="text-[10px] font-bold text-rose-500 border border-rose-500/30 rounded px-1.5">{note.author}</span>
                    </div>
                    <p className="text-sm font-medium text-rose-100">{note.text}</p>
                 </div>
              </div>
            ))}
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[400px]">
          
          {/* Mastery of Effort Trendline */}
          <Card className="bg-[#F8F9FA] border-0 shadow-lg rounded-[32px] flex flex-col overflow-hidden">
            <CardHeader className="border-b border-slate-200 bg-white/50 pb-4">
              <CardTitle className="text-lg font-black uppercase tracking-tight text-[#115E8D] flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#F06C22]" /> Mastery of Effort Trendline
              </CardTitle>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Rep Quality & 4 P's Adherence (Last 6 Sessions)
              </p>
            </CardHeader>
            <CardContent className="flex-1 p-6 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockClientSessions} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorQuality" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#115E8D" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#115E8D" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }} tickFormatter={(val) => val.split('-').slice(1).join('/')} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 12, fontWeight: 700 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0A2E46', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="repQuality" stroke="#115E8D" strokeWidth={4} fillOpacity={1} fill="url(#colorQuality)" name="Rep Quality Score" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Expected vs Actual TUT */}
          <Card className="bg-[#F8F9FA] border-0 shadow-lg rounded-[32px] flex flex-col overflow-hidden">
            <CardHeader className="border-b border-slate-200 bg-white/50 pb-4">
              <CardTitle className="text-lg font-black uppercase tracking-tight text-[#115E8D] flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-[#F06C22]" /> Time Under Tension (TUT)
              </CardTitle>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Expected (90s) vs Actual
              </p>
            </CardHeader>
            <CardContent className="flex-1 p-6 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={mockClientSessions} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }} tickFormatter={(val) => val.split('-').slice(1).join('/')} />
                  <YAxis domain={[0, 120]} axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 12, fontWeight: 700 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0A2E46', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 'bold' }}
                    itemStyle={{ color: '#F06C22' }}
                  />
                  <Bar dataKey="actualTUT" fill="#475569" radius={[4, 4, 0, 0]} name="Actual TUT (s)" barSize={40} />
                  <Line type="monotone" dataKey="expectedTUT" stroke="#F06C22" strokeWidth={3} strokeDasharray="5 5" dot={false} name="Expected TUT Target" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
