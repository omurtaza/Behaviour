
import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, AreaChart, Area
} from 'recharts';
import { AnalysisSummary, FlagRecord, ChartDataPoint } from '../types';
import StatsCard from './StatsCard';

interface Props {
  analysis: AnalysisSummary;
  allRecords: FlagRecord[];
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6'];

const InsightsDashboard: React.FC<Props> = ({ analysis, allRecords }) => {
  const [activeYear, setActiveYear] = useState<string>('Overall');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const years = useMemo(() => {
    const y = Array.from(new Set(allRecords.map(r => r.yearGroup))).filter(Boolean);
    return ['Overall', ...y.sort()];
  }, [allRecords]);

  const filteredRecords = useMemo(() => {
    let records = allRecords;
    if (activeYear !== 'Overall') {
      records = records.filter(r => r.yearGroup === activeYear);
    }
    const start = startDate ? new Date(startDate).getTime() : 0;
    const end = endDate ? new Date(endDate).getTime() : Infinity;
    return records.filter(r => (r.timestamp || 0) >= start && (r.timestamp || 0) <= end);
  }, [allRecords, activeYear, startDate, endDate]);

  const dynamicTrends = useMemo(() => {
    const getTopN = (map: Map<string, number>, n = 6): ChartDataPoint[] => 
      Array.from(map.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, n);

    const teachersMap = new Map<string, number>();
    const categoriesMap = new Map<string, number>();
    const daysMap = new Map<string, number>();
    const chronoMap = new Map<string, number>();
    const studentsMap = new Map<string, { count: number, reasons: Map<string, number>, teachers: Set<string> }>();

    const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    filteredRecords.forEach(r => {
      teachersMap.set(r.teacher, (teachersMap.get(r.teacher) || 0) + 1);
      categoriesMap.set(r.category, (categoriesMap.get(r.category) || 0) + 1);
      
      const date = new Date(r.timestamp || 0);
      const day = date.toLocaleDateString('en-GB', { weekday: 'long' });
      daysMap.set(day, (daysMap.get(day) || 0) + 1);

      const weekStart = new Date(r.timestamp || 0);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
      const weekKey = weekStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      chronoMap.set(weekKey, (chronoMap.get(weekKey) || 0) + 1);

      const sData = studentsMap.get(r.studentName) || { count: 0, reasons: new Map(), teachers: new Set() };
      sData.count++;
      sData.reasons.set(r.category, (sData.reasons.get(r.category) || 0) + 1);
      sData.teachers.add(r.teacher);
      studentsMap.set(r.studentName, sData);
    });

    const normalize = (name: string) => name.toLowerCase().replace(/[^a-z]/g, '');

    const flyerList = Array.from(studentsMap.entries())
      .map(([name, data]) => {
        // Find main reason
        const topReason = Array.from(data.reasons.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "Unknown";
        
        // Find AI summary with normalized matching
        const normalizedName = normalize(name);
        const aiMatch = analysis.hotspots.students.find(s => normalize(s.name) === normalizedName);
        
        let finalSummary = aiMatch?.summary;

        // If no AI summary (common for flyers in filtered views that aren't global flyers), 
        // generate a high-quality data-driven summary.
        if (!finalSummary) {
          const teacherCount = data.teachers.size;
          finalSummary = `Demonstrates a pattern of incidents related primarily to ${topReason} across ${teacherCount} different ${teacherCount === 1 ? 'teacher' : 'teachers'}. Strategic support should focus on ${topReason.toLowerCase()} engagement.`;
        }

        return {
          name,
          count: data.count,
          mainReason: topReason,
          summary: finalSummary
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    return {
      teachers: getTopN(teachersMap, 8),
      categories: getTopN(categoriesMap, 6),
      days: dayOrder.map(d => ({ name: d, value: daysMap.get(d) || 0 })),
      chronological: Array.from(chronoMap.entries()).map(([name, value]) => ({ name, value })),
      frequentFlyers: flyerList
    };
  }, [filteredRecords, analysis.hotspots.students]);

  const currentYearAnalysis = useMemo(() => {
    if (activeYear === 'Overall') return null;
    return analysis.yearInsights.find(y => y.year === activeYear);
  }, [activeYear, analysis.yearInsights]);

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-700">
      {/* Navigation */}
      <div className="flex overflow-x-auto pb-2 scrollbar-hide gap-2 no-wrap sticky top-16 bg-slate-50/90 backdrop-blur-sm z-20 py-4">
        {years.map(year => (
          <button
            key={year}
            onClick={() => setActiveYear(year)}
            className={`px-6 py-3 rounded-full text-sm font-black whitespace-nowrap transition-all border-2 ${
              activeYear === year 
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' 
                : 'bg-white text-slate-500 border-slate-100 hover:border-indigo-200'
            }`}
          >
            {year}
          </button>
        ))}
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard title={`Total Flags (${activeYear})`} value={filteredRecords.length} icon="fa-flag" color="bg-indigo-600" />
        <StatsCard title="Top Issuer" value={dynamicTrends.teachers[0]?.name || "N/A"} icon="fa-chalkboard-user" color="bg-violet-600" />
        <StatsCard title="Peak Trend" value={dynamicTrends.days.reduce((a, b) => (a.value || 0) > (b.value || 0) ? a : b, {name: 'N/A', value: 0}).name} icon="fa-calendar-day" color="bg-amber-600" />
        <StatsCard title="Core Concern" value={dynamicTrends.categories[0]?.name || "N/A"} icon="fa-triangle-exclamation" color="bg-rose-600" />
      </div>

      {/* Strategic Summary */}
      <div className="bg-slate-900 rounded-[3rem] text-white p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400">
                <i className="fas fa-brain text-2xl"></i>
              </div>
              <h3 className="text-3xl font-black">{activeYear} Strategic Briefing</h3>
            </div>
            <p className="text-slate-300 text-xl leading-relaxed italic">
              "{activeYear === 'Overall' ? analysis.aiInsights : currentYearAnalysis?.insight}"
            </p>
            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
              <h4 className="text-indigo-400 font-black uppercase text-xs tracking-widest mb-3">Primary Strategic Priority</h4>
              <p className="text-lg font-bold text-white">
                {activeYear === 'Overall' ? `Drive improvements in ${analysis.mostCommonReason} through consistent framework application.` : currentYearAnalysis?.priority}
              </p>
            </div>
          </div>
          
          <div className="space-y-6">
            <h4 className="text-indigo-400 font-black uppercase text-xs tracking-widest flex items-center gap-2">
              <i className="fas fa-list-check"></i> Recommended Interventions
            </h4>
            <ul className="space-y-4">
              {(activeYear === 'Overall' ? analysis.interventions : currentYearAnalysis?.interventions)?.map((item, i) => (
                <li key={i} className="flex gap-4 items-start group">
                  <span className="bg-indigo-500/30 text-indigo-300 w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-black group-hover:bg-indigo-500 transition-colors">{i+1}</span>
                  <span className="text-sm font-bold text-slate-200">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Leadership Intelligence: Temporal & Contextual Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-amber-50 border-2 border-amber-100 rounded-[2.5rem] p-8">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white">
                    <i className="fas fa-clock-rotate-left"></i>
                </div>
                <h3 className="text-xl font-black text-amber-900 underline decoration-amber-200">Temporal Spike Analysis</h3>
            </div>
            <div className="space-y-4">
                {analysis.temporalSpikes.map((spike, i) => (
                    <div key={i} className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm flex gap-4">
                        <i className="fas fa-chart-line text-amber-500 mt-1"></i>
                        <p className="text-sm font-bold text-amber-800 leading-relaxed">{spike}</p>
                    </div>
                ))}
            </div>
        </div>

        <div className="bg-rose-50 border-2 border-rose-100 rounded-[2.5rem] p-8">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center text-white">
                    <i className="fas fa-shield-halved"></i>
                </div>
                <h3 className="text-xl font-black text-rose-900 underline decoration-rose-200">Behavioral Pattern Alerts</h3>
            </div>
            <div className="space-y-4">
                {(activeYear === 'Overall' ? analysis.yearInsights.flatMap(y => y.alerts.slice(0,1)) : currentYearAnalysis?.alerts)?.map((alert, i) => (
                    <div key={i} className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm flex gap-4">
                        <i className="fas fa-circle-info text-rose-400 mt-1"></i>
                        <p className="text-sm font-bold text-rose-800 leading-relaxed">{alert}</p>
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* Full Chronological Trend Chart */}
      <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
                <h3 className="text-2xl font-black flex items-center gap-3">
                    <i className="fas fa-timeline text-indigo-600"></i> Chronological Volume Trend
                </h3>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Flags issued per week</p>
            </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dynamicTrends.chronological}>
              <defs>
                <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'black', fill: '#64748b'}} />
              <YAxis hide />
              <Tooltip cursor={{stroke: '#6366f1', strokeWidth: 2}} contentStyle={{borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
              <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorVal)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <h3 className="text-xl font-black mb-6 flex items-center gap-2">
            <i className="fas fa-calendar-week text-indigo-600"></i> Daily Incident Breakdown
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dynamicTrends.days}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'black', fill: '#64748b'}} />
                <YAxis hide />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '1rem', border: 'none'}} />
                <Bar dataKey="value" fill="#6366f1" radius={[10, 10, 0, 0]}>
                  {dynamicTrends.days.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.value === Math.max(...dynamicTrends.days.map(d => d.value)) ? '#4f46e5' : '#e2e8f0'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <h3 className="text-xl font-black mb-6 flex items-center gap-2">
            <i className="fas fa-tags text-rose-600"></i> Category Distribution
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dynamicTrends.categories}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {dynamicTrends.categories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{borderRadius: '1rem', border: 'none'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Hotspots Section */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black flex items-center gap-2 text-rose-600">
              <i className="fas fa-user-shield"></i> Behavioral Hotspots
            </h3>
            <span className="bg-rose-50 text-rose-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Focused Review</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dynamicTrends.frequentFlyers.map((student, idx) => (
              <div key={idx} className="p-6 bg-slate-50 rounded-[2rem] border border-transparent hover:border-rose-200 transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="truncate">
                    <p className="font-black text-slate-800 text-base group-hover:text-rose-700 transition-colors truncate">{student.name}</p>
                    <span className="text-[10px] font-black bg-rose-100 text-rose-700 px-2 py-0.5 rounded-md uppercase">{student.mainReason}</span>
                  </div>
                  <div className="bg-white w-10 h-10 rounded-xl border-2 border-slate-100 shadow-sm flex flex-col items-center justify-center text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-all flex-shrink-0">
                    <span className="text-xs font-black leading-none">{student.count}</span>
                  </div>
                </div>
                <p className="text-[11px] font-bold text-slate-600 leading-tight italic">
                  {student.summary}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <h3 className="text-xl font-black mb-8 flex items-center gap-2">
            <i className="fas fa-chalkboard-user text-indigo-600"></i> Top Faculty Issuers
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dynamicTrends.teachers} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 'black', fill: '#1e293b'}} />
                <Tooltip cursor={{fill: '#f1f5f9'}} />
                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 15, 15, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-6 text-[10px] font-bold text-slate-400 italic">Faculty engagement metrics filtered for {activeYear}.</p>
        </div>
      </div>
    </div>
  );
};

export default InsightsDashboard;
