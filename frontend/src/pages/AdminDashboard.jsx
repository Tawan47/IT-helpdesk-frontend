import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSocket } from '../contexts/SocketContext';
import AnalyticsDashboard from './AnalyticsDashboard';
import OnlineTechsCard from '../components/OnlineTechsCard';

import {
  Search, Filter, Plus, Edit, Delete,
  AlertTriangle, UserCheck, Hourglass, CheckCircle,
  LayoutDashboard, Ticket, Users, Box, BarChart3
} from 'lucide-react';

import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, IconButton, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Tooltip, TextField
} from '@mui/material';

// ✅ 1. แก้ไขการกำหนดค่า Base URL ให้ถูกต้อง
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/* ============== small helpers ============== */
function classNames(...a) { return a.filter(Boolean).join(' '); }

const SoftBadge = ({ children, tone = 'slate' }) => {
  const toneMap = {
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-700/60 dark:text-slate-100',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
    violet: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    emerald:'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
  };
  return <span className={classNames('px-2 py-1 rounded-full text-xs font-semibold', toneMap[tone])}>{children}</span>;
};

const EmptyState = ({ title = 'ยังไม่มีข้อมูล', subtitle = 'ลองปรับตัวกรองหรือเพิ่มรายการใหม่' }) => (
  <div className="py-16 text-center bg-gradient-to-b from-slate-800/40 to-slate-800/20 dark:from-slate-800/40 dark:to-slate-800/10 rounded-2xl border border-slate-200/50 dark:border-slate-700/60 shadow-inner">
    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-700/30">
      <BarChart3 className="text-slate-300" size={20}/>
    </div>
    <p className="text-lg font-bold text-slate-800 dark:text-white">{title}</p>
    <p className="mt-1 text-slate-600 dark:text-slate-300">{subtitle}</p>
  </div>
);

const StatCard = ({ title, value, icon: Icon, gradient }) => (
  <div
    className={classNames(
      'relative overflow-hidden rounded-2xl p-5 shadow-sm border',
      'border-slate-200/70 dark:border-slate-700/60',
      'bg-white/80 dark:bg-slate-800/80 backdrop-blur',
      'hover:shadow-md transition-shadow'
    )}
  >
    <div className={classNames(
      'absolute inset-0 opacity-60 pointer-events-none',
      gradient || 'bg-gradient-to-br from-violet-500/10 via-transparent to-transparent'
    )}/>
    <div className="relative flex items-center gap-4">
      <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-900/40 shadow-inner">
        <Icon className="h-6 w-6 text-slate-800 dark:text-slate-100"/>
      </div>
      <div>
        <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-none">{value}</p>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mt-1">{title}</p>
      </div>
    </div>
  </div>
);

/* ============== Tabs ============== */
const tabsConf = [
  { key: 'dashboard', label: 'ภาพรวม', icon: LayoutDashboard },
  { key: 'tickets',   label: 'ใบแจ้งซ่อม', icon: Ticket },
  { key: 'users',     label: 'ผู้ใช้งาน', icon: Users },
  { key: 'inventory', label: 'ครุภัณฑ์', icon: Box },
  { key: 'analytics', label: 'รายงาน', icon: BarChart3 },
];

