import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

// ✅ 1. ดึง API URL มาจาก Environment Variable
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const STORAGE_KEY = 'currentUser';
const TOKEN_KEY = 'token'; // ✅ เพิ่ม key สำหรับเก็บ Token แยกต่างหาก

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // โหลดจาก localStorage ครั้งแรก
  const [currentUser, setUserState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    try { return saved ? JSON.parse(saved) : null; } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  // setter ที่ซิงค์ state + localStorage
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
      const res = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      if (!res.ok) {
        const msg = (await res.json().catch(() => ({})))?.error || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
        throw new Error(msg);
      }

      // ✅ แก้ไข: รับค่า token และ user แยกกัน
      const data = await res.json(); 
      // data หน้าตาจะเป็น { token: "...", user: { id: 1, name: "...", ... } }

      if (data.token) {
        localStorage.setItem(TOKEN_KEY, data.token); // 🔑 บันทึก Token แยกไว้ใช้ยิง API
      }
      
      // บันทึกเฉพาะข้อมูล User ลง Context
      const userObj = data.user || data; 
      setCurrentUser(userObj); 
      
      return userObj;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password) => {
    setLoading(true);
    try {
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
      
      // ⚠️ หมายเหตุ: ปกติ register มักจะไม่ส่ง token มาด้วย (ต้อง login ใหม่)
      // แต่ถ้าจะให้ login เลย ต้องแก้ backend ให้ส่ง token มาตอน register ด้วย
      // สำหรับตอนนี้ ให้ user สมัครเสร็จแล้วไป login เอง หรือเก็บ user ไว้ก่อน
      setCurrentUser(newUser); 
      
      return newUser;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY); // ✅ ลบ Token ออกด้วยเมื่อ Logout
    setCurrentUser(null);
  };

  // ค่า context
  const value = { currentUser, setCurrentUser, loading, login, register, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);