'use client';

import { useState, useRef, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { ChevronDown, LogOut, Settings as SettingsIcon } from 'lucide-react';
import Link from 'next/link';

interface UserMenuProps {
  user: {
    email: string;
    name: string | null;
  };
  tenant?: {
    name: string;
  };
}

export default function UserMenu({ user, tenant }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    const callbackUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}/login` 
      : '/login';
    await signOut({ callbackUrl });
  };

  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : user.email[0].toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 hover:bg-slate-100 px-3 py-2 rounded-lg transition-colors"
      >
        <div className="text-sm text-right">
          <p className="font-medium text-slate-700">{user.name || 'User'}</p>
          <p className="text-xs text-slate-500">{tenant?.name || user.email}</p>
        </div>
        <div className="w-10 h-10 bg-brand-bg text-brand-hover rounded-full flex items-center justify-center font-bold text-sm">
          {initials}
        </div>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
          <div className="px-4 py-2 border-b border-slate-200">
            <p className="text-sm font-medium text-slate-900">{user.name || 'User'}</p>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>

          <Link
            href="/settings"
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <SettingsIcon size={16} />
            Settings
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-slate-200"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
