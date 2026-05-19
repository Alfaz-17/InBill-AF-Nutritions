'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// ═══════════════════════════════════════════════════════
// SVG Icons (Inline to ensure zero-dependency compilation)
// ═══════════════════════════════════════════════════════
const HistoryIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"></path>
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
);

const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
  </svg>
);

const PrinterIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9"></polyline>
    <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"></path>
    <rect x="6" y="14" width="12" height="8"></rect>
  </svg>
);

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const FileIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
  </svg>
);

// ═══════════════════════════════════════════════════════
// Interfaces
// ═══════════════════════════════════════════════════════
interface BusinessProfile {
  business_name: string;
  phone: string;
  email: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  pincode: string;
  gstin: string;
  pan_number: string;
  bank_name: string;
  bank_account_no: string;
  bank_ifsc: string;
  terms_and_conditions: string;
  whatsapp_number: string;
  instagram_id: string;
  gst_enabled: boolean;
  currency_symbol: string;
  logo_url?: string;
}

interface CartItem {
  id: string;
  product_name: string;
  price: number;
  quantity: number;
  gst_rate: number;
}

interface OfflineInvoice {
  invoice_number: string;
  date: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  payment_mode: 'Cash' | 'UPI' | 'Credit';
  credit_days: number;
  items: CartItem[];
  subtotal: number;
  total_gst: number;
  grand_total: number;
}

const numberToWords = (num: number): string => {
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
    'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen',
    'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen',
    'Nineteen'
  ];
  const b = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty',
    'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  const inWords = (n: number): string => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred ' + (n % 100 ? inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand ' + (n % 1000 ? inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh ' + (n % 100000 ? inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + ' Crore ' + (n % 10000000 ? inWords(n % 10000000) : '');
  };

  return inWords(Math.round(num));
};

const DEFAULT_PROFILE: BusinessProfile = {
  business_name: 'AF NUTRITION',
  phone: '9988776655',
  email: 'info@afnutrition.com',
  address_line1: '123 Health Plaza',
  address_line2: 'Gym Road, Sector 5',
  city: 'Mumbai',
  state: 'Maharashtra',
  pincode: '400001',
  gstin: '27AAAAA1111A1Z1',
  pan_number: 'AAAAA1111A',
  bank_name: 'HDFC Bank',
  bank_account_no: '50100012345678',
  bank_ifsc: 'HDFC0000001',
  terms_and_conditions: '1. Goods once sold will not be taken back.\n2. Interest @ 18% will be charged if payment is not made within due date.',
  whatsapp_number: '919988776655',
  instagram_id: 'af_nutrition',
  gst_enabled: false,
  currency_symbol: '₹',
  logo_url: '',
};

