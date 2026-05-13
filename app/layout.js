import './globals.css';
import { Inter } from 'next/font/google';
import Providers from './Providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata = {
  title: 'InBill — Professional Billing & Inventory',
  description: 'Universal ERP — Billing, Inventory & Business Management',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
