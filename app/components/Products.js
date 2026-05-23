'use client';
import { useState, useEffect, useMemo, useDeferredValue } from 'react';
import {
  Plus, Search, Edit3, Trash2, X, Check, Package,
  AlertTriangle, Clock, Filter, Layers, Tag, Barcode, IndianRupee,
  Layout, Grid, List, ArrowUpRight, History
} from 'lucide-react';
import { useToast } from './ToastProvider';

// shadcn/ui components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const emptyProduct = {
  product_name: '', brand: '', category: '', product_size: '', unit: 'pcs',
  selling_price: '', cost_price: '', barcode: '',
  gst_rate: 0, cgst: 0, sgst: 0, quantity: '', min_stock_alert: 10, batch_number: '', expiry_date: '',
  custom_fields: {}
};

export default function Products({ profile }) {
  const { toast, confirm } = useToast();
  const [products, setProducts] = useState([]);
  
  const masterData = typeof profile?.master_data === 'string' 
    ? (JSON.parse(profile.master_data || '{}')) 
    : (profile?.master_data || {});
  
  const UNITS = masterData.units || ['pcs', 'box', 'kg'];
  const TAX_RATES = masterData.tax_rates || [0, 5, 12, 18, 28];
  const TAX_LABEL = masterData.tax_label || 'GST';
  const CURRENCY = profile?.currency_symbol || '₹';

  const [categories, setCategories] = useState([]);
  const [attributeDefs, setAttributeDefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingAttribute, setSavingAttribute] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [filterCat, setFilterCat] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [newAttrName, setNewAttrName] = useState('');
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...emptyProduct });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => { 
    loadProducts(); 
    loadCategories();
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

  const loadCategories = async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const data = await window.electronAPI.categories.getAll();
        setCategories(data || []);
      } catch (e) { console.error(e); }
    }
  };

  const loadProducts = async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const data = await window.electronAPI.products.getAll();
        setProducts(data || []);
      } catch (e) { console.error(e); }
    }
    setLoading(false);
  };

  const inventorySummary = useMemo(() => products.reduce((acc, p) => {
    acc.total += 1;
    if (p.quantity > 0 && p.quantity <= (p.min_stock_alert ?? 10)) acc.lowStock += 1;
    if (p.quantity <= 0) acc.outOfStock += 1;
    return acc;
  }, { total: 0, lowStock: 0, outOfStock: 0 }), [products]);

  const filtered = useMemo(() => {
    const q = deferredSearchTerm.trim().toLowerCase();
    return products.filter((p) => {
      const matchSearch = !q ||
      p.product_name.toLowerCase().includes(q) ||
      (p.brand && p.brand.toLowerCase().includes(q));
      const matchCat = filterCat === 'All' || p.category === filterCat;
      return matchSearch && matchCat;
    });
  }, [products, deferredSearchTerm, filterCat]);

  const categoryCounts = useMemo(() => products.reduce((acc, product) => {
    if (!product.category) return acc;
    acc[product.category] = (acc[product.category] || 0) + 1;
    return acc;
  }, {}), [products]);

  // Pagination Logic
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = useMemo(() => (
    filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  ), [filtered, currentPage]);

  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 on search/filter
  }, [searchTerm, filterCat]);

  const openAdd = () => {
    setEditId(null);
    setForm({ ...emptyProduct });
    setShowModal(true);
  };

  const openEdit = (p) => {
    let parsedFields = {};
    try {
      parsedFields = typeof p.custom_fields === 'string' ? JSON.parse(p.custom_fields) : (p.custom_fields || {});
    } catch (e) { console.error('Parse error', e); }

    setForm({
      product_name: p.product_name,
      brand: p.brand || '',
      category: p.category || '',
      product_size: p.product_size || '',
      unit: p.unit || 'pcs',
      selling_price: p.selling_price || '',
      cost_price: p.cost_price || '',
      barcode: p.barcode || '',
      gst_rate: p.gst_rate || 0,
      cgst: p.cgst ?? ((p.gst_rate || 0) / 2),
      sgst: p.sgst ?? ((p.gst_rate || 0) / 2),
      quantity: p.quantity || '',
      min_stock_alert: p.min_stock_alert ?? 10,
      batch_number: p.batch_number || '',
      expiry_date: p.expiry_date || '',
      custom_fields: parsedFields,
    });
    setEditId(p.id);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.product_name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        selling_price: parseFloat(form.selling_price) || 0,
        cost_price: parseFloat(form.cost_price) || 0,
        gst_rate: parseFloat(form.gst_rate) || 0,
        cgst: parseFloat(form.cgst) || 0,
        sgst: parseFloat(form.sgst) || 0,
        quantity: parseInt(form.quantity) || 0,
        min_stock_alert: parseInt(form.min_stock_alert) || 0,
        custom_fields: JSON.stringify(form.custom_fields || {})
      };
      if (editId) {
        await window.electronAPI.products.update(editId, payload);
        toast('Product updated successfully');
      } else {
        await window.electronAPI.products.add(payload);
        toast('New product added to inventory');
      }
      setShowModal(false);
      loadProducts();
    } catch (e) { toast('System error: ' + e.message, 'error'); }
    finally { setSaving(false); }
  };

  const commitAttributeDef = async () => {
    if (!newAttrName.trim()) return;
    setSavingAttribute(true);
    try {
      await window.electronAPI.attributes.add({ 
        name: newAttrName.trim(), 
        type: 'text', 
        required: 0 
      });
      await loadAttributeDefs();
      setNewAttrName('');
      toast(`System field "${newAttrName}" added`);
    } catch (e) { toast('Failed to add field', 'error'); }
    finally { setSavingAttribute(false); }
  };

  const handleDeleteAttribute = async (id, name) => {
    console.log(`[UI] Requesting delete for attribute ID: ${id}, Name: ${name}`);
    if (!id) {
      console.error('[UI] Cannot delete attribute: Missing ID');
      return;
    }
    
    const ok = await confirm({
      type: 'danger',
      title: 'Remove Field?',
      message: `Remove "${name}" from the system? This hides the field from all products. Existing data remains in the database.`,
      confirmText: 'Remove Field',
    });
    if (!ok) return;

    try {
      const result = await window.electronAPI.attributes.delete(id);
      console.log('[UI] Delete result:', result);
      await loadAttributeDefs();
      toast('Custom field removed');
    } catch (e) { 
      console.error('[UI] Delete Attribute Error:', e);
      toast('Failed to remove field: ' + e.message, 'error'); 
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      type: 'danger',
      title: 'Delete Product?',
      message: 'This product will be permanently removed from your inventory. This cannot be undone.',
      confirmText: 'Delete Product',
      requiredPin: masterData.delete_pin
    });
    if (!ok) return;
    try {
      await window.electronAPI.products.delete(id);
      toast('Product deleted from inventory', 'info');
      loadProducts();
    } catch (e) { toast('Error: ' + e.message, 'error'); }
  };


  const handleAddCategory = async () => {
    if (!newCat.trim()) return;
    setSavingCategory(true);
    try {
      await window.electronAPI.categories.add(newCat.trim());
      await loadCategories();
      setNewCat('');
      toast(`Category "${newCat}" added`);
    } catch (e) { console.error(e); }
    finally { setSavingCategory(false); }
  };

  const handleDeleteCategory = async (id, name) => {
    const ok = await confirm({
      type: 'danger',
      title: 'Delete Category?',
      message: `Delete "${name}"? Existing products will keep this category but it will be removed from the selection list.`,
      confirmText: 'Delete',
    });
    if (!ok) return;
    try {
      await window.electronAPI.categories.delete(id);
      loadCategories();
      toast('Category removed');
    } catch (e) { toast('Failed to delete category'); }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 md:p-2 lg:p-4 animate-in">
      <header className="page-header">
        <div>
          <h2>Inventory Master</h2>
          <p>Define items, brands, and base prices for your business catalog</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="h-14 px-6 rounded-2xl gap-3 font-black border-slate-200" onClick={() => setShowCatModal(true)}>
            <Layers size={18} /> Categories
          </Button>
          <Button onClick={openAdd} className="btn-primary h-14 px-8 rounded-2xl gap-3 shadow-blue-500/20">
            <Plus size={20} strokeWidth={3} /> Create Master Item
          </Button>
        </div>
      </header>

      {/* Metrics */}
      <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-icon blue"><Package size={24} /></div>
          <div>
            <p className="metric-sub">Total Items</p>
            <h3 className="metric-value">{inventorySummary.total} Products</h3>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon yellow"><AlertTriangle size={24} /></div>
          <div>
            <p className="metric-sub">Low Stock</p>
            <h3 className="metric-value">{inventorySummary.lowStock} Items</h3>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon red"><Clock size={24} /></div>
          <div>
            <p className="metric-sub">Out of Stock</p>
            <h3 className="metric-value">{inventorySummary.outOfStock} Items</h3>
          </div>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <Input 
            placeholder="Search products by name, brand or serial..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input h-14 pl-12 rounded-2xl shadow-sm border-slate-200"
          />
        </div>
        <div className="flex w-full gap-2 overflow-x-auto pb-2">
          <Button 
            variant={filterCat === 'All' ? 'default' : 'outline'} 
            className={`h-11 shrink-0 px-5 rounded-xl text-xs font-black ${filterCat === 'All' ? 'bg-primary shadow-lg shadow-primary/20' : 'border-slate-200 bg-white'}`}
            onClick={() => setFilterCat('All')}
          >
            All ({products.length})
          </Button>
          {categories.map(cat => (
            <Button 
              key={cat.id}
              variant={filterCat === cat.name ? 'default' : 'outline'}
              className={`h-11 shrink-0 px-5 rounded-xl text-xs font-black ${filterCat === cat.name ? 'bg-primary shadow-lg shadow-primary/20' : 'border-slate-200 bg-white'}`}
              onClick={() => setFilterCat(cat.name)}
            >
              {cat.name} ({categoryCounts[cat.name] || 0})
            </Button>
          ))}
          <Button variant="outline" className="h-11 shrink-0 px-4 rounded-xl border-slate-200 bg-white gap-2 font-black text-xs" onClick={() => setShowCatModal(true)}>
            <Filter size={15} /> Manage
          </Button>
        </div>
      </div>

      {/* Product Table */}
      <Card className="rounded-[2.5rem] border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
        <div className="table-wrap border-none shadow-none rounded-none">
          {filtered.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th>Product Inventory Details</th>
                      <th>Category</th>
                      <th className="text-right">Pricing</th>
                      <th className="text-center">Stock</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {paginated.map((p) => (
                      <tr key={p.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="font-black text-slate-900 text-base">{p.product_name}</div>
                            {p.product_size && (
                              <Badge variant="secondary" className="bg-slate-100 text-slate-900 font-black rounded-lg">{p.product_size}</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{p.brand || 'NO BRAND'}</span>
                            {p.batch_number && <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest border-l pl-3">BATCH: {p.batch_number}</span>}
                          </div>
                        </td>
                        <td>
                          <Badge className="bg-blue-50 text-blue-600 border-blue-100 rounded-xl font-black">{p.category || 'General'}</Badge>
                        </td>
                        <td className="text-right">
                          <div className="font-black text-slate-900 text-lg">{CURRENCY}{p.selling_price?.toLocaleString() || '0'}</div>
                        </td>
                        <td className="text-center">
                          <Badge className={`rounded-xl px-4 py-1.5 font-black text-xs ${
                            p.quantity <= 0 ? 'bg-rose-500' : p.quantity <= (p.min_stock_alert ?? 10) ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}>
                            {p.quantity <= 0 ? 'OUT' : p.quantity <= (p.min_stock_alert ?? 10) ? `LOW: ${p.quantity}` : `${p.quantity} IN`}
                          </Badge>
                        </td>
                        <td className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(p)} className="h-10 w-10 rounded-xl text-slate-400 hover:text-primary hover:bg-blue-50">
                              <Edit3 size={18} />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="h-10 w-10 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50">
                              <Trash2 size={18} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="block md:hidden divide-y divide-slate-100">
                {paginated.map((p) => (
                  <div key={p.id} className="p-4 flex flex-col gap-3 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-slate-900 text-sm leading-snug break-words">{p.product_name}</div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.brand || 'NO BRAND'}</span>
                          {p.product_size && (
                            <Badge variant="secondary" className="bg-slate-100 text-slate-900 font-extrabold text-[9px] px-1.5 py-0.5 rounded-md">{p.product_size}</Badge>
                          )}
                          <Badge className="bg-blue-50 text-blue-600 border-blue-100 text-[9px] font-black rounded-lg px-1.5 py-0.5">{p.category || 'General'}</Badge>
                        </div>
                      </div>
                      <Badge className={`rounded-xl px-2.5 py-1.5 font-black text-[10px] whitespace-nowrap self-start ${
                        p.quantity <= 0 ? 'bg-rose-500 text-white' : p.quantity <= (p.min_stock_alert ?? 10) ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'
                      }`}>
                        {p.quantity <= 0 ? 'OUT' : p.quantity <= (p.min_stock_alert ?? 10) ? `LOW: ${p.quantity}` : `${p.quantity} IN`}
                      </Badge>
                    </div>

                    <div className="flex justify-between items-center bg-slate-50/80 p-2.5 rounded-xl border border-slate-100/50">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Selling Price</span>
                        <span className="font-black text-slate-900 text-sm">{CURRENCY}{p.selling_price?.toLocaleString() || '0'}</span>
                      </div>
                      {p.batch_number && (
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Batch</span>
                          <span className="font-bold text-slate-600 text-xs">{p.batch_number}</span>
                        </div>
                      )}
                      <div className="flex gap-1.5">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)} className="h-8 w-8 rounded-lg text-slate-400 hover:text-primary hover:bg-blue-50">
                          <Edit3 size={15} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="h-8 w-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50">
                          <Trash2 size={15} />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 text-slate-300">
              <Package size={64} strokeWidth={1} />
              <p className="mt-4 font-black text-lg">No inventory matches found</p>
              <Button variant="link" className="text-primary font-black mt-2" onClick={() => { setSearchTerm(''); setFilterCat('All'); }}>Reset All Filters</Button>
            </div>
          )}
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 md:p-6 bg-slate-50 border-t flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-xs font-bold text-slate-500">
              Showing <span className="text-slate-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-slate-900">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> of <span className="text-slate-900">{filtered.length}</span> items
            </p>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 md:flex">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-10 px-4 rounded-xl font-bold" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
              >
                Previous
              </Button>
              <div className="flex items-center justify-center gap-1 px-2 md:px-4 text-xs md:text-sm font-black whitespace-nowrap">
                Page {currentPage} of {totalPages}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-10 px-4 rounded-xl font-bold" 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Product Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent 
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          className="product-editor-dialog max-w-[92vw] sm:max-w-4xl h-[92vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl rounded-[2.5rem] bg-white transition-all"
        >
          <DialogHeader className="product-editor-header p-10 bg-slate-900 text-white">
            <DialogTitle className="text-2xl font-black flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-600/20">
                <Package size={24} />
              </div>
              {editId ? 'Modify Product' : 'Register New Master Item'}
            </DialogTitle>
            <DialogDescription className="text-slate-400 font-bold text-base mt-2">
              Update inventory specifications and price standards
            </DialogDescription>
          </DialogHeader>

          <div className="product-editor-body flex-1 overflow-y-auto p-10 space-y-10 bg-slate-50/30">
            {/* Essential Info */}
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <Tag size={18} className="text-blue-600" />
                <h4 className="font-black text-slate-900 uppercase tracking-widest text-xs">Essential Identity</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 form-group">
                  <label className="form-label">Full Product Name *</label>
                  <Input disabled={saving} value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} className="form-input h-14" placeholder="e.g. Samsung S24 Ultra Titanium" />
                </div>
                <div className="form-group">
                  <label className="form-label">Variant / Size</label>
                  <Input disabled={saving} value={form.product_size} onChange={(e) => setForm({ ...form, product_size: e.target.value })} className="form-input h-14" placeholder="e.g. 512GB, 2kg" />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <Select disabled={saving} value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger className="form-input h-14"><SelectValue placeholder="Select Category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c.id} value={c.name} className="font-bold">{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="form-group">
                  <label className="form-label">Brand / Maker</label>
                  <Input disabled={saving} value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="form-input h-14" placeholder="e.g. Samsung" />
                </div>
                <div className="form-group">
                  <label className="form-label">Measurement Unit</label>
                  <Select disabled={saving} value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                    <SelectTrigger className="form-input h-14"><SelectValue placeholder="Unit" /></SelectTrigger>
                    <SelectContent>
                      {UNITS.map(u => <SelectItem key={u} value={u} className="font-bold uppercase">{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            {/* Pricing & Tax */}
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <IndianRupee size={18} className="text-emerald-600" />
                <h4 className="font-black text-slate-900 uppercase tracking-widest text-xs">Financial Standards</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="form-group md:col-span-2">
                  <label className="form-label">Selling Price ({CURRENCY})</label>
                  <Input disabled={saving} type="number" value={form.selling_price || ''} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} className="form-input h-14 text-2xl font-black text-blue-600" />
                </div>
                <div className="form-group md:col-span-2">
                  <label className="form-label flex justify-between">
                    Cost Price ({CURRENCY})
                    {editId && <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full uppercase animate-pulse">Manual Update</span>}
                  </label>
                  <Input disabled={saving} type="number" value={form.cost_price || ''} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} className="form-input h-14 font-black text-emerald-600" />
                  {editId && (
                    <p className="text-[10px] font-bold text-slate-400 mt-2 italic">
                      Note: Changing cost here updates ALL existing stock. For new price batches, use the <b>Stock Inflow</b> module.
                    </p>
                  )}
                </div>
                <div className="form-group md:col-span-2">
                  <label className="form-label">{TAX_LABEL} Percentage (%)</label>
                  <Select disabled={saving} value={form.gst_rate.toString()} onValueChange={(v) => {
                    const val = parseFloat(v);
                    setForm({ ...form, gst_rate: val, cgst: val / 2, sgst: val / 2 });
                  }}>
                    <SelectTrigger className="form-input h-14 font-black"><SelectValue placeholder="Tax Rate" /></SelectTrigger>
                    <SelectContent>
                      {TAX_RATES.map(r => <SelectItem key={r} value={r.toString()} className="font-bold">{r}% {TAX_LABEL}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="form-group">
                  <label className="form-label">Barcode / SKU</label>
                  <Input disabled={saving} value={form.barcode || ''} onChange={(e) => setForm({ ...form, barcode: e.target.value })} className="form-input h-14 font-mono" placeholder="Scan or type..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Current Stock</label>
                  <Input disabled={saving} type="number" value={form.quantity || ''} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="form-input h-14 font-black text-rose-600" />
                </div>
                <div className="form-group">
                  <label className="form-label">Alert Stock Qty</label>
                  <Input disabled={saving} type="number" value={form.min_stock_alert} onChange={(e) => setForm({ ...form, min_stock_alert: e.target.value })} className="form-input h-14 font-black text-amber-600" />
                  <p className="text-[9px] font-bold text-slate-400 mt-2 italic">Triggers low-stock warning</p>
                </div>
              </div>
            </section>

            {/* Custom Fields - Improved UI */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Barcode size={18} className="text-purple-600" />
                  <h4 className="font-black text-slate-900 uppercase tracking-widest text-xs">Product Specifications</h4>
                </div>
              </div>
              
              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-8">
                <div className="flex gap-3 items-end">
                  <div className="flex-1 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Specification Name</label>
                    <Input 
                      placeholder="e.g. Flavor, Protein Content, Warranty" 
                      value={newAttrName} 
                      onChange={(e) => setNewAttrName(e.target.value)}
                      className="h-12 rounded-xl border-slate-100 bg-slate-50/50"
                      disabled={saving || savingAttribute}
                    />
                  </div>
                  <Button onClick={commitAttributeDef} disabled={saving || savingAttribute || !newAttrName.trim()} className="h-12 px-6 rounded-xl bg-purple-600 font-black gap-2 text-white">
                    {savingAttribute ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Plus size={16} />
                    )}
                    Add Field
                  </Button>
                </div>

                {attributeDefs.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 pt-6 border-t border-slate-50">
                    {attributeDefs.map((def) => (
                      <div key={def.id} className="form-group group">
                        <div className="flex justify-between items-center mb-2">
                          <label className="form-label flex items-center gap-2 mb-0">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                            {def.name}
                          </label>
                          <Button 
                            type="button"
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-rose-300 hover:text-rose-600 hover:bg-rose-50 transition-all"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteAttribute(def.id, def.name);
                            }}
                            disabled={saving}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                        <Input 
                          value={form.custom_fields[def.name] || ''}
                          onChange={(e) => setForm({ 
                            ...form, 
                            custom_fields: { ...form.custom_fields, [def.name]: e.target.value } 
                          })} 
                          className="form-input h-12 bg-slate-50/30 border-slate-100 focus:bg-white transition-all font-bold"
                          placeholder={`Enter ${def.name}...`}
                          disabled={saving}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-400 text-sm font-medium italic">
                    Add custom fields above to track industry-specific details.
                  </div>
                )}
              </div>
            </section>

          </div>

          <DialogFooter className="p-10 bg-white border-t flex gap-3 sm:justify-end">
            <Button variant="outline" className="h-14 px-10 rounded-2xl font-black border-slate-200" onClick={() => setShowModal(false)} disabled={saving}>Discard</Button>
            <Button onClick={handleSave} className="btn-primary h-14 px-10 rounded-2xl gap-3" disabled={saving || !form.product_name.trim()}>
              {saving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check size={20} strokeWidth={3} />
              )}
              {saving ? 'Saving...' : editId ? 'Update Inventory' : 'Register Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Categories Modal */}
      <Dialog open={showCatModal} onOpenChange={setShowCatModal}>
        <DialogContent className="max-w-[92vw] sm:max-w-lg rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-8 bg-slate-900 text-white">
            <DialogTitle className="font-black text-xl flex items-center gap-3">
              <Layers size={20} className="text-blue-400" /> Manage Categories
            </DialogTitle>
          </DialogHeader>
          <div className="p-5 md:p-8 space-y-6 bg-white">
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Input 
                placeholder="New category name..." 
                value={newCat} 
                onChange={(e) => setNewCat(e.target.value)}
                className="h-12 font-bold rounded-xl"
                disabled={savingCategory}
              />
              <Button onClick={handleAddCategory} disabled={savingCategory || !newCat.trim()} className="h-12 rounded-xl bg-blue-600 min-w-[70px]">
                {savingCategory ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                ) : (
                  'Add'
                )}
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[55vh] overflow-y-auto pr-1">
              {categories.length > 0 ? categories.map(c => (
                <div key={c.id} className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-2xl group border border-slate-100">
                  <div className="min-w-0">
                    <span className="block truncate font-black text-slate-700">{c.name}</span>
                    <span className="text-[10px] font-bold text-slate-400">{categoryCounts[c.name] || 0} products</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    disabled={savingCategory}
                    size="icon" 
                    className="h-9 w-9 rounded-xl text-rose-300 hover:text-rose-600 hover:bg-rose-50 transition-all"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDeleteCategory(c.id, c.name);
                    }}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              )) : (
                <div className="sm:col-span-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-bold text-slate-400">
                  No categories yet. Add one above to organize your catalog.
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
