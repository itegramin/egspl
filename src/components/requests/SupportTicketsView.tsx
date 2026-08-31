import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { SupportTicket } from '../../types';
import { StatusBadge, PriorityBadge, DeletionPendingBadge } from '../common/Badge';
import { formatShortDateIST, formatDateTimeIST } from '../../lib/dateUtils';
import {
  Headphones,
  Bug,
  Code2,
  KeyRound,
  CreditCard,
  Sparkles,
  Plus,
  Search,
  Paperclip,
  MessageSquare,
  ExternalLink,
  Download,
  Inbox,
  RotateCcw
} from 'lucide-react';

export const SupportTicketsView: React.FC = () => {
  const {
    requests,
    setActiveRequest,
    openCreateModal,
    triggerExportCSV,
    permissions,
  } = useApp();
  const { user } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const supportTickets = (
    requests.filter(
      r => r.type === 'support' && (user?.role !== 'client' || r.clientId === user?.id)
    ) as SupportTicket[]
  );

  const canCreate = user?.role === 'client' && (permissions[user?.role || 'client']?.canCreateRequest ?? true);
  const isStaff = user.role === 'admin' || user.role === 'operator';

  const categories = [
    { id: 'all', label: 'All Issues', icon: Headphones, count: supportTickets.length },
    { id: 'matm', label: 'mATM Installation & Maintenance', icon: Bug, count: supportTickets.filter(t => t.category === 'matm').length },
    { id: 'Morpho', label: 'L1 & L0 Support', icon: Code2, count: supportTickets.filter(t => t.category === 'morpho').length },
    { id: 'passbook_Printer', label: 'Passbook Printer', icon: KeyRound, count: supportTickets.filter(t => t.category === 'passbook_printer').length },
    { id: 'new_setup', label: 'New Installation', icon: CreditCard, count: supportTickets.filter(t => t.category === 'new_setup').length },
    { id: 'upgrade_services', label: 'Upgrade Services', icon: Sparkles, count: supportTickets.filter(t => t.category === 'upgrade_services').length },
  ];

  const filteredTickets = supportTickets
    .filter(t => selectedCategory === 'all' || t.category === selectedCategory)
    .filter(t => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.ticketNumber.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.clientName.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      );
    });

  return (
    <div id="support-tickets-view" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Headphones className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Technical Support Desk
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Submit software bugs, system anomalies, API integrations, and 2FA resets with screenshots.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {isStaff && (
            <button
              onClick={triggerExportCSV}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 shadow-xs"
            >
              <Download className="w-4 h-4 text-slate-400" />
              <span>Export CSV</span>
            </button>
          )}

          {canCreate && (
            <button
              id="new-support-ticket-btn"
              onClick={() => openCreateModal('support')}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>Create Ticket</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Pills & Search */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${isSelected
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search support tickets by keyword, client, or error..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {(selectedCategory !== 'all' || searchQuery.trim()) && (
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Ticket Grid / Empty State */}
      {filteredTickets.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
            <Inbox className="w-6 h-6" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">
            No support tickets found
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1">
            {searchQuery.trim() || selectedCategory !== 'all'
              ? 'No tickets match your active filter or search keyword. Try clearing search filters.'
              : 'There are no support tickets in your queue right now.'}
          </p>
          <div className="mt-4 flex items-center gap-3">
            {(searchQuery.trim() || selectedCategory !== 'all') && (
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                }}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3 h-3" />
                Clear Filters
              </button>
            )}
            {canCreate && (
              <button
                onClick={() => openCreateModal('support')}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Support Ticket
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {filteredTickets.map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => setActiveRequest(ticket)}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {ticket.ticketNumber}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {formatShortDateIST(ticket.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {ticket.deleteRequested && <DeletionPendingBadge />}
                    <PriorityBadge priority={ticket.priority} />
                    <StatusBadge status={ticket.status} />
                  </div>
                </div>
                <div className="border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                      {ticket.title}
                    </h3>
                    <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 capitalize font-medium">
                      {ticket.category.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 shrink-0">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                      {ticket.description}
                    </p>
                    <div className="flex items-center gap-2">
                      {ticket.attachments.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-slate-500" title={`${ticket.attachments.length} attachments`}>
                          <Paperclip className="w-3.5 h-3.5" />
                          <span>{ticket.attachments.length}</span>
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-slate-500" title={`${ticket.comments.length} replies`}>
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{ticket.comments.length}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
