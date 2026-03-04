'use client';

import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Loader2 } from 'lucide-react';
import type { Teacher } from '@/lib/types';
import type { UseFormReturn } from 'react-hook-form';

const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

export const timetableEntrySchema = z.object({
  timeFrom: z.string().regex(timeRegex, 'Invalid time format (HH:MM)'),
  timeTo: z.string().regex(timeRegex, 'Invalid time format (HH:MM)'),
  class: z.string().min(1, 'Class is required'),
  subject: z.string().min(1, 'Subject is required'),
  teacherName: z.string().min(1, 'Teacher name is required'),
}).refine(data => data.timeFrom < data.timeTo, {
  message: "End time must be after start time",
  path: ["timeTo"],
});

type ManualEntryFormProps = {
    form: UseFormReturn<z.infer<typeof timetableEntrySchema>>;
    onSubmit: (data: z.infer<typeof timetableEntrySchema>) => Promise<void>;
    isSaving: boolean;
    teachers: Teacher[] | null;
    isLoadingTeachers: boolean;
}

export default function TimetableManualEntry({ form, onSubmit, isSaving, teachers, isLoadingTeachers }: ManualEntryFormProps) {
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="timeFrom" render={({ field }) => (
                        <FormItem><FormLabel>Time From</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="timeTo" render={({ field }) => (
                        <FormItem><FormLabel>Time To</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="class" render={({ field }) => (
                        <FormItem><FormLabel>Class</FormLabel><FormControl><Input placeholder="e.g. FYIT" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="subject" render={({ field }) => (
                        <FormItem><FormLabel>Subject</FormLabel><FormControl><Input placeholder="e.g. Data Structures" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="teacherName" render={({ field }) => (
                            <FormItem className="sm:col-span-2">
                                <FormLabel>Teacher Name</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingTeachers}>
                                    <FormControl><SelectTrigger>
                                        <SelectValue placeholder={isLoadingTeachers ? "Loading teachers..." : "Select a teacher"} />
                                    </SelectTrigger></FormControl>
                                    <SelectContent>{teachers?.sort((a,b) => a.name.localeCompare(b.name)).map((teacher) => (
                                        <SelectItem key={teacher.id} value={teacher.name}>{teacher.name}</SelectItem>
                                    ))}</SelectContent>
                                </Select><FormMessage />
                            </FormItem>
                    )}/>
                </div>
                <div className="flex justify-end">
                    <Button type="submit" disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Entry
                    </Button>
                </div>
            </form>
        </Form>
    );
}
