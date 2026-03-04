'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useFirestore, useDoc, useUser, useMemoFirebase, useCollection } from '@/firebase';
import { doc, query, collection, where } from 'firebase/firestore';
import { format } from 'date-fns';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { TimetableEntry, AttendanceRecord } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Hourglass, Send, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StudentLecturePage() {
  const params = useParams<{ timetableEntryId: string }>();
  const { timetableEntryId } = params;
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const dateForDocId = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  const timetableEntryRef = useMemoFirebase(() => (firestore && timetableEntryId ? doc(firestore, 'timetableEntries', timetableEntryId) : null), [firestore, timetableEntryId]);
  const { data: timetableEntry, isLoading: isLoadingTimetable } = useDoc<TimetableEntry>(timetableEntryRef);

  const attendanceQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid || !timetableEntryId) return null;
    return query(collection(firestore, 'attendanceRecords'), where('studentId', '==', user.uid), where('timetableEntryId', '==', timetableEntryId), where('date', '==', dateForDocId));
  }, [firestore, user?.uid, timetableEntryId, dateForDocId]);
  const { data: attendanceRecords, isLoading: isLoadingAttendance } = useCollection<AttendanceRecord>(attendanceQuery);
  const attendanceRecord = useMemo(() => (attendanceRecords && attendanceRecords.length > 0 ? attendanceRecords[0] : null), [attendanceRecords]);
  const attendanceDocId = useMemo(() => (user ? `${user.uid}_${timetableEntryId}_${dateForDocId}` : null), [user?.uid, timetableEntryId, dateForDocId]);

  const handleSend = () => {
    if (!firestore || !user || !timetableEntry || !attendanceDocId) {
      toast({ variant: 'destructive', title: 'Error', description: 'System not ready.' }); return;
    }
    if (attendanceRecord) { toast({ title: 'Already Sent', description: 'Status already recorded.' }); return; }
    const ref = doc(firestore, 'attendanceRecords', attendanceDocId);
    setDocumentNonBlocking(ref, {
      id: attendanceDocId, studentId: user.uid, timetableEntryId, teacherId: timetableEntry.teacherId || timetableEntry.teacherName,
      classId: timetableEntry.class, date: dateForDocId, status: 'Pending', subject: timetableEntry.subject, timeFrom: timetableEntry.timeFrom, timeTo: timetableEntry.timeTo,
    }, { merge: false });
    toast({ title: 'Request Sent!', description: 'Your attendance request has been sent to the teacher.' });
  };

  const isLoading = isLoadingTimetable || isUserLoading || isLoadingAttendance;
  const status = attendanceRecord?.status ?? 'Not Marked';
  const sc = {
    'Present': { text: 'Your attendance is MARKED PRESENT', iconBg: 'bg-gradient-to-br from-green-100 to-emerald-100', icon: <CheckCircle size={32} className="text-green-500" />, ringColor: 'ring-green-200' },
    'Absent': { text: 'Your attendance is MARKED ABSENT', iconBg: 'bg-gradient-to-br from-red-100 to-pink-100', icon: <XCircle size={32} className="text-red-500" />, ringColor: 'ring-red-200' },
    'Pending': { text: 'Your request is PENDING', iconBg: 'bg-gradient-to-br from-yellow-100 to-amber-100', icon: <Hourglass size={32} className="text-amber-500 animate-pulse" />, ringColor: 'ring-yellow-200' },
    'Not Marked': {
      text: 'Your attendance is NOT MARKED',
      iconBg: 'bg-gradient-to-br from-amber-100 to-orange-100',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" className="w-8 h-8"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><circle cx="12" cy="16" r="0.5" fill="#d97706" /></svg>,
      ringColor: 'ring-amber-200',
    },
  }[status] ?? { text: 'Not Marked', iconBg: 'bg-amber-100', icon: null, ringColor: 'ring-amber-200' };

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-6 sm:-mt-8 min-h-screen px-4 sm:px-6 lg:px-8 pt-8 pb-12 bg-gradient-animated relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-blue-200/25 rounded-full blur-3xl animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-purple-200/20 rounded-full blur-3xl animate-blob" style={{ animationDelay: '6s' }} />
      </div>

      <div className="max-w-2xl mx-auto relative">
        {/* Header */}
        <div className="flex items-start gap-4 mb-8 fade-in-up">
          <Link href="/student/dashboard">
            <div className="w-9 h-9 rounded-full glass flex items-center justify-center transition-all hover:scale-110 mt-0.5 shadow-sm">
              <ArrowLeft className="h-4 w-4 text-slate-700" />
            </div>
          </Link>
          <div>
            {isLoading ? (
              <><Skeleton className="h-9 w-48 bg-white/60" /><Skeleton className="h-4 w-64 mt-2 bg-white/40" /></>
            ) : timetableEntry ? (
              <>
                <h1 className="text-3xl font-extrabold text-slate-900">{timetableEntry.subject}</h1>
                <p className="text-slate-600 mt-1.5 text-sm flex flex-wrap items-center gap-x-2">
                  <span>{timetableEntry.timeFrom} - {timetableEntry.timeTo}</span>
                  <span className="text-slate-300">•</span>
                  <span>{timetableEntry.teacherName}</span>
                  <span className="text-slate-300">•</span>
                  <span>{format(new Date(), 'MMMM do, yyyy')}</span>
                </p>
              </>
            ) : <h1 className="text-2xl font-bold text-slate-900">Lecture not found</h1>}
          </div>
        </div>

        {/* White card */}
        <div className="bg-white/85 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-slate-300/30 border border-white/50 overflow-hidden fade-in-up stagger-1">
          <div className="flex flex-col items-center text-center px-8 py-12 space-y-6">
            {/* Status icon with animated ring */}
            {isLoading ? <Skeleton className="h-20 w-20 rounded-full" /> : (
              <div className="relative">
                <div className={cn('w-20 h-20 rounded-full flex items-center justify-center ring-4', sc.iconBg, sc.ringColor)}>{sc.icon}</div>
                {status === 'Pending' && (
                  <div className="absolute inset-0 w-20 h-20 rounded-full ring-2 ring-yellow-400/50" style={{ animation: 'pulse-ring 2s ease-out infinite' }} />
                )}
              </div>
            )}

            {isLoading ? <Skeleton className="h-8 w-64" /> : <h2 className="text-xl font-bold text-slate-900">{sc.text}</h2>}

            {/* Info box */}
            <div className="w-full max-w-md rounded-2xl px-5 py-4 text-left bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-100/50">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">i</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">How it works</p>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                    Click the button to send a &quot;Present&quot; request. Your status will be &quot;Pending&quot; until the teacher marks your final attendance.
                  </p>
                </div>
              </div>
            </div>

            {/* CTA button */}
            <button onClick={handleSend} disabled={isLoading || !!attendanceRecord}
              className="w-full max-w-md h-14 flex items-center justify-center gap-2.5 rounded-2xl font-bold text-white text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed btn-press shadow-xl"
              style={{
                background: attendanceRecord ? '#475569' : 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)',
                boxShadow: attendanceRecord ? 'none' : '0 8px 32px rgba(15,23,42,0.3)',
              }}>
              <Send className="w-5 h-5" />
              {attendanceRecord ? 'Request Already Sent' : 'Send My Present Request'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
