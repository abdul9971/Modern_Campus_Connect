'use client';

export type Teacher = {
    id: string;
    name: string;
    username: string;
    email: string;
    dateOfBirth: string;
    phoneNumber: string;
    address: string;
    photoURL?: string;
    photoPath?: string;
    disabled?: boolean;
    createdAt?: any; // Firestore Timestamp
}

export type Student = {
    id:string;
    name: string;
    username: string;
    email: string;
    class: string;
    dateOfBirth: string;
    phoneNumber: string;
    address: string;
    photoURL?: string;
    photoPath?: string;
    disabled?: boolean;
    createdAt?: any; // Firestore Timestamp
}

export type Timetable = {
    id: string;
    date: string; // YYYY-MM-DD
    day: string;
    createdBy: string;
    createdAt: any; // Firestore Timestamp
}

export type TimetableEntry = {
    id: string;
    class: string;
    subject: string;
    teacherName: string;
    timeFrom: string; // e.g. "07:40"
    timeTo: string;   // e.g. "08:25"
    date: string; // YYYY-MM-DD
    day: string;
    room?: string;
    teacherId?: string;
}

export type AttendanceRecord = {
    id: string;
    studentId: string;
    timetableEntryId: string;
    teacherId: string;
    classId: string;
    date: string; // YYYY-MM-DD
    status: 'Present' | 'Absent' | 'Pending';
    subject: string;
    timeFrom: string;
    timeTo: string;
}

    
