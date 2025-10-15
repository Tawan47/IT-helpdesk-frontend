import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

import MainLayout from './components/MainLayout';
import AuthPage from './pages/AuthPage';
import UserDashboard from './pages/UserDashboard';
import TechnicianDashboard from './pages/TechnicianDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AiAssistant from './pages/AiAssistant';
import EditProfilePage from './pages/EditProfilePage'; // 👈 1. import หน้าโปรไฟล์เข้ามา
import NewTicketPage from './pages/NewTicketPage';

function ProtectedLayout() {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  // MainLayout ถูกย้ายไปครอบ Routes ใน App โดยตรงแล้ว
  return <Outlet />;
}

function DashboardGate() {
  const { currentUser } = useAuth();
  switch (currentUser?.role) {
    case 'User':
      return <UserDashboard />;
    case 'Technician':
      return <TechnicianDashboard />;
    case 'Admin':
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

        {/* protected area with MainLayout */}
        <Route element={currentUser ? <MainLayout /> : <Navigate to="/login" replace />}>
          
          {/* default -> ไปแดชบอร์ดตามบทบาทผ่าน DashboardGate */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardGate />} />

          {/* เส้นทางของ Admin แบบมีพารามิเตอร์ */}
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/:section" element={<AdminDashboard />} />

          {/* หน้า AI ผู้ช่วยความรู้ก่อนแจ้งช่าง */}
          <Route path="/ai" element={<AiAssistant />} />

          {/* ==================== ส่วนที่เพิ่มเข้ามา ==================== */}
          {/* ✅ 2. เพิ่ม Route สำหรับหน้าโปรไฟล์โดยเฉพาะ */}
          <Route path="/profile" element={<EditProfilePage />} />
          {/* หากมีหน้าอื่น เช่น /tickets/new ก็ให้เพิ่มตรงนี้ */}
          {/* <Route path="/tickets/new" element={<NewTicketPage />} /> */}
          {/* ========================================================== */}

          <Route path="/tickets/new" element={<NewTicketPage />} />

        </Route>

        {/* Route สำหรับหน้าที่ไม่เจอ สามารถเพิ่ม 404 Page ได้ */}
        <Route path="*" element={<Navigate to="/" />} />

      </Routes>
    </Router>
  );
}