'use client';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, ShoppingCart, Package, TruckIcon,
  ScanLine, FileBarChart, Settings, Wallet, Users
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import Billing from './components/Billing';
import Products from './components/Products';
import Purchases from './components/Purchases';
import Parties from './components/Parties';
import AIUpload from './components/AIUpload';
import Reports from './components/Reports';
import Expenses from './components/Expenses';
import SettingsPage from './components/Settings';

const navSections = [
  {
    label: 'Main',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { key: 'billing',   label: 'New Sale',  icon: ShoppingCart },
    ],
  },
  {
    label: 'Manage',
    items: [
      { key: 'products',  label: 'Products',   icon: Package },
      { key: 'purchases', label: 'Purchases',  icon: TruckIcon },
      { key: 'parties',   label: 'Parties',    icon: Users },
      { key: 'expenses',  label: 'Expenses',   icon: Wallet },
    ],
  },
  {
    label: 'Insights',
    items: [
      { key: 'reports',  label: 'Reports',  icon: FileBarChart },
      { key: 'settings', label: 'Settings', icon: Settings },
    ],
  },
];

const pages = {
  dashboard: Dashboard,
  billing: Billing,
  products: Products,
  purchases: Purchases,
  parties: Parties,
  'ai-upload': AIUpload,
  reports: Reports,
  expenses: Expenses,
  settings: SettingsPage,
};

export default function Home() {
  const [activePage, setActivePage] = useState('dashboard');
  const [lowStockCount, setLowStockCount] = useState(0);

  useEffect(() => {
    const loadAlerts = async () => {
      if (typeof window !== 'undefined' && window.electronAPI) {
        try {
          const stats = await window.electronAPI.stats.dashboard();
          setLowStockCount(stats.lowStockCount || 0);
        } catch (e) { /* silent */ }
      }
    };
    loadAlerts();
    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const ActiveComponent = pages[activePage] || Dashboard;

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">AF</div>
          <div className="sidebar-brand-text">
            <h1>AF NUTRITION</h1>
            <span>Professional ERP</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navSections.map((section) => (
            <div key={section.label}>
              <div className="sidebar-section-label">{section.label}</div>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.key}
                    className={`nav-item ${activePage === item.key ? 'active' : ''}`}
                    onClick={() => setActivePage(item.key)}
                  >
                    <Icon className="nav-icon" />
                    <span>{item.label}</span>
                    {item.key === 'products' && lowStockCount > 0 && (
                      <span className="nav-badge">{lowStockCount}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <ActiveComponent onNavigate={setActivePage} />
      </main>
    </div>
  );
}
