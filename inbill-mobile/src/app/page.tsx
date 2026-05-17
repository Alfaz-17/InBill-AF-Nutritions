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
const PlusIcon = (p: React.SVGProps<SVGSVGElement>) => <Icon d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" {...p} />;

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
type Product = { id: number; product_name: string; brand: string; category: string; selling_price: number; mrp: number; cost_price: number; quantity: number; unit: string; barcode: string; min_stock_alert: number; gst_rate: number };
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
  const [tab, setTab] = useState<'home' | 'inventory' | 'sale' | 'parties'>('home');

  // New Sale States
  const [saleCustomerType, setSaleCustomerType] = useState<'counter' | 'linked'>('counter');
  const [salePartyId, setSalePartyId] = useState<number | null>(null);
  const [saleCustomerName, setSaleCustomerName] = useState('');
  const [saleCustomerPhone, setSaleCustomerPhone] = useState('');
  const [saleCart, setSaleCart] = useState<{ product_id: number; product_name: string; price: number; mrp: number; gst_rate: number; quantity: number; unit: string }[]>([]);
  const [salePaymentMode, setSalePaymentMode] = useState<'Cash' | 'UPI' | 'Credit'>('Cash');
  const [salePaidAmount, setSalePaidAmount] = useState('');
  const [saleCreditDays, setSaleCreditDays] = useState('30');
  const [saleSubmitting, setSaleSubmitting] = useState(false);
  const [saleError, setSaleError] = useState('');
  const [saleSuccessData, setSaleSuccessData] = useState<{ invoice_number: string; total_amount: number } | null>(null);
  const [saleProductSearch, setSaleProductSearch] = useState('');

  const getCartTotals = () => {
    let subtotal = 0;
    let totalGst = 0;
    saleCart.forEach(item => {
      const lineTotal = item.price * item.quantity;
      const gst = (lineTotal * item.gst_rate) / 100;
      subtotal += lineTotal;
      totalGst += gst;
    });
    const total = Math.round(subtotal + totalGst);
    return { subtotal, totalGst, total };
  };

  const addToCart = (product: Product) => {
    const existing = saleCart.find(i => i.product_id === product.id);
    if (existing) {
      if (existing.quantity >= product.quantity) {
        setSaleError(`Cannot add more. Insufficient stock for ${product.product_name}.`);
        return;
      }
      setSaleCart(saleCart.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      if (product.quantity <= 0) {
        setSaleError(`Insufficient stock for ${product.product_name}.`);
        return;
      }
      setSaleCart([...saleCart, {
        product_id: product.id,
        product_name: product.product_name,
        price: product.selling_price,
        mrp: product.mrp,
        gst_rate: product.gst_rate,
        quantity: 1,
        unit: product.unit
      }]);
    }
    setSaleError('');
    playBeep();
  };

  const updateCartQty = (productId: number, delta: number, maxStock: number) => {
    const existing = saleCart.find(i => i.product_id === productId);
    if (!existing) return;
    const newQty = existing.quantity + delta;
    if (newQty <= 0) {
      setSaleCart(saleCart.filter(i => i.product_id !== productId));
    } else {
      if (newQty > maxStock) {
        setSaleError(`Cannot exceed available stock (${maxStock})`);
        return;
      }
      setSaleCart(saleCart.map(i => i.product_id === productId ? { ...i, quantity: newQty } : i));
      setSaleError('');
    }
  };

  const submitSale = async () => {
    setSaleError('');
    if (saleCart.length === 0) {
      setSaleError('Add at least one product to make a sale.');
      return;
    }

    let customerName = saleCustomerName.trim();
    let customerPhone = saleCustomerPhone.trim();

    if (saleCustomerType === 'linked') {
      const selected = parties.find(p => p.id === salePartyId);
      if (!selected) {
        setSaleError('Please select a customer.');
        return;
      }
      customerName = selected.name;
      customerPhone = selected.phone || '';
    } else {
      if (!customerName) {
        customerName = 'Counter Sale';
      }
    }

    const { total } = getCartTotals();
    const paid = salePaidAmount === '' ? total : Number(salePaidAmount);

    setSaleSubmitting(true);
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          party_id: saleCustomerType === 'linked' ? salePartyId : null,
          customer_name: customerName,
          customer_phone: customerPhone,
          payment_mode: salePaymentMode,
          paid_amount: paid,
          credit_days: salePaymentMode === 'Credit' ? Number(saleCreditDays || 0) : 0,
          items: saleCart
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setSaleError(data.error || 'Failed to create sale.');
      } else {
        playBeep();
        setSaleSuccessData({
          invoice_number: data.invoice_number,
          total_amount: data.total_amount
        });
        setSaleCart([]);
        setSaleCustomerName('');
        setSaleCustomerPhone('');
        setSalePaidAmount('');
      }
    } catch {
      setSaleError('Network error. Failed to save sale.');
    }
    setSaleSubmitting(false);
  };

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

  // Check if already authenticated or auto-connecting via QR link query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qCode = params.get('code');
    const qUrl = params.get('url');

    if (qCode && qUrl) {
      setChecking(true);
      handleScanConnect(qCode, qUrl).then(() => {
        try {
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (e) {}
      }).finally(() => {
        setChecking(false);
      });
      return;
    }

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
        const container = document.getElementById("qr-reader");
        if (!container) {
          throw new Error("Scanner container not ready in DOM.");
        }
        const qrScanner = new Html5Qrcode("qr-reader");
        setQrScannerInstance(qrScanner);
        
        await qrScanner.start(
          { facingMode: "environment" },
          {
            fps: 20,
          },
          async (decodedText) => {
            try {
              let parsedCode = '';
              let parsedUrl = '';

              if (decodedText.trim().startsWith('{')) {
                try {
                  const parsed = JSON.parse(decodedText.trim());
                  if (parsed.code && parsed.cloud_url) {
                    parsedCode = parsed.code;
                    parsedUrl = parsed.cloud_url;
                  }
                } catch (e) {}
              } else if (decodedText.includes('code=') && decodedText.includes('url=')) {
                try {
                  const uStr = decodedText.trim().startsWith('http') ? decodedText.trim() : 'https://dummy.com/?' + decodedText.trim();
                  const u = new URL(uStr);
                  const qCode = u.searchParams.get('code');
                  const qUrl = u.searchParams.get('url');
                  if (qCode && qUrl) {
                    parsedCode = qCode;
                    parsedUrl = qUrl;
                  }
                } catch (e) {}
              }

              if (parsedCode && parsedUrl) {
                playBeep();
                setCode(parsedCode);
                setNeonUrl(parsedUrl);
                
                try {
                  await qrScanner.stop();
                } catch (e) {}
                setQrScannerInstance(null);
                setScanning(false);

                handleScanConnect(parsedCode, parsedUrl);
              } else {
                setLoginError("Invalid InBill pairing QR code. Scan Settings → Mobile QR code.");
                stopQRScanner(qrScanner, false);
              }
            } catch (err) {
              setLoginError("Failed to parse scanned code. Check Settings → Mobile QR code.");
              stopQRScanner(qrScanner, false);
            }
          },
          () => {} // scan error (silent)
        );
      } catch (e: any) {
        console.error('Camera startup error:', e);
        const errMsg = e?.message || String(e);
        if (errMsg.includes('navigator.mediaDevices') || errMsg.includes('Permission') || errMsg.includes('getUserMedia')) {
          setLoginError(`Camera requires secure HTTPS. (Local HTTP blocks camera access on phones). Deploy to Vercel or enter credentials manually!`);
        } else {
          setLoginError(`Scanner Error: ${errMsg}`);
        }
        setScanning(false);
      }
    }, 300);
  };

  const stopQRScanner = async (instance?: any, shouldReload = true) => {
    const scanner = instance || qrScannerInstance;
    setScanning(false);
    setQrScannerInstance(null);
    if (scanner) {
      try {
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
    if (shouldReload) {
      window.location.reload();
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
          placeholder="• • • • • •"
          value={code}
          onChange={e => {
            const val = e.target.value;
            // Check if user pasted the raw QR code JSON payload
            if (val.trim().startsWith('{')) {
              try {
                const parsed = JSON.parse(val.trim());
                if (parsed.code && parsed.cloud_url) {
                  playBeep();
                  setCode(parsed.code);
                  setNeonUrl(parsed.cloud_url);
                  handleScanConnect(parsed.code, parsed.cloud_url);
                  return;
                }
              } catch (err) {
                console.error("Manual paste parse error:", err);
              }
            }
            // Check if user pasted the pairings link URL
            if (val.trim().includes('code=') && val.trim().includes('url=')) {
              try {
                const uStr = val.trim().startsWith('http') ? val.trim() : 'https://dummy.com/?' + val.trim();
                const u = new URL(uStr);
                const qCode = u.searchParams.get('code');
                const qUrl = u.searchParams.get('url');
                if (qCode && qUrl) {
                  playBeep();
                  setCode(qCode);
                  setNeonUrl(qUrl);
                  handleScanConnect(qCode, qUrl);
                  return;
                }
              } catch (err) {
                console.error("Manual paste URL parse error:", err);
              }
            }
            setCode(val.replace(/\D/g, '').slice(0, 6));
          }}
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

        {tab === 'sale' && (
          <div className="new-sale-workflow" style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '24px' }}>
            <h2 className="section-title" style={{ margin: 0 }}>New Invoice</h2>

            {saleError && (
              <div className="error-banner" style={{ background: 'var(--rose-50)', color: 'var(--rose-600)', padding: '12px', borderRadius: '8px', border: '1px solid var(--rose-100)', fontSize: '0.875rem', fontWeight: 600 }}>
                {saleError}
              </div>
            )}

            {/* Customer Details Card */}
            <div className="section-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="segmented-control" style={{ display: 'flex', gap: '8px', background: 'var(--slate-100)', padding: '4px', borderRadius: '8px' }}>
                <button 
                  className={`btn-seg ${saleCustomerType === 'counter' ? 'active' : ''}`}
                  style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', background: saleCustomerType === 'counter' ? 'white' : 'transparent', color: 'var(--slate-800)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', boxShadow: saleCustomerType === 'counter' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}
                  onClick={() => setSaleCustomerType('counter')}
                >
                  Counter Sale
                </button>
                <button 
                  className={`btn-seg ${saleCustomerType === 'linked' ? 'active' : ''}`}
                  style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', background: saleCustomerType === 'linked' ? 'white' : 'transparent', color: 'var(--slate-800)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', boxShadow: saleCustomerType === 'linked' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}
                  onClick={() => {
                    setSaleCustomerType('linked');
                    if (!parties.length) loadParties();
                  }}
                >
                  Linked Customer
                </button>
              </div>

              {saleCustomerType === 'counter' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input 
                    type="text" 
                    placeholder="Customer Name (Optional)" 
                    className="search-input" 
                    style={{ margin: 0 }}
                    value={saleCustomerName} 
                    onChange={e => setSaleCustomerName(e.target.value)} 
                  />
                  <input 
                    type="tel" 
                    placeholder="Customer Phone (Optional)" 
                    className="search-input" 
                    style={{ margin: 0 }}
                    value={saleCustomerPhone} 
                    onChange={e => setSaleCustomerPhone(e.target.value)} 
                  />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)' }}>Select Customer</label>
                  <select 
                    className="search-input" 
                    style={{ margin: 0, width: '100%', background: 'white' }}
                    value={salePartyId || ''} 
                    onChange={e => setSalePartyId(Number(e.target.value) || null)}
                  >
                    <option value="">-- Choose Customer --</option>
                    {parties.filter(p => p.type === 'Customer').map(p => (
                      <option key={p.id} value={p.id}>{p.name} {p.phone ? `(${p.phone})` : ''}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Product Searching & Addition */}
            <div className="section-title" style={{ margin: '8px 0 0 0' }}>Add Products</div>
            <div className="search-box" style={{ margin: 0 }}>
              <input 
                type="text" 
                placeholder="Search product name or brand to add..." 
                className="search-input" 
                style={{ margin: 0 }}
                value={saleProductSearch} 
                onChange={e => setSaleProductSearch(e.target.value)} 
              />
            </div>

            {saleProductSearch.trim() !== '' && (
              <div className="section-card" style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', border: '1px solid var(--slate-200)', marginTop: '-8px' }}>
                {products
                  .filter(p => p.product_name.toLowerCase().includes(saleProductSearch.toLowerCase()) || (p.brand && p.brand.toLowerCase().includes(saleProductSearch.toLowerCase())))
                  .slice(0, 8)
                  .map(p => {
                    const inCart = saleCart.find(item => item.product_id === p.id);
                    const qtyInCart = inCart ? inCart.quantity : 0;
                    const avail = p.quantity - qtyInCart;
                    return (
                      <div 
                        key={p.id} 
                        className="list-item" 
                        style={{ cursor: 'pointer', padding: '12px', borderBottom: '1px solid var(--slate-50)' }}
                        onClick={() => {
                          addToCart(p);
                          setSaleProductSearch('');
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="name" style={{ fontSize: '0.92rem' }}>{p.product_name}</div>
                          <div className="detail" style={{ fontSize: '0.78rem' }}>{p.brand && `${p.brand} • `}{fmt(p.selling_price, C)}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span className={`stock-pill ${avail <= 0 ? 'low' : 'ok'}`} style={{ fontSize: '0.72rem' }}>
                            {avail > 0 ? `${avail} ${p.unit} left` : 'Out of stock'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                {products.filter(p => p.product_name.toLowerCase().includes(saleProductSearch.toLowerCase()) || (p.brand && p.brand.toLowerCase().includes(saleProductSearch.toLowerCase()))).length === 0 && (
                  <div style={{ padding: '16px', textShadow: 'none', textAlign: 'center', fontSize: '0.85rem', color: 'var(--slate-400)' }}>
                    No products found matching search
                  </div>
                )}
              </div>
            )}

            {/* Cart Listing */}
            <div className="section-title" style={{ margin: '8px 0 0 0' }}>Items in Invoice</div>
            {saleCart.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px', background: 'var(--slate-50)', borderRadius: '12px', border: '1px dashed var(--slate-200)' }}>
                <p style={{ margin: 0 }}>No products added yet. Use the search bar above to build your invoice.</p>
              </div>
            ) : (
              <div className="section-card" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {saleCart.map(item => {
                  const originalProduct = products.find(p => p.id === item.product_id);
                  const maxStock = originalProduct ? originalProduct.quantity : 9999;
                  const itemGstAmount = (item.price * item.quantity * item.gst_rate) / 100;
                  const lineTotal = (item.price * item.quantity) + itemGstAmount;

                  return (
                    <div key={item.product_id} className="list-item" style={{ padding: '12px', alignItems: 'center', borderBottom: '1px solid var(--slate-50)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="name" style={{ fontSize: '0.92rem' }}>{item.product_name}</div>
                        <div className="detail" style={{ fontSize: '0.78rem' }}>
                          {fmt(item.price, C)} + {item.gst_rate}% GST
                        </div>
                        <div className="detail" style={{ fontWeight: 700, color: 'var(--slate-800)', marginTop: '4px', fontSize: '0.85rem' }}>
                          Total: {fmt(lineTotal, C)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '4px 10px', fontSize: '1rem', fontWeight: 'bold', borderRadius: '6px', border: '1px solid var(--slate-200)', background: 'white' }}
                          onClick={() => updateCartQty(item.product_id, -1, maxStock)}
                        >
                          -
                        </button>
                        <span style={{ fontWeight: 700, minWidth: '20px', textAlign: 'center', fontSize: '0.9rem' }}>{item.quantity}</span>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '4px 10px', fontSize: '1rem', fontWeight: 'bold', borderRadius: '6px', border: '1px solid var(--slate-200)', background: 'white' }}
                          onClick={() => updateCartQty(item.product_id, 1, maxStock)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Subtotals & Grand Totals */}
                <div style={{ borderTop: '1px solid var(--slate-100)', padding: '12px 16px 4px 16px', display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--slate-600)' }}>
                  <span>Taxable Subtotal</span>
                  <span>{fmt(getCartTotals().subtotal, C)}</span>
                </div>
                <div style={{ padding: '4px 16px', display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--slate-600)' }}>
                  <span>GST Amount</span>
                  <span>{fmt(getCartTotals().totalGst, C)}</span>
                </div>
                <div style={{ padding: '4px 16px 12px 16px', display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                  <span>Invoice Total</span>
                  <span>{fmt(getCartTotals().total, C)}</span>
                </div>
              </div>
            )}

            {/* Payment & Action Card */}
            {saleCart.length > 0 && (
              <div className="section-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--slate-600)' }}>Payment mode</div>
                <div className="segmented-control" style={{ display: 'flex', gap: '8px', background: 'var(--slate-100)', padding: '4px', borderRadius: '8px' }}>
                  {['Cash', 'UPI', 'Credit'].map(mode => (
                    <button 
                      key={mode}
                      className={`btn-seg ${salePaymentMode === mode ? 'active' : ''}`}
                      style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', background: salePaymentMode === mode ? 'white' : 'transparent', color: 'var(--slate-800)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', boxShadow: salePaymentMode === mode ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}
                      onClick={() => {
                        setSalePaymentMode(mode as any);
                        if (mode !== 'Credit') {
                          setSalePaidAmount('');
                        } else {
                          setSalePaidAmount('0');
                        }
                      }}
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)' }}>
                    Amount Paid ({C})
                  </label>
                  <input 
                    type="number" 
                    placeholder={`Full Amount: ${fmt(getCartTotals().total, C)}`}
                    className="search-input" 
                    style={{ margin: 0 }}
                    value={salePaidAmount} 
                    onChange={e => setSalePaidAmount(e.target.value)} 
                  />
                </div>

                {salePaymentMode === 'Credit' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)' }}>
                      Credit Period (Days)
                    </label>
                    <input 
                      type="number" 
                      placeholder="Credit Days (e.g. 30)" 
                      className="search-input" 
                      style={{ margin: 0 }}
                      value={saleCreditDays} 
                      onChange={e => setSaleCreditDays(e.target.value)} 
                    />
                  </div>
                )}

                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%', padding: '14px', borderRadius: '10px', fontSize: '1rem', fontWeight: 800, marginTop: '8px', background: 'var(--emerald-600)', color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)' }}
                  onClick={submitSale}
                  disabled={saleSubmitting}
                >
                  {saleSubmitting ? 'Generating Invoice...' : `Save & Finalize Invoice: ${fmt(getCartTotals().total, C)}`}
                </button>
              </div>
            )}
          </div>
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

      {/* Invoice Success Overlay Modal */}
      {saleSuccessData && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
          <div className="section-card" style={{ width: '100%', maxWidth: '360px', padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px', background: 'white', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ background: '#ecfdf5', color: '#10b981', padding: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>Invoice Generated!</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--slate-50)', marginTop: '4px', margin: 0 }}>
                Invoice <strong style={{ color: 'var(--slate-800)' }}>{saleSuccessData.invoice_number}</strong> was successfully recorded in Neon.
              </p>
            </div>

            <div style={{ background: 'var(--slate-50)', padding: '12px', borderRadius: '8px', fontSize: '1.25rem', fontWeight: 800, color: 'var(--slate-800)' }}>
              {fmt(saleSuccessData.total_amount, C)}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
              <button 
                className="btn" 
                style={{ width: '100%', padding: '12px', background: '#25D366', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                onClick={() => {
                  const cleanPhone = saleCustomerPhone.replace(/\D/g, '');
                  const message = `Hi ${saleCustomerName || 'Customer'}, thank you for shopping with ${business?.name || 'AF NUTRITION'}! Here is your invoice ${saleSuccessData.invoice_number} for amount ${fmt(saleSuccessData.total_amount, C)}. We appreciate your business!`;
                  const waUrl = cleanPhone 
                    ? `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`
                    : `https://wa.me/?text=${encodeURIComponent(message)}`;
                  window.open(waUrl, '_blank');
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.907h.004c4.368 0 7.926-3.558 7.93-7.93a7.897 7.897 0 0 0-2.33-5.593l.004-.005zm-8.86 10.152a5.908 5.908 0 0 1-2.909-3.872 5.922 5.922 0 0 1 1.764-5.263 5.918 5.918 0 0 1 4.148-1.748c1.583.003 3.072.62 4.19 1.74a5.9 5.9 0 0 1 1.738 4.192 5.942 5.942 0 0 1-5.931 5.951h-.001zm3.802-1.688c-.198-.1-.4-.199-.498-.249-.099-.05-.173-.074-.247.074-.074.15-.297.371-.361.445-.064.075-.129.083-.327-.018-.198-.1-.837-.309-1.593-.984-.59-.525-.985-1.175-1.102-1.372-.118-.198-.013-.304.086-.403.09-.089.198-.233.298-.348.099-.116.134-.198.198-.33.064-.133.032-.249-.015-.349-.049-.1-.4-.967-.549-1.327-.145-.353-.291-.305-.4-.307l-.341-.005c-.118 0-.309.044-.47.218-.162.173-.618.604-.618 1.472 0 .867.63 1.705.718 1.82.089.117 1.242 1.897 3.01 2.66.42.181.749.289.1.5.176.43.342.118.497.118.156 0 .341.045.474.074.133-.03.328-.13.372-.258z"/>
                </svg>
                Share via WhatsApp
              </button>

              <button 
                className="btn" 
                style={{ width: '100%', padding: '12px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                onClick={() => {
                  window.open(`/api/print/${saleSuccessData.invoice_number}`, '_blank');
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M5 1a2 2 0 0 0-2 2v2H2a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1v3a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-3h1a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1V3a2 2 0 0 0-2-2H5zM4 3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2H4V3zm1 5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5zm0 1a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/>
                </svg>
                Download PDF / Print
              </button>

              <button 
                className="btn btn-secondary" 
                style={{ width: '100%', padding: '12px', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 700, border: '1px solid var(--slate-200)', background: 'white', cursor: 'pointer' }}
                onClick={() => {
                  setSaleSuccessData(null);
                  setTab('home');
                  loadDashboard();
                }}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        <button className={`nav-tab ${tab === 'home' ? 'active' : ''}`} onClick={() => { setTab('home'); loadDashboard(); }}>
          <HomeIcon />
          <span>Home</span>
        </button>
        <button className={`nav-tab ${tab === 'inventory' ? 'active' : ''}`} onClick={() => { setTab('inventory'); if (!products.length) loadProducts(); }}>
          <BoxIcon />
          <span>Stock</span>
        </button>
        <button className={`nav-tab ${tab === 'sale' ? 'active' : ''}`} onClick={() => { setTab('sale'); if (!products.length) loadProducts(); if (!parties.length) loadParties(); }}>
          <PlusIcon />
          <span>New Sale</span>
        </button>
        <button className={`nav-tab ${tab === 'parties' ? 'active' : ''}`} onClick={() => { setTab('parties'); if (!parties.length) loadParties(); }}>
          <UsersIcon />
          <span>Parties</span>
        </button>
      </nav>
    </>
  );
}
