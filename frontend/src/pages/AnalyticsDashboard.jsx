import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertTriangle, CheckCircle, Hourglass, UserCheck, Star, Users, HardHat, Ticket } from 'lucide-react';

// --- Sub-component: การ์ดสรุปข้อมูล Analytics ---
function AnalyticsStatCard({ title, value, icon }) {
    const IconComponent = icon;
    return (
        <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex items-center">
                <IconComponent className="h-8 w-8 text-indigo-500" />
                <div className="ml-4">
                    <p className="text-3xl font-bold text-gray-900">{value}</p>
                    <p className="text-sm font-medium text-gray-500">{title}</p>
                </div>
            </div>
        </div>
    );
}

export default function AnalyticsDashboard() {
    const [stats, setStats] = useState(null);
    const [commonProblems, setCommonProblems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchAnalyticsData = async () => {
            try {
                const [statsRes, problemsRes] = await Promise.all([
                    fetch('http://localhost:5000/api/analytics/stats'),
                    fetch('http://localhost:5000/api/analytics/common-problems')
                ]);
                if (!statsRes.ok || !problemsRes.ok) throw new Error('ไม่สามารถดึงข้อมูลได้');
                const statsData = await statsRes.json();
                const problemsData = await problemsRes.json();
                setStats(statsData);
                setCommonProblems(problemsData);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalyticsData();
    }, []);

    if (loading) return <div className="text-center p-8">กำลังโหลดข้อมูล...</div>;
    if (error) return <div className="bg-red-100 text-red-700 p-4 rounded-lg">{error}</div>;

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    return (
        <div className="space-y-8">
            {/* General Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <AnalyticsStatCard title="ใบแจ้งซ่อมทั้งหมด" value={stats.totalTickets} icon={Ticket} />
                <AnalyticsStatCard title="คะแนนเฉลี่ย" value={stats.avgRating} icon={Star} />
                <AnalyticsStatCard title="ผู้ใช้ทั้งหมด" value={stats.totalUsers} icon={Users} />
                <AnalyticsStatCard title="ช่างเทคนิค" value={stats.totalTechnicians} icon={HardHat} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">5 ปัญหาที่พบบ่อยที่สุด</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={commonProblems} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="title" type="category" width={150} tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="count" name="จำนวนครั้ง" fill="#8884d8" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                {/* Add more charts here in the future */}
                <div className="bg-white p-6 rounded-xl shadow-md flex items-center justify-center">
                     <p className="text-gray-400">พื้นที่สำหรับกราฟอื่นๆ ในอนาคต</p>
                </div>
            </div>
        </div>
    );
}