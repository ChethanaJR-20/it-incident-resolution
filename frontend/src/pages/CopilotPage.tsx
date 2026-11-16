import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Sparkles,
  Send,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  Shield,
  Activity,
  Zap,
  Power
} from 'lucide-react';
import { sendCopilotMessage, runQuickCopilotDiagnosis, submitIncident } from '../services/api';
import { IncidentDetail } from '../types';
import { useAuth } from '../context/AuthContext';

interface CopilotAction {
  action_type: 'diagnose' | 'ticket' | 'info' | 'shortcut';
  label: string;
  payload?: Record<string, any>;
}

interface QuickDiagnosisData {
  device_id: string;
  overall_status: 'HEALTHY' | 'NEEDS_ATTENTION' | 'CRITICAL';
  plain_english_summary: string;
  findings: string[];
  suggested_ticket_description?: string | null;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  actions?: CopilotAction[];
  diagnosticResult?: QuickDiagnosisData;
}

interface CopilotPageProps {
  onNavigateToTicket: (ticketNumber: string) => void;
  onNavigateToReport: () => void;
}

export const CopilotPage: React.FC<CopilotPageProps> = ({ onNavigateToTicket, onNavigateToReport }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "👋 **Hello! I'm your AI IT Copilot.**\n\nNo technical knowledge needed! Tell me what's wrong with your computer in simple words — like *\"my Excel is frozen\"*, *\"how do I close a stuck app\"*, or *\"my internet is acting weird\"*.\n\nI will walk you through easy step-by-step instructions or test your computer right away.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actions: [
        {
          action_type: 'shortcut',
          label: '🛠️ How do I open Task Manager & force-quit a stuck app?',
          payload: { query: 'How do I open Task Manager and end task for a frozen app?' },
        },
        {
          action_type: 'diagnose',
          label: '🔍 Run instant health check on my laptop',
          payload: { device_id: 'CORP-LAPTOP-042' },
        },
        {
          action_type: 'shortcut',
          label: '📶 My Wi-Fi is on, but websites will not load',
          payload: { query: 'My Wi-Fi is connected but websites will not load' },
        },
        {
          action_type: 'shortcut',
          label: '🐢 Why is my laptop running very slow or lagging?',
          payload: { query: 'Why is my laptop running slow and freezing?' },
        },
      ],
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [ticketCreationState, setTicketCreationState] = useState<{ [actionKey: string]: { status: 'idle' | 'creating' | 'done'; ticketNumber?: string; error?: string } }>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, isDiagnosing]);

  const handleSendMessage = async (userPrompt?: string) => {
    const textToSend = (userPrompt || inputText).trim();
    if (!textToSend || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!userPrompt) setInputText('');
    setIsLoading(true);

    try {
      // Build history for backend
      const history = messages.map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

      const response = await sendCopilotMessage(textToSend, history);

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: response.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: response.suggested_actions,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        sender: 'assistant',
        text: `⚠️ **Could not connect to the backend server.**\n\nPlease ensure the backend is running (you can run \`run_all.bat\` in your project folder) and try again.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunDiagnosis = async (deviceId = 'CORP-LAPTOP-042') => {
    setIsDiagnosing(true);
    const diagMsgId = `diag-${Date.now()}`;

    // Add user intent message
    setMessages((prev) => [
      ...prev,
      {
        id: `user-diag-${Date.now()}`,
        sender: 'user',
        text: `🔍 Checking laptop health for ${deviceId}...`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    try {
      const result: QuickDiagnosisData = await runQuickCopilotDiagnosis(deviceId);

      const assistantMessage: ChatMessage = {
        id: diagMsgId,
        sender: 'assistant',
        text: `### 🩺 Laptop Health Diagnosis Complete\n\n${result.plain_english_summary}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        diagnosticResult: result,
        actions: result.suggested_ticket_description
          ? [
              {
                action_type: 'ticket',
                label: '🎫 Create 1-Click Ticket to Fix This Automatically',
                payload: { description: result.suggested_ticket_description, device_id: deviceId },
              },
            ]
          : [
              {
                action_type: 'shortcut',
                label: '💡 Tips to keep your laptop fast and clean',
                payload: { query: 'Tips to keep my computer fast and running smooth' },
              },
            ],
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `diag-err-${Date.now()}`,
          sender: 'assistant',
          text: `⚠️ Could not perform diagnostic test right now: ${err.message || 'Unknown network error'}.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleCreateTicketFromCopilot = async (
    actionKey: string,
    description: string,
    deviceId = 'CORP-LAPTOP-042',
    isEmergency = false,
    meetingTime = 'In 5 minutes',
    emergencyContact = '+1 (555) 019-2834',
    emergencyReason = 'Imminent critical meeting starting in 5 minutes'
  ) => {
    setTicketCreationState((prev) => ({
      ...prev,
      [actionKey]: { status: 'creating' },
    }));

    try {
      const ticket: IncidentDetail = await submitIncident(
        {
          employee_id: user?.id || '3fa85f64-5717-4562-b3fc-2c963f66afa6',
          device_id: deviceId,
          os_type: 'Windows 11 Enterprise (23H2)',
          raw_description: description,
          is_emergency: isEmergency,
          emergency_reason: isEmergency ? emergencyReason : undefined,
          emergency_contact: isEmergency ? emergencyContact : undefined,
          meeting_time: isEmergency ? meetingTime : undefined,
        },
        !isEmergency // Auto-triage only if not emergency
      );

      setTicketCreationState((prev) => ({
        ...prev,
        [actionKey]: { status: 'done', ticketNumber: ticket.ticket_number },
      }));

      // Post confirmation into chat
      setMessages((prev) => [
        ...prev,
        {
          id: `ticket-confirm-${Date.now()}`,
          sender: 'assistant',
          text: isEmergency
            ? `🚨 **EMERGENCY DISPATCH ACTIVATED: ${ticket.ticket_number}**\n\nPriority escalated to **P1 VIP**. On-call IT Human Specialist has been paged immediately for your meeting starting **${meetingTime}**! Direct callback: **${emergencyContact}**.`
            : `🎉 **Official IT Ticket Created: ${ticket.ticket_number}**\n\nOur Autonomous IT Agent has immediately received your ticket and started investigating and fixing the issue in the background!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actions: [
            {
              action_type: 'info',
              label: `🚀 Open Live Tracker for ${ticket.ticket_number}`,
              payload: { ticketNumber: ticket.ticket_number },
            },
          ],
        },
      ]);
    } catch (err: any) {
      setTicketCreationState((prev) => ({
        ...prev,
        [actionKey]: { status: 'idle', error: err.message || 'Failed to create ticket' },
      }));
    }
  };

  // Render markdown with nice key-cap styling and highlighted bullet points
  const renderFormattedText = (raw: string) => {
    const lines = raw.split('\n');
    return (
      <div className="space-y-2 text-sm leading-relaxed text-slate-200">
        {lines.map((line, idx) => {
          if (!line.trim()) {
            return <div key={idx} className="h-1" />;
          }

          // Headers
          if (line.startsWith('### ')) {
            return (
              <h4 key={idx} className="text-base font-bold text-white mt-2 mb-1 flex items-center space-x-2">
                <span>{line.replace('### ', '')}</span>
              </h4>
            );
          }

          if (line.startsWith('---')) {
            return <hr key={idx} className="border-slate-700/60 my-2" />;
          }

          // Highlighted shortcuts with keyboard keys
          if (line.includes('`')) {
            const parts = line.split(/(`[^`]+`)/g);
            return (
              <p key={idx} className={`py-0.5 ${line.startsWith('👉') ? 'pl-2 text-amber-300 font-medium' : ''}`}>
                {parts.map((p, pIdx) => {
                  if (p.startsWith('`') && p.endsWith('`')) {
                    const keyName = p.slice(1, -1);
                    return (
                      <kbd
                        key={pIdx}
                        className="inline-block mx-1 px-2.5 py-0.5 text-xs font-semibold font-mono text-amber-300 bg-slate-900 border border-amber-500/40 rounded-md shadow-sm"
                      >
                        {keyName}
                      </kbd>
                    );
                  }
                  const formatted = p.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                  return <span key={pIdx} dangerouslySetInnerHTML={{ __html: formatted }} />;
                })}
              </p>
            );
          }

          // Bold text highlights
          if (line.includes('**')) {
            const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            return (
              <p
                key={idx}
                className={line.startsWith('👉') ? 'pl-2 text-amber-300 font-medium' : ''}
                dangerouslySetInnerHTML={{ __html: formatted }}
              />
            );
          }

          return <p key={idx}>{line}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/30 border border-blue-500/20 rounded-2xl p-6 shadow-xl backdrop-blur-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0 shadow-inner">
            <Sparkles className="w-6 h-6 text-blue-300 animate-pulse" />
          </div>
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-1" />
              Non-Technical Friendly AI Assistant
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">AI IT Copilot</h2>
            <p className="text-xs text-slate-300 max-w-xl mt-0.5">
              Ask any question in plain English. We explain everything in simple words (e.g. how to close frozen apps, open Task Manager, fix internet drops) or run automated health tests with one click.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => handleRunDiagnosis('CORP-LAPTOP-042')}
            disabled={isDiagnosing}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow transition-all flex items-center space-x-1.5 disabled:opacity-50"
          >
            {isDiagnosing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Diagnosing Laptop...</span>
              </>
            ) : (
              <>
                <Activity className="w-3.5 h-3.5" />
                <span>Run Laptop Health Check</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl flex flex-col h-[620px] overflow-hidden">
        {/* Chat Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {messages.map((message) => {
            const isAssistant = message.sender === 'assistant';
            return (
              <div
                key={message.id}
                className={`flex items-start space-x-3 ${isAssistant ? 'justify-start' : 'justify-end'}`}
              >
                {isAssistant && (
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0 mt-1">
                    <Sparkles className="w-4 h-4 text-blue-300" />
                  </div>
                )}

                <div className={`max-w-2xl ${isAssistant ? 'w-full' : ''}`}>
                  <div
                    className={`p-4 rounded-2xl shadow-sm ${
                      isAssistant
                        ? 'bg-slate-800/80 border border-slate-700/80 text-slate-200'
                        : 'bg-blue-600 text-white font-medium ml-auto'
                    }`}
                  >
                    {isAssistant ? renderFormattedText(message.text) : <p className="text-sm">{message.text}</p>}

                    {/* Diagnostic Result Card if present */}
                    {message.diagnosticResult && (
                      <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-slate-700/80 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                          <div className="flex items-center space-x-2">
                            <Laptop className="w-4 h-4 text-blue-400" />
                            <span className="text-xs font-bold text-slate-200">
                              Device: {message.diagnosticResult.device_id}
                            </span>
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                              message.diagnosticResult.overall_status === 'HEALTHY'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {message.diagnosticResult.overall_status === 'HEALTHY' ? '✅ System Healthy' : '⚠️ Attention Required'}
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          {message.diagnosticResult.findings.map((f, fIdx) => (
                            <div key={fIdx} className="text-xs text-slate-300 flex items-start space-x-2">
                              <span>{f}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Cards / Action Buttons */}
                    {message.actions && message.actions.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-700/60 flex flex-wrap gap-2">
                        {message.actions.map((action, aIdx) => {
                          const actionKey = `${message.id}-action-${aIdx}`;
                          const state = ticketCreationState[actionKey] || { status: 'idle' };

                          if (action.action_type === 'info' && action.payload?.ticketNumber) {
                            return (
                              <button
                                key={aIdx}
                                onClick={() => onNavigateToTicket(action.payload!.ticketNumber)}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center space-x-1.5 shadow"
                              >
                                <span>{action.label}</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            );
                          }

                          if (action.action_type === 'ticket') {
                            const desc = action.payload?.description || 'Issue requiring IT support';
                            const devId = action.payload?.device_id || 'CORP-LAPTOP-042';

                            if (state.status === 'done' && state.ticketNumber) {
                              return (
                                <button
                                  key={aIdx}
                                  onClick={() => onNavigateToTicket(state.ticketNumber!)}
                                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white flex items-center space-x-1.5 shadow"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                                  <span>View Created Ticket: {state.ticketNumber}</span>
                                </button>
                              );
                            }

                            return (
                              <button
                                key={aIdx}
                                onClick={() => handleCreateTicketFromCopilot(actionKey, desc, devId)}
                                disabled={state.status === 'creating'}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all flex items-center space-x-1.5 shadow disabled:opacity-50"
                              >
                                {state.status === 'creating' ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>Submitting IT Ticket...</span>
                                  </>
                                ) : (
                                  <>
                                    <span>{action.label}</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </>
                                )}
                              </button>
                            );
                          }

                          if (action.action_type === 'diagnose') {
                            return (
                              <button
                                key={aIdx}
                                onClick={() => handleRunDiagnosis(action.payload?.device_id || 'CORP-LAPTOP-042')}
                                disabled={isDiagnosing}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white transition-all flex items-center space-x-1.5 border border-indigo-500/40"
                              >
                                <Activity className="w-3.5 h-3.5 text-indigo-300" />
                                <span>{action.label}</span>
                              </button>
                            );
                          }

                          if (action.action_type === 'shortcut') {
                            return (
                              <button
                                key={aIdx}
                                onClick={() => handleSendMessage(action.payload?.query || action.label)}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-200 transition-all border border-slate-600/50 hover:border-blue-500/40 text-left"
                              >
                                {action.label}
                              </button>
                            );
                          }

                          return null;
                        })}
                      </div>
                    )}

                    <div className="mt-2 text-[10px] text-slate-400 text-right">{message.timestamp}</div>
                  </div>
                </div>

                {!isAssistant && (
                  <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-1">
                    <Laptop className="w-4 h-4 text-slate-300" />
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0 mt-1">
                <Sparkles className="w-4 h-4 text-blue-300 animate-spin" />
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-xs text-slate-300 flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span>Copilot is writing plain-English instructions...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Quick Prompt Chips */}
        <div className="p-2.5 bg-slate-950/70 border-t border-slate-800/80 flex items-center space-x-2 overflow-x-auto text-xs no-scrollbar">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 pl-2">
            Quick Topics:
          </span>
          <button
            onClick={() => handleSendMessage('How do I open Task Manager and force quit a frozen app?')}
            className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 shrink-0 transition-colors"
          >
            🛑 Force quit stuck app (Task Manager)
          </button>
          <button
            onClick={() => handleSendMessage('My Wi-Fi is connected but websites won’t load')}
            className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 shrink-0 transition-colors"
          >
            📶 Wi-Fi / Website won’t load
          </button>
          <button
            onClick={() => handleSendMessage('Why is my computer running so slow and lagging?')}
            className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 shrink-0 transition-colors"
          >
            🐢 Computer running slow
          </button>
          <button
            onClick={() => handleSendMessage('I am locked out of my corporate login account')}
            className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 shrink-0 transition-colors"
          >
            🔒 Locked out of SSO / Password
          </button>
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center space-x-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Type your computer problem in simple words (e.g. 'how do I kill an app that is stuck')..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
            disabled={isLoading}
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isLoading}
            className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 disabled:hover:bg-blue-600 transition-all shadow"
            title="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Helpful Non-Tech Reference Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-1.5">
          <div className="flex items-center space-x-2 text-amber-400 font-semibold text-xs">
            <Zap className="w-4 h-4" />
            <span>Emergency Stuck App?</span>
          </div>
          <p className="text-xs text-slate-300">
            Hold down <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-amber-300 font-mono text-[10px]">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-amber-300 font-mono text-[10px]">Shift</kbd> + <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-amber-300 font-mono text-[10px]">Esc</kbd> to launch Task Manager instantly.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-1.5">
          <div className="flex items-center space-x-2 text-blue-400 font-semibold text-xs">
            <Power className="w-4 h-4" />
            <span>Golden Rule of IT</span>
          </div>
          <p className="text-xs text-slate-300">
            Restarting your computer clears temporary memory locks and fixes over 80% of common computer slowness.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-1.5">
          <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-xs">
            <Shield className="w-4 h-4" />
            <span>Need Official Assistance?</span>
          </div>
          <p className="text-xs text-slate-300">
            If self-help doesn't fix it, use the <button onClick={onNavigateToReport} className="text-blue-400 underline font-semibold hover:text-blue-300">Report Incident</button> form for autonomous AI repair.
          </p>
        </div>
      </div>
    </div>
  );
};

