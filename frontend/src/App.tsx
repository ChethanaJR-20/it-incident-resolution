import React, { useState } from 'react';
import { ShieldAlert, Lock, UserCheck, ArrowRight } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar, ActiveNavView } from './components/Sidebar';
import { UserNavDropdown } from './components/UserNavDropdown';
import { AuthModal } from './components/AuthModal';
import { IncidentForm } from './components/IncidentForm';
import { TicketTrackerPage } from './pages/TicketTrackerPage';
import { AdminDashboardPreview } from './pages/AdminDashboardPreview';
import { CopilotPage } from './pages/CopilotPage';
import { DiagnosticsLabPage } from './pages/DiagnosticsLabPage';
import { RunbooksPage } from './pages/RunbooksPage';
import { IncidentDetail } from './types';

const MainApp: React.FC = () => {
  const [currentView, setCurrentView] = useState<ActiveNavView>('employee-new');
  const [activeTicket, setActiveTicket] = useState<string | null>(null);
  const { user, isAuthModalOpen, closeAuthModal, quickLogin } = useAuth();

  const handleIncidentSubmitted = (incident: IncidentDetail) => {
    setActiveTicket(incident.ticket_number);
    setCurrentView('employee-track');
  };

  const handleSelectTicketFromAdmin = (ticketNumber: string) => {
    setActiveTicket(ticketNumber);
    setCurrentView('employee-track');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans">
      <Sidebar
        currentView={currentView}
        onViewChange={(v) => setCurrentView(v)}
        activeTicketNumber={activeTicket || undefined}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        defaultRole={user?.role || 'EMPLOYEE'}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top Header: Current Page Info on Left, User Authentication Dropdown on Far Top Right */}
        <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md border-b border-slate-900 px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-xs text-slate-400 font-medium">
              <span className="text-slate-500">Enterprise IT Operations</span>
              <span className="text-slate-700">/</span>
              <span className="text-slate-200 font-semibold">
                {currentView === 'employee-new' && 'Report Incident'}
                {currentView === 'copilot' && 'AI IT Copilot Guide'}
                {currentView === 'employee-track' && (activeTicket ? `Ticket ${activeTicket}` : 'Track Incident')}
                {currentView === 'diagnostics-lab' && 'Diagnostics Lab & Manual Troubleshooting'}
                {currentView === 'runbooks' && 'Enterprise SOP Runbooks Knowledge Base'}
                {currentView === 'admin-queue' && 'IT Admin Operations Dashboard'}
              </span>
            </div>
          </div>

          {/* Top Right: User Authentication Dropdown */}
          <div className="flex items-center space-x-3 ml-auto">
            <UserNavDropdown onViewChange={(v) => setCurrentView(v)} />
          </div>
        </header>

        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {currentView === 'employee-new' && (
            <IncidentForm
              onIncidentSubmitted={handleIncidentSubmitted}
              onOpenCopilot={() => setCurrentView('copilot')}
            />
          )}

          {currentView === 'copilot' && (
            <CopilotPage
              onNavigateToTicket={(ticketNum) => {
                setActiveTicket(ticketNum);
                setCurrentView('employee-track');
              }}
              onNavigateToReport={() => setCurrentView('employee-new')}
            />
          )}

          {currentView === 'employee-track' && activeTicket && (
            <TicketTrackerPage
              ticketNumber={activeTicket}
              onBackToNew={() => setCurrentView('employee-new')}
            />
          )}

          {currentView === 'diagnostics-lab' && <DiagnosticsLabPage />}

          {currentView === 'runbooks' && <RunbooksPage />}

          {currentView === 'admin-queue' && (
            user?.role === 'ADMIN' ? (
              <AdminDashboardPreview onSelectTicket={handleSelectTicketFromAdmin} />
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center space-y-6 max-w-2xl mx-auto my-8 shadow-2xl animate-fadeIn">
                <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto shadow-inner">
                  <ShieldAlert className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono font-bold uppercase tracking-wider">
                    <Lock className="w-3 h-3" />
                    <span>Role-Based Access Control (RBAC) • Restricted</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white pt-2">IT Administrator Privileges Required</h2>
                  <p className="text-sm text-slate-300 leading-relaxed max-w-lg mx-auto">
                    You are currently authenticated as <strong className="text-white">{user?.full_name || 'an Employee'}</strong> with the <code className="text-blue-400 font-semibold px-1 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">{user?.role || 'EMPLOYEE'}</code> role.
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto pt-1">
                    In accordance with corporate security governance, approving system remediations, viewing employee incident dossiers, and triggering zero-touch autopilot are strictly restricted to certified IT Rapid Response Engineers.
                  </p>
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-2xl text-left space-y-2 text-xs">
                  <div className="font-semibold text-slate-200">How to demonstrate this to your manager:</div>
                  <ul className="list-disc list-inside space-y-1 text-slate-400">
                    <li>This access gate proves that regular employees cannot view or alter other employee configurations.</li>
                    <li>To test IT Admin features (approving fixes, operations queue), switch roles using the top-right profile switcher.</li>
                  </ul>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => quickLogin('ADMIN')}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Switch to IT Admin Profile (Sarah Connor)</span>
                  </button>

                  <button
                    onClick={() => setCurrentView('employee-new')}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs border border-slate-700 flex items-center justify-center space-x-1.5 transition-all"
                  >
                    <span>Return to Employee Portal</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          )}
        </main>

        <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-600">
          Enterprise Autonomous IT Incident Resolution Agent • Role-Based Authentication (Employee & IT Engineer) • Powered by Google Gemini & FastAPI
        </footer>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
};

export default App;
