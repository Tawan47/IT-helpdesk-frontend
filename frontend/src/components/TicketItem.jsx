import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { Star, MessageSquare, Image as ImageIcon, ChevronDown, ChevronUp, Edit, Send } from 'lucide-react';
import TicketStatusTracker from './TicketStatusTracker';
import { Link } from 'react-router-dom';
import axios from 'axios';

// ✅ 1. กำหนดค่า Base URL ของ API ให้ถูกต้อง
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * คอมโพเนนต์สำหรับแสดงใบแจ้งซ่อมแต่ละรายการ พร้อมฟังก์ชันการทำงานทั้งหมด
 */
export default function TicketItem({ ticket, userType, onUpdateStatus = () => {}, onRateTicket = () => {}, users = [] }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const { currentUser } = useAuth();
    const socket = useSocket();
    
    // --- State สำหรับแชท ---
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoadingChat, setIsLoadingChat] = useState(false);
    const chatEndRef = useRef(null);

    const getUserName = (userId) => users.find(u => u.id === userId)?.name || 'Unknown User';
    
    // --- ฟังก์ชันสำหรับดึงข้อความเก่า ---
    const fetchMessages = useCallback(async () => {
        if (!ticket.id) return;
        setIsLoadingChat(true);
        try {
            // ✅ 2. แก้ไขให้ใช้ API_BASE_URL
            const response = await axios.get(`${API_BASE_URL}/api/tickets/${ticket.id}/messages`);
            setMessages(response.data);
        } catch (error) {
            console.error("Failed to fetch chat messages:", error);
        } finally {
            setIsLoadingChat(false);
        }
    }, [ticket.id]);

    // --- Effect สำหรับจัดการ Socket.IO เมื่อเปิด/ปิดแชท ---
    useEffect(() => {
        if (isExpanded) {
            fetchMessages(); // ดึงข้อความเก่าเมื่อเปิด
            if (socket) {
                // เข้าห้องแชท
                socket.emit('join_ticket_room', ticket.id);
                
                // ดักฟังข้อความใหม่
                const handleNewMessage = (message) => {
                    setMessages(prev => [...prev, message]);
                };
                socket.on('new_message', handleNewMessage);

                // Cleanup function
                return () => {
                    socket.emit('leave_ticket_room', ticket.id);
                    socket.off('new_message', handleNewMessage);
                };
            }
        }
    }, [isExpanded, ticket.id, socket, fetchMessages]);

    // --- Effect สำหรับเลื่อนแชทลงล่าสุด ---
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // --- ฟังก์ชันสำหรับส่งข้อความใหม่ ---
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (newMessage.trim() === '' || !currentUser) return;
        
        const messageData = {
            sender_id: currentUser.id,
            message: newMessage,
        };

        try {
            // ✅ 3. แก้ไขให้ใช้ API_BASE_URL
            await axios.post(`${API_BASE_URL}/api/tickets/${ticket.id}/messages`, messageData);
            setNewMessage(''); // เคลียร์ช่องพิมพ์หลังจากส่งสำเร็จ
        } catch (error) {
            console.error("Failed to send message:", error);
            alert('ไม่สามารถส่งข้อความได้');
        }
    };
    
    // ส่วนที่เหลือของคอมโพเนนต์ (การแสดงผล, ให้คะแนน) จะคล้ายเดิม
    // ... (State and handlers for rating, etc.)
    const [rating, setRating] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [ratingError, setRatingError] = useState('');

    const handleRatingSubmit = (e) => {
        e.preventDefault();
        if (rating > 0) {
            onRateTicket(ticket.id, rating, feedback);
            setRatingError('');
        } else {
            setRatingError("กรุณาให้คะแนนอย่างน้อย 1 ดาว");
        }
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'Submitted': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
            case 'Assigned': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300';
            case 'In Progress': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
            case 'Completed': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg border border-slate-200 dark:border-slate-700">
            {/* Header */}
            <div className="p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4 flex-wrap">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusClass(ticket.status)}`}>
                            {ticket.status}
                        </span>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">{ticket.title}</h3>
                    </div>
                    <div className="flex items-center text-slate-500 dark:text-slate-400 flex-shrink-0 ml-2">
                        <span className="text-sm mr-2 hidden sm:inline">{isExpanded ? 'ซ่อน' : 'ดูรายละเอียด & แชท'}</span>
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                </div>
                <div className="mt-2 text-sm text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                    <span>ID: #{ticket.id}</span>
                    <span>แจ้งเมื่อ: {new Date(ticket.created_at).toLocaleDateString('th-TH')}</span>
                    {userType !== 'User' && <span>ผู้แจ้ง: {getUserName(ticket.user_id)}</span>}
                    {ticket.technician_id && <span>ผู้รับผิดชอบ: {getUserName(ticket.technician_id)}</span>}
                </div>
            </div>

            {/* Expanded Section */}
            {isExpanded && (
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/70">
                    <TicketStatusTracker ticket={ticket} />

                    <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Column: Details & Actions */}
                        <div className="space-y-4">
                           {/* ... (ส่วนแสดงรายละเอียด, รูปภาพ, ให้คะแนน) ... */}
                           <div>
                                <p className="font-semibold text-slate-700 dark:text-slate-300">รายละเอียดปัญหา:</p>
                                <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{ticket.description || 'ไม่มีรายละเอียด'}</p>
                            </div>
                            {ticket.image_url && (
                                <div>
                                    <p className="font-semibold text-slate-700 dark:text-slate-300 flex items-center mb-2"><ImageIcon size={16} className="mr-2"/> รูปภาพประกอบ:</p>
                                    {/* ✅ 4. แก้ไข URL ของรูปภาพให้ถูกต้อง */}
                                    <a href={`${API_BASE_URL}${ticket.image_url}`} target="_blank" rel="noopener noreferrer" className="inline-block">
                                        <img src={`${API_BASE_URL}${ticket.image_url}`} alt="Ticket attachment" className="rounded-lg max-w-full sm:max-w-xs shadow-md border dark:border-slate-600 transition-transform hover:scale-105" />
                                    </a>
                                </div>
                            )}

                            {/* Actions Box */}
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border dark:border-slate-700">
                                <h4 className="font-semibold text-slate-800 dark:text-white mb-3">การดำเนินการ</h4>
                                <div className="space-y-2">
                                    {/* ... (โค้ดสำหรับปุ่มแก้ไข, อัปเดตสถานะ, ให้คะแนน) ... */}
                                    {userType === 'User' && ticket.user_id === currentUser?.id && ticket.status === 'Submitted' && (
                                        <Link to={`/tickets/${ticket.id}/edit`} className="block">
                                            <button className="w-full text-sm bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-800 dark:text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center">
                                                <Edit size={16} className="mr-2"/> แก้ไขใบแจ้งซ่อม
                                            </button>
                                        </Link>
                                    )}
                                     {userType !== 'User' && ticket.technician_id === currentUser?.id && ticket.status !== 'Completed' && (
                                        <>
                                            {ticket.status === 'Assigned' && <button onClick={() => onUpdateStatus(ticket.id, 'In Progress')} className="w-full text-sm bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">เริ่มดำเนินการ</button>}
                                            {ticket.status === 'In Progress' && <button onClick={() => onUpdateStatus(ticket.id, 'Completed')} className="w-full text-sm bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">ปิดงาน (เสร็จสิ้น)</button>}
                                        </>
                                    )}
                                    {userType === 'User' && ticket.status === 'Completed' && (
                                        ticket.rating ? (
                                            <div>
                                                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">คะแนนที่ให้:</p>
                                                <div className="flex items-center">{[...Array(5)].map((_, i) => (<Star key={i} className={`h-5 w-5 ${i < ticket.rating ? 'text-yellow-400' : 'text-slate-300 dark:text-slate-600'}`} fill="currentColor" />))}</div>
                                            </div>
                                        ) : (
                                            <form onSubmit={handleRatingSubmit}>
                                                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1">ให้คะแนนความพึงพอใจ</p>
                                                {ratingError && <p className="text-red-500 text-xs mb-2">{ratingError}</p>}
                                                <div className="flex items-center mb-2">{[...Array(5)].map((_, i) => (<Star key={i} className={`h-7 w-7 cursor-pointer transition-colors ${i < rating ? 'text-yellow-400 hover:text-yellow-500' : 'text-slate-300 hover:text-slate-400 dark:text-slate-600'}`} fill="currentColor" onClick={() => setRating(i + 1)} />))}</div>
                                                <textarea value={feedback} onChange={e => setFeedback(e.target.value)} className="w-full text-sm p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="ความคิดเห็นเพิ่มเติม (ถ้ามี)" rows="2"></textarea>
                                                <button type="submit" className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3 rounded-lg text-sm transition-colors">ส่งคะแนน</button>
                                            </form>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Chat */}
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border dark:border-slate-700 flex flex-col h-[500px]">
                            <h4 className="font-semibold text-slate-800 dark:text-white mb-3 flex items-center">
                                <MessageSquare size={18} className="mr-2"/> พูดคุยกับช่าง
                            </h4>
                            <div className="flex-1 overflow-y-auto pr-2 space-y-4 mb-4">
                                {isLoadingChat && <p className="text-center text-slate-500">กำลังโหลดข้อความ...</p>}
                                {!isLoadingChat && messages.map(msg => (
                                    <div key={msg.id} className={`flex items-end gap-2 ${msg.sender_id === currentUser?.id ? 'justify-end' : 'justify-start'}`}>
                                       {msg.sender_id !== currentUser?.id && <img src={`https://i.pravatar.cc/32?u=${getUserName(msg.sender_id)}`} alt="avatar" className="h-8 w-8 rounded-full" />}
                                        <div className={`max-w-xs md:max-w-md p-3 rounded-2xl ${msg.sender_id === currentUser?.id ? 'bg-indigo-500 text-white rounded-br-none' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none'}`}>
                                            <p className="text-sm">{msg.message}</p>
                                        </div>
                                    </div>
                                ))}
                                <div ref={chatEndRef} />
                            </div>
                            <form onSubmit={handleSendMessage} className="flex items-center gap-2 border-t border-slate-200 dark:border-slate-700 pt-3">
                                <input 
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="พิมพ์ข้อความ..."
                                    className="flex-1 w-full p-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-2 rounded-lg flex-shrink-0">
                                    <Send size={20} />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
