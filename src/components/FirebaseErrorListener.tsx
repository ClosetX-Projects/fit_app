'use client';

import { useState, useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

export function FirebaseErrorListener() {
  const [error, setError] = useState<FirestorePermissionError | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      // Log for developer context
      console.warn('Firebase Permission Error Detected:', error.request);
      
      // In development, we can still throw to show the overlay,
      // but let's first ensure we provide a toast for visibility.
      toast({
        variant: "destructive",
        title: "Erro de Permissão",
        description: "Você não tem autorização para acessar alguns dados. Verifique as Regras de Segurança.",
      });

      setError(error);
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [toast]);

  // Throwing here will trigger the Next.js error boundary/overlay
  // We only do this if an error was actually emitted and caught.
  if (error) {
    throw error;
  }

  return null;
}
