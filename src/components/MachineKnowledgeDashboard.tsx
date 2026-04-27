import React, { useState } from 'react';
import { MACHINE_LIST, calculateStartingWeight, Gender, SkillLevel } from '../data/machine-database';
import { Badge } from '@/components/ui/badge';

const CATEGORY_ORDER = [
  "Lower Body",
  "Hips",
  "Upper Body - Push",
  "Upper Body - Pull",
  "Trunk/Spine/Core"
];

export function MachineKnowledgeDashboard() {
  const [activeMachineId, setActiveMachineId] = useState<string>(MACHINE_LIST[0].id);
  const [gender, setGender] = useState<Gender>('Male');
  const [age, setAge] = useState<number>(45);
  const [skill, setSkill] = useState<SkillLevel>('Novice');

  const activeMachine = MACHINE_LIST.find(m => m.id === activeMachineId);

  // Group machines by category and sort according to defined order
  const machinesByCategory = CATEGORY_ORDER.map(cat => ({
    category: cat,
    machines: MACHINE_LIST.filter(m => m.category === cat)
  })).filter(group => group.machines.length > 0);

  const calculatedWeight = activeMachine ? calculateStartingWeight(activeMachine.id, gender, age, skill) : 0;

  return (
    <div className="flex bg-[#0A2E46] h-full overflow-hidden text-white w-full">
      
      {/* Sidebar List (1/3) */}
      <div className="w-1/3 border-r border-[#115E8D] bg-[#0A2E46]/50 flex flex-col h-full overflow-y-auto">
        <div className="p-6 sticky top-0 bg-[#0A2E46]/95 backdrop-blur-md z-10 border-b border-[#115E8D]">
          <h2 className="text-xl font-black uppercase tracking-widest text-[#38BDF8]">Machine Catalog</h2>
        </div>
        <div className="p-4 space-y-8">
          {machinesByCategory.map(group => (
            <div key={group.category}>
              <h3 className="text-xs font-black text-[#68717A] uppercase tracking-widest mb-3 pl-4">{group.category}</h3>
              <div className="space-y-1">
                {group.machines.map(machine => (
                  <button
                    key={machine.id}
                    onClick={() => setActiveMachineId(machine.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-all ${
                      activeMachineId === machine.id 
                        ? 'bg-[#115E8D] text-white shadow-sm' 
                        : 'text-[#CBD5E1] hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {machine.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area (2/3) */}
      <div className="w-2/3 flex flex-col h-full overflow-y-auto p-8 lg:p-12">
        {activeMachine ? (
          <div className="max-w-3xl mx-auto w-full space-y-8 pb-12">
            
            {/* Header */}
            <div className="flex items-center gap-4">
              <h1 className="text-4xl lg:text-5xl font-black uppercase tracking-tighter text-white">
                {activeMachine.name}
              </h1>
              <Badge variant="secondary" className="bg-[#115E8D]/30 text-[#38BDF8] border border-[#38BDF8]/30 uppercase tracking-widest font-bold px-3 py-1">
                {activeMachine.category}
              </Badge>
            </div>

            {/* The Calculator Card */}
            <div className="bg-[#F8FAFC] rounded-2xl p-8 shadow-xl space-y-6">
              <div className="grid grid-cols-3 gap-6 items-end">
                {/* Inputs */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#68717A]">Gender</label>
                  <select 
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                    className="w-full bg-white border-2 border-[#E2E8F0] rounded-xl p-3 text-[#0F172A] font-bold outline-none focus:border-[#F06C22] transition-colors"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#68717A]">Age</label>
                  <input 
                    type="number"
                    value={age}
                    onChange={(e) => setAge(parseInt(e.target.value) || 0)}
                    className="w-full bg-white border-2 border-[#E2E8F0] rounded-xl p-3 text-[#0F172A] font-bold outline-none focus:border-[#F06C22] transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#68717A]">Experience</label>
                  <select 
                    value={skill}
                    onChange={(e) => setSkill(e.target.value as SkillLevel)}
                    className="w-full bg-white border-2 border-[#E2E8F0] rounded-xl p-3 text-[#0F172A] font-bold outline-none focus:border-[#F06C22] transition-colors"
                  >
                    <option value="Novice">Novice</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>

              {/* Result */}
              <div className="bg-white border-2 border-[#E2E8F0] rounded-xl p-6 flex justify-between items-center shadow-sm">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#68717A] mb-1">Calculated Starting Weight</h3>
                  <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">Derived from MSF baselines</p>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-black tracking-tighter text-[#F06C22]">{calculatedWeight}</span>
                  <span className="text-xl font-bold text-[#68717A] uppercase">lbs</span>
                </div>
              </div>
            </div>

            {/* Clinical Notes (Stacked) */}
            <div className="space-y-4">
              
              {/* Target Anatomy */}
              {activeMachine.target && (
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
                  <h3 className="text-[10px] font-black text-[#68717A] uppercase tracking-widest mb-2">Target Muscles</h3>
                  <p className="text-lg leading-relaxed font-bold text-[#0F172A]">
                    {activeMachine.target}
                  </p>
                </div>
              )}

              {/* Setup */}
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
                <h3 className="text-[10px] font-black text-[#68717A] uppercase tracking-widest mb-2">Setup Cues</h3>
                <p className="text-lg leading-relaxed font-medium text-[#334155]">
                  {activeMachine.setup}
                </p>
              </div>

              {/* Execution */}
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
                <h3 className="text-[10px] font-black text-[#68717A] uppercase tracking-widest mb-2">Execution Cues</h3>
                <p className="text-lg leading-relaxed font-medium text-[#334155]">
                  {activeMachine.execution}
                </p>
              </div>

            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-[#94A3B8] text-lg font-medium">Select a machine to view details</p>
          </div>
        )}
      </div>

    </div>
  );
}
