'use client';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, ShoppingCart, Package, TruckIcon,
  ScanLine, FileBarChart, Settings, Wallet, Users, Store, RotateCcw
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
      { key: 'products',  label: 'Inventory',   icon: Package },
      { key: 'purchases', label: 'Stock-In',  icon: TruckIcon },
      { key: 'parties',   label: 'Parties',    icon: Users },
      { key: 'expenses',  label: 'Expenses',   icon: Wallet },
    ],
  },
  {
    label: 'Insights',
    items: [
      { key: 'reports',  label: 'Reports',  icon: FileBarChart },
      { key: 'digital-store', label: 'Online Store', icon: Store },
      { key: 'settings', label: 'Settings', icon: Settings },
    ],
  },
];

import SetupWizard from './components/SetupWizard';
import DigitalStore from './components/DigitalStore';

const pages = {
  dashboard: Dashboard,
  billing: Billing,
  products: Products,
  purchases: Purchases,
  parties: Parties,
  'ai-upload': AIUpload,
  reports: Reports,
  expenses: Expenses,
  'digital-store': DigitalStore,
  settings: SettingsPage,
};

export default function Home() {
  const [activePage, setActivePage] = useState('dashboard');
  const [lowStockCount, setLowStockCount] = useState(0);
  const [profile, setProfile] = useState(null);
  const [showWizard, setShowWizard] = useState(false);

  // Persistence Layer: Lifted Billing State
  const [cart, setCart] = useState([]);
  const [customerData, setCustomerData] = useState({ name: '', phone: '', address: '' });
  const [paymentData, setPaymentData] = useState({ mode: 'Cash', paid: '' });

  useEffect(() => {
    loadProfile();
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

  const loadProfile = async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const data = await window.electronAPI.business.getProfile();
        setProfile(data);
        // Show wizard if business name is default "My Business"
        if (!data || data.business_name === 'My Business') {
          setShowWizard(true);
        }
      } catch (e) { console.error(e); }
    }
  };

  const handleSetupComplete = () => {
    setShowWizard(false);
    loadProfile();
  };

  if (showWizard) {
    return <SetupWizard onComplete={handleSetupComplete} />;
  }

  const ActiveComponent = pages[activePage] || Dashboard;

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">{profile?.business_short || 'IB'}</div>
          <div className="sidebar-brand-text">
            <h1>{profile?.business_name || 'InBill'}</h1>
            <span>{profile?.tagline || 'Professional ERP'}</span>
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
                    <Icon className="nav-icon" size={18} />
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

        <div style={{ padding: '16px', borderTop: '1px solid var(--border)', background: 'var(--bg-primary)' }}>
          <div className="flex items-center gap-md">
            <div style={{ 
              width: 36, height: 36, borderRadius: '50%', 
              background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 13
            }}>
              {profile?.business_name?.[0] || 'A'}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Administrator</div>
              <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-muted)' }}>Premium Plan</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <ActiveComponent 
          onNavigate={setActivePage} 
          profile={profile} 
          onProfileUpdate={loadProfile}
          // Shared Persistence
          cart={cart} setCart={setCart}
          customerData={customerData} setCustomerData={setCustomerData}
          paymentData={paymentData} setPaymentData={setPaymentData}
        />
      </main>
    </div>
  );
}
