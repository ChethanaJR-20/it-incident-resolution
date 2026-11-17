import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Clock,
  ShieldAlert,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileText,
  Sparkles,
  BookOpen,
  Wrench,
  ChevronDown,
  ChevronUp,
  Tag,
  Zap,
  Activity,
  Check,
  X,
  ShieldCheck,
  Server,
  Network,
  Send,
  UserCheck,
  PhoneCall,
  PhoneOff,
  Phone,
  Mic,
  MicOff,
  Volume2,
  Copy,
} from 'lucide-react';
import { getIncident, triggerTriage, runDiagnostics, submitApprovalDecision, getRunbook, triggerEmergencyFastTrack, escalateIncident } from '../services/api';
import { IncidentDetail } from '../types';
import { useAuth } from '../context/AuthContext';
import { RunbookInspector } from '../components/RunbookInspector';

interface TicketTrackerPageProps {
  ticketNumber: string;
  onBackToNew: () => void;
}

export const TicketTrackerPage: React.FC<TicketTrackerPageProps> = ({ ticketNumber, onBackToNew }) => {
  const { user } = useAuth();
  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [executingDiagnostics, setExecutingDiagnostics] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runbook, setRunbook] = useState<any | null>(null);
  const [showRunbookContent, setShowRunbookContent] = useState(false);
  const [escalatingEmergency, setEscalatingEmergency] = useState(false);
  const [escalatingTier2, setEscalatingTier2] = useState(false);
  const [isHotlineOpen, setIsHotlineOpen] = useState(false);
  const [callStatus, setCallStatus] = useState<'RINGING' | 'CONNECTED' | 'ENDED'>('RINGING');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  useEffect(() => {
    let timer: any;
    if (isHotlineOpen && callStatus === 'CONNECTED') {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isHotlineOpen, callStatus]);

  useEffect(() => {
    let ringTimer: any;
    if (isHotlineOpen && callStatus === 'RINGING') {
      ringTimer = setTimeout(() => {
        setCallStatus('CONNECTED');
      }, 2000);
    }
    return () => clearTimeout(ringTimer);
  }, [isHotlineOpen, callStatus]);

  const formatCallTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopyHotlineNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleManualTier2Escalate = async () => {
    setEscalatingTier2(true);
    try {
      await escalateIncident(ticketNumber, "Employee requested human Tier-2 specialist engineering escalation.");
      await fetchIncident();
    } catch (err: any) {
      setError(err.message || "Failed to escalate to Tier-2");
    } finally {
      setEscalatingTier2(false);
    }
  };

  const handleEmergencyEscalate = async () => {
    setEscalatingEmergency(true);
    try {
      const updated = await triggerEmergencyFastTrack(ticketNumber, {
        emergency_reason: "Critical meeting starting in 5 minutes! Need direct IT human engineer assist.",
        emergency_contact: "+1 (555) 019-2834 (Desk Room 4B)",
        meeting_time: "In 5 minutes",
      });
      setIncident(updated);
    } catch (err: any) {
      setError(err.message || "Failed to escalate to emergency fast-track");
    } finally {
      setEscalatingEmergency(false);
    }
  };

  const fetchIncident = async () => {
    try {
      setLoading(true);
      const data = await getIncident(ticketNumber);
      setIncident(data);
      setError(null);

      if (data.classification?.category) {
        getRunbook(data.classification.category)
          .then((rb) => setRunbook(rb))
          .catch(() => { });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch incident data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncident();
    const interval = setInterval(fetchIncident, 4000);
    return () => clearInterval(interval);
  }, [ticketNumber]);

  const handleRunDiagnostics = async () => {
    setExecutingDiagnostics(true);
    setError(null);
    try {
      if (incident?.status === 'SUBMITTED' || !incident?.classification) {
        try {
          await triggerTriage(ticketNumber);
        } catch (triageErr) {
          console.warn('Triage trigger warning:', triageErr);
        }
      }
      await runDiagnostics(ticketNumber);
      await fetchIncident();
    } catch (err: any) {
      setError(err.message || 'Failed to run diagnostics');
    } finally {
      setExecutingDiagnostics(false);
    }
  };

  const handleApproval = async (approvalId: string, decision: 'APPROVED' | 'REJECTED') => {
    setApproving(true);
    try {
      await submitApprovalDecision(approvalId, decision);
      await fetchIncident();
    } catch (err: any) {
      setError(err.message || 'Approval decision failed');
    } finally {
      setApproving(false);
    }
  };

  const steps = [
    { key: 'SUBMITTED', label: '1. Received', desc: 'Ticket logged' },
    { key: 'CLASSIFIED', label: '2. AI Triage', desc: 'Category & priority' },
    { key: 'INVESTIGATING', label: '3. Diagnostics', desc: 'Active probes' },
    { key: 'REMEDIATING', label: '4. Controlled Fix', desc: 'Approval & tool fix' },
    { key: 'RESOLVED', label: '5. Verified', desc: 'Closed-loop check' },
  ];

  const getStepStatus = (stepKey: string, currentStatus: string) => {
    if (currentStatus === 'RESOLVED') return 'completed';
    if (currentStatus === 'ESCALATED') return 'escalated';

    const order = ['SUBMITTED', 'CLASSIFIED', 'INVESTIGATING', 'AWAITING_APPROVAL', 'REMEDIATING', 'VERIFYING', 'RESOLVED'];
    const currentIndex = order.indexOf(currentStatus);
    const stepIndex = order.indexOf(stepKey);

    if (currentStatus === 'AWAITING_APPROVAL' && stepKey === 'REMEDIATING') return 'active';
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  if (loading && !incident) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center text-slate-400 space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500" />
        <p className="text-sm font-medium">Connecting to incident telemetry engine...</p>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-white">Ticket Not Found</h3>
        <p className="text-sm text-slate-400">{error || 'Could not locate ticket records.'}</p>
        <button
          onClick={onBackToNew}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
        >
          Return to Report Form
        </button>
      </div>
    );
  }

  const classification = incident.classification;
  const preDiagnostics = incident.diagnostic_results.filter((d) => d.execution_stage === 'PRE_REMEDIATION');
  const postDiagnostics = incident.diagnostic_results.filter((d) => d.execution_stage === 'POST_REMEDIATION');
  const pendingApproval = incident.approval_requests.find((a) => a.status === 'PENDING');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToNew}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Report Another Incident</span>
        </button>

        <div className="flex items-center space-x-2">
          {!incident.is_emergency && incident.status !== 'RESOLVED' && (
            <button
              onClick={handleEmergencyEscalate}
              disabled={escalatingEmergency}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 shadow-md shadow-rose-600/30 transition-all active:scale-95 animate-pulse"
              title="Page human IT Support immediately for imminent meeting"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{escalatingEmergency ? 'Paging IT Support...' : '🚨 Meeting in 5 Mins? Direct IT Help'}</span>
            </button>
          )}

          {incident.status !== 'RESOLVED' && incident.status !== 'ESCALATED' && !incident.is_emergency && (
            <button
              onClick={handleManualTier2Escalate}
              disabled={escalatingTier2}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 border border-slate-700 transition-all active:scale-95"
              title="Escalate ticket to human Tier-2 engineering specialist"
            >
              <Send className="w-3.5 h-3.5 text-rose-400" />
              <span>{escalatingTier2 ? 'Escalating...' : 'Escalate to Tier-2'}</span>
            </button>
          )}

          {(incident.status === 'SUBMITTED' || incident.status === 'INVESTIGATING') && (
            <button
              onClick={handleRunDiagnostics}
              disabled={executingDiagnostics}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 shadow-md transition-all active:scale-95"
            >
              <Activity className={`w-3.5 h-3.5 ${executingDiagnostics ? 'animate-spin' : ''}`} />
              <span>{executingDiagnostics ? 'Probing Device Telemetry...' : 'Execute Automated Diagnostics'}</span>
            </button>
          )}

          <button
            onClick={fetchIncident}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs flex items-center space-x-1.5"
            title="Refresh ticket state"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Ticket Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded border border-blue-500/20">
                {incident.ticket_number}
              </span>
              <span className="text-xs text-slate-400">• Created {new Date(incident.created_at).toLocaleTimeString()}</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">Autonomous Incident Tracker</h2>
          </div>

          <div className="flex items-center space-x-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${incident.status === 'RESOLVED'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : incident.status === 'AWAITING_APPROVAL'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                    : incident.status === 'ESCALATED'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : incident.status === 'INVESTIGATING'
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                }`}
            >
              {incident.status}
            </span>
          </div>
        </div>

        {/* Emergency P1 Fast-Track Banner */}
        {incident.is_emergency && (
          <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-rose-950/80 via-rose-900/40 to-slate-900 border border-rose-500/60 shadow-lg text-rose-200 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start space-x-3">
                <div className="p-2.5 rounded-xl bg-rose-600 text-white animate-pulse mt-0.5 shadow-md">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-extrabold text-white">🚨 DIRECT IT SUPPORT DISPATCHED (P1 VIP)</span>
                    <span className="text-[10px] font-mono bg-rose-500 text-white px-2 py-0.5 rounded font-bold">
                      MEETING: {incident.meeting_time || 'In 5 minutes'}
                    </span>
                  </div>
                  <p className="text-xs text-rose-300/90 mt-1">
                    Emergency override active for <strong>{incident.emergency_reason || 'Imminent Meeting'}</strong>. IT Engineer <strong>Sarah Connor (Lead)</strong> is alerted to connect with you.
                  </p>
                  <div className="text-[11px] text-slate-300 mt-2 flex flex-wrap items-center gap-3 font-mono">
                    <span>📞 Callback: <strong className="text-white">{incident.emergency_contact || '+1 (555) 019-2834'}</strong></span>
                    <span>• Status: <strong className="text-emerald-400">IT Specialist Paged</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                {(incident.status === 'SUBMITTED' || incident.status === 'INVESTIGATING') && (
                  <button
                    onClick={handleRunDiagnostics}
                    disabled={executingDiagnostics}
                    className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-blue-600/30 active:scale-95 transition-all whitespace-nowrap"
                    title="Probe device network telemetry & execute safe resolution"
                  >
                    <Activity className={`w-3.5 h-3.5 ${executingDiagnostics ? 'animate-spin' : ''}`} />
                    <span>{executingDiagnostics ? 'Executing Diagnostics...' : '⚡ Execute Automated Diagnostics'}</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsHotlineOpen(true);
                    setCallStatus('RINGING');
                    setCallDuration(0);
                    setIsMuted(false);
                  }}
                  className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-rose-600/30 active:scale-95 transition-all whitespace-nowrap"
                  title="Direct telephone / softphone dispatch to Lead IT Engineer"
                >
                  <PhoneCall className="w-3.5 h-3.5 animate-pulse" />
                  <span>Call Emergency Hotline</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tier-2 Escalation Handoff Banner */}
        {incident.status === 'ESCALATED' && (
          <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-amber-950/80 via-rose-950/50 to-slate-900 border-2 border-amber-500/60 shadow-xl text-amber-200 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start space-x-3">
                <div className="p-2.5 rounded-xl bg-amber-600 text-white mt-0.5 shadow-md">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-extrabold text-white">⚠️ ESCALATED TO TIER-2 HUMAN SPECIALIST</span>
                    <span className="text-[10px] font-mono bg-amber-500 text-slate-950 px-2 py-0.5 rounded font-bold uppercase">
                      Tier-2 Queue
                    </span>
                  </div>
                  <p className="text-xs text-amber-300/90 mt-1">
                    Autonomous Tier-1 self-healing handed this incident over to specialized human engineers. Telemetry and diagnostic traces have been packaged.
                  </p>
                  <div className="text-[11px] text-slate-300 mt-2 flex flex-wrap items-center gap-3 font-mono">
                    <span>Assigned: <strong className="text-white">Tier-2 Network Engineering (Sarah Connor Lead)</strong></span>
                    <span>• Status: <strong className="text-amber-400">Assigned & Under Investigation</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 self-start sm:self-auto">
                <button
                  onClick={onBackToNew}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors"
                >
                  Report Another Incident
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 5-Step Progress Stepper */}
        <div className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {steps.map((step) => {
              const state = getStepStatus(step.key, incident.status);
              return (
                <div
                  key={step.key}
                  className={`p-3 rounded-xl border transition-all ${state === 'completed'
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                      : state === 'active'
                        ? 'bg-blue-950/40 border-blue-500/60 text-blue-200 ring-1 ring-blue-500/40 shadow-lg'
                        : 'bg-slate-950/40 border-slate-800/80 text-slate-500'
                    }`}
                >
                  <div className="flex items-center space-x-1.5 mb-1">
                    {state === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : state === 'active' ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping flex-shrink-0"></span>
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-700 flex-shrink-0"></span>
                    )}
                    <span className="text-xs font-semibold">{step.label}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current Live Stage Alert */}
        <div className="mt-6 bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div className="flex-1 text-xs">
            <span className="text-slate-400">Current AI Execution State:</span>
            <div className="text-slate-100 font-semibold text-sm">{incident.current_step}</div>
          </div>
          <div className="text-[11px] font-mono text-emerald-400 flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Live Telemetry Active</span>
          </div>
        </div>
      </div>

      {/* Ready for Automated Diagnostics Banner */}
      {preDiagnostics.length === 0 && (incident.status === 'SUBMITTED' || incident.status === 'INVESTIGATING') && (
        <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center flex-shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Automated Device Telemetry Probing Ready</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Run DNS resolution, gateway ping latency probes, and VPN interface checks to diagnose and isolate root causes.
              </p>
            </div>
          </div>
          <button
            onClick={handleRunDiagnostics}
            disabled={executingDiagnostics}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-blue-600/30 transition-all active:scale-95 whitespace-nowrap self-start sm:self-auto"
          >
            <Activity className={`w-4 h-4 ${executingDiagnostics ? 'animate-spin' : ''}`} />
            <span>{executingDiagnostics ? 'Executing Diagnostics...' : '⚡ Execute Automated Diagnostics'}</span>
          </button>
        </div>
      )}

      {/* RESOLUTION CELEBRATION BANNER */}
      {incident.status === 'RESOLVED' && (
        <div className="bg-emerald-950/30 border border-emerald-500/50 rounded-2xl p-6 shadow-2xl text-emerald-200 space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Closed-Loop Resolution Confirmed</h3>
              <p className="text-xs text-emerald-300/80">
                Resolved at {incident.resolved_at ? new Date(incident.resolved_at).toLocaleTimeString() : 'Just now'} • Zero Manual Code Execution
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-200 bg-slate-950/70 p-4 rounded-xl border border-emerald-500/30 leading-relaxed font-sans">
            {incident.resolution_summary}
          </p>
        </div>
      )}

      {/* DAY 3: HUMAN-IN-THE-LOOP APPROVAL CARD */}
      {pendingApproval && (
        <div className="bg-amber-950/20 border-2 border-amber-500/60 rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 flex-shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider font-bold text-amber-400">
                  Human-in-the-Loop Authorization Required (Tier 2 Privileged)
                </div>
                <h3 className="text-base font-bold text-white mt-0.5">
                  Proposed Action: <code className="font-mono text-amber-300">{pendingApproval.action_name}()</code>
                </h3>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 text-xs font-mono font-bold">
              RISK: {pendingApproval.risk_level}
            </span>
          </div>

          <div className="bg-slate-950/80 p-4 rounded-xl border border-amber-500/30 text-xs text-slate-300 space-y-2">
            <div className="font-semibold text-slate-200">AI Agent Justification:</div>
            <p className="leading-relaxed">{pendingApproval.reasoning}</p>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              onClick={() => handleApproval(pendingApproval.id, 'REJECTED')}
              disabled={approving}
              className="px-4 py-2 bg-slate-800 hover:bg-rose-950/50 hover:text-rose-300 hover:border-rose-500/40 border border-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all"
            >
              <X className="w-4 h-4" />
              <span>Reject & Escalate</span>
            </button>

            <button
              onClick={() => handleApproval(pendingApproval.id, 'APPROVED')}
              disabled={approving}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>{approving ? 'Executing Authorized Fix...' : 'Authorize Action & Resume'}</span>
            </button>
          </div>
        </div>
      )}

      {/* DAY 3: DIAGNOSTIC TELEMETRY PROBES */}
      {preDiagnostics.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white">Pre-Remediation Diagnostic Telemetry</h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Target: {incident.device_id}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {preDiagnostics.map((diag) => (
              <div
                key={diag.id}
                className={`p-3.5 rounded-xl border text-xs space-y-2 ${diag.outcome_status === 'FAULT_DETECTED'
                    ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                    : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-200">{diag.tool_name}()</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${diag.outcome_status === 'FAULT_DETECTED' ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                  >
                    {diag.outcome_status}
                  </span>
                </div>

                <div className="text-[11px] font-mono text-slate-400 space-y-1">
                  {diag.tool_name === 'resolve_dns' && (
                    <>
                      <div>Resolved IP: <strong className="text-rose-400">{diag.output_payload.resolved_ip}</strong></div>
                      <div>Expected IP: <strong className="text-emerald-400">{diag.output_payload.expected_ip}</strong></div>
                      <div className="text-[10px] text-amber-300">Stale DNS Record Detected</div>
                    </>
                  )}
                  {diag.tool_name === 'ping_gateway' && (
                    <>
                      <div>Target: <strong className="text-slate-300">{diag.output_payload.target_ip}</strong></div>
                      <div>Packet Loss: <strong className="text-rose-400">{diag.output_payload.packet_loss_percent}%</strong></div>
                      <div>Reachability: <strong className="text-rose-400">UNREACHABLE</strong></div>
                    </>
                  )}
                  {diag.tool_name === 'check_vpn_adapter_status' && (
                    <>
                      <div>Interface: Cisco AnyConnect</div>
                      <div>Driver State: <strong className="text-rose-400">{diag.output_payload.state}</strong></div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Remediation Actions History */}
          {incident.remediation_actions.length > 0 && (
            <div className="pt-2">
              <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center space-x-1.5">
                <Wrench className="w-3.5 h-3.5 text-blue-400" />
                <span>Executed Remediation Actions:</span>
              </div>
              <div className="space-y-2">
                {incident.remediation_actions.map((act) => (
                  <div
                    key={act.id}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <code className="font-mono font-bold text-slate-200">{act.tool_name}()</code>
                      <span className="text-slate-400">— {act.output_payload.message}</span>
                    </div>
                    <span className="text-[10px] font-mono bg-emerald-950/40 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/20">
                      {act.execution_status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CLOSED-LOOP VERIFICATION TELEMETRY (POST-REMEDIATION) */}
      {postDiagnostics.length > 0 && (
        <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Closed-Loop Verification Telemetry (Post-Fix)</h3>
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
              Objective Health: Confirmed
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {postDiagnostics.map((diag) => (
              <div
                key={diag.id}
                className="p-3.5 rounded-xl border bg-emerald-950/20 border-emerald-500/30 text-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-200">{diag.tool_name}()</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300">
                    PASS
                  </span>
                </div>

                <div className="text-[11px] font-mono text-slate-300 space-y-1">
                  {diag.tool_name === 'resolve_dns' && (
                    <>
                      <div>Resolved IP: <strong className="text-emerald-400">{diag.output_payload.resolved_ip}</strong></div>
                      <div>Status: <strong className="text-emerald-400">Valid Active Gateway</strong></div>
                    </>
                  )}
                  {diag.tool_name === 'ping_gateway' && (
                    <>
                      <div>Latency: <strong className="text-emerald-400">{diag.output_payload.latency_ms}ms</strong></div>
                      <div>Packet Loss: <strong className="text-emerald-400">0% (Healthy)</strong></div>
                    </>
                  )}
                  {diag.tool_name === 'check_vpn_adapter_status' && (
                    <>
                      <div>Interface State: <strong className="text-emerald-400">{diag.output_payload.state}</strong></div>
                      <div>Tunnel: <strong className="text-emerald-400">Active</strong></div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Day 2: AI Classification & Runbook Grounding Card */}
      {classification && (
        <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white">AI Classification & Incident Grounding</h3>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-400">Confidence Score:</span>
              <span className="font-mono font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                {Math.round(classification.confidence_score * 100)}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Primary Category</span>
              <div className="text-base font-bold text-blue-400">{classification.category}</div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">{classification.sub_category}</div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">ITIL Priority</span>
              <div className="text-base font-bold text-amber-400">{classification.priority}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">High Impact Support</div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Severity</span>
              <div className="text-base font-bold text-rose-400">{classification.severity}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">SLA: &lt; 15 mins</div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Matched Runbook</span>
              <div className="text-base font-bold text-indigo-400 font-mono">
                {runbook ? runbook.doc_code : 'SOP-NET-001'}
              </div>
              <div className="text-[11px] text-slate-400 truncate mt-0.5">
                {runbook ? runbook.title : 'VPN Troubleshooting'}
              </div>
            </div>
          </div>

          {/* Extracted Symptoms Tags */}
          <div>
            <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center space-x-1.5">
              <Tag className="w-3.5 h-3.5 text-blue-400" />
              <span>Extracted Technical Symptoms:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {classification.extracted_symptoms.map((symptom, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-blue-950/40 border border-blue-500/30 text-blue-300 text-xs font-mono"
                >
                  {symptom}
                </span>
              ))}
            </div>
          </div>

          {/* Matched Runbook Allowable Tools & Full Content Drawer */}
          {runbook && (
            <div className="border border-slate-800 bg-slate-950/60 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-semibold text-slate-200">
                    Grounding Standard Operating Procedure: <strong className="text-indigo-400">{runbook.doc_code}</strong>
                  </span>
                </div>
                <button
                  onClick={() => setShowRunbookContent(!showRunbookContent)}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center space-x-1 font-semibold"
                >
                  <span>{showRunbookContent ? 'Hide SOP Content' : 'Inspect SOP Runbook'}</span>
                  {showRunbookContent ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Allowable Tools preview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Authorized Diagnostic Tools</span>
                  <div className="flex flex-wrap gap-1.5 mt-1 font-mono text-[11px] text-emerald-400">
                    {runbook.allowable_tools?.diagnostics?.map((tool: string) => (
                      <span key={tool} className="bg-emerald-950/30 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        {tool}()
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Authorized Remediation Tools</span>
                  <div className="flex flex-wrap gap-1.5 mt-1 font-mono text-[11px] text-amber-400">
                    {runbook.allowable_tools?.remediations?.map((tool: string) => (
                      <span key={tool} className="bg-amber-950/30 px-1.5 py-0.5 rounded border border-amber-500/20">
                        {tool}()
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {showRunbookContent && (
                <div className="mt-4 pt-2 border-t border-slate-800">
                  <RunbookInspector runbook={runbook} compact={true} />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Incident Details & Telemetry Snapshot */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <FileText className="w-4 h-4 text-blue-400" />
            <span>Reported Problem Narrative</span>
          </h3>
          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 text-sm text-slate-300 leading-relaxed font-sans">
            "{incident.raw_description}"
          </div>

          <div className="text-xs text-slate-400 space-y-1">
            <div className="flex justify-between border-b border-slate-800/60 py-1.5">
              <span>Reporting User:</span>
              <span className="font-semibold text-slate-200">
                {incident.employee?.full_name || (user?.id === incident.employee_id ? user?.full_name : null) || user?.full_name || 'Chethana J R'} ({incident.employee?.department || user?.department || 'Engineering'})
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-800/60 py-1.5">
              <span>Device Hostname:</span>
              <span className="font-mono text-slate-200">{incident.device_id}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span>Operating System:</span>
              <span className="text-slate-200">{incident.os_type}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center space-x-2 mb-3">
              <ShieldAlert className="w-4 h-4 text-indigo-400" />
              <span>Current Status</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Triage Pipeline</span>
                <div className="font-bold text-slate-200 text-sm">
                  {incident.status === 'RESOLVED' ? 'Resolution Verified' : incident.status}
                </div>
                <div className="text-[11px] text-slate-400">
                  {incident.status === 'RESOLVED' ? 'All criteria satisfied' : 'Investigation active'}
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Simulation Engine</span>
                <div className="font-medium text-emerald-400 font-mono text-xs">
                  CORP-LAPTOP-042
                </div>
                <div className="text-[10px] text-slate-400">Deterministic network telemetry</div>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 text-center border-t border-slate-800 pt-3">
            Ticket ID: <span className="font-mono text-slate-400">{incident.id}</span>
          </div>
        </div>
      </div>

      {/* Interactive Emergency Hotline Call Modal */}
      {isHotlineOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
            {/* Background glowing gradients */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-rose-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

            {/* Modal Header */}
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400">
                  Priority P1 Emergency Hotline
                </span>
              </div>
              <button
                onClick={() => setIsHotlineOpen(false)}
                className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Engineer Profile Card */}
            <div className="text-center space-y-3 relative z-10">
              <div className="relative inline-block">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-rose-600 to-indigo-600 p-0.5 shadow-xl mx-auto flex items-center justify-center">
                  <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                    <UserCheck className="w-10 h-10 text-white" />
                  </div>
                </div>
                {callStatus === 'CONNECTED' && (
                  <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-400 ring-4 ring-slate-900" />
                )}
              </div>

              <div>
                <h3 className="text-base font-bold text-white">Sarah Connor</h3>
                <p className="text-xs text-rose-300 font-medium">Lead IT Rapid Response Engineer</p>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Direct Line: {incident?.emergency_contact || '+1 (555) 019-2834'}
                </p>
              </div>

              {/* Status & Call Timer */}
              <div className="py-1.5 px-4 rounded-full bg-slate-950/80 border border-slate-800 inline-flex items-center space-x-2 text-xs font-mono">
                {callStatus === 'RINGING' ? (
                  <span className="text-amber-400 flex items-center space-x-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Ringing Dispatch Desk...</span>
                  </span>
                ) : callStatus === 'CONNECTED' ? (
                  <span className="text-emerald-400 flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Connected • {formatCallTime(callDuration)}</span>
                  </span>
                ) : (
                  <span className="text-slate-400">Call Ended</span>
                )}
              </div>
            </div>

            {/* Simulated Live Audio Dispatcher Notes */}
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-2 relative z-10 text-xs">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase text-slate-400">
                <span className="flex items-center space-x-1">
                  <Volume2 className="w-3 h-3 text-emerald-400" />
                  <span>Live Dispatch Audio Feed</span>
                </span>
                <span>Encrypted HD Audio</span>
              </div>
              <p className="text-slate-200 leading-relaxed italic">
                {callStatus === 'RINGING'
                  ? '"Routing high-priority emergency call to Senior On-Call Engineer for CORP-LAPTOP-042..."'
                  : '"Hello! I see your P1 ticket for the upcoming meeting. I have your laptop telemetry open and can execute the VPN driver reset right now while on the line."'}
              </p>
            </div>

            {/* Direct Phone Number 1-Click Copy */}
            <div className="p-3 bg-slate-800/50 border border-slate-800 rounded-xl flex items-center justify-between text-xs relative z-10">
              <div className="truncate">
                <span className="text-[10px] text-slate-400 block font-mono">Dial Directly from Phone:</span>
                <span className="font-mono text-white font-semibold">
                  {incident?.emergency_contact || '+1 (555) 019-2834'}
                </span>
              </div>
              <button
                onClick={() => handleCopyHotlineNumber(incident?.emergency_contact || '+15550192834')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium border border-slate-700 flex items-center space-x-1"
              >
                {copiedPhone ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedPhone ? 'Copied' : 'Copy Number'}</span>
              </button>
            </div>

            {/* Call Action Controls */}
            <div className="flex items-center justify-center space-x-4 pt-2 relative z-10">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`p-3 rounded-full border transition-all ${
                  isMuted
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
                title={isMuted ? 'Unmute' : 'Mute Microphone'}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <button
                onClick={() => {
                  setCallStatus('ENDED');
                  setTimeout(() => setIsHotlineOpen(false), 400);
                }}
                className="px-6 py-3 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-rose-600/40 active:scale-95 transition-all"
              >
                <PhoneOff className="w-4 h-4" />
                <span>End Call</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
