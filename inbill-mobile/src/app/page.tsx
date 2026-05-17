'use client';

import { useState, useEffect, useCallback } from 'react';

// ═══════════════════════════════════════════════════════
// SVG Icons (inline, no dependency needed)
// ═══════════════════════════════════════════════════════
const Icon = ({ d, ...props }: { d: string } & React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d={d} />
  </svg>
);

const HomeIcon = (p: React.SVGProps<SVGSVGElement>) => <Icon d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" {...p} />;
const BoxIcon = (p: React.SVGProps<SVGSVGElement>) => <Icon d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" {...p} />;
const UsersIcon = (p: React.SVGProps<SVGSVGElement>) => <Icon d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8m13 10v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" {...p} />;

type Business = { name: string; short: string; currency: string };
type DashboardData = {
  profile: { business_name: string; business_short: string; currency_symbol: string };
  today: { salesCount: number; salesTotal: number; cash: number; digital: number; credit: number };
  receivable: number;
  payable: number;
  lowStock: { product_name: string; quantity: number; min_stock_alert: number }[];
  recentSales: { id: number; invoice_number: string; customer_name: string; total_amount: number; payment_mode: string; date: string }[];
  totalProducts: number;
};
type Product = { id: number; product_name: string; brand: string; category: string; selling_price: number; mrp: number; cost_price: number; quantity: number; unit: string; barcode: string; min_stock_alert: number };
type Party = { id: number; name: string; phone: string; type: string; current_balance: number; opening_balance: number };

