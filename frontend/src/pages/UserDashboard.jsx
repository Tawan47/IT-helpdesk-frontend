import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import ChatBotWidget from '../components/ChatBotWidget';
import TicketForm from '../components/TicketForm';

import {
  PlusCircle, Search, Filter, Layers, CheckCircle2, Clock3, AlertTriangle, RefreshCcw,
  MapPin, MessageSquareText, Image as ImageIcon, X, ClipboardList, Send
} from 'lucide-react';

// ✅ 1. กำหนดค่า Base URL ให้ถูกต้อง
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/* ========== UI helpers ========== */
const Badge = ({ tone="slate", children }) => {
  const map = {
    indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200',
    amber:  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
    green:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
    slate:  'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  };
  return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${map[tone]}`}>{children}</span>;
};
const statusTone = (s) =>
  s === 'Submitted'   ? 'indigo' :
  s === 'Assigned'    ? 'purple' :
  s === 'In Progress' ? 'amber'  :
  s === 'Completed'   ? 'green'  : 'slate';

/* ========== Chat Panel (inside Drawer) ========== */
function ChatPanel({ ticketId, ticketStatus }) {
  const { currentUser } = useAuth();
  const socket = useSocket();
  const [msgs, setMsgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, loading]);

  const load = useCallback(async () => {
    if (!ticketId) return;
    setLoading(true);
    try {
      const r = await axios.get(`${API_BASE_URL}/api/tickets/${ticketId}/messages`);
      setMsgs(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      console.error('[chat] load', e);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!socket || !ticketId) return;
    socket.emit('join_ticket_room', ticketId);
    const onNew = (m) => {
      if (Number(m.ticket_id) === Number(ticketId)) setMsgs(prev => [...prev, m]);
    };
    socket.on('new_message', onNew);
    return () => {
      socket.emit('leave_ticket_room', ticketId);
      socket.off('new_message', onNew);
    };
  }, [socket, ticketId]);

  const send = async () => {
    if (!text.trim() || !currentUser?.id || ticketStatus === 'Completed') return;
    try {
      await axios.post(`${API_BASE_URL}/api/tickets/${ticketId}/messages`, {
        sender_id: currentUser.id,
        message: text.trim(),
      });
      setText('');
    } catch (e) {
      console.error('[chat] send', e);
    }
  };

  const disabled = ticketStatus === 'Completed';

  return (
    <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
        <h4 className="font-semibold text-slate-900 dark:text-white">แชทคุยกับช่าง</h4>
      </div>
      <div className="h-[45vh] md:h-72 overflow-y-auto p-3 space-y-2 bg-white dark:bg-slate-900">
        {loading ? (
          <div className="text-sm text-slate-500 dark:text-slate-400">กำลังโหลดแชท…</div>
        ) : msgs.length === 0 ? (
          <div className="text-sm text-slate-500 dark:text-slate-400">ยังไม่มีข้อความ</div>
        ) : (
          msgs.map(m => {
            const mine = Number(m.sender_id) === Number(currentUser?.id);
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[80%]">
                  <div className={`text-[11px] mb-1 ${mine ? 'text-right text-indigo-300' : 'text-slate-500 dark:text-slate-400'}`}>
                    {mine ? 'ฉัน' : 'ช่าง'}
                  </div>
                  <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed
                    ${mine
                      ? 'bg-indigo-600 text-white rounded-br-md'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-md'}`}>
                    <div className="whitespace-pre-wrap break-words">{m.message}</div>
                    <div className={`mt-1 text-[10px] ${mine ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                      {new Date(m.created_at).toLocaleString('th-TH')}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 pb-[max(env(safe-area-inset-bottom),12px)] bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex gap-2">
        <input
          value={text}
          onChange={(e)=>setText(e.target.value)}
          onKeyDown={(e)=> { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          disabled={disabled}
          placeholder={disabled ? 'ปิดงานแล้ว — ไม่สามารถส่งข้อความได้' : 'พิมพ์ข้อความ…'}
          className={`flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-base md:text-sm ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        />
        <button
          onClick={send}
          disabled={!text.trim() || disabled}
          className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
          title="ส่ง"
        >
          <Send size={18}/>
        </button>
      </div>
    </div>
  );
}

