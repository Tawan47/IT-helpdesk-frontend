// src/components/ChatBotWidget.jsx
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, LifeBuoy, FilePlus } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL ||'http://localhost:5000/api';

export default function ChatBotWidget({ onCreateTicket }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [msgs, setMsgs] = useState([
    { role: 'bot', content: 'สวัสดีค่ะ/ครับ มีอะไรให้ช่วยไหม? พิมพ์อาการได้ทุกเรื่อง เช่น “อินเทอร์เน็ตช้า” หรือ “ปริ้นไม่ออก”' }
  ]);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, open]);

  const ask = async () => {
    const text = q.trim();
    if (!text) return;

    // push ข้อความผู้ใช้
    const nextMsgs = [...msgs, { role: 'user', content: text }];
    setMsgs(nextMsgs);
    setQ('');
    setLoading(true);

    try {
      // เตรียม history ให้โมเดล (ตัดให้สั้นสุด ๆ แค่ 8 turn ล่าสุด)
      const history = nextMsgs
        .slice(-8)
        .map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content
        }));

      const r = await axios.post(`${API_URL}/ai/assist`, {
        message: text,
        history
      });

      const { reply } = r.data || {};
      setMsgs(m => [...m, { role: 'bot', content: reply || 'บอทเงียบไปชั่วคราว ลองอีกครั้งนะครับ' }]);
    } catch (e) {
      console.error(e);
      setMsgs(m => [...m, { role: 'bot', content: 'ขอโทษค่ะ/ครับ ระบบตอบไม่ได้ในขณะนี้' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ปุ่มลอย */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-40 p-4 rounded-full shadow-lg bg-indigo-600 text-white hover:bg-indigo-700"
        title="ศูนย์ความรู้ / แชตช่วยเหลือ"
      >
        {open ? <X /> : <MessageSquare />}
      </button>

      {/* แผงแชต */}
      {open && (
        <div className="fixed bottom-24 right-6 z-40 w-[360px] max-h-[70vh] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
            <LifeBuoy className="text-indigo-600" />
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">ผู้ช่วยค้นหาปัญหา (AI)</h3>
            <div className="ml-auto">
              <button
                onClick={onCreateTicket}
                title="ยังแก้ไม่ได้ → แจ้งซ่อม"
                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
              >
                <FilePlus size={14} /> แจ้งซ่อม
              </button>
            </div>
          </div>

          <div className="p-3 overflow-auto flex-1 space-y-3">
            {msgs.map((m, idx) => (
              <div key={idx} className={m.role === 'user' ? 'text-right' : ''}>
                <div
                  className={
                    m.role === 'user'
                      ? 'inline-block px-3 py-2 rounded-xl bg-indigo-600 text-white'
                      : 'inline-block px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100'
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && <div className="text-sm text-slate-500 animate-pulse">กำลังคิดคำตอบ…</div>}
            <div ref={endRef} />
          </div>

          <div className="p-3 border-t border-slate-200 dark:border-slate-700 flex gap-2">
            <input
              className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
              placeholder="พิมพ์คำถาม…"
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && ask()}
            />
            <button
              onClick={ask}
              disabled={loading || !q.trim()}
              className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
              title="ส่ง"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
