import React, { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export default function EditProfilePage() {
  const { currentUser, setCurrentUser } = useAuth();
  const [form, setForm] = useState({ name: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const navigate = useNavigate();

  // ถ้ายังไม่ได้ล็อกอิน ป้องกันเข้าหน้านี้
  if (!currentUser) return <Navigate to="/login" replace />;

  // โหลดข้อมูลล่าสุดของฉัน
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(`${API_URL}/me`, { params: { userId: currentUser.id } });
        const data = res.data;
        if (!cancelled) setForm({ name: data?.name ?? '', email: data?.email ?? '' });
      } catch (e) {
        if (!cancelled) {
          setForm({ name: currentUser?.name ?? '', email: currentUser?.email ?? '' });
          setErr('โหลดข้อมูลจากเซิร์ฟเวอร์ไม่สำเร็จ ใช้ข้อมูลปัจจุบันแทน');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [currentUser?.id]); // ผูกกับ id ก็พอ

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    setSaving(true);
    try {
      const res = await axios.put(`${API_URL}/me`, form, { params: { userId: currentUser.id } });

      // ✅ อัปเดต Context + localStorage ผ่าน setter ใน AuthContext
      if (setCurrentUser) {
        setCurrentUser((prev) => ({
          ...prev,
          // เก็บ id/role เดิมไว้แน่ๆ แล้วอัปเดต name/email ตามที่ backend คืนมา
          id: prev?.id,
          role: prev?.role,
          name: res.data?.name ?? form.name,
          email: res.data?.email ?? form.email,
        }));
      }

      navigate('..', { replace: true }); // กลับหน้า /profile
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        'บันทึกไม่สำเร็จ';
      setErr(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>กำลังโหลด...</div>;

  return (
    <form onSubmit={onSubmit} className="max-w-md bg-white dark:bg-slate-800 p-6 rounded-xl shadow">
      <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">แก้ไขโปรไฟล์</h2>
      {err && <div className="mb-3 text-red-500">{err}</div>}

      <label className="block mb-2 text-sm">ชื่อ</label>
      <input
        className="w-full mb-4 rounded border px-3 py-2 bg-white dark:bg-slate-900"
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        required
      />

      <label className="block mb-2 text-sm">อีเมล</label>
      <input
        type="email"
        className="w-full mb-6 rounded border px-3 py-2 bg-white dark:bg-slate-900"
        value={form.email}
        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        required
      />

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className={`px-4 py-2 rounded-lg text-white ${saving ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}
        >
          {saving ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
        <button
          type="button"
          onClick={() => navigate('..')}
          className="px-4 py-2 rounded-lg border"
          disabled={saving}
        >
          ยกเลิก
        </button>
      </div>
    </form>
  );
}
