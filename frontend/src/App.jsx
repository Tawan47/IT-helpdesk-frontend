import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

import MainLayout from './components/MainLayout';
import AuthPage from './pages/AuthPage';
import UserDashboard from './pages/UserDashboard';
import TechnicianDashboard from './pages/TechnicianDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AiAssistant from './pages/AiAssistant';

function ProtectedLayout() {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  return <MainLayout><Outlet /></MainLayout>;
}

function DashboardGate() {
  const { currentUser } = useAuth();
  switch (currentUser?.role) {
    case 'User':
      return <UserDashboard />;
    case 'Technician':
      return <TechnicianDashboard />;
    case 'Admin':
      // ส่งแอดมินไปชุดเส้นทางใหม่ /admin/:section
      return <Navigate to="/admin/dashboard" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
}

export default function App() {
  const { currentUser } = useAuth();

  return (
    <Router>
      <Routes>
        {/* auth */}
        <Route path="/login" element={currentUser ? <Navigate to="/" replace /> : <AuthPage />} />

        {/* protected area */}
        <Route element={<ProtectedLayout />}>
          {/* default -> ไปแดชบอร์ดตามบทบาทผ่าน DashboardGate */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* เส้นทางของ Admin แบบมีพารามิเตอร์ */}
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/:section" element={<AdminDashboard />} />

          {/* หน้า AI ผู้ช่วยความรู้ก่อนแจ้งช่าง */}
          <Route path="/ai" element={<AiAssistant />} />

          {/* รวมเส้นทางของผู้ใช้ทั่วไป/ช่าง (เช่น /dashboard, /tickets ฯลฯ) */}
          <Route path="/*" element={<DashboardGate />} />
        </Route>
      </Routes>
    </Router>
  );
}
