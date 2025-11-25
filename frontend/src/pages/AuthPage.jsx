import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx'; // ✅ แก้ไข: ระบุนามสกุลไฟล์ให้ชัดเจน
import { useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Briefcase } from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      if (isLogin) {
        // ✅ รับค่า user ที่ส่งกลับมาจาก AuthContext
        const user = await login(email, password);
        
        // ✅ ตรวจสอบ Role แล้วพาไปหน้า Dashboard ที่ถูกต้อง
        if (user.role === 'Admin') {
          navigate('/admin/dashboard');
        } else if (user.role === 'Technician') {
          navigate('/technician/dashboard');
        } else {
          navigate('/user/dashboard');
        }
        
      } else {
        await register(name, email, password);
        setIsLogin(true);
        setError('สมัครสมาชิกสำเร็จแล้ว! กรุณาลงชื่อเข้าใช้');
        // เคลียร์ฟอร์ม
        setName('');
        setEmail('');
        setPassword('');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-indigo-200 via-white to-purple-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 relative overflow-hidden">
      {/* ลวดลายเบื้องหลังเบา ๆ */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1522199710521-72d69614c702?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center opacity-20 blur-sm z-0" />

      {/* Overlay สีบาง + เบลอ */}
      <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/60 backdrop-blur-md z-0" />

      {/* กล่องฟอร์ม */}
      <div className={`w-full max-w-md relative z-10 transition-all duration-700 ease-out ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md p-10 rounded-3xl shadow-2xl border border-white/30 dark:border-slate-700/50">
          <div className="text-center mb-8">
            <div className="inline-block p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full shadow-lg mb-4">
              <Briefcase className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
              Helpdesk System
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
              {isLogin ? 'ลงชื่อเข้าใช้เพื่อเริ่มใช้งาน' : 'สร้างบัญชีเพื่อแจ้งซ่อม'}
            </p>
          </div>

          {error && (
            <p className={`p-3 rounded-xl mb-4 text-center text-sm font-medium ${error.includes('สำเร็จ') ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  placeholder="ชื่อ-สกุล"
                  className="w-full p-3 pl-11 rounded-xl bg-white/80 dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="อีเมล"
                className="w-full p-3 pl-11 rounded-xl bg-white/80 dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="รหัสผ่าน"
                className="w-full p-3 pl-11 rounded-xl bg-white/80 dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-800"
            >
              {isLoading ? 'กำลังดำเนินการ...' : (isLogin ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก')}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
            {isLogin ? 'ยังไม่มีบัญชี?' : 'มีบัญชีอยู่แล้ว?'}
            <button
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 ml-1 focus:outline-none"
            >
              {isLogin ? 'สมัครสมาชิกที่นี่' : 'เข้าสู่ระบบที่นี่'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}