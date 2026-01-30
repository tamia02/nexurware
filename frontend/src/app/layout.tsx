import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { Shell } from '@/components/Shell';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Cold Email CRM',
  description: 'Agentic Outreach Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-gray-100">
      <body className={`${inter.className} h-full`}>
        <AuthProvider>
          <Shell>
            {children}
          </Shell>
        </AuthProvider>
      </body>
    </html>
  );
}
