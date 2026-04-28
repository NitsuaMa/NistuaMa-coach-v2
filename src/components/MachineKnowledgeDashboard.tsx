import React, { useState } from 'react';
import { MACHINE_LIST, MachineKnowledge } from '../data/machine-database';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlayCircle, X, ChevronRight, Activity, Users, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = [
  "All",
  "Lower Body",
  "Hips",
  "Upper Body - Push",
  "Upper Body - Pull",
  "Trunk/Spine/Core"
];

export function MachineKnowledgeDashboard() {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [activeMachineId, setActiveMachineId] = useState<string | null>(null);

  const filteredMachines = activeCategory === "All" 
    ? MACHINE_LIST 
    : MACHINE_LIST.filter(m => m.category === activeCategory);

  const activeMachine = MACHINE_LIST.find(m => m.id === activeMachineId);
  const activeMachineIndex = activeMachine ? MACHINE_LIST.findIndex(m => m.id === activeMachine.id) + 1 : 0;

  return (
    <div className="flex flex-col bg-[#0A2E46] h-full overflow-hidden text-white w-full relative">
      
      {/* Header & Filters */}
      <div className="pt-8 px-6 pb-6 bg-[#0A2E46] border-b border-white/10 shrink-0 z-10 w-full relative">
        <h1 className="text-3xl lg:text-4xl font-black uppercase tracking-tighter text-white mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-[#68717A]">
          Equipment Arsenal
        </h1>
        
        {/* Stationary Filter Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 w-full max-w-5xl">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`w-full text-center px-2 py-2 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest transition-all border ${
                activeCategory === cat
                  ? 'bg-[#F06C22] text-white border-[#F06C22] shadow-[0_4px_15px_rgba(240,108,34,0.3)]'
                  : 'bg-white/5 text-[#94A3B8] border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="line-clamp-1">{cat}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-32">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6 max-w-[1800px] mx-auto">
          {filteredMachines.map((machine, idx) => {
            const indexNumber = (MACHINE_LIST.findIndex(m => m.id === machine.id) + 1).toString().padStart(2, '0');
            
            return (
              <div 
                key={machine.id}
                onClick={() => setActiveMachineId(machine.id)}
                className="group relative bg-[#0e171e] border border-slate-700/50 rounded-xl cursor-pointer hover:border-[#38BDF8]/50 hover:shadow-[0_8px_30px_rgba(56,189,248,0.15)] hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden"
              >
                {/* Image Section (16:9 Aspect Ratio) */}
                <div className="relative aspect-video w-full overflow-hidden bg-slate-800 shrink-0">
                  <div className="absolute inset-0 bg-[#0A2E46]/60 group-hover:bg-[#0A2E46]/20 transition-colors duration-500 z-10 pointer-events-none mix-blend-multiply" />
                  <img 
                    src={
                      machine.id === 'leg_press' ? '/regenerated_image_1777418510296.png' :
                      machine.id === 'leg_extension' ? '/regenerated_image_1777418524469.png' :
                      machine.id === 'chest_press' ? '/regenerated_image_1777418504308.png' : 
                      machine.id === 'compound_row' ? '/regenerated_image_1777418531749.png' :
                      `https://picsum.photos/seed/${machine.name.replace(/\s+/g, '-')}/400/250`
                    } 
                    alt={machine.name}
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 scale-100 group-hover:scale-105"
                  />
                  <div className="absolute top-2 left-2 z-20">
                    <span className="text-[9px] font-black tracking-widest text-[#38BDF8] uppercase bg-[#0A2E46]/80 backdrop-blur-sm px-1.5 py-0.5 rounded shadow-sm border border-[#38BDF8]/20">
                      Idx {indexNumber}
                    </span>
                  </div>
                </div>

                {/* Metadata Section (Expert Focus) */}
                <div className="p-4 flex flex-col flex-1 z-20 bg-gradient-to-b from-[#0e171e] to-[#0A2E46]/80 text-[#F8F9FA]">
                  <h3 className="text-lg font-black uppercase tracking-tighter mb-0.5 transition-colors line-clamp-1">
                    {machine.name}
                  </h3>
                  
                  {/* Highlighted Target Muscles */}
                  <p className="text-[#F06C22] text-[10px] sm:text-xs font-black uppercase tracking-widest mb-3 line-clamp-1">
                    {machine.target || 'General Base'}
                  </p>
                  
                  {/* Quick-Cue Data Grid */}
                  <div className="grid grid-cols-1 gap-1.5 mb-4 flex-1">
                    <div className="bg-white/5 border border-white/10 rounded-md p-2">
                       <span className="block text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-[#68717A] mb-0.5">Setup</span>
                       <span className="block text-[10px] sm:text-xs font-semibold text-[#F8F9FA] line-clamp-2 leading-tight">
                         {machine.setup}
                       </span>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-md p-2">
                       <span className="block text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-[#68717A] mb-0.5">Turnarounds</span>
                       <span className="block text-[10px] sm:text-xs font-semibold text-[#F8F9FA] line-clamp-2 leading-tight">
                         {machine.execution}
                       </span>
                    </div>
                  </div>
                  
                  {/* Sleek Interaction Button */}
                  <div className="mt-auto">
                     <Button variant="ghost" className="w-full bg-white/5 hover:bg-white/10 text-[#CBD5E1] hover:text-white border border-white/10 hover:border-white/20 transition-all text-[9px] sm:text-[10px] font-black uppercase tracking-widest h-8 rounded-md">
                        Insights
                     </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Slide-out Modal / Gateway */}
      <AnimatePresence>
        {activeMachine && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setActiveMachineId(null)}
            />

            {/* Slide-out Panel */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute inset-y-0 right-0 w-full md:w-[600px] lg:w-[700px] bg-[#0A2E46] border-l border-white/10 z-50 flex flex-col shadow-2xl"
            >
              <div className="flex-1 overflow-y-auto w-full pb-24">
                
                {/* Modal Header */}
                <div className="p-8 md:p-12 border-b border-white/10 bg-[#061e30] sticky top-0 z-20">
                  <div className="flex items-center justify-between mb-8">
                    <div className="text-6xl font-light text-[#115E8D]">
                      {activeMachineIndex.toString().padStart(2, '0')}
                    </div>
                    <button 
                      onClick={() => setActiveMachineId(null)}
                      className="p-3 bg-white/5 rounded-full text-[#68717A] hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <X className="w-8 h-8" />
                    </button>
                  </div>
                  
                  <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-white mb-6">
                    {activeMachine.name}
                  </h2>
                  
                  <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                    <Badge variant="secondary" className="bg-[#115E8D] text-white hover:bg-[#115E8D] uppercase tracking-widest font-bold px-4 py-1.5 shrink-0 self-start">
                      {activeMachine.category}
                    </Badge>
                    <Button variant="outline" className="border-[#F06C22] text-[#F06C22] hover:bg-[#F06C22] hover:text-white h-10 px-6 rounded-full font-black uppercase tracking-widest text-[10px] sm:ml-auto w-full sm:w-auto">
                      <PlayCircle className="w-4 h-4 mr-2" />
                      View Form Video
                    </Button>
                  </div>
                </div>

                {/* Content Sections */}
                <div className="p-8 md:p-12 space-y-12">
                  
                  {/* Anatomical Focus */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[#68717A] flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#38BDF8]" />
                      Anatomical Focus
                    </h4>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-8 relative overflow-hidden group">
                      <div className="absolute right-[-20%] bottom-[-50%] opacity-5 w-64 h-64 bg-white rounded-full blur-[100px] pointer-events-none group-hover:opacity-10 transition-opacity" />
                      
                      {activeMachine.targetMuscles ? (
                        <div className="relative z-10 space-y-2">
                          {activeMachine.targetMuscles.map((tm, idx) => (
                             <p key={idx} className="text-2xl font-bold leading-tight text-white/90">
                              {tm}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-2xl font-bold leading-tight text-white/90 relative z-10 w-2/3">
                          {activeMachine.target || 'Primary muscle groups targeted during execution.'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Educational Cues */}
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[#68717A] flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#F06C22]" />
                      Educational Cues
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-[#061e30] border border-white/5 rounded-2xl p-6">
                        <div className="text-[10px] font-black uppercase tracking-widest text-[#94A3B8] mb-4 bg-white/5 inline-block px-3 py-1 rounded">Setup</div>
                        {activeMachine.setupCues ? (
                          <ul className="text-lg leading-relaxed text-[#CBD5E1] font-medium space-y-2 list-disc pl-4">
                            {activeMachine.setupCues.map((cue, i) => <li key={i}>{cue}</li>)}
                          </ul>
                        ) : (
                          <p className="text-lg leading-relaxed text-[#CBD5E1] font-medium">
                            {activeMachine.setup}
                          </p>
                        )}
                      </div>
                      
                      <div className="bg-[#061e30] border border-white/5 rounded-2xl p-6">
                        <div className="text-[10px] font-black uppercase tracking-widest text-[#94A3B8] mb-4 bg-white/5 inline-block px-3 py-1 rounded">Execution</div>
                        {activeMachine.executionCues ? (
                          <ul className="text-lg leading-relaxed text-[#CBD5E1] font-medium space-y-2 list-disc pl-4">
                            {activeMachine.executionCues.map((cue, i) => <li key={i}>{cue}</li>)}
                          </ul>
                        ) : (
                          <p className="text-lg leading-relaxed text-[#CBD5E1] font-medium">
                            {activeMachine.execution}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Optional Clinical Warnings / Synergists */}
                  {(activeMachine.clinicalWarnings || activeMachine.synergists) && (
                    <div className="space-y-6">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-[#68717A] flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#EAB308]" />
                        Clinical & Kinesiology
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {activeMachine.synergists && (
                          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <h5 className="text-[10px] font-black uppercase tracking-widest text-[#94A3B8] mb-3">Synergists</h5>
                            <ul className="text-sm font-medium text-[#CBD5E1] space-y-1 list-disc pl-4">
                              {activeMachine.synergists.map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                          </div>
                        )}
                        {activeMachine.clinicalWarnings && (
                          <div className="bg-[#450a0a]/20 border border-red-900/30 rounded-2xl p-6">
                            <h5 className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-3">Clinical Notes & Warnings</h5>
                            <ul className="text-sm font-medium text-red-200/80 space-y-2 list-disc pl-4">
                              {activeMachine.clinicalWarnings.map((w, i) => <li key={i}>{w}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Performance Insights Matrix (Placeholder) */}
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[#68717A] flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#115E8D]" />
                      Performance Insights (Demo Data)
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {/* Stat Block 1 */}
                      <div className="bg-white/5 border border-white/5 rounded-xl p-5 flex flex-col gap-2">
                        <Activity className="w-5 h-5 text-[#38BDF8]" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#68717A]">Avg Reps</span>
                        <span className="text-3xl font-black text-white">8-12</span>
                      </div>
                      
                      {/* Stat Block 2 */}
                      <div className="bg-white/5 border border-white/5 rounded-xl p-5 flex flex-col gap-2">
                        <TrendingUp className="w-5 h-5 text-[#22C55E]" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#68717A]">Time under tension</span>
                        <span className="text-3xl font-black text-white">35s</span>
                      </div>
                      
                      {/* Stat Block 3 */}
                      <div className="bg-white/5 border border-white/5 rounded-xl p-5 col-span-2 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Users className="w-5 h-5 text-[#F06C22]" />
                          <div>
                            <span className="block text-[10px] font-black uppercase tracking-widest text-[#68717A] mb-1">Target Baseline</span>
                            <div className="flex gap-2">
                              <span className="bg-white/10 text-white/70 text-[9px] font-bold uppercase px-2 py-0.5 rounded">Male Novice</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-3xl font-black text-white">{activeMachine.baseMale}</span>
                          <span className="text-xs text-[#68717A] font-bold ml-1">LBS</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
