import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, ScatterChart, Scatter, LineChart, Line, ZAxis
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Client, Trainer, Machine, WorkoutSession } from '../types';
import { LegacyChartImporter } from './LegacyChartImporter';

interface InsightsDashboardViewProps {
  clients: Client[];
  trainers: Trainer[];
  machines: Machine[];
  sessions: WorkoutSession[];
  newClientsCount?: number;
  onShowNewClients?: () => void;
  initialTab?: 'macro' | 'micro' | 'importer' | 'analytics';
}

const COLORS = ['#38BDF8', '#F06C22', '#10B981', '#F43F5E', '#8B5CF6', '#F59E0B', '#64748B'];
const PIE_COLORS = ['#38BDF8', '#F06C22', '#10B981', '#F43F5E', '#8B5CF6'];

export function InsightsDashboardView({ 
  clients, 
  trainers, 
  machines, 
  sessions,
  newClientsCount,
  onShowNewClients,
  initialTab = 'macro'
}: InsightsDashboardViewProps) {
  const [activeTab, setActiveTab] = useState<'macro' | 'micro' | 'importer'>(
    initialTab === 'analytics' ? 'macro' : initialTab as any
  );

  // MACRO DATA GENERATION
  
  // 1. Clinical Contraindication Heatmap
  const ailmentCounts = clients.reduce((acc, client) => {
    client.clinicalProfile?.forEach(ailment => {
      acc[ailment] = (acc[ailment] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);
  const ailmentData = Object.entries(ailmentCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);

  // 2. Occupational Stress
  const activityCounts = clients.reduce((acc, client) => {
    const act = client.activityLevel || 'Unspecified';
    acc[act] = (acc[act] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const activityData = Object.entries(activityCounts)
    .map(([name, value]) => ({ name, value }));

  // 3. Demographic Breakdown (Age + Retired)
  const ageGroups = { '<30': { working: 0, retired: 0 }, '30-45': { working: 0, retired: 0 }, '46-60': { working: 0, retired: 0 }, '60+': { working: 0, retired: 0 } };
  clients.forEach(client => {
    if (!client.age) return;
    const isRetired = client.isRetired ? 'retired' : 'working';
    if (client.age < 30) ageGroups['<30'][isRetired]++;
    else if (client.age <= 45) ageGroups['30-45'][isRetired]++;
    else if (client.age <= 60) ageGroups['46-60'][isRetired]++;
    else ageGroups['60+'][isRetired]++;
  });
  const demographicData = Object.entries(ageGroups).map(([ageGroup, counts]) => ({
    ageGroup,
    Working: counts.working,
    Retired: counts.retired
  }));

  // 4. Retention by Package Tier
  const packageData = clients.reduce((acc, client) => {
    const tier = client.packageTier || 'None';
    acc[tier] = (acc[tier] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);


  // MICRO DATA GENERATION (Mocked/Simplified for UI due to no complex logs accessible instantly)
  
  // 1. Time-to-Hypertrophy by Age (Scatter Plot)
  const hypertrophyData = [
    { age: 25, sessions: 8, name: "20-30 Bracket" },
    { age: 35, sessions: 12, name: "31-40 Bracket" },
    { age: 45, sessions: 16, name: "41-50 Bracket" },
    { age: 55, sessions: 22, name: "51-60 Bracket" },
    { age: 65, sessions: 28, name: "60+ Bracket" }
  ];

  // 2. Protocol Stalling Factors
  const stallingData = [
    { machine: "Leg Press", stallFreq: 24, activity: "Sedentary" },
    { machine: "Chest Press", stallFreq: 18, activity: "Light" },
    { machine: "Pulldown", stallFreq: 15, activity: "Moderate" },
    { machine: "Overhead Press", stallFreq: 30, activity: "Manual Labor" },
  ];

  // 3. Recovery Impact Metric
  const recoveryData = [
    { month: 'Month 1', optimal: 15, average: 10, poor: 5 },
    { month: 'Month 2', optimal: 25, average: 18, poor: 8 },
    { month: 'Month 3', optimal: 38, average: 24, poor: 10 },
    { month: 'Month 4', optimal: 50, average: 32, poor: 12 },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl">
          <p className="text-white font-bold mb-1">{label}</p>
          {payload.map((entry: any, i: number) => (
            <p key={i} className="text-sm font-medium" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#0A2E46] overflow-hidden">
      {/* Header & Segmented Control */}
      <div className="p-6 md:p-8 shrink-0 flex flex-col gap-6 border-b border-white/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-black italic uppercase tracking-tighter text-white leading-none">
              Insights Command Center
            </h1>
            <p className="text-xs md:text-sm font-bold uppercase tracking-widest text-[#38BDF8] mt-2">
              Unified Analytics & Studio Intelligence
            </p>
          </div>
          
          <div className="flex items-center gap-3">
             <button
                onClick={() => setActiveTab('importer')}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border flex items-center gap-2",
                  activeTab === 'importer' 
                    ? "bg-[#F06C22] text-white border-[#F06C22]" 
                    : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-700"
                )}
              >
                <UploadCloud className="w-4 h-4" /> Filemaker Import
             </button>
            {newClientsCount !== undefined && onShowNewClients && (
              <div 
                className="bg-white/5 px-4 py-2 rounded-2xl flex items-center gap-3 cursor-pointer hover:bg-white/10 transition-all border border-white/10 group h-12 shrink-0"
                onClick={onShowNewClients}
              >
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-white/60 uppercase leading-none tracking-tighter">New This Month</span>
                  <span className="text-sm font-black text-white leading-tight">{newClientsCount} Clients</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Massive Segmented Control */}
        <div className="flex bg-[#0A2E46] p-1.5 rounded-2xl border border-slate-700/50 w-full max-w-2xl mx-auto shadow-2xl">
          <button
            onClick={() => setActiveTab('macro')}
            className={cn(
              "flex-1 py-4 text-sm md:text-base font-black uppercase tracking-widest rounded-xl transition-all duration-300",
              activeTab === 'macro' 
                ? "bg-[#38BDF8] text-slate-900 shadow-[0_0_20px_rgba(56,189,248,0.3)]" 
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            )}
          >
            [ MACRO &nbsp; | &nbsp; Demographics ]
          </button>
          <button
            onClick={() => setActiveTab('micro')}
            className={cn(
              "flex-1 py-4 text-sm md:text-base font-black uppercase tracking-widest rounded-xl transition-all duration-300",
              activeTab === 'micro' 
                ? "bg-[#F06C22] text-slate-900 shadow-[0_0_20px_rgba(240,108,34,0.3)]" 
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            )}
          >
            [ MICRO &nbsp; | &nbsp; Performance ]
          </button>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'importer' ? (
            <motion.div 
              key="importer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <LegacyChartImporter clients={clients} machines={machines} />
            </motion.div>
          ) : activeTab === 'macro' ? (
            <motion.div 
              key="macro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {/* Clinical Contraindication Heatmap */}
              <Card className="bg-slate-800 border-slate-700 text-white rounded-[32px] overflow-hidden lg:col-span-2 shadow-2xl">
                <CardHeader className="border-b border-slate-700/50 bg-slate-800/50 p-6">
                  <CardTitle className="text-xl font-black uppercase italic tracking-tight text-[#38BDF8]">
                    Clinical Contraindication Heatmap
                  </CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Ailment Frequencies Across Active Roster
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ailmentData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} angle={-45} textAnchor="end" height={60} />
                      <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontWeight: 600 }} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b' }} />
                      <Bar dataKey="count" name="Affected Clients" fill="#F43F5E" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Occupational Stress */}
              <Card className="bg-slate-800 border-slate-700 text-white rounded-[32px] shadow-2xl">
                <CardHeader className="border-b border-slate-700/50 bg-slate-800/50 p-6">
                  <CardTitle className="text-xl font-black uppercase italic tracking-tight text-[#38BDF8]">
                    Occupational Stress
                  </CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Client Activity Level Distribution
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={activityData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {activityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Demographic Breakdown */}
              <Card className="bg-slate-800 border-slate-700 text-white rounded-[32px] shadow-2xl">
                <CardHeader className="border-b border-slate-700/50 bg-slate-800/50 p-6">
                  <CardTitle className="text-xl font-black uppercase italic tracking-tight text-[#38BDF8]">
                    Demographic Identity
                  </CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Employment Status by Age Bracket
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={demographicData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                      <XAxis type="number" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontWeight: 600 }} />
                      <YAxis dataKey="ageGroup" type="category" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontWeight: 600 }} width={60} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b' }} />
                      <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                      <Bar dataKey="Working" stackId="a" fill="#38BDF8" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Retired" stackId="a" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Retention by Package Tier */}
              <Card className="bg-slate-800 border-slate-700 text-white rounded-[32px] shadow-2xl lg:col-span-2">
                <CardHeader className="border-b border-slate-700/50 bg-slate-800/50 p-6">
                  <CardTitle className="text-xl font-black uppercase italic tracking-tight text-[#38BDF8]">
                    Retention & Value Distribution
                  </CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Client Distribution by Package Tier
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={Object.entries(packageData).map(([name, count]) => ({ name, count }))} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontWeight: 600 }} />
                      <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontWeight: 600 }} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b' }} />
                      <Bar dataKey="count" name="Clients" fill="#10B981" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div 
              key="micro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {/* Recovery Impact Metric */}
              <Card className="bg-slate-800 border-slate-700 text-white rounded-[32px] overflow-hidden lg:col-span-2 shadow-2xl">
                <CardHeader className="border-b border-slate-700/50 bg-slate-800/50 p-6">
                  <CardTitle className="text-xl font-black uppercase italic tracking-tight text-[#F06C22]">
                    Recovery Impact Matrix
                  </CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Strength Progression vs Systemic Recovery State
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={recoveryData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontWeight: 600 }} />
                      <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontWeight: 600 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', paddingTop: '20px' }} />
                      <Line type="monotone" dataKey="optimal" name="Optimal Recovery" stroke="#10B981" strokeWidth={4} dot={{ r: 6, fill: '#10B981', strokeWidth: 0 }} activeDot={{ r: 8 }} />
                      <Line type="monotone" dataKey="average" name="Average Recovery" stroke="#38BDF8" strokeWidth={4} dot={{ r: 6, fill: '#38BDF8', strokeWidth: 0 }} />
                      <Line type="monotone" dataKey="poor" name="Poor Recovery" stroke="#F43F5E" strokeWidth={4} dot={{ r: 6, fill: '#F43F5E', strokeWidth: 0 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Time-to-Hypertrophy */}
              <Card className="bg-slate-800 border-slate-700 text-white rounded-[32px] shadow-2xl">
                <CardHeader className="border-b border-slate-700/50 bg-slate-800/50 p-6">
                  <CardTitle className="text-xl font-black uppercase italic tracking-tight text-[#F06C22]">
                    Hypertrophy Velocity
                  </CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Average Sessions to +20% Strength Gain by Age
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis type="number" dataKey="age" name="Age" unit="y" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} domain={[20, 80]} />
                      <YAxis type="number" dataKey="sessions" name="Sessions" unit="" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                      <Scatter name="Hypertrophy Velocity" data={hypertrophyData} fill="#F06C22" shape="circle" >
                        {hypertrophyData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Protocol Stalling Factors */}
              <Card className="bg-slate-800 border-slate-700 text-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col">
                <CardHeader className="border-b border-slate-700/50 bg-slate-800/50 p-6 shrink-0">
                  <CardTitle className="text-xl font-black uppercase italic tracking-tight text-[#F06C22]">
                    Protocol Stalling Factors
                  </CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    High-Frequency Plateau Correlators
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-y-auto custom-scrollbar">
                  <div className="divide-y divide-slate-700">
                    {stallingData.map((item, idx) => (
                      <div key={idx} className="p-6 flex items-center justify-between hover:bg-slate-700/30 transition-colors">
                        <div className="flex flex-col gap-1">
                          <span className="text-white font-bold">{item.machine}</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.activity} Subset</span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-2xl font-black text-[#F43F5E] leading-none">{item.stallFreq}%</span>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Stall Freq</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
