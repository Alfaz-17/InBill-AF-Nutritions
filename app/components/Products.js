'use client';
import { useState, useEffect } from 'react';
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
  gst_rate: 0, cgst: 0, sgst: 0, quantity: '', batch_number: '', expiry_date: '',
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [showAttrModal, setShowAttrModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [attrForm, setAttrForm] = useState({ name: '', type: 'text' });
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...emptyProduct });
  const [showFilter, setShowFilter] = useState(false);

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
      batch_number: p.batch_number || '',
      expiry_date: p.expiry_date || '',
      custom_fields: parsedFields,
    });
    setEditId(p.id);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.product_name.trim()) return;
    try {
      const payload = {
        ...form,
        selling_price: parseFloat(form.selling_price) || 0,
        cost_price: parseFloat(form.cost_price) || 0,
        gst_rate: parseFloat(form.gst_rate) || 0,
        cgst: parseFloat(form.cgst) || 0,
        sgst: parseFloat(form.sgst) || 0,
        quantity: parseInt(form.quantity) || 0,
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

  const commitAttributeDef = async () => {
    if (!attrForm.name) return;
    try {
      await window.electronAPI.attributes.add({ 
        name: attrForm.name, 
        type: attrForm.type, 
        required: 0 
      });
      await loadAttributeDefs();
      setShowAttrModal(false);
      toast(`Field "${attrForm.name}" added successfully`);
    } catch (e) { toast('Failed to add field', 'error'); }
  };

  const handleAddCategory = async () => {
    if (!newCat.trim()) return;
    try {
      await window.electronAPI.categories.add(newCat.trim());
      await loadCategories();
      setNewCat('');
      toast(`Category "${newCat}" added`);
    } catch (e) { console.error(e); }
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

  const handleDeleteAttribute = async (id, name) => {
    const ok = await confirm({
      type: 'danger',
      title: 'Remove Field?',
      message: `Remove "${name}" from the system? This will not delete data from existing products, but you won't be able to add this field to new products.`,
      confirmText: 'Remove Field',
    });
    if (!ok) return;
    try {
      await window.electronAPI.attributes.delete(id);
      loadAttributeDefs();
      toast('Custom field removed');
    } catch (e) { toast('Failed to remove field'); }
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
            <h3 className="metric-value">{products.length} Products</h3>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon yellow"><AlertTriangle size={24} /></div>
          <div>
            <p className="metric-sub">Low Stock</p>
            <h3 className="metric-value">{products.filter(p => p.quantity > 0 && p.quantity <= 10).length} Items</h3>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon red"><Clock size={24} /></div>
          <div>
            <p className="metric-sub">Out of Stock</p>
            <h3 className="metric-value">{products.filter(p => p.quantity <= 0).length} Items</h3>
          </div>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <Input 
            placeholder="Search products by name, brand or serial..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input h-14 pl-12 rounded-2xl shadow-sm border-slate-200"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button 
            variant={filterCat === 'All' ? 'default' : 'outline'} 
            className={`h-14 px-8 rounded-2xl font-black ${filterCat === 'All' ? 'bg-primary shadow-lg shadow-primary/20' : 'border-slate-200'}`}
            onClick={() => setFilterCat('All')}
          >
            All Items
          </Button>
          {categories.slice(0, 3).map(cat => (
            <Button 
              key={cat.id}
              variant={filterCat === cat.name ? 'default' : 'outline'}
              className={`h-14 px-6 rounded-2xl font-black ${filterCat === cat.name ? 'bg-primary shadow-lg shadow-primary/20' : 'border-slate-200'}`}
              onClick={() => setFilterCat(cat.name)}
            >
              {cat.name}
            </Button>
          ))}
          {categories.length > 3 && (
            <Button variant="outline" className="h-14 px-4 rounded-2xl border-slate-200" onClick={() => setShowFilter(!showFilter)}>
              <Filter size={18} />
            </Button>
          )}
        </div>
      </div>

      {/* Product Table */}
      <Card className="rounded-[2.5rem] border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
        <div className="table-wrap border-none shadow-none rounded-none">
          {filtered.length > 0 ? (
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
                {filtered.map((p) => (
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
                      <div className="font-black text-slate-900 text-lg">{CURRENCY}{p.selling_price.toLocaleString()}</div>
                    </td>
                    <td className="text-center">
                      <Badge className={`rounded-xl px-4 py-1.5 font-black text-xs ${
                        p.quantity <= 0 ? 'bg-rose-500' : p.quantity <= 10 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}>
                        {p.quantity <= 0 ? 'OUT' : p.quantity <= 10 ? `LOW: ${p.quantity}` : `${p.quantity} IN`}
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
          ) : (
            <div className="flex flex-col items-center justify-center py-32 text-slate-300">
              <Package size={64} strokeWidth={1} />
              <p className="mt-4 font-black text-lg">No inventory matches found</p>
              <Button variant="link" className="text-primary font-black mt-2" onClick={() => { setSearchTerm(''); setFilterCat('All'); }}>Reset All Filters</Button>
            </div>
          )}
        </div>
      </Card>

      {/* Product Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-[92vw] sm:max-w-4xl h-[92vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl rounded-[2.5rem] bg-white transition-all">
          <DialogHeader className="p-10 bg-slate-900 text-white">
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

          <div className="flex-1 overflow-y-auto p-10 space-y-10 bg-slate-50/30">
            {/* Essential Info */}
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <Tag size={18} className="text-blue-600" />
                <h4 className="font-black text-slate-900 uppercase tracking-widest text-xs">Essential Identity</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 form-group">
                  <label className="form-label">Full Product Name *</label>
                  <Input value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} className="form-input h-14" placeholder="e.g. Samsung S24 Ultra Titanium" />
                </div>
                <div className="form-group">
                  <label className="form-label">Variant / Size</label>
                  <Input value={form.product_size} onChange={(e) => setForm({ ...form, product_size: e.target.value })} className="form-input h-14" placeholder="e.g. 512GB, 2kg" />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger className="form-input h-14"><SelectValue placeholder="Select Category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c.id} value={c.name} className="font-bold">{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="form-group">
                  <label className="form-label">Brand / Maker</label>
                  <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="form-input h-14" placeholder="e.g. Samsung" />
                </div>
                <div className="form-group">
                  <label className="form-label">Measurement Unit</label>
                  <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
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
                  <Input type="number" value={form.selling_price || ''} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} className="form-input h-14 text-2xl font-black text-blue-600" />
                </div>
                <div className="form-group md:col-span-2">
                  <label className="form-label">Cost Price ({CURRENCY})</label>
                  <Input type="number" value={form.cost_price || ''} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} className="form-input h-14 font-black text-emerald-600" />
                </div>
                <div className="form-group md:col-span-2">
                  <label className="form-label">{TAX_LABEL} Percentage (%)</label>
                  <Select value={form.gst_rate.toString()} onValueChange={(v) => {
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
                  <Input value={form.barcode || ''} onChange={(e) => setForm({ ...form, barcode: e.target.value })} className="form-input h-14 font-mono" placeholder="Scan or type..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Current Stock</label>
                  <Input type="number" value={form.quantity || ''} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="form-input h-14 font-black text-rose-600" />
                </div>
              </div>
            </section>

            {/* Custom Fields */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Barcode size={18} className="text-purple-600" />
                  <h4 className="font-black text-slate-900 uppercase tracking-widest text-xs">Industry Attributes</h4>
                </div>
                <Button variant="ghost" size="sm" className="font-black text-primary text-[10px] uppercase gap-2 hover:bg-blue-50" onClick={() => setShowAttrModal(true)}>
                  <Plus size={14} strokeWidth={3} /> Add New Attribute
                </Button>
              </div>
              
              {attributeDefs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                  {attributeDefs.map((def) => (
                    <div key={def.id} className="form-group">
                      <label className="form-label flex justify-between">
                        {def.name}
                        <X 
                          size={12} 
                          className="cursor-pointer text-slate-300 hover:text-red-500 transition-colors" 
                          onClick={() => handleDeleteAttribute(def.id, def.name)}
                        />
                      </label>
                      <Input 
                        type={def.type === 'date' ? 'date' : def.type === 'number' ? 'number' : 'text'}
                        value={form.custom_fields[def.name] || ''}
                        onChange={(e) => setForm({ 
                          ...form, 
                          custom_fields: { ...form.custom_fields, [def.name]: e.target.value } 
                        })} 
                        className="form-input h-12"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center bg-white rounded-[2rem] border border-slate-100 border-dashed">
                  <p className="text-slate-400 font-bold">No custom attributes defined yet</p>
                </div>
              )}
            </section>
          </div>

          <DialogFooter className="p-10 bg-white border-t flex gap-3 sm:justify-end">
            <Button variant="outline" className="h-14 px-10 rounded-2xl font-black border-slate-200" onClick={() => setShowModal(false)}>Discard</Button>
            <Button onClick={handleSave} className="btn-primary h-14 px-10 rounded-2xl gap-3">
              <Check size={20} strokeWidth={3} /> {editId ? 'Update Inventory' : 'Register Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Categories Modal */}
      <Dialog open={showCatModal} onOpenChange={setShowCatModal}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-8 bg-slate-900 text-white">
            <DialogTitle className="font-black text-xl flex items-center gap-3">
              <Layers size={20} className="text-blue-400" /> Manage Categories
            </DialogTitle>
          </DialogHeader>
          <div className="p-8 space-y-6 bg-white">
            <div className="flex gap-2">
              <Input 
                placeholder="New category name..." 
                value={newCat} 
                onChange={(e) => setNewCat(e.target.value)}
                className="h-12 font-bold rounded-xl"
              />
              <Button onClick={handleAddCategory} className="h-12 rounded-xl bg-blue-600">Add</Button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {categories.map(c => (
                <div key={c.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group">
                  <span className="font-bold text-slate-700">{c.name}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-100 opacity-0 group-hover:opacity-100 transition-all"
                    onClick={() => handleDeleteCategory(c.id, c.name)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Attribute Definition Modal */}
      <Dialog open={showAttrModal} onOpenChange={setShowAttrModal}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-8 bg-slate-900 text-white">
            <DialogTitle className="font-black text-xl flex items-center gap-3">
              <Barcode size={20} className="text-purple-400" /> Define New Field
            </DialogTitle>
          </DialogHeader>
          <div className="p-8 space-y-6 bg-white">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Field Name</label>
                <Input 
                  placeholder="e.g. Serial Number, Warranty" 
                  value={attrForm.name} 
                  onChange={(e) => setAttrForm({...attrForm, name: e.target.value})}
                  className="h-12 font-bold rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Data Type</label>
                <Select value={attrForm.type} onValueChange={(v) => setAttrForm({...attrForm, type: v})}>
                  <SelectTrigger className="h-12 font-bold rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text" className="font-bold">Text / Alpha-numeric</SelectItem>
                    <SelectItem value="number" className="font-bold">Numbers Only</SelectItem>
                    <SelectItem value="date" className="font-bold">Calendar Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={commitAttributeDef} className="w-full h-12 rounded-xl bg-purple-600 font-black">Create System Field</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
