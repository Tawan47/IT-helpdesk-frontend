import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // เชื่อมต่อกับ Backend Socket.IO server ที่รันอยู่ที่ port 5000
    const newSocket = io('http://localhost:5000');
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