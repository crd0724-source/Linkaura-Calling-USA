import React, { useState, useEffect } from 'react';
import {
  PhoneCall,
  PhoneIncoming,
  PhoneMissed,
  Clock,
  ArrowUpRight,
  RotateCcw,
  Building2,
  Calendar,
} from 'lucide-react';
import { CallRecord, Contact } from '../types';
import { formatDuration, getCurrentTimezones, USTimezoneInfo } from '../utils/phoneUtils';

interface DashboardViewProps {
  stats: {
    callsToday: number;
    connectedCalls: number;
    noAnswerCalls: number;
    totalMinutesToday: number;
    totalSecondsToday: number;
    recentCalls: CallRecord[];
    totalContacts: number;
    interestedLeadsCount: number;
    conversionCount: number;
  };
  onDialNumber: (phone: string, contact?: Contact) => void;
  onOpenDialer: () => void;
  onOpenContacts: () => void;
  contacts: Contact[];
  onOpenWrapUpModal: (call: CallRecord) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  onDialNumber,
  onOpenDialer,
  onOpenContacts,
  contacts,
  onOpenWrapUpModal,
}) => {
  const [timezones, setTimezones] = useState<USTimezoneInfo[]>([]);

  useEffect(() => {
    setTimezones(getCurrentTimezones());
    const interval = setInterval(() => {
      setTimezones(getCurrentTimezones());
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const connectRate = stats.callsToday > 0
    ? Math.round((stats.connectedCalls / stats.callsToday) * 100)
    : 0;

  // Leads that need calling (Follow-up or New)
  const priorityLeads = contacts
    .filter((c) => c.leadStatus === 'Follow-up' || c.leadStatus === 'New' || c.leadStatus === 'Interested')
    .slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Page Title & Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">
            Sales Calling Dashboard
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Outbound performance metrics for US business prospects from India desk
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenContacts}
            className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors"
          >
            Manage Contacts ({contacts.length})
          </button>
          <button
            onClick={onOpenDialer}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-sm shadow-blue-500/20"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Open Browser Dialer</span>
          </button>
        </div>
      </div>

      {/* 4 Core Required MVP Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Calls Today */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Calls Today</span>
            <PhoneCall className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-slate-100">
              {stats.callsToday}
            </span>
            <span className="text-xs text-slate-500">outbound</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Target: 40 calls / day per SDR
          </div>
        </div>

        {/* Metric 2: Connected Calls */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Connected Calls</span>
            <PhoneIncoming className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-emerald-400">
              {stats.connectedCalls}
            </span>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              ({connectRate}% rate)
            </span>
          </div>
          <div className="text-[11px] text-slate-400">
            Prospects engaged on the phone
          </div>
        </div>

        {/* Metric 3: No-Answer Calls */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">No-Answer Calls</span>
            <PhoneMissed className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-amber-400">
              {stats.noAnswerCalls}
            </span>
            <span className="text-xs text-slate-500">unanswered</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Scheduled for redial retry
          </div>
        </div>

        {/* Metric 4: Total Call Minutes */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Total Call Minutes</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-slate-100">
              {stats.totalMinutesToday}
            </span>
            <span className="text-xs text-slate-500">min</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono tabular-nums">
            {formatDuration(stats.totalSecondsToday)} total talk time
          </div>
        </div>
      </div>

      {/* US Time Zones Matrix: Essential Context for Calling US Prospects from India */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              US Business Hours & Market Clocks
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Standard US business calling window is 9:00 AM – 5:00 PM local prospect time
            </p>
          </div>
          <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
            <span>Your Desk:</span>
            <strong className="text-amber-400 font-semibold">
              {timezones.find((z) => z.code === 'IST')?.timeString || 'IST'}
            </strong>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {timezones
            .filter((z) => z.code !== 'IST')
            .map((zone) => (
              <div
                key={zone.code}
                className={`p-3.5 rounded-lg border transition-colors ${
                  zone.isBusinessHours
                    ? 'bg-emerald-950/20 border-emerald-500/30'
                    : 'bg-slate-950/60 border-slate-800/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">{zone.code}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      zone.isBusinessHours
                        ? 'bg-emerald-900/60 text-emerald-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {zone.isBusinessHours ? 'Open to Call' : 'After Hours'}
                  </span>
                </div>
                <div className="text-lg font-mono tabular-nums font-bold text-slate-100 mt-1">
                  {zone.timeString}
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                  {zone.cityName}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Split Section: Recent Calls + Priority Leads to Call */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Recent Calls (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Recent Calls
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Last logged call sessions and outcomes
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              {stats.recentCalls.length} calls logged
            </span>
          </div>

          {stats.recentCalls.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No calls logged yet today. Use the browser dialer to place your first call.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {stats.recentCalls.map((call) => {
                const callDate = new Date(call.timestamp);
                const timeString = callDate.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                });

                return (
                  <div
                    key={call.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-200 truncate">
                          {call.companyName}
                        </span>
                        {call.contactPerson && (
                          <span className="text-xs text-slate-400">· {call.contactPerson}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                        <span>{call.phoneNumber}</span>
                        <span>·</span>
                        <span>{timeString}</span>
                        <span>·</span>
                        <span className="tabular-nums">
                          Duration: {formatDuration(call.durationSeconds)}
                        </span>
                      </div>
                      {call.notes && (
                        <p className="text-[11px] text-slate-400 italic line-clamp-1 mt-1">
                          "{call.notes}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded font-medium border ${
                          call.status === 'Connected'
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                            : call.status === 'No Answer'
                            ? 'bg-amber-950/60 text-amber-300 border-amber-500/30'
                            : call.status === 'Busy'
                            ? 'bg-red-950/60 text-red-300 border-red-500/30'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {call.outcome || call.status}
                      </span>

                      <button
                        onClick={() => onOpenWrapUpModal(call)}
                        className="px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition-colors"
                      >
                        Notes
                      </button>

                      <button
                        onClick={() => onDialNumber(call.phoneNumber)}
                        title="Redial"
                        className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-600/10 rounded transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Priority Follow-ups & Next Calls (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm space-y-4">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Priority Outbound Queue
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                High-priority leads awaiting calls
              </p>
            </div>
            <button
              onClick={onOpenContacts}
              className="text-xs text-blue-400 hover:underline flex items-center gap-0.5"
            >
              <span>All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-4 pt-0 space-y-2">
            {priorityLeads.map((contact) => (
              <div
                key={contact.id}
                className="p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors flex items-center justify-between gap-3 group"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-200 group-hover:text-blue-400 truncate">
                    {contact.companyName}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {contact.contactPerson} · <span className="text-blue-400">{contact.leadStatus}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {contact.usPhoneNumber} {contact.timeZone ? `(${contact.timeZone})` : ''}
                  </div>
                </div>

                <button
                  onClick={() => onDialNumber(contact.usPhoneNumber, contact)}
                  className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <PhoneCall className="w-3 h-3" />
                  <span>Dial</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
