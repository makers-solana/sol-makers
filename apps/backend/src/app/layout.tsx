import Script from 'next/script';
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
      <head>
        <Script id="provider-fix" strategy="beforeInteractive">
          {`
            // Prevent some wallet extensions from crashing the page by attempting to redefine window.ethereum
            try {
              const descriptor = Object.getOwnPropertyDescriptor(window, 'ethereum');
              if (descriptor && !descriptor.configurable) {
                console.warn('Ethereum provider found and is not configurable. Attempting to mitigate conflict.');
              }
            } catch (e) {
              console.error('Wallet provider check failed:', e);
            }
          `}
        </Script>
      </head>
      <body>

        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
