'use client';
import { useState, useEffect, useRef } from 'react';
import {
  Search, Plus, Minus, Trash2, ShoppingCart, Package,
  User, CreditCard, Printer, X, Check, FileText, ExternalLink, Wallet, ScanLine, Settings2, IndianRupee, MessageCircle, CalendarClock
} from 'lucide-react';
import { useToast } from './ToastProvider';
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
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Destructure for internal use
  const { name: customerName, phone: customerPhone, address: customerAddress } = customerData;
  const { mode: paymentMode, paid: paidAmount, creditDays = '7' } = paymentData;

  // Setters for internal use
  const setCustomerName = (val) => setCustomerData(prev => ({ ...prev, name: val }));
  const setCustomerPhone = (val) => setCustomerData(prev => ({ ...prev, phone: val }));
  const setCustomerAddress = (val) => setCustomerData(prev => ({ ...prev, address: val }));
  const setPaymentMode = (val) => setPaymentData(prev => ({ ...prev, mode: val }));
  const setPaidAmount = (val) => setPaymentData(prev => ({ ...prev, paid: val }));
  const setCreditDays = (val) => setPaymentData(prev => ({ ...prev, creditDays: val }));
  const [saleResult, setSaleResult] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [taxMode, setTaxMode] = useState('exclusive'); // 'exclusive' or 'inclusive'
  const [saving, setSaving] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [whatsappSending, setWhatsappSending] = useState(false);
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
    if (searchRef.current) searchRef.current.focus();
  }, []);


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

    const existingItem = cart.find((c) => c.product_id === product.id);

    if (existingItem) {
      if (existingItem.quantity >= product.quantity) {
        toast.warning("Cannot add more than available stock");
        return;
      }
      toast.success(`Added another ${product.product_name}`);
      setCart((prev) =>
        prev.map((c) =>
          c.product_id === product.id ? { ...c, quantity: c.quantity + 1 } : c
        )
      );
    } else {
      toast.success(`Added ${product.product_name} to cart`);
      setCart((prev) => [
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
          original_price: product.mrp || product.selling_price,
          gst_rate: product.gst_rate || 0,
          quantity: 1,
          maxQty: product.quantity,
          custom_fields: product.custom_fields || '{}'
        },
      ]);
    }
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

  const updateCartPrice = (productId, newPrice) => {
    setCart((prev) =>
      prev.map((c) =>
        c.product_id === productId ? { ...c, price: parseFloat(newPrice) || 0 } : c
      )
    );
  };

  const updateCartLineTotal = (productId, newLineTotal) => {
    setCart((prev) =>
      prev.map((c) => {
        if (c.product_id !== productId) return c;
        const qty = c.quantity || 1;
        // Use a high-precision price but handle the input total cleanly
        return { ...c, price: (parseFloat(newLineTotal) || 0) / qty };
      })
    );
  };

  const subtotal = cart.reduce((sum, c) => {
    const itemLineTotal = c.price * c.quantity;
    if (taxMode === 'inclusive') {
      return sum + (itemLineTotal / (1 + (c.gst_rate / 100)));
    }
    return sum + itemLineTotal;
  }, 0);

  const originalSubtotal = cart.reduce((sum, c) => {
    const itemLineTotal = c.original_price * c.quantity;
    if (taxMode === 'inclusive') {
      return sum + (itemLineTotal / (1 + (c.gst_rate / 100)));
    }
    return sum + itemLineTotal;
  }, 0);

  const gstEnabled = masterData.gst_enabled !== false;

  const totalGst = gstEnabled ? cart.reduce((sum, c) => {
    const itemLineTotal = c.price * c.quantity;
    if (taxMode === 'inclusive') {
      const basePrice = itemLineTotal / (1 + (c.gst_rate / 100));
      return sum + (itemLineTotal - basePrice);
    }
    return sum + (itemLineTotal * c.gst_rate / 100);
  }, 0) : 0;

  const totalDiscount = cart.reduce((sum, c) => sum + (c.original_price > c.price ? (c.original_price - c.price) * c.quantity : 0), 0);
  
  const rawGrandTotal = (gstEnabled 
    ? (taxMode === 'inclusive' 
        ? cart.reduce((sum, c) => sum + (c.price * c.quantity), 0)
        : subtotal + totalGst)
    : subtotal);
  const grandTotal = Math.round(rawGrandTotal);
  const roundOff = (grandTotal - rawGrandTotal).toFixed(2);
  const balanceDue = Math.max(0, grandTotal - parseFloat(paidAmount || grandTotal));
  const parsedCreditDays = Math.max(0, Math.floor(parseFloat(creditDays) || 0));
  const promisedDate = new Date();
  promisedDate.setDate(promisedDate.getDate() + parsedCreditDays);
  const promisedDateLabel = promisedDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const handleSave = async () => {
    if (cart.length === 0) {
      toast("Please add at least one item to the cart", "warning");
      return;
    }

    if (!customerName || customerName.trim() === '') {
      toast("Customer Name is necessary to generate a bill", "error");
      return;
    }

    if (typeof window === 'undefined' || !window.electronAPI) return;
    setSaving(true);
    let finalPartyId = selectedParty?.id;

    // Auto-match party by name if not selected
    if (!finalPartyId && customerName) {
      const match = parties.find(p => p.name.trim().toLowerCase() === customerName.trim().toLowerCase());
      if (match) {
        finalPartyId = match.id;
        toast(`Linked to existing ledger: ${match.name}`, 'info');
      }
    }

    // Calculate due amount with fallback for empty strings to prevent NaN leakage
    const parsedPaid = parseFloat(paidAmount) || 0;
    const dueAmount = grandTotal - (paidAmount === '' ? grandTotal : parsedPaid);

    // If there is a balance but no party exists, create one automatically
    if (!finalPartyId && dueAmount > 0 && customerName && customerName.toLowerCase() !== 'cash') {
      try {
        // Corrected API method name from 'create' to 'add'
        const partyResult = await window.electronAPI.parties.add({
          name: customerName,
          phone: customerPhone,
          address: customerAddress,
          type: 'Customer',
          opening_balance: 0
        });
        
        // parties.add returns the result of db.run(), so it might have lastInsertRowid
        finalPartyId = partyResult.lastInsertRowid || partyResult.id;
        
        toast(`Created new ledger for ${customerName}`, 'success');
        loadParties(); // Refresh the list
      } catch (e) {
        console.error("Auto-party creation failed", e);
        toast("Failed to create customer ledger automatically", "error");
      }
    }

    try {
      const result = await window.electronAPI.sales.create({
        items: cart.map((c) => ({
          product_id: c.product_id,
          product_name: c.product_name,
          mrp: c.original_price,
          price: c.price,
          quantity: c.quantity,
          gst_rate: c.gst_rate,
        })),
        party_id: finalPartyId,
        customer_name: customerName,
        customer_phone: customerPhone,
        payment_mode: paymentMode,
        paid_amount: paidAmount ? parseFloat(paidAmount) : grandTotal,
        credit_days: dueAmount > 0 ? parsedCreditDays : 0,
        misc_charges: 0,
        tax_mode: taxMode,
      });



      setSaleResult({ 
        ...result, 
        customer_name: customerName, 
        customer_phone: customerPhone, 
        customer_address: customerAddress,
        date: new Date().toLocaleDateString('en-IN'),
        cart: [...cart],
        subtotal,
        originalSubtotal,
        totalGst,
        grandTotal, 
        totalDiscount,
        misc_charges: 0,
        paid_amount: paidAmount ? parseFloat(paidAmount) : grandTotal,
        credit_days: dueAmount > 0 ? parsedCreditDays : 0,
      });
      setCart([]);
      setCustomerData({ name: '', phone: '', address: '' });
      setPaymentData({ mode: 'Cash', paid: '', creditDays: '7' });
      setPartySearch('');
      setSelectedParty(null);
      setShowSuccessModal(true);
      loadProducts();
      toast("Invoice generated successfully!", "success");
    } catch (e) {
      console.error(e);
      toast("Failed to save transaction", "error");
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
        await window.electronAPI.pdf.saveAs(res.buffer, `Invoice_${saleResult.invoice_number || saleResult.invoiceNumber}.pdf`);
        toast.success("PDF Saved Successfully!");
      } else { toast.error("Failed to generate PDF"); }
    } catch (e) { console.error(e); toast.error("Error generating PDF"); }
    setPdfGenerating(false);
  };

  const handlePrint = async () => {
    if (!saleResult || typeof window === 'undefined' || !window.electronAPI) return;
    try {
      const html = generateInvoiceHTML(saleResult, profile);
      await window.electronAPI.ai.printInvoice(html);
      toast.success("Printing invoice...");
    } catch (e) {
      console.error(e);
      toast.error("Print failed");
    }
  };

  const handleWhatsAppInvoice = async () => {
    if (!saleResult || whatsappSending) return;
    
    const phone = saleResult.customer_phone || '';
    if (!phone) {
      toast.error("Customer phone number is missing");
      return;
    }

    const whatsappSettings = typeof profile?.whatsapp_settings === 'string' 
      ? JSON.parse(profile.whatsapp_settings || '{}') 
      : (profile?.whatsapp_settings || {});

    if (!whatsappSettings.enabled) {
      toast.warning("WhatsApp API is not enabled in Settings");
      return;
    }

    setWhatsappSending(true);
    try {
      const html = generateInvoiceHTML(saleResult, profile);
      const pdfRes = await window.electronAPI.pdf.generate(html);
      
      if (pdfRes.success) {
        const res = await window.electronAPI.whatsapp.sendInvoice({
          phone: phone,
          pdfBuffer: pdfRes.buffer,
          fileName: `Invoice_${saleResult.invoice_number}.pdf`,
          message: `Hello ${saleResult.customer_name},\nYour invoice from ${profile?.business_name || 'InBill'} is attached below.`
        });

        if (res.success) {
          toast.success("Invoice sent to WhatsApp!");
        } else {
          toast.error(res.error || "Failed to send WhatsApp");
        }
      } else {
        toast.error("Failed to generate PDF for WhatsApp");
      }
    } catch (e) {
      console.error(e);
      toast.error("WhatsApp delivery error");
    }
    setWhatsappSending(false);
  };

  const handleManualPDFShare = async () => {
    if (!saleResult || pdfGenerating) return;
    
    const phone = (saleResult.customer_phone || '').replace(/\D/g, '');
    if (!phone) {
      toast.error("Customer phone number is missing");
      return;
    }

    const invoiceNo = saleResult.invoice_number || saleResult.invoiceNumber;
    const invoiceUrl = `${window.location.origin}/api/invoice/${encodeURIComponent(invoiceNo)}`;

    const msg = `Hello ${saleResult.customer_name || 'Customer'},\n\n` +
      `Your invoice *#${invoiceNo}* from *${profile?.business_name || 'InBill'}* is ready.\n\n` +
      `💰 *Total: ${CURRENCY}${saleResult.grandTotal?.toLocaleString()}*\n\n` +
      `📄 View & Download Invoice:\n${invoiceUrl}\n\n` +
      `Thank you for your business! 🙏`;

    const wpUrl = `https://wa.me/${phone.length === 10 ? '91' + phone : phone}?text=${encodeURIComponent(msg)}`;
    window.open(wpUrl, '_blank');
    toast.success("Opening WhatsApp with invoice link...");
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
                            <div className="flex flex-col">
                              <p className="text-xl font-black text-slate-900">{CURRENCY}{p.selling_price}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <p className="text-[9px] font-black text-slate-400 uppercase">Cost: {CURRENCY}{p.cost_price}</p>
                                {p.batch_number && (
                                  <p className="text-[9px] font-black text-blue-500 bg-blue-50 px-1 rounded-sm uppercase">{p.batch_number}</p>
                                )}
                              </div>
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
                  <div className="grid sm:grid-cols-3 gap-6 items-end">
                    <div className="relative">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                        Customer Name <span className="text-red-500">*</span>
                      </label>
                      <Input 
                        disabled={saving}
                        placeholder="Name / Business Name" 
                        value={partySearch}
                        onChange={(e) => {
                          setPartySearch(e.target.value);
                          setCustomerName(e.target.value);
                          setShowPartyDropdown(true);
                        }}
                        className="h-12 font-bold bg-slate-50 border-slate-100 focus:bg-white transition-all"
                      />
                      {showPartyDropdown && parties.length > 0 && (
                        <Card className="absolute top-[calc(100%+4px)] left-0 w-full z-50 shadow-2xl border-slate-200 overflow-hidden rounded-2xl animate-in fade-in zoom-in-95">
                          {parties.filter(p => !partySearch || p.name.toLowerCase().includes(partySearch.toLowerCase())).slice(0, 5).map(p => (
                            <div key={p.id} className="p-3 hover:bg-slate-50 cursor-pointer border-b last:border-0 transition-colors" onMouseDown={() => {
                              setSelectedParty(p);
                              setPartySearch(p.name);
                              setCustomerName(p.name);
                              setCustomerPhone(p.phone || '');
                              setCustomerAddress(p.address || '');
                              setShowPartyDropdown(false);
                            }}>
                              <p className="text-sm font-bold text-slate-900">{p.name}</p>
                              <p className="text-[10px] text-slate-400 font-black uppercase">{p.phone || 'No phone'}</p>
                            </div>
                          ))}
                        </Card>
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                        Mobile Number
                      </label>
                      <Input 
                        disabled={saving}
                        placeholder="Phone (WhatsApp)" 
                        value={customerPhone} 
                        onChange={(e) => setCustomerPhone(e.target.value)} 
                        className="h-12 font-bold bg-slate-50 border-slate-100 focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                        Address / City
                      </label>
                      <Input 
                        disabled={saving}
                        placeholder="Location" 
                        value={customerAddress} 
                        onChange={(e) => setCustomerAddress(e.target.value)} 
                        className="h-12 font-bold bg-slate-50 border-slate-100 focus:bg-white transition-all"
                      />
                    </div>
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
                      <>
                        {/* Desktop Cart Table */}
                        <div className="hidden md:block border rounded-lg overflow-hidden">
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
                                    <p className="font-bold text-slate-900 leading-tight">{item.product_name}</p>
                                    <div className="flex items-center gap-1 mt-1">
                                      <span className="text-[10px] font-bold text-slate-400">{CURRENCY}</span>
                                      <input 
                                        disabled={saving}
                                        type="number"
                                        value={item.price}
                                        onChange={(e) => updateCartPrice(item.product_id, e.target.value)}
                                        className="w-20 text-[11px] font-black text-blue-600 bg-blue-50/50 border-none rounded px-1 outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                                      />
                                      <span className="text-[10px] font-bold text-slate-300">/ {item.unit}</span>
                                    </div>
                                  </td>
                                  <td className="p-4">
                                    <div className="flex items-center justify-center gap-2">
                                      <Button disabled={saving} variant="outline" size="icon" className="h-7 w-7" onClick={() => updateCartQty(item.product_id, -1)}><Minus size={12} /></Button>
                                      <span className="w-8 text-center font-bold">{item.quantity}</span>
                                      <Button disabled={saving} variant="outline" size="icon" className="h-7 w-7" onClick={() => updateCartQty(item.product_id, 1)}><Plus size={12} /></Button>
                                    </div>
                                  </td>
                                  <td className="p-4 text-right">
                                    <div className="flex flex-col items-end">
                                      <div className="flex items-center gap-1">
                                        <span className="text-xs font-black text-slate-400">{CURRENCY}</span>
                                        <input 
                                          disabled={saving}
                                          type="number"
                                          value={Math.round(item.price * item.quantity)}
                                          onChange={(e) => updateCartLineTotal(item.product_id, e.target.value)}
                                          className="w-24 text-right font-black text-slate-900 bg-slate-50 border-none rounded px-1 outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                                        />
                                      </div>
                                      {item.original_price > item.price && (
                                        <span className="text-[10px] font-bold text-emerald-600">
                                          -{CURRENCY}{((item.original_price - item.price) * item.quantity).toLocaleString()} OFF
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-4">
                                    <Button disabled={saving} variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50" onClick={() => setCart(cart.filter(c => c.product_id !== item.product_id))}>
                                      <Trash2 size={16} />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile Cart Cards */}
                        <div className="block md:hidden space-y-3">
                          {cart.map((item) => (
                            <div key={item.product_id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col gap-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  {item.brand && <p className="text-[9px] font-bold text-blue-600 uppercase tracking-tighter leading-none mb-0.5">{item.brand}</p>}
                                  <p className="font-bold text-slate-900 text-sm leading-tight">{item.product_name}</p>
                                  {item.product_size && <span className="text-[9px] font-black text-slate-400 uppercase">{item.product_size}</span>}
                                </div>
                                <Button disabled={saving} variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl" onClick={() => setCart(cart.filter(c => c.product_id !== item.product_id))}>
                                  <Trash2 size={14} />
                                </Button>
                              </div>

                              <div className="grid grid-cols-3 gap-3 items-center border-t border-slate-50 pt-3">
                                <div>
                                  <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Price/{item.unit}</div>
                                  <div className="flex items-center gap-0.5">
                                    <span className="text-[10px] font-bold text-slate-400">{CURRENCY}</span>
                                    <input 
                                      disabled={saving}
                                      type="number"
                                      value={item.price}
                                      onChange={(e) => updateCartPrice(item.product_id, e.target.value)}
                                      className="w-full text-xs font-black text-blue-600 bg-blue-50/50 border-none rounded px-1 py-1 outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                                    />
                                  </div>
                                </div>

                                <div className="flex flex-col items-center">
                                  <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Qty</div>
                                  <div className="flex items-center gap-1.5">
                                    <Button disabled={saving} variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => updateCartQty(item.product_id, -1)}><Minus size={10} /></Button>
                                    <span className="w-6 text-center font-black text-sm">{item.quantity}</span>
                                    <Button disabled={saving} variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => updateCartQty(item.product_id, 1)}><Plus size={10} /></Button>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Total</div>
                                  <div className="flex items-center justify-end gap-0.5">
                                    <span className="text-[10px] font-black text-slate-400">{CURRENCY}</span>
                                    <input 
                                      disabled={saving}
                                      type="number"
                                      value={Math.round(item.price * item.quantity)}
                                      onChange={(e) => updateCartLineTotal(item.product_id, e.target.value)}
                                      className="w-full text-right text-xs font-black text-slate-900 bg-slate-50 border-none rounded px-1 py-1 outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                                    />
                                  </div>
                                  {item.original_price > item.price && (
                                    <span className="text-[9px] font-bold text-emerald-600">
                                      -{CURRENCY}{((item.original_price - item.price) * item.quantity).toLocaleString()} OFF
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
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
                    {gstEnabled && (
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
                    )}
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm font-medium text-slate-500">
                        <span>Subtotal</span>
                        <span>{CURRENCY}{subtotal.toLocaleString()}</span>
                      </div>
                      {gstEnabled && (
                        <div className="flex justify-between text-sm font-medium text-slate-500">
                          <div className="flex items-center gap-2">
                            <span>{TAX_LABEL}</span>
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-black border-slate-200 text-slate-400">
                              {taxMode === 'inclusive' ? 'INCLUDED' : 'ADDED'}
                            </Badge>
                          </div>
                          <span>{CURRENCY}{totalGst.toLocaleString()}</span>
                        </div>
                      )}
                      
                      {Number(roundOff) !== 0 && (
                        <div className="flex justify-between text-xs font-bold text-slate-400 italic">
                          <span>Round Off</span>
                          <span>{Number(roundOff) > 0 ? '+' : ''}{roundOff}</span>
                        </div>
                      )}
                      
                      <div className="pt-4 border-t border-slate-100 flex justify-between items-end">
                        <span className="text-sm font-bold text-slate-900">Grand Total</span>
                        <span className="text-3xl font-black text-blue-600 leading-none">{CURRENCY}{grandTotal.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-4">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Payment Mode</label>
                      <Select disabled={saving} value={paymentMode} onValueChange={(v) => {
                        setPaymentMode(v);
                        if (v === 'Credit') setPaidAmount('0');
                      }}>
                        <SelectTrigger className="h-12 font-bold border-slate-200">
                          <SelectValue placeholder="Select Mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cash" className="font-bold">Cash</SelectItem>
                          <SelectItem value="UPI" className="font-bold">UPI / GPay</SelectItem>
                          <SelectItem value="Card" className="font-bold">Card Payment</SelectItem>
                          <SelectItem value="Credit" className="font-bold">Credit (Due All)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 pt-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Amount Paid ({CURRENCY})</label>
                        <div className="flex gap-3">
                          <button 
                            disabled={saving}
                            onClick={() => {
                              setPaidAmount('0');
                              setPaymentMode('Credit');
                            }}
                            className="text-[10px] font-black text-rose-600 hover:underline disabled:opacity-50"
                          >
                            SET CREDIT
                          </button>
                          <button 
                            disabled={saving}
                            onClick={() => setPaidAmount(grandTotal.toString())}
                            className="text-[10px] font-black text-blue-600 hover:underline disabled:opacity-50"
                          >
                            SET FULL
                          </button>
                        </div>
                      </div>
                      <Input 
                        disabled={saving}
                        type="number" 
                        placeholder={grandTotal.toString()} 
                        value={paidAmount} 
                        onChange={(e) => setPaidAmount(e.target.value)}
                        className="h-12 font-black text-slate-900 border-slate-200"
                      />
                    </div>

                    {balanceDue > 0 && (
                      <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 animate-in slide-in-from-top-2">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Balance Due</span>
                          <span className="text-sm font-black text-rose-600">{CURRENCY}{balanceDue.toLocaleString()}</span>
                        </div>
                        {selectedParty ? (
                          <p className="text-[10px] font-bold text-rose-400">This balance will be added to <b>{selectedParty.name}</b>'s ledger.</p>
                        ) : (
                          <p className="text-[10px] font-bold text-rose-400">Select a Customer to track this balance in their ledger.</p>
                        )}
                        <div className="mt-4 rounded-xl bg-white border border-rose-100 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                              <CalendarClock size={14} /> Payment Promise
                            </label>
                            <span className="text-[10px] font-black text-slate-400 uppercase">{promisedDateLabel}</span>
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            {['7', '15', '30'].map((days) => (
                              <button
                                key={days}
                                type="button"
                                onClick={() => setCreditDays(days)}
                                className={`h-9 rounded-xl text-xs font-black border transition-colors ${
                                  String(creditDays) === days
                                    ? 'bg-slate-900 text-white border-slate-900'
                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                {days}D
                              </button>
                            ))}
                          </div>
                          <div className="mt-3">
                            <label className="mb-1 block text-[9px] font-black text-slate-400 uppercase tracking-widest">
                              Custom Days
                            </label>
                            <Input
                              type="number"
                              min="0"
                              value={creditDays}
                              onChange={(e) => setCreditDays(e.target.value)}
                              placeholder="Enter days"
                              className="h-10 rounded-xl border-slate-200 text-center text-sm font-black"
                              aria-label="Custom credit days"
                            />
                          </div>
                        </div>
                      </div>
                    )}


                  </CardContent>
                  <CardFooter className="p-6 bg-slate-50 border-t">
                    <Button 
                      className="w-full h-14 text-lg font-black gap-2 shadow-lg shadow-blue-200" 
                      disabled={cart.length === 0 || saving}
                      onClick={handleSave}
                    >
                      {saving ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <><Printer size={20} /> Complete & Print</>
                      )}
                    </Button>
                  </CardFooter>
                </Card>

                <Button disabled={saving} variant="ghost" className="text-red-500 font-bold hover:bg-red-50" onClick={() => setCart([])}>
                  Discard All Items
                </Button>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-[400px] p-0 overflow-hidden border-none shadow-2xl rounded-[2rem] bg-white animate-in zoom-in-95 duration-200">
          <DialogHeader className="sr-only">
            <DialogTitle>Sale Completed</DialogTitle>
          </DialogHeader>

          <div className="bg-slate-900 p-6 flex flex-col items-center text-white text-center relative overflow-hidden">
            {/* Glossy background effect */}
            <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-br from-indigo-500/20 to-transparent rotate-12 pointer-events-none" />
            
            <div className="relative w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/40 animate-in bounce-in duration-500">
              <Check size={32} strokeWidth={4} className="text-white" />
            </div>
            
            <h2 className="text-xl font-black tracking-tight">Invoice Generated!</h2>
            <p className="opacity-60 text-xs font-bold uppercase tracking-widest mt-1">Order #{saleResult?.invoice_number}</p>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="text-center border-r border-slate-200">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Total Amount</p>
                <p className="text-xl font-black text-slate-900">{CURRENCY}{saleResult?.grandTotal?.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Status</p>
                <p className={`text-xs font-black uppercase ${saleResult?.due_amount <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {saleResult?.due_amount <= 0 ? 'Fully Paid' : 'Credit Sale'}
                </p>
              </div>
            </div>

            {saleResult?.due_amount > 0 && saleResult?.credit_days > 0 && (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3 flex items-center justify-between">
                <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Payment Promise</span>
                <span className="text-xs font-black text-slate-800">After {saleResult.credit_days} days</span>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  className="h-12 gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-black shadow-lg shadow-indigo-100" 
                  onClick={handlePrint}
                >
                  <Printer size={18} /> Print
                </Button>
                <Button 
                  variant="outline"
                  className="h-12 gap-2 rounded-xl border-slate-200 font-black text-slate-700 hover:bg-slate-50" 
                  onClick={handleDownloadPDF} 
                  disabled={pdfGenerating}
                >
                  <FileText size={18} className="text-blue-500" /> Download
                </Button>
              </div>
              
              {(() => {
                const whatsappSettings = typeof profile?.whatsapp_settings === 'string' 
                  ? JSON.parse(profile.whatsapp_settings || '{}') 
                  : (profile?.whatsapp_settings || {});
                
                if (whatsappSettings.enabled) {
                  return (
                    <Button 
                      variant="outline"
                      className={`h-12 gap-2 rounded-xl border-emerald-100 bg-emerald-50/50 font-black text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200 ${whatsappSending ? 'animate-pulse' : ''}`} 
                      onClick={handleWhatsAppInvoice}
                      disabled={whatsappSending}
                    >
                      {whatsappSending ? (
                        <>Sending PDF...</>
                      ) : (
                        <><MessageCircle size={18} className="text-emerald-500" /> Share on WhatsApp</>
                      )}
                    </Button>
                  );
                }
                return (
                  <Button 
                    variant="outline"
                    className="h-12 gap-2 rounded-xl border-emerald-100 bg-emerald-50/50 font-black text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200" 
                    onClick={handleManualPDFShare}
                  >
                    <MessageCircle size={18} className="text-emerald-500" /> Share Invoice on WhatsApp
                  </Button>
                );
              })()}

              <Button 
                variant="link"
                className="text-[10px] font-black text-slate-400 hover:text-emerald-600 h-6" 
                onClick={() => {
                  if (!saleResult) return;
                  const phone = (saleResult.customer_phone || '').replace(/\D/g, '');
                  if (!phone) {
                    toast.info("Customer phone is required for WhatsApp");
                    return;
                  }

                  // Build Professional Text Invoice
                  let itemLines = (saleResult.cart || []).map(item => 
                    `• ${item.product_name} (${item.quantity} x ${item.price}) = ${CURRENCY}${item.price * item.quantity}`
                  ).join('\n');

                  const msg = `*${(profile?.business_name || 'INVOICE').toUpperCase()}*\n` +
                              `Invoice #${saleResult.invoice_number}\n` +
                              `Date: ${saleResult.date}\n` +
                              `--------------------------------\n` +
                              `*ITEMS:*\n${itemLines}\n` +
                              `--------------------------------\n` +
                              `*TOTAL: ${CURRENCY}${saleResult.grandTotal?.toLocaleString()}*\n` +
                              `--------------------------------\n` +
                              `Thank you for your business!`;

                  const wpUrl = `https://wa.me/${phone.length === 10 ? '91' + phone : phone}?text=${encodeURIComponent(msg)}`;
                  window.open(wpUrl, '_blank');
                }}
              >
                Alternative: Send Text Invoice
              </Button>
            </div>

            <Button 
              variant="ghost" 
              className="w-full text-slate-400 font-black hover:text-slate-900 h-10 rounded-xl" 
              onClick={() => { 
                setShowSuccessModal(false); 
                setViewMode('browse'); 
                setCart([]);
                setCustomerData({ name: '', phone: '', address: '' });
                setPaymentData({ mode: 'Cash', paid: '', creditDays: '7' });
              }}
            >
              Done & New Sale
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
