import React, { useState, useEffect, useRef } from 'react';
import { ActiveCallState, CallRecord, Contact, WrapUpCallData } from './types';
import { dbService } from './services/storage/dbService';
import { getTelephonyProvider, getCurrentProviderType } from './services/telephony';
import { Sidebar, NavTab } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { DashboardView } from './components/DashboardView';
import { DialerView } from './components/DialerView';
import { ContactsView } from './components/ContactsView';
import { CallHistoryView } from './components/CallHistoryView';
import { SettingsView } from './components/SettingsView';
import { CallWrapUpModal } from './components/CallWrapUpModal';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [providerType, setProviderType] = useState<'mock' | 'telnyx'>(getCurrentProviderType());
  const provider = getTelephonyProvider(providerType);

  // Database Data States
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [dashboardStats, setDashboardStats] = useState(dbService.getDashboardStats());

  // Dialer Pre-fill State
  const [prefilledPhone, setPrefilledPhone] = useState<string>('');
  const [prefilledContact, setPrefilledContact] = useState<Contact | null>(null);
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);

  // Active Call State
  const [activeCall, setActiveCall] = useState<ActiveCallState>({
    status: 'idle',
    phoneNumber: '',
    contact: null,
    durationSeconds: 0,
    isMuted: false,
    startedAt: null,
    connectedAt: null,
    endedAt: null,
    callRecordId: null,
    micPermissionGranted: null,
  });

  // Call Wrap-Up Modal State
  const [wrapUpCallRecord, setWrapUpCallRecord] = useState<CallRecord | null>(null);
  const [wrapUpContact, setWrapUpContact] = useState<Contact | null>(null);

  const durationTimerRef = useRef<number | null>(null);
  const activeCallRef = useRef<ActiveCallState>(activeCall);
  activeCallRef.current = activeCall;
  const isFinishingCallRef = useRef(false);

  // Load initial database data
  const refreshData = () => {
    setContacts(dbService.getContacts());
    setCalls(dbService.getCalls());
    setDashboardStats(dbService.getDashboardStats());
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Listen to Telephony Provider Status Changes
  useEffect(() => {
    const unsubscribe = provider.onStatusChange((status, message) => {
      setActiveCall((prev) => {
        const updated = { ...prev, status };

        if (status === 'connected') {
          updated.connectedAt = new Date();
        } else if (status === 'ended' || status === 'busy' || status === 'no-answer') {
          updated.endedAt = new Date();
        }

        return updated;
      });

      // If call finished, handle call logging and wrap-up
      if (status === 'ended' || status === 'busy' || status === 'no-answer') {
        handleCallFinished(status, message);
      } else if (status === 'failed') {
        setTimeout(() => {
          setActiveCall((prev) =>
            prev.status === 'failed'
              ? {
                  status: 'idle',
                  phoneNumber: '',
                  contact: null,
                  durationSeconds: 0,
                  isMuted: false,
                  startedAt: null,
                  connectedAt: null,
                  endedAt: null,
                  callRecordId: null,
                  micPermissionGranted: null,
                }
              : prev
          );
        }, 3500);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [provider]);

  // Duration Timer for Connected Call
  useEffect(() => {
    if (activeCall.status === 'connected') {
      durationTimerRef.current = window.setInterval(() => {
        setActiveCall((prev) => ({
          ...prev,
          durationSeconds: prev.durationSeconds + 1,
        }));
      }, 1000);
    } else {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    }

    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    };
  }, [activeCall.status]);

  // Handle Call Termination & Wrap-up Trigger
  const handleCallFinished = (status: string, message?: string) => {
    const current = activeCallRef.current;
    if (!current.phoneNumber || isFinishingCallRef.current) return;
    isFinishingCallRef.current = true;

    const duration = current.durationSeconds;
    const callStatus: CallRecord['status'] =
      duration > 0
        ? 'Connected'
        : status === 'busy'
        ? 'Busy'
        : status === 'no-answer'
        ? 'No Answer'
        : 'No Answer';

    const initialOutcome =
      callStatus === 'Connected'
        ? 'Connected - Interested'
        : callStatus === 'No Answer'
        ? 'No Answer'
        : callStatus === 'Busy'
        ? 'Busy / Rejected'
        : 'No Answer';

    // Log call to storage
    const record = dbService.logCall({
      contactId: current.contact?.id,
      companyName: current.contact?.companyName || 'US Prospect',
      contactPerson: current.contact?.contactPerson || 'Prospect',
      phoneNumber: current.phoneNumber,
      timestamp: (current.startedAt || new Date()).toISOString(),
      durationSeconds: duration,
      status: callStatus,
      outcome: initialOutcome,
      notes: message || '',
    });

    refreshData();

    setActiveCall({
      status: 'idle',
      phoneNumber: '',
      contact: null,
      durationSeconds: 0,
      isMuted: false,
      startedAt: null,
      connectedAt: null,
      endedAt: null,
      callRecordId: null,
      micPermissionGranted: null,
    });

    const targetContact =
      current.contact ||
      (record.contactId ? dbService.getContactById(record.contactId) : null) ||
      dbService.findContactByPhone(record.phoneNumber) ||
      null;

    setWrapUpCallRecord(record);
    setWrapUpContact(targetContact);

    setTimeout(() => {
      isFinishingCallRef.current = false;
    }, 200);
  };

  // Initiate call
  const handleInitiateCall = async (phoneNumber: string, contact?: Contact) => {
    // If not supplied, try matching contact
    const resolvedContact = contact || dbService.findContactByPhone(phoneNumber) || null;

    setActiveCall({
      status: 'requesting_mic',
      phoneNumber,
      contact: resolvedContact,
      durationSeconds: 0,
      isMuted: false,
      startedAt: new Date(),
      connectedAt: null,
      endedAt: null,
      callRecordId: null,
      micPermissionGranted: null,
    });

    setCurrentTab('dialer');
    await provider.initiateCall(phoneNumber);
  };

  // Hangup call
  const handleHangupCall = async () => {
    await provider.hangupCall();
  };

  // Toggle Mute
  const handleToggleMute = () => {
    setActiveCall((prev) => {
      const nextMute = !prev.isMuted;
      provider.setMuted(nextMute);
      return { ...prev, isMuted: nextMute };
    });
  };

  // Click-to-dial shortcut from any view
  const handleDialFromExternal = (phoneNumber: string, contact?: Contact) => {
    setPrefilledPhone(phoneNumber);
    setPrefilledContact(contact || null);
    setCurrentTab('dialer');
    handleInitiateCall(phoneNumber, contact);
  };

  // Save Call Wrap-Up Notes
  const handleSaveWrapUp = (data: WrapUpCallData) => {
    dbService.saveCallWrapUp(data);
    setWrapUpCallRecord(null);
    setWrapUpContact(null);
    refreshData();
  };

  // Save / Edit Contact
  const handleSaveContact = (contactData: Omit<Contact, 'id' | 'createdDate'> & { id?: string }) => {
    dbService.saveContact(contactData);
    refreshData();
  };

  // Delete Contact
  const handleDeleteContact = (id: string) => {
    dbService.deleteContact(id);
    refreshData();
  };

  // Delete Call Record
  const handleDeleteCall = (id: string) => {
    dbService.deleteCall(id);
    refreshData();
  };

  // Switch Provider
  const handleSwitchProvider = (type: 'mock' | 'telnyx') => {
    setProviderType(type);
    getTelephonyProvider(type);
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans antialiased overflow-hidden select-none">
      {/* Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        activeCall={activeCall}
        providerType={providerType}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-950">
        {/* Top Header */}
        <TopHeader
          currentTab={currentTab}
          onOpenDialer={() => {
            setCurrentTab('dialer');
          }}
          onOpenNewContact={() => setIsAddContactModalOpen(true)}
        />

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto">
          {currentTab === 'dashboard' && (
            <DashboardView
              stats={dashboardStats}
              onDialNumber={handleDialFromExternal}
              onOpenDialer={() => setCurrentTab('dialer')}
              onOpenContacts={() => setCurrentTab('contacts')}
              contacts={contacts}
              onOpenWrapUpModal={(call) => {
                setWrapUpCallRecord(call);
                const linkedContact = call.contactId ? dbService.getContactById(call.contactId) : null;
                setWrapUpContact(linkedContact || null);
              }}
            />
          )}

          {currentTab === 'dialer' && (
            <DialerView
              activeCall={activeCall}
              onInitiateCall={handleInitiateCall}
              onHangupCall={handleHangupCall}
              onToggleMute={handleToggleMute}
              provider={provider}
              prefilledPhone={prefilledPhone}
              prefilledContact={prefilledContact}
              onNavigateToSettings={() => setCurrentTab('settings')}
              allContacts={contacts}
            />
          )}

          {currentTab === 'contacts' && (
            <ContactsView
              contacts={contacts}
              onDialNumber={handleDialFromExternal}
              onSaveContact={handleSaveContact}
              onDeleteContact={handleDeleteContact}
              isAddModalOpen={isAddContactModalOpen}
              setIsAddModalOpen={setIsAddContactModalOpen}
            />
          )}

          {currentTab === 'history' && (
            <CallHistoryView
              calls={calls}
              onDialNumber={handleDialFromExternal}
              onOpenWrapUpModal={(call) => {
                setWrapUpCallRecord(call);
                const linkedContact = call.contactId
                  ? dbService.getContactById(call.contactId)
                  : dbService.findContactByPhone(call.phoneNumber);
                setWrapUpContact(linkedContact || null);
              }}
              onDeleteCall={handleDeleteCall}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              provider={provider}
              onSwitchProvider={handleSwitchProvider}
              onDataReset={refreshData}
            />
          )}
        </main>
      </div>

      {/* Call Wrap-up Post-Call Modal */}
      {wrapUpCallRecord && (
        <CallWrapUpModal
          key={wrapUpCallRecord.id}
          callRecord={wrapUpCallRecord}
          contact={wrapUpContact}
          onSave={handleSaveWrapUp}
          onDismiss={() => {
            setWrapUpCallRecord(null);
            setWrapUpContact(null);
          }}
        />
      )}
    </div>
  );
}
