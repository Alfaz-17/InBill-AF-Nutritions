'use client';
import { useState, useEffect } from 'react';
import {
  Clock, TrendingUp, Plus, ArrowRight, Wallet,
  IndianRupee, ShoppingCart, Package, AlertTriangle, Check,
  ArrowDownLeft, ArrowUpRight, Users, ScanLine, TruckIcon,
  ChevronRight, ArrowUpCircle, Target, Sparkles, Brain, RefreshCw
} from 'lucide-react';

// shadcn/ui components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Dashboard({ onNavigate, profile }) {
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
      } catch (e) { console.error('Dashboard load error:', e); }
    }
    setLoading(false);
  };

  const CURRENCY = profile?.currency_symbol || '₹';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Synchronizing Data...</p>
        </div>
      </div>
    );
  }

  const s = stats || {
    todaySalesTotal: 0, todaySalesCount: 0,
    totalProducts: 0, lowStockCount: 0,
    expiringCount: 0, recentSales: []
  };

  return (
    <div className="flex flex-col gap-10 md:p-2 lg:p-4 animate-in">
      <header className="page-header">
        <div>
          <h2>Executive Overview</h2>
          <p>Real-time analytics for {profile?.business_name || 'your business'}</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={loadDashboard} 
            className="h-14 px-6 rounded-2xl gap-3 border-slate-200 text-slate-600 hover:bg-slate-50 transition-all active:scale-95"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            <span className="hidden md:inline">Refresh Stats</span>
          </Button>
          <Button onClick={() => onNavigate('billing')} className="btn-primary h-14 px-8 rounded-2xl gap-3 shadow-blue-500/20">
            <Plus size={20} strokeWidth={3} /> New Transaction
          </Button>
        </div>
      </header>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="metric-card group">
          <div className="metric-icon green group-hover:scale-110 transition-transform duration-500">
            <IndianRupee size={28} />
          </div>
          <div>
            <p className="metric-sub">Today's Sales</p>
            <h3 className="metric-value text-emerald-600">{CURRENCY}{(s.todaySalesTotal || 0).toLocaleString('en-IN')}</h3>
            <div className="mt-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Daily Performance</div>
          </div>
        </div>

        <div className="metric-card group">
          <div className="metric-icon blue group-hover:scale-110 transition-transform duration-500">
            <Target size={28} />
          </div>
          <div>
            <p className="metric-sub">Total Revenue</p>
            <h3 className="metric-value text-slate-900">{CURRENCY}{(s.totalRevenue || 0).toLocaleString('en-IN')}</h3>
            <div className="mt-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">All-time Sales</div>
          </div>
        </div>

        <div className="metric-card group">
          <div className="metric-icon teal group-hover:scale-110 transition-transform duration-500">
            <ShoppingCart size={28} />
          </div>
          <div>
            <p className="metric-sub">Bills Today</p>
            <h3 className="metric-value text-blue-600">{s.todaySalesCount || 0}</h3>
            <div className="mt-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Flow</div>
          </div>
        </div>

        <div className="metric-card group">
          <div className="metric-icon red group-hover:scale-110 transition-transform duration-500">
            <ArrowDownLeft size={28} />
          </div>
          <div>
            <p className="metric-sub">Pending Due</p>
            <h3 className="metric-value text-rose-600">{CURRENCY}{(s.receivable || 0).toLocaleString('en-IN')}</h3>
            <div className="mt-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Outstandings</div>
          </div>
        </div>
      </div>

      {/* Daily Cashflow Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 -mt-4">
        <div className="bg-emerald-50/50 border border-emerald-100 rounded-[2rem] p-6 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-1">Today's Cash</p>
            <h4 className="text-2xl font-black text-slate-900">{CURRENCY}{(s.todayCash || 0).toLocaleString('en-IN')}</h4>
          </div>
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-emerald-100">
            <Wallet size={20} className="text-emerald-600" />
          </div>
        </div>
        <div className="bg-blue-50/50 border border-blue-100 rounded-[2rem] p-6 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1">Today's Digital (UPI)</p>
            <h4 className="text-2xl font-black text-slate-900">{CURRENCY}{(s.todayDigital || 0).toLocaleString('en-IN')}</h4>
          </div>
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-blue-100">
            <ScanLine size={20} className="text-blue-600" />
          </div>
        </div>
        <div className="bg-amber-50/50 border border-amber-100 rounded-[2rem] p-6 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] mb-1">Today's Credit</p>
            <h4 className="text-2xl font-black text-slate-900">{CURRENCY}{(s.todayCredit || 0).toLocaleString('en-IN')}</h4>
          </div>
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-amber-100">
            <TrendingUp size={20} className="text-amber-600" />
          </div>
        </div>
      </div>

      {/* Business Position */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 -mt-4">
        <div className="bg-white border border-slate-100 rounded-[2rem] p-6 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Inventory Value</p>
            <h4 className="text-2xl font-black text-slate-900">{CURRENCY}{(s.inventoryValue || 0).toLocaleString('en-IN')}</h4>
          </div>
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100">
            <Package size={20} className="text-slate-700" />
          </div>
        </div>
        <div className="bg-white border border-slate-100 rounded-[2rem] p-6 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Total Profit</p>
            <h4 className={`text-2xl font-black ${(s.totalProfit || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {CURRENCY}{(s.totalProfit || 0).toLocaleString('en-IN')}
            </h4>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100">
            <ArrowUpCircle size={20} className="text-emerald-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Quick Insights */}
        <div className="lg:col-span-2 space-y-10">
          <Card className="rounded-[2.5rem] border-slate-100 shadow-xl shadow-slate-200/40">
            <CardHeader className="p-10 pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-black">Recent Transactions</CardTitle>
                <CardDescription className="text-base font-medium">Last 5 sales activities</CardDescription>
              </div>
              <Button variant="ghost" className="font-black gap-2 hover:bg-slate-50" onClick={() => onNavigate('reports')}>
                Full Report <ChevronRight size={16} />
              </Button>
            </CardHeader>
            <CardContent className="p-10 pt-0">
              {s.recentSales?.length > 0 ? (
                <div className="table-wrap border-none shadow-none">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="px-0">Invoice</th>
                        <th>Customer</th>
                        <th className="text-right">Amount</th>
                        <th className="text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {s.recentSales.map((sale) => (
                        <tr key={sale.id} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="px-0 py-6">
                            <Badge className="bg-slate-900 text-white font-black rounded-xl">#{sale.invoice_number}</Badge>
                          </td>
                          <td className="font-bold text-slate-900">{sale.customer_name || 'Counter Sale'}</td>
                          <td className="text-right font-black text-slate-900">
                            {CURRENCY}{sale.total_amount.toLocaleString('en-IN')}
                            {sale.returned_total > 0 && (
                              <div className="mt-1 text-[10px] font-black text-amber-500 uppercase tracking-widest">Adjusted Total</div>
                            )}
                          </td>
                          <td className="text-right text-slate-400 font-bold text-xs">
                            {new Date(sale.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                  <ShoppingCart size={48} strokeWidth={1} />
                  <p className="mt-4 font-bold">No recent sales data</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Action Sidebar */}
        <div className="space-y-10">
          <Card className="rounded-[2.5rem] border-slate-100 shadow-xl shadow-slate-200/40 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none overflow-hidden relative">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
             <CardHeader className="p-10 pb-4">
               <CardTitle className="text-xl font-black">Quick Actions</CardTitle>
               <CardDescription className="text-slate-400 font-bold">Most used features</CardDescription>
             </CardHeader>
             <CardContent className="p-10 pt-0 space-y-4">
                <Button onClick={() => onNavigate('purchases')} variant="secondary" className="w-full h-14 justify-start gap-4 rounded-2xl bg-white/10 hover:bg-white/20 border-none text-white font-black text-base">
                  <TruckIcon size={22} className="text-blue-400" /> Stock Inflow
                </Button>
                <Button onClick={() => onNavigate('parties')} variant="secondary" className="w-full h-14 justify-start gap-4 rounded-2xl bg-white/10 hover:bg-white/20 border-none text-white font-black text-base">
                  <Users size={22} className="text-emerald-400" /> Add Party
                </Button>
                <Button onClick={() => onNavigate('ai-upload')} variant="secondary" className="w-full h-14 justify-start gap-4 rounded-2xl bg-white/10 hover:bg-white/20 border-none text-white font-black text-base">
                  <ScanLine size={22} className="text-purple-400" /> AI Stock-in
                </Button>
             </CardContent>
          </Card>

          <Card className="rounded-[2.5rem] border-slate-100 shadow-xl shadow-slate-200/40">
             <CardHeader className="p-8 pb-2">
               <CardTitle className="text-lg font-black flex items-center gap-2">
                 <AlertTriangle size={18} className="text-amber-500" /> Restock Radar
               </CardTitle>
             </CardHeader>
             <CardContent className="p-8 pt-0 space-y-4">
                {stats?.lowStock?.length > 0 ? stats.lowStock.slice(0, 3).map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="min-w-0">
                      <p className="font-black text-sm text-slate-900 truncate">{item.product_name}</p>
                      <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{item.quantity} LEFT</p>
                    </div>
                    <Button onClick={() => onNavigate('purchases')} size="sm" variant="ghost" className="text-primary font-black hover:bg-blue-50">Add</Button>
                  </div>
                )) : (
                  <div className="py-10 text-center">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Check size={24} strokeWidth={3} />
                    </div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Inventory Clean</p>
                  </div>
                )}
             </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
