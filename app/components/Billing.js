'use client';
import { useState, useEffect, useRef } from 'react';
import {
  Search, Plus, Minus, Trash2, ShoppingCart, Package,
  IndianRupee, User, CreditCard, Printer, X, Check, FileText, Share2, Copy, ExternalLink
} from 'lucide-react';

export default function Billing() {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [saleResult, setSaleResult] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [parties, setParties] = useState([]);
  const [selectedParty, setSelectedParty] = useState(null);
  const [partySearch, setPartySearch] = useState('');
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    loadProducts();
    loadParties();
    if (searchRef.current) searchRef.current.focus();
  }, []);

  const loadParties = async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const data = await window.electronAPI.parties.getAll('Customer');
        setParties(data || []);
      } catch (e) { console.error(e); }
    }
  };

  const loadProducts = async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const data = await window.electronAPI.products.getAll();
        setProducts(data || []);
      } catch (e) { console.error(e); }
    }
  };

  const flash = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = products.filter((p) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      p.product_name.toLowerCase().includes(q) ||
      (p.brand && p.brand.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
  });

  const addToCart = (product) => {
    if (product.quantity <= 0) return;
    setCart((prev) => {
      const exists = prev.find((c) => c.product_id === product.id);
      if (exists) {
        if (exists.quantity >= product.quantity) return prev;
        return prev.map((c) =>
          c.product_id === product.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.product_name,
          price: product.selling_price,
          original_price: product.selling_price,
          mrp: product.mrp || product.selling_price || 0,
          gst_rate: product.gst_rate || 0,
          quantity: 1,
          maxQty: product.quantity,
        },
      ];
    });
  };

  const updateCartQty = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.product_id !== productId) return c;
          const newQty = c.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > c.maxQty) return c;
          return { ...c, quantity: newQty };
        })
        .filter(Boolean)
    );
  };

  const updateCartPrice = (productId, newPrice) => {
    setCart((prev) =>
      prev.map((c) =>
        c.product_id === productId ? { ...c, price: parseFloat(newPrice) || 0 } : c
      )
    );
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((c) => c.product_id !== productId));
  };

  const subtotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
  const totalGst = cart.reduce(
    (sum, c) => sum + (c.price * c.quantity * c.gst_rate) / 100,
    0
  );
  const totalDiscount = cart.reduce(
    (sum, c) => sum + (c.original_price > c.price ? (c.original_price - c.price) * c.quantity : 0),
    0
  );
  const grandTotal = subtotal + totalGst;

  const handleSave = async () => {
    if (cart.length === 0) return;
    if (typeof window === 'undefined' || !window.electronAPI) return;
    setSaving(true);
    try {
      const result = await window.electronAPI.sales.create({
        items: cart.map((c) => ({
          product_id: c.product_id,
          product_name: c.product_name,
          mrp: c.mrp,
          price: c.price,
          quantity: c.quantity,
          gst_rate: c.gst_rate,
        })),
        party_id: selectedParty?.id,
        customer_name: customerName,
        customer_phone: customerPhone,
        payment_mode: paymentMode,
        paid_amount: paidAmount ? parseFloat(paidAmount) : grandTotal,
      });

      setSaleResult({ 
        ...result, 
        customer_name: customerName, 
        customer_phone: customerPhone, 
        date: new Date().toLocaleDateString('en-IN'),
        cart: [...cart],
        subtotal,
        totalGst,
        grandTotal, 
        totalDiscount 
      });
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setPartySearch('');
      setSelectedParty(null);
      setPaidAmount('');
      setPaymentMode('Cash');
      setShowSuccessModal(true);
      setShareLink('');
      loadProducts();
    } catch (e) {
      console.error(e);
      flash('Failed to save sale', 'error');
    }
    setSaving(false);
  };

  const getInvoiceHTML = (data) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap');
          body { font-family: 'Outfit', sans-serif; color: #1e293b; padding: 40px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; }
          .store-name { font-size: 28px; font-weight: 700; color: #0f172a; margin: 0; }
          .store-addr { font-size: 13px; color: #64748b; margin: 4px 0; max-width: 300px; line-height: 1.5; }
          .inv-title { font-size: 22px; font-weight: 700; color: #2563eb; text-align: right; margin: 0; }
          .inv-meta { text-align: right; font-size: 14px; margin-top: 8px; color: #475569; }
          .meta-row { margin: 2px 0; }
          .meta-val { font-weight: 600; color: #1e293b; }
          .bill-to { margin-bottom: 30px; }
          .bill-to-label { font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px; }
          .bill-to-name { font-size: 18px; font-weight: 700; margin: 0; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { background: #f8fafc; text-align: left; padding: 12px; font-size: 13px; font-weight: 700; color: #64748b; border-bottom: 1px solid #e2e8f0; }
          td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
          .row-total { text-align: right; font-weight: 600; }
          .summary { display: flex; justify-content: flex-end; }
          .summary-box { width: 250px; }
          .summary-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
          .grand-total { margin-top: 16px; padding-top: 16px; border-top: 2px solid #0f172a; font-size: 20px; font-weight: 700; }
          .footer { margin-top: 60px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; paddingTop: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="store-name">AF NUTRITION</h1>
            <p class="store-addr">1st floor, Yogeshwar Complex F/103,<br/>Ghogha Circle, Bhavnagar, 364001, Gujarat</p>
          </div>
          <div>
            <h2 class="inv-title">TAX INVOICE</h2>
            <div class="inv-meta">
              <div class="meta-row">Invoice: <span class="meta-val">#${data.invoiceNumber}</span></div>
              <div class="meta-row">Date: <span class="meta-val">${data.date}</span></div>
            </div>
          </div>
        </div>

        <div class="bill-to">
          <div class="bill-to-label">Bill To</div>
          <h3 class="bill-to-name">${data.customer_name || 'Counter Sale'}</h3>
          ${data.customer_phone ? `<div style="font-size: 14px; color: #475569;">+91 ${data.customer_phone}</div>` : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th>Item Description</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Price</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${data.cart.map(item => `
              <tr>
                <td>${item.product_name}</td>
                <td style="text-align: center;">${item.quantity}</td>
                <td style="text-align: right;">₹${item.price}</td>
                <td class="row-total">₹${(item.price * item.quantity).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="summary">
          <div class="summary-box">
            <div class="summary-row"><span>Subtotal</span><span>₹${data.subtotal.toFixed(2)}</span></div>
            <div class="summary-row"><span>Tax (GST)</span><span>₹${data.totalGst.toFixed(2)}</span></div>
            ${data.totalDiscount > 0 ? `<div class="summary-row" style="color: #059669;"><span>Savings</span><span>-₹${data.totalDiscount.toFixed(2)}</span></div>` : ''}
            <div class="summary-row grand-total"><span>Total</span><span>₹${data.grandTotal.toFixed(2)}</span></div>
          </div>
        </div>

        <div class="footer">
          <p>Thank you for shopping at AF NUTRITION!</p>
          <p style="font-size: 10px;">Generated via Alfaz's Solutions</p>
        </div>
      </body>
      </html>
    `;
  };

  const handleDownloadPDF = async () => {
    if (!saleResult || pdfGenerating) return;
    setPdfGenerating(true);
    try {
      const html = getInvoiceHTML(saleResult);
      const res = await window.electronAPI.pdf.generate(html);
      if (res.success) {
        await window.electronAPI.pdf.saveAs(res.buffer, `Invoice_${saleResult.invoiceNumber}.pdf`);
        flash('PDF Saved Successfully!');
      } else { flash('Failed to generate PDF', 'error'); }
    } catch (e) { console.error(e); flash('Error generating PDF', 'error'); }
    setPdfGenerating(false);
  };

  const handleShareLink = async () => {
    if (!saleResult || shareLoading) return;
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      flash('Link copied to clipboard!');
      return;
    }
    setShareLoading(true);
    try {
      const html = getInvoiceHTML(saleResult);
      const gen = await window.electronAPI.pdf.generate(html);
      if (gen.success) {
        const share = await window.electronAPI.pdf.share(gen.buffer);
        if (share.success) {
          setShareLink(share.link);
          navigator.clipboard.writeText(share.link);
          flash('Sharing link generated and copied!');
        } else { flash(`Sharing Failed: ${share.error || 'Check Internet'}`, 'error'); }
      }
    } catch (e) { console.error(e); flash('Sharing Error', 'error'); }
    setShareLoading(false);
  };

  return (
    <div className="animate-in">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h2>Generate Invoice</h2>
          <p>Create sales records and manage customer billing</p>
        </div>
        <div className="flex gap-md">
          <div className="metric-card" style={{ padding: '8px 20px', minWidth: 180, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <div className="metric-icon teal" style={{ width: 32, height: 32 }}><IndianRupee size={16} /></div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Daily Sales</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>₹{subtotal.toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, height: 'calc(100vh - 160px)' }}>
        
        {/* Product Explorer */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20, overflow: 'hidden' }}>
          <div className="search-box" style={{ maxWidth: '100%' }}>
            <Search className="search-icon" />
            <input
              ref={searchRef}
              style={{ height: 48, fontSize: 16 }}
              placeholder="Search by product name, brand or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
            {filtered.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                {filtered.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="card"
                    style={{ 
                      padding: 16, 
                      cursor: 'pointer',
                      border: '1px solid var(--border)',
                      transition: 'all 0.2s ease',
                      opacity: p.quantity <= 0 ? 0.5 : 1,
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, height: 40, overflow: 'hidden' }}>{p.product_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>{p.brand || p.category || 'Supplement'}</div>
                    
                    <div className="flex justify-between items-end">
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>MRP: ₹{p.mrp || 0}</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>₹{p.selling_price}</div>
                      </div>
                      <div style={{ 
                        padding: '4px 8px', 
                        borderRadius: 6, 
                        fontSize: 10, 
                        fontWeight: 800,
                        background: p.quantity <= 0 ? 'var(--danger-glow)' : p.quantity <= 10 ? 'var(--warning-glow)' : 'var(--accent-glow)',
                        color: p.quantity <= 0 ? 'var(--danger)' : p.quantity <= 10 ? 'var(--warning)' : 'var(--accent)'
                      }}>
                        {p.quantity <= 0 ? 'OUT' : `${p.quantity} IN STOCK`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ height: '300px' }}>
                <div className="empty-state-icon"><Package size={32} /></div>
                <h3>No items matched</h3>
                <p>Try searching for brand name or verify stock</p>
              </div>
            )}
          </div>
        </div>

        {/* Checkout Sidebar */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', background: 'var(--bg-secondary)' }}>
          <div style={{ padding: 20, borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingCart size={18} /> Current Invoice
            </h3>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)' }}>
            {/* Integrated Customer Identity */}
            <div style={{ padding: '24px 20px', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ position: 'relative' }}>
                <User size={14} style={{ position: 'absolute', left: 14, top: 13, color: 'var(--accent)' }} />
                <input
                  className="form-input"
                  style={{ paddingLeft: 40, height: 40, background: 'var(--bg-secondary)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 700 }}
                  placeholder="Customer Name / Search..."
                  value={partySearch}
                  onChange={(e) => {
                    setPartySearch(e.target.value);
                    setCustomerName(e.target.value);
                    setShowPartyDropdown(true);
                  }}
                  onFocus={() => setShowPartyDropdown(true)}
                />
                {showPartyDropdown && parties.length > 0 && (
                  <div className="suggestions-dropdown" style={{ top: '100%', width: '100%', zIndex: 101 }}>
                    {parties.filter(p => !partySearch || p.name.toLowerCase().includes(partySearch.toLowerCase())).slice(0, 5).map(p => (
                      <div key={p.id} className="suggestion-item" onMouseDown={() => {
                        setSelectedParty(p);
                        setPartySearch(p.name);
                        setCustomerName(p.name);
                        setCustomerPhone(p.phone || '');
                      }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{p.phone || 'No phone'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <ExternalLink size={14} style={{ position: 'absolute', left: 14, top: 13, color: 'var(--text-muted)' }} />
                <input
                  className="form-input"
                  style={{ paddingLeft: 40, height: 40, background: 'var(--bg-secondary)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 13 }}
                  placeholder="WhatsApp link (Mobile)..."
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
            </div>

            {/* Structured Cart List */}
            <div style={{ paddingBottom: 20 }}>
              {cart.map((item) => (
                <div key={item.product_id} style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr auto auto', 
                  alignItems: 'center',
                  gap: 12,
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--border)',
                  background: 'var(--bg-secondary)'
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 6 }}>
                      {item.product_name}
                    </div>
                    <div className="flex items-center gap-md">
                      <div className="flex items-center gap-xs">
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>₹</span>
                        <input 
                          type="number" 
                          style={{ width: 60, background: 'none', border: 'none', fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)', padding: 0 }}
                          value={item.price}
                          onChange={(e) => updateCartPrice(item.product_id, e.target.value)}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-primary)', borderRadius: 20, padding: '2px 4px' }}>
                        <button onClick={() => updateCartQty(item.product_id, -1)} style={{ border: 'none', background: 'none', padding: '0 6px', cursor: 'pointer' }}><Minus size={10} /></button>
                        <span style={{ fontSize: 12, fontWeight: 900, minWidth: 16, textAlign: 'center' }}>{item.quantity}</span>
                        <button onClick={() => updateCartQty(item.product_id, 1)} style={{ border: 'none', background: 'none', padding: '0 6px', cursor: 'pointer' }}><Plus size={10} /></button>
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', minWidth: 70 }}>
                    <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--accent)' }}>₹{(item.price * item.quantity).toLocaleString()}</div>
                    {item.original_price > item.price && (
                      <div style={{ fontSize: 9, color: 'var(--success)', fontWeight: 800 }}>Save ₹{((item.original_price - item.price) * item.quantity).toLocaleString()}</div>
                    )}
                  </div>

                  <button 
                    className="btn btn-ghost btn-icon" 
                    style={{ 
                      color: '#ef4444', 
                      opacity: 1, 
                      width: 28, 
                      height: 28,
                      minWidth: 28,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onClick={() => removeFromCart(item.product_id)}
                  >
                    <X size={18} strokeWidth={3} />
                  </button>
                </div>
              ))}
              
              {cart.length === 0 && (
                <div style={{ textAlign: 'center', padding: '80px 20px', opacity: 0.2 }}>
                  <ShoppingCart size={42} style={{ marginBottom: 12 }} />
                  <div style={{ fontSize: 13, fontWeight: 800 }}>Cart is empty</div>
                </div>
              )}
            </div>
          </div>

          <div style={{ padding: 24, background: 'var(--bg-primary)', borderTop: '1px solid var(--border)' }}>
            <div style={{ marginBottom: 20 }}>
              <div className="flex justify-between items-center mb-xs">
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Items Subtotal</span>
                <span style={{ fontWeight: 700 }}>₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center mb-xs">
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Total Savings</span>
                <span style={{ fontWeight: 700, color: 'var(--success)' }}>-₹{totalDiscount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center mt-md" style={{ paddingTop: 16, borderTop: '2px solid var(--bg-secondary)' }}>
                <span style={{ fontSize: 16, fontWeight: 800 }}>Total Payable</span>
                <span style={{ fontSize: 24, fontWeight: 900, color: 'var(--accent)' }}>₹{grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>
            
            <div className="flex gap-sm">
              <select className="form-select" style={{ width: 100 }} value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                <option>Cash</option>
                <option>UPI</option>
                <option>Card</option>
              </select>
              <button 
                className="btn btn-primary btn-lg" 
                style={{ flex: 1, height: 50, fontSize: 16 }}
                onClick={handleSave} 
                disabled={cart.length === 0 || saving}
              >
                {saving ? 'Processing...' : 'Generate Bill'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Success Modal */}
      {showSuccessModal && saleResult && (
        <div className="modal-overlay">
          <div className="modal modal-md">
            <div className="modal-header">
              <h3 className="flex items-center gap-sm">
                <div className="metric-icon teal" style={{ width: 32, height: 32 }}><Check size={18} /></div>
                Sale Processed Successfully
              </h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowSuccessModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ background: 'var(--bg-primary)', padding: 32, textAlign: 'center' }}>
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 8 }}>Invoice Reference</div>
                <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 1 }}>#{saleResult.invoiceNumber}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)', marginTop: 8 }}>₹{saleResult.grandTotal.toLocaleString('en-IN')}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <button className="btn btn-secondary btn-lg" onClick={handleDownloadPDF} disabled={pdfGenerating}>
                  {pdfGenerating ? 'Generating...' : <><Printer size={18} /> Print Invoice</>}
                </button>
                <button className="btn btn-secondary btn-lg" style={{ background: '#25D366', color: 'white', border: 'none' }} 
                  onClick={() => {
                    const msg = `*AF NUTRITION*\nHello ${saleResult.customer_name || 'Customer'},\nYour invoice #${saleResult.invoiceNumber} for ₹${saleResult.grandTotal} is ready. Thank you!`;
                    window.open(`https://wa.me/91${customerPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                  }}>
                  <ExternalLink size={18} /> WhatsApp
                </button>
              </div>

              <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', textAlign: 'left' }}>
                <div className="flex justify-between items-center">
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>CLOUD SHARING LINK</div>
                    <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4 }}>{shareLink || 'Link not yet generated'}</div>
                  </div>
                  <button className="btn btn-ghost btn-icon" onClick={handleShareLink} disabled={shareLoading}>
                    {shareLoading ? '...' : <Copy size={16} />}
                  </button>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowSuccessModal(false)}>Close Window</button>
              <button className="btn btn-primary" onClick={() => setShowSuccessModal(false)}>New Sale</button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Toast */}
      {toast && (
        <div className={`toast ${toast.type === 'success' ? 'success' : 'danger'}`}>
          {toast.type === 'success' ? <Check size={18} /> : <X size={18} />}
          <span style={{ fontWeight: 600 }}>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
