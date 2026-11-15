import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CuraCircle AI — Elderly Care & Medication Management Platform',
  description: 'Smart, interconnected healthcare management platform powered by Gemini 3.5 Flash for elderly individuals, caretakers, and family members.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-brand-500 selection:text-white">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-3 focus:bg-brand-600 focus:text-white focus:rounded-lg focus:shadow-lg focus:font-bold"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
