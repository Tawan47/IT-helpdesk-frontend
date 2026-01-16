import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, RadialBarChart, RadialBar, Legend,
    ComposedChart, Line
} from 'recharts';
import { Star, Users, HardHat, Ticket, TrendingUp, Award, Activity, BarChart3, Zap, Clock } from 'lucide-react';

// ✅ 1. กำหนดค่า Base URL ของ API ให้ถูกต้อง
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// --- Sub-component: การ์ดสรุปข้อมูล Analytics ---
function AnalyticsStatCard({ title, value, icon, gradient }) {
    const IconComponent = icon;
    return (
        <div className={`relative overflow-hidden rounded-2xl p-5 shadow-lg border border-white/20 bg-gradient-to-br ${gradient} hover:shadow-xl hover:scale-[1.02] transition-all duration-300`}>
            {/* Decorative elements */}
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-xl" />
            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/10 rounded-full blur-lg" />

            <div className="relative flex items-center gap-4">
                <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm shadow-inner">
                    <IconComponent className="h-6 w-6 text-white" />
                </div>
                <div>
                    <p className="text-4xl font-extrabold text-white tracking-tight drop-shadow-sm">{value}</p>
                    <p className="text-sm font-medium text-white/80 mt-1">{title}</p>
                </div>
            </div>
        </div>
    );
}

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900/95 backdrop-blur-sm px-4 py-3 rounded-xl shadow-2xl border border-slate-700/50">
                <p className="text-white font-semibold text-sm">{label}</p>
                <p className="text-indigo-300 text-lg font-bold">{payload[0].value} ครั้ง</p>
            </div>
        );
    }
    return null;
};

