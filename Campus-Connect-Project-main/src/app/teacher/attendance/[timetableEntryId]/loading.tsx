import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

function AttendanceListSkeleton() {
    return (
        <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
                 <Card key={i} className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center space-x-4">
                            <Skeleton className="h-12 w-12 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-[150px]" />
                                <Skeleton className="h-4 w-[200px]" />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap self-start sm:self-center">
                            <Skeleton className="h-8 w-24 rounded-full" />
                            <Skeleton className="h-9 w-[90px] rounded-md" />
                            <Skeleton className="h-9 w-[86px] rounded-md" />
                            <Skeleton className="h-9 w-[82px] rounded-md" />
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    )
}

export default function LoadingAttendancePage() {
    return (
        <div className="max-w-5xl mx-auto">
             <div className="flex items-center gap-4 mb-6">
                <Button asChild variant="outline" size="icon" className="h-9 w-9">
                    <Link href="/teacher/dashboard">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Back to Dashboard</span>
                    </Link>
                </Button>
                <div className="space-y-1.5">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64" />
                </div>
            </div>
            <Card className="rounded-2xl">
                <CardHeader>
                    <Skeleton className="h-6 w-1/2" />
                </CardHeader>
                <CardContent>
                    <AttendanceListSkeleton />
                </CardContent>
            </Card>
        </div>
    );
}
