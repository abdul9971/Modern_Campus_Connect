import { LoginForm } from '@/components/login-form';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

type LoginPageProps = {
  params: {
    role: string;
  };
};

export function generateMetadata({ params }: LoginPageProps): Metadata {
  const role = params.role.charAt(0).toUpperCase() + params.role.slice(1);
  return {
    title: `${role} Login | CampusConnect`,
  };
}

export default function LoginPage({ params }: LoginPageProps) {
  const { role } = params;

  if (!['admin', 'teacher', 'student'].includes(role)) {
    notFound();
  }

  return (
    <div className="w-full max-w-md">
      <LoginForm role={role as 'admin' | 'teacher' | 'student'} />
    </div>
  );
}
