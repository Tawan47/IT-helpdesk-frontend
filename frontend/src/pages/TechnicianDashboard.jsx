import React, { useState, useEffect, useCallback, useMemo } from 'react';
import TicketList from '../components/TicketList';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import {
  HardHat, CheckCircle, ToggleLeft, ToggleRight,
  RefreshCcw, Hand, Clock3, Search, Filter, LayoutGrid, ListChecks,
  Sparkles, Calendar, ArrowRight, Zap
} from 'lucide-react';
import axios from 'axios';

// ใช้ environment variable สำหรับ API URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function Pill({ active, onClick, children, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
        ${active
          ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 scale-[1.02]'
          : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:scale-[1.01]'}`}
    >
      {Icon && <Icon size={16} className={active ? 'text-white' : 'text-slate-400'} />}
      {children}
    </button>
  );
}

function TechStatCard({ title, value, icon: Icon, gradient, shadowColor }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 shadow-lg ${shadowColor} bg-gradient-to-br ${gradient} hover:scale-[1.02] transition-all duration-300`}>
      {/* Decorative elements */}
      <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-xl" />
      <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/10 rounded-full blur-lg" />

      <div className="relative flex items-center gap-4">
        <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm shadow-inner">
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="text-4xl font-extrabold text-white tracking-tight drop-shadow-sm">{value}</p>
          <p className="text-sm font-medium text-white/80 mt-1">{title}</p>
        </div>
      </div>
    </div>
  );
}

function AvailabilityPill({ on, onToggle, disabled }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 
        ${on
          ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl'
          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600'}
        ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      title={on ? 'คลิกเพื่อปิดรับงาน' : 'คลิกเพื่อเปิดรับงาน'}
    >
      {on ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
      {on ? 'กำลังรับงาน' : 'ปิดรับงานอยู่'}
    </button>
  );
}

// Status configuration for badge colors
const statusConfig = {
  Submitted: { gradient: 'from-blue-500 to-indigo-600', bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
  Assigned: { gradient: 'from-violet-500 to-purple-600', bg: 'bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400' },
  'In Progress': { gradient: 'from-amber-500 to-orange-600', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
  Completed: { gradient: 'from-emerald-500 to-green-600', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
};

export default function TechnicianDashboard() {
  const { currentUser, setCurrentUser } = useAuth();
  const socket = useSocket();
  const technicianId = currentUser?.id;

  const [allTickets, setAllTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // UI state
  const [tab, setTab] = useState('mine'); // 'mine' | 'queue'
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('All'); // All | Submitted | Assigned | In Progress | Completed

  const accepting = !!(currentUser?.accepting_jobs ?? 1);

  // ✅ Helper สำหรับดึง Token
  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  // ===== ดึงข้อมูลทั้งหมด =====
  const fetchData = useCallback(async () => {
    const currentId = technicianId || 1;

    try {
      setLoading(true);
      setError('');
      const config = getAuthHeader();

      const [tRes, uRes, meRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/tickets`, config),
        axios.get(`${API_BASE_URL}/api/users`, config),
        axios.get(`${API_BASE_URL}/api/me`, { ...config, params: { userId: currentId } })
      ]);
      setAllTickets(Array.isArray(tRes.data) ? tRes.data : []);
      setUsers(Array.isArray(uRes.data) ? uRes.data : []);
      if (meRes?.data?.accepting_jobs !== undefined) {
        setCurrentUser(prev => ({ ...prev, accepting_jobs: meRes.data.accepting_jobs }));
      }
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 401) {
        setError('เซสชั่นหมดอายุ กรุณาเข้าสู่ระบบใหม่');
      } else {
        setAllTickets([
          { id: 101, title: 'เครื่องพิมพ์ไม่ทำงาน', description: 'กระดาษติด เครื่องร้องเตือน', status: 'Submitted', created_at: new Date().toISOString(), user_id: 2 },
          { id: 102, title: 'WiFi เชื่อมต่อไม่ได้', description: 'ชั้น 3 ห้องประชุม', status: 'Assigned', technician_id: currentId, created_at: new Date().toISOString(), user_id: 3 }
        ]);
      }
    } finally {
      setLoading(false);
    }
  }, [technicianId, setCurrentUser]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ===== Realtime sync =====
  useEffect(() => {
    if (!socket) return;
    const refresh = () => fetchData();
    if (socket.on) {
      socket.on('ticket_updated', refresh);
      socket.on('new_ticket', refresh);
      return () => {
        socket.off('ticket_updated', refresh);
        socket.off('new_ticket', refresh);
      };
    }
  }, [socket, fetchData]);

  // ===== Toggle รับงาน =====
  const toggleAvailability = async () => {
    const currentId = technicianId || 1;
    if (saving) return;
    setSaving(true);
    try {
      const config = getAuthHeader();
      const res = await axios.put(
        `${API_BASE_URL}/api/me/availability`,
        { accepting: !accepting },
        { ...config, params: { userId: currentId } }
      );
      setCurrentUser(prev => ({ ...prev, accepting_jobs: res.data.accepting_jobs }));
    } catch (e) {
      console.error(e);
      setCurrentUser(prev => ({ ...prev, accepting_jobs: !prev.accepting_jobs }));
    } finally { setSaving(false); }
  };

  // ===== เคลมงาน (Optimistic Update) =====
  const claimTicket = async (ticketId) => {
    const currentId = technicianId || 1;
    setAllTickets(prev =>
      prev.map(t => t.id === ticketId ? { ...t, technician_id: currentId, status: 'Assigned' } : t)
    );
    try {
      await axios.put(`${API_BASE_URL}/api/tickets/${ticketId}`, {
        technician_id: currentId,
        status: 'Assigned'
      }, getAuthHeader());

      setTab('mine');
    } catch (e) {
      console.error(e);
    }
  };

  // ===== อัปเดตสถานะงาน =====
  const handleUpdateStatus = async (ticketId, newStatus) => {
    setAllTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
    try {
      await axios.put(`${API_BASE_URL}/api/tickets/${ticketId}`, { status: newStatus }, getAuthHeader());
    } catch (err) {
      console.error(err);
    }
  };

  // ===== แยกเซ็ต & ฟิลเตอร์ =====
  const myTickets = useMemo(
    () => allTickets.filter(t => t.technician_id === (technicianId || 1)),
    [allTickets, technicianId]
  );
  const queueTickets = useMemo(
    () => allTickets.filter(t => !t.technician_id && t.status !== 'Completed'),
    [allTickets]
  );

  const filterByQS = (arr) => {
    const s = q.trim().toLowerCase();
    return arr.filter(t => {
      const statusOk = status === 'All' ? true : (t.status === status);
      const textOk = !s
        ? true
        : (t.title || '').toLowerCase().includes(s) ||
        (t.description || '').toLowerCase().includes(s) ||
        String(t.id).includes(s);
      return statusOk && textOk;
    });
  };

  const filteredMine = useMemo(() => filterByQS(myTickets), [myTickets, q, status]);
  const filteredQueue = useMemo(() => filterByQS(queueTickets), [queueTickets, q, status]);

  // ===== Stats =====
  const stats = useMemo(() => ({
    pending: myTickets.filter(t => t.status !== 'Completed').length,
    completed: myTickets.filter(t => t.status === 'Completed').length,
    queue: queueTickets.length
  }), [myTickets, queueTickets]);

  // ===== Loader Skeleton =====
  const Skeleton = ({ rows = 4 }) => (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-700 animate-pulse" />
      ))}
    </div>
  );

  // Get user name by ID
  const getUserName = (userId) => users.find(u => u.id === userId)?.name || 'ไม่ทราบ';

  return (
    <div className="space-y-6 pb-[max(env(safe-area-inset-bottom),12px)]">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/70 dark:border-slate-700/60 shadow-xl">
        <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 p-6 md:p-8">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg">
                <HardHat className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2">
                  แดชบอร์ดช่าง
                  <Sparkles className="h-5 w-5 text-yellow-300" />
                </h1>
                <p className="text-white/80 text-sm md:text-base">จัดการงานที่ได้รับมอบหมายและคิวรอรับ</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchData}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm transition-all font-medium"
                title="รีเฟรช"
              >
                <RefreshCcw size={18} /> <span className="hidden sm:inline">รีเฟรช</span>
              </button>
              <AvailabilityPill on={accepting} onToggle={toggleAvailability} disabled={saving} />
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-6 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <TechStatCard
            title="งานที่ต้องทำ"
            value={stats.pending}
            icon={Clock3}
            gradient="from-amber-500 via-orange-500 to-red-500"
            shadowColor="shadow-orange-500/20"
          />
          <TechStatCard
            title="งานที่เสร็จแล้ว"
            value={stats.completed}
            icon={CheckCircle}
            gradient="from-emerald-500 via-green-500 to-teal-500"
            shadowColor="shadow-emerald-500/20"
          />
          <TechStatCard
            title="คิวรอรับ"
            value={stats.queue}
            icon={Hand}
            gradient="from-blue-500 via-indigo-500 to-violet-500"
            shadowColor="shadow-indigo-500/20"
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="rounded-2xl border border-slate-200/70 dark:border-slate-700/60 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-lg p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Tabs */}
          <div className="flex items-center gap-3">
            <Pill active={tab === 'mine'} onClick={() => setTab('mine')} icon={ListChecks}>
              งานของฉัน
            </Pill>
            <Pill active={tab === 'queue'} onClick={() => setTab('queue')} icon={LayoutGrid}>
              คิวรอรับ
            </Pill>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ค้นหาหัวข้อ/รายละเอียด/ID"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-400 hidden sm:inline" />
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 transition"
                title="ตัวกรองสถานะ"
              >
                {['All', 'Submitted', 'Assigned', 'In Progress', 'Completed'].map(s => (
                  <option key={s} value={s}>{s === 'All' ? 'ทุกสถานะ' : s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-gradient-to-r from-red-500/10 to-rose-500/10 border border-red-200 dark:border-red-500/30 p-4 rounded-xl text-red-600 dark:text-red-400 text-center font-medium">
          {error}
        </div>
      )}

      {/* CONTENT */}
      {loading ? (
        <Skeleton rows={4} />
      ) : tab === 'mine' ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              ทั้งหมด <span className="text-indigo-600 dark:text-indigo-400 font-bold">{filteredMine.length}</span> รายการ
            </p>
          </div>
          <TicketList
            tickets={filteredMine}
            userType="Technician"
            onUpdateStatus={handleUpdateStatus}
            users={users}
          />
        </section>
      ) : (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              ทั้งหมด <span className="text-indigo-600 dark:text-indigo-400 font-bold">{filteredQueue.length}</span> รายการ
            </p>
          </div>

          {filteredQueue.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 p-12 text-center">
              <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-700 w-fit mx-auto mb-4">
                <Hand className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-600 dark:text-slate-300 font-medium">ไม่มีงานรอรับตามเงื่อนไข</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">ลองเปลี่ยนตัวกรองหรือรอให้มีงานใหม่เข้ามา</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredQueue.map(t => {
                const config = statusConfig[t.status] || statusConfig.Submitted;
                return (
                  <div
                    key={t.id}
                    className="group relative overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-700/60 bg-white/90 dark:bg-slate-800/90 backdrop-blur hover:shadow-xl hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all duration-300"
                  >
                    {/* Status Strip */}
                    <div className={`h-1.5 w-full bg-gradient-to-r ${config.gradient}`} />

                    <div className="p-5">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                            #{t.id}
                          </span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${config.bg} ${config.text}`}>
                            {t.status}
                          </span>
                        </div>
                      </div>

                      <h3 className="font-bold text-slate-900 dark:text-white line-clamp-1 text-base">{t.title}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mt-2">{t.description || '-'}</p>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50 space-y-2 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                          <Calendar size={12} />
                          <span>{new Date(t.created_at).toLocaleDateString('th-TH')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>ผู้แจ้ง:</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">{getUserName(t.user_id)}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => claimTicket(t.id)}
                        className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold hover:shadow-lg hover:shadow-indigo-500/30 hover:scale-[1.02] transition-all"
                        title="รับงานนี้"
                      >
                        <Zap size={18} /> รับงานนี้
                        <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}