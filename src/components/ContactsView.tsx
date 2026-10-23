import React, { useState } from 'react';
import {
  Search,
  Plus,
  Phone,
  Mail,
  Globe,
  Building2,
  Trash2,
  Edit2,
  Filter,
  X,
  Clock,
} from 'lucide-react';
import { Contact, LeadStatus } from '../types';
import { formatUSPhone, getUSLocationFromPhone } from '../utils/phoneUtils';

interface ContactsViewProps {
  contacts: Contact[];
  onDialNumber: (phone: string, contact?: Contact) => void;
  onSaveContact: (contact: Omit<Contact, 'id' | 'createdDate'> & { id?: string }) => void;
  onDeleteContact: (id: string) => void;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
}

const LEAD_STATUS_LIST: LeadStatus[] = [
  'New',
  'Contacted',
  'Interested',
  'Follow-up',
  'Not Interested',
  'Converted',
];

export const ContactsView: React.FC<ContactsViewProps> = ({
  contacts,
  onDialNumber,
  onSaveContact,
  onDeleteContact,
  isAddModalOpen,
  setIsAddModalOpen,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'ALL'>('ALL');
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  // Form state
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [usPhoneNumber, setUsPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [leadStatus, setLeadStatus] = useState<LeadStatus>('New');
  const [notes, setNotes] = useState('');

  // Reset fields when add modal is opened cleanly
  React.useEffect(() => {
    if (isAddModalOpen && !editingContact) {
      setCompanyName('');
      setContactPerson('');
      setUsPhoneNumber('');
      setEmail('');
      setWebsite('');
      setLeadStatus('New');
      setNotes('');
    }
  }, [isAddModalOpen, editingContact]);

  const openAddModal = () => {
    setEditingContact(null);
    setCompanyName('');
    setContactPerson('');
    setUsPhoneNumber('');
    setEmail('');
    setWebsite('');
    setLeadStatus('New');
    setNotes('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (c: Contact) => {
    setEditingContact(c);
    setCompanyName(c.companyName);
    setContactPerson(c.contactPerson);
    setUsPhoneNumber(c.usPhoneNumber);
    setEmail(c.email || '');
    setWebsite(c.website || '');
    setLeadStatus(c.leadStatus);
    setNotes(c.notes || '');
    setIsAddModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditingContact(null);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !contactPerson.trim() || !usPhoneNumber.trim()) {
      return;
    }

    onSaveContact({
      id: editingContact?.id,
      companyName: companyName.trim(),
      contactPerson: contactPerson.trim(),
      usPhoneNumber: usPhoneNumber.trim(),
      email: email.trim(),
      website: website.trim(),
      leadStatus,
      notes: notes.trim(),
    });

    handleCloseModal();
  };

  const filteredContacts = contacts.filter((c) => {
    const matchesStatus = statusFilter === 'ALL' || c.leadStatus === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      c.companyName.toLowerCase().includes(q) ||
      c.contactPerson.toLowerCase().includes(q) ||
      c.usPhoneNumber.includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.notes && c.notes.toLowerCase().includes(q));

    return matchesStatus && matchesSearch;
  });

  const getStatusStyle = (status: LeadStatus) => {
    switch (status) {
      case 'Interested':
        return 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30';
      case 'Follow-up':
        return 'bg-blue-950/60 text-blue-300 border-blue-500/30';
      case 'Converted':
        return 'bg-purple-950/60 text-purple-300 border-purple-500/30';
      case 'Contacted':
        return 'bg-cyan-950/60 text-cyan-300 border-cyan-500/30';
      case 'Not Interested':
        return 'bg-slate-800 text-slate-400 border-slate-700';
      case 'New':
      default:
        return 'bg-amber-950/60 text-amber-300 border-amber-500/30';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">
            US Business Contacts & Leads
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Accounts database configured with US timezone tags and 1-click dialer
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-sm shadow-blue-500/20 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Contact</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search company, contact person, phone number, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Lead Status Segmented Filter */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            All ({contacts.length})
          </button>
          {LEAD_STATUS_LIST.map((status) => {
            const count = contacts.filter((c) => c.leadStatus === status).length;
            const isSelected = statusFilter === status;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {status} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Contacts Data Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {filteredContacts.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Building2 className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="text-sm font-medium text-slate-300">No contacts found</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'ALL'
                ? 'Try adjusting your search terms or status filters.'
                : 'Start building your US prospect database by creating your first contact.'}
            </p>
            <button
              onClick={openAddModal}
              className="mt-2 px-3 py-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-900/30 rounded-lg transition-colors inline-block"
            >
              Add First Contact
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Company & Contact</th>
                  <th className="py-3 px-4">US Phone Number</th>
                  <th className="py-3 px-4">Time Zone</th>
                  <th className="py-3 px-4">Lead Status</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4">Latest Notes</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {filteredContacts.map((contact) => {
                  const location = getUSLocationFromPhone(contact.usPhoneNumber);
                  const tz = contact.timeZone || location?.tz || 'US';
                  const state = contact.state || location?.state || '';
                  const createdStr = new Date(contact.createdDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });

                  return (
                    <tr
                      key={contact.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Company & Person */}
                      <td className="py-3.5 px-4 min-w-[200px]">
                        <div className="font-semibold text-slate-100">{contact.companyName}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{contact.contactPerson}</span>
                          {contact.email && (
                            <>
                              <span>·</span>
                              <a
                                href={`mailto:${contact.email}`}
                                className="text-slate-400 hover:text-blue-400 truncate max-w-[140px]"
                              >
                                {contact.email}
                              </a>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-200">
                        {contact.usPhoneNumber}
                      </td>

                      {/* Timezone */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-[11px]">
                        <span className="font-mono text-slate-300 font-medium">
                          {tz}
                        </span>
                        {state && <span className="text-slate-500 ml-1">({state})</span>}
                      </td>

                      {/* Lead Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${getStatusStyle(
                            contact.leadStatus
                          )}`}
                        >
                          {contact.leadStatus}
                        </span>
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                        {createdStr}
                      </td>

                      {/* Notes snippet */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="text-[11px] text-slate-400 line-clamp-2">
                          {contact.notes || '—'}
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {/* Dial Now */}
                          <button
                            onClick={() => onDialNumber(contact.usPhoneNumber, contact)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white font-medium transition-colors"
                            title="Dial prospect now"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>Dial</span>
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => openEditModal(contact)}
                            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                            title="Edit contact"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => {
                              if (confirm(`Delete ${contact.companyName}?`)) {
                                onDeleteContact(contact.id);
                              }
                            }}
                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded transition-colors"
                            title="Delete contact"
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

      {/* Add / Edit Contact Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-100">
                {editingContact ? 'Edit US Contact' : 'Add New US Contact'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(85vh-120px)]">
              {/* Company & Contact Person */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Company Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Apex Health Inc."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Contact Person <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="e.g. Johnathan Vance"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* US Phone Number & Lead Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    US Phone Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={usPhoneNumber}
                    onChange={(e) => setUsPhoneNumber(formatUSPhone(e.target.value))}
                    placeholder="+1 (555) 000-0000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Lead Status
                  </label>
                  <select
                    value={leadStatus}
                    onChange={(e) => setLeadStatus(e.target.value as LeadStatus)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    {LEAD_STATUS_LIST.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Email & Website */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@company.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Website URL
                  </label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://company.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Prospect Notes & Context
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Key talking points, business model, preferred call windows..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-sm shadow-blue-500/20"
                >
                  {editingContact ? 'Update Contact' : 'Save Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
