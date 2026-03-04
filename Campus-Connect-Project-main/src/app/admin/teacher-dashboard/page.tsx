'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Power, PowerOff, KeyRound, UserPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useFirestore, useCollection, useMemoFirebase, useAuth } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { Teacher } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
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
} from "@/components/ui/alert-dialog"
import { sendPasswordResetEmail } from 'firebase/auth';


function TeacherListSkeleton() {
    return (
        <div className="border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[80px]">Photo</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {[...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-10 w-10 rounded-full" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-[80px] rounded-full" /></TableCell>
                            <TableCell className="text-right">
                                <div className="flex gap-2 justify-end">
                                    <Skeleton className="h-9 w-[100px] rounded-md" />
                                    <Skeleton className="h-9 w-[120px] rounded-md" />
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}

export default function AdminTeacherDashboardPage() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  const teachersQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'teachers') : null),
    [firestore]
  );
  const { data: teachers, isLoading } = useCollection<Teacher>(teachersQuery);
  
  const handleToggleUserStatus = (teacher: Teacher) => {
    if (!firestore) return;
    const teacherRef = doc(firestore, 'teachers', teacher.id);
    const newStatus = !teacher.disabled;
    updateDocumentNonBlocking(teacherRef, { disabled: newStatus });
    toast({
        title: `Teacher ${newStatus ? 'Disabled' : 'Enabled'}`,
        description: `${teacher.name}'s account has been ${newStatus ? 'disabled' : 'enabled'}.`
    });
  }

  const handleResetPassword = async (teacher: Teacher) => {
      if (!auth) {
          toast({ variant: 'destructive', title: 'Error', description: 'Auth service not available.'});
          return;
      }
      try {
        await sendPasswordResetEmail(auth, teacher.email);
        toast({
            title: 'Password Reset Email Sent',
            description: `An email has been sent to ${teacher.name} with instructions to reset their password.`
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
                    <CardTitle className="text-2xl font-headline">Teacher Management</CardTitle>
                    <CardDescription>
                    View and manage all teacher profiles in the system.
                    </CardDescription>
                </div>
                <Button asChild>
                    <Link href="/admin/add-teacher">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add Teacher
                    </Link>
                </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
                <TeacherListSkeleton />
            ) : teachers && teachers.length > 0 ? (
              <div className='overflow-x-auto rounded-lg border'>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead className="w-[80px]">Photo</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {teachers.map((teacher, index) => (
                        <TableRow key={teacher.id} className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500" style={{animationDelay: `${index * 50}ms`}}>
                        <TableCell>
                            <Avatar className="h-10 w-10">
                            <AvatarImage src={teacher.photoURL} alt={teacher.name} />
                            <AvatarFallback><User/></AvatarFallback>
                            </Avatar>
                        </TableCell>
                        <TableCell className="font-medium">{teacher.name}</TableCell>
                        <TableCell className="text-muted-foreground">{teacher.email}</TableCell>
                        <TableCell>
                            <Badge variant={teacher.disabled ? 'destructive' : 'default'} className="w-20 justify-center">
                                {teacher.disabled ? 'Disabled' : 'Active'}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                           <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant={teacher.disabled ? "secondary" : "outline"} size="sm">
                                        {teacher.disabled ? <Power className="mr-2 h-4 w-4" /> : <PowerOff className="mr-2 h-4 w-4" />}
                                        {teacher.disabled ? 'Enable' : 'Disable'}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action will {teacher.disabled ? 'enable' : 'disable'} the account for {teacher.name}. 
                                        {teacher.disabled ? ' They will be able to log in and access their dashboard.' : ' They will be immediately logged out and unable to log in.'}
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleToggleUserStatus(teacher)}>
                                        Continue
                                    </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>

                            <Button variant="outline" size="sm" className="ml-2" onClick={() => handleResetPassword(teacher)}>
                                <KeyRound className="mr-2 h-4 w-4"/>
                                Reset Pass
                            </Button>
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
              </div>
            ) : (
                <div className="text-center py-16 text-muted-foreground">
                    <p className="font-medium">No teachers found.</p>
                    <p className="text-sm">Get started by adding a new teacher to the system.</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
