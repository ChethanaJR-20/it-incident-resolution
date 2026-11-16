export interface Employee {
  id: string;
  email: string;
  full_name: string;
  department: string;
  role: 'EMPLOYEE' | 'ADMIN';
}

export interface IncidentCreatePayload {
  employee_id: string;
  device_id: string;
  os_type: string;
  raw_description: string;
  is_emergency?: boolean;
  emergency_reason?: string;
  emergency_contact?: string;
  meeting_time?: string;
}

export interface IncidentSummary {
  id: string;
  ticket_number: string;
  employee_id: string;
  device_id: string;
  os_type: string;
  status: 'SUBMITTED' | 'CLASSIFIED' | 'INVESTIGATING' | 'AWAITING_APPROVAL' | 'REMEDIATING' | 'VERIFYING' | 'RESOLVED' | 'ESCALATED';
  current_step: string;
  is_emergency?: boolean;
  emergency_reason?: string | null;
  emergency_contact?: string | null;
  meeting_time?: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface ClassificationItem {
  category: string;
  sub_category: string;
  priority: string;
  severity: string;
  extracted_symptoms: string[];
  confidence_score: number;
}

export interface DiagnosticResultItem {
  id: string;
  tool_name: string;
  execution_stage: string;
  parameters: Record<string, any>;
  output_payload: Record<string, any>;
  outcome_status: string;
  executed_at: string;
}

export interface RemediationActionItem {
  id: string;
  tool_name: string;
  parameters: Record<string, any>;
  execution_status: string;
  output_payload: Record<string, any>;
  executed_at: string;
}

export interface ApprovalRequestItem {
  id: string;
  action_name: string;
  reasoning: string;
  risk_level: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  admin_notes?: string;
  created_at: string;
  reviewed_at?: string;
}

export interface IncidentDetail extends IncidentSummary {
  raw_description: string;
  resolution_summary?: string;
  updated_at: string;
  employee?: Employee;
  classification?: ClassificationItem;
  diagnostic_results: DiagnosticResultItem[];
  remediation_actions: RemediationActionItem[];
  approval_requests: ApprovalRequestItem[];
}

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  department: string;
  role: 'EMPLOYEE' | 'ADMIN';
  token?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  full_name: string;
  department: string;
  role: 'EMPLOYEE' | 'ADMIN';
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

