import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserPlus, User, Loader2, ArrowRight, Info, CheckCircle2, FileUp, Database, Search, Target } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Client } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface CreateClientModalProps {
  initialName?: string;
  onClose: () => void;
  onClientCreated: (clientId: string, routeToImporter?: boolean) => void;
}

export function CreateClientModal({ initialName = '', onClose, onClientCreated }: CreateClientModalProps) {
  const nameParts = initialName.trim().split(' ');
  const [firstName, setFirstName] = useState(nameParts[0] || '');
  const [lastName, setLastName] = useState(nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [activeTab, setActiveTab] = useState('prospect');
  
  // Prospect Fields
  const [leadSource, setLeadSource] = useState('Referral');
  const [notes, setNotes] = useState('');
  
  // Migration Fields
  const [mindbodyId, setMindbodyId] = useState('');
  const [routeToImporter, setRouteToImporter] = useState(true);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock schedule - kept for high-end "Prospect" intake feel
  const unlinkedAppointments = [
    { id: 'mb-1', name: "John Smith", date: "Today 10:00 AM", type: "First Timers Setup" },
    { id: 'mb-2', name: "Emily Watson", date: "Today 1:00 PM", type: "New Member Focus" },
    { id: 'mb-3', name: "Michael Chen", date: "Tomorrow 9:00 AM", type: "First Timers Setup" },
  ];

  const handleSelectMock = (app: typeof unlinkedAppointments[0]) => {
    const parts = app.name.split(' ');
    setFirstName(parts[0]);
    setLastName(parts.length > 1 ? parts.slice(1).join(' ') : '');
    setMindbodyId(app.id);
  };

  const handleSave = async () => {
    if (!firstName || !lastName) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const clientData: Partial<Client> = {
        firstName,
        lastName,
        phone,
        email,
        isActive: true,
        completedSessions: 0,
        remainingSessions: activeTab === 'prospect' ? 1 : 10,
        gender: "Male",
        height: "5'10\"",
        consultationCompleted: activeTab === 'migration',
        requiresConsultation: activeTab === 'prospect',
      };
      
      if (activeTab === 'prospect') {
        clientData.leadSource = leadSource;
        clientData.notes = notes;
      } else {
        clientData.mindbodyId = mindbodyId;
      }
      
      const docRef = await addDoc(collection(db, 'clients'), {
        ...clientData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      onClientCreated(docRef.id, activeTab === 'migration' && routeToImporter);
      onClose();
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'clients');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/90 backdrop-blur-md">
      <Card className="w-full max-w-2xl bg-[#0A2E46] overflow-hidden border border-slate-700/80 rounded-[40px] shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col max-h-[95vh]">
        
        <div className="p-8 pb-4 shrink-0">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-800 shadow-inner">
                <UserPlus className="w-7 h-7 text-[#F06C22]" />
              </div>
              <div className="flex flex-col">
                <h2 className="text-2xl font-black uppercase tracking-tighter text-white leading-none">Add Client</h2>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-2">Unified Entry Module</p>
              </div>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-slate-950/50 p-1 rounded-xl border border-slate-800">
              <TabsList className="bg-transparent border-none p-0 flex gap-1">
                <TabsTrigger 
                  value="prospect" 
                  className="rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-[#F06C22] data-[state=active]:text-white transition-all"
                >
                  New Prospect
                </TabsTrigger>
                <TabsTrigger 
                  value="migration" 
                  className="rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-[#38BDF8] data-[state=active]:text-white transition-all"
                >
                  Legacy Migration
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">First Name</Label>
                <Input 
                  value={firstName} 
                  onChange={e => setFirstName(e.target.value)}
                  className="h-14 font-black uppercase tracking-tight rounded-2xl bg-black/40 border-slate-800 text-white placeholder:text-slate-700 focus:border-[#F06C22] focus:ring-[#F06C22]/20 shadow-inner"
                  placeholder="First"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Last Name</Label>
                <Input 
                  value={lastName} 
                  onChange={e => setLastName(e.target.value)}
                  className="h-14 font-black uppercase tracking-tight rounded-2xl bg-black/40 border-slate-800 text-white placeholder:text-slate-700 focus:border-[#F06C22] focus:ring-[#F06C22]/20 shadow-inner"
                  placeholder="Last"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email (Optional)</Label>
                <Input 
                  value={email} 
                  onChange={e => setEmail(e.target.value)}
                  className="h-14 font-bold rounded-2xl bg-black/40 border-slate-800 text-white placeholder:text-slate-700 focus:border-[#38BDF8]"
                  placeholder="name@email.com"
                  type="email"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Phone</Label>
                <Input 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)}
                  className="h-14 font-bold rounded-2xl bg-black/40 border-slate-800 text-white placeholder:text-slate-700 focus:border-[#38BDF8]"
                  placeholder="555-555-5555"
                  type="tel"
                />
              </div>
            </div>
          </div>
        </div>

        <CardContent className="px-8 py-6 space-y-6 overflow-y-auto bg-black/20 border-y border-slate-800/50 custom-scrollbar">
          {activeTab === 'prospect' ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Search className="w-3.5 h-3.5 text-[#F06C22]" />
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Marketing Intelligence</Label>
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1">Lead Source</Label>
                  <Select value={leadSource} onValueChange={setLeadSource}>
                    <SelectTrigger className="h-12 bg-slate-900/50 border-slate-800 text-white font-bold rounded-xl">
                      <SelectValue placeholder="How did they hear about us?" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white rounded-xl">
                      <SelectItem value="Referral">Referral / Word of Mouth</SelectItem>
                      <SelectItem value="Web Search">Google / Web Search</SelectItem>
                      <SelectItem value="Drive-by">Drive-by / Walk-in</SelectItem>
                      <SelectItem value="Social Media">Social Media (FB/IG)</SelectItem>
                      <SelectItem value="Other">Other Lead Source</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <ClipboardList className="w-3.5 h-3.5 text-[#F06C22]" />
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Initial Consultation Notes</Label>
                </div>
                <Textarea 
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Jot down goals, constraints, or injuries mentioned during the walk-in..."
                  className="min-h-[120px] bg-slate-900/50 border-slate-800 text-white rounded-2xl resize-none font-medium placeholder:text-slate-700"
                />
              </div>

              <div className="p-4 bg-[#F06C22]/5 border border-[#F06C22]/20 rounded-2xl flex items-start gap-3">
                <Info className="w-5 h-5 text-[#F06C22] shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
                  Creating a <span className="text-white font-bold">New Prospect</span> profile will automatically trigger the intake questionnaire and initial baseline testing protocol during their first session.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-3.5 h-3.5 text-[#38BDF8]" />
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sync & Migration Config</Label>
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1">Mindbody Sync ID (Required for iCal Mapping)</Label>
                  <Input 
                    value={mindbodyId} 
                    onChange={e => setMindbodyId(e.target.value)}
                    className="h-12 font-bold rounded-xl bg-slate-900/50 border-slate-800 text-white placeholder:text-slate-700"
                    placeholder="MBO-XXXXXX"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div 
                  className={`flex items-center gap-4 p-5 rounded-[24px] border transition-all cursor-pointer ${routeToImporter ? 'bg-[#38BDF8]/10 border-[#38BDF8]/50 shadow-[0_0_20px_rgba(56,189,248,0.1)]' : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'}`}
                  onClick={() => setRouteToImporter(!routeToImporter)}
                >
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${routeToImporter ? 'bg-[#38BDF8] border-[#38BDF8]' : 'border-slate-600'}`}>
                    {routeToImporter && <CheckCircle2 className="w-4 h-4 text-[#0A2E46]" />}
                  </div>
                  <div className="flex flex-col">
                    <p className={`text-[15px] font-black uppercase tracking-tight ${routeToImporter ? 'text-[#38BDF8]' : 'text-slate-300'}`}>Full Data Migration</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Route to Legacy Importer immediately after creation.</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#38BDF8]/5 border border-[#38BDF8]/20 rounded-2xl flex items-start gap-3">
                <FileUp className="w-5 h-5 text-[#38BDF8] shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
                  The <span className="text-white font-bold">Legacy Migration</span> pathway assumes this client has existing charts. Use the importer to digitize their FileMaker or Paper history into the HUD.
                </p>
              </div>
            </div>
          )}
        </CardContent>

        <div className="p-8 shrink-0 flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={onClose}
            className="flex-1 h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] text-slate-500 hover:text-white transition-all"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isSubmitting || !firstName || !lastName}
            className={`flex-[2] h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl transition-all active:scale-95 ${activeTab === 'prospect' ? 'bg-[#F06C22] hover:bg-[#F06C22]/90 text-white' : 'bg-[#38BDF8] hover:bg-[#38BDF8]/90 text-[#0A2E46]'}`}
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <span className="flex items-center gap-2">
                {activeTab === 'prospect' ? <Target className="w-4 h-4" /> : <FileUp className="w-4 h-4" />}
                {activeTab === 'prospect' ? 'Create Prospect Profile' : 'Initialize Migration Profile'}
              </span>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
