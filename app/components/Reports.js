'use client';
import { useState } from 'react';
import {
  FileBarChart, Download, Calendar, IndianRupee,
  ShoppingCart, Package, TruckIcon, TrendingUp, ArrowRight, Check, RotateCcw, X, User, Hash, AlertCircle, RotateCcw as ReturnIcon,
  Printer
} from 'lucide-react';
import { toast } from "sonner";
import { getInvoiceHTML } from './InvoiceTemplates';

// shadcn/ui components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

export default function Reports({ profile }) {
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
  const [savingReturn, setSavingReturn] = useState(false);

  const CURRENCY = profile?.currency_symbol || '₹';

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

  const handleInitiateSalesReturn = async (sale) => {
    if (typeof window === 'undefined' || !window.electronAPI) return;
    try {
      const fullSale = await window.electronAPI.sales.getByInvoice(sale.invoice_number);
      if (fullSale) {
        setSelectedSale(fullSale);
        setReturnItems(fullSale.items.map(item => ({
          ...item,
          return_qty: 0
        })));
        setReturnReason('');
        setShowSalesReturn(true);
      }
    } catch (e) { toast.error("Could not load sale details"); }
  };

  const handleInitiatePurchaseReturn = async (purchase) => {
    if (typeof window === 'undefined' || !window.electronAPI) return;
    try {
      const fullPurchase = await window.electronAPI.purchases.getById(purchase.id);
      if (fullPurchase) {
        setSelectedPurchase(fullPurchase);
        setReturnItems(fullPurchase.items.map(item => ({
          ...item,
          return_qty: 0
        })));
        setReturnReason('');
        setShowPurchaseReturn(true);
      }
    } catch (e) { toast.error("Could not load purchase details"); }
  };

  const updateSalesReturnQty = (productId, qty) => {
    setReturnItems(prev => prev.map(item => 
      item.product_id === productId ? { ...item, return_qty: Math.max(0, Math.min(item.quantity, qty)) } : item
    ));
  };

  const updatePurchaseReturnQty = (productName, qty) => {
    setReturnItems(prev => prev.map(item => 
      item.product_name === productName ? { ...item, return_qty: Math.max(0, Math.min(item.quantity, qty)) } : item
    ));
  };

  const handleSaveSalesReturn = async () => {
    const itemsToReturn = returnItems.filter(i => i.return_qty > 0);
    if (itemsToReturn.length === 0) {
      toast.error("Select at least one item to return");
      return;
    }
    setSavingReturn(true);
    try {
      const payload = {
        sale_id: selectedSale.id,
        invoice_number: selectedSale.invoice_number,
        reason: returnReason,
        items: itemsToReturn.map(i => ({
          product_id: i.product_id,
          product_name: i.product_name,
          quantity: i.return_qty,
          refund_amount: i.return_qty * i.price
        }))
      };
      await window.electronAPI.returns.create(payload);
      toast.success("Sales return successful!");
      setShowSalesReturn(false);
      fetchReport();
    } catch (e) { toast.error("Return failed: " + e.message); }
    setSavingReturn(false);
  };

  const handleSavePurchaseReturn = async () => {
    const itemsToReturn = returnItems.filter(i => i.return_qty > 0);
    if (itemsToReturn.length === 0) {
      toast.error("Select at least one item to return");
      return;
    }
    setSavingReturn(true);
    try {
      const payload = {
        purchase_id: selectedPurchase.id,
        party_id: selectedPurchase.party_id,
        supplier_name: selectedPurchase.supplier_name,
        reason: returnReason,
        items: itemsToReturn.map(i => ({
          product_name: i.product_name,
          quantity: i.return_qty,
          price: i.price
        }))
      };
      await window.electronAPI.purchaseReturns.create(payload);
      toast.success("Purchase return successful!");
      setShowPurchaseReturn(false);
      fetchReport();
    } catch (e) { toast.error("Return failed: " + e.message); }
    setSavingReturn(false);
  };
  const handlePrintInvoice = async (sale) => {
    if (typeof window === 'undefined' || !window.electronAPI) return;
    try {
      const fullSale = await window.electronAPI.sales.getByInvoice(sale.invoice_number);
      if (fullSale) {
        const html = getInvoiceHTML(buildInvoiceData(fullSale), profile);
        await window.electronAPI.ai.printInvoice(html);
        toast.success("Printing invoice...");
      }
    } catch (e) { 
      console.error(e);
      toast.error("Print failed: " + e.message); 
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
            toast.success("Exact invoice PDF downloaded!");
          }
        } else {
          toast.error("Failed to generate PDF");
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Download failed: " + e.message);
    }
    setPdfGenerating(false);
  };

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

  return (
    <div className="flex flex-col gap-8 md:p-2 lg:p-4 animate-in">
      <header className="page-header">
        <div>
          <h2>Business Intelligence</h2>
          <p>Extract actionable insights from your sales and inventory data</p>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setData(null); }} className="w-full">
        <TabsList className="flex w-fit p-1.5 bg-slate-100 rounded-2xl mb-10 border border-slate-200/50">
          <TabsTrigger value="sales" className="h-12 px-8 rounded-xl gap-3 font-black data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all">
            <ShoppingCart size={18} /> Sales Report
          </TabsTrigger>
          <TabsTrigger value="purchases" className="h-12 px-8 rounded-xl gap-3 font-black data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all">
            <TruckIcon size={18} /> Purchase Report
          </TabsTrigger>
          <TabsTrigger value="monthly" className="h-12 px-8 rounded-xl gap-3 font-black data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all">
            <FileBarChart size={18} /> Monthly Stats
          </TabsTrigger>
          <TabsTrigger value="stock" className="h-12 px-8 rounded-xl gap-3 font-black data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all">
            <Package size={18} /> Inventory Status
          </TabsTrigger>
        </TabsList>

        <div className="space-y-10">
          {/* Filtering Section */}
          {(activeTab === 'sales' || activeTab === 'purchases') && (
            <Card className="rounded-[2.5rem] border-slate-100 shadow-xl shadow-slate-200/40 overflow-visible">
              <CardContent className="p-10 flex flex-col md:flex-row items-end justify-between gap-8">
                <div className="flex flex-col md:flex-row gap-8 flex-1">
                  <div className="form-group mb-0 flex-1">
                    <label className="form-label">Analysis Start Date</label>
                    <div className="relative">
                      <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="form-input pl-12 h-14" />
                    </div>
                  </div>
                  <div className="form-group mb-0 flex-1">
                    <label className="form-label">Analysis End Date</label>
                    <div className="relative">
                      <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="form-input pl-12 h-14" />
                    </div>
                  </div>
                </div>
                <Button onClick={fetchReport} disabled={loading} className="btn-primary h-14 px-10 rounded-2xl gap-3 min-w-[200px]">
                  {loading ? 'Processing...' : <><FileBarChart size={20} /> Run Analysis</>}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Report Data Views */}
          {data ? (
            <div className="space-y-10 animate-in">
              {/* Metrics */}
              {(activeTab === 'sales' || activeTab === 'purchases') && (
                <div className="metric-grid">
                  <div className="metric-card">
                    <div className="metric-icon teal"><IndianRupee size={24} /></div>
                    <div>
                      <p className="metric-sub">Total {activeTab === 'sales' ? 'Revenue' : 'Investment'}</p>
                      <h3 className="metric-value">{CURRENCY}{(data.summary?.total || 0).toLocaleString('en-IN')}</h3>
                    </div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-icon blue"><TrendingUp size={24} /></div>
                    <div>
                      <p className="metric-sub">Transactions</p>
                      <h3 className="metric-value">{data.summary?.count || 0} Records</h3>
                    </div>
                  </div>
                  {activeTab === 'sales' && (
                    <>
                      <div className="metric-card">
                        <div className="metric-icon blue"><Wallet size={24} /></div>
                        <div>
                          <p className="metric-sub">Cash Received</p>
                          <h3 className="metric-value">{CURRENCY}{(data.summary?.cash_received || 0).toLocaleString('en-IN')}</h3>
                        </div>
                      </div>
                      <div className="metric-card">
                        <div className="metric-icon green"><TrendingUp size={24} /></div>
                        <div>
                          <p className="metric-sub">Net Profit</p>
                          <h3 className="metric-value text-emerald-600">
                            {CURRENCY}{(data.summary?.profit || 0).toLocaleString('en-IN')}
                          </h3>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Data Table */}
              <div className="table-wrap">
                {activeTab === 'sales' && (
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
                      {data.sales?.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                          <td>
                            <div className="font-black text-primary">#{s.invoice_number}</div>
                            <div className="text-[11px] font-bold text-slate-400 mt-0.5">{new Date(s.date).toLocaleDateString('en-IN')}</div>
                          </td>
                          <td className="font-bold text-slate-900">{s.customer_name || 'Counter Sale'}</td>
                          <td className="text-right font-medium text-slate-500">{CURRENCY}{s.total_gst?.toLocaleString()}</td>
                          <td className="text-right font-black text-slate-900 text-base">{CURRENCY}{s.total_amount?.toLocaleString()}</td>
                          <td className="text-center">
                            <Badge variant="outline" className="rounded-xl font-black bg-slate-50">{s.payment_mode}</Badge>
                          </td>
                          <td className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleDownloadPDF(s)} 
                                disabled={pdfGenerating}
                                className="text-blue-600 font-black gap-2 hover:bg-blue-50"
                              >
                                <Download size={14} /> PDF
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handlePrintInvoice(s)} 
                                className="text-slate-600 font-black gap-2 hover:bg-slate-100"
                              >
                                <Printer size={14} /> Print
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleInitiateSalesReturn(s)} className="text-rose-600 font-black gap-2 hover:bg-rose-50">
                                <RotateCcw size={14} /> Return
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTab === 'purchases' && (
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Supplier</th>
                        <th className="text-right">Investment</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.purchases?.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="font-bold text-slate-900">{new Date(p.date).toLocaleDateString('en-IN')}</td>
                          <td className="font-bold text-slate-600">{p.supplier_name || 'Generic Vendor'}</td>
                          <td className="text-right font-black text-rose-600 text-lg">{CURRENCY}{p.total_amount?.toLocaleString()}</td>
                          <td className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleInitiatePurchaseReturn(p)} className="text-rose-600 font-black gap-2 hover:bg-rose-50">
                              <RotateCcw size={14} /> Return
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTab === 'monthly' && (
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
                      {data.map((m) => (
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
                )}

                {activeTab === 'stock' && (
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
                      {data.map((p) => (
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
                )}
              </div>
            </div>
          ) : (
            <div className="empty-state bg-white border border-slate-100 rounded-[3rem] p-24 shadow-sm">
              <div className="w-24 h-24 bg-slate-50 text-slate-200 rounded-[2rem] flex items-center justify-center mb-8">
                <FileBarChart size={48} strokeWidth={1.5} />
              </div>
              <h3 className="text-2xl font-black text-slate-900">Ready for Analysis</h3>
              <p className="text-slate-400 font-bold max-w-sm mb-10">Select your parameters above to generate high-fidelity business reports</p>
              {(activeTab === 'stock' || activeTab === 'monthly') && (
                <Button onClick={fetchReport} className="btn-primary h-16 px-10 rounded-2xl gap-3">
                  <Check size={20} strokeWidth={3} /> Generate Report Now
                </Button>
              )}
            </div>
          )}
        </div>
      </Tabs>

      {/* Sales Return Modal */}
      <Dialog open={showSalesReturn} onOpenChange={setShowSalesReturn}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden border-none shadow-2xl rounded-[3rem] bg-white">
          <DialogHeader className="p-10 bg-slate-900 text-white">
            <DialogTitle className="text-2xl font-black flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center">
                <RotateCcw size={24} className="text-blue-400" />
              </div>
              Sales Return — #{selectedSale?.invoice_number}
            </DialogTitle>
            <DialogDescription className="text-slate-400 font-bold text-base mt-2">
              Process returns to inventory and calculate refund amounts
            </DialogDescription>
          </DialogHeader>

          <div className="p-10 space-y-8 max-h-[60vh] overflow-y-auto bg-slate-50/30">
            <div className="table-wrap border-slate-200 shadow-none rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="p-4 text-left font-black text-slate-400 text-[10px] uppercase">Item</th>
                    <th className="p-4 text-center font-black text-slate-400 text-[10px] uppercase w-20">Sold</th>
                    <th className="p-4 text-center font-black text-slate-400 text-[10px] uppercase w-24">Return</th>
                    <th className="p-4 text-right font-black text-slate-400 text-[10px] uppercase w-24">Refund</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {returnItems.map((item) => (
                    <tr key={item.product_id} className="bg-white">
                      <td className="p-4">
                        <p className="font-black text-slate-900">{item.product_name}</p>
                        <p className="text-[11px] font-bold text-slate-400 mt-0.5">Rate: {CURRENCY}{item.price}</p>
                      </td>
                      <td className="p-4 text-center font-black text-slate-400">{item.quantity}</td>
                      <td className="p-4">
                        <Input 
                          type="number" 
                          className="h-10 text-center font-black rounded-xl border-slate-200" 
                          value={item.return_qty} 
                          onChange={(e) => updateSalesReturnQty(item.product_id, parseInt(e.target.value) || 0)} 
                          max={item.quantity}
                          min={0}
                        />
                      </td>
                      <td className="p-4 text-right font-black text-slate-900 text-base">
                        {CURRENCY}{(item.price * item.return_qty).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="form-group">
              <label className="form-label">Internal Return Note</label>
              <Input 
                placeholder="Reason for return (e.g. Defective, Wrong size)" 
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="form-input h-14"
              />
            </div>
          </div>

          <DialogFooter className="p-10 bg-white border-t flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-center sm:text-left">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Estimated Refund</p>
              <p className="text-4xl font-black text-blue-600 tracking-tight">
                {CURRENCY}{returnItems.reduce((sum, i) => sum + (i.price * i.return_qty), 0).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <Button variant="outline" className="font-black h-14 px-8 rounded-2xl flex-1 sm:flex-none" onClick={() => setShowSalesReturn(false)}>Cancel</Button>
              <Button className="btn-primary h-14 px-10 rounded-2xl flex-1 sm:flex-none gap-2" onClick={handleSaveSalesReturn} disabled={savingReturn}>
                {savingReturn ? 'Processing...' : <><RotateCcw size={18} strokeWidth={3} /> Complete Return</>}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
