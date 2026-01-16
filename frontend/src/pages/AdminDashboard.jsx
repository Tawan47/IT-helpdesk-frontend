import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSocket } from '../contexts/SocketContext';
import AnalyticsDashboard from './AnalyticsDashboard';
import OnlineTechsCard from '../components/OnlineTechsCard';

import {
  Search, Filter, Plus, Edit, Delete,
  AlertTriangle, UserCheck, Hourglass, CheckCircle,
  LayoutDashboard, Ticket, Users as UsersIcon, Box, BarChart3, Wifi, User
} from 'lucide-react';

import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, IconButton, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Tooltip, TextField
} from '@mui/material';

// Fallback for environment variable in case import.meta is not available in some build targets
const API_BASE_URL = (import.meta && import.meta.env && import.meta.env.VITE_API_URL) || 'http://localhost:5000';

/* ============== small helpers ============== */
function classNames(...a) { return a.filter(Boolean).join(' '); }

const SoftBadge = ({ children, tone = 'slate' }) => {
  const toneMap = {
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-700/60 dark:text-slate-100',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
    violet: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
  };
  return <span className={classNames('px-2 py-1 rounded-full text-xs font-semibold', toneMap[tone])}>{children}</span>;
};

const EmptyState = ({ title = 'ยังไม่มีข้อมูล', subtitle = 'ลองปรับตัวกรองหรือเพิ่มรายการใหม่' }) => (
  <div className="py-16 text-center bg-gradient-to-b from-slate-800/40 to-slate-800/20 dark:from-slate-800/40 dark:to-slate-800/10 rounded-2xl border border-slate-200/50 dark:border-slate-700/60 shadow-inner">
    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-700/30">
      <BarChart3 className="text-slate-300" size={20} />
    </div>
    <p className="text-lg font-bold text-slate-800 dark:text-white">{title}</p>
    <p className="mt-1 text-slate-600 dark:text-slate-300">{subtitle}</p>
  </div>
);

const StatCard = ({ title, value, icon: Icon, gradient, iconColor }) => (
  <div
    className={classNames(
      'relative overflow-hidden rounded-2xl p-5 shadow-lg border',
      'border-white/20 dark:border-slate-700/60',
      'bg-gradient-to-br backdrop-blur-sm',
      'hover:shadow-xl hover:scale-[1.02] transition-all duration-300',
      gradient || 'from-violet-500/90 via-purple-500/85 to-fuchsia-500/80'
    )}
  >
    {/* Decorative elements */}
    <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-xl" />
    <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/10 rounded-full blur-lg" />

    <div className="relative flex items-center gap-4">
      <div className={classNames(
        'p-3 rounded-xl shadow-inner',
        'bg-white/20 dark:bg-white/10 backdrop-blur-sm'
      )}>
        <Icon className={classNames('h-6 w-6', iconColor || 'text-white')} />
      </div>
      <div>
        <p className="text-4xl font-extrabold tracking-tight text-white leading-none drop-shadow-sm">{value}</p>
        <p className="text-sm font-medium text-white/80 mt-1">{title}</p>
      </div>
    </div>
  </div>
);

