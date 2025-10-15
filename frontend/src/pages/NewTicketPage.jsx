import React from 'react';
import { useNavigate } from 'react-router-dom';
import TicketForm from '../components/TicketForm'; // import ฟอร์มที่เรามีอยู่แล้ว

export default function NewTicketPage() {
  const navigate = useNavigate();

  // ฟังก์ชันที่จะทำงานเมื่อกรอกฟอร์มสำเร็จ
  const handleSuccess = () => {
    // กลับไปที่หน้าแดชบอร์ดหลักหลังจากแจ้งซ่อมสำเร็จ
    navigate('/dashboard'); 
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-slate-800 shadow-lg rounded-2xl border border-slate-200 dark:border-slate-700">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        </div>
        <div className="p-6">
          <TicketForm onSubmitSuccess={handleSuccess} />
        </div>
      </div>
    </div>
  );
}