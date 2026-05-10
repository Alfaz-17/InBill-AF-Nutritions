'use client';
import { useState, useEffect } from 'react';
import {
  Plus, Trash2, X, Check, IndianRupee, PieChart, Calendar
} from 'lucide-react';

const CATEGORIES = ['Rent', 'Electricity', 'Water', 'Staff Salary', 'Marketing', 'Maintenance', 'Cleaning', 'Other'];

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ category: 'Other', description: '', amount: '' });
  const [toast, setToast] = useState(null);

  useEffect(() => { loadExpenses(); }, []);

  const loadExpenses = async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const data = await window.electronAPI.expenses.getAll();
        setExpenses(data || []);
      } catch (e) { console.error(e); }
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) return;
    try {
      await window.electronAPI.expenses.add({
        ...form,
        amount: parseFloat(form.amount)
      });
      flash('Expense recorded');
      setShowModal(false);
      setForm({ category: 'Other', description: '', amount: '' });
      loadExpenses();
    } catch (e) { flash(e.message, 'error'); }
  };

  const handleDelete = async (id) => {
    try {
      await window.electronAPI.expenses.delete(id);
      flash('Expense deleted');
      loadExpenses();
    } catch (e) { flash(e.message, 'error'); }
  };

  const flash = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);

  if (loading) {
    return <div className="empty-state"><div className="spinner" style={{ width: 32, height: 32 }}></div></div>;
  }

  return (
    <div className="animate-in">
      <div className="page-header">
        <h2>Shop Expenses</h2>
        <p>Track your overheads and operational costs</p>
      </div>

      <div className="metric-grid mb-lg">
        <div className="metric-card">
          <div className="metric-icon red">
            <IndianRupee size={22} />
          </div>
          <div className="metric-info">
            <h3>Total Fixed Costs</h3>
            <div className="metric-value">₹{totalExpenses.toLocaleString('en-IN')}</div>
            <div className="metric-sub">Total overhead for current period</div>
          </div>
        </div>
      </div>

      <div className="action-bar px-lg py-md">
        <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
          {expenses.length} Records found
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Record Expense
        </button>
      </div>

      {expenses.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th style={{ width: 60 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{new Date(e.date).toLocaleDateString('en-IN')}</td>
                  <td><span className="badge badge-teal font-medium">{e.category}</span></td>
                  <td style={{ fontWeight: 500 }}>{e.description || '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, fontSize: 15 }}>₹{e.amount.toLocaleString('en-IN')}</td>
                  <td>
                    <button className="btn btn-ghost btn-icon" onClick={() => handleDelete(e.id)} style={{ color: 'var(--danger)' }}>
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon"><PieChart size={28} /></div>
          <h3>No expenses recorded</h3>
          <p>Start tracking your shop costs here</p>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Record New Expense</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Amount (₹)</label>
              <input className="form-input" type="number" placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>

            <div className="form-group">
              <label className="form-label">Description / Note</label>
              <input className="form-input" placeholder="e.g. Paid electricity bill for March" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>
                <Check size={16} /> Save Expense
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
