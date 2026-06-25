import '../globals.css';
import Providers from '@/components/Providers';
import { getDictionary, Locale } from '@/lib/i18n';
import { I18nProvider } from '@/lib/i18n/I18nContext';

export const metadata = {
  title: 'Modern CeosuiteBOT',
  description: 'Omnichannel CRM and Flow Builder',
};

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }> | { lang: string };
}) {
  const resolvedParams = await params;
  const lang = resolvedParams.lang as Locale;
  const dictionary = await getDictionary(lang || 'en');
  
  return (
    <html lang={lang}>
      <body>
        <I18nProvider locale={lang} dictionary={dictionary}>
          <Providers>
            {children}
          </Providers>
        </I18nProvider>
      </body>
    </html>
  );
}