const fmt = (n: number, c: string) => `${c}${Number(n || 0).toLocaleString('en-IN')}`;

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [checking, setChecking] = useState(true);
  const [business, setBusiness] = useState<Business | null>(null);

  // Login
  const [code, setCode] = useState('');
  const [neonUrl, setNeonUrl] = useState('');
  const [loginError, setLoginError] = useState('');
  const [connecting, setConnecting] = useState(false);

  // QR Scanner State
  const [scanning, setScanning] = useState(false);
  const [qrScannerInstance, setQrScannerInstance] = useState<any>(null);

  // Tabs
  const [tab, setTab] = useState<'home' | 'inventory' | 'parties'>('home');

  // Dashboard
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dashLoading, setDashLoading] = useState(false);

  // Inventory
  const [products, setProducts] = useState<Product[]>([]);
  const [prodSearch, setProdSearch] = useState('');
  const [prodLoading, setProdLoading] = useState(false);

  // Parties
  const [parties, setParties] = useState<Party[]>([]);
  const [partyLoading, setPartyLoading] = useState(false);

  // Audio synthesized success beep
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // High-pitched clean beep
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {
      console.error('Audio beep failed:', e);
    }
  };

  // Check if already authenticated
  useEffect(() => {
    fetch('/api/dashboard').then(r => {
      if (r.ok) {
        r.json().then(d => {
          setBusiness({ name: d.profile.business_name, short: d.profile.business_short, currency: d.profile.currency_symbol });
          setDashboard(d);
          setLoggedIn(true);
        });
      }
      setChecking(false);
    }).catch(() => setChecking(false));
  }, []);

  // Clean up scanner on unmount
  useEffect(() => {
    return () => {
      if (qrScannerInstance) {
        qrScannerInstance.stop().catch(() => {});
      }
    };
  }, [qrScannerInstance]);

  // ── Login ──
  const handleConnect = async () => {
    setLoginError('');
    if (!code.trim() || !neonUrl.trim()) {
      setLoginError('Enter both your access code and Neon Cloud URL');
      return;
    }
    setConnecting(true);
    try {
      const res = await fetch('/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), neonUrl: neonUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setLoginError(data.error || 'Connection failed'); setConnecting(false); return; }
      setBusiness(data.business);
      setLoggedIn(true);
      loadDashboard();
    } catch { setLoginError('Network error. Try again.'); }
    setConnecting(false);
  };

  const handleScanConnect = async (scannedCode: string, scannedUrl: string) => {
    setConnecting(true);
    try {
      const res = await fetch('/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: scannedCode.trim(), neonUrl: scannedUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setLoginError(data.error || 'Connection failed'); setConnecting(false); return; }
      setBusiness(data.business);
      setLoggedIn(true);
      loadDashboard();
    } catch { setLoginError('Network error. Try again.'); }
    setConnecting(false);
  };

  const startQRScanner = async () => {
    setLoginError('');
    setScanning(true);
    setTimeout(async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        const qrScanner = new Html5Qrcode("qr-reader");
        setQrScannerInstance(qrScanner);
        
        await qrScanner.start(
          { facingMode: "environment" },
          {
            fps: 15,
            qrbox: { width: 220, height: 220 },
          },
          async (decodedText) => {
            try {
              const parsed = JSON.parse(decodedText);
              if (parsed.app === 'InBill' && parsed.code && parsed.cloud_url) {
                playBeep();
                setCode(parsed.code);
                setNeonUrl(parsed.cloud_url);
                
                // Stop scanner
                try {
                  await qrScanner.stop();
                } catch (e) {}
                setQrScannerInstance(null);
                setScanning(false);

                // Auto connect
                handleScanConnect(parsed.code, parsed.cloud_url);
              } else {
                setLoginError("Invalid InBill pairing QR code. Scan Settings → Mobile QR code.");
                stopQRScanner(qrScanner);
              }
            } catch (err) {
              setLoginError("Failed to parse scanned code. Check Settings → Mobile QR code.");
              stopQRScanner(qrScanner);
            }
          },
          () => {} // scan error (silent)
        );
      } catch (e: any) {
        console.error(e);
        setLoginError("Could not start camera scanner. Enter details manually.");
        setScanning(false);
      }
    }, 200);
  };

  const stopQRScanner = async (instance?: any) => {
    const scanner = instance || qrScannerInstance;
    setScanning(false);
    setQrScannerInstance(null);
    if (scanner) {
      try {
        // Only stop if the camera stream is actively scanning
        if (scanner.isScanning) {
          await scanner.stop();
        }
      } catch (e) {
        console.error('Error stopping scanner:', e);
      }
      try {
        scanner.clear();
      } catch (e) {}
    }
  };

  // ── Logout ──
  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    setLoggedIn(false);
    setBusiness(null);
    setDashboard(null);
    setCode('');
    setNeonUrl('');
  };

  // ── Dashboard ──
  const loadDashboard = useCallback(async () => {
    setDashLoading(true);
    try {
      const r = await fetch('/api/dashboard');
      if (r.ok) {
        const d = await r.json();
        setDashboard(d);
        setBusiness({ name: d.profile.business_name, short: d.profile.business_short, currency: d.profile.currency_symbol });
      }
    } catch { /* silent */ }
    setDashLoading(false);
  }, []);

  // ── Inventory ──
  const loadProducts = useCallback(async (q = '') => {
    setProdLoading(true);
    try {
      const r = await fetch(`/api/inventory?q=${encodeURIComponent(q)}`);
      if (r.ok) { const d = await r.json(); setProducts(d.products || []); }
    } catch { /* silent */ }
    setProdLoading(false);
  }, []);

  // ── Parties ──
  const loadParties = useCallback(async () => {
    setPartyLoading(true);
    try {
      const r = await fetch('/api/parties');
      if (r.ok) { const d = await r.json(); setParties(d.parties || []); }
    } catch { /* silent */ }
    setPartyLoading(false);
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    if (tab === 'home' && !dashboard) loadDashboard();
    if (tab === 'inventory' && products.length === 0) loadProducts();
    if (tab === 'parties' && parties.length === 0) loadParties();
  }, [tab, loggedIn, dashboard, products.length, parties.length, loadDashboard, loadProducts, loadParties]);

  const C = business?.currency || '₹';

  // ═══════ CHECKING AUTH STATE ═══════
  if (checking) return (
    <div className="loading-center">
      <div className="spinner" />
      <p>Connecting...</p>
    </div>
  );

  // ═══════ LOGIN SCREEN ═══════
  if (!loggedIn) return (
    <div className="login-container">
      {scanning && (
        <div className="scanner-modal">
          <div style={{ color: 'white', fontSize: '18px', fontWeight: 900, marginBottom: '24px' }}>Scan Pairing QR Code</div>
          <div className="scanner-viewfinder">
            <div className="scanner-laser" />
            <div id="qr-reader" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <p style={{ color: 'var(--slate-400)', fontSize: '13px', fontWeight: 600, marginTop: '24px', textAlign: 'center', maxWidth: '280px' }}>
            Point your camera at your Desktop App Settings → Mobile tab QR code
          </p>
          <button 
            className="btn-connect" 
            style={{ marginTop: '32px', maxWidth: '200px', background: 'var(--slate-800)', border: '1px solid var(--slate-700)' }}
            onClick={() => stopQRScanner()}
          >
            Cancel Scan
          </button>
        </div>
      )}

      <div className="login-card">
        <div className="login-logo">IB</div>
        <h1 className="login-title">InBill Mobile</h1>
        <p className="login-subtitle">Connect instantly via QR or enter credentials manually</p>

        {loginError && <div className="login-error">{loginError}</div>}

        <button className="btn-scan-qr" onClick={startQRScanner}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M7 7h.01M17 7h.01M7 17h.01M17 17h.01"/><path d="M12 7v10M7 12h10"/></svg>
          Scan Pairing QR Code
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '8px 0 20px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--slate-100)' }} />
          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--slate-300)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>or enter manual</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--slate-100)' }} />
        </div>

        <label className="form-label">6-Digit Access Code</label>
        <input
          className="form-input code-input"
          type="text"
          maxLength={6}
          placeholder="• • • • • •"
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
        />

        <label className="form-label">Neon Cloud URL</label>
        <input
          className="form-input"
          type="url"
          placeholder="postgresql://user:pass@host/db"
          value={neonUrl}
          onChange={e => setNeonUrl(e.target.value)}
        />

        <button className="btn-connect" onClick={handleConnect} disabled={connecting}>
          {connecting ? 'Connecting...' : 'Connect to Business'}
        </button>
      </div>
    </div>
  );

  // ═══════ APP (LOGGED IN) ═══════
  return (
    <>
      {/* Header */}
      <header className="app-header">
        <div className="app-header-logo">{business?.short || 'IB'}</div>
        <h1>{business?.name || 'InBill'}</h1>
        <button className="app-header-logout" onClick={handleLogout}>Logout</button>
      </header>

      {/* Body */}
      <main className="app-body">
        {tab === 'home' && (
          dashLoading && !dashboard ? (
            <div className="loading-center"><div className="spinner" /><p>Loading Dashboard...</p></div>
          ) : dashboard ? (
            <>
              {/* Metrics */}
              <div className="metrics-grid">
                <div className="metric-card green">
                  <div className="label">To Receive</div>
                  <div className="value">{fmt(dashboard.receivable, C)}</div>
                  <div className="sub">Customer Balances</div>
                </div>
                <div className="metric-card red">
                  <div className="label">To Pay</div>
                  <div className="value">{fmt(dashboard.payable, C)}</div>
                  <div className="sub">Supplier Balances</div>
                </div>
                <div className="metric-card blue">
                  <div className="label">Bills Today</div>
                  <div className="value">{dashboard.today.salesCount}</div>
                  <div className="sub">Transactions</div>
                </div>
                <div className="metric-card green">
                  <div className="label">Today&apos;s Sales</div>
                  <div className="value">{fmt(dashboard.today.salesTotal, C)}</div>
                  <div className="sub">Revenue</div>
                </div>
              </div>

              {/* Cashflow */}
              <div className="cashflow-strip">
                <div className="cashflow-item cash">
                  <div className="cl">Cash</div>
                  <div className="cv">{fmt(dashboard.today.cash, C)}</div>
                </div>
                <div className="cashflow-item digital">
                  <div className="cl">UPI</div>
                  <div className="cv">{fmt(dashboard.today.digital, C)}</div>
                </div>
                <div className="cashflow-item credit">
                  <div className="cl">Credit</div>
                  <div className="cv">{fmt(dashboard.today.credit, C)}</div>
                </div>
              </div>

              {/* Recent Sales */}
              <div className="section-card">
                <div className="section-header">
                  <h3>Recent Sales</h3>
                  <p>Last 5 transactions</p>
                </div>
                {dashboard.recentSales?.length > 0 ? dashboard.recentSales.map(s => (
                  <div key={s.id} className="list-item">
                    <div style={{ minWidth: 0 }}>
                      <div className="name">#{s.invoice_number}</div>
                      <div className="detail">{s.customer_name || 'Counter Sale'} • {new Date(s.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</div>
                    </div>
                    <div>
                      <div className="amount" style={{ color: 'var(--slate-900)' }}>{fmt(s.total_amount, C)}</div>
                      <div className={`badge ${s.payment_mode === 'Cash' ? 'badge-green' : s.payment_mode === 'Credit' ? 'badge-amber' : 'badge-blue'}`}>{s.payment_mode}</div>
                    </div>
                  </div>
                )) : (
                  <div className="empty-state"><p>No recent sales</p></div>
                )}
              </div>

              {/* Low Stock Alerts */}
              {dashboard.lowStock?.length > 0 && (
                <div className="section-card">
                  <div className="section-header">
                    <h3>⚠️ Low Stock</h3>
                    <p>{dashboard.lowStock.length} items need restocking</p>
                  </div>
                  {dashboard.lowStock.map((item, i) => (
                    <div key={i} className="list-item">
                      <div className="name">{item.product_name}</div>
                      <span className="stock-pill low">{item.quantity} left</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : null
        )}

        {tab === 'inventory' && (
          <>
            <div className="search-bar">
              <input
                placeholder="Search products, brands, barcodes..."
                value={prodSearch}
                onChange={e => { setProdSearch(e.target.value); loadProducts(e.target.value); }}
              />
            </div>
            {prodLoading ? (
              <div className="loading-center"><div className="spinner" /><p>Loading Inventory...</p></div>
            ) : products.length > 0 ? (
              <div className="section-card">
                {products.map(p => (
                  <div key={p.id} className="list-item">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="name">{p.product_name}</div>
                      <div className="detail">
                        {p.brand && `${p.brand} • `}{p.category && `${p.category} • `}{p.unit}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="amount">{fmt(p.selling_price, C)}</div>
                      <span className={`stock-pill ${p.quantity <= (p.min_stock_alert || 0) && p.min_stock_alert > 0 ? 'low' : 'ok'}`}>
                        {p.quantity} {p.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state"><p>No products found</p></div>
            )}
          </>
        )}

        {tab === 'parties' && (
          partyLoading ? (
            <div className="loading-center"><div className="spinner" /><p>Loading Parties...</p></div>
          ) : parties.length > 0 ? (
            <div className="section-card">
              {parties.map(p => (
                <div key={p.id} className="list-item">
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="name">{p.name}</div>
                    <div className="detail">
                      <span className={`badge ${p.type === 'Customer' ? 'badge-blue' : 'badge-amber'}`}>{p.type}</span>
                      {p.phone && ` • ${p.phone}`}
                    </div>
                  </div>
                  <div className="amount" style={{ color: p.current_balance > 0 ? 'var(--rose-600)' : 'var(--emerald-600)' }}>
                    {p.current_balance > 0 ? fmt(p.current_balance, C) : 'Clear'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state"><p>No parties found</p></div>
          )
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        <button className={`nav-tab ${tab === 'home' ? 'active' : ''}`} onClick={() => { setTab('home'); loadDashboard(); }}>
          <HomeIcon />
          <span>Home</span>
        </button>
        <button className={`nav-tab ${tab === 'inventory' ? 'active' : ''}`} onClick={() => { setTab('inventory'); if (!products.length) loadProducts(); }}>
          <BoxIcon />
          <span>Inventory</span>
        </button>
        <button className={`nav-tab ${tab === 'parties' ? 'active' : ''}`} onClick={() => { setTab('parties'); if (!parties.length) loadParties(); }}>
          <UsersIcon />
          <span>Parties</span>
        </button>
      </nav>
    </>
  );
}
