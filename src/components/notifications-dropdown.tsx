
'use client';

import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Bell, Check, Trash2, Loader2, Circle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function NotificationsDropdown() {
  const { user } = useUser();
  const { firestore } = useFirebase();

  const notificationsRef = useMemoFirebase(() => 
    user ? query(
      collection(firestore, 'users', user.uid, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(10)
    ) : null
  , [firestore, user]);

  const { data: notifications, isLoading } = useCollection(notificationsRef);

  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  const handleNotificationClick = async (n: any) => {
    if (!user) return;
    
    // Marcar como lida
    if (!n.read) {
      const ref = doc(firestore, 'users', user.uid, 'notifications', n.id);
      updateDoc(ref, { read: true });
    }

    // Lógica de Redirecionamento baseada no tipo
    let targetTab = '';
    if (n.type === 'health-questionnaire') targetTab = 'health';
    if (n.type === 'assessment-result' || n.type === 'physical-assessment-request') targetTab = 'assessment';
    
    if (targetTab) {
      const event = new CustomEvent('app:change-tab', { detail: targetTab });
      window.dispatchEvent(event);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user || !notifications) return;
    const batch = writeBatch(firestore);
    notifications.filter(n => !n.read).forEach(n => {
      const ref = doc(firestore, 'users', user.uid, 'notifications', n.id);
      batch.update(ref, { read: true });
    });
    await batch.commit();
  };

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
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead} className="h-7 text-[10px] font-bold uppercase hover:bg-primary/10">
              Ler tudo
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : notifications && notifications.length > 0 ? (
            <div className="divide-y divide-primary/5">
              {notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={`p-4 transition-colors flex gap-3 cursor-pointer group ${n.read ? 'opacity-60' : 'bg-primary/5'}`}
                  onClick={() => handleNotificationClick(n)}
                >
                  <div className="mt-1">
                    {!n.read ? <Circle className="h-2 w-2 fill-primary text-primary" /> : <div className="h-2 w-2" />}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className={`text-xs font-bold leading-tight ${!n.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {n.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      {n.message}
                    </p>
                    <p className="text-[9px] uppercase font-bold text-primary/60">
                      {n.createdAt ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ptBR }) : '--'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-muted-foreground italic">
              Nenhuma notificação por aqui.
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
