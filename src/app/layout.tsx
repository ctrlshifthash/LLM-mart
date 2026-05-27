import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Suspense } from 'react';
import { Providers } from '@/components/providers';
import { Nav } from '@/components/nav';
import { Footer } from '@/components/footer';
import { SplashScreen } from '@/components/splash-screen';
import { Toaster } from 'sonner';
import { BRAND_LOGO_URL } from '@/lib/brand';

const inter = Inter({ variable: '--font-sans-inter', subsets: ['latin'] });
const mono = JetBrains_Mono({ variable: '--font-mono-jb', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'LLM Mart — The marketplace for AI inference',
  description:
    'Buy AI inference from people with leftover OpenRouter, Venice, or Uncensored credits. Pay 70-90% less for the same models, settled onchain in USDC on Solana.',
  icons: {
    icon: BRAND_LOGO_URL,
    shortcut: BRAND_LOGO_URL,
    apple: BRAND_LOGO_URL,
  },
  openGraph: {
    title: 'LLM Mart — The marketplace for AI inference',
    description: 'Buy AI inference from people with leftover OpenRouter, Venice, or Uncensored credits. Pay in USDC.',
    images: [BRAND_LOGO_URL],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    images: [BRAND_LOGO_URL],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <SplashScreen />
        <Providers>
          <Suspense fallback={<div className="h-16 border-b border-border" />}>
            <Nav />
          </Suspense>
          <main className="flex-1">{children}</main>
          <Footer />
          <Toaster theme="dark" position="bottom-right" toastOptions={{ style: { background: '#0f1525', border: '1px solid #243056', color: '#e5e7eb' } }} />
        </Providers>
      </body>
    </html>
  );
}
