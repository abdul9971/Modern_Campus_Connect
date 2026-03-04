'use client';

import Link from 'next/link';
import { Users, UserPlus, Calendar, LogOut, GraduationCap, BarChart2, Search } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

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

const dashboardCards = [
  {
    title: 'Manage Teachers', description: 'View, add, or manage teacher profiles and their assignments.', href: '/admin/teacher-dashboard',
    icon: <Users className="w-6 h-6" />, gradient: 'from-blue-500 to-indigo-500', bgGlow: 'hover:shadow-blue-200/50', borderHover: 'hover:border-blue-200'
  },
  {
    title: 'Manage Students', description: 'View enrollments, update student records by class.', href: '/admin/student-dashboard',
    icon: <GraduationCap className="w-6 h-6" />, gradient: 'from-emerald-500 to-teal-500', bgGlow: 'hover:shadow-emerald-200/50', borderHover: 'hover:border-emerald-200'
  },
  {
    title: 'Add New Teacher', description: 'Onboard a new faculty member to the platform.', href: '/admin/add-teacher',
    icon: <UserPlus className="w-6 h-6" />, gradient: 'from-purple-500 to-pink-500', bgGlow: 'hover:shadow-purple-200/50', borderHover: 'hover:border-purple-200'
  },
  {
    title: 'Add New Student', description: 'Enroll a new student and assign them to a class.', href: '/admin/add-student',
    icon: <UserPlus className="w-6 h-6" />, gradient: 'from-cyan-500 to-blue-500', bgGlow: 'hover:shadow-cyan-200/50', borderHover: 'hover:border-cyan-200'
  },
  {
    title: 'Set Timetable', description: 'Create or update class schedules and lecture slots.', href: '/admin/set-timetable',
    icon: <Calendar className="w-6 h-6" />, gradient: 'from-amber-500 to-orange-500', bgGlow: 'hover:shadow-amber-200/50', borderHover: 'hover:border-amber-200'
  },
];

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-gradient-animated">
      {/* Navbar */}
      <nav className="glass sticky top-0 z-50 border-b border-white/30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-md shadow-blue-500/20">
                <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5"><path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3z" /></svg>
              </div>
              <span className="font-bold text-xl tracking-tight text-slate-900">CampusConnect</span>
              <span className="ml-2 text-xs font-bold bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full px-2.5 py-0.5 shadow-sm">Admin</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-sm font-semibold text-slate-700">
                <BarChart2 className="h-4 w-4 text-slate-400" /> Admin Panel
              </div>
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 fade-in-up">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Welcome, <span className="text-gradient">Admin!</span>
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Here's a quick overview of your management options.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {dashboardCards.map((card, i) => (
            <Link key={card.href} href={card.href}
              className={cn(
                'group block bg-white/80 backdrop-blur-xl rounded-2xl border border-white/40 p-6 transition-all duration-500 hover:-translate-y-2 hover:shadow-xl fade-in-up gradient-border',
                card.bgGlow, card.borderHover
              )}
              style={{ animationDelay: `${(i + 1) * 100}ms` }}>
              <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-white shadow-lg bg-gradient-to-br', card.gradient)}>
                {card.icon}
              </div>
              <h3 className="font-bold text-slate-900 mb-1 group-hover:text-blue-700 transition-colors">{card.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{card.description}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
