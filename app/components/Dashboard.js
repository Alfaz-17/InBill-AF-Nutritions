'use client';
import { useState, useEffect } from 'react';
import {
  Clock, TrendingUp, Plus, ArrowRight, Wallet,
  IndianRupee, ShoppingCart, Package, AlertTriangle,
  ArrowDownLeft, ArrowUpRight, Users, ScanLine
} from 'lucide-react';

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const data = await window.electronAPI.stats.dashboard();
        setStats(data);
      } catch (e) {
        console.error('Dashboard load error:', e);
      }
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="empty-state">
        <div className="spinner" style={{ width: 32, height: 32 }}></div>
        <p style={{ marginTop: 16 }}>Loading dashboard...</p>
      </div>
    );
  }

  const s = stats || {
    todaySalesTotal: 0, todaySalesCount: 0,
    totalProducts: 0, lowStockCount: 0,
    expiringCount: 0, recentSales: []
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Overview of your supplement store operations</p>
      </div>

      {/* Metric Cards */}
      <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-icon teal">
            <TrendingUp size={24} />
          </div>
          <div className="metric-info">
            <h3>Today&apos;s Sales</h3>
            <div className="metric-value">₹{s.todaySalesTotal.toLocaleString('en-IN')}</div>
            <div className="metric-sub">{s.todaySalesCount} transaction{s.todaySalesCount !== 1 ? 's' : ''}</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon green">
            <IndianRupee size={24} />
          </div>
          <div className="metric-info">
            <h3>Total Revenue</h3>
            <div className="metric-value">₹{(s.totalRevenue || 0).toLocaleString('en-IN')}</div>
            <div className="metric-sub">all-time earnings</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon red">
            <Wallet size={24} />
          </div>
          <div className="metric-info">
            <h3>Total Expenses</h3>
            <div className="metric-value">₹{(s.totalExpenses || 0).toLocaleString('en-IN')}</div>
            <div className="metric-sub">shop overheads</div>
          </div>
        </div>

        <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('parties')}>
          <div className="metric-icon green">
            <ArrowDownLeft size={24} />
          </div>
          <div className="metric-info">
            <h3>To Receive</h3>
            <div className="metric-value">₹{(s.receivable || 0).toLocaleString('en-IN')}</div>
            <div className="metric-sub">from customers</div>
          </div>
        </div>
        <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('parties')}>
          <div className="metric-icon yellow">
            <ArrowUpRight size={24} />
          </div>
          <div className="metric-info">
            <h3>To Pay</h3>
            <div className="metric-value">₹{(s.payable || 0).toLocaleString('en-IN')}</div>
            <div className="metric-sub">to suppliers</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon blue">
            <Package size={24} />
          </div>
          <div className="metric-info">
            <h3>Total Products</h3>
            <div className="metric-value">{s.totalProducts}</div>
            <div className="metric-sub">in inventory</div>
          </div>
        </div>

        <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('products')}>
          <div className="metric-icon red">
            <AlertTriangle size={24} />
          </div>
          <div className="metric-info">
            <h3>Low Stock</h3>
            <div className="metric-value" style={{ color: 'var(--danger)' }}>{s.lowStockCount}</div>
            <div className="metric-sub">items needing attention</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon yellow">
            <Clock size={24} />
          </div>
          <div className="metric-info">
            <h3>Expiring Soon</h3>
            <div className="metric-value" style={{ color: s.expiringCount > 0 ? 'var(--warning)' : 'inherit' }}>{s.expiringCount}</div>
            <div className="metric-sub">within 30 days</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-md wrap mb-md">
        <button className="btn btn-primary btn-lg" onClick={() => onNavigate('billing')}>
          <ShoppingCart size={20} />
          New Sale
        </button>
        <button className="btn btn-secondary btn-lg" onClick={() => onNavigate('products')}>
          <Plus size={20} />
          Add Product
        </button>
        <button className="btn btn-secondary btn-lg" onClick={() => onNavigate('parties')}>
          <Users size={20} />
          Add Party
        </button>
        <button className="btn btn-secondary btn-lg" onClick={() => onNavigate('ai-upload')}>
          <ScanLine size={20} />
          AI Stock-in
        </button>
      </div>

      {/* Recent Sales */}
      <div className="card">
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>Recent Sales</h3>
          <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('reports')}>
            View All <ArrowRight size={14} />
          </button>
        </div>

        {s.recentSales && s.recentSales.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {s.recentSales.map((sale) => (
                  <tr key={sale.id}>
                    <td>
                      <span className="badge badge-teal">{sale.invoice_number}</span>
                    </td>
                    <td>{sale.customer_name || '—'}</td>
                    <td style={{ fontWeight: 600 }}>₹{sale.total_amount.toLocaleString('en-IN')}</td>
                    <td>
                      <span className={`badge ${sale.payment_mode === 'Cash' ? 'badge-success' : sale.payment_mode === 'UPI' ? 'badge-info' : 'badge-warning'}`}>
                        {sale.payment_mode}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {new Date(sale.date).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state" style={{ padding: 40 }}>
            <div className="empty-state-icon">
              <ShoppingCart size={28} />
            </div>
            <h3>No sales yet</h3>
            <p>Create your first sale to see activity here</p>
          </div>
        )}
      </div>
    </div>
  );
}
