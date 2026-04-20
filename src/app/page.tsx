'use client';

import { useUser } from '@/contexts/auth-provider';
import { HomeDashboard } from '@/components/home-dashboard';
import { LandingPage } from '@/components/landing-page';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { user, isUserLoading } = useUser();

  if (isUserLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return user ? <HomeDashboard /> : <LandingPage />;
}
