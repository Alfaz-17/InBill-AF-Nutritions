import './globals.css';
import Providers from './Providers';

export const metadata = {
  title: 'InBill — Professional Billing & Inventory',
  description: 'Universal ERP — Billing, Inventory & Business Management',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
