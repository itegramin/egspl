import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  Users,
  Download,
  ShieldCheck,
  Zap
} from 'lucide-react';

import { THEME_PRESETS } from '../../lib/theme';
import { DownloadModal } from '../requests/DownloadModal';

export const AnalyticsView: React.FC = () => {
  const { requests, triggerExportCSV, isDarkMode, themeConfig } = useApp();
  const { operators, allUsers } = useAuth();
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  const brandPrimary = THEME_PRESETS[themeConfig.preset]?.primaryHex || '#059669';

  // Metrics computation
  const total = requests.length;
  const supportCount = requests.filter(r => r.type === 'support').length;
  const depositCount = requests.filter(r => r.type === 'deposit').length;
  const withdrawCount = requests.filter(r => r.type === 'withdraw').length;

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const inProgressCount = requests.filter(r => r.status === 'in_progress').length;
  const completedCount = requests.filter(r => r.status === 'completed').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  // Chart 1: Volume by Type
  const typeData = [
    { name: 'Support Tickets', count: supportCount, fill: brandPrimary },
    { name: 'Deposit Updates', count: depositCount, fill: '#10b981' },
    { name: 'Withdraw Requests', count: withdrawCount, fill: '#06b6d4' },
  ];

  // Chart 2: Status Breakdown
  const statusData = [
    { name: 'Completed', value: completedCount, color: '#10b981' },
    { name: 'In Progress', value: inProgressCount, color: '#3b82f6' },
    { name: 'Pending', value: pendingCount, color: '#f59e0b' },
    { name: 'Rejected', value: rejectedCount, color: '#ef4444' },
  ].filter(d => d.value > 0);

  // Chart 3: Operator Load & Resolution Metrics
  const operatorMetrics = operators.map(op => {
    const assigned = requests.filter(r => r.assignedOperatorId === op.id || r.assignedHandlers?.some(h => h.id === op.id));
    const resolved = assigned.filter(r => r.status === 'completed').length;
    const active = assigned.filter(r => r.status === 'in_progress' || r.status === 'pending').length;

    return {
      name: op.name.split(' ')[0],
      Active: active,
      Resolved: resolved,
      Total: assigned.length,
    };
  });

  // Chart 4: Historical Monthly Trajectory
  const monthlyData = [
    { month: 'Apr', support: 12, deposit: 8, withdraw: 4 },
    { month: 'May', support: 18, deposit: 14, withdraw: 7 },
    { month: 'Jun', support: 24, deposit: 20, withdraw: 11 },
    { month: 'Jul', support: 29, deposit: 28, withdraw: 15 },
    { month: 'Aug (Current)', support: supportCount, deposit: depositCount, withdraw: withdrawCount },
  ];

  return (
    <div id="analytics-view" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <BarChart3 className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Service Operations & SLA Analytics
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time fulfillment metrics, operator performance, and volume distribution.
          </p>
        </div>

        <button
          id="download-analytics-report-btn"
          onClick={() => setIsDownloadModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 self-start sm:self-auto shadow-xs cursor-pointer"
        >
          <Download className="w-4 h-4 text-slate-400" />
          <span>Download Report</span>
        </button>
      </div>

      {/* KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg First Response</div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">14 mins</div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-medium">
            <Zap className="w-3.5 h-3.5" /> 22% faster than SLA target
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Resolution Time</div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">3.4 hrs</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Across technical and holding</div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fulfillment Rate</div>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
            {total > 0 ? ((completedCount / total) * 100).toFixed(1) : '100'}%
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Overall completion ratio</div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Staff Capacity</div>
          <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-2">
            {operators.length} Operators
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">100% active on shift</div>
        </div>
      </div>

      {/* Primary Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Volume by Type */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
            Request Volume by Category
          </h3>
          <p className="text-xs text-slate-400 mb-4">Total requests logged per category</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" fontSize={11} tickLine={false} />
                <YAxis fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '8px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Status Breakdown Donut */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
            Request Lifecycle Distribution
          </h3>
          <p className="text-xs text-slate-400 mb-4">Status ratios across the service platform</p>
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '8px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Operator Performance Metrics */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
            Operator Performance & Workload
          </h3>
          <p className="text-xs text-slate-400 mb-4">Active vs Resolved tickets per operator</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={operatorMetrics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" fontSize={11} tickLine={false} />
                <YAxis fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '8px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Active" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Resolved" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Volume Growth Area Chart */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
            Monthly Request Trajectory
          </h3>
          <p className="text-xs text-slate-400 mb-4">Growth across support tickets and holding requests</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="month" fontSize={11} tickLine={false} />
                <YAxis fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '8px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Area type="monotone" dataKey="support" stackId="1" stroke="#6366f1" fill="#6366f1" fillOpacity={0.4} />
                <Area type="monotone" dataKey="deposit" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
                <Area type="monotone" dataKey="withdraw" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.4} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      {/* Download Modal */}
      <DownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        viewType="analytics"
        data={requests}
        staffUsers={(allUsers || []).filter(u => u.role === 'operator' || u.role === 'admin')}
        activeHex={brandPrimary}
      />
    </div>
  );
};
