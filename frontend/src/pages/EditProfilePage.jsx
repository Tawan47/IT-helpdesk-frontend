import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext'; // ตรวจสอบว่า path ถูกต้อง

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function EditProfilePage() {
  const { currentUser, setCurrentUser } = useAuth(); // ดึง currentUser และฟังก์ชันอัปเดต
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(''); // สำหรับแสดงข้อความแจ้งเตือน

  // 1. เมื่อหน้าถูกโหลด, ดึงข้อมูล currentUser มาใส่ในฟอร์ม
  useEffect(() => {
    if (currentUser) {
      setFormData({
        name: currentUser.name || '',
        email: currentUser.email || '',
      });
    }
  }, [currentUser]);

  // 2. ฟังก์ชันจัดการเมื่อข้อมูลในฟอร์มเปลี่ยน
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 3. ฟังก์ชันเมื่อกดปุ่มบันทึก
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser?.id) return;

    setLoading(true);
    setMessage('');
    try {
      // 4. ส่ง request ไปยัง API เพื่ออัปเดตข้อมูล
      const response = await axios.put(`${API_BASE_URL}/api/users/${currentUser.id}`, {
        name: formData.name,
        email: formData.email,
      });

      // 5. อัปเดตข้อมูลใน AuthContext ทันทีเพื่อให้แสดงผลที่แก้ไขแล้วทั่วทั้งเว็บ
      const updatedUser = response.data;
      setCurrentUser(prev => ({ ...prev, ...updatedUser }));

      setMessage('บันทึกข้อมูลโปรไฟล์สำเร็จแล้ว!');
      setTimeout(() => setMessage(''), 3000); // ซ่อนข้อความหลังจาก 3 วินาที

    } catch (error) {
      console.error('Failed to update profile:', error);
      setMessage('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return <div>กำลังโหลดข้อมูลผู้ใช้...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-slate-800 shadow-md rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">แก้ไขโปรไฟล์</h1>

        {/* แสดงข้อความแจ้งเตือน */}
        {message && (
          <div className={`p-3 mb-4 rounded-lg text-sm ${message.includes('สำเร็จ') ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              ชื่อ-นามสกุล
            </label>
            <input
              type="text"
              name="name"
              id="name"
              value={formData.name}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              อีเมล
            </label>
            <input
              type="email"
              name="email"
              id="email"
              value={formData.email}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          {/* อาจจะเพิ่มฟอร์มเปลี่ยนรหัสผ่านที่นี่ */}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}