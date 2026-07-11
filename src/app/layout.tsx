import type { Metadata, Viewport } from 'next';
import { Sora, Manrope, IBM_Plex_Mono } from 'next/font/google';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import { BottomNav } from '@/components/BottomNav';
import './globals.css';

const sora = Sora({ subsets: ['latin'], variable: '--font-sora', weight: ['500', '600'] });
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], variable: '--font-mono', weight: ['400', '500'] });

export const metadata: Metadata = {
  title: 'Orbit — Study Planner',
  description: 'Adaptive study planner: plan, revise, and learn from mistakes in one loop.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Orbit' },
};

export const viewport: Viewport = {
  themeColor: '#12172B',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${manrope.variable} ${mono.variable}`}>
      <body>
        <ServiceWorkerRegister />
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
