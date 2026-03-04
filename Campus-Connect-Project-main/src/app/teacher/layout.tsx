'use client';

import { useAuth, useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { LogOut, Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { doc } from 'firebase/firestore';
import type { Teacher } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

function LogoutButton() {
    const auth = useAuth();
    const router = useRouter();
    const handleLogout = async () => { if (auth) { await signOut(auth); router.push('/'); } };
    return (
        <button onClick={handleLogout} title="Logout"
            className="text-slate-400 hover:text-slate-700 transition-all p-2 rounded-xl hover:bg-white/60 hover:shadow-sm btn-press">
            <LogOut className="h-5 w-5" />
        </button>
    );
}

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const teacherRef = useMemoFirebase(() => (firestore && user?.uid) ? doc(firestore, 'teachers', user.uid) : null, [firestore, user?.uid]);
    const { data: teacher, isLoading: isLoadingTeacher } = useDoc<Teacher>(teacherRef);
    const isLoading = isUserLoading || isLoadingTeacher;

    return (
        <div className="min-h-screen w-full bg-gradient-animated">
            <nav className="glass sticky top-0 z-50 border-b border-white/30 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center h-16 gap-4">
                        <Link href="/teacher/dashboard" className="flex items-center gap-2 flex-shrink-0 group">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all">
                                <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5"><path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3z" /></svg>
                            </div>
                            <span className="font-bold text-lg text-slate-900">CampusConnect</span>
                        </Link>
                        <div className="flex-1 max-w-sm mx-auto hidden sm:block">
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                <input type="text" placeholder="Search"
                                    className="w-full pl-9 pr-4 py-2 bg-white/50 border border-slate-200/60 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-300 focus:bg-white/80 transition-all" />
                            </div>
                        </div>
                        <div className="flex items-center gap-3 ml-auto">
                            {isLoading ? (
                                <div className="flex items-center gap-2.5"><Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-5 w-24 hidden sm:block" /></div>
                            ) : (
                                <div className="flex items-center gap-2.5">
                                    <Avatar className="h-10 w-10 border-2 border-white shadow-md shadow-slate-200/50 hover:shadow-lg transition-shadow hover-scale">
                                        <AvatarImage src={teacher?.photoURL} alt={teacher?.name ?? ''} />
                                        <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white font-semibold text-sm">{teacher?.name?.charAt(0) ?? 'T'}</AvatarFallback>
                                    </Avatar>
                                    <div className="hidden sm:block">
                                        <p className="text-xs font-medium text-slate-400 leading-none">Teacher</p>
                                        <p className="text-sm font-bold text-slate-900 leading-none mt-0.5">{teacher?.name ?? '...'}</p>
                                    </div>
                                </div>
                            )}
                            <LogoutButton />
                        </div>
                    </div>
                </div>
            </nav>
            <main className="flex-1 py-6 sm:py-8"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div></main>
        </div>
    );
}
