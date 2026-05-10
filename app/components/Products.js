'use client';
import { useState, useEffect } from 'react';
import {
  Plus, Search, Edit3, Trash2, X, Check, Package,
  AlertTriangle, Clock, Filter
} from 'lucide-react';

const CATEGORIES = [
  'All', 'Protein', 'Pre-Workout', 'BCAA', 'Creatine', 'Vitamins',
  'Omega & Fish Oil', 'Mass Gainer', 'Fat Burner', 'Energy', 'Other'
];

const UNITS = ['pcs', 'box', 'bottle', 'sachet', 'kg', 'g', 'strip'];
const GST_RATES = [0, 5, 12, 18, 28];

const emptyProduct = {
  product_name: '', brand: '', category: '', unit: 'pcs',
  mrp: '', selling_price: '', cost_price: '', barcode: '',
  gst_rate: 0, quantity: '', batch_number: '', expiry_date: ''
};

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...emptyProduct });
  const [toast, setToast] = useState(null);
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const data = await window.electronAPI.products.getAll();
        setProducts(data || []);
      } catch (e) { console.error(e); }
    }
    setLoading(false);
  };

  const filtered = products.filter((p) => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !searchTerm ||
      p.product_name.toLowerCase().includes(q) ||
      (p.brand && p.brand.toLowerCase().includes(q));
    const matchCat = filterCat === 'All' || p.category === filterCat;
    return matchSearch && matchCat;
  });

  const openAdd = () => {
    setEditId(null);
    setForm({ ...emptyProduct });
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditId(p.id);
    setForm({
      product_name: p.product_name,
      brand: p.brand || '',
      category: p.category || '',
      unit: p.unit || 'pcs',
      mrp: p.mrp || '',
      selling_price: p.selling_price || '',
      cost_price: p.cost_price || '',
      barcode: p.barcode || '',
      gst_rate: p.gst_rate || 0,
      quantity: p.quantity || '',
      batch_number: p.batch_number || '',
      expiry_date: p.expiry_date || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.product_name.trim()) return;
    if (typeof window === 'undefined' || !window.electronAPI) {
      flash('Error: System not ready', 'error');
      return;
    }
    try {
      const payload = {
        ...form,
        mrp: parseFloat(form.mrp) || 0,
        selling_price: parseFloat(form.selling_price) || 0,
        cost_price: parseFloat(form.cost_price) || 0,
        gst_rate: parseFloat(form.gst_rate) || 0,
        quantity: parseInt(form.quantity) || 0,
      };
      if (editId) {
        await window.electronAPI.products.update(editId, payload);
        flash('Product updated successfully');
      } else {
        await window.electronAPI.products.add(payload);
        flash('Product added successfully');
      }
      setShowModal(false);
      loadProducts();
    } catch (e) {
      flash('Error: ' + e.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (typeof window === 'undefined' || !window.electronAPI) return;
    try {
      await window.electronAPI.products.delete(id);
      flash('Product deleted');
      loadProducts();
    } catch (e) { flash('Error: ' + e.message, 'error'); }
  };

  const flash = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const stockBadge = (qty) => {
    if (qty <= 0) return <span className="badge badge-danger">Out of Stock</span>;
    if (qty <= 10) return <span className="badge badge-warning">Low: {qty}</span>;
    return <span className="badge badge-success">{qty}</span>;
  };

  if (loading) {
    return <div className="empty-state"><div className="spinner" style={{ width: 32, height: 32 }}></div></div>;
  }

  return (
    <div className="animate-in">
      <div className="page-header">
        <h2>Inventory Manager</h2>
        <p>Monitor your supplement stock levels and pricing</p>
      </div>

      {/* Product Metrics */}
      <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-icon teal"><Package size={24} /></div>
          <div className="metric-info">
            <h3>Total Items</h3>
            <div className="metric-value">{products.length}</div>
            <div className="metric-sub">Across all categories</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon yellow"><AlertTriangle size={24} /></div>
          <div className="metric-info">
            <h3>Low Stock</h3>
            <div className="metric-value">{products.filter(p => p.quantity > 0 && p.quantity <= 10).length}</div>
            <div className="metric-sub">Needs attention soon</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon red"><Clock size={24} /></div>
          <div className="metric-info">
            <h3>Out of Stock</h3>
            <div className="metric-value">{products.filter(p => p.quantity <= 0).length}</div>
            <div className="metric-sub">Critical shortages</div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="action-bar">
        <div className="action-bar-left">
          <div className="search-box">
            <Search className="search-icon" />
            <input
              placeholder="Search products or brands..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className={`btn btn-secondary btn-sm ${showFilter ? 'btn-primary' : ''}`} onClick={() => setShowFilter(!showFilter)}>
            <Filter size={14} /> {showFilter ? 'Close Filters' : 'Filters'}
          </button>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={16} /> Add New Product
        </button>
      </div>

      {/* Category Filter */}
      {showFilter && (
        <div className="animate-in" style={{ marginBottom: 24, padding: 16, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <div className="form-label" style={{ marginBottom: 12 }}>Filter by Category</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={`btn btn-sm ${filterCat === cat ? 'btn-primary' : 'btn-secondary'}`}
                style={{ borderRadius: 'var(--radius-full)' }}
                onClick={() => setFilterCat(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Table Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length > 0 ? (
          <div className="table-wrap" style={{ border: 'none', boxShadow: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Product Details</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>Pricing</th>
                  <th style={{ textAlign: 'center' }}>Stock</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{p.product_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 8, marginTop: 2 }}>
                        <span>{p.brand || 'No Brand'}</span>
                        {p.batch_number && <span>• Batch: {p.batch_number}</span>}
                      </div>
                    </td>
                    <td>
                      {p.category ? <span style={{ 
                        padding: '4px 10px', 
                        background: 'var(--accent-glow-strong)', 
                        color: 'var(--accent)', 
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 11,
                        fontWeight: 700
                      }}>{p.category}</span> : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: 16 }}>₹{p.selling_price}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>MRP: ₹{p.mrp || 0}</div>
                    </td>
                    <td style={{ textAlign: 'center' }}>{stockBadge(p.quantity)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex justify-end gap-sm">
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(p)}>
                          <Edit3 size={16} />
                        </button>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(p.id)}
                          style={{ color: 'var(--danger)' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon"><Package size={28} /></div>
            <h3>No products found</h3>
            <p>Try refining your search or add a new product</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editId ? 'Modify Product Details' : 'Register New Product'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ background: 'var(--bg-primary)', padding: 24 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                
                {/* General Information */}
                <div className="card">
                  <div className="form-label" style={{ marginBottom: 16 }}>General Details</div>
                  <div className="form-row">
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Full Product Name</label>
                      <input className="form-input" style={{ height: 44 }} placeholder="e.g. Nitro-Tech Whey Gold 2kg - Double Rich Chocolate"
                        value={form.product_name}
                        onChange={(e) => setForm({ ...form, product_name: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Barcode / SKU ID</label>
                      <input className="form-input" style={{ height: 44 }} placeholder="Scan item barcode"
                        value={form.barcode}
                        onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
                    </div>
                  </div>

                  <div className="form-row" style={{ marginTop: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Brand / Manufacturer</label>
                      <input className="form-input" style={{ height: 44 }} placeholder="e.g. Optimum Nutrition"
                        value={form.brand}
                        onChange={(e) => setForm({ ...form, brand: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Inventory Category</label>
                      <select className="form-select" style={{ height: 44 }} value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}>
                        <option value="">Choose category...</option>
                        {CATEGORIES.filter(c => c !== 'All').map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Measurement Unit</label>
                      <select className="form-select" style={{ height: 44 }} value={form.unit}
                        onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                        {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Pricing & GST */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }}>
                  <div className="card" style={{ height: 'fit-content' }}>
                    <div className="form-label" style={{ marginBottom: 16 }}>Pricing Structure</div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Max Retail (MRP)</label>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>₹</span>
                          <input className="form-input" style={{ height: 44, paddingLeft: 30 }} type="number" placeholder="0.00"
                            value={form.mrp}
                            onChange={(e) => setForm({ ...form, mrp: e.target.value })} />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Sale Price</label>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>₹</span>
                          <input className="form-input" style={{ height: 44, paddingLeft: 30, border: '2px solid var(--accent)' }} type="number" placeholder="0.00"
                            value={form.selling_price}
                            onChange={(e) => setForm({ ...form, selling_price: e.target.value })} />
                        </div>
                      </div>
                    </div>
                    <div className="form-row" style={{ marginTop: 12 }}>
                      <div className="form-group">
                        <label className="form-label">Purchase Cost</label>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>₹</span>
                          <input className="form-input" style={{ height: 44, paddingLeft: 30 }} type="number" placeholder="0.00"
                            value={form.cost_price}
                            onChange={(e) => setForm({ ...form, cost_price: e.target.value })} />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">GST Applicability</label>
                        <select className="form-select" style={{ height: 44 }} value={form.gst_rate}
                          onChange={(e) => setForm({ ...form, gst_rate: e.target.value })}>
                          {GST_RATES.map((r) => <option key={r} value={r}>{r}% GST</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Stock Management */}
                  <div className="card">
                    <div className="form-label" style={{ marginBottom: 16 }}>Inventory Status</div>
                    <div className="form-group">
                      <label className="form-label">Current Quantity</label>
                      <input className="form-input" style={{ height: 44, fontSize: 18, fontWeight: 700 }} type="number" placeholder="0"
                        value={form.quantity}
                        onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Batch Identifier</label>
                      <input className="form-input" style={{ height: 44 }} placeholder="BN-XXXX"
                        value={form.batch_number}
                        onChange={(e) => setForm({ ...form, batch_number: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Expiry Date</label>
                      <input className="form-input" style={{ height: 44 }} type="date"
                        value={form.expiry_date}
                        onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Discard Changes</button>
              <button className="btn btn-primary btn-lg" onClick={handleSave}>
                <Check size={18} /> {editId ? 'Commit Updates' : 'Add to Inventory'}
              </button>
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
