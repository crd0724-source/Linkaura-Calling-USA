import { CallOutcomeOption, CallRecord, CallRecordStatus, Contact, LeadStatus, WrapUpCallData } from '../../types';
import { getUSLocationFromPhone } from '../../utils/phoneUtils';

const STORAGE_KEY_CONTACTS = 'linkaura_contacts_v1';
const STORAGE_KEY_CALLS = 'linkaura_calls_v1';

// Seed initial realistic US prospect data for sales reps calling from India
const SEED_CONTACTS: Contact[] = [
  {
    id: 'cnt_1',
    companyName: 'Apex Cloud Solutions Inc.',
    contactPerson: 'David Miller',
    usPhoneNumber: '+1 (212) 555-0194',
    email: 'dmiller@apexcloud.io',
    website: 'https://apexcloud.io',
    leadStatus: 'Interested',
    notes: 'CTO evaluated our API integration stack. Requested a live demo on Thursday 2 PM EST.',
    city: 'New York',
    state: 'NY',
    timeZone: 'ET',
    createdDate: new Date(Date.now() - 5 * 86400000).toISOString(),
    lastCalledAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'cnt_2',
    companyName: 'Midwest Freight & Logistics',
    contactPerson: 'Sarah Jenkins',
    usPhoneNumber: '+1 (312) 555-0142',
    email: 's.jenkins@midwestfreight.com',
    website: 'https://midwestfreight.com',
    leadStatus: 'Follow-up',
    notes: 'Operations Director. Busy during peak dispatch hours. Call back after 2:30 PM CST.',
    city: 'Chicago',
    state: 'IL',
    timeZone: 'CT',
    createdDate: new Date(Date.now() - 4 * 86400000).toISOString(),
    lastCalledAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'cnt_3',
    companyName: 'Redwood Analytics Corp',
    contactPerson: 'Marcus Chen',
    usPhoneNumber: '+1 (415) 555-0188',
    email: 'marcus@redwoodanalytics.com',
    website: 'https://redwoodanalytics.com',
    leadStatus: 'Contacted',
    notes: 'Left message with executive assistant. Looking to scale outbound SDR pipeline.',
    city: 'San Francisco',
    state: 'CA',
    timeZone: 'PT',
    createdDate: new Date(Date.now() - 3 * 86400000).toISOString(),
    lastCalledAt: new Date(Date.now() - 14400000).toISOString(),
  },
  {
    id: 'cnt_4',
    companyName: 'Austin FinTech Partners',
    contactPerson: 'Elena Rodriguez',
    usPhoneNumber: '+1 (512) 555-0173',
    email: 'elena.r@austinfintech.co',
    website: 'https://austinfintech.co',
    leadStatus: 'New',
    notes: 'Inbound referral from TechConnect Expo. High-growth Series B payment gateway.',
    city: 'Austin',
    state: 'TX',
    timeZone: 'CT',
    createdDate: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'cnt_5',
    companyName: 'Summit Healthcare Systems',
    contactPerson: 'Dr. Gregory Vance',
    usPhoneNumber: '+1 (303) 555-0165',
    email: 'gvance@summithealthsys.org',
    website: 'https://summithealthsys.org',
    leadStatus: 'New',
    notes: 'VP of Patient Services. Need HIPAA-compliant communication workflow.',
    city: 'Denver',
    state: 'CO',
    timeZone: 'MT',
    createdDate: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 'cnt_6',
    companyName: 'Beacon Biomedical Labs',
    contactPerson: 'Dr. Katherine Price',
    usPhoneNumber: '+1 (617) 555-0129',
    email: 'kprice@beaconbiolabs.com',
    website: 'https://beaconbiolabs.com',
    leadStatus: 'Converted',
    notes: 'Signed 12-month pilot contract for offshore engineering support.',
    city: 'Boston',
    state: 'MA',
    timeZone: 'ET',
    createdDate: new Date(Date.now() - 10 * 86400000).toISOString(),
    lastCalledAt: new Date(Date.now() - 48 * 3600000).toISOString(),
  },
  {
    id: 'cnt_7',
    companyName: 'Pacific Rim Imports',
    contactPerson: 'Thomas Wright',
    usPhoneNumber: '+1 (206) 555-0111',
    email: 'twright@pacrimimports.com',
    website: 'https://pacrimimports.com',
    leadStatus: 'Not Interested',
    notes: 'Currently locked into a 3-year vendor agreement until late 2027.',
    city: 'Seattle',
    state: 'WA',
    timeZone: 'PT',
    createdDate: new Date(Date.now() - 6 * 86400000).toISOString(),
    lastCalledAt: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
];

// Seed recent calls
const SEED_CALLS: CallRecord[] = [
  {
    id: 'call_1',
    contactId: 'cnt_1',
    companyName: 'Apex Cloud Solutions Inc.',
    contactPerson: 'David Miller',
    phoneNumber: '+1 (212) 555-0194',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    durationSeconds: 284,
    status: 'Connected',
    outcome: 'Connected - Interested',
    notes: 'Very receptive. Walked through tech stack and pricing. Scheduled demo for Thursday 2 PM EST.',
    followUpDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 16),
  },
  {
    id: 'call_2',
    contactId: 'cnt_2',
    companyName: 'Midwest Freight & Logistics',
    contactPerson: 'Sarah Jenkins',
    phoneNumber: '+1 (312) 555-0142',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    durationSeconds: 152,
    status: 'Connected',
    outcome: 'Connected - Follow-up Needed',
    notes: 'Busy with warehouse floor meeting. Asked to call back this afternoon around 2:30 PM CST.',
    followUpDate: new Date(Date.now() + 4 * 3600000).toISOString().slice(0, 16),
  },
  {
    id: 'call_3',
    contactId: 'cnt_3',
    companyName: 'Redwood Analytics Corp',
    contactPerson: 'Marcus Chen',
    phoneNumber: '+1 (415) 555-0188',
    timestamp: new Date(Date.now() - 14400000).toISOString(),
    durationSeconds: 45,
    status: 'Connected',
    outcome: 'Connected - Gatekeeper Reached',
    notes: 'Spoke with Marcus’s executive assistant Clara. Left pitch overview and requested direct calendar invite.',
  },
  {
    id: 'call_4',
    contactId: undefined,
    companyName: 'Nexus Global Supply',
    contactPerson: 'Robert Hall',
    phoneNumber: '+1 (704) 555-0133',
    timestamp: new Date(Date.now() - 18000000).toISOString(),
    durationSeconds: 0,
    status: 'No Answer',
    outcome: 'No Answer',
    notes: 'Rang 5 times, prospect did not pick up. Will retry tomorrow morning.',
  },
  {
    id: 'call_5',
    contactId: undefined,
    companyName: 'Pinnacle Systems',
    contactPerson: 'Unknown',
    phoneNumber: '+1 (480) 555-0158',
    timestamp: new Date(Date.now() - 25200000).toISOString(),
    durationSeconds: 0,
    status: 'Busy',
    outcome: 'Busy / Rejected',
    notes: 'Fast busy signal received.',
  },
];

