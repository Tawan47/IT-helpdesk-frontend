// src/components/MainLayout.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
import ChatBotWidget from './ChatBotWidget';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSocket } from '../contexts/SocketContext';

import {
  LogOut, Wrench, Bell, LayoutDashboard, Ticket, Users, PlusCircle,
  HardHat, PieChart as ChartIcon, Sun, Moon, UserCircle, Box as InventoryIcon,
  PanelLeftClose, PanelLeftOpen, Bot
} from 'lucide-react';

/* ================= Sidebar ================= */
function Sidebar({ role, collapsed, onToggle }) {
  const { logout } = useAuth();
  const { theme } = useTheme();

  // ปรับ path ของ Admin ให้เป็น /admin/:section
  const navItems = {
    User: [
      { path: '/dashboard', label: 'แดชบอร์ด', icon: LayoutDashboard },
      { path: '/tickets/new', label: 'แจ้งซ่อมใหม่', icon: PlusCircle },
      { path: '/ai', label: 'ผู้ช่วย AI', icon: Bot },
      { path: '/profile', label: 'โปรไฟล์', icon: UserCircle },
    ],
    Technician: [
      { path: '/dashboard', label: 'งานของฉัน', icon: HardHat },
      { path: '/ai', label: 'ผู้ช่วย AI', icon: Bot },
    ],
    Admin: [
      { path: '/admin/dashboard', label: 'ภาพรวม', icon: LayoutDashboard },
      { path: '/admin/tickets', label: 'จัดการใบแจ้งซ่อม', icon: Ticket },
      { path: '/admin/users', label: 'จัดการผู้ใช้งาน', icon: Users },
      { path: '/admin/inventory', label: 'จัดการครุภัณฑ์', icon: InventoryIcon },
      { path: '/admin/analytics', label: 'รายงานสรุป', icon: ChartIcon },
      { path: '/ai', label: 'ผู้ช่วย AI', icon: Bot },
    ],
  };

  const getActiveStyle = ({ isActive }) => {
    if (!isActive) return {};
    return theme === 'dark'
      ? { backgroundColor: '#374151', color: 'white' }
      : { backgroundColor: 'rgba(79, 70, 229, 0.1)', color: '#4338ca' };
  };

  return (
    <aside
      className={`${collapsed ? 'w-20' : 'w-64'} bg-white dark:bg-slate-800 shadow-lg h-screen fixed z-20 transition-all duration-300 ease-in-out border-r border-slate-200 dark:border-slate-700`}
      aria-label="Sidebar"
    >
      {/* Header + Toggle */}
      <div className="p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Wrench className="h-7 w-7 text-indigo-600" />
          {!collapsed && (
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">IT Helpdesk Pro</h2>
          )}
        </div>
        <button
          onClick={onToggle}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="p-3 space-y-1">
        {(navItems[role] || []).map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              style={getActiveStyle}
              className="group relative w-full flex items-center gap-3 p-3 rounded-lg text-left text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="font-medium truncate">{item.label}</span>}
              {collapsed && (
                <span className="pointer-events-none absolute left-16 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-900 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.label}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 p-3 rounded-lg text-left text-slate-600 dark:text-slate-300 hover:bg-red-100 dark:hover:bg-red-500/20 hover:text-red-700 dark:hover:text-red-300 transition-colors"
          title={collapsed ? 'ออกจากระบบ' : undefined}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span className="font-medium">ออกจากระบบ</span>}
        </button>
      </div>
    </aside>
  );
}

/* ================= Header ================= */
function Header({ title, onToggleSidebar }) {
  const { currentUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const socket = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  useEffect(() => {
    if (currentUser?.id) {
      fetch(`http://localhost:5000/api/notifications/${currentUser.id}`)
        .then((res) => res.json())
        .then((data) => Array.isArray(data) && setNotifications(data))
        .catch(console.error);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!socket || !currentUser?.id) return;
    socket.emit('register_user', currentUser.id);
    const handleNew = (n) => setNotifications((prev) => [n, ...prev]);
    socket.on('new_notification', handleNew);
    return () => socket.off('new_notification', handleNew);
  }, [socket, currentUser]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markRead = async () => {
    if (unreadCount > 0) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      try {
        await fetch('http://localhost:5000/api/notifications/read', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id }),
        });
      } catch (e) {
        console.error(e);
      }
    }
    setTimeout(() => setIsNotificationOpen(false), 150);
  };

  return (
    <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-sm sticky top-0 z-10">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
              aria-label="Toggle sidebar"
            >
              <PanelLeftOpen size={18} />
            </button>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{title}</h1>
          </div>

          <div className="flex items-center">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 mr-4 transition-colors"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            <div className="relative">
              <button
                onClick={() => setIsNotificationOpen((p) => !p)}
                className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
              >
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                )}
              </button>

              {isNotificationOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-700 rounded-lg shadow-xl z-20 border dark:border-slate-600">
                  <div className="p-4 font-semibold border-b dark:border-slate-600 flex justify-between items-center">
                    <span className="dark:text-white">การแจ้งเตือน</span>
                    {unreadCount > 0 && (
                      <span className="text-xs bg-red-500 text-white font-bold px-2 py-1 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-4 border-b dark:border-slate-600 ${!n.is_read ? 'bg-indigo-50 dark:bg-slate-600/50' : ''}`}
                        >
                          <p className="text-sm dark:text-slate-200">{n.message}</p>
                          <p className="text-xs text-gray-400 dark:text-slate-400 mt-1">
                            {new Date(n.created_at).toLocaleString('th-TH')}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="p-4 text-sm text-center text-gray-500 dark:text-slate-400">ไม่มีการแจ้งเตือน</p>
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <button
                      onClick={markRead}
                      className="w-full text-center p-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-gray-100 dark:hover:bg-slate-600 font-semibold"
                    >
                      ทำเครื่องหมายว่าอ่านทั้งหมดแล้ว
                    </button>
                  )}
                </div>
              )}
            </div>

            <Link to="/profile" className="flex items-center ml-4">
              <div className="text-right hidden sm:block">
                <p className="font-semibold text-slate-800 dark:text-slate-100">{currentUser?.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{currentUser?.role}</p>
              </div>
              <img
                src={`https://i.pravatar.cc/40?u=${currentUser?.email}`}
                alt="avatar"
                className="h-10 w-10 rounded-full ml-4 border-2 border-slate-200 dark:border-slate-600"
              />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ================= Main Layout ================= */
export default function MainLayout() {
  const { currentUser } = useAuth();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar.collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  useEffect(() => {
    localStorage.setItem('sidebar.collapsed', JSON.stringify(collapsed));
  }, [collapsed]);

  // รองรับเส้นทาง /admin/:section ด้วย
  const pageTitle = useMemo(() => {
    const p = location.pathname;

    if (p.startsWith('/admin/')) {
      if (p.startsWith('/admin/tickets'))   return 'จัดการใบแจ้งซ่อม';
      if (p.startsWith('/admin/users'))     return 'จัดการผู้ใช้งาน';
      if (p.startsWith('/admin/inventory')) return 'จัดการครุภัณฑ์';
      if (p.startsWith('/admin/analytics')) return 'รายงานสรุป';
      return 'ภาพรวม';
    }

    // เส้นทางอื่น (ผู้ใช้/ช่าง)
    if (p.includes('/tickets') && p.includes('/new')) return 'แจ้งซ่อมใหม่';
    if (p.startsWith('/tickets')) return 'จัดการใบแจ้งซ่อม';
    if (p.startsWith('/users')) return 'จัดการผู้ใช้งาน';
    if (p.startsWith('/inventory')) return 'จัดการครุภัณฑ์';
    if (p.startsWith('/analytics')) return 'รายงานสรุป';
    if (p.startsWith('/ai')) return 'ผู้ช่วย AI';
    if (p.startsWith('/profile')) return 'โปรไฟล์';
    return 'ภาพรวม';
  }, [location.pathname]);

  return (
    <div className="flex bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 min-h-screen">
      <Sidebar
        role={currentUser?.role}
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
      />
      <div className={`flex-1 transition-all duration-300 ${collapsed ? 'ml-20' : 'ml-64'}`}>
        <Header title={pageTitle} onToggleSidebar={() => setCollapsed((v) => !v)} />
        <main className="p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* ปุ่มลอย/วิดเจ็ตแชตบอท (ถ้ามี) */}
      <ChatBotWidget />
    </div>
  );
}
