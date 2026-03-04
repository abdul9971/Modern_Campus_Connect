'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useFirestore, useCollection, useDoc, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import type { TimetableEntry, Student, AttendanceRecord } from '@/lib/types';
import { format } from 'date-fns';
import { AlertTriangle, BookOpen, Flame, Lock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useLectureStatus } from '@/hooks/use-lecture-status';

function StatusBadge({ status }: { status: string }) {
  if (status === 'Present') {
    return (
      <span className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-sm font-bold whitespace-nowrap"
        style={{ background: 'rgba(34,197,94,0.2)', color: '#86efac', border: '1px solid rgba(34,197,94,0.3)', backdropFilter: 'blur(4px)' }}>
        Marked <span className="text-green-400">✓</span>
      </span>
    );
  }
  if (status === 'Absent') {
    return (
      <span className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-sm font-bold whitespace-nowrap"
        style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)', backdropFilter: 'blur(4px)' }}>
        Absent
      </span>
    );
  }
  if (status === 'Pending') {
    return (
      <span className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-sm font-bold whitespace-nowrap animate-pulse"
        style={{ background: 'rgba(234,179,8,0.2)', color: '#fde68a', border: '1px solid rgba(234,179,8,0.3)', backdropFilter: 'blur(4px)' }}>
        Pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-sm font-bold whitespace-nowrap"
      style={{ background: 'rgba(245,158,11,0.2)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.3)', backdropFilter: 'blur(4px)' }}>
      Not Marked
    </span>
  );
}

// Card gradient presets for variety
const CARD_GRADIENTS = [
  'linear-gradient(135deg, rgba(30,58,95,0.88) 0%, rgba(15,40,75,0.92) 50%, rgba(25,50,85,0.85) 100%)',
  'linear-gradient(135deg, rgba(25,55,90,0.88) 0%, rgba(10,35,70,0.92) 50%, rgba(20,45,80,0.85) 100%)',
  'linear-gradient(135deg, rgba(20,50,85,0.88) 0%, rgba(12,38,72,0.92) 50%, rgba(18,42,78,0.85) 100%)',
];
const BLOB_COLORS = [
  'rgba(100,180,255,0.4)',
  'rgba(130,160,240,0.35)',
  'rgba(80,200,240,0.35)',
];

function StudentLectureCard({ lecture, index, status: attendanceStatus }: { lecture: TimetableEntry; index: number; status: string }) {
  const { isActive, status: timeStatus, isMounted } = useLectureStatus({
    timeFrom: lecture.timeFrom,
    timeTo: lecture.timeTo,
    day: lecture.day,
  });

  if (!isMounted) {
    return <div className="h-28 rounded-2xl bg-white/40 animate-pulse" />;
  }

  const cardInner = (
    <div className={`relative overflow-hidden rounded-2xl p-5 transition-all duration-500 ${isActive
        ? 'hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-900/15'
        : 'opacity-50 blur-[1px] grayscale-[30%] cursor-not-allowed select-none'
      }`}
      style={{
        background: CARD_GRADIENTS[index % CARD_GRADIENTS.length],
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.10)',
      }}
    >
      {/* Animated blur blob */}
      <div className="absolute right-8 top-0 w-40 h-40 rounded-full opacity-25 blur-2xl animate-blob"
        style={{ background: `radial-gradient(circle, ${BLOB_COLORS[index % BLOB_COLORS.length]} 0%, transparent 70%)`, animationDelay: `${index * 3}s` }} />
      {/* Shimmer overlay on hover */}
      {isActive && <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 shimmer pointer-events-none" />}

      {!isActive && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-black/50 text-white text-[10px] font-bold px-2 py-1 rounded-full backdrop-blur-sm">
          <Lock className="h-3 w-3" />
          {timeStatus === 'upcoming' ? 'Not Yet' : 'Ended'}
        </div>
      )}

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-base mb-2 group-hover:text-blue-200 transition-colors">{lecture.subject}</p>
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2" className="w-5 h-5 flex-shrink-0">
              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
            </svg>
            <span className="text-white text-2xl font-bold tracking-tight">{lecture.timeFrom} - {lecture.timeTo}</span>
          </div>
        </div>
        <div className="hidden sm:block w-px h-12 bg-white/15 mx-2" />
        <div className="flex-shrink-0">
          <p className="text-blue-200/60 text-xs font-medium mb-0.5">Teacher info</p>
          <p className="text-white font-semibold text-base">{lecture.teacherName}</p>
        </div>
        <div className="flex-shrink-0 flex sm:justify-end"><StatusBadge status={attendanceStatus} /></div>
      </div>
    </div>
  );

  if (isActive) {
    return (
      <Link href={`/student/lecture/${lecture.id}`}
        className="group block fade-in-up"
        style={{ animationDelay: `${(index + 2) * 100}ms` }}>
        {cardInner}
      </Link>
    );
  }

  return (
    <div className="block fade-in-up"
      style={{ animationDelay: `${(index + 2) * 100}ms` }}>
      {cardInner}
    </div>
  );
}

