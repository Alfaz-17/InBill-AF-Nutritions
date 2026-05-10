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

      <div className="action-bar">
        <div></div>
        <div className="flex items-center gap-sm">
          <button className="btn btn-secondary" onClick={() => setViewMode('ai')}>
            <ScanLine size={16} /> Scan Bill (AI)
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> New Purchase
          </button>
        </div>
      </div>

      {/* Purchase List */}
      {purchases.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Supplier</th>
                <th>Total</th>
                <th>Items</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <Fragment key={p.id}>
                  <tr onClick={() => toggleExpand(p.id)} style={{ cursor: 'pointer' }}>
                    <td>{new Date(p.date).toLocaleDateString('en-IN')}</td>
                    <td style={{ fontWeight: 500 }}>{p.supplier_name || '—'}</td>
                    <td style={{ fontWeight: 600 }}>₹{p.total_amount.toLocaleString('en-IN')}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm">
                        {expandedId === p.id ? 'Hide' : 'View'}
                      </button>
                    </td>
                  </tr>
                  {expandedId === p.id && details[p.id] && (
                    <tr key={`${p.id}-detail`}>
                      <td colSpan={4} style={{ padding: 0 }}>
                        <div style={{ padding: '12px 24px', background: 'var(--bg-primary)' }}>
                          <table>
                            <thead>
                              <tr>
                                <th>Product</th>
                                <th>Qty</th>
                                <th>Price</th>
                                <th>Batch</th>
                                <th>Expiry</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(details[p.id].items || []).map((item, idx) => (
                                <tr key={idx}>
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
          <p>Record your first stock purchase</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-xl" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>New Purchase</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Supplier Name</label>
              <div style={{ position: 'relative' }}>
                <input className="form-input" placeholder="Search supplier or type name..."
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
                  <div className="suggestions-dropdown" style={{ top: '100%', width: '100%' }}>
                    {suppliers
                      .filter(s => !supplierSearch || s.name.toLowerCase().includes(supplierSearch.toLowerCase()) || s.phone.includes(supplierSearch))
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
                      <div className="suggestion-item" style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 600 }}
                        onMouseDown={() => {
                          setSupplierName(supplierSearch);
                          setShowSupplierDropdown(false);
                        }}>
                        + Use "{supplierSearch}" as new supplier
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

                    <div className="form-group">
              <label className="form-label">Shipping / Other Charges (₹)</label>
              <input className="form-input" type="number" placeholder="0"
                value={otherCharges}
                onChange={(e) => setOtherCharges(e.target.value)} />
              </div>

              <div className="purchase-grid gap-lg">
                <div className="purchase-main">
                  <div className="flex items-center justify-between mb-md">
                    <label className="form-label" style={{ margin: 0 }}>Purchase Items</label>
                    <button className="btn btn-secondary btn-sm" onClick={addRow}>
                      <Plus size={14} /> Add Row
                    </button>
                  </div>

                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th style={{ padding: '0 12px' }}>Product Name</th>
                          <th style={{ width: 60, textAlign: 'center' }}>Qty</th>
                          <th style={{ width: 100, textAlign: 'right' }}>Cost</th>
                          <th style={{ width: 100, textAlign: 'right' }}>MRP</th>
                          <th style={{ width: 100, textAlign: 'right' }}>Selling</th>
                          <th style={{ width: 80 }}>Batch</th>
                          <th style={{ width: 110 }}>Expiry</th>
                          <th style={{ width: 40 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, idx) => (
                          <tr key={idx}>
                            <td style={{ position: 'relative' }}>
                              <input className="form-input" placeholder="Search or type name..."
                                value={item.product_name}
                                style={{ height: 38, fontSize: 13.5 }}
                                onChange={(e) => updateRow(idx, 'product_name', e.target.value)}
                                onFocus={() => setActiveSuggestion({ row: idx, query: item.product_name })}
                                onBlur={() => {
                                  setTimeout(() => setActiveSuggestion({ row: null, query: '' }), 250);
                                  checkLastPrice(idx, item.product_name);
                                }} />
                              
                              {activeSuggestion.row === idx && (
                                <div className="suggestions-dropdown">
                                  {allProducts
                                    .filter(p => {
                                      if (!activeSuggestion.query) return true;
                                      return p.product_name.toLowerCase().includes(activeSuggestion.query.toLowerCase());
                                    })
                                    .slice(0, 8)
                                    .map(p => (
                                      <div key={p.id} className="suggestion-item" 
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          selectSuggestion(idx, p);
                                        }}>
                                        <div className="flex justify-between items-center">
                                          <span style={{ fontWeight: 600 }}>{p.product_name}</span>
                                          <span className="badge badge-teal" style={{ fontSize: 9 }}>Stock: {p.quantity}</span>
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              )}

                              {item.last_price > 0 && (
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontWeight: 600 }}>
                                  Last Paid: ₹{item.last_price}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '4px' }}>
                              <input className="form-input" type="number" placeholder="0"
                                style={{ textAlign: 'center', height: 38, padding: '4px' }}
                                value={item.quantity}
                                onChange={(e) => updateRow(idx, 'quantity', e.target.value)} />
                            </td>
                            <td style={{ padding: '4px' }}>
                              <input className="form-input" type="number" placeholder="0"
                                style={{ textAlign: 'right', height: 38, padding: '4px' }}
                                value={item.price}
                                onChange={(e) => updateRow(idx, 'price', e.target.value)} />
                            </td>
                            <td style={{ padding: '4px' }}>
                              <input className="form-input" type="number" placeholder="0"
                                style={{ textAlign: 'right', height: 38, padding: '4px' }}
                                value={item.mrp}
                                onChange={(e) => updateRow(idx, 'mrp', e.target.value)} />
                            </td>
                            <td style={{ padding: '4px' }}>
                              <input className="form-input" type="number" placeholder="0"
                                style={{ textAlign: 'right', height: 38, padding: '4px' }}
                                value={item.selling_price}
                                onChange={(e) => updateRow(idx, 'selling_price', e.target.value)} />
                            </td>
                            <td style={{ padding: '4px' }}>
                              <input className="form-input" placeholder="BN"
                                style={{ fontSize: 11, height: 38, padding: '4px' }}
                                value={item.batch_number}
                                onChange={(e) => updateRow(idx, 'batch_number', e.target.value)} />
                            </td>
                            <td style={{ padding: '4px' }}>
                              <input className="form-input" type="date"
                                style={{ fontSize: 11, padding: '4px 6px', height: 38 }}
                                value={item.expiry_date}
                                onChange={(e) => updateRow(idx, 'expiry_date', e.target.value)} />
                            </td>
                            <td style={{ padding: '4px', textAlign: 'center' }}>
                              <button className="btn btn-ghost btn-icon"
                                onClick={() => removeRow(idx)}>
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Selection Sidebar */}
                <div className="purchase-sidebar">
                  <div className="sidebar-header">
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--text-main)' }}>Stock-in Tracker</div>
                    <div className="search-box">
                      <Search className="search-icon" />
                      <input 
                        placeholder="Quick search products..." 
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        style={{ fontSize: 12, paddingLeft: 36 }}
                      />
                    </div>
                  </div>
                  <div className="sidebar-list">
                    {allProducts
                      .filter(p => !productSearch || p.product_name.toLowerCase().includes(productSearch.toLowerCase()))
                      .slice(0, 15)
                      .map(p => (
                        <div key={p.id} className="selection-item" onClick={() => handleQuickAdd(p)}>
                          <div className="item-name">{p.product_name}</div>
                          <div className="item-meta">
                            <span className={p.quantity < 10 ? 'text-danger' : ''}>Stock: {p.quantity}</span>
                            <span>• Price: ₹{p.cost_price || '—'}</span>
                          </div>
                        </div>
                      ))}
                    {allProducts.length === 0 && (
                      <div className="empty-state" style={{ padding: 20 }}>
                        <p style={{ fontSize: 11 }}>No products found.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><div className="spinner" style={{ width: 14, height: 14 }}></div> Saving...</> : <><Check size={16} /> Save Purchase</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
          {toast.type === 'success' ? <Check size={16} style={{ color: 'var(--success)' }} /> : <X size={16} style={{ color: 'var(--danger)' }} />}
          {toast.message}
        </div>
      )}
    </div>
  );
}

