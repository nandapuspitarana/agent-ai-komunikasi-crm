'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase-client';
import { Bell, BellOff } from 'lucide-react';

export default function GlobalNotification({ tenantId }: { tenantId: string }) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [activeSessions, setActiveSessions] = useState<Set<string>>(new Set());
  const activeSessionsRef = useRef<Set<string>>(new Set());
  const processedMessageIds = useRef<Set<string>>(new Set());

  // Update ref when state changes so event listeners have latest
  useEffect(() => {
    activeSessionsRef.current = activeSessions;
  }, [activeSessions]);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
    
    // Fetch initial sessions for this tenant
    const fetchSessions = async () => {
      try {
        const res = await fetch('/api/chat/sessions');
        if (res.ok) {
          const data = await res.json();
          const sessionIds = new Set(data.map((s: any) => s.id));
          setActiveSessions(sessionIds as Set<string>);
        }
      } catch (err) {
        console.error('Error fetching sessions for notifications:', err);
      }
    };
    fetchSessions();
  }, []);

  const requestPermission = () => {
    if ('Notification' in window) {
      Notification.requestPermission().then((perm) => {
        setPermission(perm);
      });
    }
  };

  useEffect(() => {
    if (!tenantId) return;

    const playSound = () => {
      try {
        const audio = new Audio('/notification.mp3');
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => console.log('Audio play failed (needs interaction):', err));
        }
      } catch (err) {
        console.error('Error playing sound:', err);
      }
    };

    const originalTitle = document.title;
    
    const showNotification = (title: string, body: string) => {
      playSound();
      
      // Flash document title
      document.title = `(1) ${title}`;
      setTimeout(() => { document.title = originalTitle; }, 3000);

      if (Notification.permission === 'granted' && 'Notification' in window) {
        try {
          const notif = new Notification(title, {
            body,
            icon: '/icon-192.png',
          });
          notif.onclick = () => {
            window.focus();
            notif.close();
          };
        } catch (e) {
          console.error('Native notification failed:', e);
        }
      }
    };

    const channel = supabase.channel(`global_notifications_${tenantId}`);

    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'crm', table: 'crm_agent_Message' },
        (payload) => {
          const data = payload.new as any;
          if (data.senderType === 'user') {
            if (processedMessageIds.current.has(data.id)) return;
            processedMessageIds.current.add(data.id);
            if (activeSessionsRef.current.has(data.sessionId)) {
              showNotification('Pesan Baru', data.content);
            } else {
              // Async fallback to check tenantId in case of race condition
              import('@/app/actions/notification').then(({ checkSessionTenant }) => {
                checkSessionTenant(data.sessionId).then(sessionTenantId => {
                  if (sessionTenantId === tenantId) {
                    setActiveSessions(prev => new Set(prev).add(data.sessionId));
                    showNotification('Pesan Baru', data.content);
                  }
                });
              });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'crm', table: 'crm_agent_ChatSession' },
        (payload) => {
          const data = payload.new as any;
          if (data.tenantId === tenantId) {
            setActiveSessions(prev => {
              const next = new Set(prev);
              next.add(data.id);
              return next;
            });
            showNotification('Chat Baru', 'Pengunjung memulai percakapan.');
          }
        }
      )
      .on(
        'broadcast',
        { event: 'new_message' },
        (payload) => {
          const data = payload.payload as any;
          // Guard against duplicate notifications if both replication and broadcast fire
          if (data.senderType === 'user') {
            if (processedMessageIds.current.has(data.id)) return;
            processedMessageIds.current.add(data.id);
            if (activeSessionsRef.current.has(data.sessionId)) {
              showNotification('Pesan Baru', data.content);
            } else {
              import('@/app/actions/notification').then(({ checkSessionTenant }) => {
                checkSessionTenant(data.sessionId).then(sessionTenantId => {
                  if (sessionTenantId === tenantId) {
                    setActiveSessions(prev => new Set(prev).add(data.sessionId));
                    showNotification('Pesan Baru', data.content);
                  }
                });
              });
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('GlobalNotification subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
      document.title = originalTitle;
    };
  }, [tenantId]);

  return (
    <>
      {permission === 'default' && (
        <div className="fixed bottom-4 right-4 z-[100] bg-white border border-slate-200 shadow-lg p-4 rounded-xl flex items-center gap-4 animate-in slide-in-from-bottom-5">
          <div className="bg-amber-100 p-2 rounded-full text-amber-600">
            <Bell size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Aktifkan Notifikasi</p>
            <p className="text-xs text-slate-500">Agar Anda tidak ketinggalan chat masuk.</p>
          </div>
          <button 
            onClick={requestPermission}
            className="ml-2 bg-brand text-white px-3 py-1.5 text-xs font-semibold rounded-lg hover:bg-brand-hover transition-colors"
          >
            Izinkan
          </button>
        </div>
      )}

      {permission === 'denied' && (
        <div className="fixed bottom-4 right-4 z-[100] bg-white border border-red-100 shadow-lg p-3 rounded-xl flex items-center gap-3 opacity-50 hover:opacity-100 transition-opacity">
          <BellOff size={16} className="text-red-500" />
          <p className="text-xs text-slate-500">Notifikasi browser diblokir.</p>
        </div>
      )}
    </>
  );
}
