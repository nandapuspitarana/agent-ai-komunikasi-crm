import '../globals.css';
import { getDictionary, Locale } from '@/lib/i18n';
import { I18nProvider } from '@/lib/i18n/I18nContext';

export const metadata = {
  title: 'Widget UI',
};

export default async function WidgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Use English as default for widget if no specific locale handling is setup via query yet
  const lang: Locale = 'en';
  const dictionary = await getDictionary(lang);

  return (
    <html lang={lang}>
      <body>
        <I18nProvider locale={lang} dictionary={dictionary}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
