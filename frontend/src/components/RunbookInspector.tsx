import React, { useState } from 'react';
import {
  BookOpen,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  Activity,
  Terminal,
  ArrowRight,
  RefreshCw,
  FileText,
  Lock,
  Layers,
  Check,
  Copy,
} from 'lucide-react';

interface ToolExplanation {
  name: string;
  plainName: string;
  purpose: string;
  safetyTier: 'SAFE' | 'PRIVILEGED';
  requiresApproval: boolean;
  whatItDoes: string;
}

const TOOL_GLOSSARY: Record<string, ToolExplanation> = {
  check_vpn_adapter_status: {
    name: 'check_vpn_adapter_status',
    plainName: 'Virtual Network Card Health Check',
    purpose: 'Verifies whether your laptop virtual network driver is active or crashed in an error state.',
    safetyTier: 'SAFE',
    requiresApproval: false,
    whatItDoes: 'Queries the Windows device driver to verify the VPN adapter is operational.',
  },
  resolve_dns: {
    name: 'resolve_dns',
    plainName: 'Company Server Address Lookup',
    purpose: 'Checks if your computer is looking for the corporate gateway at the right IP address.',
    safetyTier: 'SAFE',
    requiresApproval: false,
    whatItDoes: 'Translates domain names (like vpn.corporate.internal) into server IP addresses.',
  },
  ping_gateway: {
    name: 'ping_gateway',
    plainName: 'Gateway Connection Test',
    purpose: 'Sends quick test signals to the gateway to measure packet loss and response time.',
    safetyTier: 'SAFE',
    requiresApproval: false,
    whatItDoes: 'Sends 4 ICMP network test pings to ensure your laptop can reach the company servers.',
  },
  check_service_status: {
    name: 'check_service_status',
    plainName: 'Background Service Status Check',
    purpose: 'Verifies if the background VPN helper application is currently running or frozen.',
    safetyTier: 'SAFE',
    requiresApproval: false,
    whatItDoes: 'Checks the operating system process table for the corporate VPN daemon.',
  },
  flush_dns_cache: {
    name: 'flush_dns_cache',
    plainName: 'Clear Network Address Memory',
    purpose: 'Wipes outdated and stale server addresses from your laptop local memory so it fetches fresh ones.',
    safetyTier: 'SAFE',
    requiresApproval: false,
    whatItDoes: 'Clears the Windows DNS resolver cache (equivalent to ipconfig /flushdns).',
  },
  reset_virtual_adapter: {
    name: 'reset_virtual_adapter',
    plainName: 'Restart Network Adapter Driver',
    purpose: 'Re-initializes the virtual network card to fix driver freezes without rebooting your laptop.',
    safetyTier: 'SAFE',
    requiresApproval: false,
    whatItDoes: 'Disables and immediately re-enables the virtual miniport network adapter.',
  },
  restart_vpn_service: {
    name: 'restart_vpn_service',
    plainName: 'Restart Background VPN Service',
    purpose: 'Restarts the core corporate VPN system service when a connection tunnel hangs completely.',
    safetyTier: 'PRIVILEGED',
    requiresApproval: true,
    whatItDoes: 'Restarts the system daemon service. Requires explicit IT Administrator approval.',
  },
  check_account_lockout: {
    name: 'check_account_lockout',
    plainName: 'Account Lockout Inspection',
    purpose: 'Checks corporate Active Directory to see if your account was locked by failed logins.',
    safetyTier: 'SAFE',
    requiresApproval: false,
    whatItDoes: 'Queries enterprise security servers to verify account status.',
  },
  check_system_clock: {
    name: 'check_system_clock',
    plainName: 'System Clock Drift Check',
    purpose: 'Ensures your computer clock matches the enterprise time server for login tokens.',
    safetyTier: 'SAFE',
    requiresApproval: false,
    whatItDoes: 'Compares local system time against network time protocol (NTP) servers.',
  },
  unlock_corporate_account: {
    name: 'unlock_corporate_account',
    plainName: 'Unlock Corporate Account',
    purpose: 'Removes the lockout flag on your corporate user profile.',
    safetyTier: 'PRIVILEGED',
    requiresApproval: true,
    whatItDoes: 'Resets the lockout status in enterprise directory. Requires Tier-2 IT sign-off.',
  },
  clear_browser_session: {
    name: 'clear_browser_session',
    plainName: 'Clear Expired SSO Tokens',
    purpose: 'Clears corrupted Single Sign-On cookies and session tokens causing login loops.',
    safetyTier: 'SAFE',
    requiresApproval: false,
    whatItDoes: 'Removes stale identity provider cookies to allow a clean new login.',
  },
  refresh_ip_lease: {
    name: 'refresh_ip_lease',
    plainName: 'Renew Network IP Lease',
    purpose: 'Requests a fresh IP address configuration from the corporate DHCP router.',
    safetyTier: 'SAFE',
    requiresApproval: false,
    whatItDoes: 'Releases and renews the local IP address lease (equivalent to ipconfig /renew).',
  },
};

