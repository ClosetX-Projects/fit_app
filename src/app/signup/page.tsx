import { Suspense } from 'react';
import { SignUpForm } from '@/components/signup-form';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Suspense fallback={<div className="animate-pulse bg-primary/10 w-full max-w-md h-[500px] rounded-3xl" />}>
        <SignUpForm />
      </Suspense>
    </div>
  );
}
