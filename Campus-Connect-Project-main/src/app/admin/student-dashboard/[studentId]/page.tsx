'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Percent, Check, X, Book } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import type { Student, AttendanceRecord } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from '@/lib/utils';

function StatCard({ title, value, icon, isLoading, className }: { title: string; value: string | number; icon: React.ReactNode, isLoading?: boolean, className?: string }) {
    return (
        <Card className={cn("rounded-2xl", className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <div className="text-muted-foreground">{icon}</div>
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-3xl font-bold">{value}</div>}
            </CardContent>
        </Card>
    )
}


export default function StudentDetailsPage() {
  const params = useParams<{ studentId: string }>();
  const studentId = params.studentId;
  const firestore = useFirestore();

  // 1. Fetch Student Data
  const studentRef = useMemoFirebase(
    () => (firestore && studentId ? doc(firestore, 'students', studentId) : null),
    [firestore, studentId]
  );
  const { data: student, isLoading: isLoadingStudent } = useDoc<Student>(studentRef);

  // 2. Fetch Attendance Records
  const attendanceQuery = useMemoFirebase(() => {
    if (!firestore || !studentId) return null;
    return query(
      collection(firestore, 'attendanceRecords'),
      where('studentId', '==', studentId)
    );
  }, [firestore, studentId]);
  const { data: attendanceRecordsFromDB, isLoading: isLoadingAttendance } = useCollection<AttendanceRecord>(attendanceQuery);
  
  const attendanceRecords = useMemo(() => {
    if (!attendanceRecordsFromDB) return null;
    // Sort by date string, which is lexicographically sortable
    return [...attendanceRecordsFromDB].sort((a, b) => b.date.localeCompare(a.date));
  }, [attendanceRecordsFromDB]);
  
  // 4. Calculate Stats
  const attendanceStats = useMemo(() => {
    if (!attendanceRecordsFromDB) return { total: 0, present: 0, absent: 0, percentage: 0, bySubject: {} };
    
    const validRecords = attendanceRecordsFromDB.filter(r => r.status === 'Present' || r.status === 'Absent');
    
    const present = validRecords.filter(r => r.status === 'Present').length;
    const absent = validRecords.filter(r => r.status === 'Absent').length;
    const total = validRecords.length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    const bySubject = validRecords.reduce((acc, record) => {
        const subject = record.subject;
        if (!subject) return acc;

        if (!acc[subject]) {
            acc[subject] = { total: 0, present: 0, absent: 0 };
        }
        acc[subject].total++;
        if (record.status === 'Present') acc[subject].present++;
        if (record.status === 'Absent') acc[subject].absent++;
        
        return acc;
    }, {} as Record<string, { total: number; present: number; absent: number }>);

    return { total, present, absent, percentage, bySubject };
  }, [attendanceRecordsFromDB]);

  const isLoading = isLoadingStudent || isLoadingAttendance;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="mb-8">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/student-dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Student Dashboard
            </Link>
          </Button>
        </div>
        
        <Card className="mb-8 rounded-2xl shadow-sm">
          <CardHeader className="flex flex-row items-center gap-6 p-6">
            {isLoadingStudent ? (
                <Skeleton className="h-20 w-20 rounded-full" />
            ) : (
                <Avatar className="h-20 w-20">
                    <AvatarImage src={student?.photoURL} alt={student?.name} />
                    <AvatarFallback className="text-2xl"><User /></AvatarFallback>
                </Avatar>
            )}
            <div className="grid gap-1">
                 {isLoadingStudent ? (
                     <div className="space-y-2">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-5 w-64" />
                     </div>
                 ) : student ? (
                     <>
                        <CardTitle className="text-3xl font-headline">{student.name}</CardTitle>
                        <CardDescription className="text-base">
                            {student.email} • Class: {student.class}
                        </CardDescription>
                     </>
                 ): (
                    <CardTitle>Student not found</CardTitle>
                 )}
            </div>
          </CardHeader>
        </Card>

        <Card className="rounded-2xl shadow-sm">
            <CardHeader>
                <CardTitle className="text-2xl font-headline">Attendance Report</CardTitle>
                <CardDescription>A complete overview of this student's attendance record.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard isLoading={isLoading} title="Total Classes" value={attendanceStats.total} icon={<Book className="h-4 w-4" />} />
                    <StatCard isLoading={isLoading} title="Present" value={attendanceStats.present} icon={<Check className="h-4 w-4" />} className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50"/>
                    <StatCard isLoading={isLoading} title="Absent" value={attendanceStats.absent} icon={<X className="h-4 w-4" />} className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50"/>
                    <StatCard isLoading={isLoading} title="Overall Attendance" value={`${attendanceStats.percentage}%`} icon={<Percent className="h-4 w-4" />} />
                </div>
                {isLoading ? <Skeleton className="h-4 w-full rounded-full" /> : (
                     <div className="space-y-2">
                        <Progress value={attendanceStats.percentage} className="h-3" />
                        <p className="text-sm text-muted-foreground text-center">{attendanceStats.present} out of {attendanceStats.total} classes attended.</p>
                    </div>
                )}
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Subject-wise Breakdown</h3>
                        <Card className="rounded-xl">
                            <CardContent className="p-0">
                                <Accordion type="single" collapsible className="w-full">
                                    {isLoading ? <Skeleton className="h-20 w-full" /> : Object.entries(attendanceStats.bySubject).map(([subject, stats]) => {
                                        const subjectPercentage = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
                                        return (
                                            <AccordionItem value={subject} key={subject}>
                                                <AccordionTrigger className="px-6 hover:no-underline">
                                                    <div className='flex justify-between w-full items-center'>
                                                        <span className="font-medium">{subject}</span>
                                                        <div className='flex items-center gap-4 text-sm'>
                                                            <span>{subjectPercentage}%</span>
                                                            <Progress value={subjectPercentage} className="w-24 h-2" />
                                                        </div>
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent className="px-6">
                                                    <p className="text-muted-foreground">
                                                        Attended <span className='font-bold text-foreground'>{stats.present}</span> out of <span className='font-bold text-foreground'>{stats.total}</span> classes.
                                                    </p>
                                                </AccordionContent>
                                            </AccordionItem>
                                        )
                                    })}
                                </Accordion>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Detailed Attendance Log</h3>
                        <div className="rounded-xl border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Subject</TableHead>
                                        <TableHead>Time</TableHead>
                                        <TableHead className="text-right">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        [...Array(3)].map((_, i) => (
                                            <TableRow key={i}>
                                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                                <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                                                <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                                            </TableRow>
                                        ))
                                    ) : attendanceRecords && attendanceRecords.filter(r => r.status !== 'Pending').length > 0 ? attendanceRecords.map(record => {
                                        if (record.status === 'Pending') return null;
                                        try {
                                            return (
                                                <TableRow key={record.id}>
                                                    <TableCell className="font-medium">{format(parseISO(record.date), 'PPP')}</TableCell>
                                                    <TableCell>{record.subject}</TableCell>
                                                    <TableCell className="text-muted-foreground">{record.timeFrom} - {record.timeTo}</TableCell>
                                                    <TableCell className="text-right">
                                                        <span className={`font-semibold ${record.status === 'Present' ? 'text-green-600' : 'text-red-600'}`}>
                                                            {record.status}
                                                        </span>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        } catch (e) {
                                            return null; // Don't render if date is invalid
                                        }
                                    }) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                                No finalized attendance records found for this student.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

    
