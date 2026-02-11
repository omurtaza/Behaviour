
import React, { useState } from 'react';
import { parseSpreadsheet, generateSampleCSV } from './utils/fileHelper';
import { analyzeFlagData } from './services/geminiService';
import { AppState } from './types';
import InsightsDashboard from './components/InsightsDashboard';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    isAnalyzing: false,
    error: null,
    data: null,
    analysis: null,
  });
  const [isDragging, setIsDragging] = useState(false);

  const processFile = async (file: File) => {
    setState(prev => ({ ...prev, isAnalyzing: true, error: null }));
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const records = parseSpreadsheet(buffer);
        if (records.length === 0) throw new Error("Could not find flag data. Ensure headers like 'Pupil Name' and 'Date' are present.");
        const analysis = await analyzeFlagData(records);
        setState({ isAnalyzing: false, error: null, data: records, analysis });
      } catch (err: any) {
        setState(prev => ({ ...prev, isAnalyzing: false, error: err.message || "Failed to analyze data" }));
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white text-xl shadow-lg shadow-emerald-100">
                <i className="fas fa-file-excel"></i>
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 leading-none">School Insight Engine</h1>
                <p className="text-[10px] uppercase tracking-widest text-emerald-600 font-bold">SLT Behavioral Analytics</p>
              </div>
            </div>
            {state.analysis && (
              <button onClick={() => setState({ isAnalyzing: false, error: null, data: null, analysis: null })} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl font-bold text-sm hover:bg-slate-200">
                <i className="fas fa-undo mr-1"></i> New Excel
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {!state.analysis && !state.isAnalyzing && (
          <div className="max-w-4xl mx-auto mt-8">
            <div className="text-center mb-12 space-y-4">
              <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black uppercase tracking-widest border border-emerald-100 mb-2">
                <i className="fas fa-shield-halved mr-2"></i> Professional School Analytics
              </div>
              <h2 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight">
                Upload your <span className="text-emerald-600 underline decoration-emerald-200">Behavior Export</span>.
              </h2>
              <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed font-medium">
                Optimized for standard school exports with headers: <span className="text-slate-800 font-bold italic">Pupil Name, House, Date, Teacher, Subject...</span>
              </p>
            </div>

            <div 
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files?.[0]; if (file) processFile(file); }}
              className={`bg-white p-16 rounded-[3rem] shadow-2xl transition-all duration-300 border-4 border-dashed flex flex-col items-center relative group ${isDragging ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100'}`}
            >
              <div className="w-32 h-32 bg-emerald-50 text-emerald-600 rounded-[2rem] flex items-center justify-center text-5xl mb-8 group-hover:rotate-6 transition-transform">
                <i className="fas fa-file-excel"></i>
              </div>
              <h3 className="text-3xl font-black text-slate-900 mb-3">Drop school Excel file here</h3>
              <p className="text-slate-400 text-lg mb-12 font-medium">Handles repeated header rows and daily groupings automatically.</p>
              
              <div className="flex flex-col sm:flex-row gap-6 w-full justify-center px-8">
                <label className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white font-black py-6 px-16 rounded-3xl transition-all shadow-xl inline-flex items-center gap-4 justify-center text-xl">
                  <i className="fas fa-plus-circle"></i> Select Excel
                  <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) processFile(file); }} />
                </label>
              </div>
            </div>
          </div>
        )}

        {state.isAnalyzing && (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="relative w-40 h-40 mb-12 animate-bounce">
              <i className="fas fa-robot text-7xl text-emerald-600"></i>
            </div>
            <h2 className="text-4xl font-black text-slate-900 mb-4 text-center">Identifying Behavioral Hotspots</h2>
            <p className="text-xl text-slate-500 max-w-sm text-center font-medium">Analyzing Houses, Subjects, and Year Groups...</p>
          </div>
        )}

        {state.analysis && state.data && (
          <InsightsDashboard analysis={state.analysis} allRecords={state.data} />
        )}

        {state.error && (
          <div className="max-w-2xl mx-auto mt-8 bg-white border-2 border-rose-100 p-10 rounded-[2.5rem] flex flex-col items-center text-center">
            <i className="fas fa-exclamation-triangle text-rose-600 text-5xl mb-6"></i>
            <h3 className="font-black text-2xl mb-3">Upload Error</h3>
            <p className="text-slate-500 mb-8">{state.error}</p>
            <button onClick={() => setState(prev => ({ ...prev, error: null }))} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black">Retry</button>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
