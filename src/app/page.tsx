'use client';

import { useUser, FirebaseClientProvider } from '@/firebase';
import { HomeDashboard } from '@/components/home-dashboard';
import { LandingPage } from '@/components/landing-page';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

function App() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // This is a simple example, you might want to handle this differently
    // e.g. redirect to a specific page based on user role
  }, [user, router]);

  if (isUserLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-dashed border-primary"></div>
      </div>
    );
  }

  return user ? <HomeDashboard /> : <LandingPage />;
}

// Remove the default export from here
function HomePage() {
  return (
    <FirebaseClientProvider>
      <App />
    </FirebaseClientProvider>
  );
}

// Add the default export here
export default HomePage;
