import React, { useState } from 'react';
import { Laptop, Cpu, Send, CheckCircle2, AlertCircle, Sparkles, RefreshCw, ArrowRight, ShieldCheck, PhoneCall, Clock, UserCheck } from 'lucide-react';
import { submitIncident } from '../services/api';
import { IncidentDetail } from '../types';
import { useAuth } from '../context/AuthContext';

interface IncidentFormProps {
  onIncidentSubmitted: (incident: IncidentDetail) => void;
  onOpenCopilot?: () => void;
}

export const IncidentForm: React.FC<IncidentFormProps> = ({ onIncidentSubmitted, onOpenCopilot }) => {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [deviceId, setDeviceId] = useState('CORP-LAPTOP-042');
  const [osType, setOsType] = useState('Windows 11 Enterprise (23H2)');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSubmittedTicket, setLastSubmittedTicket] = useState<IncidentDetail | null>(null);

  // Emergency Fast-Track states
  const [isEmergency, setIsEmergency] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState('Client presentation / team meeting starting in 5 minutes');
  const [emergencyContact, setEmergencyContact] = useState('+1 (555) 019-2834');
  const [meetingTime, setMeetingTime] = useState('In 5 minutes');

  // Quick-fill synthetic issue scenarios for testing
  const quickScenarios = [
    {
      label: '🚨 URGENT: Meeting in 5 Mins (Wi-Fi / VPN Out)',
      text: 'CRITICAL URGENT: Major client presentation starting in 5 minutes! Laptop cannot connect to office Wi-Fi and VPN interface is down. Need urgent human IT engineer assist immediately!',
      category: 'VPN',
      emergency: true,
    },
    {
      label: 'VPN Gateway Unreachable (Golden Path)',
      text: 'My Cisco AnyConnect VPN client refuses to connect. It displays error: "Connection attempt failed: Gateway 10.0.4.1 not reachable". Internet browsing works normally.',
      category: 'VPN',
      emergency: false,
    },
    {
      label: 'Virtual Adapter Error 502',
      text: 'VPN client fails to open with "Virtual network adapter driver failed to initialize (Error 502)". Cannot route corporate subnet.',
      category: 'VPN',
      emergency: false,
    },
    {
      label: 'Internal DNS Resolution Failure',
      text: 'I can access google.com but cannot clone or pull from our internal code repository at code.internal. DNS probe times out.',
      category: 'DNS',
      emergency: false,
    },
    {
      label: 'Active Directory SSO Lockout',
      text: 'Locked out of corporate Single Sign-On after updating my domain password on mobile. Salesforce and Slack return auth expired.',
      category: 'AUTH',
      emergency: false,
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalDesc = description.trim();
    if (isEmergency && finalDesc.length < 10) {
      finalDesc = `CRITICAL URGENT: ${emergencyReason || 'Client presentation / team meeting starting in 5 minutes'}. Meeting time: ${meetingTime || 'In 5 minutes'}. Direct callback: ${emergencyContact || '+1 (555) 019-2834'}. Need urgent human IT engineer assist immediately.`;
      setDescription(finalDesc);
    }

    if (!finalDesc || finalDesc.length < 10) {
      setError('Please provide at least 10 characters describing the issue.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await submitIncident({
        employee_id: user?.id || '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        device_id: deviceId,
        os_type: osType,
        raw_description: finalDesc,
        is_emergency: isEmergency,
        emergency_reason: isEmergency ? (emergencyReason || 'Client presentation / team meeting starting in 5 minutes') : undefined,
        emergency_contact: isEmergency ? (emergencyContact || '+1 (555) 019-2834') : undefined,
        meeting_time: isEmergency ? (meetingTime || 'In 5 minutes') : undefined,
      });

      setLastSubmittedTicket(result);
      onIncidentSubmitted(result);
    } catch (err: any) {
      setError(err.message || 'An unexpected network error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span>Autonomous IT Support Intake</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Report an IT Incident
        </h2>
        <p className="text-sm text-slate-400 max-w-xl mx-auto">
          Describe what is happening in plain English. Our autonomous agent will inspect device telemetry, match official runbooks, and begin diagnosis immediately.
        </p>
      </div>

      {/* Reporting Identity Banner */}
      {user && (
        <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <UserCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Reporting as: <strong className="text-white">{user.full_name}</strong> ({user.department})</span>
          </div>
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 font-bold">
            {user.role === 'ADMIN' ? 'IT Engineer' : 'Employee'}
          </span>
        </div>
      )}

      {/* Success Notification Banner */}
      {lastSubmittedTicket && (
        <div className="bg-emerald-950/40 border border-emerald-500/40 p-4 rounded-xl flex items-start space-x-3 text-emerald-200 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 text-sm">
            <div className="font-semibold text-white flex items-center space-x-2">
              <span>Incident Registered: {lastSubmittedTicket.ticket_number}</span>
              <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono">
                {lastSubmittedTicket.status}
              </span>
            </div>
            <p className="text-emerald-300/80 mt-1">
              Autonomous agent has been notified and queued for AI classification and diagnostic probing.
            </p>
          </div>
          <button
            onClick={() => onIncidentSubmitted(lastSubmittedTicket)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
          >
            <span>Live Tracker</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Copilot Assistant Callout Banner */}
      {onOpenCopilot && (
        <div className="bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-blue-950/30 border border-purple-500/30 rounded-xl p-3.5 flex items-center justify-between text-xs text-purple-200 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-400/20">
              <Sparkles className="w-4 h-4 text-purple-300" />
            </div>
            <div>
              <span className="font-semibold text-white text-xs">Don't know technical terms or need to close a stuck app?</span>
              <p className="text-[11px] text-purple-300/80 mt-0.5">
                Our AI IT Copilot explains how to open Task Manager, fix internet drops in plain English, and runs 1-click diagnoses.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenCopilot}
            className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors shadow flex items-center space-x-1.5 ml-3"
          >
            <span>💬 Ask Copilot</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Device Context Bar */}
        <div className="bg-slate-950/70 border-b border-slate-800/80 px-6 py-3.5 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-3">
          <div className="flex items-center space-x-2">
            <Laptop className="w-4 h-4 text-blue-400" />
            <span>Assigned Device: <strong className="text-slate-200 font-mono">{deviceId}</strong></span>
          </div>
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <span>OS: <strong className="text-slate-200">{osType}</strong></span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Gateway IP: 10.0.4.1 (Simulated)
          </div>
        </div>

        {/* Support Mode Selector Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-950/60 border-b border-slate-800">
          <button
            type="button"
            onClick={() => setIsEmergency(false)}
            className={`p-3.5 rounded-xl border text-left transition-all flex items-start space-x-3 ${
              !isEmergency
                ? 'bg-blue-950/40 border-blue-500 shadow-md shadow-blue-950/30 ring-1 ring-blue-500/50'
                : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 opacity-60 hover:opacity-100'
            }`}
          >
            <div className={`p-2 rounded-lg mt-0.5 ${!isEmergency ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-800 text-slate-400'}`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className={`text-sm font-bold ${!isEmergency ? 'text-white' : 'text-slate-300'}`}>
                  🛡️ Standard Support
                </span>
                {!isEmergency && (
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 font-mono px-2 py-0.5 rounded font-semibold border border-blue-500/30">
                    SELECTED
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Autonomous AI Triage & Self-Healing. Probes device telemetry and executes runbook repairs.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsEmergency(true);
              if (!description.trim()) {
                setDescription(
                  'CRITICAL URGENT: Major presentation / team meeting starting in 5 minutes! Laptop cannot connect and need immediate IT engineer assist.'
                );
              }
            }}
            className={`p-3.5 rounded-xl border text-left transition-all flex items-start space-x-3 ${
              isEmergency
                ? 'bg-rose-950/40 border-rose-500 shadow-md shadow-rose-950/40 ring-1 ring-rose-500/50'
                : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 opacity-60 hover:opacity-100'
            }`}
          >
            <div className={`p-2 rounded-lg mt-0.5 ${isEmergency ? 'bg-rose-600 text-white animate-pulse shadow-md' : 'bg-slate-800 text-slate-400'}`}>
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className={`text-sm font-bold ${isEmergency ? 'text-white' : 'text-slate-300'}`}>
                  🚨 Urgent Fast-Track
                </span>
                {isEmergency && (
                  <span className="text-[10px] bg-rose-500 text-white font-mono px-2 py-0.5 rounded font-bold uppercase animate-pulse">
                    P1 VIP ACTIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Meeting in &lt; 15 mins! Bypasses wait queues and immediately alerts On-Call IT Support engineer.
              </p>
            </div>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Quick Scenario Suggestions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-slate-400">
                Quick Test Templates (Click to Auto-Fill & Select Mode):
              </label>
              <button
                type="button"
                onClick={() => {
                  setDescription('');
                  setIsEmergency(false);
                  setError(null);
                }}
                className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
              >
                Clear Form
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {quickScenarios.map((scenario, idx) => {
                const isSelectedScenario = description === scenario.text;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setDescription(scenario.text);
                      setIsEmergency(Boolean(scenario.emergency));
                    }}
                    className={`text-left p-2.5 rounded-lg border text-xs transition-all flex flex-col justify-between group ${
                      scenario.emergency
                        ? isEmergency
                          ? 'border-rose-500 bg-rose-950/30 ring-1 ring-rose-500/40 shadow-sm'
                          : 'border-rose-500/30 bg-rose-950/10 hover:bg-rose-950/20'
                        : !isEmergency && isSelectedScenario
                          ? 'border-blue-500 bg-blue-950/30 ring-1 ring-blue-500/40 shadow-sm'
                          : 'border-slate-800 bg-slate-950/40 hover:bg-slate-800/70 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`font-semibold ${scenario.emergency ? 'text-rose-300 group-hover:text-rose-200' : 'text-slate-200 group-hover:text-blue-400'}`}>
                        {scenario.label}
                      </span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${scenario.emergency ? 'bg-rose-900/60 text-rose-200' : 'bg-slate-800 text-slate-400'}`}>
                        {scenario.category}
                      </span>
                    </div>
                    <span className="text-slate-400 text-[11px] line-clamp-1 mt-1">{scenario.text}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="problem-desc" className="text-sm font-semibold text-slate-200">
                Problem Description <span className="text-rose-400">*</span>
              </label>
              <span className="text-xs text-slate-500 font-mono">
                {description.length} / 2000 chars
              </span>
            </div>
            <textarea
              id="problem-desc"
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                isEmergency
                  ? "Describe what is blocking your imminent meeting (e.g. Wi-Fi won't connect, display not projecting, VPN down)..."
                  : "e.g. My corporate VPN disconnected about 15 minutes ago. When I try to reconnect, it says 'Gateway unreachable 10.0.4.1'. My local internet is working fine."
              }
              className={`w-full bg-slate-950 border rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-all ${
                isEmergency 
                  ? 'border-rose-900/70 focus:ring-2 focus:ring-rose-500 focus:border-transparent' 
                  : 'border-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              }`}
            />
          </div>

          {/* Mode-specific detail card */}
          {isEmergency ? (
            <div className="p-4 rounded-xl border bg-rose-950/30 border-rose-500/50 shadow-lg shadow-rose-950/20 animate-fadeIn">
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-lg mt-0.5 bg-rose-500/20 text-rose-400 animate-pulse">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-white flex items-center justify-between">
                    <span className="flex items-center space-x-2">
                      <span>Urgent Meeting Fast-Track Parameters</span>
                      <span className="text-[10px] bg-rose-500/30 text-rose-300 font-mono px-2 py-0.5 rounded border border-rose-500/30 uppercase font-semibold">
                        P1 Dispatch
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEmergency(false)}
                      className="text-xs text-rose-300 hover:text-white underline"
                    >
                      Switch to Standard Support
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Your issue will bypass standard automated queues and directly notify On-Call IT Support.
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-rose-900/40 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-rose-300 mb-1 flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>Meeting Starts In:</span>
                  </label>
                  <select
                    value={meetingTime}
                    onChange={(e) => setMeetingTime(e.target.value)}
                    className="w-full bg-slate-900 border border-rose-800/60 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                  >
                    <option value="In 5 minutes">In 5 minutes (Emergency)</option>
                    <option value="In 10 minutes">In 10 minutes (Critical)</option>
                    <option value="In 15 minutes">In 15 minutes (High)</option>
                    <option value="Meeting in progress now">Meeting in progress now! 🚨</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-rose-300 mb-1 flex items-center space-x-1">
                    <PhoneCall className="w-3 h-3" />
                    <span>Direct Callback / Desk:</span>
                  </label>
                  <input
                    type="text"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    placeholder="e.g. +1 (555) 019-2834 / Room 4B"
                    className="w-full bg-slate-900 border border-rose-800/60 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-rose-300 mb-1">
                    Urgent Meeting Purpose:
                  </label>
                  <input
                    type="text"
                    value={emergencyReason}
                    onChange={(e) => setEmergencyReason(e.target.value)}
                    placeholder="e.g. Client presentation"
                    className="w-full bg-slate-900 border border-rose-800/60 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-blue-950/20 border border-blue-500/20 rounded-xl flex items-center justify-between text-xs text-blue-300">
              <div className="flex items-center space-x-2.5">
                <Sparkles className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span>
                  <strong>Autonomous AI Triage Mode:</strong> Ticket will be automatically classified, device telemetry probed, and safe fixes applied.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsEmergency(true)}
                className="text-xs text-rose-400 hover:text-rose-300 underline font-medium whitespace-nowrap ml-2"
              >
                Meeting in &lt; 15 mins?
              </button>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="bg-rose-950/40 border border-rose-500/50 p-3.5 rounded-xl flex items-start space-x-2.5 text-rose-200 text-xs shadow-md">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block text-rose-100 font-semibold mb-0.5">Submission Error</strong>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-slate-400 flex items-center space-x-1.5">
              <span className={`w-2 h-2 rounded-full ${isEmergency ? 'bg-rose-500 animate-ping' : 'bg-blue-400'}`}></span>
              <span>
                {isEmergency 
                  ? 'Priority P1: On-Call IT Support Engineer will be directly paged' 
                  : 'Submissions trigger automatic diagnostic analysis & triage'}
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || (!isEmergency && description.trim().length < 10)}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center space-x-2 transition-all shadow-md ${
                isSubmitting || (!isEmergency && description.trim().length < 10)
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : isEmergency
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/40 active:scale-95 animate-pulse cursor-pointer'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20 active:scale-95 cursor-pointer'
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{isEmergency ? 'Paging IT On-Call...' : 'Submitting Ticket...'}</span>
                </>
              ) : (
                <>
                  {isEmergency ? <AlertCircle className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                  <span>{isEmergency ? '🚨 Dispatch Direct IT Support (P1 VIP)' : '🛡️ Submit Standard Ticket (AI Triage)'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