export default function StudentDashboard() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const today = useMemo(() => format(new Date(), 'EEEE'), []);

  const studentRef = useMemoFirebase(() => (firestore && user?.uid ? doc(firestore, 'students', user.uid) : null), [firestore, user?.uid]);
  const { data: student, isLoading: isLoadingStudent } = useDoc<Student>(studentRef);

  const lecturesQuery = useMemoFirebase(() => {
    if (!firestore || !student?.class) return null;
    return query(collection(firestore, 'timetableEntries'), where('class', '==', student.class), where('day', '==', today));
  }, [firestore, student?.class, today]);
  const { data: lectures, isLoading: isLoadingLectures } = useCollection<TimetableEntry>(lecturesQuery);

  const attendanceQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, 'attendanceRecords'), where('studentId', '==', user.uid));
  }, [firestore, user?.uid]);
  const { data: attendanceRecords, isLoading: isLoadingAttendance } = useCollection<AttendanceRecord>(attendanceQuery);

  const attendancePercentage = useMemo(() => {
    if (!attendanceRecords) return null;
    const valid = attendanceRecords.filter(r => r.status === 'Present' || r.status === 'Absent');
    if (valid.length === 0) return 100;
    return Math.round((valid.filter(r => r.status === 'Present').length / valid.length) * 100);
  }, [attendanceRecords]);

  const presentCount = useMemo(() => attendanceRecords?.filter(r => r.status === 'Present').length ?? 0, [attendanceRecords]);

  const todayStatusMap = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const map: Record<string, string> = {};
    attendanceRecords?.forEach(r => { if (r.date === todayStr) map[r.timetableEntryId] = r.status; });
    return map;
  }, [attendanceRecords]);

  const sortedLectures = useMemo(() => lectures ? [...lectures].sort((a, b) => (a.timeFrom || '').localeCompare(b.timeFrom || '')) : [], [lectures]);
  const isLoading = isUserLoading || isLoadingStudent || isLoadingLectures || isLoadingAttendance;
  const showWarning = attendancePercentage !== null && attendancePercentage < 75;
  const firstName = student?.name?.split(' ')[0] ?? 'Student';

  const pct = attendancePercentage ?? 0;
  const radius = 54;
  const circ = 2 * Math.PI * radius;
  const dash = (pct / 100) * circ;
  const donutColor = pct >= 75 ? '#22c55e' : pct >= 50 ? '#eab308' : '#ef4444';

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* ── Left: Schedule ── */}
        <div className="lg:col-span-2 space-y-5">
          <div className="fade-in-up">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {isLoadingStudent ? 'Welcome back!' : <>Welcome back, <span className="text-gradient">{firstName}!</span></>}
            </h1>
            <p className="text-slate-500 mt-1 text-sm">Here are your lectures for today, {format(new Date(), 'EEEE, MMMM d')}.</p>
          </div>

          {!isLoading && showWarning && (
            <Alert variant="destructive" className="bg-red-50/80 backdrop-blur-sm border-red-200 fade-in-up stagger-1">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <AlertTitle className="font-bold">Low Attendance Warning</AlertTitle>
              <AlertDescription>Your attendance is {attendancePercentage}%. Please attend all lectures.</AlertDescription>
            </Alert>
          )}

          <h2 className="text-base font-bold text-slate-800 fade-in-up stagger-1">Today's Schedule</h2>

          {isLoading ? (
            <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-white/40 animate-pulse" />)}</div>
          ) : sortedLectures.length > 0 ? (
            <div className="space-y-4">
              {sortedLectures.map((lecture, index) => {
                const status = todayStatusMap[lecture.id] ?? 'Not Marked';
                return (
                  <StudentLectureCard key={lecture.id} lecture={lecture} index={index} status={status} />
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-16 border-2 border-dashed border-slate-300/50 rounded-2xl bg-white/40 backdrop-blur-sm fade-in-up stagger-2">
              <div className="bg-gradient-to-br from-blue-100 to-indigo-100 p-4 rounded-full mb-4 animate-float-slow">
                <BookOpen className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">All Clear for Today!</h3>
              <p className="text-slate-500 mt-1 text-sm">No lectures scheduled for today. Enjoy your break!</p>
            </div>
          )}
        </div>

        {/* ── Right: Stats Sidebar ── */}
        <div className="space-y-4 lg:pt-14">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg shadow-slate-200/50 border border-white/40 p-5 fade-in-up stagger-3">
            <h3 className="font-bold text-slate-900 mb-4">Stats at a Glance</h3>

            {/* Streak */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100/60 mb-4">
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 animate-float-slow">
                  <Flame className="h-6 w-6 text-orange-500 drop-shadow-sm" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 leading-none">Daily Attendance</p>
                  <p className="text-xs font-medium text-slate-400 leading-none mt-0.5">Streak</p>
                  {isLoadingAttendance ? <Skeleton className="h-6 w-20 mt-2" /> :
                    <p className="text-2xl font-bold text-slate-900 mt-1">{presentCount} Days</p>}
                </div>
              </div>
              <svg viewBox="0 0 80 30" className="w-20 h-8 mt-1" fill="none">
                <polyline points="0,24 16,20 32,22 48,12 64,8 80,10" stroke="url(#sparkGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <defs><linearGradient id="sparkGrad" x1="0" y1="0" x2="80" y2="0"><stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#8b5cf6" /></linearGradient></defs>
              </svg>
            </div>

            {/* Donut chart */}
            <div className="flex flex-col items-center py-2">
              {isLoadingAttendance ? <Skeleton className="h-36 w-36 rounded-full mb-4" /> : (
                <div className="relative mb-4 group">
                  <svg width="140" height="140" viewBox="0 0 140 140" className="drop-shadow-sm">
                    <circle cx="70" cy="70" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="10" />
                    <circle cx="70" cy="70" r={radius} fill="none" stroke={donutColor} strokeWidth="10"
                      strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ * 0.25} strokeLinecap="round"
                      style={{ transition: 'stroke-dasharray 1s ease-out', filter: `drop-shadow(0 0 6px ${donutColor}40)` }} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-extrabold text-slate-900">{pct}%</span>
                    <span className="text-sm text-slate-400 font-medium">Attendance</span>
                  </div>
                </div>
              )}
              <Link href="/student/report" className="w-full">
                <button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl py-2.5 text-sm transition-all shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 btn-press">
                  View Full Report
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
