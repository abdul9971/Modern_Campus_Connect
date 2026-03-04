import { SignupForm } from '@/components/signup-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Sign Up | CampusConnect',
};

export default function SignupPage() {
  return (
    <div className="w-full max-w-md">
      <SignupForm />
    </div>
  );
}
