import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => {
   return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
 const [socket, setSocket] = useState(null);

 useEffect(() => {
 // ✅ 1. ดึง URL ของ Backend มาจาก Environment Variable
const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
 
 // ✅ 2. สร้างการเชื่อมต่อ Socket.IO ไปยัง URL ที่ถูกต้อง
 //    เพิ่ม withCredentials: true เพื่อให้ส่งข้อมูล cookie/session ข้าม origin ได้
 const newSocket = io(SOCKET_URL, {
 withCredentials: true,
 });
 setSocket(newSocket);

 // Cleanup function: เมื่อ component ถูก unmount ให้ยกเลิกการเชื่อมต่อ
 // เพื่อป้องกันการเชื่อมต่อค้างในระบบ
 return () => newSocket.close();
 }, []); // useEffect นี้จะทำงานแค่ครั้งเดียวเมื่อแอปเริ่มทำงาน

 return (
 <SocketContext.Provider value={socket}>
 {children}
 </SocketContext.Provider>
 );
};