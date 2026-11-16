import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ArrowUpRight,
  RefreshCw,
  Filter,
  ShieldCheck,
  Check,
  X,
  RotateCcw,
  Activity,
  FileText,
  Search,
  ListOrdered,
  AlertTriangle,
  Send,
  Eye,
  Shield,
  Bot,
  User,
  Radio,
  ExternalLink,
  PhoneCall,
} from 'lucide-react';
import {
  listIncidents,
  listPendingApprovals,
  submitApprovalDecision,
  resetSimulation,
  getDashboardMetrics,
  getAuditLogs,
  getEscalations,
  escalateIncident,
  getIncident,
} from '../services/api';
import { IncidentSummary, IncidentDetail } from '../types';
import { MetricsChart } from '../components/admin/MetricsChart';
import { ReasoningTimeline } from '../components/admin/ReasoningTimeline';

interface AdminDashboardPreviewProps {
  onSelectTicket: (ticketNumber: string) => void;
}

export const AdminDashboardPreview: React.FC<AdminDashboardPreviewProps> = ({ onSelectTicket }) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'deepdive' | 'escalations' | 'audit'>('queue');
  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [escalations, setEscalations] = useState<any[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<IncidentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [auditActorFilter, setAuditActorFilter] = useState<string>('ALL');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [escalateReason, setEscalateReason] = useState<string>('');
  const [isEscalating, setIsEscalating] = useState(false);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [incData, apprData, metData, auditData, escData] = await Promise.all([
        listIncidents(statusFilter === 'ALL' ? undefined : statusFilter),
        listPendingApprovals(),
        getDashboardMetrics(),
        getAuditLogs(auditActorFilter === 'ALL' ? undefined : auditActorFilter),
        getEscalations(),
      ]);
      setIncidents(incData);
      setPendingApprovals(apprData);
      setMetrics(metData);
      setAuditLogs(auditData);
      setEscalations(escData);
    } catch (err) {
      console.error('Failed to fetch admin telemetry', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 5000);
    return () => clearInterval(interval);
  }, [statusFilter, auditActorFilter]);

  const handleInspectTicket = async (ticketNumber: string) => {
    try {
      const detailed = await getIncident(ticketNumber);
      setSelectedIncident(detailed);
      setActiveTab('deepdive');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDecision = async (approvalId: string, decision: 'APPROVED' | 'REJECTED') => {
    try {
      await submitApprovalDecision(approvalId, decision);
      setActionMessage(`Action ${decision.toLowerCase()} successfully.`);
      setTimeout(() => setActionMessage(null), 3000);
      await fetchAll();
      if (selectedIncident) {
        handleInspectTicket(selectedIncident.ticket_number);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleResetEnv = async () => {
    try {
      await resetSimulation();
      setActionMessage('Simulated device environment reset to default VPN fault state.');
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleEscalateCurrent = async () => {
    if (!selectedIncident || !escalateReason.trim()) return;
    setIsEscalating(true);
    try {
      await escalateIncident(selectedIncident.ticket_number, escalateReason.trim());
      setActionMessage(`Incident ${selectedIncident.ticket_number} escalated to Tier-2 Engineering.`);
      setEscalateReason('');
      setTimeout(() => setActionMessage(null), 3500);
      await fetchAll();
      // REDIRECT to Tier-2 Escalations tab so user immediately sees the escalated record
      setActiveTab('escalations');
    } catch (err: any) {
      alert(`Escalation failed: ${err.message}`);
    } finally {
      setIsEscalating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header Command Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-2">
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>NOC & IT Service Operations</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">IT Administrator Command Center</h2>
          <p className="text-xs text-slate-400">
            Real-time telemetry, autonomous triage analytics, human approval gates, and Tier-2 escalation queue.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleResetEnv}
            className="px-3 py-2 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            title="Reset simulated environment to initial fault state"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Reset Demo State</span>
          </button>

          <button
            onClick={fetchAll}
            className="px-3 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold flex items-center space-x-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 bg-blue-950/40 border border-blue-500/40 rounded-xl text-xs text-blue-200">
          {actionMessage}
        </div>
      )}

      {/* Imminent Meeting Emergency Banner */}
      {incidents.some((inc) => inc.is_emergency && inc.status !== 'RESOLVED') && (
        <div className="p-4 bg-gradient-to-r from-rose-950 via-rose-900/60 to-slate-900 border-2 border-rose-500 rounded-2xl shadow-xl shadow-rose-950/40 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse">
          <div className="flex items-start space-x-3.5">
            <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-md">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-extrabold text-white tracking-wide uppercase">
                  🚨 High-Priority Emergency: Imminent Meeting Alert
                </span>
                <span className="text-xs bg-rose-500 text-white font-mono font-bold px-2 py-0.5 rounded">
                  VIP P1 DISPATCH
                </span>
              </div>
              <p className="text-xs text-rose-200 mt-1">
                Employee has a meeting starting in <strong>&lt; 5 minutes</strong> and requested direct IT human assistance. Standard automated queue bypassed.
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-rose-300 font-mono">
                {incidents.filter((inc) => inc.is_emergency && inc.status !== 'RESOLVED').map((inc) => (
                  <span key={inc.ticket_number} className="bg-rose-950/80 px-2 py-1 rounded border border-rose-800">
                    <strong>{inc.ticket_number}</strong>: {inc.emergency_reason || 'Meeting soon'} • Contact: <strong>{inc.emergency_contact || '+1 555-019-2834'}</strong> ({inc.meeting_time || 'In 5 mins'})
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            <button
              onClick={() => {
                const em = incidents.find((inc) => inc.is_emergency && inc.status !== 'RESOLVED') || incidents[0];
                if (em) {
                  onSelectTicket(em.ticket_number);
                }
              }}
              title="Open real-time telemetry and connect with employee"
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/30 flex items-center space-x-2 transition-all active:scale-95 whitespace-nowrap"
            >
              <Radio className="w-4 h-4 animate-pulse" />
              <span>Inspect & Connect Now</span>
            </button>

            <button
              onClick={() => {
                const em = incidents.find((inc) => inc.is_emergency && inc.status !== 'RESOLVED') || incidents[0];
                if (em) handleInspectTicket(em.ticket_number);
              }}
              title="Inspect technical dossier and AI reasoning"
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-rose-300 hover:text-white font-semibold text-xs rounded-xl border border-rose-500/30 flex items-center space-x-1.5 transition-all"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>View Dossier</span>
            </button>
          </div>
        </div>
      )}

      {/* Primary Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center space-x-2 ${
            activeTab === 'queue' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <ListOrdered className="w-4 h-4" />
          <span>Operations & Queue</span>
        </button>

        <button
          onClick={() => {
            if (!selectedIncident && incidents.length > 0) {
              handleInspectTicket(incidents[0].ticket_number);
            }
            setActiveTab('deepdive');
          }}
          className={`px-4 py-2 rounded-xl transition-all flex items-center space-x-2 ${
            activeTab === 'deepdive' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Incident Dossier & Trace</span>
        </button>

        <button
          onClick={() => setActiveTab('escalations')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center space-x-2 ${
            activeTab === 'escalations' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Tier-2 Escalations ({escalations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center space-x-2 ${
            activeTab === 'audit' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Immutable Audit Log</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OPERATIONS, CHARTS & INCIDENT QUEUE */}
      {/* ========================================================================= */}
      {activeTab === 'queue' && (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
              <div className="text-xs text-slate-400 font-medium">Total Volume</div>
              <div className="text-2xl font-bold text-white mt-1">{metrics ? metrics.total_incidents : incidents.length}</div>
              <div className="text-[11px] text-slate-500 mt-1">Logged tickets in database</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
              <div className="text-xs text-blue-400 font-medium">Active AI Triage</div>
              <div className="text-2xl font-bold text-blue-300 mt-1">{metrics ? metrics.open_incidents : 0}</div>
              <div className="text-[11px] text-slate-500 mt-1">Diagnosing or in remediation</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
              <div className="text-xs text-emerald-400 font-medium">Auto-Resolved</div>
              <div className="text-2xl font-bold text-emerald-300 mt-1">{metrics ? metrics.resolved_incidents : 0}</div>
              <div className="text-[11px] text-slate-500 mt-1">Verified with 0% packet loss</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
              <div className="text-xs text-amber-400 font-medium">Pending Approvals</div>
              <div className="text-2xl font-bold text-amber-300 mt-1">{pendingApprovals.length}</div>
              <div className="text-[11px] text-slate-500 mt-1">Gated for administrator sign-off</div>
            </div>
          </div>

          {/* Recharts Analytics Component */}
          {metrics && (
            <MetricsChart
              categoryDistribution={metrics.category_distribution}
              priorityDistribution={metrics.priority_distribution}
              resolutionRatePercent={metrics.resolution_rate_percent}
              avgResolutionTimeSeconds={metrics.avg_resolution_time_seconds}
            />
          )}

          {/* PENDING APPROVALS QUEUE */}
          {pendingApprovals.length > 0 && (
            <div className="bg-amber-950/20 border border-amber-500/40 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Privileged Remediation Authorization Requests</h3>
              </div>

              <div className="space-y-3">
                {pendingApprovals.map((req) => (
                  <div
                    key={req.id}
                    className="bg-slate-950 p-4 rounded-xl border border-amber-500/30 flex flex-wrap items-center justify-between gap-4 text-xs"
                  >
                    <div className="space-y-1 max-w-2xl">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-blue-400">{req.ticket_number}</span>
                        <span className="text-slate-500">•</span>
                        <span className="font-mono text-slate-300">{req.device_id}</span>
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px]">
                          RISK: {req.risk_level}
                        </span>
                      </div>
                      <div className="text-slate-200 font-semibold">
                        Proposed Tool: <code className="font-mono text-amber-300">{req.action_name}()</code>
                      </div>
                      <p className="text-slate-400 text-[11px] leading-relaxed">{req.reasoning}</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleDecision(req.id, 'REJECTED')}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-rose-950/40 hover:text-rose-300 text-slate-400 rounded-lg font-semibold flex items-center space-x-1 border border-slate-700"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                      <button
                        onClick={() => handleDecision(req.id, 'APPROVED')}
                        className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-bold flex items-center space-x-1 shadow-md shadow-amber-500/20"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Authorize</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Master Ticket Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-400 font-medium">Filter by Status:</span>
                {['ALL', 'SUBMITTED', 'INVESTIGATING', 'AWAITING_APPROVAL', 'RESOLVED', 'ESCALATED'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      statusFilter === f
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-slate-200 bg-slate-950/50'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className="text-xs text-slate-500 font-mono">Showing {incidents.length} records</div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Ticket</th>
                    <th className="py-3 px-4">Device Hostname</th>
                    <th className="py-3 px-4">Current Execution Step</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Submitted At</th>
                    <th className="py-3 px-4 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {incidents.map((incident) => (
                    <tr
                      key={incident.id}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                      onClick={() => handleInspectTicket(incident.ticket_number)}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-400">
                        <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                          <span>{incident.ticket_number}</span>
                          {incident.is_emergency && (
                            <span className="text-[9px] bg-rose-600 text-white font-sans font-extrabold px-1.5 py-0.5 rounded animate-pulse">
                              🚨 P1 URGENT ({incident.meeting_time || '5m'})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">{incident.device_id}</td>
                      <td className="py-3.5 px-4 text-slate-300">{incident.current_step}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            incident.status === 'RESOLVED'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : incident.status === 'AWAITING_APPROVAL'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : incident.status === 'ESCALATED'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}
                        >
                          {incident.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(incident.created_at).toLocaleTimeString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectTicket(incident.ticket_number);
                            }}
                            title="Connect to live telemetry tracker"
                            className="p-1.5 rounded-lg bg-blue-950/60 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 transition-colors"
                          >
                            <Radio className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInspectTicket(incident.ticket_number);
                            }}
                            title="Inspect AI reasoning dossier"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: INCIDENT DOSSIER & AI REASONING TRACE */}
      {/* ========================================================================= */}
      {activeTab === 'deepdive' && selectedIncident && (
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-xl">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded font-bold text-sm">
                  {selectedIncident.ticket_number}
                </span>
                <span className="text-xs text-slate-400">• Device: {selectedIncident.device_id} ({selectedIncident.os_type})</span>
              </div>
              <h3 className="text-lg font-bold text-white mt-1">Deep-Dive Incident Dossier</h3>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => onSelectTicket(selectedIncident.ticket_number)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-md active:scale-95 transition-all"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Connect & Track Live Telemetry</span>
              </button>

              {selectedIncident.status !== 'RESOLVED' && selectedIncident.status !== 'ESCALATED' && (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={escalateReason}
                    onChange={(e) => setEscalateReason(e.target.value)}
                    placeholder="Escalation notes..."
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500"
                  />
                  <button
                    onClick={handleEscalateCurrent}
                    disabled={isEscalating || !escalateReason.trim()}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Escalate to Tier-2</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* AI Chronological Timeline Component */}
          <ReasoningTimeline incident={selectedIncident} />
        </div>
      )}

      {activeTab === 'deepdive' && !selectedIncident && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs">
          No ticket currently selected. Select any incident from the Operations & Queue tab to inspect.
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TIER-2 ESCALATION QUEUE & DOSSIERS */}
      {/* ========================================================================= */}
      {activeTab === 'escalations' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <h3 className="text-sm font-bold text-white">Tier-2 Engineering Escalation Queue</h3>
            </div>
            <span className="text-xs font-mono text-slate-400">{escalations.length} Active Escalations</span>
          </div>

          {escalations.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No tickets currently escalated. Autonomous agent is resolving Tier-1 incidents without escalation.
            </div>
          ) : (
            <div className="space-y-4">
              {escalations.map((esc) => (
                <div key={esc.id} className="p-4 bg-slate-950 border border-rose-500/30 rounded-xl space-y-2 text-xs hover:border-rose-500/60 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-rose-400 text-sm">{esc.ticket_number}</span>
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-[10px]">
                        {esc.assigned_queue}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleInspectTicket(esc.ticket_number)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-semibold flex items-center space-x-1 transition-colors"
                        title="View AI Timeline and Diagnosis Trace"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-400" />
                        <span>Inspect Dossier</span>
                      </button>

                      <button
                        onClick={() => onSelectTicket(esc.ticket_number)}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[11px] font-semibold flex items-center space-x-1 shadow-sm transition-colors"
                        title="Open in Employee Live Tracker"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span>Live Tracker</span>
                      </button>
                    </div>
                  </div>
                  <div className="text-slate-300 font-semibold">Reason: {esc.reason}</div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">{esc.diagnostic_summary}</p>
                  <div className="text-[10px] font-mono text-slate-500">
                    Escalated At: {new Date(esc.escalated_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: IMMUTABLE AUDIT TRAIL */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden space-y-4">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span className="font-bold text-white">Tamper-Evident System Audit Trail</span>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-400">Actor Filter:</span>
              {['ALL', 'USER', 'AGENT', 'ADMIN'].map((a) => (
                <button
                  key={a}
                  onClick={() => setAuditActorFilter(a)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                    auditActorFilter === a ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Actor</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Event Telemetry Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-400">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                          log.actor_type === 'AGENT'
                            ? 'bg-indigo-500/20 text-indigo-300'
                            : log.actor_type === 'ADMIN'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-blue-500/20 text-blue-300'
                        }`}
                      >
                        {log.actor_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono font-semibold text-slate-200">{log.action_performed}</td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-400 truncate max-w-md">
                      {JSON.stringify(log.event_metadata)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
