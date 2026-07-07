import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'STEM WMS',
  description: 'Warehouse box tracking system'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
