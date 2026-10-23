import React from 'react';
import {
  LayoutDashboard,
  PhoneCall,
  Users,
  History,
  Settings,
  PhoneForwarded,
  Globe,
  Radio,
} from 'lucide-react';
import { ActiveCallState } from '../types';
import { formatDuration } from '../utils/phoneUtils';

export type NavTab = 'dashboard' | 'dialer' | 'contacts' | 'history' | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  activeCall: ActiveCallState;
  providerType: 'mock' | 'telnyx';
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  activeCall,
  providerType,
}) => {
  const isCallActive = activeCall.status === 'ringing' || activeCall.status === 'connected';

  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'dialer' as NavTab, label: 'Browser Dialer', icon: PhoneCall },
    { id: 'contacts' as NavTab, label: 'Contacts & Leads', icon: Users },
    { id: 'history' as NavTab, label: 'Call History', icon: History },
    { id: 'settings' as NavTab, label: 'Provider & Setup', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-sm shadow-blue-500/20">
          <PhoneForwarded className="w-5 h-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-slate-100 text-sm tracking-tight leading-tight">
            LinkAura US Calling
          </span>
          <span className="text-[11px] text-slate-400 font-normal leading-tight">
            Simple US Business Calling
          </span>
        </div>
      </div>

      {/* Active Call Floating Alert (if in a call) */}
      {isCallActive && (
        <div
          onClick={() => onSelectTab('dialer')}
          className="mx-3 mt-3 p-3 rounded-lg bg-emerald-950/70 border border-emerald-500/30 cursor-pointer hover:bg-emerald-900/50 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-emerald-400 mb-1">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              {activeCall.status === 'connected' ? 'In Call' : 'Ringing...'}
            </span>
            <span className="font-mono tabular-nums text-slate-200">
              {formatDuration(activeCall.durationSeconds)}
            </span>
          </div>
          <div className="text-xs text-slate-200 font-medium truncate">
            {activeCall.contact?.companyName || activeCall.phoneNumber}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Click to view dialer</div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
          Sales Workspace
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
              <span className="truncate">{item.label}</span>
              {item.id === 'dialer' && isCallActive && (
                <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Desk Context & Provider Status Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/80 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            Outbound Desk
          </span>
          <span className="font-mono text-slate-300">India (IST)</span>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
          <span className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-amber-400" />
            Provider
          </span>
          <span className="text-[10px] text-amber-300/90 font-medium">
            {providerType === 'telnyx' ? 'Telnyx SIP' : 'Telnyx (Mock Mode)'}
          </span>
        </div>
      </div>
    </aside>
  );
};
