'use client';

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { LogIn, Shield, BookUser, GraduationCap, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

const roleConfig: Record<'admin' | 'teacher' | 'student', {
  title: string;
  description: string;
  icon: LucideIcon;
  accentColor: string;
}> = {
  admin: {
    title: 'Admin Login',
    description: 'Secure access to system controls.',
    icon: Shield,
    accentColor: 'text-violet-600',
  },
  teacher: {
    title: 'Teacher Login',
    description: 'Take attendance and manage your lectures.',
    icon: BookUser,
    accentColor: 'text-blue-600',
  },
  student: {
    title: 'Student Login',
    description: 'View your schedule and attendance.',
    icon: GraduationCap,
    accentColor: 'text-teal-600',
  }
}

function SubmitButton({ isPending }: { isPending: boolean }) {
  return (
    <Button type="submit" className="w-full rounded-xl font-bold h-12 shadow-xl btn-press transition-all" disabled={isPending}
      style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)', boxShadow: '0 8px 32px rgba(15,23,42,0.25)' }}>
      <LogIn className="mr-2 h-4 w-4" />
      {isPending ? 'Signing in...' : 'Sign in'}
    </Button>
  );
}

export function LoginForm({ role }: { role: 'admin' | 'teacher' | 'student' }) {
  const { toast } = useToast();
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const [isPending, setIsPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const formRole = formData.get('role') as string;

    if (!auth || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'Firebase is not initialized. Please try again later.',
      });
      setIsPending(false);
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Verify user role
      const roleCollection = `${formRole}s`; // admin -> admins, etc.
      const userDocRef = doc(firestore, roleCollection, user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        // Check if account is disabled
        if (userDoc.data().disabled) {
          await signOut(auth);
          toast({
            variant: 'destructive',
            title: 'Login Failed',
            description: 'This account has been disabled by an administrator.',
          });
        } else {
          router.push(`/${formRole}/dashboard`);
        }
      } else {
        // Self-healing: Auth user exists, but Firestore doc is missing.
        toast({ title: "Account Recovery", description: "Existing account found without a profile. Recovering..." });

        const nameFallback = user.email?.split('@')[0] || 'recovered_user';

        const recoveryData: any = {
          id: user.uid,
          name: nameFallback,
          username: nameFallback,
          email: user.email || '',
          disabled: false,
          createdAt: serverTimestamp(),
          dateOfBirth: '',
          phoneNumber: '',
          address: '',
        };

        if (formRole === 'student') {
          recoveryData.class = 'UNKNOWN';
        }

        try {
          await setDoc(userDocRef, recoveryData);
          router.push(`/${formRole}/dashboard`);
        } catch (recoveryError) {
          console.error("Failed to recover user profile:", recoveryError);
          await signOut(auth);
          toast({
            variant: 'destructive',
            title: 'Recovery Failed',
            description: 'Could not restore your user profile. Please contact an admin.',
          });
        }
      }
    } catch (error: any) {
      let description = 'Invalid credentials. Please try again.';
      if (
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/wrong-password' ||
        error.code === 'auth/invalid-credential'
      ) {
        description = 'Invalid email or password.';
      }
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description,
      });
    } finally {
      setIsPending(false);
    }
  }

  const { title, description, icon: Icon, accentColor } = roleConfig[role];

  return (
    <div className="w-full">
      <Card className="w-full rounded-2xl shadow-sm border-slate-200 bg-white">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-1', 'bg-slate-100')}>
              <Icon className={cn('h-6 w-6', accentColor)} />
            </div>
            <CardTitle className="text-xl font-semibold text-slate-900">{title}</CardTitle>
            <CardDescription className="text-slate-500">
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-medium">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@example.com"
                required
                className="rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-medium">Password</Label>
              <div className="relative">
                <Input id="password" name="password" type={showPassword ? 'text' : 'password'} required className="rounded-lg pr-10" />
                <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 cursor-pointer">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  <span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
                </button>
              </div>
            </div>
            <input type="hidden" name="role" value={role} />
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <SubmitButton isPending={isPending} />
            {role === 'admin' && (
              <div className="text-sm text-center text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Link
                  href="/signup"
                  className="underline text-primary hover:text-primary/80 font-semibold"
                >
                  Sign up
                </Link>
              </div>
            )}
          </CardFooter>
        </form>
      </Card>
      <div className="mt-6 text-center">
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Role Selection
          </Link>
        </Button>
      </div>
    </div>
  );
}