/* ========== Drawer รายละเอียด ========== */
function Drawer({ open, onClose, ticket }) {
  if (!open) return null;

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50">
      <div onClick={onClose} className="absolute inset-0 bg-black/40" />
      <div
        className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col"
        onClick={(e)=>e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="text-indigo-600" />
            <h3 className="font-bold text-slate-900 dark:text-white">
              รายละเอียดใบแจ้งซ่อม {ticket ? `#${ticket.id}` : ''}
            </h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5 text-slate-500 dark:text-slate-300" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!ticket ? (
            <p className="text-slate-500 dark:text-slate-300">เลือกงานจากรายการเพื่อดูรายละเอียด</p>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Badge tone={statusTone(ticket.status)}>{ticket.status}</Badge>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  สร้างเมื่อ {new Date(ticket.created_at).toLocaleString('th-TH')}
                </span>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">หัวข้อ</p>
                <h4 className="text-lg font-semibold text-slate-900 dark:text-white">{ticket.title}</h4>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">รายละเอียด</p>
                <p className="text-slate-800 dark:text-slate-100 whitespace-pre-wrap">{ticket.description || '-'}</p>
              </div>
              {(ticket.building || ticket.floor || ticket.room) && (
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">สถานที่</p>
                  <p className="text-slate-800 dark:text-slate-100">
                    {ticket.building || '-'} {ticket.floor ? `ชั้น ${ticket.floor}` : ''} {ticket.room ? `ห้อง ${ticket.room}` : ''}
                  </p>
                </div>
              )}
              {ticket.image_url && (
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">รูปภาพที่แนบ</p>
                  <img
                    src={`${API_BASE_URL}${ticket.image_url}`}
                    alt="แนบ"
                    className="w-full max-h-[40vh] object-contain rounded-xl border border-slate-200 dark:border-slate-700"
                  />
                </div>
              )}
              <ChatPanel ticketId={ticket.id} ticketStatus={ticket.status} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ========== Modal ฟอร์มสร้างใบแจ้งซ่อม (ใช้ TicketForm เดิม) ========== */
function NewTicketModal({ open, onClose, onSuccess }) {
  if (!open) return null;

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50">
      <div onClick={onClose} className="absolute inset-0 bg-black/40" />
      <div
        className="absolute left-1/2 top-1/2 w-[95%] max-w-3xl -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700"
        onClick={(e)=>e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white">แจ้งซ่อมใหม่</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5 text-slate-500 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-4">
          <TicketForm onSubmitSuccess={onSuccess} />
        </div>
      </div>
    </div>
  );
}

/* ---------------- Left rail ---------------- */
function LeftRail({ q, setQ, selectedStatus, setSelectedStatus, counts, onRefresh }) {
  const statuses = ['All','Submitted','Assigned','In Progress','Completed'];
  return (
    <aside className="hidden lg:flex lg:flex-col gap-4 w-72 shrink-0">
      <div className="rounded-2xl border border-slate-200/70 dark:border-slate-700/70 bg-white/70 dark:bg-slate-800/70 backdrop-blur">
        <div className="px-4 py-3 border-b border-slate-200/70 dark:border-slate-700/70 flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          <h3 className="font-semibold text-slate-900 dark:text-white">ตัวกรอง</h3>
          <button onClick={onRefresh} className="ml-auto p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <RefreshCcw className="h-4 w-4 text-slate-500" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400"/>
            <input
              value={q}
              onChange={(e)=>setQ(e.target.value)}
              placeholder="ค้นหาหัวข้อ / รายละเอียด…"
              className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
            />
          </div>
          <div className="space-y-2">
            {statuses.map(s => (
              <button
                key={s}
                onClick={()=>setSelectedStatus(s)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition
                ${selectedStatus===s
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700/60 dark:bg-indigo-900/30 dark:text-indigo-200'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200'}`}
              >
                <span className="flex items-center gap-2">
                  <Layers className="h-4 w-4 opacity-80" />
                  {s}
                </span>
                <Badge tone={s==='All' ? 'slate' : statusTone(s)}>{counts[s.toLowerCase()] ?? 0}</Badge>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200/70 dark:border-slate-700/70 bg-white/70 dark:bg-slate-800/70 p-4">
        <h4 className="font-semibold text-slate-900 dark:text-white">สรุปภาพรวม</h4>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <SummaryCard icon={AlertTriangle} label="ทั้งหมด" value={counts.total} tone="indigo"/>
          <SummaryCard icon={Clock3} label="กำลังดำเนินการ" value={counts.open} tone="amber"/>
          <SummaryCard icon={CheckCircle2} label="เสร็จสิ้น" value={counts.completed} tone="green"/>
          <SummaryCard icon={PlusCircle} label="รอตรวจรับ" value={counts.submitted} tone="slate"/>
        </div>
      </div>
    </aside>
  );
}

function SummaryCard({ icon:Icon, label, value, tone }) {
  const t = {
    indigo:'from-indigo-500 to-violet-600',
    amber:'from-amber-500 to-orange-600',
    green:'from-emerald-500 to-teal-600',
    slate:'from-slate-600 to-slate-800',
  }[tone];
  return (
    <div className="rounded-xl overflow-hidden border border-slate-200/70 dark:border-slate-700/70">
      <div className={`p-3 text-white bg-gradient-to-r ${t}`}>
        <Icon className="h-4 w-4 opacity-90" />
        <p className="mt-1 text-2xl font-extrabold leading-none">{value}</p>
        <p className="text-xs opacity-90">{label}</p>
      </div>
    </div>
  );
}

/* ---------------- Card ---------------- */
function TicketCard({ t, onOpen }) {
  const tone = statusTone(t.status);
  return (
    <div className="rounded-2xl border border-slate-200/70 dark:border-slate-700/70 bg-white dark:bg-slate-800 p-4 hover:shadow-md transition">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge tone={tone}>{t.status}</Badge>
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">#{t.id}</span>
          </div>
          <h4 className="font-semibold text-slate-900 dark:text-white truncate">{t.title}</h4>
          {t.description && (
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">{t.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
            {(t.building || t.floor || t.room) && (
              <span className="inline-flex items-center gap-1"><MapPin size={14}/> {t.building || '-'}{t.floor ? ` ชั้น ${t.floor}`:''} {t.room || ''}</span>
            )}
            {t.image_url && <span className="inline-flex items-center gap-1"><ImageIcon size={14}/> แนบรูป</span>}
            <span>แจ้งเมื่อ {new Date(t.created_at).toLocaleString('th-TH')}</span>
          </div>
        </div>
        <button
          onClick={() => onOpen(t)}
          className="self-start px-2 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
        >
          ดูรายละเอียด
        </button>
      </div>
    </div>
  );
}

/* ---------------- Right rail ---------------- */
// ✅ 1. แก้ไขฟังก์ชัน RightRail ให้รับ prop `onAskAi` เพิ่ม
function RightRail({ total, last8, onOpen, onCreate, onAskAi }) {
  return (
    <aside className="hidden xl:flex xl:flex-col gap-4 w-[320px] shrink-0">
      <div className="rounded-2xl border border-slate-200/70 dark:border-slate-700/70 bg-white/70 dark:bg-slate-800/70 p-4">
        <h4 className="font-semibold text-slate-900 dark:text-white">เริ่มต้นรวดเร็ว</h4>
        <div className="mt-3 grid gap-2">
          <button onClick={onCreate} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">
            <PlusCircle size={18}/> แจ้งซ่อมใหม่
          </button>
          {/* ✅ 2. เปลี่ยนจาก <a> เป็น <button> และเรียกใช้ onAskAi */}
          <button 
            onClick={onAskAi} 
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            <MessageSquareText size={18}/> ถาม AI ก่อนแจ้งซ่อม
          </button>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200/70 dark:border-slate-700/70 bg-white/70 dark:bg-slate-800/70 p-4">
        <h4 className="font-semibold text-slate-900 dark:text-white">งานล่าสุด</h4>
        <ol className="mt-3 space-y-3">
          {last8.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">ยังไม่มีรายการ</p>
          ) : last8.map(t => (
            <li key={t.id} className="text-sm">
              <button
                onClick={() => onOpen(t)}
                className="font-semibold text-slate-900 dark:text-white hover:underline"
              >
                {t.title}
              </button>
              <div className="mt-0.5 flex items-center gap-2">
                <Badge tone={statusTone(t.status)}>{t.status}</Badge>
                <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(t.created_at).toLocaleString('th-TH')}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <div className="rounded-2xl border border-slate-200/70 dark:border-slate-700/70 bg-white/70 dark:bg-slate-800/70 p-4">
        <h4 className="font-semibold text-slate-900 dark:text-white">ทิปส์ก่อนแจ้งซ่อม</h4>
        <ul className="mt-2 list-disc ps-5 text-sm text-slate-600 dark:text-slate-300 space-y-1">
          <li>ระบุอุปกรณ์/รุ่น และอาการให้ชัดเจน</li>
          <li>ระบุสถานที่/แผนก และช่วงเวลาที่พบปัญหา</li>
          <li>แนบภาพหน้าจอหรือรูปหน้างาน (ถ้ามี)</li>
        </ul>
      </div>
    </aside>
  );
}

/* =============================== Page =============================== */
export default function UserDashboard() {
  const { currentUser } = useAuth();
  const socket = useSocket();

  const [tickets, setTickets] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('All');
  const [loading, setLoading] = useState(true);

  const [openedTicket, setOpenedTicket] = useState(null);
  const [openNew, setOpenNew] = useState(false);
  
  // ✅ 3. เพิ่ม State เพื่อควบคุมการเปิด-ปิดของ Chatbot
  const [isChatbotOpen, setChatbotOpen] = useState(false);

  const fetchTickets = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const r = await axios.get(`${API_BASE_URL}/api/tickets`, { params: { userId: currentUser.id } });
      setTickets(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      console.error('[UserDashboard] tickets', e);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // ✅ แก้ไข: เพิ่มการตรวจสอบ currentUser ก่อน fetch
  useEffect(() => {
    if (currentUser?.id) {
      fetchTickets();
    }
  }, [currentUser, fetchTickets]);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => fetchTickets();
    socket.on('new_ticket', refresh);
    socket.on('ticket_updated', refresh);
    return () => {
      socket.off('new_ticket', refresh);
      socket.off('ticket_updated', refresh);
    };
  }, [socket, fetchTickets]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return tickets.filter(t => {
      const textMatch = s
        ? (t.title||'').toLowerCase().includes(s) ||
          (t.description||'').toLowerCase().includes(s) ||
          (t.status||'').toLowerCase().includes(s)
        : true;
      const statusMatch = status === 'All' ? true : (t.status === status);
      return textMatch && statusMatch;
    });
  }, [tickets, q, status]);

  const counts = useMemo(() => ({
    total: tickets.length,
    submitted: tickets.filter(t => t.status==='Submitted').length,
    assigned: tickets.filter(t => t.status==='Assigned').length,
    'in progress': tickets.filter(t => t.status==='In Progress').length,
    completed: tickets.filter(t => t.status==='Completed').length,
    open: tickets.filter(t => ['Assigned','In Progress'].includes(t.status)).length,
    all: tickets.length,
  }), [tickets]);

  return (
    <div className="min-h-[70vh] grid grid-cols-1 lg:grid-cols-[18rem_1fr] xl:grid-cols-[18rem_1fr_20rem] gap-6">
      <LeftRail
        q={q}
        setQ={setQ}
        selectedStatus={status}
        setSelectedStatus={setStatus}
        counts={{
          all: counts.all,
          submitted: counts.submitted,
          assigned: counts.assigned,
          'in progress': counts['in progress'],
          completed: counts.completed,
          total: counts.total,
          open: counts.open
        }}
        onRefresh={fetchTickets}
      />
      <section className="space-y-4">
        <header className="rounded-2xl border border-slate-200/70 dark:border-slate-700/70 bg-white/70 dark:bg-slate-800/70 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-slate-900 dark:text-white">งานของฉัน</h2>
            <Badge tone="slate">{filtered.length} รายการ</Badge>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOpenNew(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-semibold"
            >
              <PlusCircle size={16}/> แจ้งซ่อมใหม่
            </button>
          </div>
        </header>
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_,i)=><div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-700 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 p-10 text-center">
            <p className="text-slate-600 dark:text-slate-300">ไม่พบทิกเก็ตตามเงื่อนไข</p>
            <div className="mt-3 flex justify-center gap-2">
              <button onClick={()=>{setQ(''); setStatus('All');}} className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 text-sm">
                ล้างตัวกรอง
              </button>
              <button onClick={()=>setOpenNew(true)} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm">
                สร้างใบแจ้งซ่อม
              </button>
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {filtered.map(t => <TicketCard key={t.id} t={t} onOpen={setOpenedTicket} />)}
          </div>
        )}
      </section>
      <RightRail
        total={counts.total}
        last8={[...tickets].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,8)}
        onOpen={setOpenedTicket}
        onCreate={()=>setOpenNew(true)}
        onAskAi={() => setChatbotOpen(true)} // ✅ 4. ส่งฟังก์ชันเปิดแชทไปให้ RightRail
      />
      <Drawer open={!!openedTicket} ticket={openedTicket} onClose={() => setOpenedTicket(null)} />
      <NewTicketModal
        open={openNew}
        onClose={() => setOpenNew(false)}
        onSuccess={() => { setOpenNew(false); fetchTickets(); }}
      />
      <div id="ask-ai" />
      {/* ✅ 5. ส่ง State และฟังก์ชันควบคุมไปให้ ChatBotWidget */}
      <ChatBotWidget 
        onCreateTicket={() => setOpenNew(true)} 
        isOpen={isChatbotOpen}
        setIsOpen={setChatbotOpen}
      />
    </div>
  );
}
