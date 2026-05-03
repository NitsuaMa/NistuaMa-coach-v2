import React, { useState } from 'react';
import { Users } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { Client, Trainer, Machine, WorkoutSession } from '../types';
import { LegacyChartImporter } from './LegacyChartImporter';
import { OwnerDashboard } from './OwnerDashboard';
import { TrainerDashboard } from './TrainerDashboard';

export function OwnerDashboardView({ 
  clients, 
  trainers, 
  machines, 
  sessions,
  newClientsCount,
  onShowNewClients,
  initialTab = 'macro'
}: { 
  clients: Client[], 
  trainers: Trainer[], 
  machines: Machine[], 
  sessions: WorkoutSession[],
  newClientsCount?: number,
  onShowNewClients?: () => void,
  initialTab?: 'macro' | 'micro' | 'importer' | 'analytics'
}) {
  const [activeTab, setActiveTab] = useState<'macro' | 'micro' | 'importer'>(
    initialTab === 'analytics' ? 'macro' : initialTab as any
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="flex flex-col w-full h-full pb-8"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-[#0A2E46] shrink-0 border-b border-white/5">
        <div className="flex flex-col">
          <h2 className="text-2xl font-black tracking-tight leading-tight text-white">Insights Dashboard</h2>
          <p className="text-[10px] uppercase font-bold text-[#38BDF8] tracking-wider">All-in-one stop for performance data</p>
        </div>
        
        <div className="flex items-center gap-3 overflow-x-auto custom-scrollbar pb-1 md:pb-0">
          <div className="flex bg-[#0A2E46] rounded-lg p-1 border border-white/10 shrink-0">
            <button 
              onClick={() => setActiveTab('macro')}
              className={cn("px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest transition-all", activeTab === 'macro' ? "bg-[#115E8D] text-white" : "text-slate-400 hover:text-slate-200 hover:bg-white/5")}
            >
              Macro Analytics
            </button>
            <button 
              onClick={() => setActiveTab('micro')}
              className={cn("px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest transition-all", activeTab === 'micro' ? "bg-[#115E8D] text-white" : "text-slate-400 hover:text-slate-200 hover:bg-white/5")}
            >
              Micro Analytics
            </button>
            <button 
              onClick={() => setActiveTab('importer')}
              className={cn("px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest transition-all", activeTab === 'importer' ? "bg-[#F06C22] text-white" : "text-slate-400 hover:text-slate-200 hover:bg-white/5")}
            >
              Legacy Importer
            </button>
          </div>

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

      <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
        {activeTab === 'importer' && (
          <div className="p-6">
            <LegacyChartImporter clients={clients} machines={machines} />
          </div>
        )}
        {activeTab === 'macro' && (
           <OwnerDashboard />
        )}
        {activeTab === 'micro' && (
           <TrainerDashboard />
        )}
      </div>
    </motion.div>
  );
}
