'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar as CalendarIcon } from 'lucide-react';
import { useFirestore, useUser, useDoc, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, where, getDocs, doc } from 'firebase/firestore';
import { format } from 'date-fns';
import type { Student, TimetableEntry, AttendanceRecord, Teacher } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

type LectureSummary = {
    lecture: TimetableEntry;
    totalStudents: number;
    presentCount: number;
    absentCount: number;
    status: 'Completed' | 'Pending';
};

// Mock trend data (last 7 days) – in a real app this would come from Firestore
function generateTrendData(summaries: LectureSummary[], date: Date) {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const classes = [...new Set(summaries.map(s => s.lecture.class))].slice(0, 3);
    return days.map((day, i) => {
        const entry: Record<string, string | number> = { day };
        classes.forEach(cls => {
            entry[cls] = Math.floor(65 + Math.random() * 30);
        });
        return entry;
    });
}

const LINE_COLORS = ['#3b82f6', '#14b8a6', '#8b5cf6', '#f59e0b', '#ef4444'];

function SummarySkeleton() {
    return (
        <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-4 px-4 py-3">
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-5 w-12" />
                    <Skeleton className="h-5 w-12" />
                    <Skeleton className="h-5 w-12" />
                    <Skeleton className="h-6 w-24 ml-auto" />
                </div>
            ))}
        </div>
    );
}

