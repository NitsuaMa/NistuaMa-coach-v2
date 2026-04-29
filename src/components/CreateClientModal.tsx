import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserPlus, User, Loader2, ArrowRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Client } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface CreateClientModalProps {
  initialName?: string;
  onClose: () => void;
  onClientCreated: (clientId: string) => void;
}

export function CreateClientModal({ initialName = '', onClose, onClientCreated }: CreateClientModalProps) {
  const nameParts = initialName.trim().split(' ');
  const [firstName, setFirstName] = useState(nameParts[0] || '');
  const [lastName, setLastName] = useState(nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [packageTier, setPackageTier] = useState<"6-Month" | "12-Month" | "18-Month" | "None">("None");
  const [isFirstTimeConsult, setIsFirstTimeConsult] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mindbodyId, setMindbodyId] = useState<string | null>(null);

  // Mock schedule
  const unlinkedAppointments = [
    { id: 'mb-1', name: "John Smith", date: "Today 10:00 AM", type: "First Timers Setup" },
    { id: 'mb-2', name: "Emily Watson", date: "Today 1:00 PM", type: "New Member Focus" },
    { id: 'mb-3', name: "Michael Chen", date: "Tomorrow 9:00 AM", type: "First Timers Setup" },
    { id: 'mb-4', name: "Sarah Davis", date: "Tomorrow 11:30 AM", type: "New Member Focus" },
    { id: 'mb-5', name: "David Wilson", date: "Tomorrow 2:00 PM", type: "First Timers Setup" },
    { id: 'mb-6', name: "Jessica Taylor", date: "Wed 10:00 AM", type: "First Timers Setup" },
  ];

  const handleSelectMock = (app: typeof unlinkedAppointments[0]) => {
    const parts = app.name.split(' ');
    setFirstName(parts[0]);
    setLastName(parts.length > 1 ? parts.slice(1).join(' ') : '');
    setMindbodyId(app.id);
  };

  const handleSave = async () => {
    if (!firstName || !lastName) {
      alert("First and Last name are required");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const clientData: Partial<Client> = {
        firstName,
        lastName,
        phone,
        email,
        packageTier,
        isActive: true,
        completedSessions: 0,
        remainingSessions: 10,
        gender: "Male",
        height: "5'10\"",
        consultationCompleted: !isFirstTimeConsult,
        requiresConsultation: isFirstTimeConsult,
      };
      
      if (mindbodyId) {
        clientData.mindbodyId = mindbodyId;
      }
      
      const docRef = await addDoc(collection(db, 'clients'), {
        ...clientData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      onClientCreated(docRef.id);
      onClose();
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'clients');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/80 backdrop-blur-sm">
      <Card className="w-full max-w-3xl bg-slate-900 overflow-hidden border border-slate-700/80 rounded-[32px] shadow-2xl flex flex-col max-h-[90vh]">
        
        <div className="p-8 bg-slate-800/50 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700">
              <UserPlus className="w-6 h-6 text-[#38BDF8]" />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Add New Client</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#38BDF8]">Create Base Profile</p>
            </div>
          </div>
        </div>

        <CardContent className="p-8 overflow-y-auto space-y-10 min-h-0 bg-slate-900 custom-scrollbar">
          
          <div className="space-y-4">
             <div>
               <h3 className="text-[13px] font-black uppercase tracking-widest text-[#38BDF8]">Unlinked Scheduled Consults</h3>
               <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">Select an imported Mindbody consult to auto-populate the details below.</p>
             </div>
             <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar pr-2">
               {unlinkedAppointments.map((app) => (
                 <button
                   key={app.id}
                   onClick={() => handleSelectMock(app)}
                   className={`w-full text-left bg-slate-800 border ${mindbodyId === app.id ? 'border-[#F06C22] shadow-[0_0_15px_rgba(240,108,34,0.15)] bg-slate-800/80' : 'border-slate-700 hover:border-[#38BDF8]/50'} p-4 rounded-xl flex items-center justify-between transition-all group`}
                 >
                   <div>
                     <p className={`font-bold transition-colors ${mindbodyId === app.id ? 'text-[#F06C22]' : 'text-white group-hover:text-[#38BDF8]'}`}>
                       {app.name}
                     </p>
                     <p className="text-[10px] font-bold uppercase text-slate-400 mt-0.5">{app.date} • {app.type}</p>
                   </div>
                   <ArrowRight className={`w-5 h-5 transition-colors ${mindbodyId === app.id ? 'text-[#F06C22]' : 'text-slate-600 group-hover:text-[#38BDF8]'}`} />
                 </button>
               ))}
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-800">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">First Name</label>
              <Input 
                value={firstName} 
                onChange={e => setFirstName(e.target.value)}
                className="h-14 font-bold rounded-xl bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-[#38BDF8]"
                placeholder="First Name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Last Name</label>
              <Input 
                value={lastName} 
                onChange={e => setLastName(e.target.value)}
                className="h-14 font-bold rounded-xl bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-[#38BDF8]"
                placeholder="Last Name"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Phone</label>
              <Input 
                value={phone} 
                onChange={e => setPhone(e.target.value)}
                className="h-14 font-bold rounded-xl bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-[#38BDF8]"
                placeholder="Phone Number"
                type="tel"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Email</label>
              <Input 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                className="h-14 font-bold rounded-xl bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-[#38BDF8]"
                placeholder="Email Address"
                type="email"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Package Tier</label>
              <Select value={packageTier} onValueChange={(v: "6-Month" | "12-Month" | "18-Month" | "None") => setPackageTier(v)}>
                <SelectTrigger className="w-full h-14 bg-slate-800 border-slate-700 text-white font-bold rounded-xl">
                  <SelectValue placeholder="Select Tier" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-white rounded-xl">
                  <SelectItem value="None">None / Trial</SelectItem>
                  <SelectItem value="6-Month">6-Month</SelectItem>
                  <SelectItem value="12-Month">12-Month</SelectItem>
                  <SelectItem value="18-Month">18-Month (VIP)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6">
            <div className={`flex items-center gap-4 p-5 rounded-2xl border transition-all cursor-pointer ${isFirstTimeConsult ? 'bg-[#38BDF8]/10 border-[#38BDF8]/50 shadow-[0_0_15px_rgba(56,189,248,0.15)]' : 'bg-slate-800 border-slate-700 hover:border-slate-600'}`} onClick={() => setIsFirstTimeConsult(!isFirstTimeConsult)}>
              <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${isFirstTimeConsult ? 'bg-[#38BDF8] border-[#38BDF8]' : 'border-slate-500'}`}>
                {isFirstTimeConsult && <div className="w-2 h-2 bg-slate-900 rounded-sm" />}
              </div>
              <div>
                <p className={`text-[15px] font-bold tracking-tight ${isFirstTimeConsult ? 'text-[#38BDF8]' : 'text-slate-200'}`}>First-Time Consult Client</p>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Initiates the onboarding wizard and baseline generation.</p>
              </div>
            </div>
          </div>
          
        </CardContent>

        <div className="p-8 border-t border-slate-800 bg-slate-900 shrink-0 flex items-center justify-between gap-4">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="flex-1 h-14 rounded-xl font-black uppercase tracking-widest bg-transparent border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isSubmitting || !firstName || !lastName}
            className="flex-1 h-14 rounded-xl font-black uppercase tracking-widest bg-[#38BDF8] hover:bg-[#0ea5e9] text-[#0A2E46]"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Profile'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

