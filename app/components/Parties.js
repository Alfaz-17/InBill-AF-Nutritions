'use client';
import { useState, useEffect } from 'react';
import { 
  Plus, Search, Phone, User, Users, Trash2, Edit3, 
  ArrowUpRight, ArrowDownLeft, X, Check, Save 
} from 'lucide-react';

export default function Parties() {
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('All'); // All | Customer | Supplier
  const [showModal, setShowModal] = useState(false);
  const [editingParty, setEditingParty] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '', phone: '', address: '', gstin: '', type: 'Customer', opening_balance: 0
  });

  useEffect(() => {
    loadParties();
  }, []);

  const loadParties = async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const data = await window.electronAPI.parties.getAll();
        setParties(data || []);
      } catch (e) {
        console.error('Failed to load parties:', e);
      }
    }
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name) return;

    try {
      if (editingParty) {
        await window.electronAPI.parties.update(editingParty.id, formData);
      } else {
        await window.electronAPI.parties.add(formData);
      }
      setShowModal(false);
      setEditingParty(null);
      setFormData({ name: '', phone: '', address: '', gstin: '', type: 'Customer', opening_balance: 0 });
      loadParties();
    } catch (e) {
      console.error('Failed to save party:', e);
    }
  };

  const openAdd = () => {
    setEditingParty(null);
    setFormData({ name: '', phone: '', address: '', gstin: '', type: 'Customer', opening_balance: 0 });
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditingParty(p);
    setFormData({ 
      name: p.name, 
      phone: p.phone, 
      address: p.address, 
      gstin: p.gstin, 
      type: p.type, 
      opening_balance: p.opening_balance 
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this party?')) {
      try {
        await window.electronAPI.parties.delete(id);
        loadParties();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const filtered = parties.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.phone.includes(searchTerm);
    const matchesFilter = filter === 'All' || p.type === filter;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    receivable: parties.filter(p => p.current_balance > 0).reduce((sum, p) => sum + p.current_balance, 0),
    payable: Math.abs(parties.filter(p => p.current_balance < 0).reduce((sum, p) => sum + p.current_balance, 0))
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <h2>Business Directory</h2>
        <p>Manage your customers, suppliers and financial balances</p>
      </div>

      {/* Financial Overview */}
      <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-icon green"><ArrowDownLeft size={24} /></div>
          <div className="metric-info">
            <h3>To Receive</h3>
            <div className="metric-value">₹{stats.receivable.toLocaleString('en-IN')}</div>
            <div className="metric-sub">From {parties.filter(p => p.current_balance > 0).length} Customers</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon red"><ArrowUpRight size={24} /></div>
          <div className="metric-info">
            <h3>To Pay</h3>
            <div className="metric-value">₹{stats.payable.toLocaleString('en-IN')}</div>
            <div className="metric-sub">To {parties.filter(p => p.current_balance < 0).length} Suppliers</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon blue"><Users size={24} /></div>
          <div className="metric-info">
            <h3>Net Balance</h3>
            <div className="metric-value" style={{ color: stats.receivable - stats.payable >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              ₹{(stats.receivable - stats.payable).toLocaleString('en-IN')}
            </div>
            <div className="metric-sub">Overall position</div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="action-bar">
        <div className="action-bar-left">
          <div className="search-box">
            <Search className="search-icon" />
            <input 
              placeholder="Quick search by name or contact..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div style={{ marginLeft: 8 }}>
            <div className="flex gap-xs">
              {['All', 'Customer', 'Supplier'].map(t => (
                <button 
                  key={t}
                  className={`btn btn-sm ${filter === t ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ borderRadius: 'var(--radius-full)', padding: '6px 16px' }}
                  onClick={() => setFilter(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={16} /> Register New Party
        </button>
      </div>

      {/* Table Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length > 0 ? (
          <div className="table-wrap" style={{ border: 'none', boxShadow: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Contact Information</th>
                  <th>Type</th>
                  <th>Financial Status</th>
                  <th style={{ width: 80, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</div>
                      <div style={{ display: 'flex', gap: 12, marginTop: 4, alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                          <Phone size={12} /> {p.phone || 'No phone'}
                        </div>
                        {p.gstin && (
                          <div style={{ fontSize: 11, background: 'var(--bg-primary)', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                            {p.gstin}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span style={{ 
                        padding: '4px 12px', 
                        borderRadius: 'var(--radius-full)', 
                        fontSize: 11, 
                        fontWeight: 700,
                        background: p.type === 'Customer' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        color: p.type === 'Customer' ? '#2563eb' : '#d97706'
                      }}>
                        {p.type}
                      </span>
                    </td>
                    <td>
                      <div style={{ 
                        fontWeight: 800, 
                        fontSize: 16,
                        color: p.current_balance > 0 ? 'var(--success)' : p.current_balance < 0 ? 'var(--danger)' : 'var(--text-muted)'
                      }}>
                        {p.current_balance > 0 ? '+' : p.current_balance < 0 ? '-' : ''}
                        ₹{Math.abs(p.current_balance).toLocaleString('en-IN')}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                        {p.current_balance > 0 ? 'TO RECEIVE' : p.current_balance < 0 ? 'TO PAY' : 'SETTLED'}
                      </div>
                    </td>
                    <td>
                      <div className="flex justify-end gap-sm">
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(p)}>
                          <Edit3 size={16} />
                        </button>
                        <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(p.id)}>
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
            <div className="empty-state-icon"><Users size={28} /></div>
            <h3>No records found</h3>
            <p>Try searching for a different name or add a new contact</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-md" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingParty ? 'Update Contact Information' : 'Register New Business Partner'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSave} style={{ background: 'var(--bg-primary)', padding: 0 }}>
              <div className="modal-body" style={{ padding: 24 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  
                  {/* Personal Info Card */}
                  <div className="card">
                    <div className="form-group">
                      <label className="form-label">Legal Name / Business Name *</label>
                      <input 
                        className="form-input" 
                        autoFocus 
                        required
                        style={{ height: 48, fontSize: 16 }}
                        placeholder="e.g. John Doe Enterprises"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Mobile Number</label>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>+91</span>
                          <input 
                            className="form-input" 
                            style={{ paddingLeft: 46, height: 44 }}
                            placeholder="9988776655"
                            value={formData.phone}
                            onChange={e => setFormData({...formData, phone: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Contact Category</label>
                        <select 
                          className="form-select"
                          style={{ height: 44 }}
                          value={formData.type}
                          onChange={e => setFormData({...formData, type: e.target.value})}
                        >
                          <option value="Customer">Client / Buyer</option>
                          <option value="Supplier">Vendor / Supplier</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Finance Info Card */}
                  <div className="card">
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">GSTIN Identification</label>
                        <input 
                          className="form-input font-mono" 
                          style={{ height: 44 }}
                          placeholder="22AAAAA0000A1Z5"
                          value={formData.gstin}
                          onChange={e => setFormData({...formData, gstin: e.target.value.toUpperCase()})}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Opening Account Balance</label>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>₹</span>
                          <input 
                            className="form-input" 
                            type="number"
                            style={{ height: 44, paddingLeft: 28 }}
                            placeholder="0.00"
                            value={formData.opening_balance}
                            onChange={e => setFormData({...formData, opening_balance: parseFloat(e.target.value) || 0})}
                          />
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontWeight: 600 }}>
                          * Use negative (-) for payables
                        </div>
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Billing Address</label>
                      <textarea 
                        className="form-textarea"
                        placeholder="Street, City, Pincode..."
                        style={{ minHeight: 80 }}
                        value={formData.address}
                        onChange={e => setFormData({...formData, address: e.target.value})}
                      ></textarea>
                    </div>
                  </div>

                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Discard</button>
                <button type="submit" className="btn btn-primary btn-lg">
                  <Check size={18} /> {editingParty ? 'Commit Updates' : 'Save New Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