function HomeComponent() {
  const [tab, setTab] = useState<'history' | 'new' | 'settings'>('new');
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);

  // Persistence States
  const [profile, setProfile] = useState<BusinessProfile>(DEFAULT_PROFILE);
  const [history, setHistory] = useState<OfflineInvoice[]>([]);
  
  // Invoice states
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Credit'>('Cash');
  const [creditDays, setCreditDays] = useState(30);
  const [cart, setCart] = useState<CartItem[]>([
    { id: '1', product_name: '', price: 0, quantity: 1, gst_rate: 18 }
  ]);

  // Modals & triggers
  const [selectedInvoice, setSelectedInvoice] = useState<OfflineInvoice | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Mount logic
  useEffect(() => {
    const savedProfile = localStorage.getItem('inbill_offline_profile');
    if (savedProfile) {
      try { setProfile(JSON.parse(savedProfile)); } catch (e) {}
    } else {
      localStorage.setItem('inbill_offline_profile', JSON.stringify(DEFAULT_PROFILE));
    }

    const savedHistory = localStorage.getItem('inbill_offline_invoices');
    if (savedHistory) {
      try { setHistory(JSON.parse(savedHistory)); } catch (e) {}
    }

    setInvoiceDate(new Date().toISOString().split('T')[0]);
    generateNextInvoiceNo();
  }, []);

  const generateNextInvoiceNo = () => {
    const savedHistory = localStorage.getItem('inbill_offline_invoices');
    let nextNum = 10;
    if (savedHistory) {
      try {
        const list: OfflineInvoice[] = JSON.parse(savedHistory);
        const parsedNums = list
          .map(inv => {
            const match = inv.invoice_number.match(/INV-(\d+)/) || inv.invoice_number.match(/INV(\d+)/) || inv.invoice_number.match(/MOB-(\d+)/);
            return match ? parseInt(match[1]) : null;
          })
          .filter((n): n is number => n !== null);
        if (parsedNums.length > 0) {
          nextNum = Math.max(...parsedNums) + 1;
        }
      } catch (e) {}
    }
    const padded = String(nextNum).padStart(3, '0');
    setInvoiceNumber(`INV-${padded}`);
  };



  const saveProfileSettings = (updated: BusinessProfile) => {
    setProfile(updated);
    localStorage.setItem('inbill_offline_profile', JSON.stringify(updated));
    showToast('Shop profile settings saved perfectly!', 'success');
  };

  const addCartRow = () => {
    const newId = Math.random().toString(36).substring(2, 7);
    setCart([...cart, { id: newId, product_name: '', price: 0, quantity: 1, gst_rate: 18 }]);
  };

  const removeCartRow = (id: string) => {
    if (cart.length === 1) return;
    setCart(cart.filter(item => item.id !== id));
  };

  const updateCartField = (id: string, field: keyof CartItem, value: any) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        let cleanVal = value;
        if (field === 'price' || field === 'quantity' || field === 'gst_rate') {
          cleanVal = Number(value);
        }
        return { ...item, [field]: cleanVal };
      }
      return item;
    }));
  };

  const adjustQty = (id: string, amount: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        return { ...item, quantity: Math.max(1, item.quantity + amount) };
      }
      return item;
    }));
  };

  const getInvoiceTotals = () => {
    let subtotal = 0;
    let totalGst = 0;

    cart.forEach(item => {
      const lineAmount = item.price * item.quantity;
      if (profile.gst_enabled) {
        const base = lineAmount / (1 + (item.gst_rate / 100));
        subtotal += base;
        totalGst += (lineAmount - base);
      } else {
        subtotal += lineAmount;
      }
    });

    return {
      subtotal,
      totalGst: profile.gst_enabled ? totalGst : 0,
      grandTotal: Math.round(subtotal + totalGst)
    };
  };

  const totals = getInvoiceTotals();

  const handleGenerateInvoice = () => {
    if (cart.some(i => !i.product_name.trim())) {
      showToast('Please fill in product descriptions for all rows.', 'error');
      return;
    }

    const { subtotal, totalGst, grandTotal } = getInvoiceTotals();
    const newInvoice: OfflineInvoice = {
      invoice_number: invoiceNumber || `MOB-${Date.now().toString().slice(-4)}`,
      date: invoiceDate,
      customer_name: customerName.trim() || 'Counter Sale',
      customer_phone: customerPhone.trim(),
      customer_address: customerAddress.trim(),
      payment_mode: paymentMode,
      credit_days: paymentMode === 'Credit' ? creditDays : 0,
      items: cart,
      subtotal,
      total_gst: totalGst,
      grand_total: grandTotal
    };

    const updated = [newInvoice, ...history];
    setHistory(updated);
    localStorage.setItem('inbill_offline_invoices', JSON.stringify(updated));

    printInvoice(newInvoice, profile);

    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setCart([{ id: '1', product_name: '', price: 0, quantity: 1, gst_rate: 18 }]);
    generateNextInvoiceNo();
    setWizardStep(1);
    setTab('history');
  };

  const handleSaveCopyAndWhatsApp = () => {
    if (cart.some(i => !i.product_name.trim())) {
      showToast('Please fill in product descriptions for all rows.', 'error');
      return;
    }

    const { subtotal, totalGst, grandTotal } = getInvoiceTotals();
    const newInvoice: OfflineInvoice = {
      invoice_number: invoiceNumber || `MOB-${Date.now().toString().slice(-4)}`,
      date: invoiceDate,
      customer_name: customerName.trim() || 'Counter Sale',
      customer_phone: customerPhone.trim(),
      customer_address: customerAddress.trim(),
      payment_mode: paymentMode,
      credit_days: paymentMode === 'Credit' ? creditDays : 0,
      items: cart,
      subtotal,
      total_gst: totalGst,
      grand_total: grandTotal
    };

    const updated = [newInvoice, ...history];
    setHistory(updated);
    localStorage.setItem('inbill_offline_invoices', JSON.stringify(updated));

    const lines = [
      `--- ${profile.business_name || 'INBILL'} OFFLINE BILL ---`,
      `Invoice No: ${newInvoice.invoice_number}`,
      `Date: ${newInvoice.date}`,
      `Customer Name: ${newInvoice.customer_name}`,
      newInvoice.customer_phone ? `Phone No: ${newInvoice.customer_phone}` : '',
      `Payment Mode: ${newInvoice.payment_mode}`,
      ``,
      `Items:`,
      ...newInvoice.items.map((item, idx) => `• ${item.product_name} | Qty: ${item.quantity} | Price: ${profile.currency_symbol}${item.price} | GST: ${item.gst_rate}%`),
      ``,
      `Subtotal: ${profile.currency_symbol}${Math.round(newInvoice.subtotal)}`,
      `GST Tax: ${profile.currency_symbol}${Math.round(newInvoice.total_gst)}`,
      `Grand Total: ${profile.currency_symbol}${newInvoice.grand_total}`,
      `\nThank you for billing with us!`,
    ].filter(Boolean);

    navigator.clipboard.writeText(lines.join('\n'))
      .then(() => {
        showToast('Saved & copied details to clipboard!', 'success');
      })
      .catch(() => {
        showToast('Saved but clipboard permission blocked!', 'error');
      });

    if (newInvoice.customer_phone) {
      const cleanPhone = newInvoice.customer_phone.replace(/\D/g, '');
      const number = cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone;
      const msg = `Hi ${newInvoice.customer_name},\nHere is your invoice *#${newInvoice.invoice_number}* from *${profile.business_name || 'us'}*.\n\n*Amount Due:* ${profile.currency_symbol}${newInvoice.grand_total}\n*Payment Mode:* ${newInvoice.payment_mode}\n\n(Complete item breakdown copied to clipboard. Press paste to send!)`;
      
      setTimeout(() => {
        window.open(`https://wa.me/${number}?text=${encodeURIComponent(msg)}`, '_blank');
      }, 500);
    } else {
      showToast('Saved & Copied! No customer phone for WhatsApp redirect.', 'info');
    }

    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setCart([{ id: '1', product_name: '', price: 0, quantity: 1, gst_rate: 18 }]);
    generateNextInvoiceNo();
    setWizardStep(1);
    setTab('history');
  };

  const handleDownloadSharePdfOnWhatsApp = () => {
    if (cart.some(i => !i.product_name.trim())) {
      showToast('Please fill in product descriptions for all rows.', 'error');
      return;
    }

    const { subtotal, totalGst, grandTotal } = getInvoiceTotals();
    const newInvoice: OfflineInvoice = {
      invoice_number: invoiceNumber || `MOB-${Date.now().toString().slice(-4)}`,
      date: invoiceDate,
      customer_name: customerName.trim() || 'Counter Sale',
      customer_phone: customerPhone.trim(),
      customer_address: customerAddress.trim(),
      payment_mode: paymentMode,
      credit_days: paymentMode === 'Credit' ? creditDays : 0,
      items: cart,
      subtotal,
      total_gst: totalGst,
      grand_total: grandTotal
    };

    const updated = [newInvoice, ...history];
    setHistory(updated);
    localStorage.setItem('inbill_offline_invoices', JSON.stringify(updated));

    printInvoice(newInvoice, profile);
    
    try {
      navigator.clipboard.writeText(`${newInvoice.invoice_number}.pdf`);
      showToast('PDF name copied! Paste in WhatsApp document picker!', 'success');
    } catch (e) {
      showToast('PDF downloaded! Redirecting to WhatsApp...', 'success');
    }

    if (newInvoice.customer_phone) {
      const cleanPhone = newInvoice.customer_phone.replace(/\D/g, '');
      const number = cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone;
      const msg = `Hi ${newInvoice.customer_name},\nHere is your invoice *#${newInvoice.invoice_number}* from *${profile.business_name || 'us'}*.\n\n📎 *PDF Invoice downloaded. Tap the attachment icon (Document) to select and send it!*`;
      
      setTimeout(() => {
        window.open(`https://wa.me/${number}?text=${encodeURIComponent(msg)}`, '_blank');
      }, 1500);
    }

    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setCart([{ id: '1', product_name: '', price: 0, quantity: 1, gst_rate: 18 }]);
    generateNextInvoiceNo();
    setWizardStep(1);
    setTab('history');
  };

  const printInvoice = (invoice: OfflineInvoice, biz: BusinessProfile) => {
    const C = biz.currency_symbol || '₹';
    
    const escapeHtml = (val: string) =>
      String(val ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    const formatMoney = (value: number) => {
      const num = Number(value || 0);
      return isNaN(num) ? '0.00' : num.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    };

    const companyAddressVal = [
      biz.address_line1,
      biz.address_line2,
      biz.city,
      biz.state,
      biz.pincode
    ].filter(Boolean).map(escapeHtml).join(', ');

    let untaxedSubtotal = 0;
    let totalGstAmount = 0;

    const rowsHtmlList = invoice.items.map((item, index) => {
      const qty = Number(item.quantity || 0);
      const rate = Number(item.price || 0);
      const gstPercent = Number(item.gst_rate || 0);
      const originalPrice = rate;

      let rowUntaxedTotal = 0;
      let rowTaxAmount = 0;

      if (biz.gst_enabled) {
        const rowTotalPaid = qty * rate;
        rowUntaxedTotal = rowTotalPaid / (1 + gstPercent / 100);
        rowTaxAmount = rowTotalPaid - rowUntaxedTotal;
      } else {
        rowUntaxedTotal = qty * rate;
        rowTaxAmount = 0;
      }

      untaxedSubtotal += rowUntaxedTotal;
      totalGstAmount += rowTaxAmount;

      return `
        <tr>
          <td style="border: 1px solid #000000; padding: 10px 4px; text-align: center; font-size: 11px; font-weight: 500;">
            ${index + 1}
          </td>
          <td style="border: 1px solid #000000; padding: 10px 8px; text-align: left; font-size: 11px; font-weight: 500; line-height: 1.4; color: #1e293b;">
            ${escapeHtml(item.product_name)}
          </td>
          <td style="border: 1px solid #000000; padding: 10px 4px; text-align: center; font-size: 11px; font-weight: 500; white-space: nowrap;">
            ${qty.toFixed(2)} Pcs
          </td>
          <td style="border: 1px solid #000000; padding: 10px 6px; text-align: center; font-size: 11px; font-weight: 500;">
            ${formatMoney(originalPrice)}
          </td>
          <td style="border: 1px solid #000000; padding: 10px 4px; text-align: center; font-size: 11px; font-weight: 500; line-height: 1.25;">
            0%
          </td>
          ${
            biz.gst_enabled
              ? `
              <td style="border: 1px solid #000000; padding: 10px 4px; text-align: center; font-size: 11px; font-weight: 500;">
                ${gstPercent.toFixed(1)}
              </td>
            `
              : ''
          }
          <td style="border: 1px solid #000000; padding: 10px 8px; text-align: right; font-size: 11px; font-weight: 600; color: #1e293b;">
            ${C} ${formatMoney(rowUntaxedTotal)}
          </td>
        </tr>
      `;
    });

    let allRowsHtml = rowsHtmlList.join('');
    const minRows = 5;
    if (invoice.items.length < minRows) {
      const emptyRowsCount = minRows - invoice.items.length;
      for (let i = 0; i < emptyRowsCount; i++) {
        allRowsHtml += `
          <tr style="height: 38px;">
            <td style="border: 1px solid #000000; padding: 10px 4px; text-align: center; font-size: 11px;"></td>
            <td style="border: 1px solid #000000; padding: 10px 8px; text-align: left; font-size: 11px;"></td>
            <td style="border: 1px solid #000000; padding: 10px 4px; text-align: center; font-size: 11px;"></td>
            <td style="border: 1px solid #000000; padding: 10px 6px; text-align: center; font-size: 11px;"></td>
            <td style="border: 1px solid #000000; padding: 10px 4px; text-align: center; font-size: 11px;"></td>
            ${
              biz.gst_enabled
                ? `
                <td style="border: 1px solid #000000; padding: 10px 4px; text-align: center; font-size: 11px;"></td>
              `
                : ''
            }
            <td style="border: 1px solid #000000; padding: 10px 8px; text-align: right; font-size: 11px;"></td>
          </tr>
        `;
      }
    }

    const halfGst = totalGstAmount / 2;
    const displayUntaxed = biz.gst_enabled ? untaxedSubtotal : invoice.subtotal;

    const template = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <title>Invoice - ${invoice.invoice_number}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

          @page {
            size: A4;
            margin: 0;
          }

          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          body {
            margin: 0;
            background: #ffffff;
            font-family: 'Inter', sans-serif;
            color: #1e293b;
          }

          .page {
            width: 210mm;
            height: 297mm;
            margin: 0;
            background: #ffffff;
            padding: 12mm 15mm;
            box-sizing: border-box;
          }

          table {
            border-collapse: collapse;
          }

          @media print {
            body {
              background: #ffffff !important;
            }
            .page {
              margin: 0 !important;
              padding: 10mm !important;
              box-shadow: none !important;
            }
          }
        </style>
      </head>
      <body>

      <div class="page">

        <!-- HEADER -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <tr>
            <td style="width: 40%; vertical-align: top; border: none !important; padding: 0;">
              ${
                biz.logo_url
                  ? `<img src="${biz.logo_url}" style="max-height: 70px; max-width: 180px; object-fit: contain; display: block;" />`
                  : ''
              }
            </td>
            <td style="width: 60%; text-align: right; vertical-align: top; border: none !important; padding: 0; line-height: 1.45;">
              <div style="color: #000000; font-size: 22px; font-weight: 700; margin-bottom: 3px;">
                ${escapeHtml(biz.business_name || 'P M Nutrition')}
              </div>
              <div style="font-size: 10.5px; color: #334155; font-weight: 500;">
                ${companyAddressVal}
              </div>
              ${
                biz.phone
                  ? `
                  <div style="font-size: 10.5px; color: #334155; font-weight: 700; margin-top: 2px;">
                    MO: ${escapeHtml(biz.phone)}
                  </div>
                `
                  : ''
              }
              ${
                biz.email
                  ? `
                  <div style="font-size: 10.5px; color: #334155; font-weight: 700; margin-top: 2px;">
                    Email: ${escapeHtml(biz.email)}
                  </div>
                `
                  : ''
              }
              ${
                biz.pan_number
                  ? `
                  <div style="font-size: 10.5px; color: #334155; font-weight: 700; margin-top: 2px;">
                    PAN: ${escapeHtml(biz.pan_number)}
                  </div>
                `
                  : ''
              }
              ${
                biz.gst_enabled && biz.gstin
                  ? `
                  <div style="font-size: 10.5px; color: #334155; font-weight: 700; margin-top: 2px;">
                    GSTIN: ${escapeHtml(biz.gstin)}
                  </div>
                `
                  : ''
              }
            </td>
          </tr>
        </table>

        <!-- CUSTOMER & INVOICE METADATA BOX (Strict Bordered Box) -->
        <table style="width: 100%; border: 1.5px solid #000000; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <!-- Customer Column -->
            <td style="width: 58%; border: 1.5px solid #000000 !important; padding: 10px 12px; vertical-align: top; font-size: 11px; line-height: 1.5; color: #1e293b;">
              <div style="font-weight: 700; font-size: 12.5px; margin-bottom: 2px; color: #000000; text-transform: lowercase;">
                ${escapeHtml(invoice.customer_name)}
              </div>
              ${
                invoice.customer_phone
                  ? `
                  <div style="font-weight: 700; color: #000000; margin-bottom: 2px;">
                    ${escapeHtml(invoice.customer_phone)}
                  </div>
                `
                  : ''
              }
              ${
                invoice.customer_address
                  ? `
                  <div style="font-weight: 400; color: #334155; margin-bottom: 2px; white-space: pre-line;">
                    ${escapeHtml(invoice.customer_address)}
                  </div>
                `
                  : ''
              }
              ${
                invoice.customer_phone
                  ? `
                  <div style="font-weight: 400; color: #334155;">
                    Mobile: +91 ${escapeHtml(
                      invoice.customer_phone.replace(/^\+?91\s*/, '')
                    )}
                  </div>
                `
                  : ''
              }
            </td>
            <!-- Invoice Meta Column -->
            <td style="width: 42%; border: 1.5px solid #000000 !important; padding: 10px 12px; vertical-align: top; font-size: 11.5px; line-height: 1.6; color: #1e293b;">
              <div>
                <strong>Invoice No:</strong>
                #${escapeHtml(invoice.invoice_number)}
              </div>
              <div>
                <strong>Date:</strong>
                ${escapeHtml(invoice.date)}
              </div>
              <div>
                <strong>Payment:</strong>
                ${escapeHtml(invoice.payment_mode)}
              </div>
            </td>
          </tr>
        </table>

        <!-- ITEMS TABLE -->
        <table style="width: 100%; border: 1.5px solid #000000; border-collapse: collapse; margin-bottom: 18px;">
          <thead>
            <tr style="background-color: #ffffff;">
              <th style="border: 1.5px solid #000000 !important; padding: 8px 4px; font-size: 10px; font-weight: 700; text-align: center; width: 4%; color: #334155;">#</th>
              <th style="border: 1.5px solid #000000 !important; padding: 8px 8px; font-size: 10px; font-weight: 700; text-align: left; width: 54%; color: #334155;">DESCRIPTION</th>
              <th style="border: 1.5px solid #000000 !important; padding: 8px 4px; font-size: 10px; font-weight: 700; text-align: center; width: 10%; color: #334155;">QUANTITY</th>
              <th style="border: 1.5px solid #000000 !important; padding: 8px 4px; font-size: 10px; font-weight: 700; text-align: right; width: 9%; color: #334155;">PRICE</th>
              <th style="border: 1.5px solid #000000 !important; padding: 8px 4px; font-size: 10px; font-weight: 700; text-align: center; width: 8%; color: #334155;">DISC.%</th>
              ${
                biz.gst_enabled
                  ? `
                  <th style="border: 1.5px solid #000000 !important; padding: 8px 4px; font-size: 10px; font-weight: 700; text-align: center; width: 5%; color: #334155;">GST</th>
                `
                  : ''
              }
              <th style="border: 1.5px solid #000000 !important; padding: 8px 6px; font-size: 10px; font-weight: 700; text-align: right; width: 10%; color: #334155; line-height: 1.2;">TOTAL<br>PRICE</th>
            </tr>
          </thead>
          <tbody>
            ${allRowsHtml}
          </tbody>
        </table>

        <!-- TOTAL & SUMMARY SECTION -->
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr>
            <!-- Amount in Words (Left) -->
            <td style="width: 55%; vertical-align: top; padding-right: 20px; border: none !important;">
              <div style="font-size: 11.5px; font-weight: 700; line-height: 1.6; color: #000000;">
                Total (In Words): Rupees ${escapeHtml(numberToWords(invoice.grand_total))} Only
              </div>
            </td>
            <!-- Summary Table (Right) -->
            <td style="width: 45%; vertical-align: top; padding: 0; border: none !important;">
              <table style="width: 100%; border: 1.5px solid #000000; border-collapse: collapse;">
                <tr>
                  <td style="border: 1px solid #000000; padding: 6px 10px; font-size: 11px; font-weight: 500; color: #475569;">Sub Total</td>
                  <td style="border: 1px solid #000000; padding: 6px 10px; font-size: 11px; text-align: right; font-weight: 700; color: #000000;">
                    ${C} ${formatMoney(displayUntaxed)}
                  </td>
                </tr>
                ${
                  biz.gst_enabled
                    ? `
                    <tr>
                      <td style="border: 1px solid #000000; padding: 6px 10px; font-size: 11px; font-weight: 500; color: #475569;">SGST</td>
                      <td style="border: 1px solid #000000; padding: 6px 10px; font-size: 11px; text-align: right; font-weight: 700; color: #000000;">
                        ${C} ${formatMoney(halfGst)}
                      </td>
                    </tr>
                    <tr>
                      <td style="border: 1px solid #000000; padding: 6px 10px; font-size: 11px; font-weight: 500; color: #475569;">CGST</td>
                      <td style="border: 1px solid #000000; padding: 6px 10px; font-size: 11px; text-align: right; font-weight: 700; color: #000000;">
                        ${C} ${formatMoney(halfGst)}
                      </td>
                    </tr>
                  `
                    : ''
                }
                <tr style="font-weight: 800; font-size: 12.5px; color: #000000;">
                  <td style="border: 1.5px solid #000000 !important; padding: 8px 10px; font-weight: 800;">Total</td>
                  <td style="border: 1.5px solid #000000 !important; padding: 8px 10px; text-align: right; font-weight: 800; color: #000000;">
                    ${C} ${formatMoney(invoice.grand_total)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- TERMS AND SIGNATURE FOOTER -->
        <table style="width: 100%; border-collapse: collapse; margin-top: 40px;">
          <tr>
            <td style="width: 100%; vertical-align: top; border: none !important; font-size: 11px; color: #4b5563; line-height: 1.6; padding: 0;">
              ${
                biz.terms_and_conditions
                  ? `
                  <div style="margin-bottom: 12px;">
                    <strong style="color: #111827;">Terms & Conditions:</strong><br>
                    <span style="font-size: 9.5px; color: #4b5563;">${escapeHtml(
                      biz.terms_and_conditions
                    ).replace(/\n/g, '<br>')}</span>
                  </div>
                `
                  : ''
              }
              <div style="display: flex; gap: 15px; margin-top: 5px;">
                ${
                  biz.whatsapp_number
                    ? `
                    <div style="display: flex; align-items: center; gap: 4px; color: #000000; font-weight: 600; font-size: 10.5px;">
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" style="color: #25D366;"><path d="M12.004 2C6.51 2 2.014 6.5 2.014 12c0 2.13.67 4.19 1.9 5.92L2.03 22l4.22-1.1c1.66.9 3.52 1.37 5.75 1.37 5.49 0 9.99-4.5 9.99-10S17.5 2 12.004 2zm0 18.3c-1.92 0-3.66-.5-5.17-1.46l-.37-.22-2.52.66.68-2.46-.24-.38c-1.05-1.68-1.6-3.66-1.6-5.71 0-4.65 3.79-8.44 8.44-8.44 4.65 0 8.44 3.79 8.44 8.44s-3.79 8.44-8.44 8.44zM16.5 13.5c-.24-.12-1.44-.71-1.66-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.02-.37-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.79-.2-.48-.38-.41-.54-.42H8.76c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.33.98 2.49c.12.16 1.69 2.58 4.1 3.62.58.25 1.02.4 1.37.51.58.18 1.1.16 1.52.1.47-.07 1.44-.59 1.64-1.15.2-.56.2-1.03.14-1.13-.06-.1-.22-.16-.46-.28z"/></svg>
                      <span>+${escapeHtml(biz.whatsapp_number)}</span>
                    </div>
                  `
                    : ''
                }
                ${
                  biz.instagram_id
                    ? `
                    <div style="display: flex; align-items: center; gap: 4px; color: #000000; font-weight: 600; font-size: 10.5px;">
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" style="color: #E1306C;"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                      <span>@${escapeHtml(biz.instagram_id)}</span>
                    </div>
                  `
                    : ''
                }
              </div>
            </td>
          </tr>
        </table>

      </div>

      </body>
      </html>
    `;

    const executeDownload = async () => {
      try {
        const html2pdf = (await import('html2pdf.js')).default;
        
        const container = document.createElement('div');
        container.innerHTML = template;
        
        // Temporarily append styled container behind the main viewport to ensure perfect canvas rendering
        container.style.position = 'fixed';
        container.style.left = '0';
        container.style.top = '0';
        container.style.zIndex = '-9999';
        container.style.pointerEvents = 'none';
        container.style.width = '794px'; // 210mm wide at 96 DPI
        container.style.background = '#ffffff';
        document.body.appendChild(container);
        
        const opt: any = {
          margin:       0, // Bypasses extra double page wrap-around margins
          filename:     `${invoice.invoice_number}.pdf`,
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { 
            scale: 2.2, 
            useCORS: true, 
            logging: false,
            width: 794,
            windowWidth: 794 // Lock rendering context to standard desktop viewport
          },
          jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().from(container).set(opt).save().then(() => {
          document.body.removeChild(container);
          showToast('PDF downloaded successfully!', 'success');
        }).catch((err: any) => {
          if (container.parentNode) {
            document.body.removeChild(container);
          }
          console.error('PDF Generation Error:', err);
        });
      } catch (err) {
        console.error('Failed to load html2pdf library locally:', err);
        showToast('PDF Generation failed locally.', 'error');
      }
    };

    executeDownload();
  };

  const copyInvoicePlainText = (inv: OfflineInvoice) => {
    const lines = [
      `--- INBILL OFFLINE BILL ---`,
      `Invoice No: ${inv.invoice_number}`,
      `Date: ${inv.date}`,
      `Customer Name: ${inv.customer_name}`,
      inv.customer_phone ? `Phone No: ${inv.customer_phone}` : '',
      `Payment Mode: ${inv.payment_mode}`,
      `Items:`,
      ...inv.items.map((item, idx) => `${idx + 1}. ${item.product_name} | Qty: ${item.quantity} | Rate: ${profile.currency_symbol}${item.price} | GST: ${item.gst_rate}%`),
      `Subtotal: ${profile.currency_symbol}${Math.round(inv.subtotal)}`,
      `GST Tax: ${profile.currency_symbol}${Math.round(inv.total_gst)}`,
      `Grand Total: ${profile.currency_symbol}${inv.grand_total}`,
    ].filter(Boolean);

    navigator.clipboard.writeText(lines.join('\n'));
    showToast(`Invoice #${inv.invoice_number} copied for Desktop!`, 'success');
  };

  const handleWhatsAppShare = (inv: OfflineInvoice) => {
    printInvoice(inv, profile);
    
    try {
      navigator.clipboard.writeText(`${inv.invoice_number}.pdf`);
      showToast('PDF name copied! Paste in WhatsApp document picker!', 'success');
    } catch (e) {
      showToast('PDF downloaded! Redirecting to WhatsApp...', 'success');
    }

    const cleanPhone = inv.customer_phone.replace(/\D/g, '');
    const number = cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone;
    const msg = `Hi ${inv.customer_name},\nHere is your invoice *#${inv.invoice_number}* from *${profile.business_name}*.\n\n📎 *PDF Invoice downloaded. Tap the attachment icon (Document) to select and send it!*`;
    
    setTimeout(() => {
      window.open(`https://wa.me/${number}?text=${encodeURIComponent(msg)}`, '_blank');
    }, 1500);
  };

  const handleDeleteInvoice = (invNo: string) => {
    if (!confirm('Are you sure you want to delete this invoice record from history?')) return;
    const updated = history.filter(item => item.invoice_number !== invNo);
    setHistory(updated);
    localStorage.setItem('inbill_offline_invoices', JSON.stringify(updated));
    setSelectedInvoice(null);
    showToast('Invoice deleted from history', 'info');
  };

  const filteredHistory = history.filter(inv => {
    const q = searchQuery.toLowerCase();
    return inv.customer_name.toLowerCase().includes(q) || inv.invoice_number.toLowerCase().includes(q);
  });

  const currencySymbol = profile.currency_symbol || '₹';

  return (
    <div className="app-body">
      {toast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(12px)',
          border: '1.5px solid rgba(255, 255, 255, 0.15)',
          padding: '12px 24px',
          borderRadius: '16px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#ffffff',
          fontWeight: 800,
          fontSize: '12px',
          whiteSpace: 'nowrap',
          animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          {toast.type === 'success' && <span style={{ color: '#10b981', fontSize: '15px', fontWeight: 900 }}>✓</span>}
          {toast.type === 'error' && <span style={{ color: '#ef4444', fontSize: '15px', fontWeight: 900 }}>✗</span>}
          {toast.type === 'info' && <span style={{ color: '#3b82f6', fontSize: '15px', fontWeight: 900 }}>ℹ</span>}
          <span>{toast.message}</span>
        </div>
      )}
      <style>{`
        @keyframes slideDown {
          from { transform: translate(-50%, -20px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
      
      {/* Premium System Header */}
      <header className="app-header">
        <div className="app-header-logo">IB</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1>{profile.business_name}</h1>
          <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--indigo-500)', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginTop: '2px' }}>
            Emergency Bill Maker
          </span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: 'var(--emerald-50)', border: '1px solid rgba(16,185,129,0.2)', padding: '5px 10px', borderRadius: '8px' }}>
            <span style={{ width: '6px', height: '6px', backgroundColor: '#10b981', borderRadius: '50%', display: 'inline-block' }}></span>
            <span style={{ fontSize: '9px', fontWeight: 900, color: '#10b981' }}>OFFLINE</span>
          </div>
        </div>
      </header>

      {/* Main viewport spacing */}
      <main style={{ maxWidth: '460px', margin: '0 auto', padding: '16px' }}>

        {/* ═══════════════════════════════════════════════════
            TAB 1: NEW BILL
            ═══════════════════════════════════════════════════ */}
        {tab === 'new' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Multi-step Stepper Card */}
            <div className="section-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', marginBottom: 0 }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => setWizardStep(1)}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: wizardStep >= 1 ? 'var(--indigo-600)' : 'var(--slate-100)', color: wizardStep >= 1 ? '#ffffff' : 'var(--slate-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 900 }}>
                  {wizardStep > 1 ? '✓' : '1'}
                </div>
                <span style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', color: wizardStep === 1 ? 'var(--indigo-600)' : 'var(--slate-400)' }}>Customer</span>
              </div>

              <div style={{ flex: 1, height: '2px', backgroundColor: wizardStep >= 2 ? 'var(--indigo-600)' : 'var(--slate-200)', margin: '0 8px' }}></div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => setWizardStep(2)}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: wizardStep >= 2 ? 'var(--indigo-600)' : 'var(--slate-100)', color: wizardStep >= 2 ? '#ffffff' : 'var(--slate-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 900 }}>
                  {wizardStep > 2 ? '✓' : '2'}
                </div>
                <span style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', color: wizardStep === 2 ? 'var(--indigo-600)' : 'var(--slate-400)' }}>Products</span>
              </div>

              <div style={{ flex: 1, height: '2px', backgroundColor: wizardStep >= 3 ? 'var(--indigo-600)' : 'var(--slate-200)', margin: '0 8px' }}></div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => setWizardStep(3)}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: wizardStep === 3 ? 'var(--indigo-600)' : 'var(--slate-100)', color: wizardStep === 3 ? '#ffffff' : 'var(--slate-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 900 }}>
                  3
                </div>
                <span style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', color: wizardStep === 3 ? 'var(--indigo-600)' : 'var(--slate-400)' }}>Review</span>
              </div>
            </div>

            {/* WIZARD STEP 1: Customer Info */}
            {wizardStep === 1 && (
              <div className="section-card" style={{ marginBottom: 0 }}>
                <div className="section-header" style={{ padding: '0 0 14px 0', borderBottom: '1px solid var(--slate-100)', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0 }}>Customer coordinates</h3>
                  <p style={{ margin: '2px 0 0 0' }}>Provide client contact data for the emergency invoice</p>
                </div>

                <div className="form-group">
                  <label className="form-label">Customer Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Counter Sale / Rahul Sharma"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="e.g. 9876543210"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="form-label">Delivery Address (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Sector 14, Vashi"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                  />
                </div>

                <button
                  className="btn-connect"
                  onClick={() => {
                    if (!customerName.trim()) setCustomerName('Counter Sale');
                    setWizardStep(2);
                  }}
                  style={{ width: '100%', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  NEXT: CART PRODUCTS →
                </button>
              </div>
            )}

            {/* WIZARD STEP 2: Cart Items */}
            {wizardStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                <div className="section-card" style={{ marginBottom: 0 }}>
                  <div className="section-header" style={{ padding: '0 0 14px 0', borderBottom: '1px solid var(--slate-100)', marginBottom: '16px', display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: 0 }}>Products in Cart</h3>
                      <p style={{ margin: '2px 0 0 0' }}>Add items and quantities to invoice</p>
                    </div>
                    <span className="badge badge-blue">Rows: {cart.length}</span>
                  </div>

                  <div style={{ maxHeight: '380px', overflowY: 'auto', paddingRight: '4px' }}>
                    {cart.map((item, idx) => (
                      <div
                        key={item.id}
                        style={{
                          backgroundColor: 'var(--slate-50)',
                          border: '1.5px solid var(--slate-200)',
                          borderRadius: '16px',
                          padding: '12px',
                          marginBottom: '12px',
                          position: 'relative'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '9px', fontWeight: 900, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Item #{idx + 1}
                          </span>
                          {cart.length > 1 && (
                            <button
                              onClick={() => removeCartRow(item.id)}
                              style={{ border: 'none', background: 'transparent', color: 'var(--rose-600)', fontSize: '9px', fontWeight: 900, cursor: 'pointer' }}
                            >
                              REMOVE
                            </button>
                          )}
                        </div>

                        <div className="form-group" style={{ marginBottom: '8px' }}>
                          <input
                            type="text"
                            className="form-input"
                            style={{ height: '38px', fontSize: '13px' }}
                            placeholder="Product description name..."
                            value={item.product_name}
                            onChange={(e) => updateCartField(item.id, 'product_name', e.target.value)}
                          />
                        </div>

                        <div style={{ marginBottom: '10px' }}>
                          <input
                            type="number"
                            className="form-input"
                            style={{ height: '38px', fontSize: '13px', textAlign: 'right', fontWeight: 'bold', color: '#10b981', width: '100%' }}
                            placeholder={`Price (${currencySymbol})`}
                            value={item.price || ''}
                            onChange={(e) => updateCartField(item.id, 'price', e.target.value)}
                          />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          
                          {/* Tactile incrementer counter */}
                          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#ffffff', border: '1px solid var(--slate-200)', borderRadius: '8px', height: '32px', overflow: 'hidden' }}>
                            <button
                              type="button"
                              onClick={() => adjustQty(item.id, -1)}
                              style={{ width: '28px', height: '100%', border: 'none', background: 'var(--slate-50)', color: 'var(--slate-700)', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                              -
                            </button>
                            <span style={{ padding: '0 10px', fontSize: '12px', fontWeight: 900, minWidth: '24px', textAlign: 'center' }}>
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => adjustQty(item.id, 1)}
                              style={{ width: '28px', height: '100%', border: 'none', background: 'var(--slate-50)', color: 'var(--slate-700)', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                              +
                            </button>
                          </div>

                          {profile.gst_enabled ? (
                            <select
                              value={item.gst_rate}
                              onChange={(e) => updateCartField(item.id, 'gst_rate', e.target.value)}
                              style={{ backgroundColor: '#ffffff', border: '1px solid var(--slate-200)', color: 'var(--indigo-600)', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: 900, outline: 'none' }}
                            >
                              {[0, 5, 12, 18, 28].map(r => (
                                <option key={r} value={r}>{r}% GST</option>
                              ))}
                            </select>
                          ) : (
                            <span style={{ fontSize: '11.5px', fontWeight: 900, color: 'var(--slate-500)' }}>
                              Total: {currencySymbol}{Math.round(item.price * item.quantity)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    className="btn-scan-qr"
                    onClick={addCartRow}
                    style={{ margin: '8px 0 0 0', padding: '10px', fontSize: '11px', fontWeight: 900 }}
                  >
                    + ADD PRODUCT ROW
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    className="app-header-logout"
                    onClick={() => setWizardStep(1)}
                    style={{ flex: 1, height: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    ← BACK
                  </button>
                  <button
                    className="btn-connect"
                    onClick={() => {
                      if (cart.some(i => !i.product_name.trim())) {
                        alert('Please fill in product names for all rows before advancing.');
                        return;
                      }
                      setWizardStep(3);
                    }}
                    style={{ flex: 2, height: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    NEXT: SUMMARIZE BILL →
                  </button>
                </div>
              </div>
            )}

            {/* WIZARD STEP 3: Review summary and Print */}
            {wizardStep === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                <div className="section-card" style={{ marginBottom: 0 }}>
                  <div className="section-header" style={{ padding: '0 0 14px 0', borderBottom: '1px solid var(--slate-100)', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0 }}>Bill Review Summary</h3>
                    <p style={{ margin: '2px 0 0 0' }}>Review amounts and details before generation</p>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                    <div style={{ flex: 1 }}>
                      <span className="form-label">Invoice Code</span>
                      <input
                        type="text"
                        className="form-input"
                        style={{ height: '38px', fontWeight: '900', color: 'var(--indigo-600)' }}
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <span className="form-label">Invoice Date</span>
                      <input
                        type="date"
                        className="form-input"
                        style={{ height: '38px' }}
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <span className="form-label">Payment Mode</span>
                  <div style={{ display: 'flex', backgroundColor: 'var(--slate-50)', border: '1px solid var(--slate-200)', padding: '4px', borderRadius: '10px', marginBottom: '14px' }}>
                    {(['Cash', 'UPI', 'Credit'] as const).map(m => (
                      <button
                        key={m}
                        onClick={() => setPaymentMode(m)}
                        style={{ flex: 1, height: '30px', border: 'none', background: paymentMode === m ? 'var(--indigo-600)' : 'transparent', color: paymentMode === m ? '#ffffff' : 'var(--slate-500)', fontSize: '11px', fontWeight: 900, borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                      >
                        {m}
                      </button>
                    ))}
                  </div>

                  {paymentMode === 'Credit' && (
                    <div className="form-group">
                      <label className="form-label">Credit Limit Days</label>
                      <input
                        type="number"
                        className="form-input"
                        value={creditDays}
                        onChange={(e) => setCreditDays(Number(e.target.value))}
                      />
                    </div>
                  )}

                  {/* Calculations card style */}
                  <div style={{ backgroundColor: 'var(--slate-50)', border: '1.5px solid var(--slate-200)', borderRadius: '16px', padding: '14px', marginTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: 'var(--slate-500)', marginBottom: '8px' }}>
                      <span>Subtotal</span>
                      <span>{currencySymbol}{Math.round(totals.subtotal).toLocaleString('en-IN')}</span>
                    </div>
                    {profile.gst_enabled && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: 'var(--slate-500)', marginBottom: '8px' }}>
                        <span>GST Amount Tax</span>
                        <span style={{ color: 'var(--indigo-500)' }}>+{currencySymbol}{Math.round(totals.totalGst).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 950, color: 'var(--slate-900)', borderTop: '1.5px dashed var(--slate-200)', paddingTop: '8px', marginTop: '8px' }}>
                      <span>Grand Total</span>
                      <span style={{ color: '#10b981' }}>{currencySymbol}{totals.grandTotal.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div style={{ marginTop: '12px', fontSize: '10.5px', color: 'var(--slate-500)', backgroundColor: 'var(--slate-50)', border: '1.5px solid var(--slate-200)', padding: '10px 14px', borderRadius: '12px', lineHeight: 1.5 }}>
                    <span style={{ display: 'block', fontSize: '8px', fontWeight: 900, color: 'var(--slate-400)', textTransform: 'uppercase', marginBottom: '2px' }}>Amount in words:</span>
                    Rupees {numberToWords(totals.grandTotal)} Only
                  </div>
                </div>

                <button
                  className="btn-connect"
                  onClick={handleDownloadSharePdfOnWhatsApp}
                  style={{ width: '100%', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px', background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 6px 20px rgba(16, 185, 129, 0.25)', marginBottom: '8px' }}
                >
                  📥 DOWNLOAD & SHARE ON WA
                </button>

                <button
                  className="btn-connect"
                  onClick={handleGenerateInvoice}
                  style={{ width: '100%', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px', background: 'linear-gradient(135deg, var(--indigo-600), var(--indigo-700))', boxShadow: '0 6px 20px rgba(79, 70, 229, 0.25)', marginBottom: '8px' }}
                >
                  📥 ONLY DOWNLOAD PDF
                </button>

                <button
                  className="app-header-logout"
                  onClick={() => setWizardStep(2)}
                  style={{ width: '100%', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  ← BACK TO PRODUCTS
                </button>
              </div>
            )}

          </div>
        )}

        {/* ═══════════════════════════════════════════════════
            TAB 2: HISTORY
            ═══════════════════════════════════════════════════ */}
        {tab === 'history' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Search Input bar wrapper */}
            <div className="search-bar" style={{ position: 'static', padding: 0, margin: 0 }}>
              <input
                type="text"
                placeholder="Search invoices by customer or number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Quick dashboard metrics */}
            <div className="metrics-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: 0 }}>
              <div className="metric-card">
                <span className="label">Generated</span>
                <span className="value" style={{ color: 'var(--indigo-600)' }}>{history.length}</span>
                <span className="sub">BILLS LOGGED</span>
              </div>
              <div className="metric-card">
                <span className="label">Revenue Total</span>
                <span className="value" style={{ color: '#10b981' }}>
                  {currencySymbol}{history.reduce((acc, curr) => acc + curr.grand_total, 0).toLocaleString('en-IN')}
                </span>
                <span className="sub">OFFLINE SALES</span>
              </div>
            </div>

            {/* Invoices List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredHistory.length > 0 ? (
                filteredHistory.map(inv => (
                  <div
                    key={inv.invoice_number}
                    className="section-card"
                    style={{ padding: '14px', marginBottom: 0, cursor: 'pointer', border: '1.5px solid var(--slate-200)' }}
                    onClick={() => setSelectedInvoice(inv)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ minWidth: 0, paddingRight: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '9px', fontWeight: 900, color: 'var(--indigo-600)', backgroundColor: 'var(--indigo-50)', padding: '2px 6px', borderRadius: '4px', border: '1.5px solid rgba(99,102,241,0.1)' }}>
                            #{inv.invoice_number}
                          </span>
                          <span style={{ fontSize: '9.5px', color: 'var(--slate-400)', fontWeight: 700 }}>{inv.date}</span>
                        </div>
                        <h4 style={{ fontSize: '13.5px', fontWeight: 900, color: 'var(--slate-900)', margin: '6px 0 2px 0', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                          {inv.customer_name}
                        </h4>
                        <span style={{ fontSize: '9.5px', color: 'var(--slate-500)', fontWeight: 800 }}>
                          {inv.items.length} items | {inv.payment_mode}
                        </span>
                      </div>

                      <div style={{ textRendering: 'optimizeLegibility', textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 950, color: '#10b981' }}>
                          {currencySymbol}{inv.grand_total.toLocaleString('en-IN')}
                        </div>
                        <span style={{ display: 'inline-block', marginTop: '6px', fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', color: 'var(--indigo-600)', letterSpacing: '0.5px' }}>
                          VIEW DETAILS
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state" style={{ backgroundColor: 'var(--slate-50)', border: '1.5px dashed var(--slate-200)', borderRadius: '22px' }}>
                  <FileIcon />
                  <p style={{ margin: '8px 0 0 0', fontWeight: 900 }}>No Offline Bills Generated</p>
                  <span style={{ fontSize: '10px', color: 'var(--slate-400)', display: 'block', marginTop: '4px' }}>
                    Start billing under the "New Bill" wizard!
                  </span>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ═══════════════════════════════════════════════════
            TAB 3: SETTINGS
            ═══════════════════════════════════════════════════ */}
        {tab === 'settings' && (
          <div className="section-card">
            <div className="section-header" style={{ padding: '0 0 14px 0', borderBottom: '1px solid var(--slate-100)', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>Shop settings profile</h3>
              <p style={{ margin: '2px 0 0 0' }}>Configure shop details printed on A4 invoice template</p>
            </div>

            {saveSuccess && (
              <div style={{ backgroundColor: 'var(--emerald-50)', border: '1px solid rgba(16,185,129,0.3)', padding: '10px', borderRadius: '10px', textAlign: 'center', fontSize: '11px', fontWeight: 900, color: '#10b981', marginBottom: '14px' }}>
                ✓ Profile settings saved successfully!
              </div>
            )}

            {/* Toggle calculation config */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--slate-50)', border: '1.5px solid var(--slate-200)', padding: '12px 14px', borderRadius: '16px', marginBottom: '16px' }}>
              <div style={{ flex: 1, paddingRight: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 900, color: 'var(--slate-900)' }}>GST Columns Config</div>
                <div style={{ fontSize: '8.5px', color: 'var(--slate-400)', marginTop: '2px' }}>Enable/Disable HSN, GST% selectors and GSTIN</div>
              </div>
              <button
                type="button"
                onClick={() => saveProfileSettings({ ...profile, gst_enabled: !profile.gst_enabled })}
                style={{ width: '40px', height: '22px', borderRadius: '11px', backgroundColor: profile.gst_enabled ? 'var(--indigo-600)' : 'var(--slate-300)', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', justifyContent: profile.gst_enabled ? 'flex-end' : 'flex-start', transition: 'all 0.2s' }}
              >
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#ffffff' }} />
              </button>
            </div>

            {/* Store Logo Upload Block */}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Store / Business Logo</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', backgroundColor: 'var(--slate-50)', border: '1.5px dashed var(--slate-200)', padding: '12px', borderRadius: '16px' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '12px',
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--slate-200)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0
                }}>
                  {profile.logo_url ? (
                    <img src={profile.logo_url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Logo" />
                  ) : (
                    <span style={{ fontSize: '9px', fontWeight: 900, color: 'var(--slate-400)', textAlign: 'center', padding: '4px' }}>NO LOGO</span>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    type="file"
                    accept="image/*"
                    id="logo-upload-input"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setProfile({ ...profile, logo_url: reader.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => document.getElementById('logo-upload-input')?.click()}
                      style={{
                        padding: '6px 12px',
                        fontSize: '11px',
                        fontWeight: 900,
                        backgroundColor: 'var(--indigo-50)',
                        color: 'var(--indigo-600)',
                        border: '1px solid var(--indigo-100)',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      CHOOSE IMAGE
                    </button>
                    {profile.logo_url && (
                      <button
                        type="button"
                        onClick={() => setProfile({ ...profile, logo_url: '' })}
                        style={{
                          padding: '6px 12px',
                          fontSize: '11px',
                          fontWeight: 900,
                          backgroundColor: 'var(--rose-50)',
                          color: 'var(--rose-600)',
                          border: '1px solid var(--rose-100)',
                          borderRadius: '8px',
                          cursor: 'pointer'
                        }}
                      >
                        REMOVE
                      </button>
                    )}
                  </div>
                  <p style={{ fontSize: '8px', color: 'var(--slate-400)', margin: '4px 0 0 0', fontWeight: 500 }}>JPEG/PNG supported.</p>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Store / Business Name</label>
              <input
                type="text"
                className="form-input"
                value={profile.business_name}
                onChange={(e) => setProfile({ ...profile, business_name: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Phone Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Email Address</label>
                <input
                  type="text"
                  className="form-input"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Address line 1</label>
              <input
                type="text"
                className="form-input"
                value={profile.address_line1}
                onChange={(e) => setProfile({ ...profile, address_line1: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <div style={{ flex: 1 }}>
                <span className="form-label">City</span>
                <input
                  type="text"
                  className="form-input"
                  value={profile.city}
                  onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                />
              </div>
              <div style={{ flex: 1 }}>
                <span className="form-label">State</span>
                <input
                  type="text"
                  className="form-input"
                  value={profile.state}
                  onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                />
              </div>
              <div style={{ flex: 1 }}>
                <span className="form-label">Pincode</span>
                <input
                  type="text"
                  className="form-input"
                  value={profile.pincode}
                  onChange={(e) => setProfile({ ...profile, pincode: e.target.value })}
                />
              </div>
            </div>

            {profile.gst_enabled && (
              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--indigo-600)' }}>Shop GSTIN Code</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ color: 'var(--indigo-600)', textTransform: 'uppercase' }}
                  value={profile.gstin}
                  onChange={(e) => setProfile({ ...profile, gstin: e.target.value })}
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">PAN Number</label>
              <input
                type="text"
                className="form-input"
                style={{ textTransform: 'uppercase' }}
                value={profile.pan_number}
                onChange={(e) => setProfile({ ...profile, pan_number: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label" style={{ color: '#059669' }}>WhatsApp Brand Link</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 919988776655"
                  value={profile.whatsapp_number}
                  onChange={(e) => setProfile({ ...profile, whatsapp_number: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label" style={{ color: '#e11d48' }}>Instagram Handle</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. username"
                  value={profile.instagram_id}
                  onChange={(e) => setProfile({ ...profile, instagram_id: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Terms & Conditions</label>
              <textarea
                className="form-input"
                style={{ height: '80px', paddingTop: '10px', resize: 'none', fontFamily: 'inherit' }}
                value={profile.terms_and_conditions}
                onChange={(e) => setProfile({ ...profile, terms_and_conditions: e.target.value })}
              />
            </div>

            <button
              className="btn-connect"
              onClick={() => saveProfileSettings(profile)}
              style={{ width: '100%', height: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              SAVE PROFILE DETAILS
            </button>
          </div>
        )}

      </main>

      {/* Expanded History Modal Details Panel */}
      {selectedInvoice && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '16px' }}>
          <div className="section-card" style={{ width: '100%', maxWidth: '420px', borderRadius: '24px 24px 0 0', borderBottom: 'none', display: 'flex', flexDirection: 'column', maxHeight: '82vh', overflow: 'hidden', padding: 0, boxShadow: '0 -15px 45px rgba(0,0,0,0.2)' }}>
            
            <div style={{ backgroundColor: 'var(--slate-50)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--slate-100)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '10px', fontWeight: 900, color: 'var(--indigo-600)', backgroundColor: 'var(--indigo-50)', padding: '3px 8px', borderRadius: '6px' }}>
                  #{selectedInvoice.invoice_number}
                </span>
                <span style={{ fontSize: '10.5px', color: 'var(--slate-400)', fontWeight: 800 }}>{selectedInvoice.date}</span>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                style={{ backgroundColor: '#ffffff', border: '1px solid var(--slate-200)', borderRadius: '8px', fontSize: '9px', fontWeight: 900, padding: '5px 12px', color: 'var(--slate-600)', cursor: 'pointer' }}
              >
                CLOSE
              </button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Customer Info Card block */}
              <div style={{ backgroundColor: 'var(--slate-50)', border: '1px solid var(--slate-200)', padding: '14px', borderRadius: '16px' }}>
                <span className="form-label" style={{ marginBottom: '2px' }}>BILL TO:</span>
                <div style={{ fontSize: '14px', fontWeight: 900, color: 'var(--slate-900)' }}>{selectedInvoice.customer_name}</div>
                {selectedInvoice.customer_phone && <div style={{ fontSize: '11.5px', color: 'var(--slate-500)', marginTop: '4px' }}>Mobile: {selectedInvoice.customer_phone}</div>}
                {selectedInvoice.customer_address && <div style={{ fontSize: '11.5px', color: 'var(--slate-500)' }}>Address: {selectedInvoice.customer_address}</div>}
              </div>

              {/* Items Card */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span className="form-label">ITEMS IN BILL</span>
                <div style={{ border: '1px solid var(--slate-200)', borderRadius: '16px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none', margin: 0, minWidth: 0 }}>
                    <thead>
                      <tr style={{ background: 'var(--slate-50)' }}>
                        <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '8.5px', color: 'var(--slate-400)' }}>Item Description</th>
                        <th style={{ width: '15%', textAlign: 'center', padding: '8px', fontSize: '8.5px', color: 'var(--slate-400)' }}>Qty</th>
                        <th style={{ width: '25%', textAlign: 'right', padding: '8px 12px', fontSize: '8.5px', color: 'var(--slate-400)' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items.map(item => (
                        <tr key={item.id} style={{ borderTop: '1px solid var(--slate-100)' }}>
                          <td style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--slate-700)', fontWeight: 800 }}>{item.product_name}</td>
                          <td style={{ textAlign: 'center', padding: '10px 8px', fontSize: '12px', color: 'var(--slate-500)', fontWeight: 700 }}>{item.quantity}</td>
                          <td style={{ textAlign: 'right', padding: '10px 12px', fontSize: '12px', color: 'var(--slate-800)', fontWeight: 850 }}>
                            {profile.currency_symbol}{Math.round(item.price * item.quantity).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary table */}
              <div style={{ borderTop: '1px dashed var(--slate-200)', paddingTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: 'var(--slate-500)', marginBottom: '6px' }}>
                  <span>Subtotal Amount</span>
                  <span>{profile.currency_symbol}{Math.round(selectedInvoice.subtotal).toLocaleString('en-IN')}</span>
                </div>
                {profile.gst_enabled && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: 'var(--slate-500)', marginBottom: '6px' }}>
                    <span>GST Tax</span>
                    <span style={{ color: 'var(--indigo-600)' }}>+{profile.currency_symbol}{Math.round(selectedInvoice.total_gst).toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 950, color: '#10b981', borderTop: '1px solid var(--slate-200)', paddingTop: '8px', marginTop: '8px' }}>
                  <span>Grand Total</span>
                  <span>{profile.currency_symbol}{selectedInvoice.grand_total.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Modal footers */}
            <div style={{ backgroundColor: 'var(--slate-50)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--slate-100)' }}>
              
              {selectedInvoice.customer_phone && (
                <button
                  onClick={() => handleWhatsAppShare(selectedInvoice)}
                  style={{ width: '100%', height: '52px', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '14px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(5,150,105,0.15)' }}
                >
                  📥 DOWNLOAD & SHARE ON WA
                </button>
              )}

              <button
                onClick={() => printInvoice(selectedInvoice, profile)}
                style={{ width: '100%', height: '52px', background: 'linear-gradient(135deg, var(--indigo-600), var(--indigo-700))', color: 'white', border: 'none', borderRadius: '14px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.15)' }}
              >
                📥 ONLY DOWNLOAD PDF
              </button>

              <button
                onClick={() => handleDeleteInvoice(selectedInvoice.invoice_number)}
                style={{ backgroundColor: 'transparent', border: 'none', color: 'var(--rose-600)', fontSize: '9px', fontWeight: 900, cursor: 'pointer', height: '24px', alignSelf: 'center', marginTop: '4px' }}
              >
                DELETE RECORD
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Bottom Nav Bar */}
      <nav className="bottom-nav">
        <button className={`nav-tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
          <HistoryIcon />
          <span>History</span>
        </button>

        <button className={`nav-tab ${tab === 'new' ? 'active' : ''}`} onClick={() => { setTab('new'); setWizardStep(1); }}>
          <PlusIcon />
          <span>New Bill</span>
        </button>

        <button className={`nav-tab ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>
          <SettingsIcon />
          <span>Settings</span>
        </button>
      </nav>

    </div>
  );
}

const Home = dynamic(() => Promise.resolve(HomeComponent), {
  ssr: false,
});

export default Home;
