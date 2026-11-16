import React, { useState, useEffect } from 'react';
import {
  Activity,
  Terminal,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Shield,
  Wrench,
  Wifi,
  Server,
  Cpu,
  Layers,
  ArrowRight,
  Info
} from 'lucide-react';
import {
  getDiagnosticsProbes,
  executeDiagnosticProbe,
  executeRemediationAction,
  resetDiagnosticsEnvironment
} from '../services/api';

export const DiagnosticsLabPage: React.FC = () => {
  const [probes, setProbes] = useState<any[]>([]);
  const [remediations, setRemediations] = useState<any[]>([]);
  const [activeFaults, setActiveFaults] = useState<string[]>([]);
  const [selectedProbeId, setSelectedProbeId] = useState<string>('ping_gateway');
  const [targetInput, setTargetInput] = useState<string>('10.0.4.1');
  
  const [loading, setLoading] = useState(false);
  const [probeResult, setProbeResult] = useState<any | null>(null);
  const [remediationResult, setRemediationResult] = useState<any | null>(null);
  const [copiedCommand, setCopiedCommand] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    loadProbesData();
  }, []);

  const loadProbesData = async () => {
    try {
      const data = await getDiagnosticsProbes();
      setProbes(data.probes || []);
      setRemediations(data.remediations || []);
      setActiveFaults(data.active_faults || []);
      if (data.probes?.length > 0 && !selectedProbeId) {
        setSelectedProbeId(data.probes[0].id);
        setTargetInput(data.probes[0].default_parameter);
      }
    } catch (e) {
      console.error('Failed to load probes data', e);
    }
  };

  const selectedProbe = probes.find((p) => p.id === selectedProbeId) || probes[0];

  const handleSelectProbe = (probe: any) => {
    setSelectedProbeId(probe.id);
    setTargetInput(probe.default_parameter);
    setProbeResult(null);
  };

  const handleRunProbe = async () => {
    if (!selectedProbe) return;
    setLoading(true);
    setRemediationResult(null);
    try {
      const res = await executeDiagnosticProbe({
        probe_id: selectedProbe.id,
        target: targetInput,
        device_id: 'CORP-LAPTOP-042',
      });
      setProbeResult(res);
      if (res.current_device_state?.active_faults) {
        setActiveFaults(res.current_device_state.active_faults);
      }
    } catch (e) {
      console.error('Failed to execute probe', e);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyRemediation = async (remId: string) => {
    setLoading(true);
    try {
      const res = await executeRemediationAction({
        remediation_id: remId,
        device_id: 'CORP-LAPTOP-042',
      });
      setRemediationResult(res);
      setActiveFaults(res.active_faults_remaining || []);
      // Re-run the active probe to see the live fix
      await handleRunProbe();
    } catch (e) {
      console.error('Failed to apply remediation', e);
    } finally {
      setLoading(false);
    }
  };

  const handleResetEnvironment = async () => {
    setResetting(true);
    try {
      const res = await resetDiagnosticsEnvironment('CORP-LAPTOP-042');
      setActiveFaults(res.active_faults || []);
      setProbeResult(null);
      setRemediationResult(null);
      if (selectedProbe) {
        setTargetInput(selectedProbe.default_parameter);
      }
    } catch (e) {
      console.error('Failed to reset environment', e);
    } finally {
      setResetting(false);
    }
  };

  const handleCopyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCommand(true);
    setTimeout(() => setCopiedCommand(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner: Diagnostics Lab Header & Target Device */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono font-semibold uppercase tracking-wider text-blue-400 mb-1">
              <Activity className="w-4 h-4 text-blue-400" />
              <span>Interactive Diagnostic Workbench</span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-400">Live Telemetry Simulator</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              System Diagnostics & Manual Troubleshooting Lab
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Inspect real-world IT telemetry checks, understand exact terminal commands in plain English, and test live automated remediations without risking production systems.
            </p>
          </div>

          {/* Target Endpoint & Reset Button */}
          <div className="flex items-center space-x-3 bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
            <div>
              <div className="text-[10px] font-mono uppercase text-slate-500">Target Device</div>
              <div className="text-xs font-bold text-slate-200">CORP-LAPTOP-042</div>
              <div className="text-[10px] text-slate-400">Windows 11 (23H2)</div>
            </div>

            <button
              onClick={handleResetEnvironment}
              disabled={resetting || loading}
              title="Reset device to faulty state (Stale DNS, unreachable gateway)"
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition-all flex items-center space-x-1.5 active:scale-95 shadow-sm"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-blue-400 ${resetting ? 'animate-spin' : ''}`} />
              <span>Reset Faults</span>
            </button>
          </div>
        </div>

        {/* Active Fault Status Bar */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Current Endpoint Health:</span>
          {activeFaults.length > 0 ? (
            activeFaults.map((f, i) => (
              <span
                key={i}
                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-rose-500/10 border border-rose-500/30 text-rose-300"
              >
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                <span>{f}</span>
              </span>
            ))
          ) : (
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>All Systems Operational (0 Faults Detected)</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Grid: Probe Selection & Terminal Output Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Probe Catalog (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-mono font-semibold tracking-wider uppercase text-slate-400 px-1 flex items-center justify-between">
            <span>Select Diagnostic Probe</span>
            <span className="text-[11px] text-slate-500 lowercase font-sans">{probes.length} available</span>
          </div>

          <div className="space-y-2.5">
            {probes.map((probe) => {
              const isSelected = probe.id === selectedProbeId;
              return (
                <div
                  key={probe.id}
                  onClick={() => handleSelectProbe(probe)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-950/40 border-blue-500 shadow-md shadow-blue-500/10 ring-1 ring-blue-500/30'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        {probe.category}
                      </span>
                      <h3 className="text-sm font-bold text-white mt-1.5">{probe.name}</h3>
                    </div>
                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
                      {probe.risk_level}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    {probe.plain_language_meaning}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-mono truncate max-w-[220px]">
                      {probe.real_command}
                    </span>
                    <span className={`font-semibold flex items-center space-x-1 ${isSelected ? 'text-blue-400' : 'text-slate-400'}`}>
                      <span>Inspect</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Execution Console & Live Terminal (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {selectedProbe && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              {/* Probe Detail Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-800">
                <div>
                  <div className="text-[11px] font-mono text-blue-400 font-semibold uppercase">
                    Configuring Probe: {selectedProbe.category}
                  </div>
                  <h2 className="text-lg font-bold text-white mt-0.5">{selectedProbe.name}</h2>
                </div>
                <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Non-Destructive Read-Only</span>
                </div>
              </div>

              {/* Plain Language Explanation Box */}
              <div className="p-3.5 bg-blue-950/20 border border-blue-500/20 rounded-xl space-y-1">
                <div className="text-xs font-bold text-blue-300 flex items-center space-x-1.5">
                  <Info className="w-3.5 h-3.5" />
                  <span>What this check tells you in plain English:</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {selectedProbe.what_it_checks}
                </p>
              </div>

              {/* Command Preview & 1-Click Copy */}
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                  <span className="font-semibold">Exact Terminal Command (Windows PowerShell / CMD):</span>
                  <button
                    onClick={() => handleCopyCommand(selectedProbe.real_command)}
                    className="flex items-center space-x-1 text-[11px] text-blue-400 hover:text-blue-300 font-medium"
                  >
                    {copiedCommand ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCommand ? 'Copied to Clipboard' : 'Copy Command'}</span>
                  </button>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-emerald-400 flex items-center justify-between">
                  <code>{selectedProbe.real_command}</code>
                </div>
              </div>

              {/* Target Parameter Input & Quick Presets */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-300">
                  {selectedProbe.parameter_label || 'Target Parameter'}:
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={targetInput}
                    onChange={(e) => setTargetInput(e.target.value)}
                    placeholder={selectedProbe.default_parameter}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={handleRunProbe}
                    disabled={loading}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center space-x-1.5 flex-shrink-0"
                  >
                    <Play className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    <span>{loading ? 'Executing...' : 'Run Probe'}</span>
                  </button>
                </div>

                {/* Quick Parameter Presets */}
                <div className="flex items-center space-x-2 pt-1 text-[11px] text-slate-400">
                  <span className="text-slate-500">Quick Test Targets:</span>
                  <button
                    onClick={() => setTargetInput(selectedProbe.default_parameter)}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono border border-slate-700"
                  >
                    Default ({selectedProbe.default_parameter})
                  </button>
                  {selectedProbe.sample_healthy_param && (
                    <button
                      onClick={() => setTargetInput(selectedProbe.sample_healthy_param)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 text-[10px] font-mono border border-slate-700"
                    >
                      Healthy Target ({selectedProbe.sample_healthy_param})
                    </button>
                  )}
                </div>
              </div>

              {/* Probe Execution Result Screen */}
              {probeResult && (
                <div className="mt-5 space-y-4 pt-4 border-t border-slate-800 animate-fadeIn">
                  {/* Status Banner */}
                  <div
                    className={`p-3.5 rounded-xl border flex items-start space-x-3 ${
                      probeResult.is_healthy
                        ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                        : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                    }`}
                  >
                    <div className="mt-0.5">
                      {probeResult.is_healthy ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-rose-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs uppercase tracking-wider">
                          {probeResult.is_healthy ? 'Normal (Probe Passed)' : 'Fault Detected (Probe Failed)'}
                        </span>
                        <span className="text-[10px] font-mono bg-slate-900/80 px-2 py-0.5 rounded text-slate-300">
                          {probeResult.latency_ms} ms
                        </span>
                      </div>
                      <p className="text-xs mt-1 text-slate-200">
                        {probeResult.plain_language_interpretation}
                      </p>
                    </div>
                  </div>

                  {/* Raw Terminal Output Emulator */}
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
                      <span className="flex items-center space-x-1">
                        <Terminal className="w-3.5 h-3.5 text-slate-400" />
                        <span>Live Command Terminal Output</span>
                      </span>
                      <span>UTF-8 Windows Shell</span>
                    </div>
                    <pre className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-slate-300 overflow-x-auto leading-relaxed whitespace-pre-wrap selection:bg-blue-600">
                      {probeResult.raw_terminal_output}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Guided Remediations Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Wrench className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  1-Click Autonomous Remediations
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">Test how fixes repair the faults</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {remediations.map((rem) => (
                <div
                  key={rem.id}
                  className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-col justify-between space-y-2.5"
                >
                  <div>
                    <div className="text-[10px] font-mono font-semibold text-purple-400">
                      {rem.risk_level.includes('Tier-1') ? 'Tier-1 Safe' : 'Tier-2 Admin Gate'}
                    </div>
                    <h4 className="text-xs font-bold text-white mt-0.5">{rem.name}</h4>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                      {rem.plain_language_meaning}
                    </p>
                  </div>

                  <button
                    onClick={() => handleApplyRemediation(rem.id)}
                    disabled={loading}
                    className="w-full py-1.5 px-2 bg-slate-800 hover:bg-purple-600 text-slate-200 hover:text-white rounded-lg text-xs font-medium border border-slate-700/80 transition-all flex items-center justify-center space-x-1.5 active:scale-95 shadow-sm"
                  >
                    <Wrench className="w-3 h-3 text-purple-400" />
                    <span>Apply Fix</span>
                  </button>
                </div>
              ))}
            </div>

            {remediationResult && (
              <div className="p-3 bg-purple-950/30 border border-purple-500/30 rounded-xl text-xs text-purple-200 animate-fadeIn flex items-center justify-between">
                <span>Applied: <strong>{remediationResult.name}</strong> ({remediationResult.command_executed})</span>
                <span className="text-emerald-400 font-mono text-[10px]">Faults Left: {remediationResult.active_faults_remaining.length}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
