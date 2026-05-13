'use client';
import { useState, useEffect } from 'react';
import {
  Plus, Trash2, X, Check, IndianRupee, PieChart, Calendar, 
  ArrowUpCircle, History, Tag, FileText, Layout
} from 'lucide-react';
import { useToast } from './ToastProvider';

// shadcn/ui components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function Expenses({ profile }) {
  const { toast } = useToast();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ category: 'Other', description: '', amount: '' });

  const CURRENCY = profile?.currency_symbol || '₹';

  useEffect(() => { 
    loadExpenses(); 
    loadCategories();
  }, []);

  const loadCategories = async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const data = await window.electronAPI.expenseCategories.getAll();
        setCategories(data || []);
        if (data && data.length > 0) {
          setForm(prev => ({ ...prev, category: data[0].name }));
        }
      } catch (e) { console.error(e); }
    }
  };

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
      toast('Expense recorded successfully');
      setShowModal(false);
      setForm({ category: 'Other', description: '', amount: '' });
      loadExpenses();
    } catch (e) { toast(e.message, 'error'); }
  };

  const handleDelete = async (id) => {
    try {
      await window.electronAPI.expenses.delete(id);
      toast('Expense record deleted', 'info');
      loadExpenses();
    } catch (e) { toast(e.message, 'error'); }
  };

  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);

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
          <h2>Expense Ledger</h2>
          <p>Track your shop overheads, rent, and operational costs</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="btn-primary h-14 px-8 rounded-2xl gap-3 shadow-rose-500/20">
          <Plus size={20} strokeWidth={3} /> Record Expense
        </Button>
      </header>

      {/* Expense Stats */}
      <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-icon red"><ArrowUpCircle size={24} /></div>
          <div>
            <p className="metric-sub">Total Outflow</p>
            <h3 className="metric-value">{CURRENCY}{totalExpenses.toLocaleString('en-IN')}</h3>
            <div className="mt-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Aggregate Expenses</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon teal"><History size={24} /></div>
          <div>
            <p className="metric-sub">Period Count</p>
            <h3 className="metric-value">{expenses.length} Entries</h3>
            <div className="mt-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Expense frequency</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon blue"><Tag size={24} /></div>
          <div>
            <p className="metric-sub">Avg. Ticket</p>
            <h3 className="metric-value">{CURRENCY}{(expenses.length > 0 ? (totalExpenses / expenses.length).toFixed(2) : 0).toLocaleString()}</h3>
            <div className="mt-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Per record mean</div>
          </div>
        </div>
      </div>

      {/* Expense List */}
      <Card className="rounded-[2.5rem] border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
        <div className="table-wrap border-none shadow-none rounded-none">
          {expenses.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr>
                  <th>Transaction Date</th>
                  <th>Classification</th>
                  <th>Notes & Description</th>
                  <th className="text-right">Outflow Amount</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {expenses.map((e) => (
                  <tr key={e.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td>
                      <div className="font-black text-slate-900">{new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ref: #EXP-{e.id}</div>
                    </td>
                    <td>
                      <Badge className="bg-rose-50 text-rose-600 border-rose-100 rounded-xl font-black">{e.category.toUpperCase()}</Badge>
                    </td>
                    <td>
                      <div className="font-bold text-slate-700">{e.description || 'General Expense'}</div>
                    </td>
                    <td className="text-right">
                      <div className="font-black text-slate-900 text-lg">{CURRENCY}{e.amount.toLocaleString()}</div>
                    </td>
                    <td className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)} className="h-10 w-10 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50">
                        <Trash2 size={18} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 text-slate-300">
              <PieChart size={64} strokeWidth={1} />
              <p className="mt-4 font-black text-lg">No expense records found</p>
              <Button variant="link" className="text-primary font-black mt-2" onClick={() => setShowModal(true)}>Record First Expense</Button>
            </div>
          )}
        </div>
      </Card>

      {/* Expense Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-xl p-0 overflow-hidden border-none shadow-2xl rounded-[3rem] bg-white">
          <DialogHeader className="p-10 bg-slate-900 text-white">
            <DialogTitle className="text-2xl font-black flex items-center gap-4">
              <div className="w-12 h-12 bg-rose-600 rounded-2xl flex items-center justify-center shadow-xl shadow-rose-600/20">
                <PieChart size={24} />
              </div>
              Record Cash Outflow
            </DialogTitle>
            <DialogDescription className="text-slate-400 font-bold text-base mt-2">
              Log fixed costs, rent, or daily operational spending
            </DialogDescription>
          </DialogHeader>

          <div className="p-10 space-y-10 max-h-[70vh] overflow-y-auto bg-slate-50/30">
            <div className="space-y-6">
               <div className="form-group">
                 <label className="form-label">Expense Category</label>
                 <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger className="form-input h-14 font-black"><SelectValue placeholder="Classification" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c.id} value={c.name} className="font-bold">{c.name}</SelectItem>)}
                      <SelectItem value="Other" className="font-bold">Other</SelectItem>
                    </SelectContent>
                 </Select>
               </div>

               <div className="form-group">
                 <label className="form-label">Amount Outflow ({CURRENCY})</label>
                 <div className="relative">
                    <IndianRupee size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-500" />
                    <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="form-input h-14 pl-12 text-2xl font-black text-rose-600" placeholder="0.00" />
                 </div>
               </div>

               <div className="form-group">
                 <label className="form-label">Transaction Narrative / Note</label>
                 <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="form-input min-h-[120px] py-4" placeholder="e.g. Electricity bill payment, Office stationery..." />
               </div>
            </div>
          </div>

          <DialogFooter className="p-10 bg-white border-t flex gap-3 sm:justify-end">
            <Button variant="outline" className="h-14 px-10 rounded-2xl font-black border-slate-200" onClick={() => setShowModal(false)}>Discard</Button>
            <Button onClick={handleSave} className="btn-primary h-14 px-12 rounded-2xl gap-3 shadow-lg shadow-rose-500/20">
              <Check size={20} strokeWidth={3} /> Record Outflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
