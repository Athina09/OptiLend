import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import './optilend-critical.css';
import { PageTransitionWrapper } from '@/components/PageTransitionWrapper';
import { ClientLayout } from '@/components/ClientLayout';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const poppins = Poppins({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Optilend | AI-Powered Alternative Credit Intelligence for MSMEs',
  description: 'Secure. Transparent. RBI-Aligned. Alternative credit scoring for MSMEs.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body className="antialiased min-h-screen bg-white text-slate-900">
        <ClientLayout>
          <PageTransitionWrapper>{children}</PageTransitionWrapper>
        </ClientLayout>
      </body>
    </html>
  );
}
