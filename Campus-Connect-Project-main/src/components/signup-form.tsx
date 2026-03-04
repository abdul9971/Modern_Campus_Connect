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
import { UserPlus, ArrowLeft, GraduationCap, Eye, EyeOff, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';


function SubmitButton({ isPending }: { isPending: boolean }) {
  return (
    <Button type="submit" className="w-full rounded-full font-semibold" disabled={isPending}>
      <UserPlus className="mr-2 h-4 w-4" />
      {isPending ? 'Creating Account...' : 'Create Admin Account'}
    </Button>
  );
}

export function SignupForm() {
  const { toast } = useToast();
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const [isPending, setIsPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);

    const formData = new FormData(event.currentTarget);
    const name = formData.get('name') as string;
    const username = formData.get('username') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Sign Up Failed',
        description: "Passwords don't match.",
      });
      setIsPending(false);
      return;
    }
    
    if (!auth || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Sign Up Failed',
        description: 'Firebase is not initialized. Please try again later.',
      });
      setIsPending(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      const adminData = {
        id: user.uid,
        name,
        username,
        email: user.email,
      };

      const adminRef = doc(firestore, 'admins', user.uid);
      setDocumentNonBlocking(adminRef, adminData, { merge: false });

      toast({
        title: 'Account Created',
        description:
          'Your admin account has been successfully created. Please log in.',
      });
      router.push('/login/admin');
    } catch (error: any) {
      let description =
        'Something went wrong during signup. Please try again later.';
      if (error.code === 'auth/email-already-in-use') {
        description =
          'This email is already in use. Please use a different email.';
      } else if (error.code === 'auth/weak-password') {
        description =
          'The password is too weak. Please use a stronger password.';
      }
      toast({
        variant: 'destructive',
        title: 'Sign Up Failed',
        description,
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="w-full">
        <div className="text-center mb-6">
            <Link href="/" className="flex items-center justify-center gap-2 text-2xl font-bold text-gray-800 font-headline">
                <GraduationCap className="h-7 w-7 text-indigo-600" />
                <span>CampusConnect</span>
            </Link>
        </div>
        <Card className="w-full rounded-2xl shadow-lg border-gray-200/80">
      <form onSubmit={handleSubmit}>
        <CardHeader className="text-center">
           <div className="mx-auto bg-gray-100 p-3 rounded-full mb-3">
              <Shield className="h-8 w-8 text-violet-600" />
           </div>
          <CardTitle className="text-2xl font-headline">
            Create Admin Account
          </CardTitle>
          <CardDescription>
            Enter your details to register as an administrator.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="font-medium">Full Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="John Doe"
              required
              className="rounded-lg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username" className="font-medium">Username</Label>
            <Input
              id="username"
              name="username"
              type="text"
              placeholder="johndoe"
              required
              className="rounded-lg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="font-medium">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="admin@example.com"
              required
              className="rounded-lg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="font-medium">Password</Label>
            <div className="relative">
                <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                className="rounded-lg pr-10"
                />
                 <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 cursor-pointer">
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    <span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
                </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="font-medium">Confirm Password</Label>
             <div className="relative">
                <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                required
                className="rounded-lg pr-10"
                />
                 <button type="button" onClick={() => setShowConfirmPassword(p => !p)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 cursor-pointer">
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    <span className="sr-only">{showConfirmPassword ? 'Hide password' : 'Show password'}</span>
                </button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <SubmitButton isPending={isPending} />
          <div className="text-sm text-center text-muted-foreground">
            Already have an account?{' '}
            <Link
              href="/login/admin"
              className="underline text-primary hover:text-primary/80 font-semibold"
            >
              Login
            </Link>
          </div>
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
