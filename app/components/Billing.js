'use client';
import { useState, useEffect, useRef } from 'react';
import {
  Search, Plus, Minus, Trash2, ShoppingCart, Package,
  User, CreditCard, Printer, X, Check, FileText, ExternalLink, Wallet, ScanLine, Settings2, IndianRupee
} from 'lucide-react';
import { toast } from "sonner";
import { getInvoiceHTML as generateInvoiceHTML } from './InvoiceTemplates';

// shadcn/ui components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Billing({ 
  profile, 
  cart, setCart, 
  customerData, setCustomerData, 
  paymentData, setPaymentData 
}) {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Destructure for internal use
  const { name: customerName, phone: customerPhone, address: customerAddress } = customerData;
  const { mode: paymentMode, paid: paidAmount } = paymentData;

  // Setters for internal use
  const setCustomerName = (val) => setCustomerData(prev => ({ ...prev, name: val }));
  const setCustomerPhone = (val) => setCustomerData(prev => ({ ...prev, phone: val }));
  const setCustomerAddress = (val) => setCustomerData(prev => ({ ...prev, address: val }));
  const setPaymentMode = (val) => setPaymentData(prev => ({ ...prev, mode: val }));
  const setPaidAmount = (val) => setPaymentData(prev => ({ ...prev, paid: val }));
  const [saleResult, setSaleResult] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [taxMode, setTaxMode] = useState('exclusive'); // 'exclusive' or 'inclusive'
  const [saving, setSaving] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [parties, setParties] = useState([]);
  const [selectedParty, setSelectedParty] = useState(null);
  const [partySearch, setPartySearch] = useState('');
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const masterData = typeof profile?.master_data === 'string' 
    ? (JSON.parse(profile.master_data || '{}')) 
    : (profile?.master_data || {});
  
  const TAX_LABEL = masterData.tax_label || 'GST';
  const CURRENCY = profile?.currency_symbol || '₹';
  const searchRef = useRef(null);
  const [viewMode, setViewMode] = useState('browse'); // 'browse' or 'invoice'

  useEffect(() => {
    loadProducts();
    loadParties();
    loadAttributeDefs();
    if (searchRef.current) searchRef.current.focus();
  }, []);

  const loadAttributeDefs = async () => {
    if (profile?.invoice_settings) {
      try {
        const saved = typeof profile.invoice_settings === 'string' 
          ? JSON.parse(profile.invoice_settings) 
          : profile.invoice_settings;
        
        if (saved && saved.fields) {
          setInvoiceFields(saved.fields);
          setVisibleAttributes(saved.visibleAttributes || {});
          setSelectedTemplate(saved.template || 'modern');
        }
      } catch (e) { console.error(e); }
    }
  };

  const loadParties = async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const data = await window.electronAPI.parties.getAll('Customer');
        setParties(data || []);
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
  };

  const filtered = products.filter((p) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      p.product_name.toLowerCase().includes(q) ||
      (p.brand && p.brand.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
  });

  const addToCart = (product) => {
    if (product.quantity <= 0) {
      toast.error("Item out of stock");
      return;
    }
    setCart((prev) => {
      const exists = prev.find((c) => c.product_id === product.id);
      if (exists) {
        if (exists.quantity >= product.quantity) {
          toast.warning("Cannot add more than available stock");
          return prev;
        }
        toast.success(`Added another ${product.product_name}`);
        return prev.map((c) =>
          c.product_id === product.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      toast.success(`Added ${product.product_name} to cart`);
      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.product_name,
          brand: product.brand || '',
          category: product.category || '',
          product_size: product.product_size || '',
          unit: product.unit || 'pcs',
          barcode: product.barcode || '',
          batch_number: product.batch_number || '',
          expiry_date: product.expiry_date || '',
          price: product.selling_price,
          original_price: product.selling_price,
          gst_rate: product.gst_rate || 0,
          quantity: 1,
          maxQty: product.quantity,
          custom_fields: product.custom_fields || '{}'
        },
      ];
    });
  };

  const updateCartQty = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.product_id !== productId) return c;
          const newQty = c.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > c.maxQty) return c;
          return { ...c, quantity: newQty };
        })
        .filter(Boolean)
    );
  };

  const subtotal = cart.reduce((sum, c) => {
    const itemLineTotal = c.price * c.quantity;
    if (taxMode === 'inclusive') {
      return sum + (itemLineTotal / (1 + (c.gst_rate / 100)));
    }
    return sum + itemLineTotal;
  }, 0);

  const totalGst = cart.reduce((sum, c) => {
    const itemLineTotal = c.price * c.quantity;
    if (taxMode === 'inclusive') {
      const basePrice = itemLineTotal / (1 + (c.gst_rate / 100));
      return sum + (itemLineTotal - basePrice);
    }
    return sum + (itemLineTotal * c.gst_rate / 100);
  }, 0);

  const totalDiscount = cart.reduce((sum, c) => sum + (c.original_price > c.price ? (c.original_price - c.price) * c.quantity : 0), 0);
  
  const grandTotal = taxMode === 'inclusive' 
    ? cart.reduce((sum, c) => sum + (c.price * c.quantity), 0)
    : subtotal + totalGst;

  const handleSave = async () => {
    if (cart.length === 0) return;
    if (typeof window === 'undefined' || !window.electronAPI) return;
    setSaving(true);
    try {
      const result = await window.electronAPI.sales.create({
        items: cart.map((c) => ({
          product_id: c.product_id,
          product_name: c.product_name,
          price: c.price,
          quantity: c.quantity,
          gst_rate: c.gst_rate,
        })),
        party_id: selectedParty?.id,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_address: customerAddress,
        payment_mode: paymentMode,
        paid_amount: paidAmount ? parseFloat(paidAmount) : grandTotal,
      });

      setSaleResult({ 
        ...result, 
        customer_name: customerName, 
        customer_phone: customerPhone, 
        customer_address: customerAddress,
        date: new Date().toLocaleDateString('en-IN'),
        cart: [...cart],
        subtotal,
        totalGst,
        grandTotal, 
        totalDiscount 
      });
      setCart([]);
      setCustomerData({ name: '', phone: '', address: '' });
      setPaymentData({ mode: 'Cash', paid: '' });
      setPartySearch('');
      setSelectedParty(null);
      setShowSuccessModal(true);
      loadProducts();
      toast.success("Invoice generated successfully!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to save transaction");
    }
    setSaving(false);
  };

  const getInvoiceHTML = (data) => {
    return generateInvoiceHTML(data, profile);
  };


  const handleDownloadPDF = async () => {
    if (!saleResult || pdfGenerating) return;
    setPdfGenerating(true);
    try {
      const html = generateInvoiceHTML(saleResult, profile);
      const res = await window.electronAPI.pdf.generate(html);
      if (res.success) {
        await window.electronAPI.pdf.saveAs(res.buffer, `Invoice_${saleResult.invoiceNumber}.pdf`);
        toast.success("PDF Saved Successfully!");
      } else { toast.error("Failed to generate PDF"); }
    } catch (e) { console.error(e); toast.error("Error generating PDF"); }
    setPdfGenerating(false);
  };

  return (
    <div className="flex flex-col gap-8 md:p-2 lg:p-4">
      <header className="page-header">
        <div>
          <h2>Billing Center</h2>
          <p>Create invoices and manage customer transactions</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <Card className="flex items-center gap-6 px-6 py-4 border-slate-100 shadow-xl shadow-slate-200/50 rounded-3xl bg-white">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
              <Wallet size={24} />
            </div>
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Session Total</p>
              <p className="text-2xl font-black text-slate-900">{CURRENCY}{subtotal.toLocaleString()}</p>
            </div>
          </Card>
        </div>
      </header>

      <Tabs value={viewMode} onValueChange={setViewMode} className="w-full">
        <TabsList className="flex w-fit p-1.5 bg-slate-100 rounded-2xl mb-8 border border-slate-200/50">
          <TabsTrigger value="browse" className="h-12 px-8 rounded-xl gap-3 font-black data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all">
            <Package size={18} /> 1. Products
          </TabsTrigger>
          <TabsTrigger value="invoice" className="h-12 px-8 rounded-xl gap-3 font-black data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all">
            <div className="relative">
              <ShoppingCart size={18} />
              {cart.length > 0 && (
                <span className="absolute -top-3 -right-4 bg-red-500 text-white flex items-center justify-center font-black text-[10px] w-5 h-5 rounded-full border-2 border-white shadow-sm">
                  {cart.length}
                </span>
              )}
            </div>
            2. Checkout
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="browse" className="m-0 focus-visible:ring-0">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <Input 
                    placeholder="Search products by name, brand or category..." 
                    className="pl-10 h-12 bg-slate-50 border-transparent focus-visible:bg-white focus-visible:border-blue-500 transition-all font-medium text-base"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {filtered.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filtered.map((p) => (
                      <Card 
                        key={p.id} 
                        className={`group cursor-pointer hover:border-blue-500 hover:shadow-md transition-all ${p.quantity <= 0 ? 'opacity-60 grayscale' : ''}`}
                        onClick={() => addToCart(p)}
                      >
                        <CardContent className="p-4 flex flex-col gap-3">
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest truncate">{p.brand || 'Standard'}</p>
                              <h4 className="font-bold text-slate-900 leading-tight line-clamp-2 mt-0.5">{p.product_name}</h4>
                            </div>
                            {p.product_size && (
                              <Badge variant="secondary" className="text-[10px] font-black uppercase py-0 px-1.5">{p.product_size}</Badge>
                            )}
                          </div>
                          
                          <div className="flex items-end justify-between pt-3 border-t border-slate-100">
                            <div>
                              <p className="text-xl font-black text-slate-900">{CURRENCY}{p.selling_price}</p>
                            </div>
                            <Badge className={`${p.quantity <= 0 ? 'bg-red-500' : 'bg-green-500'} hover:bg-opacity-100 text-[9px] font-black`}>
                              {p.quantity <= 0 ? 'OUT' : `${p.quantity} IN STOCK`}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Package size={48} strokeWidth={1.5} />
                    <p className="mt-4 font-bold text-lg">No products found</p>
                    <p className="text-sm">Try searching for something else</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoice" className="m-0 focus-visible:ring-0">
            <div className="grid lg:grid-cols-[1fr,380px] gap-6 items-start">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="border-b bg-slate-50/50">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="text-blue-600" size={18} />
                    Customer Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="relative">
                      <Input 
                        placeholder="Customer Name" 
                        value={partySearch}
                        onChange={(e) => {
                          setPartySearch(e.target.value);
                          setCustomerName(e.target.value);
                          setShowPartyDropdown(true);
                        }}
                        className="font-semibold"
                      />
                      {showPartyDropdown && parties.length > 0 && (
                        <Card className="absolute top-[calc(100%+4px)] left-0 w-full z-50 shadow-xl border-slate-200 overflow-hidden">
                          {parties.filter(p => !partySearch || p.name.toLowerCase().includes(partySearch.toLowerCase())).slice(0, 5).map(p => (
                            <div key={p.id} className="p-3 hover:bg-slate-50 cursor-pointer border-b last:border-0" onMouseDown={() => {
                              setSelectedParty(p);
                              setPartySearch(p.name);
                              setCustomerName(p.name);
                              setCustomerPhone(p.phone || '');
                              setCustomerAddress(p.address || '');
                              setShowPartyDropdown(false);
                            }}>
                              <p className="text-sm font-bold">{p.name}</p>
                              <p className="text-xs text-slate-500 font-medium">{p.phone || 'No phone'}</p>
                            </div>
                          ))}
                        </Card>
                      )}
                    </div>
                    <Input placeholder="Mobile Number" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                    <Input placeholder="Address / City" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />
                  </div>

                  <div className="mt-8">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold flex items-center gap-2">
                        <ShoppingCart className="text-blue-600" size={18} />
                        Invoice Items
                      </h4>
                      <Badge variant="outline" className="text-[10px] font-black">{cart.length} ITEMS</Badge>
                    </div>

                    {cart.length > 0 ? (
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 border-b">
                            <tr>
                              <th className="text-left p-4 font-bold text-slate-500 uppercase text-[10px] tracking-wider">Product</th>
                              <th className="text-center p-4 font-bold text-slate-500 uppercase text-[10px] tracking-wider">Quantity</th>
                              <th className="text-right p-4 font-bold text-slate-500 uppercase text-[10px] tracking-wider">Total</th>
                              <th className="w-10"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {cart.map((item) => (
                              <tr key={item.product_id} className="hover:bg-slate-50/50">
                                <td className="p-4">
                                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter leading-none mb-1">{item.brand}</p>
                                  <p className="font-bold text-slate-900">{item.product_name}</p>
                                  <p className="text-xs font-medium text-slate-500">{CURRENCY}{item.price}</p>
                                </td>
                                <td className="p-4">
                                  <div className="flex items-center justify-center gap-2">
                                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateCartQty(item.product_id, -1)}><Minus size={12} /></Button>
                                    <span className="w-8 text-center font-bold">{item.quantity}</span>
                                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateCartQty(item.product_id, 1)}><Plus size={12} /></Button>
                                  </div>
                                </td>
                                <td className="p-4 text-right font-black text-slate-900">
                                  {CURRENCY}{(item.price * item.quantity).toLocaleString()}
                                </td>
                                <td className="p-4">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50" onClick={() => setCart(cart.filter(c => c.product_id !== item.product_id))}>
                                    <Trash2 size={16} />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-12 border-2 border-dashed rounded-lg bg-slate-50/50">
                        <ShoppingCart size={40} className="mx-auto text-slate-300" />
                        <p className="mt-2 font-bold text-slate-400">Cart is empty</p>
                        <Button variant="link" className="text-blue-600 font-bold" onClick={() => setViewMode('browse')}>Add products first</Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-col gap-6">
                <Card className="border-slate-200 shadow-sm overflow-hidden">
                  <CardHeader className="bg-slate-900 text-white flex flex-row items-center justify-between py-4">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest opacity-70">Payment Summary</CardTitle>
                    <div className="flex bg-white/10 p-1 rounded-xl border border-white/10">
                      <button 
                        onClick={() => setTaxMode('exclusive')}
                        className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${taxMode === 'exclusive' ? 'bg-white text-slate-900 shadow-lg' : 'text-white hover:bg-white/10'}`}
                      >
                        GST +
                      </button>
                      <button 
                        onClick={() => setTaxMode('inclusive')}
                        className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${taxMode === 'inclusive' ? 'bg-white text-slate-900 shadow-lg' : 'text-white hover:bg-white/10'}`}
                      >
                        GST -
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm font-medium text-slate-500">
                        <span>Subtotal</span>
                        <span>{CURRENCY}{subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm font-medium text-slate-500">
                        <div className="flex items-center gap-2">
                          <span>{TAX_LABEL}</span>
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-black border-slate-200 text-slate-400">
                            {taxMode === 'inclusive' ? 'INCLUDED' : 'ADDED'}
                          </Badge>
                        </div>
                        <span>{CURRENCY}{totalGst.toLocaleString()}</span>
                      </div>
                      <div className="pt-4 border-t border-slate-100 flex justify-between items-end">
                        <span className="text-sm font-bold text-slate-900">Grand Total</span>
                        <span className="text-3xl font-black text-blue-600 leading-none">{CURRENCY}{grandTotal.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-4">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Payment Mode</label>
                      <Select value={paymentMode} onValueChange={setPaymentMode}>
                        <SelectTrigger className="h-12 font-bold border-slate-200">
                          <SelectValue placeholder="Select Mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cash" className="font-bold">Cash</SelectItem>
                          <SelectItem value="UPI" className="font-bold">UPI / GPay</SelectItem>
                          <SelectItem value="Card" className="font-bold">Card Payment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                  <CardFooter className="p-6 bg-slate-50 border-t">
                    <Button 
                      className="w-full h-14 text-lg font-black gap-2 shadow-lg shadow-blue-200" 
                      disabled={cart.length === 0 || saving}
                      onClick={handleSave}
                    >
                      {saving ? 'Processing...' : <><Printer size={20} /> Complete & Print</>}
                    </Button>
                  </CardFooter>
                </Card>

                <Button variant="ghost" className="text-red-500 font-bold hover:bg-red-50" onClick={() => setCart([])}>
                  Discard All Items
                </Button>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-[90vw] sm:max-w-2xl max-h-[90vh] p-0 overflow-hidden border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] rounded-[2.5rem] bg-white transition-all overflow-y-auto">
          <div className="relative bg-slate-900 p-8 sm:p-12 flex flex-col items-center text-white text-center overflow-hidden">
            {/* Proper Cross Button */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-4 right-4 z-50 h-10 w-10 rounded-2xl bg-white/5 hover:bg-white/10 text-white border border-white/10 backdrop-blur-md transition-all active:scale-95"
              onClick={() => setShowSuccessModal(false)}
            >
              <X size={20} strokeWidth={2.5} />
            </Button>
            
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-white/10 backdrop-blur-xl rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl border border-white/10 animate-in zoom-in-50 duration-500">
              <Check size={40} strokeWidth={4} className="text-emerald-400 drop-shadow-lg sm:w-12 sm:h-12" />
            </div>
            
            <h2 className="relative text-3xl sm:text-4xl font-black tracking-tight mb-2">Sale Completed!</h2>
            <p className="relative opacity-70 font-bold text-base sm:text-lg">Your invoice is ready and saved</p>
          </div>
          
          <div className="p-6 sm:p-10 space-y-6 sm:space-y-8 bg-white">
            <div className="bg-slate-50 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 text-center border border-slate-100 shadow-inner relative">
              <p className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Invoice Reference</p>
              <p className="text-5xl sm:text-7xl font-black text-slate-900 tracking-tighter">#{saleResult?.invoiceNumber}</p>
              
              <div className="flex flex-wrap items-center justify-center gap-3 mt-6 sm:mt-8">
                <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-4 py-2 rounded-xl font-black text-xs sm:text-sm shadow-sm flex items-center gap-2 hover:bg-emerald-100 transition-colors">
                  <Check size={14} strokeWidth={3} /> PAID
                </Badge>
                <Badge className="bg-white text-slate-500 border border-slate-200 px-4 py-2 rounded-xl font-black text-xs sm:text-sm shadow-sm flex items-center gap-2">
                  <CreditCard size={14} /> {paymentMode}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button 
                size="lg" 
                className="h-14 sm:h-16 text-base sm:text-lg gap-3 rounded-2xl shadow-xl shadow-emerald-500/20 bg-indigo-600 hover:bg-indigo-700 font-black transition-all active:scale-[0.98]" 
                onClick={handleDownloadPDF} 
                disabled={pdfGenerating}
              >
                <Printer size={20} />
                {pdfGenerating ? 'Preparing...' : 'Print Invoice'}
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="h-14 sm:h-16 text-base sm:text-lg gap-3 rounded-2xl border-slate-200 font-black text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-[0.98]" 
                onClick={() => {
                  const msg = `Hello ${saleResult?.customer_name || 'Customer'},\nYour invoice #${saleResult?.invoiceNumber} for ${CURRENCY}${saleResult?.grandTotal} from ${profile?.business_name || 'us'} is ready.`;
                  window.open(`https://wa.me/91${customerPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                }}
              >
                <ExternalLink size={20} className="text-emerald-500" />
                WhatsApp
              </Button>
            </div>

            <Button 
              variant="ghost" 
              className="w-full text-slate-400 font-black hover:text-slate-900 hover:bg-slate-50 h-12 rounded-xl transition-all" 
              onClick={() => { 
                setShowSuccessModal(false); 
                setViewMode('browse'); 
                setCart([]);
                setCustomerData({ name: '', phone: '', address: '' });
                setPaymentData({ mode: 'Cash', paid: '' });
              }}
            >
              Back to Billing Center
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
