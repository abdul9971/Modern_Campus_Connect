'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AddUserForm } from '@/components/add-user-form';
import { Skeleton } from '@/components/ui/skeleton';


export default function AddStudentPage() {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 md:p-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/student-dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Student Management
            </Link>
          </Button>
        </div>
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-headline">Add New Student</CardTitle>
            <CardDescription>
              Create a new student profile and generate login credentials for them. The process is divided into two simple steps.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AddUserForm role="student" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
