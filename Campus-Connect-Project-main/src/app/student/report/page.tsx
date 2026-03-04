'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { AttendanceRecord } from '@/lib/types';
import { format } from 'date-fns';

function toDate(d: any): Date {
    if (d instanceof Date) return d;
    if (typeof d?.toDate === 'function') return d.toDate();
    return new Date(String(d));
}
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, AlertTriangle, TrendingUp, BookOpen, UserCheck, UserX, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function StudentReportPage() {
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();

    const attendanceQuery = useMemoFirebase(() => {
        if (!firestore || !user?.uid) return null;
        return query(collection(firestore, 'attendanceRecords'), where('studentId', '==', user.uid));
    }, [firestore, user?.uid]);
    const { data: rawRecords, isLoading: isLoadingAttendance } = useCollection<AttendanceRecord>(attendanceQuery);

    const attendanceRecords = useMemo(() => rawRecords ? [...rawRecords].sort((a, b) => String(b.date).localeCompare(String(a.date))) : null, [rawRecords]);

    const stats = useMemo(() => {
        if (!rawRecords) return { total: 0, present: 0, absent: 0, percentage: 0, bySubject: {} as Record<string, { total: number; present: number }> };
        const valid = rawRecords.filter(r => r.status === 'Present' || r.status === 'Absent');
        const present = valid.filter(r => r.status === 'Present').length;
        const absent = valid.filter(r => r.status === 'Absent').length;
        const total = valid.length;
        const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
        const bySubject = valid.reduce((acc, r) => {
            if (!r.subject) return acc;
            if (!acc[r.subject]) acc[r.subject] = { total: 0, present: 0 };
            acc[r.subject].total++;
            if (r.status === 'Present') acc[r.subject].present++;
            return acc;
        }, {} as Record<string, { total: number; present: number }>);
        return { total, present, absent, percentage, bySubject };
    }, [rawRecords]);

    const chartData = useMemo(() => {
        if (!rawRecords || rawRecords.length === 0) return [];
        const sorted = [...rawRecords].filter(r => r.status === 'Present' || r.status === 'Absent').sort((a, b) => String(a.date).localeCompare(String(b.date)));
        if (sorted.length === 0) return [];
        let pCount = 0, tCount = 0;
        return sorted.map(r => { tCount++; if (r.status === 'Present') pCount++; return { date: format(toDate(r.date), 'MMM dd, yyyy'), percentage: Math.round((pCount / tCount) * 100) }; });
    }, [rawRecords]);

    const isLoading = isLoadingAttendance || isUserLoading;

    const statCards = [
        { label: 'Total Classes', value: stats.total, icon: <BookOpen className="w-5 h-5" />, bg: 'bg-white', iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-500', iconColor: 'text-white' },
        { label: 'Present', value: stats.present, icon: <UserCheck className="w-5 h-5" />, bg: 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-100', iconBg: 'bg-gradient-to-br from-green-500 to-emerald-500', iconColor: 'text-white' },
        { label: 'Absent', value: stats.absent, icon: <UserX className="w-5 h-5" />, bg: 'bg-gradient-to-br from-red-50 to-pink-50 border-red-100', iconBg: 'bg-gradient-to-br from-red-500 to-pink-500', iconColor: 'text-white' },
        { label: 'Attendance', value: `${stats.percentage}%`, icon: <Percent className="w-5 h-5" />, bg: 'bg-white', iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-500', iconColor: 'text-white' },
    ];

    return (
        <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-6 sm:-mt-8">
            {/* ── Dark Header ── */}
            <div className="relative overflow-hidden px-4 sm:px-6 lg:px-8 pt-8 pb-10"
                style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #0f172a 100%)' }}>
                {/* Animated blobs */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute -top-20 -right-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-blob" />
                    <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-purple-500/8 rounded-full blur-3xl animate-blob" style={{ animationDelay: '5s' }} />
                    <div className="absolute inset-0 opacity-[3%]" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
                </div>

                <div className="max-w-5xl mx-auto relative">
                    <div className="flex items-start gap-4 mb-8 fade-in-up">
                        <Link href="/student/dashboard">
                            <div className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all hover:scale-110 mt-0.5">
                                <ArrowLeft className="h-4 w-4 text-white" />
                            </div>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-extrabold text-white">My Attendance Report</h1>
                            <p className="text-slate-400 mt-1 text-sm">A complete overview of your attendance record.</p>
                        </div>
                    </div>

                    {/* Stat cards */}
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10 fade-in-up stagger-1">
                        <h2 className="text-white font-bold text-base mb-4 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-blue-400" /> Overall Summary
                        </h2>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {statCards.map((card, i) => (
                                <div key={card.label} className={cn('rounded-xl p-4 flex items-center justify-between border transition-all hover:-translate-y-0.5 hover:shadow-md fade-in-up', card.bg)} style={{ animationDelay: `${(i + 2) * 100}ms` }}>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1 font-medium">{card.label}</p>
                                        {isLoading ? <Skeleton className="h-8 w-10" /> : <p className="text-3xl font-extrabold text-slate-900">{card.value}</p>}
                                    </div>
                                    <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm', card.iconBg, card.iconColor)}>{card.icon}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Body ── */}
            <div className="px-4 sm:px-6 lg:px-8 py-6">
                <div className="max-w-5xl mx-auto space-y-6">
                    {!isLoading && stats.percentage < 75 && stats.total > 0 && (
                        <div className="bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-xl p-4 flex items-start gap-3 fade-in-up">
                            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <div><p className="font-semibold text-red-800">Low Attendance Warning!</p><p className="text-sm text-red-700 mt-0.5">Overall attendance is below 75%.</p></div>
                        </div>
                    )}

                    {/* Chart */}
                    <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/40 shadow-lg shadow-slate-200/40 p-6 fade-in-up stagger-2">
                        <h2 className="font-bold text-slate-900 mb-5 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-blue-500" /> Attendance Over Time</h2>
                        {isLoading ? <Skeleton className="h-52 w-full rounded-xl" /> : chartData.length > 1 ? (
                            <div className="h-56">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                                        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12, backdropFilter: 'blur(8px)', background: 'rgba(255,255,255,0.9)' }} formatter={(val: any) => [`${val}%`, 'Attendance']} />
                                        <Area type="monotone" dataKey="percentage" stroke="#3b82f6" strokeWidth={2.5} fill="url(#aGrad)" dot={{ fill: '#3b82f6', r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: '#3b82f6', stroke: 'white', strokeWidth: 2 }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        ) : <p className="text-center text-slate-400 py-12 text-sm">Not enough data to show a chart yet.</p>}
                    </div>

                    {/* Bottom row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Subject Breakdown */}
                        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/40 shadow-lg shadow-slate-200/40 p-6 fade-in-up stagger-3">
                            <h2 className="font-bold text-slate-900 mb-5">Subject-wise Breakdown</h2>
                            <div className="space-y-5">
                                {isLoading ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />) :
                                    Object.entries(stats.bySubject).length > 0 ?
                                        Object.entries(stats.bySubject).map(([subject, data]) => {
                                            const pct = data.total > 0 ? Math.round((data.present / data.total) * 100) : 0;
                                            return (
                                                <div key={subject}>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-sm font-medium text-slate-800">{subject}</span>
                                                        <span className="text-sm font-bold text-slate-700">{pct}%</span>
                                                    </div>
                                                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full rounded-full animate-progress-fill" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)' }} />
                                                    </div>
                                                </div>
                                            );
                                        }) : <p className="text-slate-400 text-sm text-center py-8">No data yet.</p>}
                            </div>
                        </div>

                        {/* Log table */}
                        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/40 shadow-lg shadow-slate-200/40 overflow-hidden fade-in-up stagger-4">
                            <div className="px-6 py-5 border-b border-slate-100/60"><h2 className="font-bold text-slate-900">Recent Attendance Log</h2></div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead><tr className="bg-slate-50/60"><th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">Date</th><th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">Subject</th><th className="text-right px-5 py-3 text-xs font-semibold text-slate-500">Status</th></tr></thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {isLoading ? [...Array(4)].map((_, i) => (
                                            <tr key={i}><td className="px-5 py-3"><Skeleton className="h-4 w-24" /></td><td className="px-5 py-3"><Skeleton className="h-4 w-28" /></td><td className="px-5 py-3 text-right"><Skeleton className="h-5 w-16 ml-auto" /></td></tr>
                                        )) : attendanceRecords && attendanceRecords.filter(r => r.status !== 'Pending').length > 0 ? (
                                            attendanceRecords.filter(r => r.status !== 'Pending').slice(0, 7).map((record) => {
                                                try {
                                                    return (
                                                        <tr key={record.id} className="hover:bg-blue-50/30 transition-colors">
                                                            <td className="px-5 py-3 font-medium text-slate-700">{format(toDate(record.date), 'MMM dd, yyyy')}</td>
                                                            <td className="px-5 py-3 text-slate-500">{record.subject}</td>
                                                            <td className="px-5 py-3 text-right">
                                                                <span className={cn('inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold', record.status === 'Present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>{record.status}</span>
                                                            </td>
                                                        </tr>
                                                    );
                                                } catch { return null; }
                                            })
                                        ) : <tr><td colSpan={3} className="text-center text-slate-400 py-10">No records yet.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
