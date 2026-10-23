import React, { useState } from 'react';
import { X, CheckCircle, Calendar, MessageSquare, Building2, User, Phone, Clock } from 'lucide-react';
import { CallOutcomeOption, CallRecord, Contact, LeadStatus, WrapUpCallData } from '../types';
import { formatDuration } from '../utils/phoneUtils';

interface CallWrapUpModalProps {
  callRecord: CallRecord;
  contact?: Contact | null;
  onSave: (data: WrapUpCallData) => void;
  onDismiss: () => void;
}

const OUTCOME_OPTIONS: CallOutcomeOption[] = [
  'Connected - Interested',
  'Connected - Follow-up Needed',
  'Connected - Gatekeeper Reached',
  'Connected - Not Interested',
  'Left Voicemail',
  'No Answer',
  'Busy / Rejected',
  'Wrong Number',
];

const LEAD_STATUS_OPTIONS: LeadStatus[] = [
  'New',
  'Contacted',
  'Interested',
  'Follow-up',
  'Not Interested',
  'Converted',
];

export const CallWrapUpModal: React.FC<CallWrapUpModalProps> = ({
  callRecord,
  contact,
  onSave,
  onDismiss,
}) => {
  // Pre-select reasonable default outcome based on status
  const initialOutcome: CallOutcomeOption =
    (callRecord.outcome as CallOutcomeOption) ||
    (callRecord.status === 'Connected'
      ? 'Connected - Interested'
      : callRecord.status === 'No Answer'
      ? 'No Answer'
      : callRecord.status === 'Busy'
      ? 'Busy / Rejected'
      : 'Left Voicemail');

  const [outcome, setOutcome] = useState<CallOutcomeOption>(initialOutcome);
  const [notes, setNotes] = useState<string>(callRecord.notes || '');
  const [followUpDate, setFollowUpDate] = useState<string>(callRecord.followUpDate || '');
  const [leadStatus, setLeadStatus] = useState<LeadStatus>(
    contact?.leadStatus || (callRecord.status === 'Connected' ? 'Interested' : 'Contacted')
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      callRecordId: callRecord.id,
      contactId: contact?.id || callRecord.contactId,
      outcome,
      notes: notes.trim(),
      followUpDate: followUpDate || undefined,
      updatedLeadStatus: contact ? leadStatus : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-400" />
              Call Wrap-Up & Prospect Notes
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Log call outcome, conversation notes, and follow-up timeline
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Prospect Summary Strip */}
        <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <span className="truncate font-medium">{callRecord.companyName || 'Unknown Company'}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <User className="w-3.5 h-3.5 text-slate-500" />
            <span className="truncate">{callRecord.contactPerson || 'Unknown Contact'}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300 font-mono">
            <Phone className="w-3.5 h-3.5 text-slate-500" />
            <span>{callRecord.phoneNumber}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Duration: <strong className="font-mono tabular-nums text-slate-200">{formatDuration(callRecord.durationSeconds)}</strong></span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(85vh-160px)]">
          {/* Outcome Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Call Outcome <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {OUTCOME_OPTIONS.map((opt) => {
                const isSelected = outcome === opt;
                return (
                  <button
                    type="button"
                    key={opt}
                    onClick={() => {
                      setOutcome(opt);
                      // Smart lead status suggestion
                      if (opt === 'Connected - Interested') setLeadStatus('Interested');
                      if (opt === 'Connected - Follow-up Needed') setLeadStatus('Follow-up');
                      if (opt === 'Connected - Not Interested') setLeadStatus('Not Interested');
                      if (opt === 'Wrong Number') setLeadStatus('Not Interested');
                    }}
                    className={`px-3 py-2 text-left rounded-lg text-xs font-medium border transition-colors ${
                      isSelected
                        ? 'bg-blue-600/20 text-blue-300 border-blue-500/50 shadow-sm'
                        : 'bg-slate-950/60 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lead Status Update (if contact linked) */}
          {contact && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Update Lead Status
              </label>
              <div className="flex flex-wrap gap-1.5">
                {LEAD_STATUS_OPTIONS.map((st) => (
                  <button
                    type="button"
                    key={st}
                    onClick={() => setLeadStatus(st)}
                    className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                      leadStatus === st
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                Conversation Notes & Next Steps
              </span>
              <span className="text-[11px] text-slate-500 font-normal">Appended to contact history</span>
            </label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Spoke with VP of Sales. Interested in US outbound calling package. Needs quotation by Thursday."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Follow-up Date */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Follow-Up Date & Time
            </label>
            <input
              type="datetime-local"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors [color-scheme:dark]"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onDismiss}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              Skip Notes
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-sm shadow-blue-500/20"
            >
              Save Call Notes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
