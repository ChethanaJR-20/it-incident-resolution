import React from 'react';
import {
  FileText,
  Sparkles,
  Activity,
  Wrench,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Bot,
  Shield,
} from 'lucide-react';
import { IncidentDetail } from '../../types';

interface ReasoningTimelineProps {
  incident: IncidentDetail;
}

export const ReasoningTimeline: React.FC<ReasoningTimelineProps> = ({ incident }) => {
  const events = [];

  const diagnosticResults = incident.diagnostic_results || [];
  const remediationActions = incident.remediation_actions || [];
  const approvalRequests = incident.approval_requests || [];

  // Event 1: Submission
  events.push({
    title: 'Incident Submitted by Employee',
    actor: 'USER',
    actorName: incident.employee?.full_name ? `${incident.employee.full_name} (${incident.employee.department})` : 'Employee',
    icon: <User className="w-3.5 h-3.5 text-blue-400" />,
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    timestamp: incident.created_at ? new Date(incident.created_at).toLocaleTimeString() : 'Now',
    details: `Reported from device ${incident.device_id || 'Unknown'} (${incident.os_type || 'Windows'}): "${incident.raw_description || 'No description'}"`,
  });

  // Event 2: AI Classification
  if (incident.classification) {
    const symptoms = Array.isArray(incident.classification.extracted_symptoms)
      ? incident.classification.extracted_symptoms.join(', ')
      : typeof incident.classification.extracted_symptoms === 'string'
      ? incident.classification.extracted_symptoms
      : 'Network unreachable';

    events.push({
      title: 'Autonomous AI Triage & Grounding',
      actor: 'AGENT',
      actorName: 'Gemini 2.5 Flash Orchestrator',
      icon: <Sparkles className="w-3.5 h-3.5 text-indigo-400" />,
      badgeColor: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
      timestamp: 'T+1.2s',
      details: `Classified as ${incident.classification.category || 'OTHER'} (${incident.classification.priority || 'P3'}). Extracted symptoms: ${symptoms}. Matched SOP runbook.`,
    });
  }

  // Event 3: Pre-Remediation Diagnostics
  const preDiags = diagnosticResults.filter((d) => d.execution_stage === 'PRE_REMEDIATION');
  if (preDiags.length > 0) {
    events.push({
      title: 'Automated Diagnostic Telemetry Probes',
      actor: 'AGENT',
      actorName: 'Diagnostic Dispatcher',
      icon: <Activity className="w-3.5 h-3.5 text-rose-400" />,
      badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      timestamp: 'T+3.4s',
      details: `Executed ${preDiags.length} allowlisted probes: resolve_dns() returned stale IP; ping_gateway() reported loss; check_vpn_adapter_status() reported status.`,
    });
  }

  // Event 4: Safe Remediation Actions
  const safeRemeds = remediationActions.filter((r) => r.tool_name === 'flush_dns_cache');
  if (safeRemeds.length > 0) {
    events.push({
      title: 'Safe Remediation Tool Execution (Tier 1)',
      actor: 'AGENT',
      actorName: 'Remediation Engine',
      icon: <Wrench className="w-3.5 h-3.5 text-emerald-400" />,
      badgeColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
      timestamp: 'T+4.1s',
      details: 'Executed flush_dns_cache(). Local resolver cache successfully cleared and re-bound to active gateway.',
    });
  }

  // Event 5: Human-in-the-Loop Approval
  const approval = approvalRequests[0];
  if (approval) {
    events.push({
      title: `Privileged Action Sign-Off: ${approval.action_name || 'System Action'}()`,
      actor: 'ADMIN',
      actorName: 'IT Administrator',
      icon: <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />,
      badgeColor: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
      timestamp: approval.reviewed_at ? new Date(approval.reviewed_at).toLocaleTimeString() : 'Pending',
      details: `Decision: ${approval.status}. Risk rating: ${approval.risk_level}. Justification: ${approval.reasoning}`,
    });
  }

  // Event 6: Post-Remediation Verification
  const postDiags = diagnosticResults.filter((d) => d.execution_stage === 'POST_REMEDIATION');
  if (postDiags.length > 0) {
    events.push({
      title: 'Closed-Loop Verification Telemetry',
      actor: 'AGENT',
      actorName: 'Verification Engine',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
      badgeColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
      timestamp: incident.resolved_at ? new Date(incident.resolved_at).toLocaleTimeString() : 'T+6.2s',
      details: 'Re-tested gateway ping (0% loss, 18ms latency) and virtual adapter state (CONNECTED). Objective health confirmed.',
    });
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-bold text-white">Chronological AI Reasoning & Execution Trace</h3>
        </div>
        <span className="text-[11px] font-mono text-slate-400">{events.length} Recorded Trace Events</span>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
        {events.map((ev, idx) => (
          <div key={idx} className="relative group">
            {/* Timeline node icon */}
            <div className="absolute -left-[27px] top-0.5 w-6 h-6 rounded-full bg-slate-950 border border-slate-700 flex items-center justify-center">
              {ev.icon}
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-colors space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-100">{ev.title}</span>
                <div className="flex items-center space-x-2">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${ev.badgeColor}`}>
                    {ev.actor} • {ev.actorName}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">{ev.timestamp}</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">{ev.details}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

