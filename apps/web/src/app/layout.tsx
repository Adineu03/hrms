import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'HRMS - AI-Native Human Resource Management',
  description: 'Modern, AI-powered HRMS for organizations of all sizes',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-background text-text antialiased`}>
        {children}
      </body>
    </html>
  );
}
