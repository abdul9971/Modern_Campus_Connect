'use client';

import Link from 'next/link';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Loader2, Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFirestore, useUser, errorEmitter, FirestorePermissionError, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, onSnapshot, query, where, deleteDoc, writeBatch } from 'firebase/firestore';
import type { TimetableEntry, Teacher } from '@/lib/types';
import { format } from 'date-fns';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { v4 as uuidv4 } from 'uuid';
import dynamic from 'next/dynamic';
import type { ExtractedEntry } from '@/components/timetable-ai-extraction';
import { timetableEntrySchema } from '@/components/timetable-manual-entry';


const TimetableManualEntry = dynamic(
    () => import('@/components/timetable-manual-entry'),
    { loading: () => <Skeleton className="h-96" /> }
);
const TimetableAiExtraction = dynamic(
    () => import('@/components/timetable-ai-extraction'),
    { loading: () => <Skeleton className="h-96" /> }
);


export default function SetTimetablePage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();

    const [date, setDate] = useState<Date>(new Date());
    const [entries, setEntries] = useState<TimetableEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // AI Feature State
    const [image, setImage] = useState<string | null>(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractedEntries, setExtractedEntries] = useState<ExtractedEntry[]>([]);
    const [showCamera, setShowCamera] = useState(false);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const teachersQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'teachers') : null), [firestore]);
    const { data: teachers, isLoading: isLoadingTeachers } = useCollection<Teacher>(teachersQuery);

    const form = useForm<z.infer<typeof timetableEntrySchema>>({
        resolver: zodResolver(timetableEntrySchema),
        defaultValues: {
            timeFrom: '',
            timeTo: '',
            class: '',
            subject: '',
            teacherName: '',
        }
    });

    const dateStr = useMemo(() => format(date, 'yyyy-MM-dd'), [date]);

    useEffect(() => {
        if (!firestore) return;

        setIsLoading(true);
        const entriesQuery = query(collection(firestore, 'timetableEntries'),
            where('date', '==', dateStr)
        );

        const unsubscribe = onSnapshot(entriesQuery, (querySnapshot) => {
            const fetchedEntries: TimetableEntry[] = [];
            querySnapshot.forEach(doc => {
                fetchedEntries.push({ id: doc.id, ...doc.data() } as TimetableEntry);
            });
            setEntries(fetchedEntries.sort((a, b) => a.timeFrom.localeCompare(b.timeFrom)));
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching timetable entries: ", error);
            const permissionError = new FirestorePermissionError({
                path: `timetableEntries`,
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [dateStr, firestore]);

    // Effect for camera permission and stream management
    useEffect(() => {
        if (!showCamera) {
            if (videoRef.current?.srcObject) {
                (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
            }
            return;
        }

        const getCameraPermission = async () => {
            try {
                if (!navigator.mediaDevices?.getUserMedia) {
                    throw new Error('Camera not supported.');
                }
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                setHasCameraPermission(true);
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (error) {
                console.error('Error accessing camera:', error);
                setHasCameraPermission(false);
                toast({
                    variant: 'destructive',
                    title: 'Camera Access Denied',
                    description: 'Please enable camera permissions in your browser settings.',
                });
                setShowCamera(false);
            }
        };
        getCameraPermission();
    }, [showCamera, toast]);


    const handleSaveEntry = async (data: z.infer<typeof timetableEntrySchema>) => {
        if (!firestore || !user) {
            toast({ variant: 'destructive', title: 'Cannot Save', description: 'Authentication error.' });
            return;
        }

        setIsSaving(true);

        const selectedTeacher = teachers?.find(t => t.name === data.teacherName);
        const day = format(date, 'EEEE');
        const entryId = `${data.class}_${data.timeFrom}_${dateStr}`.replace(/:/g, '');
        const entryRef = doc(firestore, 'timetableEntries', entryId);

        const entryData: Omit<TimetableEntry, 'id'> = {
            class: data.class,
            subject: data.subject,
            teacherName: data.teacherName,
            teacherId: selectedTeacher?.id,
            timeFrom: data.timeFrom,
            timeTo: data.timeTo,
            date: dateStr,
            day: day,
        };

        try {
            await setDoc(entryRef, { ...entryData, id: entryId });
            toast({ title: 'Entry Saved!', description: 'The lecture has been added to the timetable.' });
            form.reset({
                timeFrom: '',
                timeTo: '',
                class: '',
                subject: '',
                teacherName: '',
            });
        } catch (error) {
            const permissionError = new FirestorePermissionError({
                path: entryRef.path,
                operation: 'write',
                requestResourceData: entryData,
            });
            errorEmitter.emit('permission-error', permissionError);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteEntry = async (entryId: string) => {
        if (!firestore) return;
        const entryRef = doc(firestore, 'timetableEntries', entryId);
        try {
            await deleteDoc(entryRef);
            toast({ title: 'Entry Deleted', description: 'The lecture has been removed from the timetable.' });
        } catch (error) {
            const permissionError = new FirestorePermissionError({
                path: entryRef.path,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result;
            if (typeof result === 'string') {
                setImage(result);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleCapture = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d')?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setImage(dataUrl);
        setShowCamera(false);
    };

    const handleImageExtraction = async () => {
        if (!image) {
            toast({ variant: 'destructive', title: 'No Image', description: 'Please upload or capture an image first.' });
            return;
        }
        setIsExtracting(true);
        setExtractedEntries([]);
        try {
            console.log('[AI Extract] Sending image to API...');
            const response = await fetch('/api/extract-timetable', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ timetableImage: image }),
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('[AI Extract] API error:', data.error);
                toast({ variant: 'destructive', title: 'Extraction Failed', description: data.error || 'An error occurred during extraction.' });
                return;
            }

            if (!data.entries || data.entries.length === 0) {
                toast({ variant: 'destructive', title: 'No Entries Found', description: 'The AI could not find any timetable entries. Please try a clearer image or enter manually.' });
            } else {
                setExtractedEntries(data.entries.map((e: any) => ({ ...e, tempId: uuidv4() })));
                toast({ title: 'Extraction Successful', description: `Found ${data.entries.length} lectures. Please review and save.` });
                console.log('[AI Extract] Form autofill success:', data.entries.length, 'entries');
            }
        } catch (error) {
            console.error('[AI Extract] Network error:', error);
            toast({ variant: 'destructive', title: 'Connection Error', description: 'Failed to connect to the AI service. Please check your network and try again.' });
        } finally {
            setIsExtracting(false);
        }
    };

    const handleUpdateExtractedEntry = (tempId: string, field: keyof ExtractedEntry, value: string) => {
        setExtractedEntries(current =>
            current.map(entry => entry.tempId === tempId ? { ...entry, [field]: value } : entry)
        );
    };

    const handleDeleteExtractedEntry = (tempId: string) => {
        setExtractedEntries(current => current.filter(entry => entry.tempId !== tempId));
    };

    const handleSaveAllExtracted = async () => {
        if (!firestore || !user) {
            toast({ variant: 'destructive', title: 'Cannot Save', description: 'Authentication error.' });
            return;
        }
        if (extractedEntries.length === 0) {
            toast({ variant: 'destructive', title: 'No Entries', description: 'There are no extracted entries to save.' });
            return;
        }

        setIsSaving(true);
        const batch = writeBatch(firestore);
        const day = format(date, 'EEEE');

        extractedEntries.forEach(entry => {
            const selectedTeacher = teachers?.find(t => t.name === entry.teacherName);
            const entryId = `${entry.class}_${entry.timeFrom}_${dateStr}`.replace(/[:\s]/g, '');
            const entryRef = doc(firestore, 'timetableEntries', entryId);

            const entryData: Omit<TimetableEntry, 'id'> = {
                class: entry.class,
                subject: entry.subject,
                teacherName: entry.teacherName,
                teacherId: selectedTeacher?.id || '',
                timeFrom: entry.timeFrom,
                timeTo: entry.timeTo,
                date: dateStr,
                day: day,
            };
            batch.set(entryRef, { ...entryData, id: entryId });
        });

        try {
            await batch.commit();
            toast({ title: 'Bulk Save Successful!', description: `${extractedEntries.length} lectures have been saved.` });
            setExtractedEntries([]);
            setImage(null);
        } catch (error) {
            const permissionError = new FirestorePermissionError({
                path: 'timetableEntries (batch)',
                operation: 'write',
            });
            errorEmitter.emit('permission-error', permissionError);
        } finally {
            setIsSaving(false);
        }
    };


    return (
        <div className="min-h-screen bg-background p-4 sm:p-6 md:p-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex justify-between items-center flex-wrap gap-4">
                    <Button asChild variant="outline" size="sm">
                        <Link href="/admin/dashboard">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Dashboard
                        </Link>
                    </Button>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant={"outline"} className={cn("w-full sm:w-[240px] justify-start text-left font-normal", !date && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date ? format(date, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus /></PopoverContent>
                    </Popover>
                </div>

                <Tabs defaultValue="manual">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                        <TabsTrigger value="ai">AI Extraction</TabsTrigger>
                    </TabsList>

                    <TabsContent value="manual">
                        <Card className="rounded-2xl shadow-sm mt-6">
                            <CardHeader>
                                <CardTitle className="text-2xl font-headline">Add New Lecture Entry</CardTitle>
                                <CardDescription>
                                    {`Fill out the form to add a single lecture to the timetable for ${format(date, 'PPPP')}.`}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <TimetableManualEntry
                                    form={form}
                                    onSubmit={handleSaveEntry}
                                    isSaving={isSaving}
                                    teachers={teachers}
                                    isLoadingTeachers={isLoadingTeachers}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="ai">
                        <TimetableAiExtraction
                            isSaving={isSaving}
                            isExtracting={isExtracting}
                            image={image}
                            extractedEntries={extractedEntries}
                            showCamera={showCamera}
                            hasCameraPermission={hasCameraPermission}
                            videoRef={videoRef}
                            canvasRef={canvasRef}
                            setShowCamera={setShowCamera}
                            handleFileChange={handleFileChange}
                            handleCapture={handleCapture}
                            setImage={setImage}
                            handleImageExtraction={handleImageExtraction}
                            handleUpdateExtractedEntry={handleUpdateExtractedEntry}
                            handleDeleteExtractedEntry={handleDeleteExtractedEntry}
                            handleSaveAllExtracted={handleSaveAllExtracted}
                        />
                    </TabsContent>
                </Tabs>

                <Card className="rounded-2xl shadow-sm">
                    <CardHeader>
                        <CardTitle>Scheduled Lectures for {format(date, 'PPP')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-48 w-full" /> : (
                            entries.length > 0 ? (
                                <div className="overflow-x-auto rounded-lg border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Time</TableHead>
                                                <TableHead>Class</TableHead>
                                                <TableHead>Subject</TableHead>
                                                <TableHead>Teacher</TableHead>
                                                <TableHead className="text-right">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {entries.map((entry) => (
                                                <TableRow key={entry.id}>
                                                    <TableCell className="font-medium">{entry.timeFrom} - {entry.timeTo}</TableCell>
                                                    <TableCell>{entry.class}</TableCell>
                                                    <TableCell>{entry.subject}</TableCell>
                                                    <TableCell>{entry.teacherName}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteEntry(entry.id)}>
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <p className="text-center text-muted-foreground py-8">No lectures scheduled for this date.</p>
                            )
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