interface PlainSOPGuide {
  plainTitle: string;
  plainSummary: string;
  whyItHappens: string;
  steps: {
    stepNumber: number;
    title: string;
    description: string;
    tag: string;
  }[];
  verificationGoal: string;
}

const SOP_PLAIN_GUIDES: Record<string, PlainSOPGuide> = {
  'SOP-NET-001': {
    plainTitle: 'Corporate VPN Connection & Tunnel Self-Healing',
    plainSummary:
      'Diagnoses and automatically resolves VPN connection dropouts, frozen adapter drivers, and outdated server addresses.',
    whyItHappens:
      'When your laptop switches between home Wi-Fi and office networks, Windows can remember stale gateway addresses (e.g., 10.0.4.1 instead of 10.0.4.50) or the virtual network driver can freeze in an error state (ERROR_502).',
    steps: [
      {
        stepNumber: 1,
        title: 'Query Device Telemetry',
        description: 'The AI queries your laptop network card state and checks if the VPN software is running.',
        tag: 'Diagnostic Probe',
      },
      {
        stepNumber: 2,
        title: 'Detect Gateway & DNS Fault',
        description:
          'Verifies whether your computer is attempting to reach the old corporate IP address or experiencing packet loss.',
        tag: 'Root-Cause Analysis',
      },
      {
        stepNumber: 3,
        title: 'Execute Safe Auto-Fix (Tier 1)',
        description:
          'Flushes local DNS cache and resets the virtual network driver in seconds. No laptop reboot needed.',
        tag: 'Automated Repair',
      },
      {
        stepNumber: 4,
        title: 'Human-in-the-Loop Safety Gate (Tier 2)',
        description:
          'If the tunnel daemon is completely dead, the AI halts and asks an IT engineer to authorize a service restart.',
        tag: 'Safety Guardrail',
      },
      {
        stepNumber: 5,
        title: 'Closed-Loop Verification',
        description:
          'Reruns the diagnostic probes to confirm 0% packet loss and verified connection before closing your ticket.',
        tag: 'Verification',
      },
    ],
    verificationGoal: 'VPN adapter reports CONNECTED, corporate gateway is reachable, and packet loss is 0%.',
  },
  'SOP-DNS-002': {
    plainTitle: 'Internal Corporate DNS & Routing Recovery',
    plainSummary:
      'Fixes issues where internal tools (like corporate portals, Jira, and Git repositories) fail to open with "Server Not Found".',
    whyItHappens:
      'Your computer local address book is holding onto expired domain mappings or your router network lease has expired.',
    steps: [
      {
        stepNumber: 1,
        title: 'Check Domain Lookup',
        description: 'Tests whether your computer can resolve company internal website addresses.',
        tag: 'Diagnostic Probe',
      },
      {
        stepNumber: 2,
        title: 'Isolate DNS Cache Stagnation',
        description: 'Checks if the corporate DNS servers are healthy and if the failure is isolated to your laptop cache.',
        tag: 'Root-Cause Analysis',
      },
      {
        stepNumber: 3,
        title: 'Flush Local Resolver Cache',
        description: 'Clears out stale domain records and renews your network address lease.',
        tag: 'Automated Repair',
      },
      {
        stepNumber: 4,
        title: 'Verify Resolution',
        description: 'Confirms your browser can open internal portals properly.',
        tag: 'Verification',
      },
    ],
    verificationGoal: 'Internal hostnames resolve to correct corporate IP addresses with active HTTP 200 response.',
  },
  'SOP-AUTH-003': {
    plainTitle: 'Single Sign-On (SSO) & Account Access Recovery',
    plainSummary:
      'Resolves account lockouts, expired security tokens, and login loops across Microsoft 365, Slack, and corporate portals.',
    whyItHappens:
      'Multiple failed password attempts can trigger automatic security lockouts, or local computer time drift causes authentication tokens to expire immediately.',
    steps: [
      {
        stepNumber: 1,
        title: 'Inspect Account Status',
        description: 'Queries Active Directory to see if your account is locked and checks local clock synchronization.',
        tag: 'Diagnostic Probe',
      },
      {
        stepNumber: 2,
        title: 'Clear Stale Browser Tokens',
        description: 'Removes corrupted Single Sign-On cookies that cause login loops.',
        tag: 'Automated Repair',
      },
      {
        stepNumber: 3,
        title: 'Tier-2 Human Approval for Account Unlock',
        description:
          'Security policies require an IT specialist or supervisor to approve an account unlock before resetting access.',
        tag: 'Safety Guardrail',
      },
      {
        stepNumber: 4,
        title: 'Confirm Active Status',
        description: 'Validates that your user profile status is restored to ACTIVE.',
        tag: 'Verification',
      },
    ],
    verificationGoal: 'Corporate account status is ACTIVE and new authentication tokens are successfully granted.',
  },
};