class DatabaseService {
  private contacts: Contact[] = [];
  private calls: CallRecord[] = [];
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private init() {
    if (this.isInitialized) return;

    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      this.contacts = [...SEED_CONTACTS];
      this.calls = [...SEED_CALLS];
      this.isInitialized = true;
      return;
    }

    try {
      const storedContacts = localStorage.getItem(STORAGE_KEY_CONTACTS);
      if (storedContacts) {
        this.contacts = JSON.parse(storedContacts);
      } else {
        this.contacts = [...SEED_CONTACTS];
        this.saveContactsToStorage();
      }

      const storedCalls = localStorage.getItem(STORAGE_KEY_CALLS);
      if (storedCalls) {
        this.calls = JSON.parse(storedCalls);
      } else {
        this.calls = [...SEED_CALLS];
        this.saveCallsToStorage();
      }

      this.isInitialized = true;
    } catch (e) {
      console.warn('LocalStorage error, falling back to in-memory state:', e);
      this.contacts = [...SEED_CONTACTS];
      this.calls = [...SEED_CALLS];
      this.isInitialized = true;
    }
  }

  private saveContactsToStorage() {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_CONTACTS, JSON.stringify(this.contacts));
    } catch (e) {
      console.error('Error saving contacts to localStorage:', e);
    }
  }

  private saveCallsToStorage() {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_CALLS, JSON.stringify(this.calls));
    } catch (e) {
      console.error('Error saving calls to localStorage:', e);
    }
  }

  // --- Contacts Operations ---
  getContacts(): Contact[] {
    return [...this.contacts];
  }

  getContactById(id: string): Contact | undefined {
    return this.contacts.find((c) => c.id === id);
  }

  findContactByPhone(phone: string): Contact | undefined {
    const cleanTarget = phone.replace(/\D/g, '');
    return this.contacts.find((c) => {
      const cleanC = c.usPhoneNumber.replace(/\D/g, '');
      return cleanC.endsWith(cleanTarget.slice(-10)) || cleanTarget.endsWith(cleanC.slice(-10));
    });
  }

  saveContact(contactData: Omit<Contact, 'id' | 'createdDate'> & { id?: string }): Contact {
    const now = new Date().toISOString();
    
    // Auto infer state & timezone from US phone number if not supplied
    const location = getUSLocationFromPhone(contactData.usPhoneNumber);
    const resolvedState = contactData.state || location?.state || '';
    const resolvedTz = contactData.timeZone || location?.tz || '';

    if (contactData.id) {
      const index = this.contacts.findIndex((c) => c.id === contactData.id);
      if (index !== -1) {
        const updated: Contact = {
          ...this.contacts[index],
          ...contactData,
          state: resolvedState || this.contacts[index].state,
          timeZone: resolvedTz || this.contacts[index].timeZone,
        };
        this.contacts[index] = updated;
        this.saveContactsToStorage();
        return updated;
      }
    }

    const newContact: Contact = {
      ...contactData,
      id: `cnt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdDate: now,
      state: resolvedState,
      timeZone: resolvedTz,
    };

    this.contacts.unshift(newContact);
    this.saveContactsToStorage();
    return newContact;
  }

  updateContactLeadStatus(id: string, newStatus: LeadStatus): Contact | undefined {
    const contact = this.contacts.find((c) => c.id === id);
    if (contact) {
      contact.leadStatus = newStatus;
      contact.lastCalledAt = new Date().toISOString();
      this.saveContactsToStorage();
    }
    return contact;
  }

  deleteContact(id: string): boolean {
    const initialLen = this.contacts.length;
    this.contacts = this.contacts.filter((c) => c.id !== id);
    const removed = this.contacts.length < initialLen;
    if (removed) {
      this.saveContactsToStorage();
    }
    return removed;
  }

  // --- Calls Operations ---
  getCalls(): CallRecord[] {
    return [...this.calls].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  getCallById(id: string): CallRecord | undefined {
    return this.calls.find((c) => c.id === id);
  }

  logCall(record: Omit<CallRecord, 'id'>): CallRecord {
    const newRecord: CallRecord = {
      ...record,
      id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };

    this.calls.unshift(newRecord);
    this.saveCallsToStorage();

    // If contact exists, mark last called at
    if (newRecord.contactId) {
      const contact = this.contacts.find((c) => c.id === newRecord.contactId);
      if (contact) {
        contact.lastCalledAt = newRecord.timestamp;
        this.saveContactsToStorage();
      }
    }

    return newRecord;
  }

  saveCallWrapUp(data: WrapUpCallData): CallRecord | undefined {
    const call = this.calls.find((c) => c.id === data.callRecordId);
    if (!call) return undefined;

    call.outcome = data.outcome;
    call.notes = data.notes;
    if (data.followUpDate) {
      call.followUpDate = data.followUpDate;
    }

    this.saveCallsToStorage();

    // Also sync to Contact
    let contact: Contact | undefined;
    if (data.contactId) {
      contact = this.contacts.find((c) => c.id === data.contactId);
    }
    if (!contact && call.contactId) {
      contact = this.contacts.find((c) => c.id === call.contactId);
    }
    if (!contact && call.phoneNumber) {
      contact = this.findContactByPhone(call.phoneNumber);
    }

    if (contact) {
      if (data.updatedLeadStatus) {
        contact.leadStatus = data.updatedLeadStatus;
      }
      if (data.notes) {
        const timestamp = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        contact.notes = `[${timestamp} Call]: ${data.notes}\n\n${contact.notes || ''}`.trim();
      }
      contact.lastCalledAt = new Date().toISOString();
      this.saveContactsToStorage();
    }

    return call;
  }

  deleteCall(id: string): boolean {
    const initialLen = this.calls.length;
    this.calls = this.calls.filter((c) => c.id !== id);
    const removed = this.calls.length < initialLen;
    if (removed) {
      this.saveCallsToStorage();
    }
    return removed;
  }

  // --- Dashboard Aggregations ---
  getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const callsToday = this.calls.filter((c) => new Date(c.timestamp) >= today);

    const totalCallsTodayCount = callsToday.length;
    const connectedTodayCount = callsToday.filter((c) => c.status === 'Connected').length;
    const noAnswerTodayCount = callsToday.filter((c) => c.status === 'No Answer').length;
    
    // Total call seconds today converted to minutes rounded
    const totalSecondsToday = callsToday.reduce((acc, c) => acc + (c.durationSeconds || 0), 0);
    const totalMinutesToday = (totalSecondsToday / 60).toFixed(1);

    const sortedCalls = [...this.calls].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const recentCalls = sortedCalls.slice(0, 8);

    return {
      callsToday: totalCallsTodayCount,
      connectedCalls: connectedTodayCount,
      noAnswerCalls: noAnswerTodayCount,
      totalMinutesToday: Number(totalMinutesToday),
      totalSecondsToday,
      recentCalls,
      totalContacts: this.contacts.length,
      interestedLeadsCount: this.contacts.filter((c) => c.leadStatus === 'Interested' || c.leadStatus === 'Follow-up').length,
      conversionCount: this.contacts.filter((c) => c.leadStatus === 'Converted').length,
    };
  }

  resetDemoData() {
    this.contacts = [...SEED_CONTACTS];
    this.calls = [...SEED_CALLS];
    this.saveContactsToStorage();
    this.saveCallsToStorage();
  }

  /**
   * Supabase ready SQL schema generator
   * Allows developer or admin to copy-paste directly into Supabase SQL editor
   */
  getSupabaseSchemaSql(): string {
    return `-- =========================================================
-- LinkAura US Calling — Supabase Production Database Schema
-- =========================================================

-- 1. Create Contacts Table
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    contact_person TEXT NOT NULL,
    us_phone_number TEXT NOT NULL,
    email TEXT,
    website TEXT,
    lead_status TEXT NOT NULL CHECK (lead_status IN ('New', 'Contacted', 'Interested', 'Follow-up', 'Not Interested', 'Converted')),
    notes TEXT,
    city TEXT,
    state TEXT,
    timezone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_called_at TIMESTAMPTZ
);

-- Index for instant phone number & status lookups
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON public.contacts(us_phone_number);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON public.contacts(lead_status);

-- 2. Create Calls Table
CREATE TABLE IF NOT EXISTS public.calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    company_name TEXT NOT NULL,
    contact_person TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    duration_seconds INTEGER DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('Connected', 'No Answer', 'Busy', 'Failed', 'Voicemail')),
    outcome TEXT,
    notes TEXT,
    follow_up_date TIMESTAMPTZ
);

-- Index for call timestamp and contact lookup
CREATE INDEX IF NOT EXISTS idx_calls_timestamp ON public.calls(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_calls_contact ON public.calls(contact_id);

-- 3. Row Level Security (RLS) Setup
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

-- Enable authenticated users or anon API client read/write
CREATE POLICY "Allow anon and authenticated read/write contacts" ON public.contacts
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon and authenticated read/write calls" ON public.calls
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
`;
  }
}

export const dbService = new DatabaseService();
