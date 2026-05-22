'use client';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, ShoppingCart, Package, Truck,
  ScanLine, FileBarChart, Settings, Wallet, Users, RotateCcw
} from 'lucide-react';
import dynamic from 'next/dynamic';

const Dashboard = dynamic(() => import('./components/Dashboard'), { ssr: false });
const Billing = dynamic(() => import('./components/Billing'), { ssr: false });
const Products = dynamic(() => import('./components/Products'), { ssr: false });
const Purchases = dynamic(() => import('./components/Purchases'), { ssr: false });
const Parties = dynamic(() => import('./components/Parties'), { ssr: false });
const AIUpload = dynamic(() => import('./components/AIUpload'), { ssr: false });
const Reports = dynamic(() => import('./components/Reports'), { ssr: false });
const Expenses = dynamic(() => import('./components/Expenses'), { ssr: false });
const SettingsPage = dynamic(() => import('./components/Settings'), { ssr: false });

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
      { key: 'purchases', label: 'Stock-In',  icon: Truck },
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

const SetupWizard = dynamic(() => import('./components/SetupWizard'), { ssr: false });
const LockScreen = dynamic(() => import('./components/LockScreen'), { ssr: false });

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

const mobileNavItems = navSections.flatMap((section) => section.items);

export default function Home() {
  const [activePage, setActivePage] = useState('dashboard');
  const [lowStockCount, setLowStockCount] = useState(0);
  const [syncTrigger, setSyncTrigger] = useState(0);
  const [deepLinkPartyId, setDeepLinkPartyId] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [hasNotified, setHasNotified] = useState(false);
  const [profile, setProfile] = useState(null);
  const [showWizard, setShowWizard] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Persistence Layer: Lifted Billing State
  const [cart, setCart] = useState([]);
  const [customerData, setCustomerData] = useState({ name: '', phone: '', address: '' });
  const [paymentData, setPaymentData] = useState({ mode: 'Cash', paid: '' });

  useEffect(() => {
    loadProfile();
    checkAuth();
    const loadAlerts = async () => {
      if (typeof window !== 'undefined' && window.electronAPI) {
        try {
          const stats = await window.electronAPI.stats.dashboard();
          setLowStockCount(stats.lowStockCount || 0);
        } catch (e) { /* silent */ }
      }
    };
    loadAlerts();

    // Register auto-pull callback to refresh dashboard and force state reload
    if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.onAutoPulled) {
      window.electronAPI.onAutoPulled(() => {
        console.log("📥 Desktop: Received auto-pull signal from main process. Refreshing UI.");
        setSyncTrigger(prev => prev + 1);
        loadAlerts();
      });
    }

    const interval = setInterval(loadAlerts, 60000); // Check stock every minute
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

  const checkAuth = async () => {
    if (typeof window !== 'undefined' && window.electronAPI?.auth) {
      try {
        const { hasPassword } = await window.electronAPI.auth.check();
        if (hasPassword) {
          setIsLocked(true);
        }
      } catch (e) {
        console.error('Auth check failed:', e);
      } finally {
        setIsAuthChecking(false);
      }
    } else {
      setIsAuthChecking(false);
    }
  };

  const handleSetupComplete = () => {
    setShowWizard(false);
    loadProfile();
  };

  if (showWizard) {
    return <SetupWizard onComplete={handleSetupComplete} />;
  }

  if (isAuthChecking) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (isLocked) {
    return <LockScreen onUnlock={() => setIsLocked(false)} />;
  }

  const ActiveComponent = pages[activePage] || Dashboard;

  const handleNavigate = (page, partyId = null) => {
    setActivePage(page);
    if (partyId) setDeepLinkPartyId(partyId);
  };

  return (
    <div className="app-shell">
      <header className="mobile-app-header">
        <div className="sidebar-brand-icon">{profile?.business_short || 'IB'}</div>
        <div className="mobile-app-title">
          <h1>{profile?.business_name || 'InBill'}</h1>
          <span>{navSections.flatMap((section) => section.items).find((item) => item.key === activePage)?.label || 'Dashboard'}</span>
        </div>
      </header>

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
                    {item.key === 'settings' && updateAvailable && (
                      <span className="nav-badge animate-pulse" style={{ background: '#059669', color: 'white', fontSize: '9px', padding: '2px 6px' }}>NEW</span>
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
          key={activePage + '_' + syncTrigger}
          onNavigate={handleNavigate} 
          profile={profile} 
          onProfileUpdate={loadProfile}
          // Deep link for Parties
          initialPartyId={activePage === 'parties' ? deepLinkPartyId : null}
          onDeepLinkConsumed={() => setDeepLinkPartyId(null)}
          // Shared Persistence
          cart={cart} setCart={setCart}
          customerData={customerData} setCustomerData={setCustomerData}
          paymentData={paymentData} setPaymentData={setPaymentData}
        />
      </main>

      <nav className="mobile-bottom-nav" aria-label="Primary navigation">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              className={`mobile-nav-item ${activePage === item.key ? 'active' : ''}`}
              onClick={() => setActivePage(item.key)}
              aria-label={item.label}
            >
              <span className="relative">
                <Icon size={20} strokeWidth={2.4} />
                {item.key === 'products' && lowStockCount > 0 && (
                  <span className="mobile-nav-badge">{lowStockCount}</span>
                )}
                {item.key === 'settings' && updateAvailable && (
                  <span className="mobile-nav-badge" style={{ background: '#059669' }}>!</span>
                )}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
