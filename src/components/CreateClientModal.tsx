import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserPlus, User, Loader2, ArrowRight } from 'lucide-react';
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock schedule
  const unlinkedAppointments = [
    { name: "John Smith", date: "Today 10:00 AM", type: "First Timers Setup" },
    { name: "Emily Watson", date: "Today 1:00 PM", type: "New Member Focus" },
  ];

  const handleSelectMock = (name: string) => {
    const parts = name.split(' ');
    setFirstName(parts[0]);
    setLastName(parts.length > 1 ? parts.slice(1).join(' ') : '');
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
        isActive: true,
        completedSessions: 0,
        remainingSessions: 10,
        gender: "Male",
        height: "5'10\""
      };
      
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
      <Card className="w-full max-w-2xl bg-[#F8FAFC] overflow-hidden border-2 rounded-[32px] shadow-2xl flex flex-col max-h-[90vh]">
        
        <div className="p-8 bg-gradient-to-r from-[#115E8D] to-[#0A2E46] text-white shrink-0">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter">Add New Client</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#38BDF8]">Create Base Profile</p>
            </div>
          </div>
        </div>

        <CardContent className="p-8 overflow-y-auto space-y-8 min-h-0 bg-white">
          
          <div className="space-y-4">
             <label className="text-xs font-black uppercase tracking-widest text-slate-500">Unlinked Scheduled Consultations</label>
             <div className="space-y-3">
               {unlinkedAppointments.map((app, idx) => (
                 <button
                   key={idx}
                   onClick={() => handleSelectMock(app.name)}
                   className="w-full text-left bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between hover:bg-slate-100 transition-colors"
                 >
                   <div>
                     <p className="font-bold text-[#0F172A]">{app.name}</p>
                     <p className="text-[10px] font-bold uppercase text-slate-500">{app.date} • {app.type}</p>
                   </div>
                   <ArrowRight className="w-5 h-5 text-slate-400" />
                 </button>
               ))}
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">First Name</label>
              <Input 
                value={firstName} 
                onChange={e => setFirstName(e.target.value)}
                className="h-14 font-bold rounded-xl"
                placeholder="First Name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Last Name</label>
              <Input 
                value={lastName} 
                onChange={e => setLastName(e.target.value)}
                className="h-14 font-bold rounded-xl"
                placeholder="Last Name"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Phone</label>
              <Input 
                value={phone} 
                onChange={e => setPhone(e.target.value)}
                className="h-14 font-bold rounded-xl"
                placeholder="Phone Number"
                type="tel"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Email</label>
              <Input 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                className="h-14 font-bold rounded-xl"
                placeholder="Email Address"
                type="email"
              />
            </div>
          </div>
          
        </CardContent>

        <div className="p-8 border-t bg-slate-50 shrink-0 flex items-center justify-between gap-4">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="flex-1 h-14 rounded-xl font-bold uppercase tracking-widest text-slate-500"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isSubmitting || !firstName || !lastName}
            className="flex-1 h-14 rounded-xl font-bold uppercase tracking-widest bg-[#115E8D] hover:bg-[#0c4366] text-white"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Profile'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
