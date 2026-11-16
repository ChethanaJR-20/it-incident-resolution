import { IncidentCreatePayload, IncidentDetail, IncidentSummary } from '../types';

const API_BASE_URL = '/api/v1';

export async function submitIncident(payload: IncidentCreatePayload, autoTriage = true): Promise<IncidentDetail> {
  const shouldAutoTriage = payload.is_emergency ? false : autoTriage;
  const url = `${API_BASE_URL}/incidents/?auto_triage=${shouldAutoTriage}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errorData = await response.json();
      errorDetail = errorData.detail?.[0]?.msg || errorData.detail || '';
    } catch {
      // Not JSON - response is from Vite proxy or HTML error
      errorDetail = '';
    }

    if (!errorDetail || response.status === 502 || response.status === 503 || response.status === 504 || (response.status === 500 && !errorDetail)) {
      throw new Error(
        'Backend server (FastAPI on port 8000) is offline or stopped. Please double-click run_all.bat in your project folder to keep both servers running.'
      );
    }

    throw new Error(errorDetail || `Submission error (HTTP ${response.status})`);
  }

  return response.json();
}

export async function getIncident(ticketNumber: string): Promise<IncidentDetail> {
  const response = await fetch(`${API_BASE_URL}/incidents/${ticketNumber}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch incident ${ticketNumber}`);
  }
  return response.json();
}

export async function triggerTriage(ticketNumber: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/incidents/${ticketNumber}/triage`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error(`Failed to trigger AI triage for ${ticketNumber}`);
  }
  return response.json();
}

export async function triggerEmergencyFastTrack(
  ticketNumber: string,
  payload: { emergency_reason: string; emergency_contact?: string; meeting_time?: string }
): Promise<IncidentDetail> {
  const response = await fetch(`${API_BASE_URL}/incidents/${ticketNumber}/emergency-fast-track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Failed to activate emergency fast-track for ${ticketNumber}`);
  }
  return response.json();
}

export async function runDiagnostics(ticketNumber: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/incidents/${ticketNumber}/diagnose`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error(`Diagnostic execution failed for ${ticketNumber}`);
  }
  return response.json();
}

export async function escalateIncident(ticketNumber: string, reason: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/incidents/${ticketNumber}/escalate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  if (!response.ok) {
    throw new Error('Failed to escalate incident');
  }
  return response.json();
}

export async function listPendingApprovals(): Promise<any[]> {
  const response = await fetch(`${API_BASE_URL}/approvals/pending`);
  if (!response.ok) {
    throw new Error('Failed to fetch pending approvals');
  }
  return response.json();
}

export async function submitApprovalDecision(approvalId: string, decision: 'APPROVED' | 'REJECTED', adminNotes?: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/approvals/${approvalId}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      decision,
      admin_notes: adminNotes || 'Authorized via Enterprise Dashboard',
    }),
  });
  if (!response.ok) {
    throw new Error('Approval decision submission failed');
  }
  return response.json();
}

export async function resetSimulation(): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/simulation/reset`, { method: 'POST' });
  return response.json();
}

export async function getRunbook(category: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/runbooks/${encodeURIComponent(category)}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch runbook for category ${category}`);
  }
  return response.json();
}

export async function listIncidents(status?: string): Promise<IncidentSummary[]> {
  const url = status ? `${API_BASE_URL}/incidents/?status=${encodeURIComponent(status)}` : `${API_BASE_URL}/incidents/`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to list incidents');
  }
  return response.json();
}

export async function getDashboardMetrics(): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/dashboard/metrics`);
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard metrics');
  }
  return response.json();
}

export async function getAuditLogs(actorType?: string, limit = 100): Promise<any[]> {
  const url = actorType
    ? `${API_BASE_URL}/dashboard/audit-logs?actor_type=${actorType}&limit=${limit}`
    : `${API_BASE_URL}/dashboard/audit-logs?limit=${limit}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch audit logs');
  }
  return response.json();
}

export async function getEscalations(): Promise<any[]> {
  const response = await fetch(`${API_BASE_URL}/dashboard/escalations`);
  if (!response.ok) {
    throw new Error('Failed to fetch escalations');
  }
  return response.json();
}

export async function autoResolveIncident(ticketNumber: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/incidents/${ticketNumber}/auto-resolve`, { method: 'POST' });
  if (!response.ok) {
    throw new Error(`Auto-resolve failed for ${ticketNumber}`);
  }
  return response.json();
}

export async function batchAutoResolve(): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/incidents/batch-auto-resolve`, { method: 'POST' });
  if (!response.ok) {
    throw new Error('Batch auto-resolve failed');
  }
  return response.json();
}

export async function sendCopilotMessage(message: string, history: any[] = []): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/copilot/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history, device_id: 'CORP-LAPTOP-042' }),
  });
  if (!response.ok) {
    throw new Error('Failed to communicate with AI Copilot');
  }
  return response.json();
}

export async function runQuickCopilotDiagnosis(deviceId = 'CORP-LAPTOP-042'): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/copilot/diagnose-quick?device_id=${encodeURIComponent(deviceId)}`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Failed to run quick laptop diagnosis');
  }
  return response.json();
}

export async function loginUser(credentials: { email: string; password: string }): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  if (!response.ok) {
    let detail = 'Invalid email or password.';
    try {
      const data = await response.json();
      detail = data.detail || detail;
    } catch {}
    throw new Error(detail);
  }
  return response.json();
}

export async function registerUser(credentials: {
  email: string;
  password: string;
  full_name: string;
  department?: string;
  role: 'EMPLOYEE' | 'ADMIN';
}): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  if (!response.ok) {
    let detail = 'Registration failed.';
    try {
      const data = await response.json();
      detail = data.detail || detail;
    } catch {}
    throw new Error(detail);
  }
  return response.json();
}

export async function getDemoAccounts(): Promise<any[]> {
  const response = await fetch(`${API_BASE_URL}/auth/demo-accounts`);
  if (!response.ok) {
    return [];
  }
  return response.json();
}
