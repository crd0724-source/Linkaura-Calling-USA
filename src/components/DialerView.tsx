import React, { useState, useEffect, useCallback } from 'react';
import {
  Phone,
  PhoneOff,
  Delete,
  Mic,
  MicOff,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Building2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { ActiveCallState, Contact } from '../types';
import { audioTelephony } from '../services/telephony/audioService';
import { formatDuration, formatUSPhone, getUSLocationFromPhone } from '../utils/phoneUtils';
import { TelephonyProvider } from '../services/telephony';

interface DialerViewProps {
  activeCall: ActiveCallState;
  onInitiateCall: (phoneNumber: string, contact?: Contact) => void;
  onHangupCall: () => void;
  onToggleMute: () => void;
  provider: TelephonyProvider;
  prefilledPhone?: string;
  prefilledContact?: Contact | null;
  onNavigateToSettings: () => void;
  allContacts: Contact[];
}

const KEYPAD_BUTTONS = [
  { digit: '1', sub: '' },
  { digit: '2', sub: 'ABC' },
  { digit: '3', sub: 'DEF' },
  { digit: '4', sub: 'GHI' },
  { digit: '5', sub: 'JKL' },
  { digit: '6', sub: 'MNO' },
  { digit: '7', sub: 'PQRS' },
  { digit: '8', sub: 'TUV' },
  { digit: '9', sub: 'WXYZ' },
  { digit: '*', sub: '' },
  { digit: '0', sub: '+' },
  { digit: '#', sub: '' },
];

export const DialerView: React.FC<DialerViewProps> = ({
  activeCall,
  onInitiateCall,
  onHangupCall,
  onToggleMute,
  provider,
  prefilledPhone,
  prefilledContact,
  onNavigateToSettings,
  allContacts,
}) => {
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [micStatus, setMicStatus] = useState<'prompt' | 'granted' | 'denied' | 'testing'>('prompt');
  const [micMessage, setMicMessage] = useState<string>('');

  const isInCall = activeCall.status !== 'idle' && activeCall.status !== 'ended';

  // Sync prefilled phone
  useEffect(() => {
    if (prefilledPhone) {
      setPhoneNumber(prefilledPhone);
    }
  }, [prefilledPhone]);

  // Match contact based on entered phone
  const matchedContact = React.useMemo(() => {
    if (prefilledContact) return prefilledContact;
    if (activeCall.contact) return activeCall.contact;
    const cleanCurrent = phoneNumber.replace(/\D/g, '');
    if (cleanCurrent.length >= 7) {
      return allContacts.find((c) => {
        const cleanC = c.usPhoneNumber.replace(/\D/g, '');
        return cleanC.endsWith(cleanCurrent.slice(-10)) || cleanCurrent.endsWith(cleanC.slice(-10));
      });
    }
    return null;
  }, [phoneNumber, prefilledContact, activeCall.contact, allContacts]);

  // Check initial mic status
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'microphone' as PermissionName })
        .then((permissionStatus) => {
          if (permissionStatus.state === 'granted') {
            setMicStatus('granted');
          } else if (permissionStatus.state === 'denied') {
            setMicStatus('denied');
          } else {
            setMicStatus('prompt');
          }

          permissionStatus.onchange = () => {
            if (permissionStatus.state === 'granted') setMicStatus('granted');
            else if (permissionStatus.state === 'denied') setMicStatus('denied');
          };
        })
        .catch(() => {
          // Fallback if query fails
        });
    }
  }, []);

  const handleTestMic = async () => {
    setMicStatus('testing');
    setMicMessage('Requesting audio input...');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMicStatus('denied');
        setMicMessage('Microphone API not supported by browser');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicStatus('granted');
      setMicMessage('Microphone access verified');
    } catch {
      setMicStatus('denied');
      setMicMessage('Microphone access blocked. Check browser address bar permissions.');
    }
  };

  const handleKeyPress = useCallback((digit: string) => {
    audioTelephony.playDTMF(digit);
    if (isInCall) {
      provider.sendDTMF(digit);
    } else {
      setPhoneNumber((prev) => {
        const rawDigits = prev.replace(/\D/g, '');
        if (rawDigits.length >= 11) return prev; // cap length
        return formatUSPhone(rawDigits + digit);
      });
    }
  }, [isInCall, provider]);

  const handleBackspace = () => {
    if (isInCall) return;
    setPhoneNumber((prev) => {
      const rawDigits = prev.replace(/\D/g, '');
      if (!rawDigits) return '';
      const updated = rawDigits.slice(0, -1);
      return formatUSPhone(updated);
    });
  };

  const handleClear = () => {
    if (isInCall) return;
    setPhoneNumber('');
  };

  // Keyboard support for typing digits
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if ('0123456789*#'.includes(e.key)) {
        e.preventDefault();
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Enter' && !isInCall && phoneNumber) {
        e.preventDefault();
        onInitiateCall(phoneNumber, matchedContact || undefined);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyPress, isInCall, phoneNumber, matchedContact, onInitiateCall]);

  const handleStartCall = () => {
    if (!phoneNumber) return;
    onInitiateCall(phoneNumber, matchedContact || undefined);
  };

  // Timezone insight for dialed number
  const locationInfo = getUSLocationFromPhone(isInCall ? activeCall.phoneNumber : phoneNumber);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-5">
      {/* 1. Prominent Provider Alert Banner: Calling provider is not configured yet */}
      {!provider.isConfigured && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-amber-300">
                Calling Provider Notice: Telnyx Not Configured (Running in Mock Simulation Mode)
              </div>
              <p className="text-amber-200/80 text-[11px] mt-0.5">
                The dialer is currently running with simulated audio and tones. To place live calls to US numbers, configure <code className="bg-amber-900/40 px-1 py-0.5 rounded text-amber-300">TELNYX_API_KEY</code> in your server environment.
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-medium whitespace-nowrap transition-colors self-start sm:self-center"
          >
            <span>View Architecture</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Column: Dialer Console (Keypad & Call Controller) */}
        <div className="md:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          {/* Active / Current Prospect Card (if contact matched or dialed) */}
          {matchedContact ? (
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-blue-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-100 truncate">
                    {matchedContact.companyName}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {matchedContact.contactPerson} · Lead: <span className="text-blue-400">{matchedContact.leadStatus}</span>
                  </div>
                </div>
              </div>
              {matchedContact.timeZone && (
                <div className="flex items-center gap-1 text-[11px] text-slate-400 shrink-0 font-mono">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span>{matchedContact.timeZone} Zone</span>
                </div>
              )}
            </div>
          ) : locationInfo ? (
            <div className="px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>US Destination: {locationInfo.state}</span>
              <span className="font-mono text-slate-300">Timezone: {locationInfo.tz}</span>
            </div>
          ) : null}

          {/* Phone Display Screen */}
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 flex flex-col justify-center items-center relative min-h-[92px]">
            {isInCall ? (
              <div className="text-center space-y-1">
                <div
                  className={`text-[11px] uppercase tracking-wider font-semibold flex items-center justify-center gap-1.5 ${
                    activeCall.status === 'failed' ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      activeCall.status === 'failed' ? 'bg-rose-400' : 'bg-emerald-400 animate-pulse'
                    }`}
                  />
                  {activeCall.status === 'connected'
                    ? 'Connected'
                    : activeCall.status === 'requesting_mic'
                    ? 'Accessing Audio...'
                    : activeCall.status === 'dialing'
                    ? 'Dialing...'
                    : activeCall.status === 'ringing'
                    ? 'Ringing...'
                    : activeCall.status === 'busy'
                    ? 'Line Busy'
                    : activeCall.status === 'no-answer'
                    ? 'No Answer'
                    : activeCall.status === 'failed'
                    ? 'Call Failed'
                    : activeCall.status === 'ended'
                    ? 'Call Ended'
                    : 'Calling...'}
                </div>
                <div className="text-xl sm:text-2xl font-mono tabular-nums font-bold text-slate-100 tracking-tight">
                  {formatDuration(activeCall.durationSeconds)}
                </div>
                <div className="text-xs font-mono text-slate-400">
                  {activeCall.phoneNumber}
                </div>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  readOnly
                  placeholder="+1 (---) --- ----"
                  value={phoneNumber}
                  className="w-full text-center bg-transparent text-xl sm:text-2xl font-mono font-semibold tracking-wide text-slate-100 placeholder-slate-600 focus:outline-none"
                />
                <div className="text-[10px] text-slate-500 mt-1">
                  Type on physical keyboard or click keypad
                </div>
              </>
            )}

            {/* Backspace / Clear button when not in call */}
            {!isInCall && phoneNumber && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  onClick={handleBackspace}
                  title="Backspace"
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  <Delete className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* Numeric Keypad Grid */}
          <div className="grid grid-cols-3 gap-2.5 max-w-xs mx-auto">
            {KEYPAD_BUTTONS.map((item) => (
              <button
                key={item.digit}
                type="button"
                onClick={() => handleKeyPress(item.digit)}
                className="h-14 rounded-xl bg-slate-950 hover:bg-slate-800 active:scale-95 border border-slate-800 hover:border-slate-700 transition-all flex flex-col items-center justify-center select-none shadow-sm group"
              >
                <span className="text-lg font-bold text-slate-200 group-hover:text-white font-mono leading-none">
                  {item.digit}
                </span>
                {item.sub ? (
                  <span className="text-[9px] text-slate-500 group-hover:text-slate-400 font-medium tracking-widest mt-0.5 leading-none">
                    {item.sub}
                  </span>
                ) : (
                  <span className="h-2" />
                )}
              </button>
            ))}
          </div>

          {/* Call Controls: Big Call / Hang Up + Mute */}
          <div className="pt-2 flex items-center justify-center gap-4">
            {isInCall ? (
              <>
                {/* Mute button */}
                <button
                  type="button"
                  onClick={onToggleMute}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                    activeCall.isMuted
                      ? 'bg-amber-600/20 text-amber-400 border border-amber-500/50'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                  title={activeCall.isMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  {activeCall.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                {/* Hang up button */}
                <button
                  type="button"
                  onClick={onHangupCall}
                  className="h-12 px-8 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 text-white font-semibold text-sm flex items-center gap-2 transition-all shadow-lg shadow-red-600/30"
                >
                  <PhoneOff className="w-5 h-5" />
                  <span>Hang Up</span>
                </button>
              </>
            ) : (
              <>
                {phoneNumber && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
                  >
                    Clear
                  </button>
                )}
                {/* Big Green Call Button */}
                <button
                  type="button"
                  onClick={handleStartCall}
                  disabled={!phoneNumber}
                  className={`h-12 px-10 rounded-full font-semibold text-sm flex items-center gap-2.5 transition-all shadow-lg ${
                    phoneNumber
                      ? 'bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white shadow-emerald-600/30 cursor-pointer'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Phone className="w-5 h-5" />
                  <span>Call US Prospect</span>
                </button>
              </>
            )}
          </div>

          {/* Mock Simulation Sandbox Controls (when in call) */}
          {isInCall && provider.isMock && (
            <div className="pt-3 border-t border-slate-800/80">
              <div className="text-[11px] text-slate-400 font-medium mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Simulation Controls (SDR Testing Mode)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeCall.status === 'ringing' && (
                  <button
                    type="button"
                    onClick={() => provider.simulateAnswer && provider.simulateAnswer()}
                    className="px-2.5 py-1 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-xs font-medium hover:bg-emerald-900/60 transition-colors"
                  >
                    Simulate Answer
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => provider.simulateNoAnswer && provider.simulateNoAnswer()}
                  className="px-2.5 py-1 rounded bg-slate-950 border border-slate-700 text-slate-300 text-xs font-medium hover:bg-slate-800 transition-colors"
                >
                  Simulate No Answer
                </button>
                <button
                  type="button"
                  onClick={() => provider.simulateBusy && provider.simulateBusy()}
                  className="px-2.5 py-1 rounded bg-slate-950 border border-slate-700 text-slate-300 text-xs font-medium hover:bg-slate-800 transition-colors"
                >
                  Simulate Busy
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Audio & Telephony Readiness Check + Quick Dial Contacts */}
        <div className="md:col-span-5 space-y-4">
          {/* Audio & Mic Health Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Device & Audio Readiness</span>
              {micStatus === 'granted' ? (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-normal">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Ready
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] text-amber-400 font-normal">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  Test Needed
                </span>
              )}
            </h3>

            <div className="text-xs text-slate-400 space-y-1">
              <div className="flex items-center justify-between">
                <span>Microphone Permission:</span>
                <span className="font-medium text-slate-200">
                  {micStatus === 'granted'
                    ? 'Granted'
                    : micStatus === 'denied'
                    ? 'Denied'
                    : 'Not Requested'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Audio Synthesizer:</span>
                <span className="text-emerald-400 font-medium">Web Audio DTMF Ready</span>
              </div>
            </div>

            {micMessage && (
              <div className="text-[11px] text-slate-400 bg-slate-950 p-2 rounded border border-slate-800">
                {micMessage}
              </div>
            )}

            <button
              type="button"
              onClick={handleTestMic}
              disabled={micStatus === 'testing'}
              className="w-full py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
            >
              {micStatus === 'testing' ? 'Testing Mic...' : 'Test Microphone Access'}
            </button>
          </div>

          {/* Quick Select Lead to Call */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Quick Select US Leads
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">
                {allContacts.length} prospects
              </span>
            </div>

            <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
              {allContacts.slice(0, 5).map((contact) => (
                <div
                  key={contact.id}
                  onClick={() => {
                    setPhoneNumber(contact.usPhoneNumber);
                  }}
                  className="p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800/80 border border-slate-800 cursor-pointer transition-colors flex items-center justify-between group"
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-medium text-slate-200 group-hover:text-blue-400 truncate">
                      {contact.companyName}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {contact.contactPerson} · {contact.usPhoneNumber}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPhoneNumber(contact.usPhoneNumber);
                      onInitiateCall(contact.usPhoneNumber, contact);
                    }}
                    className="p-1.5 rounded-md bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition-colors"
                    title="Dial now"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
