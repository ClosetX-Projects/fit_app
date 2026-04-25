'use client';

import { Suspense } from 'react';
import { LoginForm } from '@/components/login-form';
import { useUser } from '@/contexts/auth-provider';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { isUserLoading } = useUser();

  if (isUserLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse font-medium">Validando acesso...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Suspense fallback={<div className="animate-pulse bg-primary/10 w-full max-w-md h-[400px] rounded-3xl" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
