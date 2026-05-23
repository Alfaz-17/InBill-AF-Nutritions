'use client';
import { useState, useEffect } from 'react';
import {
  FileBarChart, Download, Calendar, IndianRupee,
  ShoppingCart, Package, Truck, TrendingUp, ArrowRight, Check, RotateCcw, X, User, Hash, AlertCircle, RotateCcw as ReturnIcon,
  Printer, Wallet, Brain, Sparkles, RefreshCw, MessageCircle, Download as DownloadIcon, Trash2
} from 'lucide-react';
import { getInvoiceHTML } from './InvoiceTemplates';
import { getSalesReportHTML, getStockReportHTML, getPurchaseReportHTML } from './ReportTemplates';
import { useToast } from './ToastProvider';

// Recharts for visual elements
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';

// shadcn/ui components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

export default function Reports({ profile }) {
  const { toast, confirm } = useToast();
  const [activeTab, setActiveTab] = useState('sales');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  
  // Return Modal States
  const [showSalesReturn, setShowSalesReturn] = useState(false);
  const [showPurchaseReturn, setShowPurchaseReturn] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [returnReason, setReturnReason] = useState('');
  const [returnPaymentMode, setReturnPaymentMode] = useState('Credit');
  const [savingReturn, setSavingReturn] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const CURRENCY = profile?.currency_symbol || '₹';

  useEffect(() => {
    fetchReport();
  }, [activeTab, fromDate, toDate]);

  const buildInvoiceData = (fullSale) => ({
    invoiceNumber: fullSale.invoice_number,
    customer_name: fullSale.customer_name,
    customer_phone: fullSale.customer_phone,
    customer_address: fullSale.customer_address,
    date: new Date(fullSale.date).toLocaleDateString('en-IN'),
    cart: fullSale.items || [],
    subtotal: fullSale.subtotal || (fullSale.total_amount - (fullSale.total_gst || 0)),
    totalGst: fullSale.total_gst || 0,
    grandTotal: fullSale.total_amount,
    paidAmount: fullSale.paid_amount,
    dueAmount: fullSale.due_amount,
    paymentMode: fullSale.payment_mode
  });

  const handlePrintInvoice = async (sale) => {
    if (typeof window === 'undefined' || !window.electronAPI) return;
    try {
      const fullSale = await window.electronAPI.sales.getByInvoice(sale.invoice_number);
      if (fullSale) {
        const html = getInvoiceHTML(buildInvoiceData(fullSale), profile);
        await window.electronAPI.ai.printInvoice(html);
        toast("Printing invoice...", "success");
      }
    } catch (e) { 
      console.error(e);
      toast("Print failed: " + e.message, "error"); 
    }
  };

  const handleDownloadPDF = async (sale) => {
    if (typeof window === 'undefined' || !window.electronAPI || pdfGenerating) return;
    setPdfGenerating(true);
    try {
      const fullSale = await window.electronAPI.sales.getByInvoice(sale.invoice_number);
      if (fullSale) {
        const html = getInvoiceHTML(buildInvoiceData(fullSale), profile);
        const res = await window.electronAPI.pdf.generate(html);
        if (res.success) {
          const saveResult = await window.electronAPI.pdf.saveAs(res.buffer, `Invoice_${fullSale.invoice_number}.pdf`);
          if (saveResult.success) {
            toast("Exact invoice PDF downloaded!", "success");
          }
        } else {
          toast("Failed to generate PDF", "error");
        }
      }
    } catch (e) {
      console.error(e);
      toast("Error generating PDF", "error");
    }
    setPdfGenerating(false);
  };

  const fetchReport = async () => {
    if (typeof window === 'undefined' || !window.electronAPI) return;
    setLoading(true);
    setData(null); // Clear stale data immediately to prevent schema mismatch crashes
    setCurrentPage(1);
    try {
      let result;
      if (activeTab === 'sales') {
        result = await window.electronAPI.reports.sales(fromDate, toDate);
      } else if (activeTab === 'purchases') {
        result = await window.electronAPI.reports.purchases(fromDate, toDate);
      } else if (activeTab === 'stock') {
        result = await window.electronAPI.reports.stock();
      } else if (activeTab === 'monthly') {
        result = await window.electronAPI.stats.getMonthly();
      } else if (activeTab === 'returns') {
        result = await window.electronAPI.returns.getAllSaleReturns();
      }
      setData(result);
    } catch (e) {
      console.error(e);
      toast.error("Failed to fetch report");
    }
    setLoading(false);
  };

  const handleDownloadReportPDF = async () => {
    if (!data || pdfGenerating) return;
    setPdfGenerating(true);
    try {
      let html;
      let filename;
      if (activeTab === 'sales') {
        html = getSalesReportHTML(data, profile, fromDate, toDate);
        filename = `Sales_Report_${fromDate}_to_${toDate}.pdf`;
      } else if (activeTab === 'stock') {
        html = getStockReportHTML(data, profile);
        filename = `Stock_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      } else if (activeTab === 'purchases') {
        html = getPurchaseReportHTML(data, profile, fromDate, toDate);
        filename = `Purchase_Report_${fromDate}_to_${toDate}.pdf`;
      }
      
      const res = await window.electronAPI.pdf.generate(html);
      if (res.success) {
        await window.electronAPI.pdf.saveAs(res.buffer, filename);
        toast("Report Saved Successfully!", "success");
      }
    } catch (e) {
      console.error(e);
      toast("Error generating PDF", "error");
    }
    setPdfGenerating(false);
  };

  const openReturnModal = async (record, type) => {
    if (type === 'sale') {
      const fullSale = await window.electronAPI.sales.getByInvoice(record.invoice_number);
      if (fullSale) {
        setSelectedSale(fullSale);
        const items = fullSale.items.map(item => {
          const returned = item.returned_quantity || 0;
          const available = item.quantity - returned;
          return {
            ...item,
            available_qty: available,
            quantity: available // Auto-select full available quantity
          };
        });
        setReturnItems(items);
        setShowSalesReturn(true);
      }
    } else {
      const fullPurchase = await window.electronAPI.purchases.getById(record.id);
      setSelectedPurchase(fullPurchase || record);
      const items = ((fullPurchase || record).items || []).map(i => ({ 
        ...i, 
        available_qty: Math.max(0, (i.quantity || 0) - (i.returned_quantity || 0)), 
        quantity: Math.max(0, (i.quantity || 0) - (i.returned_quantity || 0)) // Auto-select full remaining quantity
      }));
      setReturnItems(items);
      setShowPurchaseReturn(true);
    }
    setReturnReason('');
    setReturnPaymentMode('Cash');
  };
  const handleCreateSaleReturn = async () => {
    const itemsToReturn = returnItems.filter(i => i.quantity > 0);
    if (itemsToReturn.length === 0) return;
    setSavingReturn(true);
    try {
      const totalAmount = itemsToReturn.reduce((sum, i) => sum + (i.quantity * i.price), 0);
      const res = await window.electronAPI.returns.createSaleReturn({
        sale_id: selectedSale.id,
        party_id: selectedSale.party_id,
        total_amount: totalAmount,
        payment_mode: returnPaymentMode, // Explicit refund method
        items: itemsToReturn.map(i => ({
          product_id: i.product_id,
          product_name: i.product_name,
          quantity: i.quantity,
          price: i.price
        })),
        reason: returnReason
      });
      if (res.success) {
        toast("Return processed successfully!", "success");
        setShowSalesReturn(false);
        fetchReport();
      } else {
        toast(res.error || "Failed to process return", "error");
      }
    } catch (e) {
      toast("Error: " + e.message, "error");
    }
    setSavingReturn(false);
  };

  const handleCreatePurchaseReturn = async () => {
    const itemsToReturn = returnItems.filter(i => i.quantity > 0);
    if (itemsToReturn.length === 0) return;
    setSavingReturn(true);
    try {
      const totalAmount = itemsToReturn.reduce((sum, i) => sum + (i.quantity * i.price), 0);
      const res = await window.electronAPI.returns.createPurchaseReturn({
        purchase_id: selectedPurchase.id,
        party_id: selectedPurchase.party_id,
        total_amount: totalAmount,
        payment_mode: returnPaymentMode,
        items: itemsToReturn.map(i => ({
          product_id: i.product_id,
          product_name: i.product_name,
          quantity: i.quantity,
          price: i.price
        })),
        reason: returnReason
      });
      if (res.success) {
        toast("Return processed successfully!", "success");
        setShowPurchaseReturn(false);
        fetchReport();
      } else {
        toast(res.error || "Failed to process return", "error");
      }
    } catch (e) {
      toast("Error: " + e.message, "error");
    }
    setSavingReturn(false);
  };  return (
    <div className="flex flex-col gap-4 p-1 md:gap-10 md:p-4">
      <header className="page-header mb-4 md:mb-7">
        <div>
          <h2 className="text-xl md:text-3xl font-black tracking-tight text-slate-900">Business Intelligence</h2>
          <p className="text-xs md:text-sm text-slate-400 font-bold">Extract actionable insights from your sales and inventory data</p>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setData(null); }} className="w-full">
        <TabsList className="flex w-full md:w-fit overflow-x-auto whitespace-nowrap scrollbar-none p-1 bg-slate-100/80 rounded-xl mb-6 md:mb-10 border border-slate-200/40 shadow-inner flex-nowrap justify-start gap-1">
          <TabsTrigger value="sales" className="h-10 px-4 md:h-12 md:px-8 text-xs md:text-sm rounded-lg md:rounded-xl gap-2 md:gap-3 font-black data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md transition-all shrink-0">
            <ShoppingCart size={15} /> Sales
          </TabsTrigger>
          <TabsTrigger value="purchases" className="h-10 px-4 md:h-12 md:px-8 text-xs md:text-sm rounded-lg md:rounded-xl gap-2 md:gap-3 font-black data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md transition-all shrink-0">
            <Truck size={15} /> Purchases
          </TabsTrigger>
          <TabsTrigger value="stock" className="h-10 px-4 md:h-12 md:px-8 text-xs md:text-sm rounded-lg md:rounded-xl gap-2 md:gap-3 font-black data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md transition-all shrink-0">
            <Package size={15} /> Inventory
          </TabsTrigger>
          <TabsTrigger value="monthly" className="h-10 px-4 md:h-12 md:px-8 text-xs md:text-sm rounded-lg md:rounded-xl gap-2 md:gap-3 font-black data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md transition-all shrink-0">
            <FileBarChart size={15} /> Stats
          </TabsTrigger>
          <TabsTrigger value="returns" className="h-10 px-4 md:h-12 md:px-8 text-xs md:text-sm rounded-lg md:rounded-xl gap-2 md:gap-3 font-black data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-md transition-all shrink-0">
            <RotateCcw size={15} /> Returns
          </TabsTrigger>
        </TabsList>

        <div className="space-y-6 md:space-y-10">
          {(activeTab === 'sales' || activeTab === 'purchases') && (
            <Card className="rounded-xl md:rounded-[2.5rem] border-slate-100 shadow-md md:shadow-xl shadow-slate-200/40 overflow-visible">
              <CardContent className="p-4 md:p-10 flex flex-col md:flex-row items-stretch md:items-end justify-between gap-4 md:gap-8">
                <div className="flex flex-col sm:flex-row gap-3 md:gap-8 flex-1">
                  <div className="form-group mb-0 flex-1">
                    <label className="form-label text-[9px] md:text-[10px] font-bold">Analysis Start Date</label>
                    <div className="relative">
                      <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="form-input pl-10 h-12 md:h-14 text-sm" />
                    </div>
                  </div>
                  <div className="form-group mb-0 flex-1">
                    <label className="form-label text-[9px] md:text-[10px] font-bold">Analysis End Date</label>
                    <div className="relative">
                      <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="form-input pl-10 h-12 md:h-14 text-sm" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2.5 w-full md:w-auto">
                  <Button onClick={fetchReport} disabled={loading} className="btn-primary h-12 md:h-14 px-6 md:px-10 rounded-xl md:rounded-2xl gap-2 md:gap-3 flex-1 md:flex-none text-xs md:text-sm font-black">
                    {loading ? 'Processing...' : <><FileBarChart size={18} /> Run Analysis</>}
                  </Button>
                  {data && (activeTab === 'sales' || activeTab === 'stock' || activeTab === 'purchases') && (
                    <Button 
                      onClick={handleDownloadReportPDF} 
                      disabled={pdfGenerating}
                      variant="outline" 
                      className="h-12 md:h-14 px-4 md:px-10 rounded-xl md:rounded-2xl gap-2 md:gap-3 border-slate-200 text-slate-700 hover:bg-slate-50 font-black text-xs md:text-sm flex-none"
                    >
                      <Download size={18} className="text-blue-600" /> 
                      <span>Export PDF</span>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {data ? (
            <div className="space-y-6 md:space-y-10 animate-in">
              {activeTab === 'monthly' && (
                <Card className="rounded-xl md:rounded-[2.5rem] border-slate-100 shadow-md md:shadow-xl shadow-slate-200/40 overflow-hidden">
                  <CardHeader className="p-4 md:p-10 pb-2">
                    <CardTitle className="text-lg md:text-xl font-black">Performance Visualization</CardTitle>
                    <CardDescription className="text-xs md:text-base font-bold text-slate-400">Cash Inflow vs Outflow Trend</CardDescription>
                  </CardHeader>
                  <CardContent className="p-2 md:p-10 h-[260px] md:h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={Array.isArray(data) ? data : []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontWeight: 'bold', fontSize: 10}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontWeight: 'bold', fontSize: 10}} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', padding: '10px' }}
                          itemStyle={{ fontWeight: 'black', fontSize: 11 }}
                        />
                        <Area type="monotone" dataKey="sales" name="Sales" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                        <Area type="monotone" dataKey="purchases" name="Stock Inflow" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorPurchases)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {(activeTab === 'sales' || activeTab === 'purchases' || activeTab === 'stock') && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 mb-6">
                  {(activeTab === 'sales' || activeTab === 'purchases') && (
                    <>
                      <div className="bg-white p-3 md:p-5 rounded-xl md:rounded-3xl border border-slate-100 flex flex-row md:flex-col items-center md:items-start gap-3 md:gap-4 shadow-sm hover:shadow-xl transition-all duration-300 min-w-0">
                        <div className="metric-icon teal shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-2xl flex items-center justify-center text-primary-foreground"><IndianRupee size={16} className="md:w-6 md:h-6" /></div>
                        <div className="min-w-0">
                          <p className="metric-sub text-[9px] md:text-xs text-slate-400 font-bold uppercase tracking-wider">Total {activeTab === 'sales' ? 'Revenue' : 'Investment'}</p>
                          <h3 className="text-sm md:text-2xl lg:text-3xl font-black tracking-tight text-slate-900 break-words truncate">{CURRENCY}{(data?.summary?.total || 0).toLocaleString('en-IN')}</h3>
                        </div>
                      </div>
                      <div className="bg-white p-3 md:p-5 rounded-xl md:rounded-3xl border border-slate-100 flex flex-row md:flex-col items-center md:items-start gap-3 md:gap-4 shadow-sm hover:shadow-xl transition-all duration-300 min-w-0">
                        <div className="metric-icon blue shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-2xl flex items-center justify-center text-primary-foreground"><TrendingUp size={16} className="md:w-6 md:h-6" /></div>
                        <div className="min-w-0">
                          <p className="metric-sub text-[9px] md:text-xs text-slate-400 font-bold uppercase tracking-wider">Transactions</p>
                          <h3 className="text-sm md:text-2xl lg:text-3xl font-black tracking-tight text-slate-900 break-words truncate">{data?.summary?.count || 0} Recs</h3>
                        </div>
                      </div>
                    </>
                  )}
                  {activeTab === 'stock' && (
                    <>
                      <div className="bg-white p-3 md:p-5 rounded-xl md:rounded-3xl border border-slate-100 flex flex-row md:flex-col items-center md:items-start gap-3 md:gap-4 shadow-sm hover:shadow-xl transition-all duration-300 min-w-0">
                        <div className="metric-icon teal shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-2xl flex items-center justify-center text-primary-foreground"><Wallet size={16} className="md:w-6 md:h-6" /></div>
                        <div className="min-w-0">
                          <p className="metric-sub text-[9px] md:text-xs text-slate-400 font-bold uppercase tracking-wider">Total Stock (at Cost)</p>
                          <h3 className="text-sm md:text-2xl lg:text-3xl font-black tracking-tight text-slate-900 break-words truncate">{CURRENCY}{(Array.isArray(data) ? data.reduce((sum, p) => sum + (p.quantity * (p.cost_price || 0)), 0) : 0).toLocaleString('en-IN')}</h3>
                        </div>
                      </div>
                      <div className="bg-white p-3 md:p-5 rounded-xl md:rounded-3xl border border-slate-100 flex flex-row md:flex-col items-center md:items-start gap-3 md:gap-4 shadow-sm hover:shadow-xl transition-all duration-300 min-w-0">
                        <div className="metric-icon green shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-2xl flex items-center justify-center text-primary-foreground"><IndianRupee size={16} className="md:w-6 md:h-6" /></div>
                        <div className="min-w-0">
                          <p className="metric-sub text-[9px] md:text-xs text-slate-400 font-bold uppercase tracking-wider">Potential Revenue</p>
                          <h3 className="text-sm md:text-2xl lg:text-3xl font-black tracking-tight text-emerald-600 break-words truncate">{CURRENCY}{(Array.isArray(data) ? data.reduce((sum, p) => sum + (p.quantity * (p.selling_price || 0)), 0) : 0).toLocaleString('en-IN')}</h3>
                        </div>
                      </div>
                    </>
                  )}
                  {activeTab === 'sales' && (
                    <>
                      <div className="bg-white p-3 md:p-5 rounded-xl md:rounded-3xl border border-slate-100 flex flex-row md:flex-col items-center md:items-start gap-3 md:gap-4 shadow-sm hover:shadow-xl transition-all duration-300 min-w-0 col-span-2 lg:col-span-1">
                        <div className="metric-icon blue shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-2xl flex items-center justify-center text-primary-foreground"><Wallet size={16} className="md:w-6 md:h-6" /></div>
                        <div className="min-w-0 flex-1">
                          <p className="metric-sub text-[9px] md:text-xs text-slate-400 font-bold uppercase tracking-wider">Total Cash Inflow</p>
                          <h3 className="text-sm md:text-2xl lg:text-3xl font-black tracking-tight text-slate-900 break-words truncate">{CURRENCY}{(data?.summary?.cash_received || 0).toLocaleString('en-IN')}</h3>
                          <div className="hidden lg:block mt-2 text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">
                            S: {CURRENCY}{data?.summary?.sales_cash?.toLocaleString()} | P: {CURRENCY}{data?.summary?.party_collections?.toLocaleString()} | R: -{CURRENCY}{data?.summary?.actualRefund?.toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="bg-white p-3 md:p-5 rounded-xl md:rounded-3xl border border-slate-100 flex flex-row md:flex-col items-center md:items-start gap-3 md:gap-4 shadow-sm hover:shadow-xl transition-all duration-300 min-w-0 col-span-2 lg:col-span-1">
                        <div className="metric-icon green shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-2xl flex items-center justify-center text-primary-foreground"><TrendingUp size={16} className="md:w-6 md:h-6" /></div>
                        <div className="min-w-0">
                          <p className="metric-sub text-[9px] md:text-xs text-slate-400 font-bold uppercase tracking-wider">Net Profit</p>
                          <h3 className="text-sm md:text-2xl lg:text-3xl font-black tracking-tight text-emerald-600 break-words truncate">{CURRENCY}{(data?.summary?.profit || 0).toLocaleString('en-IN')}</h3>
                          <div className="hidden lg:block mt-2 text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">Calculated Net</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="table-wrap border-none md:border md:border-border bg-transparent md:bg-card shadow-none md:shadow-lg">
                {activeTab === 'sales' && (
                  <>
                    {/* Desktop View */}
                    <div className="hidden md:block">
                      <table>
                        <thead>
                          <tr>
                            <th>Invoice</th>
                            <th>Customer</th>
                            <th className="text-right">Tax (GST)</th>
                            <th className="text-right">Amount</th>
                            <th className="text-center">Method</th>
                            <th className="text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {(Array.isArray(data?.sales) ? data.sales : []).slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((s) => (
                            <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                              <td>
                                <div className="font-black text-primary">#{s.invoice_number}</div>
                                {s.returned_total > 0 && (
                                  <Badge className="bg-orange-100 text-orange-600 text-[9px] font-black uppercase h-4 px-1.5 rounded-md border-orange-200">Returned</Badge>
                                )}
                                <div className="text-[11px] font-bold text-slate-400 mt-0.5">{new Date(s.date).toLocaleDateString('en-IN')}</div>
                              </td>
                              <td className="font-bold text-slate-900">{s.customer_name || 'Counter Sale'}</td>
                              <td className="text-right font-medium text-slate-500">{CURRENCY}{s.total_gst?.toLocaleString()}</td>
                              <td className="text-right font-black text-slate-900 text-base">{CURRENCY}{(s.total_amount - (s.returned_total || 0)).toLocaleString()}</td>
                              <td className="text-center">
                                <Badge variant="outline" className="rounded-xl font-black bg-slate-50">{s.payment_mode}</Badge>
                              </td>
                              <td className="text-right">
                                <div className="flex justify-end gap-1.5">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={async () => {
                                      if (!s) return;
                                      const total = (s.total_amount || 0) - (s.returned_total || 0);
                                      const invoiceUrl = `${window.location.origin}/api/invoice/${encodeURIComponent(s.invoice_number)}`;
                                      const msg = `Hello ${s.customer_name || 'Customer'},\n\nYour invoice *#${s.invoice_number || ''}* for *${CURRENCY}${total.toLocaleString()}* from *${profile?.business_name || 'InBill'}* is ready.\n\n📄 View & Download Invoice:\n${invoiceUrl}\n\nThank you for your business! 🙏`;
                                      const phone = s.customer_phone || '';
                                      if (!phone) {
                                        toast("No phone number found for this customer", "info");
                                        return;
                                      }
                                      window.open(`https://wa.me/${phone.length === 10 ? '91' + phone : phone}?text=${encodeURIComponent(msg)}`, '_blank');
                                    }}
                                    className="h-9 w-9 p-0 text-emerald-600 hover:bg-emerald-50 rounded-xl"
                                    title="Share on WhatsApp"
                                  >
                                    <MessageCircle size={16} />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => handleDownloadPDF(s)} 
                                    disabled={pdfGenerating}
                                    className="h-9 w-9 p-0 text-blue-600 hover:bg-blue-50 rounded-xl"
                                    title="Download PDF"
                                  >
                                    <DownloadIcon size={16} />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => handlePrintInvoice(s)} 
                                    className="h-9 w-9 p-0 text-slate-600 hover:bg-slate-50 rounded-xl"
                                    title="Print Invoice"
                                  >
                                    <Printer size={16} />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => openReturnModal(s, 'sale')} 
                                    className="h-9 px-3 text-orange-600 font-bold gap-2 hover:bg-orange-50 rounded-xl"
                                  >
                                    <RotateCcw size={14} /> Return
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile View */}
                    <div className="block md:hidden space-y-3 px-1">
                      {(Array.isArray(data?.sales) ? data.sales : []).slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((s) => {
                        const total = s.total_amount - (s.returned_total || 0);
                        return (
                          <div key={s.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-2.5">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="font-black text-primary text-sm">#{s.invoice_number}</span>
                                {s.returned_total > 0 && (
                                  <Badge className="ml-2 bg-orange-100 text-orange-600 text-[8px] font-black uppercase h-4 px-1.5 rounded-md border-orange-200">Returned</Badge>
                                )}
                                <div className="text-[10px] font-bold text-slate-400 mt-0.5">{new Date(s.date).toLocaleDateString('en-IN')}</div>
                              </div>
                              <Badge variant="outline" className="rounded-lg font-black bg-slate-50/50 text-[10px] py-0.5 px-2">{s.payment_mode}</Badge>
                            </div>
                            
                            <div className="flex justify-between items-center py-0.5">
                              <div>
                                <div className="font-bold text-slate-800 text-sm">{s.customer_name || 'Counter Sale'}</div>
                                {s.customer_phone && <div className="text-[10px] font-medium text-slate-400">{s.customer_phone}</div>}
                              </div>
                              <div className="text-right">
                                <div className="text-[10px] text-slate-400 font-bold">Net Total</div>
                                <div className="font-black text-slate-900 text-base">{CURRENCY}{total.toLocaleString()}</div>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between pt-2.5 border-t border-slate-100/80 gap-2">
                              <span className="text-[10px] font-bold text-slate-400">GST: {CURRENCY}{s.total_gst?.toLocaleString()}</span>
                              <div className="flex items-center gap-1.5">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={async () => {
                                    if (!s) return;
                                    const invoiceUrl = `${window.location.origin}/api/invoice/${encodeURIComponent(s.invoice_number)}`;
                                    const msg = `Hello ${s.customer_name || 'Customer'},\n\nYour invoice *#${s.invoice_number || ''}* for *${CURRENCY}${total.toLocaleString()}* from *${profile?.business_name || 'InBill'}* is ready.\n\n📄 View & Download Invoice:\n${invoiceUrl}\n\nThank you for your business! 🙏`;
                                    const phone = s.customer_phone || '';
                                    if (!phone) {
                                      toast("No phone number found for this customer", "info");
                                      return;
                                    }
                                    window.open(`https://wa.me/${phone.length === 10 ? '91' + phone : phone}?text=${encodeURIComponent(msg)}`, '_blank');
                                  }}
                                  className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-50 rounded-lg flex items-center justify-center"
                                  title="WhatsApp"
                                >
                                  <MessageCircle size={14} />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleDownloadPDF(s)} 
                                  disabled={pdfGenerating}
                                  className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center justify-center"
                                  title="PDF"
                                >
                                  <DownloadIcon size={14} />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handlePrintInvoice(s)} 
                                  className="h-8 w-8 p-0 text-slate-600 hover:bg-slate-50 rounded-lg flex items-center justify-center"
                                  title="Print"
                                >
                                  <Printer size={14} />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => openReturnModal(s, 'sale')} 
                                  className="h-8 px-2 text-[11px] text-orange-600 font-black gap-1 hover:bg-orange-50 rounded-lg border border-orange-100"
                                >
                                  <RotateCcw size={11} /> Return
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {activeTab === 'sales' && Array.isArray(data?.sales) && data.sales.length > itemsPerPage && (
                  <div className="p-4 md:p-6 bg-slate-50/50 border-t rounded-b-2xl flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <p className="text-xs font-bold text-slate-400">
                      Showing {Math.min(Array.isArray(data?.sales) ? data.sales.length : 0, (currentPage - 1) * itemsPerPage + 1)} - {Math.min(Array.isArray(data?.sales) ? data.sales.length : 0, currentPage * itemsPerPage)} of {Array.isArray(data?.sales) ? data.sales.length : 0} invoices
                    </p>
                    <div className="flex gap-2 items-center w-full sm:w-auto justify-center">
                      <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="h-10 px-4 rounded-xl font-bold border-slate-200">Prev</Button>
                      <span className="flex items-center px-4 font-black text-sm text-slate-700 min-w-[90px] justify-center">Page {currentPage}</span>
                      <Button variant="outline" size="sm" disabled={currentPage * itemsPerPage >= (Array.isArray(data?.sales) ? data.sales.length : 0)} onClick={() => setCurrentPage(p => p + 1)} className="h-10 px-4 rounded-xl font-bold border-slate-200">Next</Button>
                    </div>
                  </div>
                )}

                {activeTab === 'purchases' && (
                  <>
                    {/* Desktop View */}
                    <div className="hidden md:block">
                      <table>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Supplier</th>
                            <th className="text-right">Investment</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {(Array.isArray(data?.purchases) ? data.purchases : []).slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                              <td className="font-bold text-slate-500">{new Date(p.date).toLocaleDateString('en-IN')}</td>
                              <td className="font-bold text-slate-900">{p.supplier_name || 'Generic Vendor'}</td>
                              <td className="text-right font-black text-rose-600 text-lg">
                                <div className="flex items-center justify-end gap-4">
                                  <span>{CURRENCY}{p.total_amount?.toLocaleString()}</span>
                                  <div className="flex items-center gap-2">
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => openReturnModal(p, 'purchase')} 
                                      className="text-orange-600 font-black gap-2 hover:bg-orange-50 h-10 px-4 rounded-xl"
                                    >
                                      <RotateCcw size={14} /> Return
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={async () => {
                                        const ok = await confirm({
                                          title: "Delete Purchase?",
                                          message: "Are you sure? This will reverse stock and supplier balance.",
                                          confirmText: "Delete",
                                          type: "danger"
                                        });
                                        if(ok) {
                                          const res = await window.electronAPI.purchases.delete(p.id);
                                          if(res.success) {
                                            toast("Purchase deleted!", "success");
                                            fetchReport();
                                          }
                                        }
                                      }} 
                                      className="text-rose-600 font-black gap-2 hover:bg-rose-50 h-10 px-4 rounded-xl"
                                    >
                                      <Trash2 size={14} /> Delete
                                    </Button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile View */}
                    <div className="block md:hidden space-y-3 px-1">
                      {(Array.isArray(data?.purchases) ? data.purchases : []).slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((p) => (
                        <div key={p.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-2.5">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-black text-slate-800 text-sm">{p.supplier_name || 'Generic Vendor'}</div>
                              <div className="text-[10px] font-bold text-slate-400 mt-0.5">{new Date(p.date).toLocaleDateString('en-IN')}</div>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 font-bold block">Investment</span>
                              <span className="font-black text-rose-600 text-sm md:text-base">{CURRENCY}{p.total_amount?.toLocaleString()}</span>
                            </div>
                          </div>
                          
                          <div className="flex justify-end items-center pt-2.5 border-t border-slate-100/80 gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => openReturnModal(p, 'purchase')} 
                              className="text-orange-600 font-black gap-1 hover:bg-orange-50 h-8 px-2.5 text-[11px] rounded-lg border border-orange-100"
                            >
                              <RotateCcw size={11} /> Return
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={async () => {
                                const ok = await confirm({
                                  title: "Delete Purchase?",
                                  message: "Are you sure? This will reverse stock and supplier balance.",
                                  confirmText: "Delete",
                                  type: "danger"
                                });
                                if(ok) {
                                  const res = await window.electronAPI.purchases.delete(p.id);
                                  if(res.success) {
                                    toast("Purchase deleted!", "success");
                                    fetchReport();
                                  }
                                }
                              }} 
                              className="text-rose-600 font-black gap-1 hover:bg-rose-50 h-8 px-2.5 text-[11px] rounded-lg border border-rose-100"
                            >
                              <Trash2 size={11} /> Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {activeTab === 'returns' && (
                  <>
                    {/* Desktop View */}
                    <div className="hidden md:block">
                      <table>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Invoice #</th>
                            <th>Customer</th>
                            <th className="text-right">Return Value</th>
                            <th>Reason</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {(Array.isArray(data) ? data : []).map((r) => (
                            <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                              <td className="font-bold text-slate-500">{new Date(r.date).toLocaleDateString('en-IN')}</td>
                              <td className="font-black text-slate-900">#{r.invoice_number || 'N/A'}</td>
                              <td className="font-bold text-slate-600">{r.customer_name || 'Generic'}</td>
                              <td className="text-right font-black text-orange-600">{CURRENCY}{r.total_amount?.toLocaleString()}</td>
                              <td className="text-xs font-bold text-slate-400 italic">{r.reason || 'No reason provided'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile View */}
                    <div className="block md:hidden space-y-3 px-1">
                      {(Array.isArray(data) ? data : []).map((r) => (
                        <div key={r.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-1.5">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-black text-slate-800 text-sm">Invoice #{r.invoice_number || 'N/A'}</span>
                              <div className="text-[10px] font-bold text-slate-400 mt-0.5">{new Date(r.date).toLocaleDateString('en-IN')}</div>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 font-bold block">Refunded</span>
                              <span className="font-black text-orange-600 text-sm md:text-base">{CURRENCY}{r.total_amount?.toLocaleString()}</span>
                            </div>
                          </div>
                          <div className="flex flex-col pt-2 border-t border-slate-100/80">
                            <span className="text-xs font-bold text-slate-700">Customer: {r.customer_name || 'Generic'}</span>
                            <span className="text-[11px] font-semibold text-slate-400 italic mt-0.5">Reason: {r.reason || 'No reason provided'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {activeTab === 'monthly' && (
                  <>
                    {/* Desktop View */}
                    <div className="hidden md:block">
                      <table>
                        <thead>
                          <tr>
                            <th>Month</th>
                            <th className="text-right">Sales</th>
                            <th className="text-right">Stock-In</th>
                            <th className="text-right">Expenses</th>
                            <th className="text-center">Bills</th>
                            <th className="text-right">Net Flow</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {(Array.isArray(data) ? data : []).map((m) => (
                            <tr key={m.month} className="hover:bg-slate-50 transition-colors">
                              <td className="font-black text-slate-900">{m.month}</td>
                              <td className="text-right font-bold text-emerald-600">{CURRENCY}{m.sales?.toLocaleString()}</td>
                              <td className="text-right font-bold text-rose-500">{CURRENCY}{m.purchases?.toLocaleString()}</td>
                              <td className="text-right font-bold text-slate-400">{CURRENCY}{m.expenses?.toLocaleString()}</td>
                              <td className="text-center"><Badge className="bg-slate-100 text-slate-600 font-black">{m.salesCount} Invoices</Badge></td>
                              <td className={`text-right font-black text-lg ${m.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {m.profit >= 0 ? '+' : ''}{CURRENCY}{m.profit?.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile View */}
                    <div className="block md:hidden space-y-3 px-1">
                      {(Array.isArray(data) ? data : []).map((m) => (
                        <div key={m.month} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-2">
                          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                            <span className="font-black text-slate-800 text-sm">{m.month}</span>
                            <Badge className="bg-slate-100 text-slate-600 font-black text-[9px] py-0.5 px-2">{m.salesCount} Bills</Badge>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-1 py-1 text-center">
                            <div className="border-r border-slate-100 last:border-0">
                              <span className="text-[9px] font-bold text-slate-400 uppercase block">Sales</span>
                              <span className="text-xs font-bold text-emerald-600">{CURRENCY}{m.sales?.toLocaleString()}</span>
                            </div>
                            <div className="border-r border-slate-100 last:border-0">
                              <span className="text-[9px] font-bold text-slate-400 uppercase block">Stock-In</span>
                              <span className="text-xs font-bold text-rose-500">{CURRENCY}{m.purchases?.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase block">Expenses</span>
                              <span className="text-xs font-bold text-slate-500">{CURRENCY}{m.expenses?.toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="flex justify-between items-center pt-2 border-t border-slate-100/80">
                            <span className="text-[10px] text-slate-400 font-bold">Net Flow</span>
                            <span className={`font-black text-sm ${m.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {m.profit >= 0 ? '+' : ''}{CURRENCY}{m.profit?.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {activeTab === 'stock' && (
                  <>
                    {/* Desktop View */}
                    <div className="hidden md:block">
                      <table>
                        <thead>
                          <tr>
                            <th>Product Details</th>
                            <th>Category</th>
                            <th className="text-center">Stock</th>
                            <th className="text-right">Price</th>
                            <th className="text-right">Condition</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {(Array.isArray(data) ? data : []).map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                              <td>
                                <div className="font-black text-slate-900">{p.product_name}</div>
                                <div className="text-[11px] font-bold text-slate-400 mt-0.5">{p.brand} • {p.batch_number || 'No Batch'}</div>
                              </td>
                              <td><Badge variant="outline" className="font-black border-slate-200">{p.category || 'General'}</Badge></td>
                              <td className="text-center font-black text-lg">{p.quantity}</td>
                              <td className="text-right font-bold text-slate-900">{CURRENCY}{p.selling_price?.toLocaleString()}</td>
                              <td className="text-right">
                                <Badge className={`rounded-xl font-black ${
                                  p.quantity <= 0 ? 'bg-rose-500' : p.quantity <= 10 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}>
                                  {p.quantity <= 0 ? 'REPLENISH' : p.quantity <= 10 ? 'LOW STOCK' : 'OPTIMAL'}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile View */}
                    <div className="block md:hidden space-y-3 px-1">
                      {(Array.isArray(data) ? data : []).map((p) => (
                        <div key={p.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-2.5">
                          <div className="flex justify-between items-start">
                            <div className="min-w-0 flex-1 pr-2">
                              <div className="font-black text-slate-800 text-sm truncate">{p.product_name}</div>
                              <div className="text-[10px] font-bold text-slate-400 mt-0.5 truncate">{p.brand} • {p.batch_number || 'No Batch'}</div>
                            </div>
                            <Badge variant="outline" className="font-black border-slate-200 text-[9px] py-0.5 px-2 shrink-0">{p.category || 'General'}</Badge>
                          </div>

                          <div className="flex justify-between items-center pt-2.5 border-t border-slate-100/80 gap-2">
                            <div className="flex flex-col">
                              <span className="text-[9px] text-slate-400 font-bold">Selling Price</span>
                              <span className="text-xs md:text-sm font-bold text-slate-800">{CURRENCY}{p.selling_price?.toLocaleString()}</span>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <span className="text-[9px] text-slate-400 font-bold block">Available</span>
                                <span className="text-sm md:text-base font-black text-slate-900">{p.quantity}</span>
                              </div>
                              <Badge className={`rounded-lg font-black text-[9px] px-2 py-1 shrink-0 ${
                                p.quantity <= 0 ? 'bg-rose-500' : p.quantity <= 10 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}>
                                {p.quantity <= 0 ? 'REPLENISH' : p.quantity <= 10 ? 'LOW' : 'OPTIMAL'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="empty-state bg-white border border-slate-100 rounded-2xl md:rounded-[3rem] p-10 md:p-24 shadow-sm">
              <div className="w-16 h-16 md:w-24 md:h-24 bg-slate-50 text-slate-200 rounded-[1.25rem] md:rounded-[2rem] flex items-center justify-center mb-6 md:mb-8 mx-auto">
                <FileBarChart size={36} className="md:hidden" strokeWidth={1.5} />
                <FileBarChart size={48} className="hidden md:block" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg md:text-2xl font-black text-slate-900">Ready for Analysis</h3>
              <p className="text-xs md:text-base text-slate-400 font-bold max-w-sm mb-6 md:mb-10 mx-auto">Select your parameters above to generate high-fidelity business reports</p>
              {(activeTab === 'stock' || activeTab === 'monthly') && (
                <Button onClick={fetchReport} className="btn-primary h-12 md:h-16 px-6 md:px-10 rounded-xl md:rounded-2xl gap-2 md:gap-3 text-xs md:text-sm font-black mx-auto block">
                  <Check size={16} strokeWidth={3} className="inline mr-1" /> Generate Report Now
                </Button>
              )}
            </div>
          )}
        </div>
      </Tabs>

      {/* Sales Return Modal */}
      <Dialog open={showSalesReturn} onOpenChange={setShowSalesReturn}>
        <DialogContent className="max-w-2xl rounded-xl md:rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
          <div className="max-h-[92vh] flex flex-col">
            <DialogHeader className="p-4 md:p-10 pb-4 md:pb-6 bg-white sticky top-0 z-10 border-b border-slate-50">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-lg md:text-2xl font-black flex items-center gap-2 md:gap-4">
                    <div className="p-2 md:p-3 bg-orange-100 text-orange-600 rounded-xl md:rounded-2xl"><RotateCcw size={18} className="md:w-6 md:h-6" /></div>
                    Process Sales Return
                  </DialogTitle>
                  <DialogDescription className="text-xs md:text-base font-bold text-slate-400 mt-1 md:mt-2">
                    Invoice #{selectedSale?.invoice_number} • {selectedSale?.customer_name || 'Counter Sale'}
                  </DialogDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const newItems = returnItems.map(i => ({ ...i, quantity: i.available_qty }));
                    setReturnItems(newItems);
                  }}
                  className="rounded-lg md:rounded-xl border-orange-200 text-orange-600 font-black hover:bg-orange-50 h-8 md:h-10 px-3 md:px-4 text-xs"
                >
                  Return All
                </Button>
              </div>
            </DialogHeader>
  
            <div className="flex-1 overflow-y-auto p-4 md:p-10 pt-4 md:pt-6 custom-scrollbar">
              <div className="space-y-4 md:space-y-8">
                {selectedSale?.due_amount > 0 && (
                  <div className="bg-blue-50 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-blue-100">
                    <div className="flex items-center gap-2 text-blue-800 mb-1 md:mb-2">
                      <AlertCircle size={16} />
                      <span className="font-black text-xs md:text-sm">Active Credit Found</span>
                    </div>
                    <p className="text-xs font-bold text-blue-600">
                      This sale has outstanding due of <span className="text-blue-900">{CURRENCY}{selectedSale.due_amount}</span>. 
                      Returns will prioritize clearing this debt first.
                    </p>
                  </div>
                )}
  
                <div className="bg-slate-50 rounded-2xl md:rounded-3xl p-4 md:p-6 border border-slate-100">
                  <h4 className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-3 md:mb-4">Select Items to Return</h4>
                  <div className="space-y-3">
                    {returnItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white p-3 md:p-4 rounded-xl md:rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="font-black text-slate-900 text-xs md:text-sm truncate">{item.product_name}</div>
                          <div className="text-[9px] md:text-[10px] font-black text-emerald-600 uppercase tracking-wider">
                            Available: {item.available_qty}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number" 
                            min="0" 
                            max={item.available_qty}
                            value={item.quantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              const newItems = [...returnItems];
                              newItems[idx].quantity = Math.min(val, item.available_qty);
                              setReturnItems(newItems);
                            }}
                            className="w-16 h-10 md:w-20 md:h-12 text-center font-black rounded-lg md:rounded-xl border-slate-200 focus:border-orange-500 text-xs md:text-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
  
                <div className="form-group mb-4">
                  <label className="form-label text-slate-900 text-[10px] font-black uppercase">Refund Method</label>
                  <div className="flex gap-2">
                    {['Cash', 'UPI', 'Credit'].map((mode) => (
                      <Button
                        key={mode}
                        type="button"
                        variant={returnPaymentMode === mode ? 'default' : 'outline'}
                        onClick={() => setReturnPaymentMode(mode)}
                        className={`flex-1 h-11 md:h-14 rounded-xl md:rounded-2xl font-black text-xs md:text-sm transition-all ${
                          returnPaymentMode === mode 
                            ? 'bg-orange-600 text-white shadow-md md:shadow-xl shadow-orange-200 border-transparent scale-[1.01]' 
                            : 'text-slate-500 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {mode}
                      </Button>
                    ))}
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 mt-2 px-1 italic">
                    {returnPaymentMode === 'Credit' 
                      ? `✓ Will clear up to ${CURRENCY}${Math.min(selectedSale?.due_amount || 0, returnItems.reduce((sum, i) => sum + (i.quantity * i.price), 0))} debt and any extra as Store Credit.` 
                      : `✓ This will record a ${returnPaymentMode} refund. Customer's balance of ${CURRENCY}{selectedSale?.due_amount || 0} will NOT change.`}
                  </p>
                </div>
  
                <div className="form-group">
                  <label className="form-label text-[10px] font-black uppercase">Reason for Return</label>
                  <textarea 
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    placeholder="e.g. Damaged product, Customer changed mind..."
                    className="form-input min-h-[80px] md:min-h-[100px] py-2.5 md:py-4 rounded-xl md:rounded-3xl text-xs md:text-sm"
                  />
                </div>
  
                <div className="flex flex-col gap-2 md:gap-4 bg-orange-50/70 p-4 md:p-8 rounded-2xl md:rounded-3xl border border-orange-100 shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-orange-900 font-black text-sm md:text-lg">Total Return Value</span>
                    <span className="text-base md:text-2xl font-black text-orange-600">
                      {CURRENCY}{returnItems.reduce((sum, i) => sum + (i.quantity * i.price), 0).toLocaleString()}
                    </span>
                  </div>
  
                  <div className="pt-2 md:pt-4 border-t border-orange-200/50 space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-orange-800/70">
                      <span>1. Debt To Clear (Automatic)</span>
                      <span className="text-orange-900 font-black">
                        {CURRENCY}{Math.min(selectedSale?.due_amount || 0, returnItems.reduce((sum, i) => sum + (i.quantity * i.price), 0)).toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center text-xs font-bold text-orange-800/70">
                      <span>2. Net Refund ({returnPaymentMode})</span>
                      <span className="text-orange-900 font-black">
                        {CURRENCY}{Math.max(0, returnItems.reduce((sum, i) => sum + (i.quantity * i.price), 0) - (selectedSale?.due_amount || 0)).toLocaleString()}
                      </span>
                    </div>
                  </div>
  
                  <p className="text-[9px] text-center font-black uppercase tracking-tighter text-orange-400 mt-1 italic">
                    {returnPaymentMode === 'Credit' 
                      ? "✓ Balance will be added as Store Credit to customer ledger" 
                      : `✓ You are only paying ${CURRENCY}${Math.max(0, returnItems.reduce((sum, i) => sum + (i.quantity * i.price), 0) - (selectedSale?.due_amount || 0)).toLocaleString()} in ${returnPaymentMode}`}
                  </p>
                </div>
              </div>
            </div>
  
            <DialogFooter className="p-4 md:p-10 pt-4 md:pt-6 bg-white border-t border-slate-50 sticky bottom-0 z-10 gap-2 md:gap-4 flex flex-row items-center justify-end">
              <Button variant="ghost" onClick={() => setShowSalesReturn(false)} className="h-11 md:h-14 px-6 md:px-8 rounded-xl md:rounded-2xl font-black text-slate-500 text-xs md:text-sm">Cancel</Button>
              <Button 
                onClick={handleCreateSaleReturn} 
                disabled={savingReturn || returnItems.every(i => i.quantity === 0)}
                className="h-11 md:h-14 px-6 md:px-10 bg-orange-600 hover:bg-orange-700 text-white rounded-xl md:rounded-2xl font-black gap-2 text-xs md:text-sm shadow-md md:shadow-xl shadow-orange-200"
              >
                {savingReturn ? 'Processing...' : <><Check size={16} /> Finalize Return</>}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Purchase Return Modal */}
      <Dialog open={showPurchaseReturn} onOpenChange={setShowPurchaseReturn}>
        <DialogContent className="max-w-2xl rounded-xl md:rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
          <div className="max-h-[92vh] flex flex-col">
            <DialogHeader className="p-4 md:p-10 pb-4 md:pb-6 bg-white sticky top-0 z-10 border-b border-slate-50">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-lg md:text-2xl font-black flex items-center gap-2 md:gap-4">
                    <div className="p-2 md:p-3 bg-orange-100 text-orange-600 rounded-xl md:rounded-2xl"><RotateCcw size={18} className="md:w-6 md:h-6" /></div>
                    Process Purchase Return
                  </DialogTitle>
                  <DialogDescription className="text-xs md:text-base font-bold text-slate-400 mt-1 md:mt-2">
                    Send items back to supplier for Purchase #{selectedPurchase?.id}
                  </DialogDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const newItems = returnItems.map(i => ({ ...i, quantity: i.available_qty }));
                    setReturnItems(newItems);
                  }}
                  className="rounded-lg md:rounded-xl border-orange-200 text-orange-600 font-black hover:bg-orange-50 h-8 md:h-10 px-3 md:px-4 text-xs"
                >
                  Return All
                </Button>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-4 md:p-10 pt-4 md:pt-6 custom-scrollbar">
              <div className="space-y-4 md:space-y-8">
                {selectedPurchase?.due_amount > 0 && (
                  <div className="bg-emerald-50 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-emerald-100">
                    <div className="flex items-center gap-2 text-emerald-800 mb-1 md:mb-2">
                      <AlertCircle size={16} />
                      <span className="font-black text-xs md:text-sm">Supplier Credit Available</span>
                    </div>
                    <p className="text-xs font-bold text-emerald-600">
                      You currently owe this supplier <span className="text-emerald-900">{CURRENCY}{selectedPurchase.due_amount}</span>. 
                      Returns will prioritize clearing this debt first.
                    </p>
                  </div>
                )}

                <div className="bg-slate-50 rounded-2xl md:rounded-3xl p-4 md:p-6 border border-slate-100">
                  <h4 className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-3 md:mb-4">Select Items to Return</h4>
                  <div className="space-y-3">
                    {returnItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white p-3 md:p-4 rounded-xl md:rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="font-black text-slate-900 text-xs md:text-sm truncate">{item.product_name}</div>
                          <div className="text-[9px] md:text-[10px] font-black text-orange-600 uppercase tracking-wider">
                            Original: {item.available_qty}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number" 
                            min="0" 
                            max={item.available_qty}
                            value={item.quantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              const newItems = [...returnItems];
                              newItems[idx].quantity = Math.min(val, item.available_qty);
                              setReturnItems(newItems);
                            }}
                            className="w-16 h-10 md:w-20 md:h-12 text-center font-black rounded-lg md:rounded-xl border-slate-200 focus:border-orange-500 text-xs md:text-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-group mb-4">
                  <label className="form-label text-slate-900 text-[10px] font-black uppercase">Refund Type (How supplier pays back)</label>
                  <div className="flex gap-2">
                    {['Cash', 'UPI', 'Credit'].map((mode) => (
                      <Button
                        key={mode}
                        type="button"
                        variant={returnPaymentMode === mode ? 'default' : 'outline'}
                        onClick={() => setReturnPaymentMode(mode)}
                        className={`flex-1 h-11 md:h-14 rounded-xl md:rounded-2xl font-black text-xs md:text-sm transition-all ${
                          returnPaymentMode === mode 
                            ? 'bg-orange-600 text-white shadow-md md:shadow-xl shadow-orange-200 border-transparent scale-[1.01]' 
                            : 'text-slate-500 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {mode}
                      </Button>
                    ))}
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 mt-2 px-1 italic">
                    {returnPaymentMode === 'Credit' 
                      ? "✓ Balance will be deducted from your debt to this supplier in the Ledger." 
                      : `✓ Supplier gave you ${returnPaymentMode} back. Your ledger balance will only decrease by the debt cleared.`}
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label text-[10px] font-black uppercase">Return Reason</label>
                  <textarea 
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    placeholder="Reason for sending items back to supplier..."
                    className="form-input min-h-[80px] md:min-h-[100px] py-2.5 md:py-4 rounded-xl md:rounded-3xl text-xs md:text-sm"
                  />
                </div>

                <div className="flex flex-col gap-2 md:gap-4 bg-emerald-50/70 p-4 md:p-8 rounded-2xl md:rounded-3xl border border-emerald-100 shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-900 font-black text-sm md:text-lg">Total Return Value</span>
                    <span className="text-base md:text-2xl font-black text-emerald-600">
                      {CURRENCY}{returnItems.reduce((sum, i) => sum + (i.quantity * (i.price || 0)), 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="pt-2 md:pt-4 border-t border-emerald-200/50 space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-emerald-800/70">
                      <span>1. Supplier Debt To Clear</span>
                      <span className="text-emerald-900 font-black">
                        {CURRENCY}{Math.min(selectedPurchase?.due_amount || 0, returnItems.reduce((sum, i) => sum + (i.quantity * (i.price || 0)), 0)).toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center text-xs font-bold text-emerald-800/70">
                      <span>2. Cash/Refund Recieved</span>
                      <span className="text-emerald-900 font-black">
                        {CURRENCY}{Math.max(0, returnItems.reduce((sum, i) => sum + (i.quantity * (i.price || 0)), 0) - (selectedPurchase?.due_amount || 0)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="p-4 md:p-10 pt-4 md:pt-6 bg-white border-t border-slate-50 sticky bottom-0 z-10 gap-2 md:gap-4 flex flex-row items-center justify-end">
              <Button variant="ghost" onClick={() => setShowPurchaseReturn(false)} className="h-11 md:h-14 px-6 md:px-8 rounded-xl md:rounded-2xl font-black text-slate-500 text-xs md:text-sm">Cancel</Button>
              <Button 
                onClick={handleCreatePurchaseReturn} 
                disabled={savingReturn || returnItems.every(i => i.quantity === 0)}
                className="h-11 md:h-14 px-6 md:px-10 bg-orange-600 hover:bg-orange-700 text-white rounded-xl md:rounded-2xl font-black gap-2 text-xs md:text-sm shadow-md md:shadow-xl shadow-orange-200"
              >
                {savingReturn ? 'Processing...' : <><Check size={16} /> Confirm Stock Removal</>}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
