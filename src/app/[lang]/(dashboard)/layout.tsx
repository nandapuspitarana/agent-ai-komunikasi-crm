'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  MessageSquare, Settings, LayoutDashboard, Bot, Library,
  ChevronRight, UserSearch, ShieldCheck, Menu, X
} from 'lucide-react';
import UserMenu from '@/components/UserMenu';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useTranslation } from '@/lib/i18n/I18nContext';
import { findActiveNavItem, isNavActive, localizedHref } from '@/lib/dashboard-nav';

const NAV_ITEMS: Array<{
  href: string;
  labelKey: string;
  icon: typeof LayoutDashboard;
  superAdminOnly?: boolean;
}> = [
  { href: '/dashboard', labelKey: 'overview', icon: LayoutDashboard },
  { href: '/inbox', labelKey: 'inbox', icon: MessageSquare },
  { href: '/visitors', labelKey: 'visitors', icon: UserSearch },
  { href: '/agent', labelKey: 'agent', icon: Bot },
  { href: '/integration', labelKey: 'integration', icon: Library },
  { href: '/settings', labelKey: 'settings', icon: Settings },
  { href: '/admin', labelKey: 'admin', icon: ShieldCheck, superAdminOnly: true },
];

import GlobalNotification from '@/components/GlobalNotification';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { t, locale } = useTranslation();
  const [hotLeadCount, setHotLeadCount] = useState<number>(0);

  // Below `md` the sidebar is an off-canvas drawer; at `md` and up it is the static column it always was.
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const wasMenuOpen = useRef(false);

  // Close on route change.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Close on Escape while open.
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  // Growing past `md` while the drawer is open: the sidebar becomes the static column, so reset the state.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setMenuOpen(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Focus moves into the drawer when it opens and back to the hamburger button when it closes. If it closed
  // because the viewport grew to md+ (hamburger hidden), focus goes to the first nav link of the static sidebar.
  useEffect(() => {
    if (menuOpen) {
      closeButtonRef.current?.focus();
    } else if (wasMenuOpen.current) {
      if (window.matchMedia('(min-width: 768px)').matches) {
        document.querySelector<HTMLElement>('#dashboard-sidebar nav a')?.focus();
      } else {
        menuButtonRef.current?.focus();
      }
    }
    wasMenuOpen.current = menuOpen;
  }, [menuOpen]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/visitors?classification=hot_lead&limit=1')
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.stats) {
            setHotLeadCount(data.stats.hot_leads);
          }
        })
        .catch(() => {});
    }
  }, [status]);

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-brand rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  const tenant = (session?.user as any)?.tenant;
  const tenantId = (session?.user as any)?.tenantId;
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
  const visibleNavItems = NAV_ITEMS.filter((item) => !item.superAdminOnly || isSuperAdmin);

  return (
    <div className="flex h-screen bg-slate-50">
      {tenantId && <GlobalNotification tenantId={tenantId} />}
      {/* Backdrop for the mobile drawer */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 md:hidden"
          aria-hidden="true"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Sidebar: off-canvas drawer below md (hidden from focus and AT while closed), unchanged column from md up */}
      <div
        id="dashboard-sidebar"
        role={menuOpen ? 'dialog' : undefined}
        aria-modal={menuOpen ? true : undefined}
        aria-label={menuOpen ? t('sidebar', 'saasCrm') : undefined}
        className={`w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-40 max-md:overflow-y-auto max-md:transition-transform max-md:duration-200 motion-reduce:transition-none ${
          menuOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full max-md:invisible'
        }`}
      >
        <div className="p-4 bg-slate-950 flex items-center gap-2 text-white">
          <LayoutDashboard size={24} className="text-brand-light" />
          <span className="font-bold text-lg">{t('sidebar', 'saasCrm')}</span>
          <button
            type="button"
            ref={closeButtonRef}
            onClick={() => setMenuOpen(false)}
            aria-label={t('sidebar', 'closeMenu', 'Close menu')}
            className="ml-auto md:hidden p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {visibleNavItems.map(({ href, labelKey, icon: Icon }) => {
            const isActive = isNavActive(pathname, locale, href);
            return (
              <Link
                key={href}
                href={localizedHref(locale, href)}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group relative ${
                  isActive
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'} />
                <span className="text-sm font-medium">{t('sidebar', labelKey)}</span>
                
                {href === '/visitors' && hotLeadCount > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {hotLeadCount > 99 ? '99+' : hotLeadCount}
                  </span>
                )}
                
                {isActive && href !== '/visitors' && <ChevronRight size={14} className="ml-auto opacity-70" />}
                {isActive && href === '/visitors' && hotLeadCount === 0 && <ChevronRight size={14} className="ml-auto opacity-70" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 text-xs text-slate-600">
          v1.0.0
        </div>
      </div>

      {/* Main Content */}
      {/* inert while the mobile drawer is open: no focus, clicks or AT reading behind it (menuOpen is never true at md+) */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0" inert={menuOpen}>
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 md:px-6 justify-between shrink-0">
          <button
            type="button"
            ref={menuButtonRef}
            onClick={() => setMenuOpen(true)}
            aria-label={t('sidebar', 'openMenu', 'Open menu')}
            aria-expanded={menuOpen}
            aria-controls="dashboard-sidebar"
            className="md:hidden mr-3 p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 shrink-0"
          >
            <Menu size={22} />
          </button>
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-slate-500 min-w-0 mr-auto">
            <span className="truncate">
              {t('sidebar', findActiveNavItem(NAV_ITEMS, pathname, locale)?.labelKey || 'overview')}
            </span>
          </div>
          {session?.user && (
            <div className="flex items-center gap-2 md:gap-4 shrink-0">
              <LanguageSwitcher />
              <UserMenu
                user={{
                  email: session.user.email || '',
                  name: session.user.name || null,
                }}
                tenant={tenant}
              />
            </div>
          )}
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