// ✅ การ์ดนี้จะแสดงเฉพาะ User ที่ออนไลน์
function OnlineUsersCard({ onlineData, loading }) {
  const roleColors = {
    Admin: 'bg-gradient-to-r from-red-500 to-rose-500 text-white',
    Technician: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white',
    User: 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white',
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border border-slate-200/70 dark:border-slate-700/60 rounded-2xl p-5 shadow-lg col-span-1 lg:col-span-2">
      {/* Decorative background */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-cyan-400/10 rounded-full blur-2xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-indigo-400/15 to-purple-400/10 rounded-full blur-xl" />

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <span className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/30 flex items-center justify-center">
              <Wifi className="h-6 w-6 text-white" />
            </span>
            {/* Pulse animation */}
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse ring-2 ring-white dark:ring-slate-800" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">User ออนไลน์</div>
            <div className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
              {loading ? '...' : onlineData.count}
            </div>
          </div>
        </div>
        {!loading && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-white/60 dark:bg-slate-700/40 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            อัปเดตอัตโนมัติแบบเรียลไทม์
          </div>
        )}
      </div>

      {!loading && onlineData.users.length > 0 && (
        <div className="relative mt-4 space-y-2 max-h-44 overflow-auto">
          {onlineData.users.map(u => (
            <div key={u.id} className="flex items-center justify-between text-sm bg-white/80 dark:bg-slate-700/60 backdrop-blur px-3 py-2.5 rounded-xl border border-slate-200/50 dark:border-slate-600/50 hover:bg-white dark:hover:bg-slate-700 transition-colors">
              <div className="truncate flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700 flex items-center justify-center">
                  <User size={14} className="text-slate-500 dark:text-slate-300" />
                </div>
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-100">{u.name}</span>
                  <span className="ml-2 text-slate-400 dark:text-slate-500 text-xs">#{u.id}</span>
                </div>
              </div>
              <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold shadow-sm ${roleColors[u.role] || 'bg-gray-100 text-gray-700'}`}>
                {u.role}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============== Tabs ============== */
const tabsConf = [
  { key: 'dashboard', label: 'ภาพรวม', icon: LayoutDashboard },
  { key: 'tickets', label: 'ใบแจ้งซ่อม', icon: Ticket },
  { key: 'users', label: 'ผู้ใช้งาน', icon: UsersIcon },
  { key: 'inventory', label: 'ครุภัณฑ์', icon: Box },
  { key: 'analytics', label: 'รายงาน', icon: BarChart3 },
];

function Tabs({ value, onNavigate }) {
  return (
    <div className="sticky top-0 z-[1] border-b border-slate-200/70 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-900/60 backdrop-blur">
      <div className="px-4 lg:px-6">
        <div className="relative flex gap-2 py-3 overflow-x-auto">
          {tabsConf.map(t => {
            const Icon = t.icon;
            const active = value === t.key;
            return (
              <button
                key={t.key}
                onClick={() => onNavigate(t.key)}
                className={classNames(
                  'group relative px-4 py-2 rounded-xl text-sm font-semibold flex-shrink-0',
                  'transition-colors',
                  active
                    ? 'text-white bg-gradient-to-r from-indigo-600 to-violet-600 shadow-sm'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/70'
                )}
              >
                <span className="inline-flex items-center gap-2">
                  <Icon size={16} />
                  {t.label}
                </span>
                {active && (
                  <span className="absolute -bottom-[13px] left-1/2 -translate-x-1/2 h-1 w-10 rounded-full bg-indigo-500/90" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* -------------------- Tickets Panel -------------------- */
function TicketsPanel({ tickets, users, onAssign }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('All');

  const technicians = useMemo(() => users.filter(u => u.role === 'Technician'), [users]);
  const getName = (id) => users.find(u => u.id === id)?.name || 'Unknown';

  const filtered = useMemo(() => (
    tickets
      .filter(t => status === 'All' ? true : t.status === status)
      .filter(t => (t.title || '').toLowerCase().includes(q.toLowerCase()))
  ), [tickets, q, status]);

  const statusConfig = {
    Submitted: { gradient: 'from-blue-500 to-indigo-600', bg: 'bg-blue-500/10 border-blue-200 dark:border-blue-500/30', text: 'text-blue-600 dark:text-blue-400', icon: '📝' },
    Assigned: { gradient: 'from-violet-500 to-purple-600', bg: 'bg-violet-500/10 border-violet-200 dark:border-violet-500/30', text: 'text-violet-600 dark:text-violet-400', icon: '👤' },
    'In Progress': { gradient: 'from-amber-500 to-orange-600', bg: 'bg-amber-500/10 border-amber-200 dark:border-amber-500/30', text: 'text-amber-600 dark:text-amber-400', icon: '⚙️' },
    Completed: { gradient: 'from-emerald-500 to-green-600', bg: 'bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30', text: 'text-emerald-600 dark:text-emerald-400', icon: '✅' },
  };

  const stats = {
    Submitted: tickets.filter(t => t.status === 'Submitted').length,
    Assigned: tickets.filter(t => t.status === 'Assigned').length,
    'In Progress': tickets.filter(t => t.status === 'In Progress').length,
    Completed: tickets.filter(t => t.status === 'Completed').length,
  };

  return (
    <div className="space-y-5">
      {/* Header with Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">จัดการใบแจ้งซ่อม</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">ทั้งหมด {tickets.length} รายการ</p>
        </div>
      </div>

      {/* Status Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {['All', 'Submitted', 'Assigned', 'In Progress', 'Completed'].map(s => {
          const config = statusConfig[s];
          const count = s === 'All' ? tickets.length : stats[s];
          const isActive = status === s;
          return (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all
                ${isActive
                  ? `bg-gradient-to-r ${config?.gradient || 'from-slate-600 to-slate-700'} text-white shadow-lg`
                  : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              {config?.icon || '📋'} {s === 'All' ? 'ทั้งหมด' : s}
              <span className={`px-1.5 py-0.5 rounded-md text-xs ${isActive ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหาหัวข้อใบแจ้งซ่อม..."
          className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
        />
      </div>

      {/* Tickets Grid */}
      {filtered.length === 0 ? (
        <EmptyState title="ไม่มีใบแจ้งซ่อม" subtitle="ลองเปลี่ยนตัวกรอง" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(t => {
            const config = statusConfig[t.status] || statusConfig.Submitted;
            return (
              <div
                key={t.id}
                className="group relative overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-700/60 bg-white/90 dark:bg-slate-800/90 backdrop-blur hover:shadow-xl hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-300"
              >
                {/* Status Strip */}
                <div className={`h-1 w-full bg-gradient-to-r ${config.gradient}`} />

                <div className="p-4">
                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">#{t.id}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${config.bg} ${config.text}`}>
                          {config.icon} {t.status}
                        </span>
                      </div>
                      <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-2">{t.title}</h3>
                    </div>
                  </div>

                  {/* Info Grid */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-700/50">
                      <span className="text-slate-500 dark:text-slate-400">ผู้แจ้ง</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">{getName(t.user_id)}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-700/50">
                      <span className="text-slate-500 dark:text-slate-400">ช่าง</span>
                      {t.technician_id ? (
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">{getName(t.technician_id)}</span>
                      ) : (
                        <select
                          defaultValue=""
                          onChange={(e) => onAssign(t.id, e.target.value)}
                          className="text-xs font-semibold rounded-lg px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white border-none cursor-pointer hover:shadow-md transition"
                        >
                          <option value="" disabled>เลือกช่าง...</option>
                          {technicians.map(tech => (
                            <option key={tech.id} value={tech.id}>{tech.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    {t.created_at && (
                      <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-700/50">
                        <span className="text-slate-500 dark:text-slate-400">วันที่แจ้ง</span>
                        <span className="text-xs text-slate-600 dark:text-slate-400">{new Date(t.created_at).toLocaleDateString('th-TH')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* -------------------- Users Panel -------------------- */
function UsersPanel({ users, onRoleChange }) {
  const [searchQuery, setSearchQuery] = useState('');

  const roleConfig = {
    Admin: {
      gradient: 'from-red-500 to-rose-600',
      bg: 'bg-gradient-to-r from-red-500/10 to-rose-500/10 border-red-200/50 dark:border-red-500/30',
      text: 'text-red-600 dark:text-red-400'
    },
    Technician: {
      gradient: 'from-emerald-500 to-teal-600',
      bg: 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-200/50 dark:border-emerald-500/30',
      text: 'text-emerald-600 dark:text-emerald-400'
    },
    User: {
      gradient: 'from-blue-500 to-indigo-600',
      bg: 'bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-blue-200/50 dark:border-blue-500/30',
      text: 'text-blue-600 dark:text-blue-400'
    },
  };

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  };

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!users.length) return <EmptyState title="ยังไม่มีผู้ใช้งาน" />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">จัดการผู้ใช้งาน</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">ทั้งหมด {users.length} คน</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อหรืออีเมล..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-3">
        {['User', 'Technician', 'Admin'].map(role => {
          const count = users.filter(u => u.role === role).length;
          const config = roleConfig[role];
          return (
            <div key={role} className={`rounded-xl p-4 border backdrop-blur ${config.bg}`}>
              <p className={`text-2xl font-bold ${config.text}`}>{count}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">{role}</p>
            </div>
          );
        })}
      </div>

      {/* User Cards - Grouped by Role */}
      {['Admin', 'Technician', 'User'].map(role => {
        const roleUsers = filteredUsers.filter(u => u.role === role);
        if (roleUsers.length === 0) return null;
        const config = roleConfig[role];

        return (
          <div key={role} className="space-y-3">
            {/* Role Section Header */}
            <div className="flex items-center gap-3">
              <div className={`w-1 h-6 rounded-full bg-gradient-to-b ${config.gradient}`} />
              <h3 className={`text-lg font-bold ${config.text}`}>
                {role === 'Admin' && '👑 ผู้ดูแลระบบ'}
                {role === 'Technician' && '🔧 ช่างเทคนิค'}
                {role === 'User' && '👤 ผู้ใช้งานทั่วไป'}
              </h3>
              <span className="text-sm text-slate-500 dark:text-slate-400">({roleUsers.length})</span>
            </div>

            {/* Role Users Grid */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {roleUsers.map(u => (
                <div
                  key={u.id}
                  className="group relative overflow-hidden rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white/90 dark:bg-slate-800/90 backdrop-blur p-4 hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-300"
                >
                  {/* Decorative gradient */}
                  <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${config.gradient} opacity-5 rounded-full blur-2xl`} />

                  <div className="relative flex items-center gap-3">
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-md flex-shrink-0`}>
                      <span className="text-white font-bold text-xs">{getInitials(u.name)}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-900 dark:text-white truncate text-sm">{u.name}</h4>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">#{u.id}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{u.email}</p>
                    </div>
                  </div>

                  {/* Role Selector */}
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                    <select
                      value={u.role}
                      onChange={(e) => onRoleChange(u.id, e.target.value)}
                      className={`w-full text-xs font-semibold rounded-lg px-3 py-2 border cursor-pointer transition-all
                        ${u.role === 'Admin' ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white border-red-400' : ''}
                        ${u.role === 'Technician' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-emerald-400' : ''}
                        ${u.role === 'User' ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-blue-400' : ''}
                        hover:shadow-md focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500`}
                    >
                      <option value="User">👤 User</option>
                      <option value="Technician">🔧 Technician</option>
                      <option value="Admin">👑 Admin</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {filteredUsers.length === 0 && (
        <div className="text-center py-10 text-slate-500 dark:text-slate-400">
          ไม่พบผู้ใช้ที่ค้นหา
        </div>
      )}
    </div>
  );
}


/* -------------------- Inventory Panel -------------------- */
function InventoryPanel({ inventory, reload }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', location: '', purchase_date: '', status: 'In Use' });

  // ✅ เพิ่ม Token ในส่วนจัดการ Inventory ด้วย
  const getToken = () => localStorage.getItem('token');
  const getAuthHeader = () => ({ headers: { Authorization: `Bearer ${getToken()}` } });

  const openDialog = (item = null) => {
    setEditing(item);
    setForm(item ? { ...item, purchase_date: item.purchase_date?.split('T')[0] ?? '' } : { name: '', code: '', location: '', purchase_date: '', status: 'In Use' });
    setOpen(true);
  };

  const save = async () => {
    try {
      if (editing) await axios.put(`${API_BASE_URL}/api/inventory/${editing.id}`, form, getAuthHeader());
      else await axios.post(`${API_BASE_URL}/api/inventory`, form, getAuthHeader());
      setOpen(false); reload();
    } catch (e) { alert(e.response?.data?.error || 'Save failed'); }
  };

  const remove = async (id) => {
    if (window.confirm('ลบรายการนี้หรือไม่?')) {
      try {
        await axios.delete(`${API_BASE_URL}/api/inventory/${id}`, getAuthHeader());
        reload();
      } catch (e) { alert('Delete failed'); }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">รายการครุภัณฑ์</h2>
        <Button variant="contained" startIcon={<Plus />} onClick={() => openDialog()}>เพิ่มครุภัณฑ์</Button>
      </div>

      {inventory.length === 0 ? (
        <EmptyState title="ยังไม่มีครุภัณฑ์" />
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <TableContainer className="bg-white/80 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100">
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow className="bg-slate-100/80 dark:bg-slate-700/80">
                  <TableCell className="font-bold text-slate-700 dark:!text-white">ชื่อ</TableCell>
                  <TableCell className="font-bold text-slate-700 dark:!text-white">รหัส</TableCell>
                  <TableCell className="font-bold text-slate-700 dark:!text-white">สถานที่</TableCell>
                  <TableCell className="font-bold text-slate-700 dark:!text-white">สถานะ</TableCell>
                  <TableCell align="right" className="font-bold text-slate-700 dark:!text-white">การจัดการ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {inventory.map(it => (
                  <TableRow key={it.id} className="odd:bg-slate-50/50 dark:odd:bg-slate-800/50">
                    <TableCell className="font-medium">{it.name}</TableCell>
                    <TableCell>{it.code}</TableCell>
                    <TableCell>{it.location}</TableCell>
                    <TableCell>{it.status}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="แก้ไข">
                        <IconButton size="small" onClick={() => openDialog(it)}><Edit size={18} /></IconButton>
                      </Tooltip>
                      <Tooltip title="ลบ">
                        <IconButton size="small" onClick={() => remove(it.id)}><Delete size={18} /></IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} PaperProps={{ sx: { bgcolor: 'background.paper' } }}>
        <DialogTitle className="dark:!text-white">{editing ? 'แก้ไข' : 'เพิ่ม'}ครุภัณฑ์</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField label="ชื่อครุภัณฑ์" fullWidth margin="dense"
            value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            InputLabelProps={{ className: 'dark:!text-slate-300' }}
            inputProps={{ className: 'dark:!text-white' }}
          />
          <TextField label="รหัสครุภัณฑ์" fullWidth margin="dense"
            value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
            InputLabelProps={{ className: 'dark:!text-slate-300' }}
            inputProps={{ className: 'dark:!text-white' }}
          />
          <TextField label="สถานที่" fullWidth margin="dense"
            value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
            InputLabelProps={{ className: 'dark:!text-slate-300' }}
            inputProps={{ className: 'dark:!text-white' }}
          />
          <TextField label="วันที่ซื้อ" type="date" fullWidth margin="dense" InputLabelProps={{ shrink: true, className: 'dark:!text-slate-300' }}
            value={form.purchase_date} onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))}
            inputProps={{ className: 'dark:!text-white' }}
          />
          <TextField label="สถานะ" fullWidth margin="dense"
            value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            InputLabelProps={{ className: 'dark:!text-slate-300' }}
            inputProps={{ className: 'dark:!text-white' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>ยกเลิก</Button>
          <Button variant="contained" onClick={save}>บันทึก</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}


/* ============== Main Admin Dashboard ============== */
export default function AdminDashboard() {
  const socket = useSocket();
  const { section } = useParams();
  const navigate = useNavigate();

  const valid = ['dashboard', 'tickets', 'users', 'inventory', 'analytics'];
  const tab = valid.includes(section) ? section : 'dashboard';

  useEffect(() => {
    if (!valid.includes(section)) navigate('/admin/dashboard', { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [section, navigate]);

  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [error, setError] = useState('');

  const [onlineUsers, setOnlineUsers] = useState({ count: 0, users: [] });

  // ✅ Helper ในการดึง Token และสร้าง Header
  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchAll = useCallback(async () => {
    try {
      const config = getAuthHeader(); // ✅ สร้าง Header

      const [t, u, inv] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/tickets`, config),   // ✅ แนบ config
        axios.get(`${API_BASE_URL}/api/users`, config),     // ✅ แนบ config (แก้ 401 ตรงนี้!)
        axios.get(`${API_BASE_URL}/api/inventory`, config), // ✅ แนบ config
      ]);
      setTickets(Array.isArray(t.data) ? t.data : []);
      setUsers(Array.isArray(u.data) ? u.data : []);
      setInventory(Array.isArray(inv.data) ? inv.data : []);
      setError('');
    } catch (e) {
      if (e.response && e.response.status === 401) {
        setError('หมดเวลาใช้งาน กรุณาเข้าสู่ระบบใหม่');
        // อาจจะ navigate('/login') ถ้าต้องการ
      } else {
        setError('ไม่สามารถดึงข้อมูลเริ่มต้นได้');
      }
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!socket) return;

    socket.emit('join_admin_room');

    const onlineUsersHandler = (payload) => setOnlineUsers(payload);
    socket.on('all_users_online', onlineUsersHandler);

    const refresh = () => fetchAll();
    socket.on('new_ticket', refresh);
    socket.on('ticket_updated', refresh);
    socket.on('user_updated', refresh);
    socket.on('inventory_updated', refresh);
    socket.on('technician_availability_changed', refresh);

    return () => {
      socket.off('new_ticket', refresh);
      socket.off('ticket_updated', refresh);
      socket.off('user_updated', refresh);
      socket.off('inventory_updated', refresh);
      socket.off('technician_availability_changed', refresh);
      socket.off('all_users_online', onlineUsersHandler);
    };
  }, [socket, fetchAll]);

  // ✅ สร้างตัวแปรใหม่ที่กรองเฉพาะ User
  const onlineNormalUsers = useMemo(() => {
    const filteredUsers = onlineUsers.users.filter(u => u.role === 'User');
    return {
      count: filteredUsers.length,
      users: filteredUsers,
    };
  }, [onlineUsers]);

  const assignTicket = async (ticketId, technicianId) => {
    await axios.put(`${API_BASE_URL}/api/tickets/${ticketId}`, { technician_id: technicianId, status: 'Assigned' }, getAuthHeader());
  };
  const changeRole = async (userId, role) => {
    await axios.put(`${API_BASE_URL}/api/users/${userId}/role`, { role }, getAuthHeader());
  };

  const stats = useMemo(() => ({
    submitted: tickets.filter(t => t.status === 'Submitted').length,
    assigned: tickets.filter(t => t.status === 'Assigned').length,
    inProgress: tickets.filter(t => t.status === 'In Progress').length,
    completed: tickets.filter(t => t.status === 'Completed').length,
  }), [tickets]);

  return (
    <div className="space-y-6">
      <div className="mx-4 lg:mx-6 mt-2 rounded-3xl p-6 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">แผงควบคุมผู้ดูแลระบบ</h2>
            <p className="opacity-90 mt-1 text-sm">สรุปภาพรวมงานซ่อม ทีมช่าง และทรัพยากรทั้งหมด</p>
          </div>
          <SoftBadge tone="slate">Admin view</SoftBadge>
        </div>
      </div>

      <Tabs value={tab} onNavigate={(key) => navigate(`/admin/${key}`)} />

      {error && (
        <div className="mx-4 lg:mx-6 p-3 rounded-lg bg-red-100 text-red-700 border border-red-200">
          {error}
        </div>
      )}

      {/* DASHBOARD */}
      {tab === 'dashboard' && (
        <div className="px-4 lg:px-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="งานใหม่" value={stats.submitted} icon={AlertTriangle} gradient="from-amber-500 via-orange-500 to-red-500" />
            <StatCard title="มอบหมายแล้ว" value={stats.assigned} icon={UserCheck} gradient="from-violet-500 via-purple-500 to-fuchsia-500" />
            <StatCard title="กำลังดำเนินการ" value={stats.inProgress} icon={Hourglass} gradient="from-blue-500 via-cyan-500 to-teal-500" />
            <StatCard title="เสร็จสิ้น" value={stats.completed} icon={CheckCircle} gradient="from-emerald-500 via-green-500 to-lime-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* ✅ ส่งข้อมูลที่กรองแล้วเข้าไป */}
            <OnlineUsersCard onlineData={onlineNormalUsers} loading={!socket} />
            <div className="lg:col-span-1">
              <OnlineTechsCard />
            </div>
          </div>
        </div>
      )}

      {/* TICKETS */}
      {tab === 'tickets' && (
        <div className="px-4 lg:px-6">
          <TicketsPanel tickets={tickets} users={users} onAssign={assignTicket} />
        </div>
      )}

      {/* USERS */}
      {tab === 'users' && (
        <div className="px-4 lg:px-6">
          <UsersPanel users={users} onRoleChange={changeRole} />
        </div>
      )}

      {/* INVENTORY */}
      {tab === 'inventory' && (
        <div className="px-4 lg:px-6">
          <InventoryPanel inventory={inventory} reload={fetchAll} />
        </div>
      )}

      {/* ANALYTICS */}
      {tab === 'analytics' && (
        <div className="px-4 lg:px-6">
          <AnalyticsDashboard />
        </div>
      )}
    </div>
  );
} 