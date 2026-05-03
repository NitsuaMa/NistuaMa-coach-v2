import React, { useState } from 'react';
import { Filter, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PhysicalStressProfile } from '../data/occupational-matrix';
import { InsightsFilterState } from '../data/insights-logic';
import { DemographicRetentionChart } from './DemographicRetentionChart';
import { MachineEfficacyChart } from './MachineEfficacyChart';
import { TimeToTrendChart } from './TimeToTrendChart';
import { useInsightsData } from '../hooks/useInsightsData';

export function InsightsDashboardView(props: any) {
  const [filters, setFilters] = useState<InsightsFilterState>({
    startDate: null,
    endDate: null,
    ageBrackets: [],
    genders: [],
    physicalStressProfiles: []
  });

  const { data, loading, error } = useInsightsData(filters);

  return (
    <div className="flex flex-col w-full h-full bg-[#0A2E46] overflow-x-hidden p-6 md:p-8 space-y-8 safe-area-pt pb-24">
      {/* Header & Filter Hub */}
      <div className="shrink-0 flex flex-col gap-6">
        <div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white leading-none">
            Clinical Insights
          </h1>
          <p className="text-sm font-bold uppercase tracking-widest text-[#38BDF8] mt-2">
            Demographic & Efficacy Analytics
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-700 p-4 rounded-2xl shadow-xl flex flex-col md:flex-row gap-4 items-center w-full">
          <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-xs shrink-0 mr-2">
            <Filter className="w-4 h-4" />
            Filters
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
            <Select defaultValue="30days">
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white font-bold h-12 rounded-xl">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 text-white">
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
                <SelectItem value="ytd">Year to Date</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>

            <Select defaultValue="all">
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white font-bold h-12 rounded-xl">
                <SelectValue placeholder="Age Bracket" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 text-white">
                <SelectItem value="all">All Ages</SelectItem>
                <SelectItem value="18-35">18 - 35</SelectItem>
                <SelectItem value="36-55">36 - 55</SelectItem>
                <SelectItem value="56+">56+</SelectItem>
              </SelectContent>
            </Select>

            <Select defaultValue="all">
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white font-bold h-12 rounded-xl">
                <SelectValue placeholder="Gender" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 text-white">
                <SelectItem value="all">All Genders</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              defaultValue="all" 
              onValueChange={(val) => setFilters(prev => ({ 
                ...prev, 
                physicalStressProfiles: val === 'all' ? [] : [val as PhysicalStressProfile] 
              }))}
            >
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white font-bold h-12 rounded-xl">
                <SelectValue placeholder="Stress Profile" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 text-white">
                <SelectItem value="all">All Profiles</SelectItem>
                <SelectItem value={PhysicalStressProfile.SEDENTARY_DESK}>Sedentary Desk</SelectItem>
                <SelectItem value={PhysicalStressProfile.PROLONGED_STANDING}>Prolonged Standing</SelectItem>
                <SelectItem value={PhysicalStressProfile.MANUAL_LABOR}>Manual Labor</SelectItem>
                <SelectItem value={PhysicalStressProfile.HEALTHCARE_CLINICAL}>Healthcare / Clinical</SelectItem>
                <SelectItem value={PhysicalStressProfile.DYNAMIC_MIXED}>Dynamic / Mixed</SelectItem>
                <SelectItem value={PhysicalStressProfile.TRANSPORTATION}>Transportation</SelectItem>
                <SelectItem value={PhysicalStressProfile.RETIRED_ACTIVE}>Retired (Active)</SelectItem>
                <SelectItem value={PhysicalStressProfile.RETIRED_INACTIVE}>Retired (Inactive)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
           <Loader2 className="w-8 h-8 animate-spin mb-4 text-[#38BDF8]" />
           <p className="text-sm font-black uppercase tracking-widest text-[#38BDF8]">Loading Global Insights...</p>
        </div>
      )}

      {error && (
        <div className="flex-1 flex flex-col items-center justify-center text-red-400">
           <AlertCircle className="w-12 h-12 mb-4 text-red-500" />
           <p className="text-sm font-black uppercase tracking-widest">Failed to load insights</p>
           <p className="text-xs font-bold text-slate-500 mt-2">{error.message}</p>
        </div>
      )}

      {/* Chart Grid */}
      {!loading && !error && (
        <div className="flex-1 grid grid-cols-1 gap-8 content-start pb-12">
          
          {/* Card 1 */}
          <Card className="bg-[#F8F9FA] border-slate-200/50 rounded-[32px] shadow-lg flex flex-col h-[400px]">
            <CardHeader className="border-b border-slate-200 p-6 shrink-0">
              <CardTitle className="text-xl font-black uppercase text-slate-800 tracking-tight">
                Demographic Retention Analysis
              </CardTitle>
              <CardDescription className="text-xs font-bold uppercase tracking-widest text-[#F06C22]">
                LTV & Churn by Age / Occupation
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-6 h-[300px]">
              <DemographicRetentionChart data={data?.retention} />
            </CardContent>
          </Card>

          {/* Card 2 */}
          <Card className="bg-[#F8F9FA] border-slate-200/50 rounded-[32px] shadow-lg flex flex-col h-[400px]">
            <CardHeader className="border-b border-slate-200 p-6 shrink-0">
              <CardTitle className="text-xl font-black uppercase text-slate-800 tracking-tight">
                Machine Efficacy by Occupational Stress
              </CardTitle>
              <CardDescription className="text-xs font-bold uppercase tracking-widest text-[#38BDF8]">
                Load Progression Across Hardware
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-6 h-[300px]">
              <MachineEfficacyChart data={data?.machineEfficacy} />
            </CardContent>
          </Card>

          {/* Card 3 */}
          <Card className="bg-[#F8F9FA] border-slate-200/50 rounded-[32px] shadow-lg flex flex-col h-[400px]">
            <CardHeader className="border-b border-slate-200 p-6 shrink-0">
              <CardTitle className="text-xl font-black uppercase text-slate-800 tracking-tight">
                Time-to-Trend Data
              </CardTitle>
              <CardDescription className="text-xs font-bold uppercase tracking-widest text-[#10B981]">
                Sessions Required for 20% Load Increase
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-6 h-[300px]">
              <TimeToTrendChart data={data?.timeToTrend} />
            </CardContent>
          </Card>

        </div>
      )}
    </div>
  );
}
