import React, { useState } from 'react';
import {
  History,
  Search,
  Download,
  RotateCcw,
  MessageSquare,
  Trash2,
  Calendar,
  Building2,
  Phone,
  Clock,
} from 'lucide-react';
import { CallRecord, CallRecordStatus } from '../types';
import { formatDuration } from '../utils/phoneUtils';

interface CallHistoryViewProps {
  calls: CallRecord[];
  onDialNumber: (phone: string) => void;
  onOpenWrapUpModal: (call: CallRecord) => void;
  onDeleteCall: (id: string) => void;
}

export const CallHistoryView: React.FC<CallHistoryViewProps> = ({
  calls,
  onDialNumber,
  onOpenWrapUpModal,
  onDeleteCall,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CallRecordStatus | 'ALL'>('ALL');

  const filteredCalls = calls.filter((call) => {
    const matchesStatus = statusFilter === 'ALL' || call.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      call.companyName.toLowerCase().includes(q) ||
      call.contactPerson.toLowerCase().includes(q) ||
      call.phoneNumber.includes(q) ||
      (call.notes && call.notes.toLowerCase().includes(q)) ||
      (call.outcome && call.outcome.toLowerCase().includes(q));

    return matchesStatus && matchesSearch;
  });

  const exportCSV = () => {
    if (calls.length === 0) return;
    const headers = ['Date', 'Company', 'Contact Person', 'Phone Number', 'Duration (Seconds)', 'Status', 'Outcome', 'Notes', 'Follow-up Date'];
    const rows = filteredCalls.map((c) => [
      `"${new Date(c.timestamp).toISOString()}"`,
      `"${c.companyName.replace(/"/g, '""')}"`,
      `"${c.contactPerson.replace(/"/g, '""')}"`,
      `"${c.phoneNumber}"`,
      c.durationSeconds,
      `"${c.status}"`,
      `"${(c.outcome || '').replace(/"/g, '""')}"`,
      `"${(c.notes || '').replace(/"/g, '""')}"`,
      `"${c.followUpDate || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `LinkAura_Call_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: CallRecordStatus) => {
    switch (status) {
      case 'Connected':
        return 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30';
      case 'No Answer':
        return 'bg-amber-950/60 text-amber-300 border-amber-500/30';
      case 'Busy':
        return 'bg-red-950/60 text-red-300 border-red-500/30';
      case 'Voicemail':
        return 'bg-blue-950/60 text-blue-300 border-blue-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">
            Outbound Call History
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Complete audit trail of sales calls, durations, recorded outcomes, and follow-ups
          </p>
        </div>

        <button
          onClick={exportCSV}
          disabled={filteredCalls.length === 0}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-200 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors self-start sm:self-auto disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Call Logs (CSV)</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search company, person, phone, notes, or outcome..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {(['ALL', 'Connected', 'No Answer', 'Busy', 'Voicemail'] as const).map((st) => {
            const count = st === 'ALL' ? calls.length : calls.filter((c) => c.status === st).length;
            const isSelected = statusFilter === st;
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {st} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Call History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {filteredCalls.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <History className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="text-sm font-medium text-slate-300">No call records found</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'ALL'
                ? 'No calls match your query or filter criteria.'
                : 'Call logs will be recorded automatically when dialing from the browser keypad.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Contact & Company</th>
                  <th className="py-3 px-4">Phone Number</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Outcome</th>
                  <th className="py-3 px-4">Notes & Follow-up</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {filteredCalls.map((call) => {
                  const date = new Date(call.timestamp);
                  const dateStr = date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  });
                  const timeStr = date.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  });

                  return (
                    <tr key={call.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Contact & Company */}
                      <td className="py-3.5 px-4 min-w-[180px]">
                        <div className="font-semibold text-slate-100">{call.companyName}</div>
                        <div className="text-[11px] text-slate-400">{call.contactPerson || '—'}</div>
                      </td>

                      {/* Phone Number */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-200">
                        {call.phoneNumber}
                      </td>

                      {/* Date & Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-slate-300">
                        <div>{dateStr}</div>
                        <div className="text-slate-500 text-[10px]">{timeStr}</div>
                      </td>

                      {/* Duration */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono tabular-nums text-slate-200 font-semibold">
                        {formatDuration(call.durationSeconds)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${getStatusBadge(
                            call.status
                          )}`}
                        >
                          {call.status}
                        </span>
                      </td>

                      {/* Outcome */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-xs text-slate-300">
                          {call.outcome || '—'}
                        </span>
                      </td>

                      {/* Notes & Follow-up */}
                      <td className="py-3.5 px-4 max-w-xs">
                        {call.notes ? (
                          <div className="text-[11px] text-slate-400 line-clamp-2">
                            "{call.notes}"
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                        {call.followUpDate && (
                          <div className="flex items-center gap-1 text-[10px] text-blue-400 mt-1 font-mono">
                            <Calendar className="w-3 h-3" />
                            <span>Follow-up: {new Date(call.followUpDate).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onDialNumber(call.phoneNumber)}
                            className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-600/10 rounded transition-colors"
                            title="Redial this number"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onOpenWrapUpModal(call)}
                            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                            title="Edit notes / outcome"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              if (confirm('Delete this call record?')) {
                                onDeleteCall(call.id);
                              }
                            }}
                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded transition-colors"
                            title="Delete record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
