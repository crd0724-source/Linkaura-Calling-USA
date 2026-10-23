export type LeadStatus =
  | 'New'
  | 'Contacted'
  | 'Interested'
  | 'Follow-up'
  | 'Not Interested'
  | 'Converted';

export interface Contact {
  id: string;
  companyName: string;
  contactPerson: string;
  usPhoneNumber: string;
  email: string;
  website: string;
  leadStatus: LeadStatus;
  notes: string;
  createdDate: string; // ISO date string
  city?: string;
  state?: string; // US State e.g. NY, CA, TX, IL
  timeZone?: string; // ET, CT, MT, PT
  lastCalledAt?: string;
}

export type CallStatus =
  | 'idle'
  | 'requesting_mic'
  | 'dialing'
  | 'ringing'
  | 'connected'
  | 'busy'
  | 'no-answer'
  | 'ended'
  | 'failed';

export type CallRecordStatus =
  | 'Connected'
  | 'No Answer'
  | 'Busy'
  | 'Failed'
  | 'Voicemail';

export type CallOutcomeOption =
  | 'Connected - Interested'
  | 'Connected - Follow-up Needed'
  | 'Connected - Gatekeeper Reached'
  | 'Connected - Not Interested'
  | 'Left Voicemail'
  | 'No Answer'
  | 'Busy / Rejected'
  | 'Wrong Number';

export interface CallRecord {
  id: string;
  contactId?: string;
  companyName: string;
  contactPerson: string;
  phoneNumber: string;
  timestamp: string; // ISO date string
  durationSeconds: number;
  status: CallRecordStatus;
  outcome?: CallOutcomeOption | string;
  notes?: string;
  followUpDate?: string;
}

export interface WrapUpCallData {
  callRecordId: string;
  contactId?: string;
  outcome: CallOutcomeOption | string;
  notes: string;
  followUpDate?: string;
  updatedLeadStatus?: LeadStatus;
}

export interface TelephonyProviderInfo {
  id: 'mock' | 'telnyx';
  name: string;
  isConfigured: boolean;
  statusText: string;
  description: string;
}

export interface ActiveCallState {
  status: CallStatus;
  phoneNumber: string;
  contact?: Contact | null;
  durationSeconds: number;
  isMuted: boolean;
  startedAt?: Date | null;
  connectedAt?: Date | null;
  endedAt?: Date | null;
  callRecordId?: string | null;
  micPermissionGranted: boolean | null; // null = not prompted, true = granted, false = denied
}
