
'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons';
import Image from 'next/image';
import { GraduationCap, CheckCircle2, Lock } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm md:px-8">
        <Logo />
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild className="rounded-full">
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild className="rounded-full bg-primary text-white">
            <Link href="/signup?role=professor">Sou Personal</Link>
          </Button>
        </div>
      </header>
      <main className="flex-1">
        <section className="relative h-[70vh] w-full overflow-hidden">
          <Image
            src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw0fHxmaXRuZXNzJTIwZ3ltfGVufDB8fHx8MTc3MDI0MjQyMnww&ixlib=rb-4.1.0&q=80&w=1080"
            alt="Pessoa se exercitando em uma academia"
            fill
            className="object-cover"
            data-ai-hint="fitness gym"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <div className="relative z-10 flex h-full flex-col items-center justify-center text-center px-4">
            <h1 className="text-5xl font-black md:text-7xl tracking-tighter text-foreground">
              Evolua com <span className="text-primary">Inteligência</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg md:text-xl text-muted-foreground font-medium">
              A plataforma definitiva para personal trainers e seus alunos.
            </p>
            
            <div className="mt-12 flex flex-col items-center gap-6 w-full max-w-md">
              <Button asChild size="lg" className="w-full h-16 rounded-2xl text-lg font-bold bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20">
                <Link href="/signup?role=professor" className="flex items-center justify-center gap-3">
                  <GraduationCap className="h-6 w-6" /> Sou Personal Trainer
                </Link>
              </Button>
              
              <div className="flex items-center gap-3 text-muted-foreground bg-muted/50 px-6 py-4 rounded-2xl border border-dashed border-primary/20">
                <Lock className="h-5 w-5 shrink-0" />
                <p className="text-xs text-left">
                  <strong>Área do Aluno:</strong> O cadastro de alunos é feito exclusivamente por meio de convite enviado pelo seu Personal Trainer.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 px-4 bg-muted/30">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { title: "Gestão de Alunos", desc: "Vincule seus alunos automaticamente via links de convite exclusivos." },
              { title: "Interface Moderna", desc: "Design focado em produtividade e clareza técnica para prescrição." },
              { title: "Acompanhamento Real", desc: "Monitore 9 dobras cutâneas e circunferências bilaterais em tempo real." }
            ].map((feature, i) => (
              <div key={i} className="flex flex-col items-center text-center space-y-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      
      <footer className="py-12 px-4 border-t text-center text-sm text-muted-foreground">
        <p>© 2026 FitAssist AI. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
