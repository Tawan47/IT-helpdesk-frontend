import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProfilePage() {
  const { currentUser } = useAuth();
  return (
    <div className="p-4 bg-white dark:bg-slate-800 rounded-xl shadow">
      <h2 className="text-2xl font-bold mb-4 text-slate-800 dark:text-white">โปรไฟล์ของฉัน</h2>
      <div className="space-y-2 text-slate-700 dark:text-slate-200">
        <div><span className="font-semibold">ชื่อ:</span> {currentUser?.name}</div>
        <div><span className="font-semibold">อีเมล:</span> {currentUser?.email}</div>
        <div><span className="font-semibold">บทบาท:</span> {currentUser?.role}</div>
      </div>
      <div className="mt-6">
        <Link to="edit" className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
          แก้ไขโปรไฟล์
        </Link>
      </div>
    </div>
  );
}
