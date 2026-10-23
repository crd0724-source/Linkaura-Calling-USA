import React, { useState, useEffect } from 'react';
import { PhoneCall, Clock } from 'lucide-react';
import { getCurrentTimezones, USTimezoneInfo } from '../utils/phoneUtils';
import { NavTab } from './Sidebar';

interface TopHeaderProps {
  currentTab: NavTab;
  onOpenDialer: () => void;
  onOpenNewContact?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentTab,
  onOpenDialer,
  onOpenNewContact,
}) => {
  const [timezones, setTimezones] = useState<USTimezoneInfo[]>([]);

  useEffect(() => {
    setTimezones(getCurrentTimezones());
    const interval = setInterval(() => {
      setTimezones(getCurrentTimezones());
    }, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const getBreadcrumb = () => {
    switch (currentTab) {
      case 'dashboard':
        return 'LinkAura / Sales Dashboard';
      case 'dialer':
        return 'LinkAura / Browser Dialer';
      case 'contacts':
        return 'LinkAura / US Business Contacts';
      case 'history':
        return 'LinkAura / Call History Logs';
      case 'settings':
        return 'LinkAura / Telephony & DB Architecture';
      default:
        return 'LinkAura / US Calling';
    }
  };

  return (
    <header className="h-16 px-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-8 shrink-0 backdrop-blur-md">
      {/* Zone 1: Breadcrumb & Title */}
      <div className="flex items-center gap-3 shrink-0">
        <h1 className="text-sm font-semibold text-slate-200 tracking-tight whitespace-nowrap">
          {getBreadcrumb()}
        </h1>
      </div>

      {/* Zone 2: US Business Hours Clocks Strip (Crucial for reps calling US from India) */}
      <div className="hidden lg:flex items-center gap-4 py-1.5 px-3 rounded-lg bg-slate-950/70 border border-slate-800 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400 font-medium shrink-0">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[11px] text-slate-400">Market Times:</span>
        </div>

        {timezones.map((tz) => {
          const isIndia = tz.code === 'IST';
          return (
            <div key={tz.code} className="flex items-center gap-1.5 whitespace-nowrap">
              <span className={`text-[10px] font-medium ${isIndia ? 'text-amber-400' : 'text-slate-400'}`}>
                {tz.code}:
              </span>
              <span className="font-mono tabular-nums text-slate-200 text-xs font-semibold">
                {tz.timeString}
              </span>
              {!isIndia && (
                <span
                  title={tz.isBusinessHours ? 'Business hours (9 AM - 5 PM)' : 'Outside standard business hours'}
                  className={`text-[9px] px-1 py-0.2 rounded font-medium ${
                    tz.isBusinessHours
                      ? 'text-emerald-400 bg-emerald-950/60'
                      : 'text-slate-500 bg-slate-900'
                  }`}
                >
                  {tz.isBusinessHours ? 'Open' : 'Off'}
                </span>
              )}
              {tz.code !== 'PT' && <span className="text-slate-700 ml-1">·</span>}
            </div>
          );
        })}
      </div>

      {/* Zone 3: Primary Action CTA */}
      <div className="flex items-center gap-3 shrink-0">
        {currentTab === 'contacts' && onOpenNewContact ? (
          <button
            onClick={onOpenNewContact}
            className="px-3.5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap shadow-sm shadow-blue-500/20"
          >
            + Add Contact
          </button>
        ) : (
          <button
            onClick={onOpenDialer}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap shadow-sm shadow-blue-500/20"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Open Keypad Dialer</span>
          </button>
        )}
      </div>
    </header>
  );
};
