'use client';

import { SignUpForm } from '@/components/signup-form';
import { FirebaseClientProvider } from '@/firebase';

export default function SignUpPage() {
  return (
    <FirebaseClientProvider>
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <SignUpForm />
      </div>
    </FirebaseClientProvider>
  );
}
