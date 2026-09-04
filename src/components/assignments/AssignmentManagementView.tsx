import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import {
  ServiceRequest,
  HoldingWithdrawRequest,
  AssignmentConfig,
  HandlerMember,
  getRuleHandlers,
  getRuleAuthorizers,
} from '../../types';
import { StatusBadge, PriorityBadge } from '../common/Badge';
import { formatShortDateIST } from '../../lib/dateUtils';
import {
  UserCheck,
  ClipboardList,
  Clock,
  Search,
  ChevronDown,
  Users,
  ArrowUpRight,
  Inbox,
  ShieldAlert,
  Settings2,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
  AlertTriangle,
  X,
  UserPlus,
  Scale,
  Database,
} from 'lucide-react';

type FilterTab = 'all' | 'unassigned' | 'limit' | 'support' | 'awaiting-auth';

function getCmaStage(req: ServiceRequest): string {
  if (req.type !== 'withdraw') return '';
  const wr = req as HoldingWithdrawRequest;
  const cma = wr.cmaStatus || {};
  if (cma.authorize) return 'Authorized';
  if (cma.make) return 'Made — Awaiting Authorizer';
  if (cma.configure) return 'Configured — Awaiting Make';
  return 'Pending — Awaiting Configure';
}

function getCmaBadgeStyle(stage: string) {
  if (stage === 'Authorized')
    return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800';
  if (stage.includes('Awaiting Authorizer'))
    return 'bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-300 dark:border-violet-800';
  if (stage.includes('Awaiting Make'))
    return 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800';
  return 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800';
}

// ── Multi-Handler Member Pool Component ──────────────────────────────────────
interface MemberPoolProps {
  title: string;
  members: HandlerMember[];
  staffUsers: { id: string; name: string; role: string }[];
  onAdd: (user: { id: string; name: string; role: string }) => void;
  onRemove: (id: string) => void;
  placeholder?: string;
  isAuthorizer?: boolean;
}

const MemberPool: React.FC<MemberPoolProps> = ({
  title,
  members,
  staffUsers,
  onAdd,
  onRemove,
  placeholder = 'No handlers configured',
  isAuthorizer = false,
}) => {
  const [selectedId, setSelectedId] = useState('');
  const availableStaff = staffUsers.filter(u => !members.some(m => m.id === u.id));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold uppercase tracking-wide opacity-70 flex items-center gap-1.5">
          <span>{title}</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            members.length > 0
              ? isAuthorizer
                ? 'bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300'
                : 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300'
              : 'bg-slate-200/70 dark:bg-slate-800 text-slate-500'
          }`}>
            {members.length} {members.length === 1 ? 'user' : 'users'}
          </span>
        </label>
        {members.length > 1 && !isAuthorizer && (
          <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
            <Scale className="w-3 h-3" />
            Load-balanced (least open tickets)
          </span>
        )}
      </div>

      {/* Selected Members Chips */}
      <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
        {members.length === 0 ? (
          <span className="text-[11px] text-slate-400 dark:text-slate-500 italic flex items-center gap-1 py-0.5 px-1">
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            {placeholder}
          </span>
        ) : (
          members.map(m => (
            <span
              key={m.id}
              className={`inline-flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-lg text-xs font-medium border shadow-2xs ${
                isAuthorizer
                  ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-800 dark:text-violet-200 border-violet-200 dark:border-violet-800'
                  : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800'
              }`}
            >
              <span className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
                isAuthorizer
                  ? 'bg-violet-200 dark:bg-violet-800 text-violet-800 dark:text-violet-100'
                  : 'bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-100'
              }`}>
                {m.name.charAt(0).toUpperCase()}
              </span>
              <span className="max-w-[130px] truncate">{m.name}</span>
              {m.role && (
                <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-white/60 dark:bg-black/40 text-slate-500 dark:text-slate-400 font-semibold">
                  {m.role}
                </span>
              )}
              <button
                type="button"
                onClick={() => onRemove(m.id)}
                title={`Remove ${m.name}`}
                className="w-4 h-4 rounded hover:bg-rose-200 dark:hover:bg-rose-900/80 hover:text-rose-700 dark:hover:text-rose-200 flex items-center justify-center transition-colors text-slate-400 ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))
        )}
      </div>

      {/* Add Member Dropdown */}
      {availableStaff.length > 0 ? (
        <div className="relative">
          <select
            value={selectedId}
            onChange={e => {
              const val = e.target.value;
              if (!val) return;
              const sel = staffUsers.find(u => u.id === val);
              if (sel) {
                onAdd(sel);
              }
              setSelectedId('');
            }}
            className="w-full pl-8 pr-8 py-1.5 text-xs rounded-lg border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer transition-colors"
          >
            <option value="">+ Add {title.toLowerCase()}...</option>
            {availableStaff.map(u => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role})
              </option>
            ))}
          </select>
          <UserPlus className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-50 pointer-events-none" />
        </div>
      ) : (
        <p className="text-[10px] text-slate-400 italic">All available operators/admins are already assigned to this rule.</p>
      )}
    </div>
  );
};