interface RunbookInspectorProps {
  runbook: {
    doc_code: string;
    title: string;
    category?: string;
    content?: string;
    allowable_tools?: {
      diagnostics?: string[];
      remediations?: string[];
      [key: string]: any;
    };
  };
  compact?: boolean;
}

export const RunbookInspector: React.FC<RunbookInspectorProps> = ({ runbook, compact = false }) => {
  const [activeTab, setActiveTab] = useState<'plain' | 'technical'>('plain');
  const [copied, setCopied] = useState(false);

  const guide = SOP_PLAIN_GUIDES[runbook.doc_code] || {
    plainTitle: runbook.title,
    plainSummary: 'Standard operating procedure for diagnosing and remediating corporate IT incidents.',
    whyItHappens:
      'Temporary system glitches, network configuration shifts, or cached credentials require automated validation and repair.',
    steps: [
      {
        stepNumber: 1,
        title: 'Run Diagnostic Probes',
        description: 'Collects live telemetry to identify the root cause.',
        tag: 'Diagnostic Probe',
      },
      {
        stepNumber: 2,
        title: 'Apply Safe Repairs',
        description: 'Executes approved non-destructive fixes according to the runbook.',
        tag: 'Automated Repair',
      },
      {
        stepNumber: 3,
        title: 'Verify Resolution',
        description: 'Reruns health checks to ensure the problem is solved.',
        tag: 'Verification',
      },
    ],
    verificationGoal: 'All system checks pass and the reported issue is verified as resolved.',
  };

  const handleCopyContent = () => {
    if (runbook.content) {
      navigator.clipboard.writeText(runbook.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const allTools = [
    ...(runbook.allowable_tools?.diagnostics || []),
    ...(runbook.allowable_tools?.remediations || []),
    ...Object.keys(runbook.allowable_tools || {}).filter(
      (k) => k !== 'diagnostics' && k !== 'remediations'
    ),
  ];
  const uniqueTools = Array.from(new Set(allTools));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl animate-fadeIn">
      {/* Runbook Inspector Navigation Header */}
      <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {runbook.doc_code}
              </span>
              <span className="text-[11px] font-mono uppercase text-slate-400">
                Category: {runbook.category || 'IT INFRASTRUCTURE'}
              </span>
            </div>
            <h3 className="text-sm font-bold text-white mt-0.5">{guide.plainTitle}</h3>
          </div>
        </div>

        {/* Tab Switcher: Plain Language vs Technical SOP */}
        <div className="flex items-center space-x-1 p-1 bg-slate-900 border border-slate-800 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('plain')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all ${
              activeTab === 'plain'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Plain Language Guide</span>
          </button>

          <button
            onClick={() => setActiveTab('technical')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all ${
              activeTab === 'technical'
                ? 'bg-slate-800 text-white shadow-md font-semibold border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Technical Runbook (CLI)</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Plain Language Guide */}
      {activeTab === 'plain' && (
        <div className="p-4 sm:p-5 space-y-5">
          {/* Plain Summary Banner */}
          <div className="p-4 bg-gradient-to-r from-indigo-950/40 to-slate-950 border border-indigo-500/20 rounded-xl space-y-2">
            <div className="flex items-center space-x-2 text-xs font-bold text-indigo-300 uppercase tracking-wider font-mono">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
              <span>What this SOP solves in plain English</span>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed font-normal">{guide.plainSummary}</p>
            <div className="pt-2 text-xs text-slate-400 border-t border-slate-800/60">
              <strong className="text-slate-300">Why this happens:</strong> {guide.whyItHappens}
            </div>
          </div>

          {/* How the AI Solves It Step-by-Step */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>How the AI Agent Solves This Automatically</span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">Step-by-Step Walkthrough</span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {guide.steps.map((s) => (
                <div
                  key={s.stepNumber}
                  className="p-3 bg-slate-950 border border-slate-800/90 rounded-xl flex items-start space-x-3 hover:border-slate-700 transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold font-mono flex items-center justify-center flex-shrink-0 mt-0.5">
                    {s.stepNumber}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white">{s.title}</h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        {s.tag}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{s.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Plain English Tool Translation Matrix */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>Certified Tools & Plain English Meaning</span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">Safety & Permission Matrix</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {uniqueTools.map((toolName) => {
                const info = TOOL_GLOSSARY[toolName] || {
                  name: toolName,
                  plainName: toolName.replace(/_/g, ' ').toUpperCase(),
                  purpose: 'Automated diagnostic or remediation utility certified for this runbook.',
                  safetyTier: 'SAFE' as const,
                  requiresApproval: false,
                  whatItDoes: 'Executes automated system check or repair within certified runbook bounds.',
                };

                return (
                  <div
                    key={toolName}
                    className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2 hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{info.plainName}</span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold flex items-center space-x-1 ${
                          info.requiresApproval
                            ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {info.requiresApproval ? <Lock className="w-2.5 h-2.5 mr-1" /> : <ShieldCheck className="w-2.5 h-2.5 mr-1" />}
                        <span>{info.requiresApproval ? 'IT Approval Needed' : 'Safe Auto-Run'}</span>
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{info.purpose}</p>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800/80 text-[11px] font-mono text-slate-400 flex items-center justify-between">
                      <span className="text-slate-400">System Tool:</span>
                      <code className="text-indigo-400 font-semibold">{toolName}</code>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Verification Guarantee */}
          <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/30 rounded-xl flex items-start space-x-3 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <strong className="text-white block font-semibold mb-0.5">Verification Criteria Before Closing Ticket:</strong>
              <p className="text-slate-300">{guide.verificationGoal}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Technical Engineering SOP Runbook */}
      {activeTab === 'technical' && (
        <div className="p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono text-slate-300 flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span>Official Markdown SOP Document</span>
            </span>
            <button
              onClick={handleCopyContent}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono flex items-center space-x-1 border border-slate-700"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy Markdown'}</span>
            </button>
          </div>

          {/* Formatted Technical SOP Document */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-4 text-xs font-mono text-slate-300 max-h-96 overflow-y-auto leading-relaxed">
            {runbook.content ? (
              <div className="space-y-4 font-sans text-xs">
                {runbook.content.split('\n\n').map((paragraph, idx) => {
                  if (paragraph.startsWith('# ')) {
                    return (
                      <h2 key={idx} className="text-base font-bold text-white pb-2 border-b border-slate-800">
                        {paragraph.replace('# ', '')}
                      </h2>
                    );
                  }
                  if (paragraph.startsWith('## ')) {
                    return (
                      <h3 key={idx} className="text-xs font-bold text-indigo-300 uppercase tracking-wider font-mono pt-2">
                        {paragraph.replace('## ', '')}
                      </h3>
                    );
                  }
                  if (paragraph.includes('\n- ') || paragraph.startsWith('- ')) {
                    const items = paragraph.split('\n').filter((l) => l.trim().startsWith('- '));
                    return (
                      <ul key={idx} className="list-disc list-inside space-y-1 text-slate-300 pl-2">
                        {items.map((it, i) => (
                          <li key={i}>{it.replace('- ', '')}</li>
                        ))}
                      </ul>
                    );
                  }
                  if (paragraph.includes('\n1. ') || paragraph.startsWith('1. ')) {
                    const items = paragraph.split('\n').filter((l) => /^\d+\.\s/.test(l.trim()));
                    return (
                      <ol key={idx} className="list-decimal list-inside space-y-1 text-slate-300 pl-2">
                        {items.map((it, i) => (
                          <li key={i}>{it.replace(/^\d+\.\s/, '')}</li>
                        ))}
                      </ol>
                    );
                  }
                  return (
                    <p key={idx} className="text-slate-300 leading-relaxed font-sans">
                      {paragraph}
                    </p>
                  );
                })}
              </div>
            ) : (
              <div className="text-slate-500 italic">No raw markdown content available for this runbook.</div>
            )}
          </div>

          {/* Security Guardrail Boundary Note */}
          <div className="p-3 bg-blue-950/20 border border-blue-500/20 rounded-xl flex items-start space-x-2 text-xs text-blue-300">
            <ShieldCheck className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <p>
              <strong>Autonomous Boundary:</strong> The Central AI Agent is strictly sandboxed to the tools defined in this runbook. It cannot execute arbitrary shell commands or access unauthorized network ports.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

