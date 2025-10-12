// src/pages/AiAssistant.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Bot, Send, Sparkles, RotateCcw } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL ||'http://localhost:5000/api';

export default function AiAssistant() {
  const { currentUser } = useAuth();
  const [history, setHistory] = useState([
    {
      role: 'assistant',
      content:
        'สวัสดีครับ ผมเป็นผู้ช่วย AI สำหรับช่วยวิเคราะห์ปัญหาเบื้องต้น\n' +
        'เล่าอาการ/อุปกรณ์/เวลาเกิดเหตุ/สถานที่ หรือแนบข้อความ error มาได้เลยครับ 😊',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const viewportRef = useRef(null);

  // auto scroll
  useEffect(() => {
    viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight, behavior: 'smooth' });
  }, [history, loading]);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content) return;
    setInput('');
    setHistory((h) => [...h, { role: 'user', content }]);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/ai/assist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id,
          message: content,
          history: history.map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = await res.json();
      setHistory((h) => [...h, { role: 'assistant', content: data.reply || '...' }]);
    } catch (e) {
      setHistory((h) => [
        ...h,
        { role: 'assistant', content: 'ขออภัย ระบบ AI มีปัญหาชั่วคราว ลองใหม่อีกครั้งนะครับ' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quicks = [
    'อินเทอร์เน็ตช้าหรือหลุดบ่อย ควรเช็กอะไรบ้าง',
    'ปริ้นเตอร์ไม่พิมพ์ เริ่มไล่ปัญหายังไง',
    'อีเมลส่งไม่ออก/รับไม่เข้า แก้ยังไง',
    'ขอรายการข้อมูลที่ควรแนบก่อนแจ้งซ่อม',
  ];

  // เปิดฟอร์มแจ้งซ่อมพร้อมกรอกล่วงหน้า (ผ่าน query string)
  const openNewTicketPrefilled = () => {
    // รวบรวมข้อความสนทนาสุดท้ายของผู้ใช้
    const lastUserMsg = [...history].reverse().find((m) => m.role === 'user')?.content || '';
    const title = encodeURIComponent((lastUserMsg.split('\n')[0] || 'ปัญหาไอที').slice(0, 40));
    const desc = encodeURIComponent(lastUserMsg);
    window.location.href = `/tickets/new?title=${title}&description=${desc}`;
  };

  const resetChat = () => {
    setHistory((h) => [h[0]]);
    setInput('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300">
          <Bot />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">ผู้ช่วย AI</h1>
      </div>

      {/* Quick prompts */}
      <div className="flex flex-wrap gap-2">
        {quicks.map((q) => (
          <button
            key={q}
            onClick={() => send(q)}
            className="text-sm px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            <Sparkles className="inline mr-1 h-4 w-4" />
            {q}
          </button>
        ))}
        <button
          onClick={resetChat}
          className="ml-auto text-sm px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
          title="ล้างบทสนทนา"
        >
          <RotateCcw className="inline mr-1 h-4 w-4" />
          เริ่มใหม่
        </button>
      </div>

      {/* Chat window */}
      <div
        ref={viewportRef}
        className="h-[60vh] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 overflow-y-auto"
      >
        {history.map((m, idx) => (
          <div
            key={idx}
            className={`mb-3 flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
                m.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-xs text-slate-500 dark:text-slate-400">กำลังคิดคำตอบ…</div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="พิมพ์คำถามหรืออธิบายอาการที่นี่…"
          className="flex-1 rounded-lg px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600"
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          <Send className="inline h-4 w-4 mr-1" />
          ส่ง
        </button>
        <button
          onClick={openNewTicketPrefilled}
          className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
          title="แปลงข้อความล่าสุดเป็นแบบฟอร์มแจ้งซ่อม"
        >
          สร้างใบแจ้งซ่อมจากบทสนทนา
        </button>
      </div>
    </div>
  );
}
