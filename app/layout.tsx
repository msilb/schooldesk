import type { Metadata, Viewport } from 'next';
import Theme from './theme-provider';
import './globals.css';
export const metadata: Metadata = {
  title: 'Schooldesk',
  description: 'A calmer place for your family’s school days.',
  robots: { index: false, follow: false },
  manifest: '/site.webmanifest',
  appleWebApp: { capable: true, title: 'Schooldesk', statusBarStyle: 'default' },
  icons: { icon: '/icon.svg', apple: '/apple-touch-icon.png' },
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f7f0' },
    { media: '(prefers-color-scheme: dark)', color: '#15221d' },
  ],
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Theme>{children}</Theme>
      </body>
    </html>
  );
}
