import React, { useState } from 'react';
import {
  ShieldCheck,
  LayoutDashboard,
  Terminal,
  CheckCircle2,
  Sparkles,
  Menu,
  X,
  ChevronRight,
  Database,
  Activity,
  BookOpen
} from 'lucide-react';

export type ActiveNavView =
  | 'employee-new'
  | 'copilot'
  | 'employee-track'
  | 'admin-queue'
  | 'diagnostics-lab'
  | 'runbooks';

interface SidebarProps {
  currentView: ActiveNavView;
  onViewChange: (view: ActiveNavView) => void;
  activeTicketNumber?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, activeTicketNumber }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavClick = (view: ActiveNavView) => {
    onViewChange(view);
    setMobileOpen(false);
  };

  const navItems = [
    {
      id: 'employee-new' as ActiveNavView,
      label: 'Report Incident',
      sublabel: 'Submit & autonomous triage',
      icon: ShieldCheck,
      color: 'blue',
      show: true,
    },
    {
      id: 'copilot' as ActiveNavView,
      label: 'AI IT Copilot',
      sublabel: 'Step-by-step laptop guide',
      icon: Sparkles,
      color: 'purple',
      badge: 'NEW',
      show: true,
    },
    {
      id: 'employee-track' as ActiveNavView,
      label: activeTicketNumber ? `Track ${activeTicketNumber}` : 'Track Incident',
      sublabel: 'Live diagnostic telemetry',
      icon: CheckCircle2,
      color: 'emerald',
      show: Boolean(activeTicketNumber),
    },
    {
      id: 'diagnostics-lab' as ActiveNavView,
      label: 'Diagnostics Lab',
      sublabel: 'Interactive manual probes',
      icon: Activity,
      color: 'cyan',
      badge: 'PROBES',
      show: true,
    },
    {
      id: 'runbooks' as ActiveNavView,
      label: 'SOP Runbooks',
      sublabel: 'Procedures & guardrails',
      icon: BookOpen,
      color: 'amber',
      show: true,
    },
    {
      id: 'admin-queue' as ActiveNavView,
      label: 'IT Admin Dashboard',
      sublabel: 'Queue, SOPs & Autopilot',
      icon: LayoutDashboard,
      color: 'indigo',
      show: true,
    },
  ];

  return (
    <>
      {/* Mobile Top Header (only visible on small screens < md) */}
      <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-2.5" onClick={() => handleNavClick('employee-new')}>
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-semibold tracking-wider uppercase text-blue-400">Enterprise AI Operations</div>
            <h1 className="text-xs font-bold text-slate-100">Autonomous IT Agent</h1>
          </div>
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 md:hidden animate-fadeIn"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main Sidebar Drawer / Container */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen w-72 bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Header & Brand */}
        <div className="p-5 border-b border-slate-800/90">
          <div
            className="flex items-start space-x-3 cursor-pointer group"
            onClick={() => handleNavClick('employee-new')}
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 flex-shrink-0 group-hover:border-blue-400/50 transition-colors shadow-sm shadow-blue-500/10">
              <Terminal className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <div className="text-[10px] font-mono font-bold tracking-wider uppercase text-blue-400 flex items-center space-x-1">
                <span>Enterprise AI Operations</span>
              </div>
              <h1 className="text-sm font-bold text-white tracking-tight leading-snug group-hover:text-blue-200 transition-colors">
                Autonomous IT Incident Agent
              </h1>
            </div>
          </div>

          {/* Engine Status Badge */}
          <div className="mt-4 flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px] text-slate-400">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Agent Engine: <strong className="text-emerald-400 font-medium">Online</strong></span>
            </div>
            <span className="text-[9px] font-mono text-slate-500 uppercase">v1.0</span>
          </div>
        </div>

        {/* Middle: Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6">
          <div>
            <div className="px-3 text-[10px] font-mono font-semibold tracking-wider uppercase text-slate-500 mb-2">
              Operations & Support
            </div>
            <nav className="space-y-1.5">
              {navItems.filter((item) => item.show).map((item) => {
                const IconComponent = item.icon;
                const isActive = currentView === item.id;

                let activeClasses = 'bg-blue-600 text-white shadow-md shadow-blue-600/20';
                if (item.id === 'copilot') {
                  activeClasses = 'bg-purple-600 text-white shadow-md shadow-purple-600/20';
                } else if (item.id === 'admin-queue') {
                  activeClasses = 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20';
                } else if (item.id === 'employee-track') {
                  activeClasses = 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20';
                } else if (item.id === 'diagnostics-lab') {
                  activeClasses = 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20';
                } else if (item.id === 'runbooks') {
                  activeClasses = 'bg-amber-600 text-white shadow-md shadow-amber-600/20';
                }

                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between group ${
                      isActive
                        ? activeClasses
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent hover:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div
                        className={`p-2 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isActive
                            ? 'bg-white/10 text-white'
                            : 'bg-slate-800/80 text-slate-400 group-hover:text-white group-hover:bg-slate-800'
                        }`}
                      >
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-semibold truncate flex items-center space-x-2">
                          <span>{item.label}</span>
                          {item.badge && (
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${
                                isActive
                                  ? 'bg-white/20 text-white'
                                  : 'bg-purple-500/20 text-purple-300 border border-purple-400/30'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <div
                          className={`text-[10px] truncate ${
                            isActive ? 'text-white/80' : 'text-slate-500 group-hover:text-slate-400'
                          }`}
                        >
                          {item.sublabel}
                        </div>
                      </div>
                    </div>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/70 flex-shrink-0 ml-1" />}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Bottom Section: Minimal Database Status Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/70">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center space-x-1.5 truncate">
              <Database className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span className="font-mono text-[10px] text-slate-300 truncate">Supabase Cloud</span>
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          </div>
        </div>
      </aside>
    </>
  );
};

