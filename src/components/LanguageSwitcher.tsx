'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/I18nContext';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
  const { locale } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();

  const switchLanguage = (newLocale: string) => {
    // Set cookie to remember preference
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;
    
    // Replace current locale in URL
    if (!pathname) return;
    const pathWithoutLocale = pathname.replace(`/${locale}`, '') || '/';
    const newUrl = `/${newLocale}${pathWithoutLocale}`;
    
    router.push(newUrl);
    router.refresh(); // Refresh to update server components
  };

  return (
    <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-100 transition-colors">
      <Globe size={16} className="text-slate-500 mr-2 shrink-0" />
      <select
        value={locale}
        onChange={(e) => switchLanguage(e.target.value)}
        className="bg-transparent text-sm font-medium text-slate-700 outline-none cursor-pointer appearance-none pr-4"
        style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
      >
        <option value="en">English</option>
        <option value="id">Bahasa Indonesia</option>
        <option value="zh">中文 (Chinese)</option>
        <option value="ko">한국어 (Korean)</option>
        <option value="th">ไทย (Thai)</option>
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
        </svg>
      </div>
    </div>
  );
}
