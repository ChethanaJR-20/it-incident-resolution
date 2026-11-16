import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar, ActiveNavView } from './components/Sidebar';
import { UserNavDropdown } from './components/UserNavDropdown';
import { AuthModal } from './components/AuthModal';
import { IncidentForm } from './components/IncidentForm';
import { TicketTrackerPage } from './pages/TicketTrackerPage';
import { AdminDashboardPreview } from './pages/AdminDashboardPreview';
import { CopilotPage } from './pages/CopilotPage';
import { IncidentDetail } from './types';

const MainApp: React.FC = () => {
  const [currentView, setCurrentView] = useState<ActiveNavView>('employee-new');
  const [activeTicket, setActiveTicket] = useState<string | null>(null);
  const { user, isAuthModalOpen, closeAuthModal } = useAuth();

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

          {currentView === 'admin-queue' && (
            <AdminDashboardPreview onSelectTicket={handleSelectTicketFromAdmin} />
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
