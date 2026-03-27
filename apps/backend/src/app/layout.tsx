import React from 'react';
import Providers from './Providers';
import './erp.css';

export const metadata = {
  title: 'Makers Dashboard - NFT Management',
  description: 'Professional NFT Management Dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>

        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
