'use client';

import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import type { TimetableEntry, Teacher } from '@/lib/types';
import { format } from 'date-fns';
import Link from 'next/link';
import { BarChart2, BookOpen, Clock, Users, ChevronRight, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useLectureStatus } from '@/hooks/use-lecture-status';

const CARD_COLORS = [
    { border: 'hover:border-blue-300', glow: 'hover:shadow-blue-200/40', accent: 'from-blue-500 to-indigo-500' },
    { border: 'hover:border-emerald-300', glow: 'hover:shadow-emerald-200/40', accent: 'from-emerald-500 to-teal-500' },
    { border: 'hover:border-purple-300', glow: 'hover:shadow-purple-200/40', accent: 'from-purple-500 to-pink-500' },
    { border: 'hover:border-amber-300', glow: 'hover:shadow-amber-200/40', accent: 'from-amber-500 to-orange-500' },
];

function TeacherLectureCard({ lecture, index }: { lecture: TimetableEntry; index: number }) {
    const color = CARD_COLORS[index % CARD_COLORS.length];
    const { isActive, status, isMounted } = useLectureStatus({
        timeFrom: lecture.timeFrom,
        timeTo: lecture.timeTo,
        day: lecture.day,
    });

    if (!isMounted) {
        return <div className="h-44 rounded-2xl bg-white/50 animate-pulse" />;
    }

    const cardContent = (
        <div
            className={cn(
                'group bg-white/80 backdrop-blur-xl rounded-2xl border border-white/40 p-5 transition-all duration-500 fade-in-up flex flex-col gradient-border relative',
                color.border, color.glow,
                isActive
                    ? 'hover:-translate-y-2 hover:shadow-xl cursor-pointer'
                    : 'opacity-50 blur-[1px] grayscale-[30%] cursor-not-allowed select-none'
            )}
            style={{ animationDelay: `${(index + 2) * 100}ms` }}
        >
            {!isActive && (
                <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-slate-800/80 text-white text-[10px] font-bold px-2 py-1 rounded-full backdrop-blur-sm">
                    <Lock className="h-3 w-3" />
                    {status === 'upcoming' ? 'Not Yet' : 'Ended'}
                </div>
            )}
            <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="font-bold text-slate-900 text-base group-hover:text-blue-700 transition-colors">{lecture.subject}</h3>
                <span className={cn('text-xs font-bold text-white px-2.5 py-0.5 rounded-full bg-gradient-to-r shadow-sm', color.accent)}>{lecture.class}</span>
            </div>
            <div className="space-y-1.5 text-sm text-slate-500 flex-1">
                <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 flex-shrink-0" /><span>{lecture.timeFrom} – {lecture.timeTo}</span></div>
                <div className="flex items-center gap-2"><Users className="h-3.5 w-3.5 flex-shrink-0" /><span>Class {lecture.class}</span></div>
            </div>
            {isActive && (
                <div className="mt-4 block">
                    <div className="w-full h-10 bg-gradient-to-r from-slate-900 to-slate-700 hover:from-slate-800 hover:to-slate-600 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-slate-900/10 hover:shadow-lg btn-press">
                        Take Attendance <ChevronRight className="h-4 w-4" />
                    </div>
                </div>
            )}
        </div>
    );

    if (isActive) {
        return <Link href={`/teacher/attendance/${lecture.id}`}>{cardContent}</Link>;
    }

    return cardContent;
}

export default function TeacherDashboard() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const today = useMemo(() => format(new Date(), 'EEEE'), []);
    const teacherRef = useMemoFirebase(() => (firestore && user?.uid ? doc(firestore, 'teachers', user.uid) : null), [firestore, user?.uid]);
    const { data: teacher, isLoading: isLoadingTeacher } = useDoc<Teacher>(teacherRef);
    const lecturesQuery = useMemoFirebase(() => {
        if (!firestore || !teacher?.name) return null;
        return query(collection(firestore, 'timetableEntries'), where('teacherName', '==', teacher.name), where('day', '==', today));
    }, [firestore, teacher?.name, today]);
    const { data: lectures, isLoading: isLoadingLectures } = useCollection<TimetableEntry>(lecturesQuery);
    const sortedLectures = useMemo(() => lectures ? [...lectures].sort((a, b) => (a.timeFrom || '').localeCompare(b.timeFrom || '')) : [], [lectures]);
    const isLoading = isUserLoading || isLoadingTeacher || isLoadingLectures;

    return (
        <div className="w-full space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 fade-in-up">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                        Welcome back, <span className="text-gradient">{isLoadingTeacher ? '...' : teacher?.name?.split(' ')[0] ?? 'Teacher'}!</span>
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm">Here are your lectures for today, {format(new Date(), 'MMMM d, yyyy')}.</p>
                </div>
                <Button asChild variant="outline"
                    className="border-slate-200 text-slate-700 hover:bg-white/80 backdrop-blur-sm whitespace-nowrap flex-shrink-0 rounded-xl shadow-sm hover:shadow-md transition-all btn-press">
                    <Link href="/teacher/summary"><BarChart2 className="mr-2 h-4 w-4" /> Attendance Summary</Link>
                </Button>
            </div>

            <div>
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 fade-in-up stagger-1">Today's Lectures</h2>
                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[...Array(3)].map((_, i) => <div key={i} className="h-44 rounded-2xl bg-white/50 animate-pulse" />)}
                    </div>
                ) : sortedLectures.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {sortedLectures.map((lecture, i) => (
                            <TeacherLectureCard key={lecture.id} lecture={lecture} index={i} />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-center py-20 border-2 border-dashed border-slate-300/50 rounded-2xl bg-white/40 backdrop-blur-sm fade-in-up stagger-2">
                        <div className="bg-gradient-to-br from-blue-100 to-indigo-100 p-4 rounded-full mb-4 animate-float-slow">
                            <BookOpen className="w-8 h-8 text-blue-500" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800">All Clear for Today!</h3>
                        <p className="text-slate-500 mt-1 text-sm">No lectures scheduled for today.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
