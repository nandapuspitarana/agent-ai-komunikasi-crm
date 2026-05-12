'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChatWindow } from '@/modules/widget/ChatWindow';

function WidgetUIRenderer() {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get('tenantId') || 'demo-tenant-1234';
  const color = searchParams.get('color') || '#2563eb';
  const name = searchParams.get('name') || 'Support Bot';

  return (
    <div className="h-screen w-screen overflow-hidden">
      <ChatWindow 
        tenantId={tenantId} 
        primaryColor={color} 
        botName={name} 
      />
    </div>
  );
}

// Next.js App Router mengharuskan komponen yang memanggil useSearchParams() 
// untuk dibungkus dalam Suspense agar bisa di-render statis atau dirender 
// di klien tanpa deopt.
export default function WidgetUIPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen bg-slate-50"><p className="text-slate-400">Loading...</p></div>}>
      <WidgetUIRenderer />
    </Suspense>
  );
}
