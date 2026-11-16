import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  FileText,
  Shield,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Cpu,
  Layers,
  Wrench,
  Lock,
  ChevronRight
} from 'lucide-react';
import { getRunbooks } from '../services/api';

export const RunbooksPage: React.FC = () => {
  const [runbooks, setRunbooks] = useState<any[]>([]);
  const [selectedRunbook, setSelectedRunbook] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  useEffect(() => {
    loadRunbooksData();
  }, []);

  const loadRunbooksData = async () => {
    setLoading(true);
    try {
      const data = await getRunbooks();
      setRunbooks(data);
      if (data.length > 0) {
        setSelectedRunbook(data[0]);
      }
    } catch (e) {
      console.error('Failed to load runbooks', e);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['ALL', ...Array.from(new Set(runbooks.map((r) => r.category)))];

  const filteredRunbooks = runbooks.filter((r) => {
    const matchesCategory = selectedCategory === 'ALL' || r.category === selectedCategory;
    const matchesSearch =
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.doc_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner: Knowledge Base & SOP Grounding */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono font-semibold uppercase tracking-wider text-amber-400 mb-1">
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>Enterprise IT Knowledge Base</span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-400">Official SOP Grounding</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Standard Operating Procedure (SOP) Runbooks
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              These approved enterprise runbooks ground the Central AI Agent. The agent is strictly constrained to execute only the allowlisted tools and procedures certified in these documents.
            </p>
          </div>

          <div className="flex items-center space-x-2 bg-slate-950/80 border border-slate-800 p-3 rounded-xl text-xs text-slate-300">
            <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div>
              <div className="font-semibold text-white">Zero-Hallucination Guardrails</div>
              <div className="text-[10px] text-slate-400">Agent tools mapped 1:1 to corporate SOPs</div>
            </div>
          </div>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search runbooks or tools..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: Runbook List & Active Runbook Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Runbook List (4 Cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="text-xs font-mono font-semibold tracking-wider uppercase text-slate-400 px-1">
            Certified Runbooks ({filteredRunbooks.length})
          </div>

          <div className="space-y-2.5">
            {filteredRunbooks.map((rb) => {
              const isSelected = selectedRunbook?.id === rb.id;
              return (
                <div
                  key={rb.id}
                  onClick={() => setSelectedRunbook(rb)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-amber-950/30 border-amber-500/60 shadow-md shadow-amber-500/10 ring-1 ring-amber-500/30'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-slate-800 text-amber-300 border border-slate-700">
                      {rb.doc_code}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono uppercase">{rb.category}</span>
                  </div>

                  <h3 className="text-sm font-bold text-white mt-2 leading-snug">{rb.title}</h3>

                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">
                      {Object.keys(rb.allowable_tools || {}).length} tools authorized
                    </span>
                    <span className={`font-semibold flex items-center space-x-1 ${isSelected ? 'text-amber-400' : 'text-slate-500'}`}>
                      <span>View</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Runbook Document Reader (8 Cols) */}
        <div className="lg:col-span-8">
          {selectedRunbook ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              {/* Document Header */}
              <div className="pb-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300">
                      {selectedRunbook.doc_code}
                    </span>
                    <span className="text-xs font-mono text-slate-400 uppercase">
                      Category: {selectedRunbook.category}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white mt-1.5">{selectedRunbook.title}</h2>
                </div>

                <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Approved for Autonomous Triage</span>
                </div>
              </div>

              {/* Allowable Tools Permissions Matrix */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase font-semibold text-slate-300 flex items-center space-x-1.5">
                    <Wrench className="w-3.5 h-3.5 text-blue-400" />
                    <span>Authorized Automated Tools Matrix</span>
                  </span>
                  <span className="text-[10px] text-slate-500">Security Boundary</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {Object.entries(selectedRunbook.allowable_tools || {}).map(([toolName, level]: [string, any]) => {
                    const isSafe = level === 'SAFE' || level === 'READ_ONLY' || level === 'DIAGNOSTIC';
                    return (
                      <div
                        key={toolName}
                        className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between"
                      >
                        <span className="text-xs font-mono text-slate-200">{toolName}</span>
                        <span
                          className={`text-[9px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                            isSafe
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {String(level)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Full Document Content */}
              <div className="space-y-3">
                <div className="text-xs font-mono uppercase font-semibold text-slate-400">
                  Official Standard Operating Procedure Content
                </div>
                <div className="p-5 bg-slate-950 border border-slate-800/90 rounded-xl text-slate-300 text-xs leading-relaxed font-sans whitespace-pre-line space-y-4 max-h-[500px] overflow-y-auto">
                  {selectedRunbook.content}
                </div>
              </div>

              {/* Security Boundary Note */}
              <div className="p-3 bg-blue-950/20 border border-blue-500/20 rounded-xl flex items-start space-x-2 text-xs text-blue-300">
                <Shield className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <p>
                  <strong>Autonomous Boundary:</strong> The AI Agent can only perform actions listed in this runbook. If a resolution requires an unlisted tool, the agent must escalate the ticket to Tier-2 human engineering.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
              Select a runbook from the left to view procedures and tool boundaries.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
