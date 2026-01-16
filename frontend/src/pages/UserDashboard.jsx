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
const Badge = ({ tone = "slate", children }) => {
  const map = {
    indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
    green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  };
  return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${map[tone]}`}>{children}</span>;
};
const statusTone = (s) =>
  s === 'Submitted' ? 'indigo' :
    s === 'Assigned' ? 'purple' :
      s === 'In Progress' ? 'amber' :
        s === 'Completed' ? 'green' : 'slate';

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
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
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
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}

/* ========== Drawer รายละเอียด ========== */
function Drawer({ open, onClose, ticket }) {
  // useEffect must be called unconditionally (React Hooks rule)
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const statusConfig = {
    Submitted: { gradient: 'from-blue-500 to-indigo-600', bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
    Assigned: { gradient: 'from-violet-500 to-purple-600', bg: 'bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400' },
    'In Progress': { gradient: 'from-amber-500 to-orange-600', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
    Completed: { gradient: 'from-emerald-500 to-green-600', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
  };
  const config = ticket ? (statusConfig[ticket.status] || statusConfig.Submitted) : statusConfig.Submitted;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-xl max-h-[90vh] bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border border-slate-200/70 dark:border-slate-700/60 shadow-2xl flex flex-col rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative overflow-hidden p-5 border-b border-slate-200/70 dark:border-slate-700/60">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-purple-500/5 rounded-full blur-2xl" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
                <ClipboardList className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">รายละเอียดงาน</h3>
                {ticket && <p className="text-xs text-slate-500 dark:text-slate-400">ID: #{ticket.id}</p>}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5 text-slate-500 dark:text-slate-300" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {!ticket ? (
            <div className="p-6 text-center">
              <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 w-fit mx-auto mb-3">
                <ClipboardList className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-500 dark:text-slate-400">เลือกงานจากรายการเพื่อดูรายละเอียด</p>
            </div>
          ) : (
            <div className="p-5 space-y-5">
              {/* Status & Date */}
              <div className="flex flex-wrap items-center gap-3">
                <span className={`px-3 py-1.5 text-sm font-bold rounded-xl ${config.bg} ${config.text}`}>
                  {ticket.status}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                  สร้างเมื่อ {new Date(ticket.created_at).toLocaleString('th-TH')}
                </span>
              </div>

              {/* Title */}
              <div className="rounded-xl p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/50">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">หัวข้อ</p>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">{ticket.title}</h4>
              </div>

              {/* Description */}
              <div className="rounded-xl p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/50">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">รายละเอียดปัญหา</p>
                <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {ticket.description || '-'}
                </p>
              </div>

              {/* Location */}
              {(ticket.building || ticket.floor || ticket.room) && (
                <div className="rounded-xl p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-slate-800/50 dark:to-slate-800/50 border border-emerald-200/50 dark:border-slate-700/50">
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1">
                    <MapPin size={12} /> สถานที่
                  </p>
                  <p className="text-slate-800 dark:text-slate-200 font-medium">
                    {ticket.building || '-'} {ticket.floor ? `ชั้น ${ticket.floor}` : ''} {ticket.room ? `ห้อง ${ticket.room}` : ''}
                  </p>
                </div>
              )}

              {/* Image */}
              {ticket.image_url && (
                <div className="rounded-xl overflow-hidden border border-slate-200/70 dark:border-slate-700/50">
                  <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200/70 dark:border-slate-700/50">
                    <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <ImageIcon size={12} /> รูปภาพประกอบ
                    </p>
                  </div>
                  <div className="relative group">
                    <img
                      src={ticket.image_url.startsWith('http') ? ticket.image_url : `${API_BASE_URL}${ticket.image_url}`}
                      alt="แนบ"
                      className="w-full max-h-[40vh] object-contain bg-slate-100 dark:bg-slate-800"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  </div>
                </div>
              )}

              {/* Chat Panel */}
              <ChatPanel ticketId={ticket.id} ticketStatus={ticket.status} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ========== Modal ฟอร์มสร้างใบแจ้งซ่อม (ใช้ TicketForm เดิม) ========== */
function NewTicketModal({ open, onClose, onSuccess }) {
  // useEffect must be called unconditionally (React Hooks rule)
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div onClick={onClose} className="absolute inset-0 bg-black/40" />
      <div
        className="absolute left-1/2 top-1/2 w-[95%] max-w-3xl -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
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
  const statuses = [
    { key: 'All', icon: Layers, gradient: 'from-slate-500 to-slate-700' },
    { key: 'Submitted', icon: Send, gradient: 'from-blue-500 to-indigo-600' },
    { key: 'Assigned', icon: ClipboardList, gradient: 'from-violet-500 to-purple-600' },
    { key: 'In Progress', icon: Clock3, gradient: 'from-amber-500 to-orange-600' },
    { key: 'Completed', icon: CheckCircle2, gradient: 'from-emerald-500 to-green-600' },
  ];
  return (
    <aside className="hidden lg:flex lg:flex-col gap-4 w-72 shrink-0">
      <div className="rounded-2xl border border-slate-200/70 dark:border-slate-700/70 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-lg">
        <div className="px-4 py-3 border-b border-slate-200/70 dark:border-slate-700/70 flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md">
            <Filter className="h-4 w-4 text-white" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white">ตัวกรอง</h3>
          <button onClick={onRefresh} className="ml-auto p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <RefreshCcw className="h-4 w-4 text-slate-500 hover:text-indigo-500 transition-colors" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ค้นหาหัวข้อ / รายละเอียด…"
              className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>
          <div className="space-y-2">
            {statuses.map(({ key, icon: Icon, gradient }) => {
              const isActive = selectedStatus === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedStatus(key)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200
                  ${isActive
                      ? `bg-gradient-to-r ${gradient} text-white shadow-lg`
                      : 'border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 hover:scale-[1.01]'}`}
                >
                  <span className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'opacity-70'}`} />
                    <span className="font-medium">{key === 'All' ? 'ทั้งหมด' : key}</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${isActive ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700'}`}>
                    {counts[key.toLowerCase()] ?? counts[key.toLowerCase().replace(' ', '')] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200/70 dark:border-slate-700/70 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-lg p-4">
        <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-indigo-500" />
          สรุปภาพรวม
        </h4>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <SummaryCard icon={Layers} label="ทั้งหมด" value={counts.total} tone="indigo" />
          <SummaryCard icon={Clock3} label="กำลังดำเนินการ" value={counts.open} tone="amber" />
          <SummaryCard icon={CheckCircle2} label="เสร็จสิ้น" value={counts.completed} tone="green" />
          <SummaryCard icon={PlusCircle} label="รอตรวจรับ" value={counts.submitted} tone="slate" />
        </div>
      </div>
    </aside>
  );
}

