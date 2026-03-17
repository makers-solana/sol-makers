import React from 'react';
import Providers from './Providers';

export const metadata = {
  title: 'Makers ERP - NFT Management',
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
