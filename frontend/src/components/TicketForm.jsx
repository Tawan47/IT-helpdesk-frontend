import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UploadCloud, FileText, MapPin, Building2, Layers, DoorClosed, Send, Sparkles, CheckCircle } from 'lucide-react';

// ✅ 1. กำหนดค่า Base URL ของ API ให้ถูกต้อง
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * A form component for users to submit new repair tickets.
 * This version includes enhanced styling and an image upload feature.
 * @param {function} onSubmitSuccess - Callback function to execute on successful form submission.
 */
export default function TicketForm({ onSubmitSuccess }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [building, setBuilding] = useState('');
  const [floor, setFloor] = useState('');
  const [room, setRoom] = useState('');
  const [image, setImage] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { currentUser } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('building', building);
    formData.append('floor', floor);
    formData.append('room', room);
    formData.append('user_id', currentUser.id);
    if (image) {
      formData.append('image', image);
    }

    try {
      // ✅ 2. สร้าง URL เต็มโดยต่อ endpoint ที่ถูกต้อง (`/api/tickets`)
      const response = await fetch(`${API_BASE_URL}/api/tickets`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'ไม่สามารถส่งใบแจ้งซ่อมได้');
      }

      onSubmitSuccess();

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative overflow-hidden bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm p-8 rounded-3xl shadow-2xl border border-slate-200/70 dark:border-slate-700/60 max-w-2xl mx-auto">
      {/* Decorative elements */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-indigo-500/10 to-purple-500/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-tr from-emerald-500/10 to-cyan-500/5 rounded-full blur-3xl" />

      {/* Header */}
      <div className="relative flex items-center gap-4 mb-8">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
          <FileText className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">ฟอร์มแจ้งซ่อมปัญหา</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">กรอกข้อมูลให้ครบถ้วนเพื่อให้ช่างเข้าใจปัญหาได้ดี</p>
        </div>
      </div>

      {/* ส่วนแสดงข้อผิดพลาด */}
      {error && (
        <div className="relative overflow-hidden bg-gradient-to-r from-red-500/10 to-rose-500/10 border border-red-200 dark:border-red-500/30 p-4 rounded-xl mb-6">
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-red-500/10 rounded-full blur-xl" />
          <p className="relative text-red-600 dark:text-red-400 text-center font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="relative space-y-6">
        {/* หัวข้อปัญหา */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            หัวข้อปัญหา <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="เช่น คอมพิวเตอร์เปิดไม่ติด, เครื่องปริ้นท์ไม่ทำงาน"
            className="w-full p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            required
          />
        </div>

        {/* รายละเอียดปัญหา */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <FileText className="h-4 w-4 text-indigo-500" />
            รายละเอียดปัญหา <span className="text-red-500">*</span>
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="อธิบายอาการที่พบ เช่น กดปุ่มเปิดแล้วไม่มีอะไรเกิดขึ้น, ไฟกระพริบ..."
            className="w-full p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
            rows="4"
            required
          />
        </div>

        {/* ข้อมูลที่ตั้ง */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <MapPin className="h-4 w-4 text-emerald-500" />
            สถานที่
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={building}
                onChange={e => setBuilding(e.target.value)}
                placeholder="อาคาร *"
                className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                required
              />
            </div>
            <div className="relative">
              <Layers className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={floor}
                onChange={e => setFloor(e.target.value)}
                placeholder="ชั้น"
                className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
            <div className="relative">
              <DoorClosed className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={room}
                onChange={e => setRoom(e.target.value)}
                placeholder="ห้อง"
                className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
        </div>

        {/* ส่วนอัปโหลดรูปภาพ */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <UploadCloud className="h-4 w-4 text-amber-500" />
            แนบรูปภาพประกอบ (ถ้ามี)
          </label>
          <div className={`mt-1 relative overflow-hidden border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 ${image ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/20' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20'}`}>
            <label htmlFor="file-upload" className="flex flex-col items-center justify-center p-8 text-center w-full h-full cursor-pointer">
              {image ? (
                <div className="flex flex-col items-center">
                  <div className="p-4 rounded-full bg-emerald-100 dark:bg-emerald-900/40 mb-3">
                    <CheckCircle className="h-8 w-8 text-emerald-500" />
                  </div>
                  <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">ไฟล์ที่เลือก:</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{image.name}</p>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setImage(null); }}
                    className="mt-3 text-xs text-red-500 hover:text-red-600 font-medium"
                  >
                    ลบไฟล์
                  </button>
                </div>
              ) : (
                <>
                  <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-700 mb-3">
                    <UploadCloud className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">อัปโหลดไฟล์</span>
                    <span className="text-slate-500 dark:text-slate-400">หรือลากและวางที่นี่</span>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">PNG, JPG, GIF ขนาดไม่เกิน 10MB</p>
                </>
              )}
              <input
                id="file-upload"
                name="file-upload"
                type="file"
                className="sr-only"
                onChange={(e) => setImage(e.target.files[0])}
                accept="image/*"
              />
            </label>
          </div>
        </div>

        {/* ปุ่มส่งฟอร์ม */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 hover:from-indigo-600 hover:via-purple-600 hover:to-fuchsia-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:scale-[1.01] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              กำลังส่ง...
            </>
          ) : (
            <>
              <Send className="h-5 w-5" />
              ส่งใบแจ้งซ่อม
            </>
          )}
        </button>
      </form>
    </div>
  );
}
