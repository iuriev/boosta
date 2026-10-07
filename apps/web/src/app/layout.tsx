import './globals.css';

import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';

// The font files are in the repository (variable fonts, Latin subset, from
// Fontsource), so a build never depends on a font service being reachable.
// next/font generates metric-matched fallbacks, so text does not shift when
// the web fonts arrive.
const geologica = localFont({
  src: './fonts/geologica-latin-wght-normal.woff2',
  weight: '100 900',
  variable: '--font-geologica',
  display: 'swap',
});

const inter = localFont({
  src: './fonts/inter-latin-wght-normal.woff2',
  weight: '100 900',
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
