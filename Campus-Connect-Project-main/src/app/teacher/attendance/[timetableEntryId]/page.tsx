'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Check, X, RefreshCw } from 'lucide-react';
import { useFirestore, useCollection, useDoc, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { format } from 'date-fns';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { Student, TimetableEntry, AttendanceRecord } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

function AttendanceListSkeleton() {
    return (
        <div className="divide-y divide-slate-100">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-44" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-24 rounded-full" />
                        <Skeleton className="h-9 w-24 rounded-lg" />
                        <Skeleton className="h-9 w-24 rounded-lg" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function TakeAttendancePage() {
    const params = useParams<{ timetableEntryId: string }>();
    const { timetableEntryId } = params;
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    const { toast } = useToast();

    const dateForDocId = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

    const timetableEntryRef = useMemoFirebase(() => (firestore ? doc(firestore, 'timetableEntries', timetableEntryId) : null), [firestore, timetableEntryId]);
    const { data: timetableEntry, isLoading: isLoadingTimetable } = useDoc<TimetableEntry>(timetableEntryRef);

    const studentsQuery = useMemoFirebase(() => {
        if (!firestore || !timetableEntry?.class) return null;
        return query(collection(firestore, 'students'), where('class', '==', timetableEntry.class));
    }, [firestore, timetableEntry?.class]);
    const { data: students, isLoading: isLoadingStudents } = useCollection<Student>(studentsQuery);

    const attendanceQuery = useMemoFirebase(() => {
        if (!firestore || !timetableEntryId || !user?.uid) return null;
        return query(
            collection(firestore, 'attendanceRecords'),
            where('timetableEntryId', '==', timetableEntryId),
            where('date', '==', dateForDocId),
            where('teacherId', '==', user.uid)
        );
    }, [firestore, timetableEntryId, dateForDocId, user?.uid]);
    const { data: attendanceRecords, isLoading: isLoadingAttendance } = useCollection<AttendanceRecord>(attendanceQuery);

    const handleSetAttendance = (studentId: string, status: 'Present' | 'Absent' | 'Pending') => {
        if (!firestore || !user || !timetableEntry) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not update attendance. System not ready.' });
            return;
        }
        const attendanceDocId = `${studentId}_${timetableEntryId}_${dateForDocId}`;
        const attendanceDocRef = doc(firestore, 'attendanceRecords', attendanceDocId);
        const record: Omit<AttendanceRecord, 'id'> = {
            studentId,
            timetableEntryId,
            teacherId: user.uid,
            classId: timetableEntry.class,
            date: dateForDocId,
            status,
            subject: timetableEntry.subject,
            timeFrom: timetableEntry.timeFrom,
            timeTo: timetableEntry.timeTo,
        };
        setDocumentNonBlocking(attendanceDocRef, { ...record, id: attendanceDocId }, { merge: true });
        toast({ title: 'Attendance Updated', description: `Status set to ${status}.` });
    };

    const getStudentStatus = (studentId: string): 'Present' | 'Absent' | 'Pending' => {
        return attendanceRecords?.find(r => r.studentId === studentId)?.status as any || 'Pending';
    };

    const isLoading = isLoadingTimetable || isLoadingStudents || isLoadingAttendance || isUserLoading;
    const markedCount = useMemo(() => students?.filter(s => {
        const status = getStudentStatus(s.id);
        return status === 'Present' || status === 'Absent';
    }).length ?? 0, [students, attendanceRecords]);

    const sortedStudents = useMemo(() =>
        students ? [...students].sort((a, b) => a.name.localeCompare(b.name)) : [],
        [students]
    );

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4 fade-in-up">
                <Link href="/teacher/dashboard">
                    <div className="w-9 h-9 rounded-full glass flex items-center justify-center transition-all hover:scale-110 mt-1 shadow-sm">
                        <ArrowLeft className="h-4 w-4 text-slate-700" />
                    </div>
                </Link>
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900">Take Attendance</h1>
                    {isLoadingTimetable ? (
                        <Skeleton className="h-4 w-72 mt-2" />
                    ) : timetableEntry ? (
                        <p className="text-slate-500 mt-1 text-sm flex flex-wrap gap-x-2 items-center">
                            <span className="font-medium text-slate-700">{timetableEntry.subject}</span>
                            <span className="text-slate-300">—</span>
                            <span>{timetableEntry.class}</span>
                            <span className="text-slate-300">—</span>
                            <span>{format(new Date(), 'MMMM do, yyyy')}</span>
                        </p>
                    ) : (
                        <p className="text-slate-500 mt-1 text-sm">Lecture not found</p>
                    )}
                </div>
            </div>

            {/* Progress bar */}
            {!isLoading && sortedStudents.length > 0 && (
                <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-white/40 px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3 shadow-lg shadow-slate-200/40 fade-in-up stagger-1">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <span className="font-medium">Attendance Progress:</span>
                        <span className="font-bold text-slate-900 text-base">{markedCount} / {sortedStudents.length}</span>
                        <span className="text-slate-500">Students Marked</span>
                    </div>
                    <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden sm:max-w-xs">
                        <div
                            className="h-full rounded-full transition-all duration-700 ease-out animate-progress-fill"
                            style={{ width: sortedStudents.length > 0 ? `${(markedCount / sortedStudents.length) * 100}%` : '0%', background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)' }}
                        />
                    </div>
                </div>
            )}

            {/* Student list card */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/40 shadow-lg shadow-slate-200/40 overflow-hidden fade-in-up stagger-2">
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-base font-semibold text-slate-800">Student List</h2>
                        <p className="text-sm text-slate-500 mt-0.5">Mark each student as present, absent, or reset their status.</p>
                    </div>
                </div>

                {isLoading ? (
                    <AttendanceListSkeleton />
                ) : (
                    <div className="divide-y divide-slate-100">
                        {sortedStudents.length > 0 ? sortedStudents.map((student, index) => {
                            const status = getStudentStatus(student.id);
                            const rowBg = status === 'Present' ? 'bg-green-50/40 hover:bg-green-50/70' :
                                status === 'Absent' ? 'bg-red-50/40 hover:bg-red-50/70' :
                                    'hover:bg-slate-50/60';
                            return (
                                <div
                                    key={student.id}
                                    className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 transition-colors animate-in fade-in-0 slide-in-from-bottom-2 duration-500', rowBg)}
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    {/* Student info */}
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-12 w-12 border-2 border-white shadow-sm flex-shrink-0">
                                            <AvatarImage src={student.photoURL} alt={student.name} />
                                            <AvatarFallback className="bg-gradient-to-br from-slate-200 to-slate-300 text-slate-600 font-bold">
                                                {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold text-slate-900">{student.name}</p>
                                            <p className="text-sm text-slate-500">{student.email}</p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center justify-between sm:justify-end gap-3 flex-wrap">
                                        {/* Status badge */}
                                        <span className={cn('px-3 py-1 rounded-full text-xs font-medium border',
                                            status === 'Present' ? 'bg-green-100 text-green-700 border-green-200' :
                                                status === 'Absent' ? 'bg-red-100 text-red-700 border-red-200' :
                                                    'bg-yellow-100 text-yellow-700 border-yellow-200'
                                        )}>
                                            {status}
                                        </span>

                                        {/* Action buttons */}
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleSetAttendance(student.id, 'Present')}
                                                className={cn(
                                                    'h-9 px-3 flex items-center gap-1.5 rounded-lg border text-sm font-medium transition-all btn-press',
                                                    status === 'Present'
                                                        ? 'bg-gradient-to-r from-green-100 to-emerald-100 border-green-300 text-green-700 ring-2 ring-green-500/20 shadow-sm'
                                                        : 'bg-white/80 border-slate-200 text-slate-500 hover:text-green-600 hover:border-green-300 hover:bg-green-50'
                                                )}
                                            >
                                                <Check className="h-4 w-4" />
                                                <span className="hidden sm:inline">Present</span>
                                            </button>
                                            <button
                                                onClick={() => handleSetAttendance(student.id, 'Absent')}
                                                className={cn(
                                                    'h-9 px-3 flex items-center gap-1.5 rounded-lg border text-sm font-medium transition-all btn-press',
                                                    status === 'Absent'
                                                        ? 'bg-gradient-to-r from-red-100 to-pink-100 border-red-300 text-red-700 ring-2 ring-red-500/20 shadow-sm'
                                                        : 'bg-white/80 border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-300 hover:bg-red-50'
                                                )}
                                            >
                                                <X className="h-4 w-4" />
                                                <span className="hidden sm:inline">Absent</span>
                                            </button>
                                            <button
                                                onClick={() => handleSetAttendance(student.id, 'Pending')}
                                                title="Reset to Pending"
                                                className="h-9 w-9 flex items-center justify-center rounded-lg border border-transparent text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                                            >
                                                <RefreshCw className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="text-center py-16">
                                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                                    <User className="h-8 w-8 text-slate-400" />
                                </div>
                                <p className="text-slate-600 font-medium">No students found</p>
                                <p className="text-slate-400 text-sm mt-1">No students are enrolled in this class yet.</p>
                            </div>
                        )}
                    </div>
                )}

                {!isLoading && sortedStudents.length > 0 && (
                    <div className="px-6 py-4 bg-gradient-to-r from-slate-50/80 to-blue-50/30 border-t border-slate-100/60 flex items-center justify-between">
                        <p className="text-sm text-slate-500">
                            Showing <span className="font-bold text-slate-700">{sortedStudents.length}</span> student{sortedStudents.length !== 1 ? 's' : ''}
                        </p>
                        <p className="text-sm text-slate-500">
                            <span className="font-bold text-green-600">{markedCount} marked</span> · <span className="text-slate-400">{sortedStudents.length - markedCount} pending</span>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
