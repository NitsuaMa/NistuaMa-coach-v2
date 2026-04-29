import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wand2, ShieldCheck, Target, Settings2, UserCog, CheckCircle } from 'lucide-react';
import { generateMachineSetupGuide, SetupWizardResult } from '../services/geminiService';
import { Machine, Client } from '../types';
import { MACHINE_LIST } from '../data/machine-database';

interface Props {
  client: Client;
  machine: Machine;
}

export function MachineSetupWizard({ client, machine }: Props) {
  const [clientDetails, setClientDetails] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<SetupWizardResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const referenceData = MACHINE_LIST.find(m => m.id === machine.id || m.name === machine.name);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const refTextContext = [
        `Target: ${referenceData?.target || 'N/A'}`,
        `Setup: ${referenceData?.setup || 'N/A'}`,
        `Execution: ${referenceData?.execution || 'N/A'}`
      ].join("\n");

      const defaultDetails = clientDetails.trim() || `Client: ${client.firstName} ${client.lastName}. Medical History: ${client.medicalHistory || 'None noted'}. Notes: ${client.globalNotes || 'None'}`;

      const generated = await generateMachineSetupGuide(
        machine.name,
        defaultDetails,
        refTextContext
      );
      
      setResult(generated);
    } catch (err: any) {
      setError(err.message || "Failed to generate wizard output.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Input Section */}
      <Card className="rounded-2xl border-none shadow-sm shadow-slate-200/50 bg-[#0e171e] text-white">
        <CardContent className="p-5 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#115E8D]/30 rounded-xl flex items-center justify-center border border-[#38BDF8]/30">
              <Wand2 className="w-5 h-5 text-[#38BDF8]" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-[#F8F9FA]">MSF Setup Wizard</h3>
              <p className="text-[10px] uppercase tracking-widest text-[#68717A] mt-0.5">AI-Powered Contextual Guidance</p>
            </div>
          </div>
          
          <Textarea 
            placeholder="Add specific constraints (e.g., 'short arms', 'history of lower back pain') or leave blank to use client profile notes..."
            value={clientDetails}
            onChange={e => setClientDetails(e.target.value)}
            className="h-20 resize-none bg-white/5 border-white/10 text-white placeholder:text-slate-500 text-sm focus-visible:ring-[#38BDF8]"
          />
          
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating || !referenceData}
            className="w-full bg-[#F06C22] hover:bg-[#d95d18] text-white font-black uppercase tracking-widest text-xs h-12 rounded-xl transition-all shadow-[0_4px_20px_rgba(240,108,34,0.4)]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing Reference Data...
              </>
            ) : (
              <>
                Generate Setup Checklist
              </>
            )}
          </Button>

          {!referenceData && (
            <p className="text-[10px] text-red-400 font-bold tracking-widest text-center">Missing reference data for this machine.</p>
          )}
          {error && (
            <p className="text-[10px] text-red-500 font-bold tracking-widest text-center bg-red-500/10 p-2 rounded-lg">{error}</p>
          )}
        </CardContent>
      </Card>

      {/* Output Section */}
      {result && (
        <div className="grid gap-4 mt-6 animate-in slide-in-from-bottom-2">
          
          {/* Target Muscles */}
          <div className="flex flex-wrap gap-2 mb-2">
            {result.targetMuscles.map(m => (
              <Badge key={m} className="bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/30 uppercase text-[9px] font-black tracking-widest px-3 py-1">
                {m}
              </Badge>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Initial Adjustments */}
            <Card className="rounded-2xl border-none shadow-lg bg-white overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-[#F06C22]" />
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Settings2 className="w-4 h-4 text-[#F06C22]" />
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-800">Initial Adjustments</h4>
                </div>
                <ul className="space-y-2">
                  {result.initialAdjustments.map((step, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="text-[10px] font-black text-slate-400 shrink-0 mt-0.5">{idx + 1}.</span>
                      <span className="text-sm font-semibold text-slate-700 leading-snug">{step}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Entry & Safety */}
            <Card className="rounded-2xl border-none shadow-lg bg-white overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-800">Entry & Safety</h4>
                </div>
                <ul className="space-y-2">
                  {result.entryAndSafety.map((step, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="text-[10px] font-black text-slate-400 shrink-0 mt-0.5">{idx + 1}.</span>
                      <span className="text-sm font-semibold text-slate-700 leading-snug">{step}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Alignment & Posture */}
            <Card className="rounded-2xl border-none shadow-lg bg-white overflow-hidden relative md:col-span-2">
              <div className="absolute top-0 left-0 w-1 h-full bg-[#115E8D]" />
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-[#115E8D]" />
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-800">Alignment & Posture</h4>
                </div>
                <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                  {result.alignmentAndPosture.map((step, idx) => (
                    <li key={idx} className="flex gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-[#115E8D]/60 shrink-0 mt-0.5" />
                      <span className="text-sm font-semibold text-slate-700 leading-snug">{step}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Client Modifications */}
            <Card className="rounded-2xl border border-amber-200 shadow-lg bg-amber-50/50 overflow-hidden relative md:col-span-2">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <UserCog className="w-4 h-4 text-amber-600" />
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-800">Client Modifications</h4>
                </div>
                <p className="text-sm font-semibold text-amber-900/90 leading-snug">
                  {result.clientModifications}
                </p>
              </CardContent>
            </Card>

          </div>
        </div>
      )}
    </div>
  );
}