function Tabs({ value, onNavigate }) {
  return (
    <div className="sticky top-0 z-[1] border-b border-slate-200/70 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-900/60 backdrop-blur">
      <div className="px-4 lg:px-6">
        <div className="relative flex gap-2 py-3">
          {tabsConf.map(t => {
            const Icon = t.icon;
            const active = value === t.key;
            return (
              <button
                key={t.key}
                onClick={() => onNavigate(t.key)}
                className={classNames(
                  'group relative px-4 py-2 rounded-xl text-sm font-semibold',
                  'transition-colors',
                  active
                    ? 'text-white bg-gradient-to-r from-indigo-600 to-violet-600 shadow-sm'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/70'
                )}
              >
                <span className="inline-flex items-center gap-2">
                  <Icon size={16}/>
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

/* -------------------- Tickets Panel (updated text color in dark mode) -------------------- */
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

  const statusTone = (s) => ({
    Submitted: 'blue',
    Assigned: 'violet',
    'In Progress': 'amber',
    Completed: 'emerald',
  }[s] ?? 'slate');

  return (
    <div className="space-y-4">
      {/* Sticky filters */}
      <div className="sticky top-[64px] z-[1] bg-slate-50/60 dark:bg-slate-900/60 backdrop-blur p-3 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400"/>
            <input
              value={q}
              onChange={(e)=>setQ(e.target.value)}
              placeholder="ค้นหาหัวข้อใบแจ้งซ่อม…"
              className="w-full pl-10 pr-3 py-2 rounded-lg bg-white/90 dark:bg-slate-800/90 border border-slate-300/70 dark:border-slate-600 text-slate-800 dark:text-slate-100 shadow-inner"
            />
          </div>
          <div className="relative w-full sm:w-64">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400"/>
            <select
              value={status}
              onChange={(e)=>setStatus(e.target.value)}
              className="w-full pl-10 pr-8 py-2 rounded-lg bg-white/90 dark:bg-slate-800/90 border border-slate-300/70 dark:border-slate-600 text-slate-800 dark:text-slate-100 shadow-inner"
            >
              <option value="All">สถานะทั้งหมด</option>
              <option value="Submitted">Submitted</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="ไม่มีใบแจ้งซ่อม" subtitle="ลองเปลี่ยนตัวกรองหรือเพิ่มงานใหม่" />
      ) : (
        <div className="rounded-2xl border border-slate-200/70 dark:border-slate-700/60 overflow-hidden shadow-sm">
          {/* ⬇️ ใส่สีตัวหนังสือระดับ container เพื่อให้ลูกหลานครอบคลุม */}
          <TableContainer className="bg-white/80 dark:bg-slate-800/80 backdrop-blur text-slate-800 dark:text-slate-100">
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow className="bg-slate-100/80 dark:bg-slate-700/80">
                  <TableCell className="font-bold text-slate-700 dark:text-white">หัวข้อ</TableCell>
                  <TableCell className="font-bold text-slate-700 dark:text-white">ผู้แจ้ง</TableCell>
                  <TableCell className="font-bold text-slate-700 dark:text-white">สถานะ</TableCell>
                  <TableCell className="font-bold text-slate-700 dark:text-white">มอบหมายให้</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map(t => (
                  <TableRow
                    key={t.id}
                    className="odd:bg-slate-50/50 dark:odd:bg-slate-800/50 hover:bg-slate-100/70 dark:hover:bg-slate-700/60 transition-colors"
                  >
                    <TableCell className="font-medium text-slate-800 dark:text-slate-100">
                      {t.title}
                    </TableCell>
                    <TableCell className="text-slate-700 dark:text-slate-100">
                      {getName(t.user_id)}
                    </TableCell>
                    <TableCell className="text-slate-700 dark:text-slate-100">
                      <SoftBadge tone={statusTone(t.status)}>{t.status}</SoftBadge>
                    </TableCell>
                    <TableCell className="text-slate-700 dark:text-slate-100">
                      {t.technician_id ? (
                        <span>{getName(t.technician_id)}</span>
                      ) : (
                        <select
                          defaultValue=""
                          onChange={(e)=>onAssign(t.id, e.target.value)}
                          className="text-sm rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white px-2 py-1"
                        >
                          <option value="" disabled>เลือกช่าง…</option>
                          {technicians.map(tech=>(
                            <option key={tech.id} value={tech.id}>{tech.name}</option>
                          ))}
                        </select>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
      )}
    </div>
  );
}

/* -------------------- Users Panel (dark text = white) -------------------- */
function UsersPanel({ users, onRoleChange }) {
  if (!users.length) return <EmptyState title="ยังไม่มีผู้ใช้งาน" />;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
      {/* ⬇️ ครอบสีตัวอักษรที่ TableContainer */}
      <TableContainer className="bg-white/80 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100">
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow className="bg-slate-100/80 dark:bg-slate-700/80">
              <TableCell className="font-bold text-slate-700 dark:!text-white">ชื่อ-สกุล</TableCell>
              <TableCell className="font-bold text-slate-700 dark:!text-white">อีเมล</TableCell>
              <TableCell className="font-bold text-slate-700 dark:!text-white">บทบาท</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map(u => (
              <TableRow key={u.id} className="odd:bg-slate-50/50 dark:odd:bg-slate-800/50">
                <TableCell className="text-slate-800 dark:!text-slate-100 font-medium">{u.name}</TableCell>
                <TableCell className="text-slate-700 dark:!text-slate-100">{u.email}</TableCell>
                <TableCell className="text-slate-700 dark:!text-slate-100">
                  <select
                    value={u.role}
                    onChange={(e)=>onRoleChange(u.id, e.target.value)}
                    className="text-sm rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white px-2 py-1"
                  >
                    <option value="User">User</option>
                    <option value="Technician">Technician</option>
                    <option value="Admin">Admin</option>
                  </select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}


/* -------------------- Inventory Panel (dark text = white) -------------------- */
function InventoryPanel({ inventory, reload }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', location: '', purchase_date: '', status: 'In Use' });

  const openDialog = (item=null) => {
    setEditing(item);
    setForm(item ? { ...item, purchase_date: item.purchase_date?.split('T')[0] ?? '' } : { name:'', code:'', location:'', purchase_date:'', status:'In Use' });
    setOpen(true);
  };

  const save = async () => {
    // ✅ 2. แก้ไขการเรียก API ทั้งหมดในฟังก์ชันนี้
    if (editing) await axios.put(`${API_BASE_URL}/api/inventory/${editing.id}`, form);
    else await axios.post(`${API_BASE_URL}/api/inventory`, form);
    setOpen(false); reload();
  };

  const remove = async (id) => {
    if (confirm('ลบรายการนี้หรือไม่?')) {
      // ✅ 3. แก้ไขการเรียก API
      await axios.delete(`${API_BASE_URL}/api/inventory/${id}`);
      reload();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">รายการครุภัณฑ์</h2>
        <Button variant="contained" startIcon={<Plus />} onClick={()=>openDialog()}>เพิ่มครุภัณฑ์</Button>
      </div>

      {inventory.length === 0 ? (
        <EmptyState title="ยังไม่มีครุภัณฑ์" />
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          {/* ⬇️ ครอบสีตัวอักษรที่ TableContainer */}
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
                    <TableCell className="text-slate-800 dark:!text-slate-100 font-medium">{it.name}</TableCell>
                    <TableCell className="text-slate-700 dark:!text-slate-100">{it.code}</TableCell>
                    <TableCell className="text-slate-700 dark:!text-slate-100">{it.location}</TableCell>
                    <TableCell className="text-slate-700 dark:!text-slate-100">{it.status}</TableCell>
                    <TableCell align="right" className="text-slate-700 dark:!text-slate-100">
                      <Tooltip title="แก้ไข">
                        <IconButton size="small" onClick={()=>openDialog(it)}><Edit size={18}/></IconButton>
                      </Tooltip>
                      <Tooltip title="ลบ">
                        <IconButton size="small" onClick={()=>remove(it.id)}><Delete size={18}/></IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
      )}

      <Dialog open={open} onClose={()=>setOpen(false)} PaperProps={{ sx:{ bgcolor:'background.paper' } }}>
        <DialogTitle className="dark:!text-white">{editing ? 'แก้ไข' : 'เพิ่ม'}ครุภัณฑ์</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField label="ชื่อครุภัณฑ์" fullWidth margin="dense"
            value={form.name} onChange={e=>setForm(f=>({ ...f, name:e.target.value }))}
            InputLabelProps={{ className: 'dark:!text-slate-300' }}
            inputProps={{ className: 'dark:!text-white' }}
          />
          <TextField label="รหัสครุภัณฑ์" fullWidth margin="dense"
            value={form.code} onChange={e=>setForm(f=>({ ...f, code:e.target.value }))}
            InputLabelProps={{ className: 'dark:!text-slate-300' }}
            inputProps={{ className: 'dark:!text-white' }}
          />
          <TextField label="สถานที่" fullWidth margin="dense"
            value={form.location} onChange={e=>setForm(f=>({ ...f, location:e.target.value }))}
            InputLabelProps={{ className: 'dark:!text-slate-300' }}
            inputProps={{ className: 'dark:!text-white' }}
          />
          <TextField label="วันที่ซื้อ" type="date" fullWidth margin="dense" InputLabelProps={{ shrink:true, className:'dark:!text-slate-300' }}
            value={form.purchase_date} onChange={e=>setForm(f=>({ ...f, purchase_date:e.target.value }))}
            inputProps={{ className: 'dark:!text-white' }}
          />
          <TextField label="สถานะ" fullWidth margin="dense"
            value={form.status} onChange={e=>setForm(f=>({ ...f, status:e.target.value }))}
            InputLabelProps={{ className: 'dark:!text-slate-300' }}
            inputProps={{ className: 'dark:!text-white' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setOpen(false)}>ยกเลิก</Button>
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
  const [onlineTechs, setOnlineTechs] = useState(0);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    try {
      // ✅ 4. แก้ไขการเรียก API
      const [t, u, inv] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/tickets`),
       axios.get(`${API_BASE_URL}/api/users`, {
          params: { userId: currentUser.id },   // ✅ ส่ง userId ของ Admin
        }),
        axios.get(`${API_BASE_URL}/api/inventory`),
      ]);
      setTickets(Array.isArray(t.data) ? t.data : []);
      setUsers(Array.isArray(u.data) ? u.data : []);
      setInventory(Array.isArray(inv.data) ? inv.data : []);
    } catch {
      setError('ไม่สามารถดึงข้อมูลเริ่มต้นได้');
    }

    try {
      // ✅ 5. แก้ไขการเรียก API
      const r = await axios.get(`${API_BASE_URL}/api/technicians/online`);
      if (typeof r.data?.count === 'number') {
        setOnlineTechs(r.data.count);
      } else {
        const c = users.filter(x => x.role === 'Technician' && x.accepting_jobs === 1).length;
        setOnlineTechs(c);
      }
    } catch {
      const c = users.filter(x => x.role === 'Technician' && x.accepting_jobs === 1).length;
      setOnlineTechs(c);
    }
  }, [users]);

  useEffect(()=>{ fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!socket) return;
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
    };
  }, [socket, fetchAll]);

  const assignTicket = async (ticketId, technicianId) => {
    // ✅ 6. แก้ไขการเรียก API
    await axios.put(`${API_BASE_URL}/api/tickets/${ticketId}`, { technician_id: technicianId, status: 'Assigned' });
  };
   const changeRole = async (userId, role) => {
    if (!currentUser) return;
    await axios.put(
      `${API_BASE_URL}/api/users/${userId}/role`,
      { role },
      { params: { userId: currentUser.id } }   // ✅ ส่ง userId ของ Admin
    );
  };

  const stats = useMemo(() => ({
    submitted: tickets.filter(t => t.status === 'Submitted').length,
    assigned: tickets.filter(t => t.status === 'Assigned').length,
    inProgress: tickets.filter(t => t.status === 'In Progress').length,
    completed: tickets.filter(t => t.status === 'Completed').length,
  }), [tickets]);

  const totalTechs = useMemo(() => users.filter(u => u.role === 'Technician').length, [users]);

  return (
    <div className="space-y-6">
      {/* Hero Gradient */}
      <div className="mx-4 lg:mx-6 mt-2 rounded-3xl p-6 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">แผงควบคุมผู้ดูแลระบบ</h2>
            <p className="opacity-90 mt-1 text-sm">สรุปภาพรวมงานซ่อม ทีมช่าง และทรัพยากรทั้งหมด — โทน UI สำหรับ Admin โดยเฉพาะ</p>
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
            <StatCard title="งานใหม่" value={stats.submitted} icon={AlertTriangle} gradient="bg-gradient-to-br from-amber-400/15 to-transparent"/>
            <StatCard title="มอบหมายแล้ว" value={stats.assigned} icon={UserCheck} gradient="bg-gradient-to-br from-violet-400/15 to-transparent"/>
            <StatCard title="กำลังดำเนินการ" value={stats.inProgress} icon={Hourglass} gradient="bg-gradient-to-br from-blue-400/15 to-transparent"/>
            <StatCard title="เสร็จสิ้น" value={stats.completed} icon={CheckCircle} gradient="bg-gradient-to-br from-emerald-400/15 to-transparent"/>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <OnlineTechsCard online={onlineTechs} total={totalTechs} />
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