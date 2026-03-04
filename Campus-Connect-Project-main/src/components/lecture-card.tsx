'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Clock, User, ArrowRight, CheckCircle, XCircle, Hourglass, Lock } from 'lucide-react';
import type { TimetableEntry, AttendanceRecord } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format, parse } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useLectureStatus } from '@/hooks/use-lecture-status';


// Skeleton placeholder for the LectureCard to prevent hydration errors.
function LectureCardSkeleton({ role }: { role: 'teacher' | 'student' }) {
  return (
    <div className="rounded-2xl border bg-card text-card-foreground shadow-sm p-6 space-y-4 h-full animate-pulse">
      <div className="flex justify-between items-start">
        <div className="h-6 w-3/4 bg-muted rounded"></div>
        {role === 'student' && <div className="h-6 w-24 bg-muted rounded-full"></div>}
      </div>
      <div className="h-4 w-1/2 bg-muted rounded pt-0.5"></div>
      <div className="flex flex-col flex-grow justify-end space-y-3 pt-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-muted rounded" />
          <div className="w-20 h-4 bg-muted rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-muted rounded" />
          <div className="w-24 h-4 bg-muted rounded" />
        </div>
      </div>
    </div>
  );
}

// Attendance status logic moved inside the card for student role
function StudentAttendanceStatus({ lectureId }: { lectureId: string }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const dateForQuery = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  const attendanceQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, 'attendanceRecords'),
      where('studentId', '==', user.uid),
      where('timetableEntryId', '==', lectureId),
      where('date', '==', dateForQuery)
    );
  }, [firestore, user?.uid, lectureId, dateForQuery]);

  const { data: attendanceRecords, isLoading: isLoadingAttendance } = useCollection<AttendanceRecord>(attendanceQuery);

  const status = useMemo(() => {
    if (!attendanceRecords || attendanceRecords.length === 0) return 'Not Marked';
    return attendanceRecords[0].status;
  }, [attendanceRecords]);

  const isLoading = isUserLoading || isLoadingAttendance;

  if (isLoading) {
    return <Badge variant="secondary" className="animate-pulse w-24 h-6 rounded-md">Loading...</Badge>
  }

  const statusConfig = {
    'Present': {
      variant: "default",
      className: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100",
      icon: <CheckCircle className="mr-1.5 h-3.5 w-3.5" />,
      text: "Present"
    },
    'Absent': {
      variant: "destructive",
      className: "bg-red-100 text-red-800 border-red-200 hover:bg-red-100",
      icon: <XCircle className="mr-1.5 h-3.5 w-3.5" />,
      text: "Absent"
    },
    'Pending': {
      variant: "secondary",
      className: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100",
      icon: <Hourglass className="mr-1.5 h-3.5 w-3.5" />,
      text: "Pending"
    },
    'Not Marked': {
      variant: "outline",
      className: "",
      icon: null,
      text: "Not Marked"
    }
  } as const;

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['Not Marked'];

  return <Badge variant={config.variant} className={cn('transition-colors', config.className)}>{config.icon}{config.text}</Badge>
}


export function LectureCard({ lecture, role }: { lecture: TimetableEntry, role: 'teacher' | 'student' }) {
  const { toast } = useToast();
  const { isActive, status: lectureStatus, isMounted } = useLectureStatus({
    timeFrom: lecture.timeFrom,
    timeTo: lecture.timeTo,
    day: lecture.day,
  });

  if (!isMounted) {
    return <LectureCardSkeleton role={role} />;
  }

  const isClickable = isActive;

  const handleClick = (e: React.MouseEvent) => {
    if (!isActive) {
      e.preventDefault();
      toast({
        title: lectureStatus === 'upcoming' ? 'Lecture Has Not Started' : 'Lecture Has Ended',
        description: lectureStatus === 'upcoming'
          ? `This lecture is scheduled for ${lecture.timeFrom}. It will be available 10 minutes before.`
          : 'This lecture is no longer active.',
      });
    }
  };

  const href = `/${role}/${role === 'teacher' ? 'attendance' : 'lecture'}/${lecture.id}`;

  const CardBody = (
    <div
      className={cn(
        'group relative flex flex-col h-full rounded-2xl border bg-card text-card-foreground shadow-sm transition-all duration-300 ease-in-out',
        isClickable && 'cursor-pointer hover:shadow-lg hover:-translate-y-1',
        !isActive && 'opacity-50 blur-[1px] grayscale-[30%]',
        !isClickable && 'cursor-not-allowed'
      )}
    >
      {!isActive && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-slate-800/80 text-white text-[10px] font-bold px-2 py-1 rounded-full backdrop-blur-sm">
          <Lock className="h-3 w-3" />
          {lectureStatus === 'upcoming' ? 'Not Yet' : 'Ended'}
        </div>
      )}
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-bold font-headline leading-tight pr-4">{lecture.subject}</CardTitle>
          {role === 'student' && <StudentAttendanceStatus lectureId={lecture.id} />}
        </div>
        <CardDescription className="font-medium text-primary pt-0.5">
          {role === 'teacher' ? `Class: ${lecture.class}` : `Teacher: ${lecture.teacherName}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col flex-grow justify-end space-y-3 text-sm text-muted-foreground pt-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span>{lecture.timeFrom} - {lecture.timeTo}</span>
        </div>
        <div className="flex items-center gap-2">
          <User className="w-4 h-4" />
          <span>{role === 'teacher' ? lecture.class : lecture.teacherName}</span>
        </div>
      </CardContent>
      <div className="p-6 pt-2 mt-auto">
        <div className={cn(
          "flex items-center text-sm font-semibold text-primary transition-opacity duration-300",
          !isClickable && "opacity-0"
        )}>
          <span>{role === 'teacher' ? 'Take Attendance' : 'View Lecture'}</span>
          <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </div>
      </div>
    </div>
  );

  if (isClickable) {
    return <Link href={href} onClick={handleClick} className="h-full flex flex-col">{CardBody}</Link>;
  }

  return <div onClick={handleClick} className="h-full flex flex-col cursor-not-allowed">{CardBody}</div>;
}