// ── Assignment Rules Config Panel ─────────────────────────────────────────────
interface RuleRowProps {
  label: string;
  sublabel: string;
  color: string;
  handlers: HandlerMember[];
  authorizers?: HandlerMember[];
  showAuthorizer?: boolean;
  staffUsers: { id: string; name: string; role: string }[];
  onAddHandler: (user: { id: string; name: string; role: string }) => void;
  onRemoveHandler: (id: string) => void;
  onAddAuthorizer?: (user: { id: string; name: string; role: string }) => void;
  onRemoveAuthorizer?: (id: string) => void;
}

const RuleRow: React.FC<RuleRowProps> = ({
  label,
  sublabel,
  color,
  handlers,
  authorizers = [],
  showAuthorizer,
  staffUsers,
  onAddHandler,
  onRemoveHandler,
  onAddAuthorizer,
  onRemoveAuthorizer,
}) => (
  <div className={`rounded-xl border p-4 space-y-3.5 ${color}`}>
    <div>
      <div className="text-sm font-semibold">{label}</div>
      <div className="text-[11px] opacity-70">{sublabel}</div>
    </div>
    <div className="flex flex-col md:flex-row gap-4">
      <div className="flex-1">
        <MemberPool
          title={showAuthorizer ? 'Maker / Handler Pool' : 'Handler Pool'}
          members={handlers}
          staffUsers={staffUsers}
          onAdd={onAddHandler}
          onRemove={onRemoveHandler}
          placeholder="No handlers assigned (auto-assignment will skip this type)"
        />
      </div>
      {showAuthorizer && onAddAuthorizer && onRemoveAuthorizer && (
        <div className="flex-1">
          <MemberPool
            title="Authorizer (Checker) Pool"
            members={authorizers}
            staffUsers={staffUsers}
            onAdd={onAddAuthorizer}
            onRemove={onRemoveAuthorizer}
            isAuthorizer={true}
            placeholder="No authorizers assigned (requests will await manual sign-off)"
          />
        </div>
      )}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────

export const AssignmentManagementView: React.FC = () => {
  const {
    requests,
    setActiveRequest,
    permissions,
    assignmentConfig,
    updateAssignmentConfig,
    toast,
  } = useApp();
  const { user, allUsers } = useAuth();

  const [tab, setTab] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showRules, setShowRules] = useState(false);

  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'admin' || user?.role === 'operator';
  const rolePerm = permissions[user?.role || 'client'];
  const canAssign = rolePerm?.canAssignOperator || user?.role === 'admin';

  const staffUsers = useMemo(
    () => (allUsers || []).filter(u => u.role === 'operator' || u.role === 'admin'),
    [allUsers]
  );

  // KPI counts
  const unassignedCount = requests.filter(r => !r.assignedOperatorId && r.status === 'pending').length;
  const limitRequests = requests.filter(r => r.type === 'withdraw');
  const awaitingAuthCount = limitRequests.filter(r => {
    const wr = r as HoldingWithdrawRequest;
    const cma = wr.cmaStatus || {};
    return cma.configure && cma.make && !cma.authorize;
  }).length;
  const pendingMakeCount = limitRequests.filter(r => {
    const wr = r as HoldingWithdrawRequest;
    const cma = wr.cmaStatus || {};
    return cma.configure && !cma.make;
  }).length;
  const activeStaffCount = new Set(requests.map(r => r.assignedOperatorId).filter(Boolean)).size;

  // Filtered requests
  const filtered = useMemo(() => {
    let list = [...requests];

    if (tab === 'unassigned') list = list.filter(r => !r.assignedOperatorId && r.status !== 'completed' && r.status !== 'rejected');
    else if (tab === 'limit') list = list.filter(r => r.type === 'withdraw');
    else if (tab === 'support') list = list.filter(r => r.type === 'support');
    else if (tab === 'awaiting-auth') {
      list = list.filter(r => {
        if (r.type !== 'withdraw') return false;
        const wr = r as HoldingWithdrawRequest;
        const cma = wr.cmaStatus || {};
        return cma.configure && cma.make && !cma.authorize;
      });
    }

    if (priorityFilter !== 'all') list = list.filter(r => r.priority === priorityFilter);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        r =>
          r.ticketNumber.toLowerCase().includes(q) ||
          r.clientName.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          (r.clientCompany || '').toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => {
      const pOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      return (pOrder[a.priority] ?? 3) - (pOrder[b.priority] ?? 3);
    });
  }, [requests, tab, search, priorityFilter]);

  if (!isStaff) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-10 text-center gap-4">
        <ShieldAlert className="w-12 h-12 text-rose-400" />
        <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">Access Restricted</p>
        <p className="text-sm text-slate-500">Assignment management is available to operators and administrators only.</p>
      </div>
    );
  }

  const tabs: { id: FilterTab; label: string; count?: number }[] = [
    { id: 'all', label: 'All Requests' },
    { id: 'unassigned', label: 'Unassigned', count: unassignedCount },
    { id: 'limit', label: 'Limit Requests (CMA)' },
    { id: 'support', label: 'Support Tickets' },
    { id: 'awaiting-auth', label: 'Awaiting Authorizer', count: awaitingAuthCount },
  ];

  // Rule helpers
  const rules = assignmentConfig.rules;

  const addHandler = (type: 'limit' | 'support' | 'deposit', member: { id: string; name: string; role: string }) => {
    const current = rules[type] || {};
    const currentHandlers = getRuleHandlers(current);
    if (currentHandlers.some(h => h.id === member.id)) return;
    const nextHandlers = [...currentHandlers, { id: member.id, name: member.name, role: member.role }];
    const currentAuthorizers = getRuleAuthorizers(current);

    updateAssignmentConfig({
      rules: {
        ...rules,
        [type]: {
          ...current,
          operatorId: nextHandlers[0]?.id || '',
          operatorName: nextHandlers[0]?.name || '',
          handlers: nextHandlers,
          authorizerId: currentAuthorizers[0]?.id || current.authorizerId,
          authorizerName: currentAuthorizers[0]?.name || current.authorizerName,
          authorizers: currentAuthorizers,
        },
      },
    });
    toast(`Added ${member.name} to ${type === 'limit' ? 'Limit (CMA)' : type === 'support' ? 'Support' : 'Deposit'} handler pool.`, 'success');
  };

  const removeHandler = (type: 'limit' | 'support' | 'deposit', memberId: string) => {
    const current = rules[type];
    if (!current) return;
    const nextHandlers = getRuleHandlers(current).filter(h => h.id !== memberId);
    const currentAuthorizers = getRuleAuthorizers(current);

    if (nextHandlers.length === 0 && currentAuthorizers.length === 0) {
      updateAssignmentConfig({
        rules: {
          ...rules,
          [type]: null,
        },
      });
    } else {
      updateAssignmentConfig({
        rules: {
          ...rules,
          [type]: {
            ...current,
            operatorId: nextHandlers[0]?.id || '',
            operatorName: nextHandlers[0]?.name || '',
            handlers: nextHandlers,
            authorizerId: currentAuthorizers[0]?.id || current.authorizerId,
            authorizerName: currentAuthorizers[0]?.name || current.authorizerName,
            authorizers: currentAuthorizers,
          },
        },
      });
    }
    toast(`Removed handler from ${type === 'limit' ? 'Limit (CMA)' : type === 'support' ? 'Support' : 'Deposit'} rule.`, 'info');
  };

  const addAuthorizer = (type: 'limit' | 'support' | 'deposit', member: { id: string; name: string; role: string }) => {
    const current = rules[type] || {};
    const currentHandlers = getRuleHandlers(current);
    const currentAuthorizers = getRuleAuthorizers(current);
    if (currentAuthorizers.some(a => a.id === member.id)) return;
    const nextAuthorizers = [...currentAuthorizers, { id: member.id, name: member.name, role: member.role }];

    updateAssignmentConfig({
      rules: {
        ...rules,
        [type]: {
          ...current,
          operatorId: currentHandlers[0]?.id || current.operatorId || '',
          operatorName: currentHandlers[0]?.name || current.operatorName || '',
          handlers: currentHandlers,
          authorizerId: nextAuthorizers[0]?.id || '',
          authorizerName: nextAuthorizers[0]?.name || '',
          authorizers: nextAuthorizers,
        },
      },
    });
    toast(`Added ${member.name} to Authorizer pool for Limit requests.`, 'success');
  };

  const removeAuthorizer = (type: 'limit' | 'support' | 'deposit', memberId: string) => {
    const current = rules[type];
    if (!current) return;
    const currentHandlers = getRuleHandlers(current);
    const nextAuthorizers = getRuleAuthorizers(current).filter(a => a.id !== memberId);

    if (currentHandlers.length === 0 && nextAuthorizers.length === 0) {
      updateAssignmentConfig({
        rules: {
          ...rules,
          [type]: null,
        },
      });
    } else {
      updateAssignmentConfig({
        rules: {
          ...rules,
          [type]: {
            ...current,
            operatorId: currentHandlers[0]?.id || current.operatorId || '',
            operatorName: currentHandlers[0]?.name || current.operatorName || '',
            handlers: currentHandlers,
            authorizerId: nextAuthorizers[0]?.id || '',
            authorizerName: nextAuthorizers[0]?.name || '',
            authorizers: nextAuthorizers,
          },
        },
      });
    }
    toast(`Removed authorizer from Limit rule.`, 'info');
  };

  const isRuleComplete = (type: 'limit' | 'support' | 'deposit') => {
    const r = rules[type];
    const handlers = getRuleHandlers(r);
    if (handlers.length === 0) return false;
    if (type === 'limit') {
      const authorizers = getRuleAuthorizers(r);
      if (authorizers.length === 0) return false;
    }
    return true;
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </span>
            Assignment Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure type-wise auto-assignment rules and monitor request workload
          </p>
        </div>

        {/* Rules toggle button (admin only) */}
        {isAdmin && (
          <button
            id="toggle-assignment-rules"
            onClick={() => setShowRules(p => !p)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              showRules
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            {showRules ? 'Hide Rules' : 'Assignment Rules'}
          </button>
        )}
      </div>

      {/* ── Assignment Rules Panel (admin only) ───────────────────────────── */}
      {isAdmin && showRules && (
        <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Auto-Assignment Rules</h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                  <Database className="w-3 h-3" />
                  Synced to Supabase
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                New requests are automatically load-balanced across the configured handler pool.
              </p>
            </div>
            {/* Toggle */}
            <button
              id="toggle-auto-assignment"
              onClick={() => {
                const nextState = !assignmentConfig.autoAssignmentEnabled;
                updateAssignmentConfig({ autoAssignmentEnabled: nextState });
                toast(nextState ? 'Auto-assignment enabled.' : 'Auto-assignment disabled.', nextState ? 'success' : 'info');
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                assignmentConfig.autoAssignmentEnabled
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600'
              }`}
            >
              {assignmentConfig.autoAssignmentEnabled
                ? <><ToggleRight className="w-4 h-4" /> Auto ON</>
                : <><ToggleLeft className="w-4 h-4" /> Auto OFF</>
              }
            </button>
          </div>

          {!assignmentConfig.autoAssignmentEnabled && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              Auto-assignment is disabled. New requests will remain unassigned.
            </div>
          )}

          <div className="grid gap-3">
            {/* Limit Request Rule */}
            <RuleRow
              label="Limit Requests (CMA)"
              sublabel="Withdraw / payout requests — Configure → Make → Authorize"
              color={
                isRuleComplete('limit')
                  ? 'bg-white dark:bg-slate-900 border-violet-200 dark:border-violet-900/60'
                  : 'bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-900/50'
              }
              handlers={getRuleHandlers(rules.limit)}
              authorizers={getRuleAuthorizers(rules.limit)}
              showAuthorizer={true}
              staffUsers={staffUsers}
              onAddHandler={user => addHandler('limit', user)}
              onRemoveHandler={id => removeHandler('limit', id)}
              onAddAuthorizer={user => addAuthorizer('limit', user)}
              onRemoveAuthorizer={id => removeAuthorizer('limit', id)}
            />

            {/* Support Request Rule */}
            <RuleRow
              label="Support Requests"
              sublabel="Matm / Morpho / Passbook / Setup / Upgrade tickets"
              color={
                isRuleComplete('support')
                  ? 'bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-900/60'
                  : 'bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-900/50'
              }
              handlers={getRuleHandlers(rules.support)}
              showAuthorizer={false}
              staffUsers={staffUsers}
              onAddHandler={user => addHandler('support', user)}
              onRemoveHandler={id => removeHandler('support', id)}
            />

            {/* Deposit Request Rule */}
            <RuleRow
              label="Deposit Requests"
              sublabel="Holding deposit confirmation requests"
              color={
                isRuleComplete('deposit')
                  ? 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-900/60'
                  : 'bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-900/50'
              }
              handlers={getRuleHandlers(rules.deposit)}
              showAuthorizer={false}
              staffUsers={staffUsers}
              onAddHandler={user => addHandler('deposit', user)}
              onRemoveHandler={id => removeHandler('deposit', id)}
            />
          </div>

          {/* Status summary */}
          <div className="flex flex-wrap gap-2 pt-1">
            {(['limit', 'support', 'deposit'] as const).map(type => (
              <div
                key={type}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                  isRuleComplete(type)
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                }`}
              >
                {isRuleComplete(type)
                  ? <CheckCircle2 className="w-3 h-3" />
                  : <AlertTriangle className="w-3 h-3" />
                }
                {type === 'limit' ? 'Limit' : type === 'support' ? 'Support' : 'Deposit'}:{' '}
                {isRuleComplete(type) ? 'Configured' : 'Incomplete'}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Unassigned',
            value: unassignedCount,
            icon: Inbox,
            color: unassignedCount > 0
              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
              : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300',
            iconColor: unassignedCount > 0 ? 'text-amber-500' : 'text-slate-400',
          },
          {
            label: 'Awaiting Authorizer',
            value: awaitingAuthCount,
            icon: ShieldAlert,
            color: awaitingAuthCount > 0
              ? 'bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300'
              : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300',
            iconColor: awaitingAuthCount > 0 ? 'text-violet-500' : 'text-slate-400',
          },
          {
            label: 'Pending Make',
            value: pendingMakeCount,
            icon: Clock,
            color: 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300',
            iconColor: 'text-blue-400',
          },
          {
            label: 'Active Staff',
            value: activeStaffCount,
            icon: Users,
            color: 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300',
            iconColor: 'text-emerald-500',
          },
        ].map(kpi => (
          <div
            key={kpi.label}
            className={`rounded-xl border p-4 flex items-center gap-3 ${kpi.color}`}
          >
            <div className={`w-9 h-9 rounded-lg bg-white/60 dark:bg-black/20 flex items-center justify-center shrink-0 ${kpi.iconColor}`}>
              <kpi.icon className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="text-2xl font-black">{kpi.value}</div>
              <div className="text-[11px] font-medium opacity-80">{kpi.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by ticket #, client, title..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        {/* Priority */}
        <div className="relative">
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="pl-3 pr-8 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none border-b border-slate-200 dark:border-slate-800">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-all -mb-px ${
              tab === t.id
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                tab === t.id
                  ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300'
                  : 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">No requests match the current filters</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Ticket</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Client</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Status / Priority</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">CMA Stage</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Maker / Handler</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Authorizer</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map(req => {
                  const cmaStage = getCmaStage(req);
                  const wr = req.type === 'withdraw' ? req as HoldingWithdrawRequest : null;

                  return (
                    <tr
                      key={req.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Ticket Info */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            req.type === 'withdraw' ? 'bg-violet-500' :
                            req.type === 'deposit' ? 'bg-emerald-500' : 'bg-blue-500'
                          }`} />
                          <div>
                            <div className="font-mono font-bold text-slate-900 dark:text-white">{req.ticketNumber}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">
                              {req.type === 'withdraw' ? 'Limit Request' : req.type === 'deposit' ? 'Deposit' : 'Support'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Client */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{req.clientName}</div>
                        {req.clientCompany && (
                          <div className="text-[11px] text-slate-400 truncate max-w-[120px]">{req.clientCompany}</div>
                        )}
                        <div className="text-[11px] text-slate-400">{formatShortDateIST(req.createdAt)}</div>
                      </td>

                      {/* Status / Priority */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <StatusBadge status={req.status} />
                          <PriorityBadge priority={req.priority} />
                        </div>
                      </td>

                      {/* CMA Stage */}
                      <td className="px-4 py-3">
                        {req.type === 'withdraw' ? (
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-semibold ${getCmaBadgeStyle(cmaStage)}`}>
                            {cmaStage}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">N/A</span>
                        )}
                      </td>

                      {/* Maker / Handler — read-only (auto-assigned by rules) */}
                      <td className="px-4 py-3">
                        {req.assignedOperatorName ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-[9px] font-bold text-indigo-600 dark:text-indigo-300 uppercase">
                              {req.assignedOperatorName.charAt(0)}
                            </div>
                            <span className="text-slate-800 dark:text-slate-200 font-medium">{req.assignedOperatorName}</span>
                          </div>
                        ) : (
                          <span className="italic text-amber-500 text-[11px]">Unassigned</span>
                        )}
                      </td>

                      {/* Authorizer — limit requests only, read-only */}
                      <td className="px-4 py-3">
                        {req.type === 'withdraw' ? (
                          (req as any).assignedAuthorizerName ? (
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center text-[9px] font-bold text-violet-600 dark:text-violet-300 uppercase">
                                {(req as any).assignedAuthorizerName.charAt(0)}
                              </div>
                              <span className="text-slate-800 dark:text-slate-200 font-medium">{(req as any).assignedAuthorizerName}</span>
                            </div>
                          ) : (
                            <span className="italic text-violet-400 text-[11px]">Not Assigned</span>
                          )
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">N/A</span>
                        )}
                      </td>

                      {/* Open button */}
                      <td className="px-4 py-3">
                        <button
                          id={`open-req-${req.id}`}
                          onClick={() => setActiveRequest(req)}
                          className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 transition-colors"
                          title="Open request detail"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
            Showing {filtered.length} of {requests.length} requests
            {assignmentConfig.autoAssignmentEnabled && (
              <span className="ml-3 text-emerald-600 dark:text-emerald-400 font-semibold">● Auto-assignment active</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
