'use client';
import './globals.css';
import { useState } from 'react';
import {
  LayoutDashboard, ShoppingCart, Package, TruckIcon,
  ScanLine, FileBarChart, Settings, ChevronLeft
} from 'lucide-react';

const navItems = [
  { key: 'dashboard', label: 'Dashboard',   icon: LayoutDashboard },
  { key: 'billing',   label: 'Billing',     icon: ShoppingCart },
  { key: 'products',  label: 'Products',    icon: Package },
  { key: 'purchases', label: 'Purchases',   icon: TruckIcon },
  { key: 'ai-upload', label: 'AI Upload',   icon: ScanLine },
  { key: 'reports',   label: 'Reports',     icon: FileBarChart },
  { key: 'settings',  label: 'Settings',    icon: Settings },
];

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>Supplement Store Manager</title>
        <meta name="description" content="Billing & Inventory Management System for Supplement Stores" />
      </head>
      <body>{children}</body>
    </html>
  );
}
