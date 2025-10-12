// src/components/MobileBottomNav.jsx
import { NavLink } from 'react-router-dom';
import { Home, Wrench, User2 } from 'lucide-react';

export default function MobileBottomNav() {
  const item = 'flex flex-col items-center justify-center gap-1 flex-1 py-2 text-xs';
  const active = 'text-indigo-600';
  const idle = 'text-slate-500 dark:text-slate-300';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 dark:border-slate-700
                    bg-white/95 dark:bg-slate-900/90 backdrop-blur supports-[backdrop-filter]:backdrop-blur
                    pb-[max(env(safe-area-inset-bottom),8px)]">
      <div className="max-w-screen-md mx-auto flex">
        <NavLink to="/dashboard" className={({isActive})=>`${item} ${isActive?active:idle}`}>
          <Home size={18}/> หน้าหลัก
        </NavLink>
        <NavLink to="/tickets/new" className={({isActive})=>`${item} ${isActive?active:idle}`}>
          <Wrench size={18}/> แจ้งซ่อม
        </NavLink>
        <NavLink to="/profile" className={({isActive})=>`${item} ${isActive?active:idle}`}>
          <User2 size={18}/> โปรไฟล์
        </NavLink>
      </div>
    </nav>
  );
}
