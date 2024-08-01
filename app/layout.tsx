import React from 'react';
import Layout from '@/components/Layout';
import './globals.css'
import NextAuthSessionProvider from '@/components/SessionProvider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NextAuthSessionProvider>
          <Layout>{children}</Layout>
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}