'use client';

import { SessionProvider } from 'next-auth/react';

if (typeof window !== 'undefined' && window.crypto && !window.crypto.randomUUID) {
  // Polyfill for non-secure contexts (plain HTTP) where crypto.randomUUID is unavailable
  (window.crypto as any).randomUUID = function(): `${string}-${string}-${string}-${string}-${string}` {
    const hex = () => Math.floor(Math.random() * 16).toString(16);
    return `${Array(8).fill(0).map(hex).join('')}-${Array(4).fill(0).map(hex).join('')}-4${Array(3).fill(0).map(hex).join('')}-${(8 + Math.floor(Math.random() * 4)).toString(16)}${Array(3).fill(0).map(hex).join('')}-${Array(12).fill(0).map(hex).join('')}` as `${string}-${string}-${string}-${string}-${string}`;
  };
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
