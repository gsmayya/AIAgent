import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LM Studio Chat',
  description: 'Chat with your LM Studio models',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}

