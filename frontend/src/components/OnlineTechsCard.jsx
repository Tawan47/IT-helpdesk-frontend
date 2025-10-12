import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSocket } from '../contexts/SocketContext';
import { HardHat } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL ||'http://localhost:5000/api';

export default function OnlineTechsCard() {
  const socket = useSocket();
  const [data, setData] = useState({ count: 0, technicians: [] });
  const [loading, setLoading] = useState(true);

  const fetchNow = async () => {
    try {
      const res = await axios.get(`${API_URL}/technicians/online`);
      setData(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNow(); }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = (payload) => setData(payload);
    socket.on('technicians_online', handler);
    return () => socket.off('technicians_online', handler);
  }, [socket]);

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
            <HardHat className="h-6 w-6 text-emerald-600 dark:text-emerald-300" />
          </span>
          <div>
            <div className="text-sm text-slate-500 dark:text-slate-400">ช่างออนไลน์ตอนนี้</div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {loading ? '...' : data.count}
            </div>
          </div>
        </div>
        {!loading && (
          <div className="text-xs text-slate-500 dark:text-slate-400">
            อัปเดตอัตโนมัติแบบเรียลไทม์
          </div>
        )}
      </div>

      {!loading && data.technicians.length > 0 && (
        <div className="mt-4 space-y-2 max-h-44 overflow-auto">
          {data.technicians.map(t => (
            <div key={t.id} className="flex items-center justify-between text-sm bg-slate-50 dark:bg-slate-700/40 px-3 py-2 rounded-lg">
              <div className="truncate">
                <span className="font-medium text-slate-700 dark:text-slate-100">{t.name}</span>
                <span className="ml-2 text-slate-500 dark:text-slate-300">#{t.id}</span>
              </div>
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${t.accepting_jobs ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-700'}`}>
                {t.accepting_jobs ? 'รับงาน' : 'ปิดรับ'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
