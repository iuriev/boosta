import './globals.css';

import type { Metadata, Viewport } from 'next';
import { Geologica, Inter } from 'next/font/google';
import type { ReactNode } from 'react';

// next/font self-hosts the files and generates metric-matched fallbacks, so
// text does not shift when the web fonts arrive.
const geologica = Geologica({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-geologica',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'ADHD Trait Profile | BrainsMate',
    template: '%s | BrainsMate',
  },
  description: 'Find out how ADHD traits influence your focus, energy, and daily life.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${geologica.variable} ${inter.variable}`}>
      <body>
        <a className="skip-link" href="#content">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
