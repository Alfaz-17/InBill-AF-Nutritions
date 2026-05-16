'use client';
import { useState, useEffect, Fragment } from 'react';
import {
  Plus, Trash2, X, Check, TruckIcon, Search, ScanLine, 
  Calendar, CreditCard, ChevronDown, Package, IndianRupee,
  ChevronRight, Building2, User, ExternalLink, Settings2
} from 'lucide-react';
import { useToast } from './ToastProvider';

// shadcn/ui components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

import AIUpload from './AIUpload';

const emptyItem = { 
  product_name: '', 
  product_size: '', 
  quantity: '', 
  price: '', 
  last_price: null, 
  selling_price: '', 
  batch_number: '', 
  expiry_date: '',
  custom_fields: {} 
};

export default function Purchases({ profile }) {
  const { toast, confirm } = useToast();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [supplierName, setSupplierName] = useState('');
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [attributeDefs, setAttributeDefs] = useState([]);
  const [showAttrPopover, setShowAttrPopover] = useState(null); // {index}
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [details, setDetails] = useState({});
  const [paidAmount, setPaidAmount] = useState(0);
  const [viewMode, setViewMode] = useState('list');
  const [allProducts, setAllProducts] = useState([]);
  const [activeSuggestion, setActiveSuggestion] = useState({ row: null, query: '' });
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  const CURRENCY = profile?.currency_symbol || '₹';

  useEffect(() => { 
    loadPurchases();
    loadAllProducts();
    loadSuppliers();
    loadAttributeDefs();
  }, []);

  const loadAttributeDefs = async () => {
    if (typeof window !== 'undefined' && window.electronAPI?.attributes) {
      try {
        const data = await window.electronAPI.attributes.getAll();
        setAttributeDefs(data || []);
      } catch (e) { console.error(e); }
    }
  };

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
    setItems([...items, { ...emptyItem }]);
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
      product_size: product.product_size || '',
      price: product.cost_price || item.price,
      last_price: product.cost_price || null,
      selling_price: product.selling_price || '',
      batch_number: product.batch_number || '',
      expiry_date: product.expiry_date || '',
      custom_fields: typeof product.custom_fields === 'string' ? JSON.parse(product.custom_fields) : (product.custom_fields || {})
    } : item));
    setActiveSuggestion({ row: null, query: '' });
  };

  const handleSave = async () => {
    const validItems = items.filter(i => i.product_name.trim());
    if (validItems.length === 0) {
      toast('Please add at least one product with a name', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        party_id: selectedSupplier?.id,
        supplier_name: supplierName,
        total_amount: items.reduce((sum, i) => sum + (parseFloat(i.price) * parseInt(i.quantity) || 0), 0),
        paid_amount: paidAmount,
        other_charges: 0,
        items: validItems.map(i => ({
          product_name: i.product_name,
          product_size: i.product_size,
          quantity: parseInt(i.quantity) || 0,
          price: parseFloat(i.price) || 0,
          selling_price: parseFloat(i.selling_price) || 0,
          batch_number: i.batch_number,
          expiry_date: i.expiry_date,
          custom_fields: JSON.stringify(i.custom_fields || {})
        })),
      };
      const result = await window.electronAPI.purchases.create(payload);
      
      let msg = 'Purchase recorded!';
      if (result.createdCount > 0) msg += ` ${result.createdCount} new products.`;
      
      toast(msg, 'success');
      setShowModal(false);
      resetForm();
      loadPurchases();
    } catch (e) {
      toast('Error: ' + e.message, 'error');
    }
    setSaving(false);
  };

  const resetForm = () => {
    setSupplierName('');
    setSupplierSearch('');
    setSelectedSupplier(null);
    setItems([{ ...emptyItem }]);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (viewMode === 'ai') {
    return (
      <AIUpload 
        profile={profile}
        onBack={() => {
          setViewMode('list');
          loadPurchases();
        }} 
      />
    );
  }

  return (
    <div className="flex flex-col gap-8 md:p-2 lg:p-4 animate-in">
      <header className="page-header">
        <div>
          <h2>Stock Inflow</h2>
          <p>Record inventory replenishment and supplier purchase bills</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="h-14 px-6 rounded-2xl gap-3 font-black border-slate-200" onClick={() => setViewMode('ai')}>
            <ScanLine size={18} /> Scan with AI
          </Button>
          <Button onClick={() => setShowModal(true)} className="btn-primary h-14 px-8 rounded-2xl gap-3 shadow-blue-500/20">
            <Plus size={20} strokeWidth={3} /> New Stock Entry
          </Button>
        </div>
      </header>

      {/* Metrics */}
      <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-icon blue"><TruckIcon size={24} /></div>
          <div>
            <p className="metric-sub">Total Bills</p>
            <h3 className="metric-value">{purchases.length} Orders</h3>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon green"><IndianRupee size={24} /></div>
          <div>
            <p className="metric-sub">Stock Value</p>
            <h3 className="metric-value">{CURRENCY}{purchases.reduce((acc, p) => acc + p.total_amount, 0).toLocaleString('en-IN')}</h3>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon teal"><Calendar size={24} /></div>
          <div>
            <p className="metric-sub">Recent Activity</p>
            <h3 className="metric-value">{purchases.filter(p => new Date(p.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length} New Bills</h3>
          </div>
        </div>
      </div>

      {/* Search & Actions */}
      <div className="relative w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <Input 
          placeholder="Search by supplier or bill ID..." 
          className="form-input h-14 pl-12 rounded-2xl shadow-sm border-slate-200"
        />
      </div>

      {/* Purchase List */}
      <Card className="rounded-[2.5rem] border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
        <div className="table-wrap border-none shadow-none rounded-none">
          {purchases.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr>
                  <th>Purchase Date</th>
                  <th>Supplier / Vendor</th>
                  <th className="text-right">Investment</th>
                  <th className="text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {purchases.map((p) => (
                  <Fragment key={p.id}>
                    <tr onClick={() => toggleExpand(p.id)} className="group hover:bg-slate-50/50 transition-all cursor-pointer">
                      <td>
                        <div className="font-black text-slate-900">{new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ref: #BILL-{p.id}</div>
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center font-black">
                            {p.supplier_name?.[0] || 'V'}
                          </div>
                          <div className="font-bold text-slate-700">{p.supplier_name || 'Generic Vendor'}</div>
                        </div>
                      </td>
                      <td className="text-right">
                        <div className="font-black text-slate-900 text-lg">{CURRENCY}{p.total_amount.toLocaleString('en-IN')}</div>
                      </td>
                      <td className="text-right">
                        <Button variant="ghost" className="h-10 px-4 rounded-xl font-black gap-2 group-hover:bg-white group-hover:shadow-sm transition-all">
                          {expandedId === p.id ? 'Hide' : 'View'} <ChevronDown size={16} className={`transition-transform duration-300 ${expandedId === p.id ? 'rotate-180' : ''}`} />
                        </Button>
                      </td>
                    </tr>
                    {expandedId === p.id && details[p.id] && (
                      <tr key={`${p.id}-detail`} className="bg-slate-50/30">
                        <td colSpan={4} className="p-8">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in">
                            <div className="space-y-4">
                              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Bill Line Items</h4>
                              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                <table className="w-full text-xs">
                                  <thead className="bg-slate-50 border-b">
                                    <tr>
                                      <th className="p-3 text-left font-black">Product</th>
                                      <th className="p-3 text-center font-black">Qty</th>
                                      <th className="p-3 text-right font-black">Price</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y">
                                    {(details[p.id].items || []).map((item, idx) => (
                                      <tr key={idx}>
                                        <td className="p-3">
                                          <p className="font-bold text-slate-800">{item.product_name}</p>
                                          {item.batch_number && <p className="text-[10px] text-slate-400">Batch: {item.batch_number}</p>}
                                        </td>
                                        <td className="p-3 text-center font-black text-slate-500">{item.quantity}</td>
                                        <td className="p-3 text-right font-black text-slate-900">{CURRENCY}{item.price.toLocaleString()}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                            <div className="space-y-4">
                              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Order Summary</h4>
                              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                                <div className="flex justify-between text-sm">
                                  <span className="font-bold text-slate-500">Subtotal</span>
                                  <span className="font-black text-slate-900">{CURRENCY}{(p.total_amount - (p.other_charges || 0)).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="font-bold text-slate-500">Other Charges</span>
                                  <span className="font-black text-slate-900">+{CURRENCY}{(p.other_charges || 0).toLocaleString()}</span>
                                </div>
                                <div className="pt-3 border-t flex justify-between items-center">
                                  <span className="font-black text-slate-900">Paid In Full</span>
                                  <span className="text-xl font-black text-primary">{CURRENCY}{p.total_amount.toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 text-slate-300">
              <TruckIcon size={64} strokeWidth={1} />
              <p className="mt-4 font-black text-lg">No stock entries found</p>
              <Button variant="link" className="text-primary font-black mt-2" onClick={() => setShowModal(true)}>Record First Bill</Button>
            </div>
          )}
        </div>
      </Card>

      {/* New Purchase Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-[94vw] sm:max-w-6xl h-[92vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl rounded-[2.5rem] bg-white transition-all">
          <DialogHeader className="p-10 bg-slate-900 text-white">
            <DialogTitle className="text-2xl font-black flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-600/20">
                <TruckIcon size={24} />
              </div>
              Record Stock Inflow
            </DialogTitle>
            <DialogDescription className="text-slate-400 font-bold text-base mt-2">
              Update your inventory by recording supplier purchase bills
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-10 space-y-10 bg-slate-50/30">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2 space-y-10">
                {/* Supplier Info */}
                <Card className="rounded-[2rem] border-slate-100 shadow-sm">
                  <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="form-group mb-0">
                      <label className="form-label">Supplier / Vendor Name</label>
                      <div className="relative">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <Input 
                          placeholder="Search or enter supplier name..." 
                          className="h-14 pl-12 bg-white text-slate-900 border-slate-200 font-bold focus:border-blue-500 rounded-2xl shadow-sm transition-all"
                          value={supplierSearch}
                          onChange={(e) => {
                            setSupplierSearch(e.target.value);
                            setSupplierName(e.target.value);
                            setShowSupplierDropdown(true);
                          }}
                        />
                        {showSupplierDropdown && supplierSearch && (
                          <Card className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl shadow-2xl overflow-hidden border-slate-200 bg-white">
                             <ScrollArea className="h-48">
                               {suppliers.filter(s => s.name.toLowerCase().includes(supplierSearch.toLowerCase())).map(s => (
                                 <div key={s.id} className="p-4 hover:bg-blue-50 cursor-pointer flex justify-between items-center border-b border-slate-50 last:border-0 group transition-colors" onClick={() => {
                                   setSelectedSupplier(s);
                                   setSupplierSearch(s.name);
                                   setSupplierName(s.name);
                                   setShowSupplierDropdown(false);
                                 }}>
                                    <div>
                                      <div className="font-black text-slate-900 text-sm">{s.name}</div>
                                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{s.phone || 'No phone'}</div>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] font-black bg-emerald-50 text-emerald-600 border-emerald-100">
                                      Bal: {CURRENCY}{s.current_balance}
                                    </Badge>
                                 </div>
                               ))}
                             </ScrollArea>
                          </Card>
                        )}
                      </div>
                    </div>

                  </CardContent>
                </Card>

                {/* Items Table */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Line Items</h4>
                    <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl gap-2 font-black border-slate-200" onClick={addRow}>
                      <Plus size={14} strokeWidth={3} /> Add Row
                    </Button>
                  </div>
                  <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          <th className="p-4 text-left font-black w-1/3">Product Name</th>
                          <th className="p-4 text-center font-black w-20">Qty</th>
                          <th className="p-4 text-center font-black w-24">Cost</th>
                          <th className="p-4 text-center font-black w-24">Selling</th>
                          <th className="p-4 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-4 relative">
                                <Input 
                                  placeholder="Enter product name..." 
                                  className="h-10 font-bold border-none bg-transparent shadow-none focus:bg-white focus:shadow-sm text-slate-900 placeholder:text-slate-400"
                                  value={item.product_name}
                                  onChange={(e) => {
                                    updateRow(idx, 'product_name', e.target.value);
                                    setActiveSuggestion({ row: idx, query: e.target.value });
                                  }}
                                  onFocus={() => setActiveSuggestion({ row: idx, query: item.product_name })}
                                  onBlur={() => setTimeout(() => setActiveSuggestion({ row: -1, query: '' }), 200)}
                                />
                                {activeSuggestion.row === idx && activeSuggestion.query.length > 0 && (
                                  <Card className="absolute top-full left-0 w-[120%] z-[100] shadow-2xl border-slate-300 overflow-hidden bg-white mt-2 ring-2 ring-blue-100">
                                    <ScrollArea className="h-64 bg-white">
                                      {allProducts.filter(p => p.product_name.toLowerCase().includes(activeSuggestion.query.toLowerCase())).map(p => (
                                        <div key={p.id} className="p-4 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 flex justify-between items-center transition-colors group" onMouseDown={() => selectSuggestion(idx, p)}>
                                          <div className="flex flex-col gap-0.5">
                                            <p className="text-sm font-black text-slate-900">{p.product_name}</p>
                                            <div className="flex items-center gap-2">
                                              <Badge className="bg-slate-100 text-slate-500 font-bold text-[9px] px-1.5 py-0 border-none uppercase tracking-tight">
                                                {p.brand || 'No Brand'}
                                              </Badge>
                                              <span className="text-[10px] font-bold text-slate-400">Stock: {p.quantity}</span>
                                            </div>
                                          </div>
                                          <div className="text-right">
                                            <p className="text-xs font-black text-emerald-600">{CURRENCY}{p.cost_price}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">Cost Price</p>
                                          </div>
                                        </div>
                                      ))}
                                      {allProducts.filter(p => p.product_name.toLowerCase().includes(activeSuggestion.query.toLowerCase())).length === 0 && (
                                        <div className="p-8 text-center text-slate-400 font-bold italic text-sm">
                                          New Product — Press Tab to continue
                                        </div>
                                      )}
                                    </ScrollArea>
                                  </Card>
                                )}
                            </td>
                            <td className="p-4">
                              <Input 
                                type="number" 
                                className="h-10 text-center font-black border-none bg-transparent shadow-none focus:bg-white text-slate-900"
                                value={item.quantity}
                                onChange={(e) => updateRow(idx, 'quantity', e.target.value)}
                              />
                            </td>
                            <td className="p-4">
                              <div className="relative">
                                <Input 
                                  type="number" 
                                  className="h-10 text-center font-black border-none bg-transparent shadow-none focus:bg-white pr-6 text-slate-900"
                                  value={item.price}
                                  onChange={(e) => updateRow(idx, 'price', e.target.value)}
                                />
                                {item.last_price && (
                                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-400 whitespace-nowrap">
                                    Last: {CURRENCY}{item.last_price}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <Input 
                                type="number" 
                                className="h-10 text-center font-black border-none bg-transparent shadow-none focus:bg-white text-blue-600 font-bold"
                                value={item.selling_price}
                                onChange={(e) => updateRow(idx, 'selling_price', e.target.value)}
                              />
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className={`h-9 w-9 rounded-xl ${Object.keys(item.custom_fields || {}).length > 0 || item.batch_number ? 'text-blue-600 bg-blue-50 border border-blue-100' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}>
                                      <Settings2 size={16} />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-md rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
                                    <DialogHeader className="p-8 bg-slate-900 text-white">
                                      <DialogTitle className="font-black text-xl flex items-center gap-3">
                                        <Settings2 size={20} className="text-blue-400" /> Item Attributes
                                      </DialogTitle>
                                      <DialogDescription className="text-slate-400 font-bold">Set specific details for this stock entry</DialogDescription>
                                    </DialogHeader>
                                    <div className="p-8 space-y-6 bg-white">
                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Batch Number</label>
                                          <Input value={item.batch_number} onChange={(e) => updateRow(idx, 'batch_number', e.target.value)} className="h-12 font-bold rounded-xl" />
                                        </div>
                                        <div className="space-y-2">
                                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expiry Date</label>
                                          <Input type="date" value={item.expiry_date} onChange={(e) => updateRow(idx, 'expiry_date', e.target.value)} className="h-12 font-bold rounded-xl" />
                                        </div>
                                      </div>
                                      {attributeDefs.length > 0 && (
                                        <div className="space-y-4 pt-4 border-t border-slate-100">
                                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Custom Attributes</p>
                                          <div className="grid grid-cols-1 gap-4">
                                            {attributeDefs.map(def => (
                                              <div key={def.id} className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-600">{def.name}</label>
                                                <Input 
                                                  value={item.custom_fields[def.name] || ''} 
                                                  onChange={(e) => {
                                                    const newFields = { ...item.custom_fields, [def.name]: e.target.value };
                                                    updateRow(idx, 'custom_fields', newFields);
                                                  }}
                                                  className="h-10 font-medium rounded-lg"
                                                />
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </DialogContent>
                                </Dialog>
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50" onClick={() => removeRow(idx)}>
                                  <X size={18} strokeWidth={3} />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Inventory Sidebar */}
              <div className="space-y-6">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Inventory Snapshot</h4>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <Input 
                    placeholder="Quick find..." 
                    className="h-10 pl-9 rounded-xl text-xs" 
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                </div>
                <div className="space-y-3">
                  {allProducts.filter(p => !productSearch || p.product_name.toLowerCase().includes(productSearch.toLowerCase())).slice(0, 5).map(p => (
                    <div key={p.id} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm group cursor-pointer hover:border-blue-200 transition-all" onClick={() => {
                      const emptyRow = items.findIndex(i => !i.product_name);
                      const newItem = { ...emptyItem, product_name: p.product_name, price: p.cost_price, selling_price: p.selling_price, custom_fields: typeof p.custom_fields === 'string' ? JSON.parse(p.custom_fields) : (p.custom_fields || {}) };
                      if (emptyRow !== -1) {
                        const newItems = [...items];
                        newItems[emptyRow] = newItem;
                        setItems(newItems);
                      } else {
                        setItems([...items, newItem]);
                      }
                    }}>
                       <div className="font-black text-xs text-slate-700">{p.product_name}</div>
                       <div className="flex justify-between mt-2">
                         <span className="text-[10px] font-black text-slate-400 uppercase">Stock: {p.quantity}</span>
                         <span className="text-[10px] font-black text-primary">{CURRENCY}{p.cost_price}</span>
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-10 bg-white border-t flex items-center justify-between">
            <div className="flex items-center gap-10">
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Bill</p>
                  <p className="text-2xl font-black text-slate-900">
                    {CURRENCY}{(items.reduce((sum, i) => sum + (parseFloat(i.price) * parseInt(i.quantity) || 0), 0)).toLocaleString()}
                  </p>
               </div>
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Paid Amount</p>
                  <div className="flex items-center gap-3">
                    <Input 
                      type="number" 
                      className="h-12 w-32 font-black text-lg border-slate-200 rounded-xl"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                    />
                    <Button variant="ghost" size="sm" className="h-10 text-[10px] font-black uppercase text-blue-600 bg-blue-50" onClick={() => setPaidAmount(items.reduce((sum, i) => sum + (parseFloat(i.price) * parseInt(i.quantity) || 0), 0))}>
                      Full Pay
                    </Button>
                  </div>
               </div>
               {items.reduce((sum, i) => sum + (parseFloat(i.price) * parseInt(i.quantity) || 0), 0) - paidAmount > 0 && (
                 <div>
                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Due / Credit</p>
                    <p className="text-2xl font-black text-rose-600 tracking-tight">
                      {CURRENCY}{(items.reduce((sum, i) => sum + (parseFloat(i.price) * parseInt(i.quantity) || 0), 0) - paidAmount).toLocaleString()}
                    </p>
                 </div>
               )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="h-14 px-10 rounded-2xl font-black border-slate-200" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="btn-primary h-14 px-12 rounded-2xl gap-3 shadow-lg shadow-blue-500/20">
                {saving ? 'Processing...' : <><Check size={20} strokeWidth={3} /> Record Purchase</>}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