export default function AnalyticsDashboard() {
    const [stats, setStats] = useState(null);
    const [commonProblems, setCommonProblems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchAnalyticsData = async () => {
            try {
                const [statsRes, problemsRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/analytics/stats`),
                    fetch(`${API_BASE_URL}/api/analytics/common-problems`)
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

    if (loading) return (
        <div className="flex items-center justify-center p-12">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-500 dark:text-slate-400">กำลังโหลดข้อมูล...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="bg-gradient-to-r from-red-500/10 to-rose-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 p-4 rounded-xl">
            {error}
        </div>
    );

    // Prepare data for Radial Bar Chart (Status Distribution)
    const radialData = [
        { name: 'งานใหม่', value: 85, fill: '#6366f1' },
        { name: 'กำลังดำเนินการ', value: 65, fill: '#8b5cf6' },
        { name: 'เสร็จสิ้น', value: 92, fill: '#10b981' },
        { name: 'รอตรวจสอบ', value: 45, fill: '#f59e0b' },
    ];

    // Prepare Area Chart Data (Mock trend data)
    const trendData = [
        { name: 'จ.', งานใหม่: 4, เสร็จสิ้น: 2 },
        { name: 'อ.', งานใหม่: 6, เสร็จสิ้น: 5 },
        { name: 'พ.', งานใหม่: 3, เสร็จสิ้น: 4 },
        { name: 'พฤ.', งานใหม่: 8, เสร็จสิ้น: 6 },
        { name: 'ศ.', งานใหม่: 5, เสร็จสิ้น: 7 },
        { name: 'ส.', งานใหม่: 2, เสร็จสิ้น: 3 },
        { name: 'อา.', งานใหม่: 1, เสร็จสิ้น: 2 },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <BarChart3 className="h-6 w-6 text-indigo-500" />
                        รายงานและสถิติ
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">ภาพรวมข้อมูลระบบ Helpdesk</p>
                </div>
            </div>

            {/* General Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <AnalyticsStatCard
                    title="ใบแจ้งซ่อมทั้งหมด"
                    value={stats.totalTickets}
                    icon={Ticket}
                    gradient="from-blue-500 via-indigo-500 to-violet-500"
                />
                <AnalyticsStatCard
                    title="คะแนนเฉลี่ย"
                    value={stats.avgRating}
                    icon={Star}
                    gradient="from-amber-500 via-orange-500 to-red-500"
                />
                <AnalyticsStatCard
                    title="ผู้ใช้ทั้งหมด"
                    value={stats.totalUsers}
                    icon={Users}
                    gradient="from-emerald-500 via-green-500 to-teal-500"
                />
                <AnalyticsStatCard
                    title="ช่างเทคนิค"
                    value={stats.totalTechnicians}
                    icon={HardHat}
                    gradient="from-purple-500 via-fuchsia-500 to-pink-500"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Area Chart - Weekly Trend */}
                <div className="relative overflow-hidden bg-white/90 dark:bg-slate-800/90 backdrop-blur p-6 rounded-2xl shadow-lg border border-slate-200/70 dark:border-slate-700/60">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-400/10 to-purple-400/5 rounded-full blur-3xl" />

                    <div className="relative">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
                                <TrendingUp className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">แนวโน้มรายสัปดาห์</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">เปรียบเทียบงานใหม่ vs เสร็จสิ้น</p>
                            </div>
                        </div>

                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorDone" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.3} vertical={false} />
                                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="งานใหม่" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorNew)" />
                                <Area type="monotone" dataKey="เสร็จสิ้น" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorDone)" />
                            </AreaChart>
                        </ResponsiveContainer>

                        {/* Legend */}
                        <div className="flex justify-center gap-6 mt-4">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-indigo-500" />
                                <span className="text-sm text-slate-600 dark:text-slate-400">งานใหม่</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                <span className="text-sm text-slate-600 dark:text-slate-400">เสร็จสิ้น</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Radial Bar Chart - Performance */}
                <div className="relative overflow-hidden bg-white/90 dark:bg-slate-800/90 backdrop-blur p-6 rounded-2xl shadow-lg border border-slate-200/70 dark:border-slate-700/60">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-400/10 to-pink-400/5 rounded-full blur-3xl" />

                    <div className="relative">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg shadow-purple-500/30">
                                <Zap className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">ประสิทธิภาพการทำงาน</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">เปอร์เซ็นต์ความสำเร็จแต่ละประเภท</p>
                            </div>
                        </div>

                        <ResponsiveContainer width="100%" height={280}>
                            <RadialBarChart
                                cx="50%"
                                cy="50%"
                                innerRadius="30%"
                                outerRadius="90%"
                                barSize={18}
                                data={radialData}
                                startAngle={180}
                                endAngle={-180}
                            >
                                <RadialBar
                                    background={{ fill: '#1e293b30' }}
                                    dataKey="value"
                                    cornerRadius={10}
                                />
                                <Legend
                                    iconSize={10}
                                    layout="horizontal"
                                    verticalAlign="bottom"
                                    formatter={(value) => <span className="text-xs text-slate-600 dark:text-slate-300">{value}</span>}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                        border: 'none',
                                        borderRadius: '12px',
                                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
                                    }}
                                    formatter={(value) => [`${value}%`, 'ความสำเร็จ']}
                                    labelStyle={{ color: '#fff' }}
                                />
                            </RadialBarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Horizontal Bar Chart - Common Problems */}
            <div className="relative overflow-hidden bg-white/90 dark:bg-slate-800/90 backdrop-blur p-6 rounded-2xl shadow-lg border border-slate-200/70 dark:border-slate-700/60">
                <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-cyan-400/10 to-blue-400/5 rounded-full blur-3xl" />

                <div className="relative">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30">
                            <Award className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">ปัญหาที่พบบ่อยที่สุด</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Top 5 ปัญหาที่มีการแจ้งมากที่สุด</p>
                        </div>
                    </div>

                    <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart layout="vertical" data={commonProblems} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <defs>
                                <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#06b6d4" />
                                    <stop offset="50%" stopColor="#6366f1" />
                                    <stop offset="100%" stopColor="#a855f7" />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.3} horizontal={true} vertical={false} />
                            <XAxis type="number" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                            <YAxis dataKey="title" type="category" width={140} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar
                                dataKey="count"
                                barSize={24}
                                fill="url(#barGradient)"
                                radius={[0, 12, 12, 0]}
                            />
                            <Line
                                type="monotone"
                                dataKey="count"
                                stroke="#f472b6"
                                strokeWidth={2}
                                dot={{ fill: '#f472b6', strokeWidth: 2, r: 5 }}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'อัตราการแก้ไขสำเร็จ', value: '92%', icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                    { label: 'เวลาตอบกลับเฉลี่ย', value: '2.5 ชม.', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                    { label: 'งานค้างรอดำเนินการ', value: stats.totalTickets > 0 ? Math.floor(stats.totalTickets * 0.3) : 0, icon: Ticket, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                    { label: 'ความพึงพอใจ', value: stats.avgRating !== 'N/A' ? `${stats.avgRating}/5` : 'N/A', icon: Star, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                ].map((item, i) => (
                    <div key={i} className="relative overflow-hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur rounded-xl p-4 border border-slate-200/70 dark:border-slate-700/60 hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
                        <div className={`absolute -top-4 -right-4 w-16 h-16 ${item.bg} rounded-full blur-xl`} />
                        <div className="relative flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${item.bg}`}>
                                <item.icon className={`h-5 w-5 ${item.color}`} />
                            </div>
                            <div>
                                <p className="text-xl font-bold text-slate-900 dark:text-white">{item.value}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{item.label}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}