'use client';
import { useState } from 'react';
import {
  FileBarChart, Download, Calendar, IndianRupee,
  ShoppingCart, Package, TruckIcon, TrendingUp, ArrowRight, Check
} from 'lucide-react';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('sales');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    if (typeof window === 'undefined' || !window.electronAPI) return;
    setLoading(true);
    try {
      let result;
      if (activeTab === 'sales') {
        result = await window.electronAPI.reports.sales(fromDate, toDate);
      } else if (activeTab === 'purchases') {
        result = await window.electronAPI.reports.purchases(fromDate, toDate);
      } else if (activeTab === 'monthly') {
        result = await window.electronAPI.stats.getMonthly();
      } else {
        result = await window.electronAPI.reports.stock();
      }
      setData(result);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const tabs = [
    { key: 'sales', label: 'Sales Report', icon: ShoppingCart },
    { key: 'purchases', label: 'Purchase Report', icon: TruckIcon },
    { key: 'monthly', label: 'Monthly Performance', icon: FileBarChart },
    { key: 'stock', label: 'Stock Report', icon: Package },
  ];

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h2>Business Intelligence</h2>
          <p>Extract actionable insights from your sales and inventory data</p>
        </div>
      </div>

      {/* Modern Report Tabs */}
      <div className="action-bar" style={{ padding: 6, gap: 6, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)', marginBottom: 24 }}>
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              className={`btn ${activeTab === t.key ? 'btn-primary' : 'btn-ghost'}`}
              style={{ flex: 1, borderRadius: 'var(--radius-lg)', height: 44, gap: 10 }}
              onClick={() => { setActiveTab(t.key); setData(null); }}
            >
              <Icon size={18} />
              <span style={{ fontWeight: 700 }}>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filtering Section */}
      {(activeTab === 'sales' || activeTab === 'purchases') && (
        <div className="card" style={{ padding: 20, marginBottom: 24, background: 'var(--bg-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 10 }}>FROM DATE</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={14} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                  <input className="form-input" style={{ height: 38, paddingLeft: 34, width: 160 }} type="date" value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)} />
                </div>
              </div>
              <div style={{ marginTop: 18, color: 'var(--text-muted)' }}><ArrowRight size={14} /></div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 10 }}>TO DATE</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={14} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                  <input className="form-input" style={{ height: 38, paddingLeft: 34, width: 160 }} type="date" value={toDate}
                    onChange={(e) => setToDate(e.target.value)} />
                </div>
              </div>
            </div>
            <button className="btn btn-primary" style={{ height: 44, padding: '0 24px' }} onClick={fetchReport} disabled={loading}>
              {loading ? 'Processing...' : <><FileBarChart size={18} /> Run Analysis</>}
            </button>
          </div>
        </div>
      )}

      {/* Auto-load Buttons for Stock/Monthly */}
      {(activeTab === 'stock' || activeTab === 'monthly') && !data && (
        <div className="empty-state" style={{ padding: 80, background: 'var(--bg-secondary)', border: '1px dashed var(--border)' }}>
          <div className="empty-state-icon"><TrendingUp size={32} /></div>
          <h3>Ready for analysis</h3>
          <p>Click below to generate the {activeTab} report based on live system data</p>
          <button className="btn btn-primary btn-lg" style={{ marginTop: 24 }} onClick={fetchReport} disabled={loading}>
            {loading ? 'Crunching data...' : <><Check size={20} /> Generate Report Now</>}
          </button>
        </div>
      )}

      {/* Report Data Views */}
      {data && (
        <div className="animate-in">
          
          {/* Sales / Purchases Metrics */}
          {(activeTab === 'sales' || activeTab === 'purchases') && (
            <div className="metric-grid" style={{ marginBottom: 24 }}>
              <div className="metric-card">
                <div className="metric-icon teal"><IndianRupee size={22} /></div>
                <div className="metric-info">
                  <h3>Total {activeTab === 'sales' ? 'Revenue' : 'Investment'}</h3>
                  <div className="metric-value">₹{(data.summary?.total || 0).toLocaleString('en-IN')}</div>
                  <div className="metric-sub">Net amount {activeTab === 'sales' ? 'received' : 'spent'}</div>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-icon blue"><TrendingUp size={22} /></div>
                <div className="metric-info">
                  <h3>Transaction Count</h3>
                  <div className="metric-value">{data.summary?.count || 0}</div>
                  <div className="metric-sub">Total {activeTab === 'sales' ? 'bills' : 'orders'} processed</div>
                </div>
              </div>
              {activeTab === 'sales' && (
                <div className="metric-card">
                  <div className="metric-icon yellow"><IndianRupee size={22} /></div>
                  <div className="metric-info">
                    <h3>Tax Collected</h3>
                    <div className="metric-value">₹{(data.summary?.gst || 0).toLocaleString('en-IN')}</div>
                    <div className="metric-sub">GST collected on sales</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Table Container */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap" style={{ border: 'none', boxShadow: 'none' }}>
              
              {/* Sales Report Table */}
              {activeTab === 'sales' && data.sales && (
                <table>
                  <thead>
                    <tr>
                      <th>Transaction ID</th>
                      <th>Client Name</th>
                      <th style={{ textAlign: 'right' }}>Tax (GST)</th>
                      <th style={{ textAlign: 'right' }}>Total Amount</th>
                      <th style={{ textAlign: 'center' }}>Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.sales.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <div style={{ fontWeight: 800, color: 'var(--accent)' }}>#{s.invoice_number}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(s.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                        </td>
                        <td style={{ fontWeight: 600 }}>{s.customer_name || 'Counter Sale'}</td>
                        <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>₹{s.total_gst?.toLocaleString()}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, fontSize: 16 }}>₹{s.total_amount?.toLocaleString()}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ 
                            padding: '4px 10px', 
                            fontSize: 10, 
                            fontWeight: 800, 
                            borderRadius: 'var(--radius-full)',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border)'
                          }}>{s.payment_mode}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Monthly Performance Table */}
              {activeTab === 'monthly' && Array.isArray(data) && (
                <table>
                  <thead>
                    <tr>
                      <th>Calendar Month</th>
                      <th style={{ textAlign: 'right' }}>Sales Revenue</th>
                      <th style={{ textAlign: 'right' }}>Stock Inflow</th>
                      <th style={{ textAlign: 'center' }}>Volume</th>
                      <th style={{ textAlign: 'right' }}>Performance Gap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((m) => (
                      <tr key={m.month}>
                        <td style={{ fontWeight: 700 }}>{m.month}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--success)' }}>₹{m.sales?.toLocaleString()}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--danger)' }}>₹{m.purchases?.toLocaleString()}</td>
                        <td style={{ textAlign: 'center' }}><span className="badge badge-teal">{m.salesCount} Bills</span></td>
                        <td style={{ textAlign: 'right', fontWeight: 900, color: m.profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                          {m.profit >= 0 ? '+' : ''}₹{m.profit?.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Stock Report Table */}
              {activeTab === 'stock' && Array.isArray(data) && (
                <table>
                  <thead>
                    <tr>
                      <th>Product Inventory Details</th>
                      <th>Category</th>
                      <th style={{ textAlign: 'center' }}>Quantity</th>
                      <th style={{ textAlign: 'right' }}>Valuation</th>
                      <th>Condition</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div style={{ fontWeight: 700 }}>{p.product_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.brand || 'No Brand'} • Batch: {p.batch_number || '—'}</div>
                        </td>
                        <td><span className="badge badge-teal">{p.category || 'General'}</span></td>
                        <td style={{ textAlign: 'center', fontWeight: 800, fontSize: 16 }}>{p.quantity}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{p.selling_price?.toLocaleString()}</td>
                        <td>
                          <span style={{ 
                            padding: '4px 8px', 
                            borderRadius: 6, 
                            fontSize: 10, 
                            fontWeight: 800,
                            background: p.quantity <= 0 ? 'var(--danger-glow)' : p.quantity <= 10 ? 'var(--warning-glow)' : 'var(--accent-glow)',
                            color: p.quantity <= 0 ? 'var(--danger)' : p.quantity <= 10 ? 'var(--warning)' : 'var(--accent)'
                          }}>
                            {p.quantity <= 0 ? 'REPLENISH' : p.quantity <= 10 ? 'LOW STOCK' : 'OPTIMAL'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Purchases Report Table */}
              {activeTab === 'purchases' && data.purchases && (
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Supplier / Vendor</th>
                      <th style={{ textAlign: 'right' }}>Total Investment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.purchases.map((p) => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600 }}>{new Date(p.date).toLocaleDateString('en-IN')}</td>
                        <td>{p.supplier_name || 'Generic Vendor'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, fontSize: 16, color: 'var(--danger)' }}>₹{p.total_amount?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Global No Data Fallback */}
      {!data && !loading && activeTab !== 'stock' && activeTab !== 'monthly' && (
        <div className="empty-state" style={{ padding: 60 }}>
          <div className="empty-state-icon"><FileBarChart size={28} /></div>
          <h3>Select options above</h3>
          <p>Choose a range to visualize your performance analytics</p>
        </div>
      )}
    </div>
  );
}
