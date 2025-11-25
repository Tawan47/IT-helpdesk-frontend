import React, { useState, useEffect, useCallback, useMemo } from 'react';
import TicketList from '../components/TicketList';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import {
  HardHat, CheckCircle, ToggleLeft, ToggleRight,
  RefreshCcw, Hand, Clock3, Search, Filter, LayoutGrid, ListChecks
} from 'lucide-react';
import axios from 'axios';

// กำหนด URL ตรงๆ เพื่อเลี่ยงปัญหา import.meta ในหน้า Preview
const API_BASE_URL = 'http://localhost:5000';

function Pill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-full text-sm font-semibold transition
        ${active
          ? 'bg-indigo-600 text-white shadow'
          : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600'}`}
    >
      {children}
    </button>
  );
}

function TechStatCard({ title, value, icon: Icon, gradient }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
      <div className={`p-4 text-white ${gradient} flex items-center gap-3`}>
        <Icon className="h-5 w-5 opacity-95" />
        <p className="text-sm/5 font-semibold">{title}</p>
      </div>
      <div className="p-5 bg-white dark:bg-slate-800">
        <p className="text-4xl font-extrabold text-slate-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

function AvailabilityPill({ on, onToggle, disabled }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border transition 
        ${on ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700' 
             : 'bg-slate-200 text-slate-700 border-slate-300 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600'}
        ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      title={on ? 'คลิกเพื่อปิดรับงาน' : 'คลิกเพื่อเปิดรับงาน'}
    >
      {on ? <ToggleRight size={18}/> : <ToggleLeft size={18}/>}
      {on ? 'กำลังรับงาน' : 'ปิดรับงานอยู่'}
    </button>
  );
}

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
  const [view, setView] = useState('grid'); // grid | list

  const accepting = !!(currentUser?.accepting_jobs ?? 1);

  // ✅ Helper สำหรับดึง Token
  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  // ===== ดึงข้อมูลทั้งหมด =====
  const fetchData = useCallback(async () => {
    // ใน Mock Mode ของ Preview อาจไม่มี ID แต่เราจะให้ทำงานต่อไปเพื่อแสดงผล
    const currentId = technicianId || 1; 
    
    try {
      setLoading(true);
      setError('');
      const config = getAuthHeader(); // ✅ สร้าง Header

      const [tRes, uRes, meRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/tickets`, config), // ✅ แนบ config
        axios.get(`${API_BASE_URL}/api/users`, config),   // ✅ แนบ config
        axios.get(`${API_BASE_URL}/api/me`, { ...config, params: { userId: currentId } }) // ✅ แนบ config + params
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
        // ถ้า Backend ไม่ได้รันอยู่ (ใน Preview) ให้แสดงข้อมูลจำลองแทน
        setAllTickets([
            { id: 101, title: 'เครื่องพิมพ์ไม่ทำงาน', description: 'กระดาษติด เครื่องร้องเตือน', status: 'Submitted', created_at: new Date().toISOString(), user_id: 2 },
            { id: 102, title: 'WiFi เชื่อมต่อไม่ได้', description: 'ชั้น 3 ห้องประชุม', status: 'Assigned', technician_id: currentId, created_at: new Date().toISOString(), user_id: 3 }
        ]);
        // setError('ไม่สามารถดึงข้อมูลได้ (แสดงข้อมูลจำลอง)');
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
    // ป้องกัน error ถ้า socket เป็น mock
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
    // Mock ID if needed
    const currentId = technicianId || 1;
    if (saving) return;
    setSaving(true);
    try {
      const config = getAuthHeader();
      // ✅ แนบ config + params
      const res = await axios.put(
        `${API_BASE_URL}/api/me/availability`,
        { accepting: !accepting },
        { ...config, params: { userId: currentId } }
      );
      setCurrentUser(prev => ({ ...prev, accepting_jobs: res.data.accepting_jobs }));
    } catch (e) {
      console.error(e);
      // Mock succes for preview
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
      // ✅ แนบ getAuthHeader()
      await axios.put(`${API_BASE_URL}/api/tickets/${ticketId}`, {
        technician_id: currentId,
        status: 'Assigned'
      }, getAuthHeader());
      
      setTab('mine');
    } catch (e) {
      console.error(e);
      // ใน Preview ไม่ต้องแจ้ง Error ถ้ายิง API ไม่ได้
    }
  };

  // ===== อัปเดตสถานะงาน =====
  const handleUpdateStatus = async (ticketId, newStatus) => {
    setAllTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
    try {
      // ✅ แนบ getAuthHeader()
      await axios.put(`${API_BASE_URL}/api/tickets/${ticketId}`, { status: newStatus }, getAuthHeader());
    } catch (err) {
      console.error(err);
      // ใน Preview ไม่ต้องแจ้ง Error
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
  const Skeleton = ({ rows=4 }) => (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_,i) => (
        <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-700 animate-pulse" />
      ))}
    </div>
  );

  return (
    <div className="space-y-6 md:space-y-8 pb-[max(env(safe-area-inset-bottom),12px)]">
      {/* Hero/หัวข้อแบบ Glass + Gradient */}
      <div className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-md">
        <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 p-4 sm:p-6 md:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/15 backdrop-blur">
                <HardHat className="text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white">แดชบอร์ดช่าง</h1>
                <p className="text-white/80 text-sm md:text-base">จัดการงานที่ได้รับมอบหมายและคิวรอรับ</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchData}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/15 text-white hover:bg-white/25"
                title="รีเฟรช"
              >
                <RefreshCcw size={18} /> <span className="hidden sm:inline">รีเฟรช</span>
              </button>
              <AvailabilityPill on={accepting} onToggle={toggleAvailability} disabled={saving} />
            </div>
          </div>
        </div>

        {/* แถวสถิติ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 p-4 sm:p-6 bg-white dark:bg-slate-900">
          <TechStatCard
            title="งานที่ต้องทำ"
            value={stats.pending}
            icon={Clock3}
            gradient="bg-gradient-to-r from-amber-500 to-orange-600"
          />
          <TechStatCard
            title="งานที่เสร็จสิ้นแล้ว"
            value={stats.completed}
            icon={CheckCircle}
            gradient="bg-gradient-to-r from-emerald-500 to-teal-600"
          />
          <TechStatCard
            title="คิวรอรับ"
            value={stats.queue}
            icon={Hand}
            gradient="bg-gradient-to-r from-indigo-500 to-violet-600"
          />
        </div>
      </div>

      {/* Toolbar: Tabs + Search + Filter (เป็นคอลัมน์บนมือถือ) */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 backdrop-blur px-3 py-3 sm:px-4 sm:py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Pill active={tab==='mine'} onClick={()=>setTab('mine')}>
            <ListChecks className="inline-block -mt-0.5 mr-1" size={16}/> งานของฉัน
          </Pill>
          <Pill active={tab==='queue'} onClick={()=>setTab('queue')}>
            <LayoutGrid className="inline-block -mt-0.5 mr-1" size={16}/> คิวรอรับ
          </Pill>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center md:justify-end">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"/>
            <input
              value={q}
              onChange={(e)=>setQ(e.target.value)}
              placeholder="ค้นหาหัวข้อ/รายละเอียด/ID"
              className="w-full pl-9 pr-3 py-2 rounded-xl border text-base sm:text-sm
                           border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900
                           text-slate-800 dark:text-slate-100"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-500 hidden sm:inline" />
            <select
              value={status}
              onChange={(e)=>setStatus(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 rounded-xl border text-base sm:text-sm
                           border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900
                           text-slate-800 dark:text-slate-100"
              title="ตัวกรองสถานะ"
            >
              {['All','Submitted','Assigned','In Progress','Completed'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {tab==='queue' && (
            <div className="flex gap-2">
              <Pill active={view==='grid'} onClick={()=>setView('grid')}>Grid</Pill>
              <Pill active={view==='list'} onClick={()=>setView('list')}>List</Pill>
            </div>
          )}
        </div>
      </div>

      {error && <p className="bg-red-100 text-red-700 p-3 rounded-lg text-center">{error}</p>}

      {/* CONTENT */}
      {loading ? (
        <Skeleton rows={6}/>
      ) : tab === 'mine' ? (
        <section>
          <div className="mb-3 text-sm text-slate-500 dark:text-slate-400">
            ทั้งหมด {filteredMine.length} รายการ
          </div>
          {/* ใช้ TicketList เดิม */}
          <TicketList
            tickets={filteredMine}
            userType="Technician"
            onUpdateStatus={handleUpdateStatus}
            users={users}
          />
        </section>
      ) : (
        <section>
          <div className="mb-3 text-sm text-slate-500 dark:text-slate-400">
            ทั้งหมด {filteredQueue.length} รายการ
          </div>

          {filteredQueue.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 p-10 text-center text-slate-600 dark:text-slate-300">
              ไม่มีงานรอรับตามเงื่อนไข
            </div>
          ) : view === 'list' ? (
            <div className="overflow-auto rounded-2xl border border-slate-200 dark:border-slate-700">
              <table className="min-w-full text-sm bg-white dark:bg-slate-800">
                <thead className="text-left bg-slate-50 dark:bg-slate-700/60 text-slate-600 dark:text-slate-200">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">หัวข้อ</th>
                    <th className="px-4 py-3">รายละเอียด</th>
                    <th className="px-4 py-3">แจ้งเมื่อ</th>
                    <th className="px-4 py-3 w-40">การทำงาน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredQueue.map(t => (
                    <tr key={t.id} className="text-slate-800 dark:text-slate-100">
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-300">#{t.id}</td>
                      <td className="px-4 py-3 font-semibold">{t.title}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 line-clamp-2">{t.description || '-'}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                        {new Date(t.created_at).toLocaleString('th-TH')}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => claimTicket(t.id)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                        >
                          <Hand size={16}/> รับงาน
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredQueue.map(t => (
                <div key={t.id} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 hover:shadow-md transition">
                  <div className="min-w-0">
                    <div className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 inline-block mb-1">
                      #{t.id}
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-1">{t.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mt-1">{t.description || '-'}</p>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      แจ้งเมื่อ {new Date(t.created_at).toLocaleString('th-TH')}
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => claimTicket(t.id)}
                      className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                      title="รับงานนี้"
                    >
                      <Hand size={16}/> รับงาน
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}