function SummaryCard({ icon: Icon, label, value, tone }) {
  const config = {
    indigo: { gradient: 'from-blue-500 via-indigo-500 to-violet-500', shadow: 'shadow-indigo-500/30' },
    amber: { gradient: 'from-amber-500 via-orange-500 to-red-500', shadow: 'shadow-orange-500/30' },
    green: { gradient: 'from-emerald-500 via-green-500 to-teal-500', shadow: 'shadow-emerald-500/30' },
    slate: { gradient: 'from-slate-500 via-slate-600 to-slate-700', shadow: 'shadow-slate-500/30' },
  }[tone];
  return (
    <div className={`relative overflow-hidden rounded-xl p-3 bg-gradient-to-br ${config.gradient} shadow-lg ${config.shadow} hover:scale-[1.03] transition-all duration-300`}>
      <div className="absolute -top-4 -right-4 w-16 h-16 bg-white/10 rounded-full blur-xl" />
      <div className="absolute -bottom-2 -left-2 w-12 h-12 bg-white/10 rounded-full blur-lg" />
      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm">
            <Icon className="h-4 w-4 text-white" />
          </div>
        </div>
        <p className="mt-2 text-3xl font-extrabold text-white leading-none drop-shadow-sm">{value}</p>
        <p className="text-xs text-white/80 mt-1 font-medium">{label}</p>
      </div>
    </div>
  );
}

