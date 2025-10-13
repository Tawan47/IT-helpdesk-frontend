// TEST CHANGE 12345
// src/contexts/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

// ✅ 1. ดึง API URL มาจาก Environment Variable
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const STORAGE_KEY = 'currentUser';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // โหลดจาก localStorage ครั้งแรก
  const [currentUser, setUserState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    try { return saved ? JSON.parse(saved) : null; } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  // setter ที่ซิงค์ state + localStorage (รองรับทั้ง object และ updater fn)
  const setCurrentUser = useCallback((updater) => {
    setUserState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else localStorage.removeItem(STORAGE_KEY);
      return next;
    });
  }, []);

  // ซิงค์ข้ามแท็บ/หน้าต่าง
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) {
        try { setUserState(e.newValue ? JSON.parse(e.newValue) : null); }
        catch { /* noop */ }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // ===== APIs =====
  const login = async (email, password) => {
    setLoading(true);
    try {
      // ✅ 2. เปลี่ยนมาใช้ API_BASE_URL ที่เราสร้างไว้
      const res = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const msg = (await res.json().catch(() => ({})))?.error || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
        throw new Error(msg);
      }
      const userData = await res.json();
      setCurrentUser(userData); // อัปเดต state + localStorage
      return userData;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password) => {
    setLoading(true);
    try {
      // ✅ 3. เปลี่ยนมาใช้ API_BASE_URL ที่เราสร้างไว้
      const res = await fetch(`${API_BASE_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) {
        const msg = (await res.json().catch(() => ({})))?.error || 'ไม่สามารถสมัครสมาชิกได้';
        throw new Error(msg);
      }
      const newUser = await res.json();
      setCurrentUser(newUser); // สมัครแล้วล็อกอินเลย
      return newUser;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => setCurrentUser(null);

  // ค่า context
  const value = { currentUser, setCurrentUser, loading, login, register, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
