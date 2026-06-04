import './globals.css';
import Providers from '@/components/Providers';

export const metadata = {
  title: 'Modern SaaS CRM',
  description: 'Omnichannel CRM and Flow Builder',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
