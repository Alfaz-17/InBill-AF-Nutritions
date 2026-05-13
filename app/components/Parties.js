'use client';
import { useState, useEffect } from 'react';
import { 
  Plus, Search, Phone, User, Users, Trash2, Edit3, 
  ArrowUpRight, ArrowDownLeft, X, Check, Save, MapPin, 
  CreditCard, Building2, PhoneCall, History
} from 'lucide-react';
import { useToast } from './ToastProvider';

// shadcn/ui components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function Parties({ profile }) {
  const { toast, confirm } = useToast();
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editingParty, setEditingParty] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '', phone: '', address: '', gstin: '', type: 'Customer', opening_balance: 0
  });

  const CURRENCY = profile?.currency_symbol || '₹';

  useEffect(() => {
    loadParties();
  }, []);

  const loadParties = async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const data = await window.electronAPI.parties.getAll();
        setParties(data || []);
      } catch (e) { console.error('Failed to load parties:', e); }
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.name) return;
    try {
      if (editingParty) {
        await window.electronAPI.parties.update(editingParty.id, formData);
        toast(`${formData.name} updated successfully`);
      } else {
        await window.electronAPI.parties.add(formData);
        toast(`${formData.name} added to directory`);
      }
      setShowModal(false);
      resetForm();
      loadParties();
    } catch (e) { toast('Failed to save: ' + e.message, 'error'); }
  };

  const resetForm = () => {
    setEditingParty(null);
    setFormData({ name: '', phone: '', address: '', gstin: '', type: 'Customer', opening_balance: 0 });
  };

  const openEdit = (p) => {
    setEditingParty(p);
    setFormData({ 
      name: p.name, phone: p.phone, address: p.address, 
      gstin: p.gstin, type: p.type, opening_balance: p.opening_balance 
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    const party = parties.find(p => p.id === id);
    const ok = await confirm({
      type: 'danger',
      title: `Delete ${party?.name}?`,
      message: 'This contact and their transaction history will be permanently removed.',
      confirmText: 'Delete Contact',
    });
    if (!ok) return;
    try {
      await window.electronAPI.parties.delete(id);
      toast('Contact removed from directory', 'info');
      loadParties();
    } catch (e) { toast('Failed to delete: ' + e.message, 'error'); }
  };

  const filtered = parties.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.phone.includes(searchTerm);
    const matchesFilter = filter === 'All' || p.type === filter;
    return matchesSearch && matchesFilter;
  });

  const receivable = parties.filter(p => p.current_balance > 0).reduce((sum, p) => sum + p.current_balance, 0);
  const payable = Math.abs(parties.filter(p => p.current_balance < 0).reduce((sum, p) => sum + p.current_balance, 0));

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
          <h2>Business Directory</h2>
          <p>Manage your customers, suppliers and financial balances</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="btn-primary h-14 px-8 rounded-2xl gap-3 shadow-blue-500/20">
          <Plus size={20} strokeWidth={3} /> Register New Party
        </Button>
      </header>

      {/* Financial Health */}
      <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-icon green"><ArrowDownLeft size={24} /></div>
          <div>
            <p className="metric-sub">To Receive</p>
            <h3 className="metric-value">{CURRENCY}{receivable.toLocaleString('en-IN')}</h3>
            <div className="mt-2 flex items-center gap-2">
              <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 rounded-lg">{parties.filter(p => p.current_balance > 0).length} Customers</Badge>
            </div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon red"><ArrowUpRight size={24} /></div>
          <div>
            <p className="metric-sub">To Pay</p>
            <h3 className="metric-value">{CURRENCY}{payable.toLocaleString('en-IN')}</h3>
            <div className="mt-2 flex items-center gap-2">
              <Badge className="bg-rose-50 text-rose-600 border-rose-100 rounded-lg">{parties.filter(p => p.current_balance < 0).length} Suppliers</Badge>
            </div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon blue"><Users size={24} /></div>
          <div>
            <p className="metric-sub">Net Position</p>
            <h3 className={`metric-value ${receivable - payable >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {CURRENCY}{(receivable - payable).toLocaleString('en-IN')}
            </h3>
            <div className="mt-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Aggregate Ledger</div>
          </div>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <Input 
            placeholder="Search by name, phone or company..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input h-14 pl-12 rounded-2xl shadow-sm border-slate-200"
          />
        </div>
        <Tabs value={filter} onValueChange={setFilter} className="w-full md:w-auto">
          <TabsList className="bg-white border border-slate-200 p-1.5 rounded-2xl h-14 w-full md:w-fit">
            <TabsTrigger value="All" className="px-6 rounded-xl font-black h-full data-[state=active]:bg-slate-900 data-[state=active]:text-white">All</TabsTrigger>
            <TabsTrigger value="Customer" className="px-6 rounded-xl font-black h-full data-[state=active]:bg-blue-600 data-[state=active]:text-white">Customers</TabsTrigger>
            <TabsTrigger value="Supplier" className="px-6 rounded-xl font-black h-full data-[state=active]:bg-amber-600 data-[state=active]:text-white">Suppliers</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Directory Table */}
      <Card className="rounded-[2.5rem] border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
        <div className="table-wrap border-none shadow-none rounded-none">
          {filtered.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr>
                  <th>Contact Identity</th>
                  <th>Relationship</th>
                  <th>Ledger Balance</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((p) => (
                  <tr key={p.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td>
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${
                          p.type === 'Customer' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                          {p.name[0]}
                        </div>
                        <div>
                          <div className="font-black text-slate-900 text-base">{p.name}</div>
                          <div className="flex items-center gap-3 mt-1 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                            <span className="flex items-center gap-1"><PhoneCall size={12} /> {p.phone || 'No Contact'}</span>
                            {p.gstin && <span className="border-l pl-3">{p.gstin}</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge className={`rounded-xl px-4 py-1.5 font-black text-xs ${
                        p.type === 'Customer' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                      }`}>
                        {p.type.toUpperCase()}
                      </Badge>
                    </td>
                    <td>
                      <div className={`font-black text-lg ${
                        p.current_balance > 0 ? 'text-emerald-600' : p.current_balance < 0 ? 'text-rose-600' : 'text-slate-400'
                      }`}>
                        {p.current_balance > 0 ? '+' : ''}{CURRENCY}{p.current_balance.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        {p.current_balance > 0 ? 'Receivable' : p.current_balance < 0 ? 'Payable' : 'Settled'}
                      </div>
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
              <Users size={64} strokeWidth={1} />
              <p className="mt-4 font-black text-lg">No directory records found</p>
              <Button variant="link" className="text-primary font-black mt-2" onClick={() => { setSearchTerm(''); setFilter('All'); }}>Reset All Filters</Button>
            </div>
          )}
        </div>
      </Card>

      {/* Party Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden border-none shadow-2xl rounded-[3rem] bg-white">
          <DialogHeader className="p-10 bg-slate-900 text-white">
            <DialogTitle className="text-2xl font-black flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-600/20">
                <User size={24} />
              </div>
              {editingParty ? 'Modify Contact' : 'Register New Partner'}
            </DialogTitle>
            <DialogDescription className="text-slate-400 font-bold text-base mt-2">
              Add customers or suppliers to track transactions and balances
            </DialogDescription>
          </DialogHeader>

          <div className="p-10 space-y-10 max-h-[70vh] overflow-y-auto bg-slate-50/30">
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <History size={18} className="text-blue-600" />
                <h4 className="font-black text-slate-900 uppercase tracking-widest text-xs">Profile & Relationship</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="md:col-span-2 form-group">
                  <label className="form-label">Full Name / Business Name *</label>
                  <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="form-input h-14" placeholder="e.g. John Doe / Delta Corp" />
                </div>
                <div className="form-group">
                  <label className="form-label">Relationship Type</label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                    <SelectTrigger className="form-input h-14 font-black"><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Customer" className="font-bold">Customer</SelectItem>
                      <SelectItem value="Supplier" className="font-bold">Supplier</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="form-input h-14" placeholder="9876543210" />
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <CreditCard size={18} className="text-emerald-600" />
                <h4 className="font-black text-slate-900 uppercase tracking-widest text-xs">Compliance & Opening State</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="form-group">
                  <label className="form-label">GSTIN / Tax ID</label>
                  <Input value={formData.gstin} onChange={(e) => setFormData({...formData, gstin: e.target.value.toUpperCase()})} className="form-input h-14 font-mono" placeholder="22AAAAA0000A1Z5" />
                </div>
                <div className="form-group">
                  <label className="form-label">Opening Balance ({CURRENCY})</label>
                  <Input type="number" value={formData.opening_balance} onChange={(e) => setFormData({...formData, opening_balance: parseFloat(e.target.value) || 0})} className="form-input h-14 font-black" />
                  <p className="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-tight">Negative (-) means you owe them</p>
                </div>
                <div className="md:col-span-2 form-group">
                  <label className="form-label">Billing Address</label>
                  <Textarea value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="form-input min-h-[100px] py-4" placeholder="Full street address..." />
                </div>
              </div>
            </section>
          </div>

          <DialogFooter className="p-10 bg-white border-t flex gap-3 sm:justify-end">
            <Button variant="outline" className="h-14 px-10 rounded-2xl font-black border-slate-200" onClick={() => setShowModal(false)}>Discard</Button>
            <Button onClick={handleSave} className="btn-primary h-14 px-12 rounded-2xl gap-3">
              <Check size={20} strokeWidth={3} /> {editingParty ? 'Update Contact' : 'Register Partner'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
