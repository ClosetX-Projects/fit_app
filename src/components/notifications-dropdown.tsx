'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Bell, Circle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export function NotificationsDropdown() {
  const notifications: any[] = []; // Removido Firebase, sem endpoint no backend ainda
  const isLoading = false;
  const unreadCount = 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-primary/10 hover:text-primary transition-colors">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-destructive border-2 border-background animate-in zoom-in">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 rounded-2xl overflow-hidden shadow-2xl border-primary/10" align="end">
        <div className="bg-primary/5 p-4 border-b flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-widest text-primary">Notificações</h3>
        </div>
        <ScrollArea className="h-80">
          <div className="p-12 text-center text-xs text-muted-foreground italic">
            Nenhuma notificação por aqui.
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
