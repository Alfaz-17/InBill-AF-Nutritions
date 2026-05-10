'use client';
import { useState, useEffect, Fragment } from 'react';
import {
  Plus, Trash2, X, Check, TruckIcon, Search, ScanLine
} from 'lucide-react';
import AIUpload from './AIUpload';

export default function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [supplierName, setSupplierName] = useState('');
  const [items, setItems] = useState([{ product_name: '', quantity: '', price: '', last_price: null, mrp: '', selling_price: '', batch_number: '', expiry_date: '' }]);
  const [otherCharges, setOtherCharges] = useState('');
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [details, setDetails] = useState({});
  const [viewMode, setViewMode] = useState('list'); // list | ai
  const [allProducts, setAllProducts] = useState([]);
  const [activeSuggestion, setActiveSuggestion] = useState({ row: null, query: '' });
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => { 
    loadPurchases();
    loadAllProducts();
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const data = await window.electronAPI.parties.getAll('Supplier');
        setSuppliers(data || []);
      } catch (e) { console.error(e); }
    }
  };

  const loadAllProducts = async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const data = await window.electronAPI.products.getAll();
        setAllProducts(data || []);
      } catch (e) { console.error(e); }
    }
  };

  const loadPurchases = async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const data = await window.electronAPI.purchases.getAll();
        setPurchases(data || []);
      } catch (e) { console.error(e); }
    }
    setLoading(false);
  };

  const addRow = () => {
    setItems([...items, { product_name: '', quantity: '', price: '', last_price: null, mrp: '', selling_price: '', batch_number: '', expiry_date: '' }]);
  };

  const removeRow = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateRow = (index, field, value) => {
    setItems(items.map((item, i) => i === index ? { ...item, [field]: value } : item));
    if (field === 'product_name') {
      setActiveSuggestion({ row: index, query: value });
    }
  };

  const selectSuggestion = (index, product) => {
    setItems(items.map((item, i) => i === index ? { 
      ...item, 
      product_name: product.product_name,
      price: product.cost_price || item.price,
      last_price: product.cost_price || null,
      mrp: product.mrp || '',
      selling_price: product.selling_price || '',
      batch_number: product.batch_number || '',
      expiry_date: product.expiry_date || ''
    } : item));
    setActiveSuggestion({ row: null, query: '' });
  };

  const handleQuickAdd = (product) => {
    const emptyRowIndex = items.findIndex(i => !i.product_name.trim());
    const newItem = {
      product_name: product.product_name,
      price: product.cost_price || '',
      last_price: product.cost_price || null,
      mrp: product.mrp || '',
      selling_price: product.selling_price || '',
      batch_number: product.batch_number || '',
      expiry_date: product.expiry_date || '',
      quantity: ''
    };

    if (emptyRowIndex !== -1) {
      const newItems = [...items];
      newItems[emptyRowIndex] = newItem;
      setItems(newItems);
    } else {
      setItems([...items, newItem]);
    }
    flash(`${product.product_name} added to list`);
  };

  const checkLastPrice = async (index, name) => {
    if (!name || typeof window === 'undefined' || !window.electronAPI) return;
    try {
      const lastPrice = await window.electronAPI.products.getLastPrice(name);
      if (lastPrice) {
        setItems(items.map((item, i) => i === index ? { ...item, last_price: lastPrice } : item));
      }
    } catch (e) { console.error(e); }
  };

  const handleSave = async () => {
    const validItems = items.filter(i => i.product_name.trim());
    if (validItems.length === 0) {
      flash('Please add at least one product with a name', 'error');
      return;
    }
    if (typeof window === 'undefined' || !window.electronAPI) {
      flash('Error: System not ready', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        party_id: selectedSupplier?.id,
        supplier_name: supplierName,
        other_charges: parseFloat(otherCharges) || 0,
        items: validItems.map(i => ({
          product_name: i.product_name,
          quantity: parseInt(i.quantity) || 0,
          price: parseFloat(i.price) || 0,
          mrp: parseFloat(i.mrp) || 0,
          selling_price: parseFloat(i.selling_price) || 0,
          batch_number: i.batch_number,
          expiry_date: i.expiry_date,
        })),
      };
      const result = await window.electronAPI.purchases.create(payload);
      
      let msg = 'Purchase recorded!';
      if (result.createdCount > 0) msg += ` ${result.createdCount} new products added.`;
      if (result.updatedCount > 0) msg += ` Stock updated for ${result.updatedCount} items.`;
      
      flash(msg);
      setShowModal(false);
      setSupplierName('');
      setSupplierSearch('');
      setSelectedSupplier(null);
      setOtherCharges('');
      setItems([{ product_name: '', quantity: '', price: '', last_price: null, mrp: '', selling_price: '', batch_number: '', expiry_date: '' }]);
      loadPurchases();
    } catch (e) {
      flash('Error: ' + e.message, 'error');
    }
    setSaving(false);
  };

  const toggleExpand = async (id) => {
    if (expandedId === id) { setExpandedId(null); return; }
    if (!details[id]) {
      if (typeof window !== 'undefined' && window.electronAPI) {
        try {
          const data = await window.electronAPI.purchases.getById(id);
          setDetails(prev => ({ ...prev, [id]: data }));
        } catch(e) { console.error(e); }
      }
    }
    setExpandedId(id);
  };

  const flash = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  if (loading) {
    return <div className="empty-state"><div className="spinner" style={{ width: 32, height: 32 }}></div></div>;
  }

  if (viewMode === 'ai') {
    return (
      <AIUpload 
        onBack={() => {
          setViewMode('list');
          loadPurchases();
        }} 
      />
    );
  }

  return (
    <div className="animate-in">
      <div className="page-header">
        <h2>Purchases</h2>
        <p>Record stock-in and supplier purchases</p>
      </div>

      {/* Metrics Bar */}
      <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-icon teal"><TruckIcon size={24} /></div>
          <div className="metric-info">
            <h3>Total Orders</h3>
            <div className="metric-value">{purchases.length}</div>
            <div className="metric-sub">Lifetime records</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon green"><Plus size={24} /></div>
          <div className="metric-info">
            <h3>Last Month</h3>
            <div className="metric-value">
              {purchases.filter(p => new Date(p.date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}
            </div>
            <div className="metric-sub">New purchases</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon blue"><Check size={24} /></div>
          <div className="metric-info">
            <h3>Total Value</h3>
            <div className="metric-value" style={{ fontSize: 24 }}>
              ₹{purchases.reduce((acc, p) => acc + p.total_amount, 0).toLocaleString('en-IN')}
            </div>
            <div className="metric-sub">Inventory worth</div>
          </div>
        </div>
      </div>

      <div className="action-bar">
        <div className="action-bar-left">
          <div className="search-box">
            <Search className="search-icon" />
            <input placeholder="Search purchases..." />
          </div>
        </div>
        <div className="action-bar-right">
          <button className="btn btn-secondary" onClick={() => setViewMode('ai')}>
            <ScanLine size={16} /> Scan Bill (AI)
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> New Purchase
          </button>
        </div>
      </div>

      {/* Purchase List Card */}
      <div className="card" style={{ padding: 0 }}>
        {purchases.length > 0 ? (
          <div className="table-wrap" style={{ border: 'none', boxShadow: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Supplier</th>
                  <th>Total Amount</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <Fragment key={p.id}>
                    <tr onClick={() => toggleExpand(p.id)} style={{ cursor: 'pointer' }}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{new Date(p.date).toLocaleDateString('en-IN')}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID: #{p.id}</div>
                      </td>
                      <td style={{ fontWeight: 500 }}>{p.supplier_name || '—'}</td>
                      <td style={{ fontWeight: 700, color: 'var(--accent)' }}>₹{p.total_amount.toLocaleString('en-IN')}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-ghost btn-sm">
                          {expandedId === p.id ? 'Hide Details' : 'View Details'}
                        </button>
                      </td>
                    </tr>
                    {expandedId === p.id && details[p.id] && (
                      <tr key={`${p.id}-detail`}>
                        <td colSpan={4} style={{ padding: '0 24px 24px' }}>
                          <div className="animate-in" style={{ 
                            padding: '24px', 
                            background: 'var(--bg-primary)', 
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid var(--border)'
                          }}>
                            <table style={{ background: 'transparent' }}>
                              <thead>
                                <tr style={{ background: 'transparent' }}>
                                  <th style={{ background: 'transparent' }}>Product</th>
                                  <th style={{ background: 'transparent' }}>Qty</th>
                                  <th style={{ background: 'transparent' }}>Price</th>
                                  <th style={{ background: 'transparent' }}>Batch</th>
                                  <th style={{ background: 'transparent' }}>Expiry</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(details[p.id].items || []).map((item, idx) => (
                                  <tr key={idx} style={{ background: 'transparent' }}>
                                    <td>{item.product_name}</td>
                                    <td>{item.quantity}</td>
                                    <td>₹{item.price}</td>
                                    <td>{item.batch_number || '—'}</td>
                                    <td>{item.expiry_date || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon"><TruckIcon size={28} /></div>
            <h3>No purchases yet</h3>
            <p>Record your first stock purchase to see it here</p>
          </div>
        )}
      </div>

      {/* Modern Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-xl" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>New Purchase Records</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ background: 'var(--bg-primary)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  
                  {/* Supplier Info Card */}
                  <div className="card">
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Supplier Information</label>
                        <div style={{ position: 'relative' }}>
                          <input className="form-input" style={{ height: 50, fontSize: 16 }}
                            placeholder="Search supplier or enter new name..."
                            value={supplierSearch}
                            onChange={(e) => {
                              setSupplierSearch(e.target.value);
                              if (selectedSupplier && e.target.value !== selectedSupplier.name) setSelectedSupplier(null);
                              setSupplierName(e.target.value);
                              setShowSupplierDropdown(true);
                            }}
                            onFocus={() => setShowSupplierDropdown(true)}
                            onBlur={() => setTimeout(() => setShowSupplierDropdown(false), 200)} />

                          {showSupplierDropdown && (
                            <div className="suggestions-dropdown">
                              {suppliers
                                .filter(s => !supplierSearch || s.name.toLowerCase().includes(supplierSearch.toLowerCase()))
                                .slice(0, 5)
                                .map(s => (
                                  <div key={s.id} className="suggestion-item" onMouseDown={(e) => {
                                    e.preventDefault();
                                    setSelectedSupplier(s);
                                    setSupplierSearch(s.name);
                                    setSupplierName(s.name);
                                    setShowSupplierDropdown(false);
                                  }}>
                                    <div style={{ fontWeight: 600 }}>{s.name}</div>
                                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                      {s.phone || 'No phone'} | Balance: ₹{Math.abs(s.current_balance)}
                                    </div>
                                  </div>
                                ))}
                              {supplierSearch && !suppliers.some(s => s.name.toLowerCase() === supplierSearch.toLowerCase()) && (
                                <div className="suggestion-item" style={{ color: 'var(--accent)', fontWeight: 600 }}
                                  onMouseDown={() => setShowSupplierDropdown(false)}>
                                  + Add "{supplierSearch}" as new contact
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Additional Charges (₹)</label>
                        <input className="form-input" style={{ height: 50, fontSize: 16 }} 
                          type="number" placeholder="0.00"
                          value={otherCharges}
                          onChange={(e) => setOtherCharges(e.target.value)} />
                      </div>
                    </div>
                  </div>

                  {/* Items List Card */}
                  <div className="card">
                    <div className="flex items-center justify-between mb-md">
                      <label className="form-label" style={{ margin: 0 }}>Line Items</label>
                      <button className="btn btn-secondary btn-sm" onClick={addRow}>
                        <Plus size={14} /> Add Product Row
                      </button>
                    </div>

                    <div className="table-wrap" style={{ border: 'none', boxShadow: 'none' }}>
                      <table style={{ overflow: 'visible' }}>
                        <thead>
                          <tr>
                            <th style={{ padding: '8px 12px' }}>Product</th>
                            <th style={{ width: 80 }}>Qty</th>
                            <th style={{ width: 100 }}>Cost</th>
                            <th style={{ width: 100 }}>MRP</th>
                            <th style={{ width: 100 }}>Selling</th>
                            <th style={{ width: 100 }}>Batch</th>
                            <th style={{ width: 50 }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item, idx) => (
                           <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ position: 'relative', overflow: 'visible', padding: '12px 10px' }}>
                              <input className="form-input" style={{ height: 44, fontSize: 14, fontWeight: 700 }}
                                placeholder="Product Name..."
                                value={item.product_name}
                                onChange={(e) => updateRow(idx, 'product_name', e.target.value)}
                                onFocus={() => setActiveSuggestion({ row: idx, query: item.product_name })}
                                onBlur={() => {
                                  setTimeout(() => setActiveSuggestion({ row: null, query: '' }), 250);
                                  checkLastPrice(idx, item.product_name);
                                }} />
                              
                              {activeSuggestion.row === idx && (
                                <div className="suggestions-dropdown" style={{ width: '100%', zIndex: 100 }}>
                                  {allProducts
                                    .filter(p => !activeSuggestion.query || p.product_name.toLowerCase().includes(activeSuggestion.query.toLowerCase()))
                                    .slice(0, 5)
                                    .map(p => (
                                      <div key={p.id} className="suggestion-item" 
                                        onMouseDown={(e) => { e.preventDefault(); selectSuggestion(idx, p); }}>
                                        <div style={{ fontWeight: 700, fontSize: 13 }}>{p.product_name}</div>
                                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Stock: {p.quantity}</div>
                                      </div>
                                    ))}
                                </div>
                              )}
                              {item.last_price > 0 && (
                                <div style={{ fontSize: 10, color: 'var(--accent)', marginTop: 4, fontWeight: 800 }}>
                                  Last Cost: ₹{item.last_price}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '12px 6px' }}>
                              <input className="form-input" style={{ height: 44, textAlign: 'center', fontWeight: 800 }} type="number" placeholder="0" value={item.quantity} onChange={(e) => updateRow(idx, 'quantity', e.target.value)} />
                            </td>
                            <td style={{ padding: '12px 6px' }}>
                              <input className="form-input" style={{ height: 44, fontWeight: 800 }} type="number" placeholder="Cost" value={item.price} onChange={(e) => updateRow(idx, 'price', e.target.value)} />
                            </td>
                            <td style={{ padding: '12px 6px' }}>
                              <input className="form-input" style={{ height: 44, fontWeight: 800 }} type="number" placeholder="MRP" value={item.mrp} onChange={(e) => updateRow(idx, 'mrp', e.target.value)} />
                            </td>
                            <td style={{ padding: '12px 6px' }}>
                              <input className="form-input" style={{ height: 44, fontWeight: 800 }} type="number" placeholder="Sell" value={item.selling_price} onChange={(e) => updateRow(idx, 'selling_price', e.target.value)} />
                            </td>
                            <td style={{ padding: '12px 6px' }}>
                              <input className="form-input" style={{ height: 44, fontSize: 13 }} placeholder="Batch" value={item.batch_number} onChange={(e) => updateRow(idx, 'batch_number', e.target.value)} />
                            </td>
                            <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                              <button className="btn btn-ghost btn-icon" style={{ color: 'var(--danger)', opacity: 0.6 }} onClick={() => removeRow(idx)}><X size={18} strokeWidth={3} /></button>
                            </td>
                          </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Sidebar Inventory Tracker */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div className="card" style={{ height: 'fit-content', maxHeight: '100%' }}>
                    <div className="form-label" style={{ marginBottom: 16 }}>Inventory Overview</div>
                    <div className="search-box" style={{ marginBottom: 16, maxWidth: '100%' }}>
                      <Search className="search-icon" />
                      <input placeholder="Quick find product..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
                    </div>
                    <div style={{ maxHeight: 500, overflowY: 'auto', paddingRight: 4 }}>
                      {allProducts
                        .filter(p => !productSearch || p.product_name.toLowerCase().includes(productSearch.toLowerCase()))
                        .slice(0, 10)
                        .map(p => (
                          <div key={p.id} className="card" style={{ 
                            padding: '12px', 
                            marginBottom: '8px', 
                            cursor: 'pointer',
                            background: 'var(--bg-primary)',
                            border: '1.5px solid transparent'
                          }} onClick={() => handleQuickAdd(p)}>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{p.product_name}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11 }}>
                              <span style={{ color: p.quantity < 5 ? 'var(--danger)' : 'var(--text-muted)' }}>Stock: {p.quantity}</span>
                              <span style={{ fontWeight: 600 }}>₹{p.cost_price || '—'}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <div style={{ marginRight: 'auto', display: 'flex', gap: 24, alignItems: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Total Items: <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{items.filter(i => i.product_name).length}</span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>
                  Grand Total: <span style={{ color: 'var(--accent)' }}>₹{(items.reduce((acc, i) => acc + (parseFloat(i.price) * parseInt(i.quantity) || 0), 0) + (parseFloat(otherCharges) || 0)).toLocaleString('en-IN')}</span>
                </div>
              </div>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Discard</button>
              <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={saving}>
                {saving ? 'Processing...' : 'Confirm Purchase'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
          {toast.type === 'success' ? <Check size={18} style={{ color: 'var(--success)' }} /> : <X size={18} style={{ color: 'var(--danger)' }} />}
          <span style={{ fontWeight: 600 }}>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
