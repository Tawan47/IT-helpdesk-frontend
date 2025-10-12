import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UploadCloud } from 'lucide-react';

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
      const response = await fetch('http://localhost:5000/api/tickets', {
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
    <div className="bg-gray-50 dark:bg-gray-800 p-6 sm:p-8 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-2xl mx-auto">
      <h2 className="text-3xl font-extrabold mb-6 text-gray-900 dark:text-white">ฟอร์มแจ้งซ่อมปัญหา</h2>
      
      {/* ส่วนแสดงข้อผิดพลาด */}
      {error && <p className="bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-200 p-4 rounded-xl mb-4 text-center font-medium">{error}</p>}

      <form onSubmit={handleSubmit}>
        {/* หัวข้อปัญหา */}
        <div className="mb-5">
          <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">หัวข้อปัญหา *</label>
          <input 
            type="text" 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors" 
            required 
          />
        </div>

        {/* รายละเอียดปัญหา */}
        <div className="mb-5">
          <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">รายละเอียดปัญหา *</label>
          <textarea 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors" 
            rows="4" 
            required
          ></textarea>
        </div>

        {/* ข้อมูลที่ตั้ง */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">อาคาร *</label>
            <input 
              type="text" 
              value={building} 
              onChange={e => setBuilding(e.target.value)} 
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors" 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">ชั้น</label>
            <input 
              type="text" 
              value={floor} 
              onChange={e => setFloor(e.target.value)} 
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors" 
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">ห้อง</label>
            <input 
              type="text" 
              value={room} 
              onChange={e => setRoom(e.target.value)} 
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors" 
            />
          </div>
        </div>

        {/* ส่วนอัปโหลดรูปภาพ */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">แนบรูปภาพประกอบ (ถ้ามี)</label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <label htmlFor="file-upload" className="flex flex-col items-center justify-center space-y-2 text-center w-full h-full">
              <UploadCloud className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
              <div className="flex text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors">
                  อัปโหลดไฟล์
                </span>
                <p className="pl-1">หรือลากและวางที่นี่</p>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, GIF ขนาดไม่เกิน 10MB</p>
              {image && <p className="text-sm font-semibold mt-2 text-green-600 dark:text-green-400">ไฟล์ที่เลือก: {image.name}</p>}
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
          className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'กำลังส่ง...' : 'ส่งใบแจ้งซ่อม'}
        </button>
      </form>
    </div>
  );
}
