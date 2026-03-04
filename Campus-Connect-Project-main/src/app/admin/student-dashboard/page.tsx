'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Power, PowerOff, KeyRound, UserPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useFirestore, useCollection, useMemoFirebase, useAuth } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { useMemo, useState } from 'react';
import type { Student } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { sendPasswordResetEmail } from 'firebase/auth';


function StudentListSkeleton() {
    return (
        <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
                <Card key={i} className="p-4 rounded-xl">
                    <div className="flex items-center justify-between space-x-4">
                        <div className="flex items-center space-x-4">
                            <Skeleton className="h-12 w-12 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-[200px]" />
                                <Skeleton className="h-4 w-[250px]" />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Skeleton className="h-9 w-[90px] rounded-md" />
                            <Skeleton className="h-9 w-[110px] rounded-md" />
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    )
}


export default function AdminStudentDashboardPage() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  const allStudentsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'students') : null),
    [firestore]
  );

  const { data: allStudents, isLoading: isLoadingAllStudents } = useCollection<Student>(allStudentsQuery);

  const classes = useMemo(() => {
    if (!allStudents) return [];
    return [...new Set(allStudents.map(student => student.class))].sort();
  }, [allStudents]);

  const studentsQuery = useMemoFirebase(() => {
    if (!firestore || !selectedClass) return null;
    return query(collection(firestore, 'students'), where('class', '==', selectedClass));
  }, [firestore, selectedClass]);
  
  const { data: filteredStudents, isLoading: isLoadingFilteredStudents } = useCollection<Student>(studentsQuery);
  
  const handleToggleUserStatus = (student: Student) => {
    if (!firestore) return;
    const studentRef = doc(firestore, 'students', student.id);
    const newStatus = !student.disabled;
    updateDocumentNonBlocking(studentRef, { disabled: newStatus });
    toast({
        title: `Student ${newStatus ? 'Disabled' : 'Enabled'}`,
        description: `${student.name}'s account has been ${newStatus ? 'disabled' : 'enabled'}.`
    });
  }

  const handleResetPassword = async (student: Student) => {
      if (!auth) {
          toast({ variant: 'destructive', title: 'Error', description: 'Auth service not available.'});
          return;
      }
      try {
        await sendPasswordResetEmail(auth, student.email);
        toast({
            title: 'Password Reset Email Sent',
            description: `An email has been sent to ${student.name} with instructions to reset their password.`
        });
      } catch (error: any) {
           toast({
            variant: 'destructive',
            title: 'Failed to Send Email',
            description: error.message
        });
      }
  }
  

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 md:p-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="border-b">
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle className="text-2xl font-headline">Student Management</CardTitle>
                    <CardDescription>
                        View student information and manage user accounts by class.
                    </CardDescription>
                </div>
                <Button asChild>
                    <Link href="/admin/add-student">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add Student
                    </Link>
                </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div>
              <label htmlFor="class-select" className="text-sm font-medium mb-2 block">Select a Class</label>
              <Select onValueChange={setSelectedClass} disabled={isLoadingAllStudents || classes.length === 0}>
                <SelectTrigger id="class-select" className="w-full md:w-1/2">
                  <SelectValue placeholder={isLoadingAllStudents ? "Loading classes..." : "Select a class to view students"} />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingAllStudents ? (
                    <SelectItem value="loading" disabled>Loading classes...</SelectItem>
                  ) : (
                    classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedClass && (
                 <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-4">Students in {selectedClass}</h3>
                    {isLoadingFilteredStudents && <StudentListSkeleton />}
                    {!isLoadingFilteredStudents && filteredStudents && filteredStudents.length > 0 ? (
                        <div className="space-y-4">
                        {filteredStudents.map((student, index) => (
                            <Card key={student.id} className="p-4 rounded-xl shadow-sm animate-in fade-in-0 slide-in-from-bottom-2 duration-500" style={{ animationDelay: `${index * 50}ms` }}>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <Link href={`/admin/student-dashboard/${student.id}`} className="flex items-center space-x-4 grow group">
                                        <Avatar className="h-12 w-12">
                                            <AvatarImage src={student.photoURL} alt={student.name} />
                                            <AvatarFallback>
                                                <User/>
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold group-hover:text-primary transition-colors">{student.name}</p>
                                            <p className="text-sm text-muted-foreground">{student.email}</p>
                                        </div>
                                    </Link>
                                    <div className="flex items-center gap-2 flex-wrap self-start sm:self-center">
                                        <Badge variant={student.disabled ? 'destructive' : 'default'} className="w-20 justify-center">
                                            {student.disabled ? 'Disabled' : 'Active'}
                                        </Badge>
                                        
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant={student.disabled ? "secondary" : "outline"} size="sm">
                                                    {student.disabled ? <Power className="mr-2 h-4 w-4" /> : <PowerOff className="mr-2 h-4 w-4" />}
                                                    {student.disabled ? 'Enable' : 'Disable'}
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This action will {student.disabled ? 'enable' : 'disable'} the account for {student.name}. 
                                                    {student.disabled ? ' They will be able to log in and access their dashboard.' : ' They will be immediately logged out and unable to log in.'}
                                                </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleToggleUserStatus(student)}>
                                                    Continue
                                                </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>

                                        <Button variant="outline" size="sm" onClick={() => handleResetPassword(student)}>
                                            <KeyRound className="mr-2 h-4 w-4"/>
                                            Reset Pass
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                        </div>
                    ) : (
                        !isLoadingFilteredStudents && (
                            <div className="text-center py-12 text-muted-foreground">
                                <p>No students found in this class.</p>
                            </div>
                        )
                    )}
                 </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