export default function TeacherSummaryPage() {
    const firestore = useFirestore();
    const { user, isUserLoading: isUserAuthLoading } = useUser();
    const [date, setDate] = useState<Date>(new Date());
    const [summaries, setSummaries] = useState<LectureSummary[]>([]);
    const [isSummaryLoading, setIsSummaryLoading] = useState(true);

    const teacherRef = useMemoFirebase(
        () => (firestore && user?.uid ? doc(firestore, 'teachers', user.uid) : null),
        [firestore, user?.uid]
    );
    const { data: teacher, isLoading: isTeacherLoading } = useDoc<Teacher>(teacherRef);

    useEffect(() => {
        const dayOfWeek = format(date, 'EEEE');
        const selectedDateString = format(date, 'yyyy-MM-dd');

        if (!firestore || !user?.uid || !teacher?.name) {
            setSummaries([]);
            if (!isUserAuthLoading && !isTeacherLoading) setIsSummaryLoading(false);
            return;
        }

        const fetchSummaries = async () => {
            setIsSummaryLoading(true);
            try {
                const lecturesQuery = query(
                    collection(firestore, 'timetableEntries'),
                    where('teacherName', '==', teacher.name),
                    where('day', '==', dayOfWeek)
                );
                const lecturesSnapshot = await getDocs(lecturesQuery);
                const lectures = lecturesSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as TimetableEntry));

                if (lectures.length === 0) { setSummaries([]); setIsSummaryLoading(false); return; }

                const classNames = [...new Set(lectures.map(l => l.class))];
                if (classNames.length === 0) { setSummaries([]); setIsSummaryLoading(false); return; }

                const studentsQuery = query(collection(firestore, 'students'), where('class', 'in', classNames));
                const studentsSnapshot = await getDocs(studentsQuery);
                const studentsByClass = new Map<string, Student[]>();
                studentsSnapshot.docs.forEach(d => {
                    const student = d.data() as Student;
                    const list = studentsByClass.get(student.class) || [];
                    list.push(student);
                    studentsByClass.set(student.class, list);
                });

                const attendanceQuery = query(
                    collection(firestore, 'attendanceRecords'),
                    where('teacherId', '==', user.uid),
                    where('date', '==', selectedDateString)
                );
                const attendanceSnapshot = await getDocs(attendanceQuery);
                const recordsByLecture = new Map<string, AttendanceRecord[]>();
                attendanceSnapshot.docs.forEach(d => {
                    const record = d.data() as AttendanceRecord;
                    const list = recordsByLecture.get(record.timetableEntryId) || [];
                    list.push(record);
                    recordsByLecture.set(record.timetableEntryId, list);
                });

                const newSummaries: LectureSummary[] = lectures.map(lecture => {
                    const classStudents = studentsByClass.get(lecture.class) || [];
                    const lectureRecords = recordsByLecture.get(lecture.id) || [];
                    const presentCount = lectureRecords.filter(r => r.status === 'Present').length;
                    const absentCount = lectureRecords.filter(r => r.status === 'Absent').length;
                    const status: 'Completed' | 'Pending' = (classStudents.length > 0 && presentCount + absentCount >= classStudents.length) ? 'Completed' : 'Pending';
                    return { lecture, totalStudents: classStudents.length, presentCount, absentCount, status };
                }).sort((a, b) => (a.lecture.timeFrom || '').localeCompare(b.lecture.timeFrom || ''));

                setSummaries(newSummaries);
            } catch (error) {
                errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'summary data', operation: 'list' }));
                setSummaries([]);
            } finally {
                setIsSummaryLoading(false);
            }
        };

        fetchSummaries();
    }, [firestore, user?.uid, teacher?.name, date, isUserAuthLoading, isTeacherLoading]);

    const isLoading = isUserAuthLoading || isTeacherLoading || isSummaryLoading;

    // Chart data derived from summaries
    const barData = useMemo(() => summaries.map(s => ({
        name: `${s.lecture.timeFrom?.slice(0, 5)}`,
        Present: s.presentCount,
        Absent: s.absentCount,
        Total: s.totalStudents,
    })), [summaries]);

    const classNames = useMemo(() => [...new Set(summaries.map(s => s.lecture.class))], [summaries]);

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 fade-in-up">
                <div className="flex items-start gap-4">
                    <Link href="/teacher/dashboard">
                        <div className="w-9 h-9 rounded-full glass flex items-center justify-center transition-all hover:scale-110 mt-1 shadow-sm">
                            <ArrowLeft className="h-4 w-4 text-slate-700" />
                        </div>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-900">Attendance Summary</h1>
                        <p className="text-slate-500 mt-0.5 text-sm">A summary of your lectures for a selected date.</p>
                    </div>
                </div>

                {/* Date picker — Stitch style */}
                <Popover>
                    <PopoverTrigger asChild>
                        <button className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-white/40 rounded-xl px-4 py-2.5 shadow-lg shadow-slate-200/30 hover:border-blue-200 hover:shadow-blue-100/30 transition-all min-w-[220px] btn-press">
                            <CalendarIcon className="h-4 w-4 text-blue-500" />
                            <span className="text-sm font-medium text-slate-800">
                                {date ? format(date, 'MMMM do, yyyy') : 'Pick a date'}
                            </span>
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={(newDate) => newDate && setDate(newDate)}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
            </div>

            {/* Charts area — only show when there are summaries */}
            {!isLoading && summaries.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
                    {/* Bar chart */}
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-sm font-semibold text-slate-800">Present vs Absent by Lecture</h3>
                            <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Present</span>
                                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" /> Absent</span>
                            </div>
                        </div>
                        <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={barData} barCategoryGap="40%">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07)', fontSize: 12 }} />
                                    <Bar dataKey="Present" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Absent" fill="#f87171" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Summary stats */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <h3 className="text-sm font-semibold text-slate-800 mb-4">Today at a Glance</h3>
                        <div className="space-y-3">
                            {summaries.map(s => {
                                const pct = s.totalStudents > 0 ? Math.round((s.presentCount / s.totalStudents) * 100) : 0;
                                return (
                                    <div key={s.lecture.id} className="space-y-1.5">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-medium text-slate-700 truncate">{s.lecture.subject} <span className="text-slate-400">({s.lecture.class})</span></span>
                                            <span className="font-semibold text-slate-600 ml-2">{pct}%</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Summary Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in-0 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '100ms' }}>
                <div className="px-6 py-5 border-b border-slate-100">
                    <h2 className="text-base font-semibold text-slate-800">Summary for {format(date, 'MMMM do, yyyy')}</h2>
                </div>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/80">
                                {['Time', 'Class', 'Subject', 'Total Students', 'Present', 'Absent', 'Status'].map(col => (
                                    <TableHead key={col} className={cn('text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap', col === 'Status' && 'text-right')}>
                                        {col}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={7}><SummarySkeleton /></TableCell></TableRow>
                            ) : summaries.length > 0 ? summaries.map(({ lecture, totalStudents, presentCount, absentCount, status }, index) => (
                                <TableRow key={lecture.id} className="hover:bg-slate-50/50 transition-colors animate-in fade-in-0 slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${index * 50}ms` }}>
                                    <TableCell className="font-medium text-slate-700 whitespace-nowrap">{lecture.timeFrom} – {lecture.timeTo}</TableCell>
                                    <TableCell className="text-slate-500">{lecture.class}</TableCell>
                                    <TableCell className="font-semibold text-slate-800">{lecture.subject}</TableCell>
                                    <TableCell className="text-slate-500">{totalStudents}</TableCell>
                                    <TableCell className="text-green-600 font-semibold">{presentCount}</TableCell>
                                    <TableCell className="text-red-500 font-semibold">{absentCount}</TableCell>
                                    <TableCell className="text-right">
                                        <span className={cn(
                                            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
                                            status === 'Completed'
                                                ? 'bg-green-50 text-green-700 border-green-200'
                                                : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                        )}>
                                            {status}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-slate-500 py-16">
                                        <div className="flex flex-col items-center gap-2">
                                            <CalendarIcon className="h-8 w-8 text-slate-300" />
                                            <p>No lectures scheduled for this day.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                {!isLoading && summaries.length > 0 && (
                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <p className="text-xs text-slate-500">Showing {summaries.length} lecture{summaries.length !== 1 ? 's' : ''}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
