import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, 
  LineChart, Line, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { 
  mockDemographics, mockReverseAgingData, mockTrainerEfficacy 
} from './mockData';
import { TrendingUp, Users, Activity, Target } from 'lucide-react';
import { cn } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function OwnerDashboard() {
  return (
    <div className="h-full min-h-[calc(100vh-5rem)] w-full overflow-hidden bg-[#0A2E46] p-6 lg:p-8 flex flex-col gap-6 custom-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0 mb-2">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white leading-none mb-2">
            Macro Analytics
          </h1>
          <p className="text-sm font-bold uppercase tracking-widest text-[#38BDF8]">
            Max Strength Studio Overview
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-6 pr-4 pb-12">
        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
          {[
            { label: 'Avg Strength Gain', value: '+42%', icon: TrendingUp },
            { label: 'Active Clients', value: '184', icon: Users },
            { label: 'Avg Rep Quality', value: '92/100', icon: Activity },
            { label: 'Trainer Efficacy', value: 'Top 10%', icon: Target },
          ].map((kpi, i) => (
            <Card key={i} className="bg-[#F8F9FA] border-0 shadow-lg text-[#0A2E46] overflow-hidden rounded-[24px]">
              <CardContent className="p-6 flex flex-col justify-between h-full relative">
                <kpi.icon className="w-8 h-8 text-[#115E8D] opacity-20 absolute top-4 right-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#475569]">{kpi.label}</span>
                <span className="text-3xl font-black italic uppercase tracking-tighter text-[#115E8D] mt-2">{kpi.value}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[400px]">
          {/* Demographic Performance Matrix */}
          <Card className="bg-[#F8F9FA] border-0 shadow-lg rounded-[32px] flex flex-col overflow-hidden">
            <CardHeader className="border-b border-slate-200 bg-white/50 pb-4">
              <CardTitle className="text-lg font-black uppercase tracking-tight text-[#115E8D]">
                Demographic Performance Matrix
              </CardTitle>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Avg Strength Gains by Age Group & Occupation
              </p>
            </CardHeader>
            <CardContent className="flex-1 p-6 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockDemographics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="ageGroup" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 12, fontWeight: 700 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 12, fontWeight: 700 }} />
                  <Tooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ backgroundColor: '#0A2E46', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 'bold' }}
                    itemStyle={{ color: '#F06C22' }}
                  />
                  <Bar dataKey="avgStrengthIncrease" fill="#F06C22" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Reverse Aging Tracker */}
          <Card className="bg-[#F8F9FA] border-0 shadow-lg rounded-[32px] flex flex-col overflow-hidden">
            <CardHeader className="border-b border-slate-200 bg-white/50 pb-4">
              <CardTitle className="text-lg font-black uppercase tracking-tight text-[#115E8D]">
                The Reverse Aging Tracker
              </CardTitle>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Baseline vs. Current Weight (12 Mos)
              </p>
            </CardHeader>
            <CardContent className="flex-1 p-6 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockReverseAgingData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 12, fontWeight: 700 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 12, fontWeight: 700 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0A2E46', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 'bold' }}
                  />
                  <Line type="monotone" dataKey="baselineWeight" stroke="#94a3b8" strokeWidth={3} strokeDasharray="5 5" dot={false} name="Baseline" />
                  <Line type="monotone" dataKey="currentWeight" stroke="#115E8D" strokeWidth={4} activeDot={{ r: 8, fill: '#F06C22' }} name="Current Strength" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Trainer Efficacy Grid */}
        <Card className="bg-[#F8F9FA] border-0 shadow-lg rounded-[32px] flex flex-col shrink-0 mt-2">
          <CardHeader className="border-b border-slate-200 bg-white/50 pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-black uppercase tracking-tight text-[#115E8D]">
                Trainer Efficacy
              </CardTitle>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-1">
                Avg Client Rep Quality Score
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
             <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                {mockTrainerEfficacy.map((trainer, i) => (
                  <div key={i} className="p-6 flex flex-col items-center justify-center text-center">
                    <span className="text-sm font-black uppercase tracking-widest text-[#0A2E46]">{trainer.trainerName}</span>
                    <span className={cn(
                      "text-4xl font-black italic tracking-tighter mt-2 leading-none",
                      trainer.avgRepQuality >= 90 ? "text-emerald-500" : trainer.avgRepQuality >= 80 ? "text-amber-500" : "text-rose-500"
                    )}>
                      {trainer.avgRepQuality}
                    </span>
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mt-2">{trainer.clientCount} Active Clients</span>
                  </div>
                ))}
             </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