/* ---------------- Card ---------------- */
function TicketCard({ t, onOpen }) {
  const tone = statusTone(t.status);
  const statusConfig = {
    Submitted: { gradient: 'from-blue-500 to-indigo-600', bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
    Assigned: { gradient: 'from-violet-500 to-purple-600', bg: 'bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400' },
    'In Progress': { gradient: 'from-amber-500 to-orange-600', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
    Completed: { gradient: 'from-emerald-500 to-green-600', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
  };
  const config = statusConfig[t.status] || statusConfig.Submitted;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-700/60 bg-white/90 dark:bg-slate-800/90 backdrop-blur hover:shadow-xl hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-300">
      {/* Status Strip */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${config.gradient}`} />

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${config.bg} ${config.text}`}>
                {t.status}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">#{t.id}</span>
            </div>
            <h4 className="font-bold text-slate-900 dark:text-white text-base leading-snug">{t.title}</h4>
            {t.description && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 line-clamp-2">{t.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-500 dark:text-slate-400">
              {(t.building || t.floor || t.room) && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/60">
                  <MapPin size={12} /> {t.building || '-'}{t.floor ? ` ชั้น ${t.floor}` : ''} {t.room || ''}
                </span>
              )}
              {t.image_url && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/60">
                  <ImageIcon size={12} /> แนบรูป
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
              แจ้งเมื่อ {new Date(t.created_at).toLocaleString('th-TH')}
            </p>
          </div>
          <button
            onClick={() => onOpen(t)}
            className="self-start px-3 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:shadow-lg hover:shadow-indigo-500/30 transition-all"
          >
            ดูรายละเอียด
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Right rail ---------------- */
// ✅ 1. แก้ไขฟังก์ชัน RightRail ให้รับ prop `onAskAi` เพิ่ม
function RightRail({ total, last8, onOpen, onCreate, onAskAi }) {
  const statusConfig = {
    Submitted: { gradient: 'from-blue-500 to-indigo-600', bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
    Assigned: { gradient: 'from-violet-500 to-purple-600', bg: 'bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400' },
    'In Progress': { gradient: 'from-amber-500 to-orange-600', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
    Completed: { gradient: 'from-emerald-500 to-green-600', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
  };

  return (
    <aside className="hidden xl:flex xl:flex-col gap-4 w-[320px] shrink-0">
      {/* Quick Actions */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-700/70 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-lg p-5">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-purple-500/5 rounded-full blur-2xl" />
        <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md">
            <PlusCircle className="h-4 w-4 text-white" />
          </div>
          เริ่มต้นรวดเร็ว
        </h4>
        <div className="mt-4 grid gap-3 relative">
          <button
            onClick={onCreate}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 text-white font-semibold hover:shadow-lg hover:shadow-indigo-500/30 hover:scale-[1.02] transition-all"
          >
            <PlusCircle size={18} /> แจ้งซ่อมใหม่
          </button>
          <button
            onClick={onAskAi}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 text-white font-semibold hover:shadow-lg hover:shadow-slate-500/30 hover:scale-[1.02] transition-all dark:from-slate-600 dark:via-slate-700 dark:to-slate-800"
          >
            <MessageSquareText size={18} /> ถาม AI ก่อนแจ้งซ่อม
          </button>
        </div>
      </div>

      {/* Recent Tickets */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-700/70 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-lg p-5">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-cyan-500/5 rounded-full blur-2xl" />
        <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-600 shadow-md">
            <Clock3 className="h-4 w-4 text-white" />
          </div>
          งานล่าสุด
        </h4>
        <div className="mt-4 space-y-3 relative">
          {last8.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">ยังไม่มีรายการ</p>
          ) : last8.map(t => {
            const config = statusConfig[t.status] || statusConfig.Submitted;
            return (
              <button
                key={t.id}
                onClick={() => onOpen(t)}
                className="w-full text-left p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-600"
              >
                <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{t.title}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${config.bg} ${config.text}`}>
                    {t.status}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {new Date(t.created_at).toLocaleString('th-TH')}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tips */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-700/70 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-800/90 dark:to-slate-800/90 backdrop-blur-sm shadow-lg p-5">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-amber-500/10 to-orange-500/5 rounded-full blur-2xl" />
        <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 shadow-md">
            <AlertTriangle className="h-4 w-4 text-white" />
          </div>
          ทิปส์ก่อนแจ้งซ่อม
        </h4>
        <div className="mt-4 space-y-3 relative">
          {[
            { icon: '📝', text: 'ระบุอุปกรณ์/รุ่น และอาการให้ชัดเจน' },
            { icon: '📍', text: 'ระบุสถานที่/แผนก และช่วงเวลาที่พบปัญหา' },
            { icon: '📸', text: 'แนบภาพหน้าจอหรือรูปหน้างาน (ถ้ามี)' },
          ].map((tip, i) => (
            <div key={i} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
              <span className="text-lg">{tip.icon}</span>
              <span>{tip.text}</span>
            </div>
          ))}
        </div>
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
        ? (t.title || '').toLowerCase().includes(s) ||
        (t.description || '').toLowerCase().includes(s) ||
        (t.status || '').toLowerCase().includes(s)
        : true;
      const statusMatch = status === 'All' ? true : (t.status === status);
      return textMatch && statusMatch;
    });
  }, [tickets, q, status]);

  const counts = useMemo(() => ({
    total: tickets.length,
    submitted: tickets.filter(t => t.status === 'Submitted').length,
    assigned: tickets.filter(t => t.status === 'Assigned').length,
    'in progress': tickets.filter(t => t.status === 'In Progress').length,
    completed: tickets.filter(t => t.status === 'Completed').length,
    open: tickets.filter(t => ['Assigned', 'In Progress'].includes(t.status)).length,
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
              <PlusCircle size={16} /> แจ้งซ่อมใหม่
            </button>
          </div>
        </header>
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-700 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 p-10 text-center">
            <p className="text-slate-600 dark:text-slate-300">ไม่พบทิกเก็ตตามเงื่อนไข</p>
            <div className="mt-3 flex justify-center gap-2">
              <button onClick={() => { setQ(''); setStatus('All'); }} className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 text-sm">
                ล้างตัวกรอง
              </button>
              <button onClick={() => setOpenNew(true)} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm">
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
        last8={[...tickets].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 8)}
        onOpen={setOpenedTicket}
        onCreate={() => setOpenNew(true)}
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
