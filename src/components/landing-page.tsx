'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons';
import Image from 'next/image';

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm md:px-8">
        <Logo />
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Cadastre-se</Link>
          </Button>
        </div>
      </header>
      <main className="flex-1">
        <section className="relative h-[60vh] w-full">
          <Image
            src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw0fHxmaXRuZXNzfGVufDB8fHx8MTc3MDI0MjQyMnww&ixlib=rb-4.1.0&q=80&w=1080"
            alt="Pessoa se exercitando em uma academia"
            fill
            className="object-cover"
            data-ai-hint="fitness"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
          <div className="relative z-10 flex h-full flex-col items-center justify-center text-center text-foreground">
            <h1 className="text-4xl font-bold md:text-6xl">Bem-vindo ao FitAssist</h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              Seu companheiro de fitness com inteligência artificial para alcançar seus objetivos de forma mais inteligente.
            </p>
            <Button asChild className="mt-8" size="lg">
              <Link href="/signup">Comece Agora</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
