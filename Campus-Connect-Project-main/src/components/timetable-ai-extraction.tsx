'use client';

import React, { RefObject } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Camera, Trash2, Wand2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export type ExtractedEntry = {
  tempId: string;
  class: string;
  day: string;
  timeFrom: string;
  timeTo: string;
  subject: string;
  teacherName: string;
};

type AiExtractionProps = {
    isSaving: boolean;
    isExtracting: boolean;
    image: string | null;
    extractedEntries: ExtractedEntry[];
    showCamera: boolean;
    hasCameraPermission: boolean | null;
    videoRef: RefObject<HTMLVideoElement>;
    canvasRef: RefObject<HTMLCanvasElement>;
    setShowCamera: (show: boolean) => void;
    handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    handleCapture: () => void;
    setImage: (image: string | null) => void;
    handleImageExtraction: () => Promise<void>;
    handleUpdateExtractedEntry: (tempId: string, field: keyof ExtractedEntry, value: string) => void;
    handleDeleteExtractedEntry: (tempId: string) => void;
    handleSaveAllExtracted: () => Promise<void>;
};

export default function TimetableAiExtraction({
    isSaving,
    isExtracting,
    image,
    extractedEntries,
    showCamera,
    hasCameraPermission,
    videoRef,
    canvasRef,
    setShowCamera,
    handleFileChange,
    handleCapture,
    setImage,
    handleImageExtraction,
    handleUpdateExtractedEntry,
    handleDeleteExtractedEntry,
    handleSaveAllExtracted,
}: AiExtractionProps) {
    return (
        <Card className="rounded-2xl shadow-sm mt-6">
            <CardHeader>
                <CardTitle className="text-2xl font-headline">AI Timetable Extraction</CardTitle>
                <CardDescription>Upload or capture an image of a timetable to automatically extract lecture entries.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <div className="space-y-2">
                        <Label htmlFor="timetable-upload">Upload Timetable Image</Label>
                        <div className="flex gap-2">
                            <Input id="timetable-upload" type="file" accept="image/*" onChange={handleFileChange} className="flex-grow"/>
                            <Dialog open={showCamera} onOpenChange={setShowCamera}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="icon"><Camera/></Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[625px]">
                                    <DialogHeader><DialogTitle>Capture Timetable</DialogTitle></DialogHeader>
                                    <div className="my-4">
                                        <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay playsInline muted />
                                        <canvas ref={canvasRef} className="hidden" />
                                        {hasCameraPermission === false && (
                                            <Alert variant="destructive" className="mt-2">
                                                <AlertTitle>Camera Access Required</AlertTitle>
                                                <AlertDescription>Please allow camera access to use this feature.</AlertDescription>
                                            </Alert>
                                        )}
                                    </div>
                                    <DialogFooter>
                                        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                                        <Button onClick={handleCapture} disabled={!hasCameraPermission}>Capture</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                    {image && (
                        <div className="space-y-2">
                            <p className="text-sm font-medium">Image Preview</p>
                            <div className="relative border rounded-lg p-2 w-fit">
                                <img src={image} alt="Timetable preview" className="max-h-24 rounded" />
                                <Button variant="ghost" size="icon" className="absolute -top-3 -right-3 h-6 w-6 bg-background rounded-full" onClick={() => setImage(null)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                            </div>
                        </div>
                    )}
                </div>

                <Button onClick={handleImageExtraction} disabled={!image || isExtracting} className="w-full">
                    {isExtracting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                    Extract Lectures with AI
                </Button>
                
                {isExtracting && <p className="text-center text-muted-foreground animate-pulse">AI is analyzing the image, this may take a moment...</p>}
                
                {extractedEntries.length > 0 && (
                    <div className="space-y-4 pt-4 border-t">
                        <h3 className="text-lg font-semibold">Review Extracted Lectures</h3>
                        <div className="overflow-x-auto rounded-lg border">
                          <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Class</TableHead>
                                    <TableHead>Day</TableHead>
                                    <TableHead>From</TableHead>
                                    <TableHead>To</TableHead>
                                    <TableHead>Subject</TableHead>
                                    <TableHead>Teacher</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {extractedEntries.map((entry) => (
                                <TableRow key={entry.tempId}>
                                    <TableCell><Input value={entry.class} onChange={(e) => handleUpdateExtractedEntry(entry.tempId, 'class', e.target.value)} className="min-w-[100px]"/></TableCell>
                                    <TableCell><Input value={entry.day} onChange={(e) => handleUpdateExtractedEntry(entry.tempId, 'day', e.target.value)} className="min-w-[120px]"/></TableCell>
                                    <TableCell><Input type="time" value={entry.timeFrom} onChange={(e) => handleUpdateExtractedEntry(entry.tempId, 'timeFrom', e.target.value)} className="min-w-[100px]"/></TableCell>
                                    <TableCell><Input type="time" value={entry.timeTo} onChange={(e) => handleUpdateExtractedEntry(entry.tempId, 'timeTo', e.target.value)} className="min-w-[100px]"/></TableCell>
                                    <TableCell><Input value={entry.subject} onChange={(e) => handleUpdateExtractedEntry(entry.tempId, 'subject', e.target.value)} className="min-w-[150px]"/></TableCell>
                                    <TableCell><Input value={entry.teacherName} onChange={(e) => handleUpdateExtractedEntry(entry.tempId, 'teacherName', e.target.value)} className="min-w-[150px]"/></TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteExtractedEntry(entry.tempId)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        </div>
                        <div className="flex justify-end">
                            <Button onClick={handleSaveAllExtracted} disabled={isSaving}>
                                 {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save All Extracted
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
