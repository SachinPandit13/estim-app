import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { EstimUiProvider } from '@/store/estim-ui-store';
import { ToastViewport } from '@/components/ui/toast';

const geistSans = Geist({
  variable: '--font-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Estim - AI Worker Safety Monitoring System',
  description:
    'Industrial worker safety monitoring, incident response, and camera telemetry platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AuthProvider>
          <EstimUiProvider>
            {children}
            <ToastViewport />
          </EstimUiProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
