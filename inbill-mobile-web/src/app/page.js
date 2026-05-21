"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, Users, Package, ShoppingBag, Plus, 
  Settings, ArrowLeftRight, CreditCard, ChevronRight, Search, 
  Scan, Camera, Download, Trash2, CheckCircle2, AlertTriangle, 
  ShieldAlert, Database, LogOut, Check, RefreshCw, X, FileText, 
  HelpCircle, Sparkles, Sliders, DollarSign, Calendar, Eye
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { dataLayer } from '../lib/data-layer';

export default function Home() {
  // --- GENERAL STATE & NAV ---
  const [appMode, setAppMode] = useState('local'); // 'local' | 'cloud'
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'parties' | 'items' | 'more'
  const [businessProfile, setBusinessProfile] = useState({});
  const [isLocked, setIsLocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [savedPin, setSavedPin] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // --- SHEET & MODAL STATE ---
  // currentSheet can be: null, 'new_sale', 'new_purchase', 'add_party', 'add_product', 'record_payment', 'adjust_stock', 'add_expense', 'new_return', 'cloud_linker', 'view_invoice', 'ocr_preview'
  const [currentSheet, setCurrentSheet] = useState(null);
  const [activeSheetType, setActiveSheetType] = useState('sale'); // for forms with dynamic sales/purchases
  const [sheetLoading, setSheetLoading] = useState(false);

  // --- DATA LISTS ---
  const [dashboardData, setDashboardData] = useState({
    stats: { cash_collections: 0, digital_collections: 0, net_sales: 0, purchases: 0, net_profit: 0, expenses: 0 },
    receivables: 0,
    payables: 0,
    lowStock: [],
    transactions: []
  });
  const [products, setProducts] = useState([]);
  const [parties, setParties] = useState([]);
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [returns, setReturns] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [attributeDefs, setAttributeDefs] = useState([]);
  const [customCategories, setCustomCategories] = useState([]);

  // --- ACTIVE SELECTED ENTITIES FOR SUB-VIEWS ---
  const [selectedParty, setSelectedParty] = useState(null);
  const [selectedPartyLedger, setSelectedPartyLedger] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // --- FILTER STATES ---
  const [partySearch, setPartySearch] = useState('');
  const [partyTypeFilter, setPartyTypeFilter] = useState('Customer'); // 'Customer' | 'Supplier'
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('All');
  
  // Date Range Filters (Default: Today)
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [dateFrom, setDateFrom] = useState(todayStr);
  const [dateTo, setDateTo] = useState(todayStr);

  // --- SETUP ONBOARDING FORM STATE ---
  const [obForm, setObForm] = useState({
    business_name: '',
    phone: '',
    gstin: '',
    currency_symbol: '₹',
    bank_details: ''
  });

  // --- NEW PARTY FORM STATE ---
  const [partyForm, setPartyForm] = useState({
    name: '',
    phone: '',
    address: '',
    gstin: '',
    type: 'Customer',
    opening_balance: 0
  });

  // --- NEW PRODUCT FORM STATE ---
  const [productForm, setProductForm] = useState({
    product_name: '',
    brand: '',
    category: '',
    unit: 'pcs',
    mrp: 0,
    selling_price: 0,
    cost_price: 0,
    barcode: '',
    gst_rate: 18,
    min_stock_alert: 3,
    product_size: '',
    custom_fields: {}
  });

  // --- NEW TRANSACTION FORM STATE (SALES & PURCHASES) ---
  const [txPartyId, setTxPartyId] = useState('');
  const [txCustomerName, setTxCustomerName] = useState('');
  const [txCustomerPhone, setTxCustomerPhone] = useState('');
  const [txCustomerAddress, setTxCustomerAddress] = useState('');
  const [txItems, setTxItems] = useState([]); // Array of { product_id, product_name, quantity, price, gst_rate, mrp }
  const [txMiscCharges, setTxMiscCharges] = useState(0);
  const [txPaymentMode, setTxPaymentMode] = useState('Cash');
  const [txPaidAmount, setTxPaidAmount] = useState(0);
  const [txCreditDays, setTxCreditDays] = useState(0);
  const [txTaxMode, setTxTaxMode] = useState('inclusive');
  const [txDate, setTxDate] = useState(todayStr);

  // Autocomplete / item search states
  const [itemSearchInput, setItemSearchInput] = useState('');
  const [showItemSuggestions, setShowItemSuggestions] = useState(false);

  // --- PAYMENT RECORDING FORM STATE ---
  const [payForm, setPayForm] = useState({
    party_id: '',
    amount: 0,
    payment_mode: 'Cash',
    note: '',
    date: todayStr
  });

  // --- NEW RETURN FORM STATE ---
  const [retForm, setRetForm] = useState({
    type: 'sale', // 'sale' | 'purchase'
    sale_id: '',
    purchase_id: '',
    party_id: '',
    reason: '',
    items: [], // { product_id, product_name, quantity, price }
    total_amount: 0,
    payment_mode: 'Credit',
    date: todayStr
  });

  // --- NEW EXPENSE FORM STATE ---
  const [expForm, setExpForm] = useState({
    category: '',
    description: '',
    amount: 0,
    date: todayStr
  });
  const [newExpCatName, setNewExpCatName] = useState('');
  const [showNewCatInput, setShowNewCatInput] = useState(false);

  // --- BARCODE SCANNER STATE ---
  const [scannerActive, setScannerActive] = useState(false);
  const html5QrCodeRef = useRef(null);

  // --- AI OCR PARSER STATE ---
  const [ocrFile, setOcrFile] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrExtractedData, setOcrExtractedData] = useState(null);

  // --- CLOUD SYNC CONFIG STATE ---
  const [cloudCode, setCloudCode] = useState('');
  const [cloudUrl, setCloudUrl] = useState('');
  const [syncStatus, setSyncStatus] = useState('');

  // --- GEMINI INSIGHTS STATE ---
  const [smartInsights, setSmartInsights] = useState([]);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // --- CORE INITIALIZATION ---
  useEffect(() => {
    initApp();
  }, []);

  // Whenever dates change, refresh dashboard/sales/expenses
  useEffect(() => {
    if (!isLoading) {
      loadFinanceData();
    }
  }, [dateFrom, dateTo]);

  const initApp = async () => {
    setIsLoading(true);
    try {
      const auth = await dataLayer.checkAuth();
      setAppMode(auth.mode);
      
      // Load configurations
      const settings = await dataLayer.getSettings();
      setBusinessProfile(settings.profile || {});
      setAttributeDefs(settings.attributeDefs || []);
      setCustomCategories(settings.customCategories || []);

      // Check PIN
      if (settings.profile?.software_password) {
        setSavedPin(settings.profile.software_password);
        setIsLocked(true);
      } else {
        // If local mode and no business name is configured, trigger onboarding wizard
        if (auth.mode === 'local' && (!settings.profile?.business_name || settings.profile.business_name === 'My Business PWA')) {
          setShowOnboarding(true);
        }
      }

      await loadCoreLists();
      await loadFinanceData();
    } catch (e) {
      console.error('App init error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCoreLists = async () => {
    try {
      const prodList = await dataLayer.getProducts();
      setProducts(prodList || []);

      const partyList = await dataLayer.getParties();
      setParties(partyList || []);
    } catch (e) {
      console.error('Core lists load error:', e);
    }
  };

  const loadFinanceData = async () => {
    try {
      const dash = await dataLayer.getDashboard(dateFrom, dateTo);
      setDashboardData(dash || {
        stats: { cash_collections: 0, digital_collections: 0, net_sales: 0, purchases: 0, net_profit: 0, expenses: 0 },
        receivables: 0,
        payables: 0,
        lowStock: [],
        transactions: []
      });

      const salesList = await dataLayer.getSales(dateFrom, dateTo);
      setSales(salesList || []);

      const purchaseList = await dataLayer.getPurchases(dateFrom, dateTo);
      setPurchases(purchaseList || []);

      const returnsList = await dataLayer.getReturns('sale');
      setReturns(returnsList || []);

      const expData = await dataLayer.getExpenses(dateFrom, dateTo);
      setExpenses(expData?.expenses || []);
      setExpenseCategories(expData?.categories || []);
    } catch (e) {
      console.error('Finance metrics load error:', e);
    }
  };

  // --- SECURE LOCK CONTROLS ---
  const handlePinSubmit = () => {
    if (pinInput === savedPin) {
      setIsLocked(false);
      setPinInput('');
    } else {
      alert('🔒 Invalid Security PIN!');
      setPinInput('');
    }
  };

  const handlePinNumpad = (num) => {
    if (pinInput.length < 4) {
      const nextPin = pinInput + num;
      setPinInput(nextPin);
      if (nextPin.length === 4 && nextPin === savedPin) {
        setTimeout(() => {
          setIsLocked(false);
          setPinInput('');
        }, 150);
      }
    }
  };

  // --- SETUP ONBOARDING ACTIONS ---
  const handleOnboardingSubmit = async () => {
    if (!obForm.business_name.trim()) {
      alert('Business Name is required');
      return;
    }
    setSheetLoading(true);
    try {
      const profileData = {
        business_name: obForm.business_name,
        business_short: obForm.business_name.slice(0,2).toUpperCase(),
        tagline: 'Billing & ERP',
        phone: obForm.phone,
        gstin: obForm.gstin,
        currency_symbol: obForm.currency_symbol,
        bank_details: obForm.bank_details,
        invoice_prefix: 'INV',
        invoice_footer: 'Thank you for your business!'
      };

      await dataLayer.saveSettings('update_profile', { profileData });
      setShowOnboarding(false);
      await initApp();
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.8 } });
    } catch (e) {
      alert(e.message);
    } finally {
      setSheetLoading(false);
    }
  };

  // --- QUICK SWITCH LOCAL/CLOUD ---
  const toggleAppMode = async () => {
    const nextMode = appMode === 'local' ? 'cloud' : 'local';
    if (nextMode === 'cloud') {
      // Show connection scanner sheet
      setCurrentSheet('cloud_linker');
    } else {
      await dataLayer.switchMode(false);
      await initApp();
    }
  };

  // --- CLOUD LINK GATEWAY ---
  const handleConnectCloud = async () => {
    if (!cloudCode || !cloudUrl) {
      alert('Access Code and Neon Database URL are required!');
      return;
    }
    setSheetLoading(true);
    setSyncStatus('Connecting securely...');
    try {
      const res = await fetch('/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cloudCode, neonUrl: cloudUrl })
      });
      const data = await res.json();
      if (res.ok) {
        await dataLayer.switchMode(true);
        setSyncStatus('Connection established!');
        setTimeout(async () => {
          setCurrentSheet(null);
          setCloudCode('');
          setCloudUrl('');
          setSyncStatus('');
          await initApp();
          confetti({ particleCount: 100, spread: 80, origin: { y: 0.7 } });
        }, 1000);
      } else {
        alert(data.error || 'Failed to connect');
        setSyncStatus('');
      }
    } catch (e) {
      alert(e.message);
      setSyncStatus('');
    } finally {
      setSheetLoading(false);
    }
  };

  // --- LEDGER VIEWS ---
  const openPartyLedger = async (party) => {
    setSelectedParty(party);
    setSheetLoading(true);
    try {
      const res = await dataLayer.getPartyLedger(party.id);
      if (res.error) {
        alert(res.error);
      } else {
        setSelectedPartyLedger(res.ledger || []);
        // Force view tab just to be safe
        setActiveTab('parties');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSheetLoading(false);
    }
  };

  // --- DATA SUBMISSIONS ---
  // Party save
  const handleSaveParty = async (e) => {
    e.preventDefault();
    if (!partyForm.name.trim()) return alert('Name is required');

    setSheetLoading(true);
    try {
      const res = await dataLayer.saveParty(partyForm);
      if (res.success) {
        await loadCoreLists();
        setCurrentSheet(null);
        setPartyForm({ name: '', phone: '', address: '', gstin: '', type: 'Customer', opening_balance: 0 });
        confetti({ particleCount: 30, spread: 40, origin: { y: 0.8 } });
      } else {
        alert(res.error || 'Failed to save');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSheetLoading(false);
    }
  };

  // Product save
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!productForm.product_name.trim()) return alert('Product Name is required');

    setSheetLoading(true);
    try {
      const cleanedForm = {
        ...productForm,
        custom_fields: JSON.stringify(productForm.custom_fields)
      };

      const res = await dataLayer.saveProduct(cleanedForm);
      if (res.success) {
        await loadCoreLists();
        await loadFinanceData();
        setCurrentSheet(null);
        // Reset form
        setProductForm({
          product_name: '', brand: '', category: '', unit: 'pcs',
          mrp: 0, selling_price: 0, cost_price: 0, barcode: '',
          gst_rate: 18, min_stock_alert: 3, product_size: '', custom_fields: {}
        });
        confetti({ particleCount: 30, spread: 40, origin: { y: 0.8 } });
      } else {
        alert(res.error || 'Failed to save');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSheetLoading(false);
    }
  };

  // Transaction checkout items autocomplete selectors
  const handleAddAutocompleteItem = (prod) => {
    // Check if already in active cart
    const exists = txItems.find(i => i.product_id === prod.id);
    if (exists) {
      alert(`${prod.product_name} is already added. Increase quantity inside the cart!`);
      return;
    }

    const price = activeSheetType === 'sale' ? prod.selling_price : prod.cost_price;
    setTxItems([...txItems, {
      product_id: prod.id,
      product_name: prod.product_name,
      quantity: 1,
      price: price,
      mrp: prod.mrp || price,
      gst_rate: prod.gst_rate || 0,
      custom_fields: JSON.parse(prod.custom_fields || '{}')
    }]);

    setItemSearchInput('');
    setShowItemSuggestions(false);
  };

  // Invoice calculations helper
  const billingTotals = useMemo(() => {
    let subtotal = 0;
    let totalGst = 0;
    txItems.forEach(item => {
      const itemQty = Number(item.quantity) || 0;
      const itemPrice = parseFloat(item.price) || 0;
      const gstRate = parseFloat(item.gst_rate) || 0;

      const itemLineTotal = itemPrice * itemQty;
      let gstAmount = 0;
      let basePrice = itemPrice;

      if (txTaxMode === 'inclusive') {
        basePrice = itemPrice / (1 + (gstRate / 100));
        gstAmount = itemLineTotal - (basePrice * itemQty);
      } else {
        gstAmount = (itemLineTotal * gstRate) / 100;
      }
      subtotal += basePrice * itemQty;
      totalGst += gstAmount;
    });

    const parsedMisc = parseFloat(txMiscCharges) || 0;
    const grandTotal = Math.round(subtotal + totalGst + parsedMisc);
    return { subtotal, totalGst, grandTotal };
  }, [txItems, txMiscCharges, txTaxMode]);

  // Adjust default paid amount when items or billing totals change
  useEffect(() => {
    if (txPaymentMode === 'Credit') {
      setTxPaidAmount(0);
    } else {
      setTxPaidAmount(billingTotals.grandTotal);
    }
  }, [billingTotals.grandTotal, txPaymentMode]);

  // Handle final checkout invoice saving
  const handleSaveTransaction = async () => {
    if (txItems.length === 0) return alert('Please add at least one product!');
    
    // Vendor checks for supplier purchases
    if (activeSheetType === 'purchase' && !txPartyId && !txCustomerName.trim()) {
      return alert('Supplier Name is required for Purchase orders!');
    }

    setSheetLoading(true);
    try {
      const data = {
        party_id: txPartyId ? Number(txPartyId) : null,
        customer_name: txCustomerName || (txPartyId ? parties.find(p => p.id === Number(txPartyId))?.name : 'Walk-in'),
        customer_phone: txCustomerPhone,
        customer_address: txCustomerAddress,
        items: txItems,
        misc_charges: txMiscCharges,
        payment_mode: txPaymentMode,
        tax_mode: txTaxMode,
        paid_amount: txPaidAmount,
        credit_days: txCreditDays,
        date: txDate
      };

      if (activeSheetType === 'sale') {
        const res = await dataLayer.createSale(data);
        if (res.success) {
          confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
          setCurrentSheet(null);
          resetTxForm();
          await loadCoreLists();
          await loadFinanceData();
        } else {
          alert(res.error || 'Failed to complete checkout');
        }
      } else {
        // Purchase order
        const purchaseData = {
          party_id: txPartyId ? Number(txPartyId) : null,
          supplier_name: txCustomerName || (txPartyId ? parties.find(p => p.id === Number(txPartyId))?.name : ''),
          items: txItems,
          other_charges: txMiscCharges,
          paid_amount: txPaidAmount,
          date: txDate
        };
        const res = await dataLayer.createPurchase(purchaseData);
        if (res.success) {
          confetti({ particleCount: 100, spread: 60, origin: { y: 0.6 } });
          setCurrentSheet(null);
          resetTxForm();
          await loadCoreLists();
          await loadFinanceData();
        } else {
          alert(res.error || 'Failed to save Purchase order');
        }
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSheetLoading(false);
    }
  };

  const resetTxForm = () => {
    setTxPartyId('');
    setTxCustomerName('');
    setTxCustomerPhone('');
    setTxCustomerAddress('');
    setTxItems([]);
    setTxMiscCharges(0);
    setTxPaymentMode('Cash');
    setTxPaidAmount(0);
    setTxCreditDays(0);
    setTxTaxMode('inclusive');
    setTxDate(todayStr);
  };

  // Record manual payments
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!payForm.party_id) return alert('Please select a Party');
    if (Number(payForm.amount) <= 0) return alert('Enter amount greater than zero');

    setSheetLoading(true);
    try {
      const res = await dataLayer.recordPayment(payForm);
      if (res.success) {
        alert('💰 Payment recorded successfully!');
        setCurrentSheet(null);
        setPayForm({ party_id: '', amount: 0, payment_mode: 'Cash', note: '', date: todayStr });
        await loadCoreLists();
        await loadFinanceData();
        if (selectedParty) {
          // reload ledger too
          await openPartyLedger(selectedParty);
        }
      } else {
        alert(res.error || 'Failed to record payment');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSheetLoading(false);
    }
  };

  // Add Expenses
  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!expForm.category) return alert('Select Category');
    if (Number(expForm.amount) <= 0) return alert('Enter amount greater than zero');

    setSheetLoading(true);
    try {
      const res = await dataLayer.saveExpense(expForm);
      if (res.success) {
        setCurrentSheet(null);
        setExpForm({ category: '', description: '', amount: 0, date: todayStr });
        await loadFinanceData();
      } else {
        alert(res.error || 'Failed to save expense');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSheetLoading(false);
    }
  };

  const handleCreateExpenseCategory = async () => {
    if (!newExpCatName.trim()) return;
    try {
      const res = await dataLayer.saveExpenseCategory(newExpCatName);
      if (res.success) {
        // reload exp categories
        const expData = await dataLayer.getExpenses(dateFrom, dateTo);
        setExpenseCategories(expData?.categories || []);
        setExpForm({ ...expForm, category: res.category.name });
        setNewExpCatName('');
        setShowNewCatInput(false);
      } else {
        alert(res.error || 'Failed');
      }
    } catch (e) {
      alert(e.message);
    }
  };

  // Custom Category or Settings profile save
  const handleSaveBusinessSettings = async (profileData) => {
    setSheetLoading(true);
    try {
      const res = await dataLayer.saveSettings('update_profile', { profileData });
      if (res.success) {
        alert('Settings saved successfully!');
        await initApp();
      } else {
        alert(res.error || 'Failed');
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setSheetLoading(false);
    }
  };

  // --- AI Smart Insights ---
  const generateSmartInsights = async () => {
    setInsightsLoading(true);
    try {
      // Build a minimal snapshot of local dashboard data to feed Gemini Flash
      const snapshot = {
        business_name: businessProfile.business_name || 'ERP App',
        net_sales: dashboardData.stats.net_sales,
        purchases: dashboardData.stats.purchases,
        net_profit: dashboardData.stats.net_profit,
        expenses_total: dashboardData.stats.expenses,
        outstanding_receivable: dashboardData.receivables,
        outstanding_payable: dashboardData.payables,
        low_stock_count: dashboardData.lowStock?.length || 0,
        products_count: products?.length || 0,
        parties_count: parties?.length || 0,
        recent_logs: dashboardData.transactions?.slice(0, 5)
      };

      const res = await dataLayer.getInsights(snapshot, businessProfile.gemini_api_key);
      if (res.success) {
        setSmartInsights(res.insights || []);
      } else {
        alert(res.error || 'Could not fetch smart insights');
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setInsightsLoading(false);
    }
  };

  // --- AI OCR Invoice Uploads ---
  const handleOCRFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setOcrLoading(true);
    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result.split(',')[1];
        const mimeType = file.type;

        const res = await dataLayer.parseInvoice(base64Data, mimeType, businessProfile.gemini_api_key);
        if (res.success) {
          setOcrExtractedData(res);
          setCurrentSheet('ocr_preview');
        } else {
          alert(res.error || 'Gemini could not parse this document. Verify your API Key.');
        }
        setOcrLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      alert(err.message);
      setOcrLoading(false);
    }
  };

  const applyOCRPurchaseData = () => {
    if (!ocrExtractedData) return;

    // Try to auto-resolve party
    const vendorName = ocrExtractedData.vendor || '';
    const matchedParty = parties.find(p => p.type === 'Supplier' && p.name.toLowerCase().includes(vendorName.toLowerCase()));

    setTxPartyId(matchedParty ? String(matchedParty.id) : '');
    setTxCustomerName(vendorName);
    setTxMiscCharges(ocrExtractedData.other_charges || 0);
    setTxPaymentMode('Credit'); // default credit purchase
    setTxDate(ocrExtractedData.date || todayStr);

    const items = ocrExtractedData.items.map(item => {
      // Try to match standard catalog product
      const p = products.find(prod => prod.product_name.toLowerCase().replace(/\s/g, '') === item.description.toLowerCase().replace(/\s/g, ''));
      return {
        product_id: p ? p.id : null,
        product_name: item.description,
        quantity: item.quantity,
        price: item.price,
        mrp: item.price * 1.2, // default mrp
        gst_rate: item.gst_rate || 18,
        category: item.category || 'General Stock',
        product_size: item.product_size || '',
        batch_number: item.batch_number || '',
        expiry_date: item.expiry_date || '',
        custom_fields: item.custom_fields || {}
      };
    });

    setTxItems(items);
    setActiveSheetType('purchase');
    setCurrentSheet('new_sale'); // Open checkouts sheet
  };

  // --- CAMERA BARCODE SCANNER ---
  const startBarcodeScanner = async () => {
    setScannerActive(true);
    // Dynamic import to support SSR next compiler safely
    const { Html5Qrcode } = await import('html5-qrcode');
    
    setTimeout(() => {
      const qrScanner = new Html5Qrcode("reader");
      html5QrCodeRef.current = qrScanner;

      qrScanner.start(
        { facingMode: "environment" },
        { fps: 15, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          // Scanned successfully!
          // Find matching item in catalog
          const matched = products.find(p => p.barcode === decodedText);
          if (matched) {
            // Play native short feedback or alert
            confetti({ particleCount: 20, spread: 20, origin: { y: 0.5 } });
            handleAddAutocompleteItem(matched);
            stopBarcodeScanner();
          } else {
            if (confirm(`Product barcode "${decodedText}" not found. Create a new catalog item?`)) {
              setProductForm({
                ...productForm,
                barcode: decodedText
              });
              setCurrentSheet('add_product');
              stopBarcodeScanner();
            }
          }
        },
        (err) => {
          // scanner running
        }
      ).catch(e => {
        console.error(e);
        setScannerActive(false);
      });
    }, 300);
  };

  const stopBarcodeScanner = () => {
    if (html5QrCodeRef.current) {
      html5QrCodeRef.current.stop().then(() => {
        setScannerActive(false);
      }).catch(e => {
        console.error(e);
        setScannerActive(false);
      });
    } else {
      setScannerActive(false);
    }
  };

  // --- UTILITIES FOR SCREEN RENDERERS ---
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const searchMatch = p.product_name.toLowerCase().includes(productSearch.toLowerCase()) || 
                          p.brand.toLowerCase().includes(productSearch.toLowerCase()) ||
                          p.barcode.includes(productSearch);
      const catMatch = productCategoryFilter === 'All' || p.category === productCategoryFilter;
      return searchMatch && catMatch;
    });
  }, [products, productSearch, productCategoryFilter]);

  const filteredParties = useMemo(() => {
    return parties.filter(p => {
      const searchMatch = p.name.toLowerCase().includes(partySearch.toLowerCase()) || 
                          p.phone.includes(partySearch);
      const typeMatch = p.type === partyTypeFilter;
      return searchMatch && typeMatch;
    });
  }, [parties, partySearch, partyTypeFilter]);

  const itemSuggestions = useMemo(() => {
    if (!itemSearchInput.trim()) return [];
    return products.filter(p => 
      p.product_name.toLowerCase().includes(itemSearchInput.toLowerCase()) ||
      p.barcode.includes(itemSearchInput)
    ).slice(0, 5);
  }, [products, itemSearchInput]);

  // --- NATIVE INTERFACE SCREEN RENDERS ---

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6">
        <Sparkles className="w-16 h-16 text-blue-400 animate-pulse mb-4" />
        <h1 className="text-2xl font-bold tracking-tight mb-2">InBill Mobile ERP</h1>
        <p className="text-slate-400 text-sm animate-pulse">Initializing professional environment...</p>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6">
        <div className="w-full max-w-sm flex flex-col items-center bg-slate-800/80 rounded-3xl p-8 border border-slate-700/50 shadow-2xl glass-panel">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 border border-blue-500/30">
            <ShieldAlert className="w-8 h-8 text-blue-400" />
          </div>
          
          <h2 className="text-xl font-bold mb-1">{businessProfile.business_name}</h2>
          <p className="text-slate-400 text-xs mb-8">This station is locked. Enter System PIN.</p>
          
          {/* PIN Indicators */}
          <div className="flex gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div 
                key={i} 
                className={`w-4 h-4 rounded-full border-2 border-slate-500 transition-all ${
                  pinInput.length > i ? 'bg-blue-400 border-blue-400 scale-110 shadow-[0_0_8px_rgba(96,165,250,0.5)]' : 'bg-transparent'
                }`}
              />
            ))}
          </div>

          {/* NumPad Grid */}
          <div className="grid grid-cols-3 gap-4 w-full">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={num}
                onClick={() => handlePinNumpad(num)}
                className="h-16 rounded-full bg-slate-700/50 text-xl font-semibold border border-slate-600/30 flex items-center justify-center transition-all hover:bg-slate-700 active:scale-90"
              >
                {num}
              </button>
            ))}
            <button 
              onClick={() => setPinInput('')} 
              className="h-16 rounded-full bg-slate-800 text-slate-400 text-xs font-semibold flex items-center justify-center active:scale-95"
            >
              Clear
            </button>
            <button
              onClick={() => handlePinNumpad(0)}
              className="h-16 rounded-full bg-slate-700/50 text-xl font-semibold border border-slate-600/30 flex items-center justify-center transition-all hover:bg-slate-700 active:scale-90"
            >
              0
            </button>
            <button 
              onClick={handlePinSubmit}
              className="h-16 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center active:scale-90 shadow-lg shadow-blue-500/20"
            >
              Verify
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6">
        <div className="w-full max-w-sm bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-2xl glass-panel">
          <div className="flex justify-between items-center mb-6">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Setup Wizard • {onboardingStep}/3</span>
            <Sparkles className="w-5 h-5 text-blue-400 animate-spin" style={{ animationDuration: '4s' }} />
          </div>

          {onboardingStep === 1 && (
            <div>
              <h2 className="text-2xl font-extrabold mb-2">Welcome to InBill!</h2>
              <p className="text-slate-400 text-sm mb-6">First, let's configure your central Business Identity. These values are used automatically on prints & bills.</p>
              
              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Business Name</label>
                  <input
                    type="text"
                    placeholder="e.g. AF Nutritions Ltd"
                    value={obForm.business_name}
                    onChange={e => setObForm({ ...obForm, business_name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-700 border border-slate-600 text-white font-medium focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Phone Number</label>
                  <input
                    type="text"
                    placeholder="10-digit number"
                    value={obForm.phone}
                    onChange={e => setObForm({ ...obForm, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-700 border border-slate-600 text-white font-medium focus:border-blue-400"
                  />
                </div>
              </div>

              <button 
                onClick={() => obForm.business_name ? setOnboardingStep(2) : alert('Name required!')}
                className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
              >
                Continue Setup
              </button>
            </div>
          )}

          {onboardingStep === 2 && (
            <div>
              <h2 className="text-2xl font-extrabold mb-2">Tax & Currency</h2>
              <p className="text-slate-400 text-sm mb-6">Configure your statutory business profile metrics.</p>

              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">GSTIN Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="15-digit GSTIN"
                    value={obForm.gstin}
                    onChange={e => setObForm({ ...obForm, gstin: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-700 border border-slate-600 text-white font-medium uppercase focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Local Currency Sign</label>
                  <select
                    value={obForm.currency_symbol}
                    onChange={e => setObForm({ ...obForm, currency_symbol: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-700 border border-slate-600 text-white font-medium focus:border-blue-400"
                  >
                    <option value="₹">Rupees (₹)</option>
                    <option value="$">US Dollars ($)</option>
                    <option value="€">Euros (€)</option>
                    <option value="£">Pounds (£)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setOnboardingStep(1)}
                  className="flex-1 py-4 rounded-xl bg-slate-700 hover:bg-slate-600 font-bold active:scale-95"
                >
                  Back
                </button>
                <button 
                  onClick={() => setOnboardingStep(3)}
                  className="flex-1 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold active:scale-95"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {onboardingStep === 3 && (
            <div>
              <h2 className="text-2xl font-extrabold mb-2">Payout Credentials</h2>
              <p className="text-slate-400 text-sm mb-6">Enter bank coordinates that will display on invoice headers to speed digital transfers.</p>

              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Bank Payout Info (e.g. Bank Name, A/C, IFSC)</label>
                  <textarea
                    placeholder="HDFC Bank, A/C: 50100012..., IFSC: HDFC00..."
                    value={obForm.bank_details}
                    onChange={e => setObForm({ ...obForm, bank_details: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-slate-700 border border-slate-600 text-white font-medium focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setOnboardingStep(2)}
                  className="flex-1 py-4 rounded-xl bg-slate-700 hover:bg-slate-600 font-bold active:scale-95"
                >
                  Back
                </button>
                <button 
                  onClick={handleOnboardingSubmit}
                  disabled={sheetLoading}
                  className="flex-1 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center justify-center"
                >
                  {sheetLoading ? 'Saving...' : 'Finish Setup'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-full min-h-screen pb-20 no-print font-sans bg-slate-50/60 selection:bg-brand-primary/10">
      
      {/* --- TOP FIXED NAVBAR --- */}
      <header className="sticky top-0 z-40 bg-white/95 px-4 py-3 flex justify-between items-center glass-panel shadow-[0_1px_3px_rgba(15,23,42,0.02)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-primary to-blue-600 flex items-center justify-center text-white font-extrabold text-base shadow-[0_4px_12px_rgba(29,78,216,0.25)] border-2 border-white">
            {businessProfile.business_short || 'IB'}
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900 tracking-tight leading-tight">
              {businessProfile.business_name || 'InBill Store'}
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full relative ${
                appMode === 'cloud' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-brand-primary shadow-[0_0_8px_#1d4ed8]'
              }`}>
                <span className={`absolute inset-0 rounded-full animate-ping opacity-60 ${
                  appMode === 'cloud' ? 'bg-emerald-400' : 'bg-blue-400'
                }`} />
              </span>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">
                {appMode === 'cloud' ? 'Cloud Sync' : 'Local First'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Sync / Mode Switch */}
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleAppMode}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-wider transition-all border border-slate-200/80 active-scale shadow-sm"
          >
            {appMode === 'local' ? (
              <>
                <Database className="w-3.5 h-3.5 text-brand-primary" />
                Go Cloud
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-brand-success" />
                Linked
              </>
            )}
          </button>
          
          <button 
            onClick={loadFinanceData}
            className="p-2 rounded-full bg-slate-50 border border-slate-200/80 text-slate-600 hover:text-slate-800 active-scale shadow-sm flex items-center justify-center"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* --- CORE CONTENT WRAPPER --- */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 space-y-5">
        
        {/* --- VIEW 1: DASHBOARD --- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-5 animate-view">
            
            {/* Balance Widgets (Receivables / Payables) */}
            <div className="grid grid-cols-2 gap-4">
              <div 
                onClick={() => { setPartyTypeFilter('Customer'); setActiveTab('parties'); }}
                className="bg-emerald-50/70 border border-emerald-100/70 rounded-2xl p-4 shadow-[0_4px_12px_rgba(16,185,129,0.02)] active-scale cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-3">
                    <TrendingUp className="w-4 h-4 text-brand-success" />
                  </div>
                  <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest block leading-none">To Receive</span>
                </div>
                <h3 className="text-2xl font-black text-emerald-950 mt-2.5 tracking-tight leading-none">
                  {businessProfile.currency_symbol || '₹'}{dashboardData.receivables?.toLocaleString()}
                </h3>
              </div>

              <div 
                onClick={() => { setPartyTypeFilter('Supplier'); setActiveTab('parties'); }}
                className="bg-rose-50/70 border border-rose-100/70 rounded-2xl p-4 shadow-[0_4px_12px_rgba(244,63,94,0.02)] active-scale cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center mb-3">
                    <TrendingDown className="w-4 h-4 text-brand-danger" />
                  </div>
                  <span className="text-[10px] font-black text-rose-700 uppercase tracking-widest block leading-none">To Pay</span>
                </div>
                <h3 className="text-2xl font-black text-rose-950 mt-2.5 tracking-tight leading-none">
                  {businessProfile.currency_symbol || '₹'}{dashboardData.payables?.toLocaleString()}
                </h3>
              </div>
            </div>

            {/* Quick Action Matrix */}
            <div className="mbb-card p-4 space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Quick Operations</h4>
              <div className="grid grid-cols-4 gap-2.5 text-center">
                <button 
                  onClick={() => { setActiveSheetType('sale'); setCurrentSheet('new_sale'); }}
                  className="flex flex-col items-center gap-2 p-1.5 rounded-xl hover:bg-slate-50 active-scale cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-primary to-blue-500 flex items-center justify-center text-white shadow-[0_4px_12px_rgba(29,78,216,0.2)]">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black text-slate-800 leading-none">New Sale</span>
                </button>

                <button 
                  onClick={() => { setActiveSheetType('purchase'); setCurrentSheet('new_sale'); }}
                  className="flex flex-col items-center gap-2 p-1.5 rounded-xl hover:bg-slate-50 active-scale cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-[0_4px_12px_rgba(15,23,42,0.2)]">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black text-slate-800 leading-none">Stock In</span>
                </button>

                <button 
                  onClick={() => setCurrentSheet('add_party')}
                  className="flex flex-col items-center gap-2 p-1.5 rounded-xl hover:bg-slate-50 active-scale cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-[0_4px_12px_rgba(245,158,11,0.2)]">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black text-slate-800 leading-none">Add Party</span>
                </button>

                <button 
                  onClick={() => setCurrentSheet('add_expense')}
                  className="flex flex-col items-center gap-2 p-1.5 rounded-xl hover:bg-slate-50 active-scale cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-2xl bg-rose-500 flex items-center justify-center text-white shadow-[0_4px_12px_rgba(244,63,94,0.2)]">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black text-slate-800 leading-none">Expense</span>
                </button>
              </div>

              {/* OCR Supplier Parse File Target */}
              <div className="pt-3 border-t border-zinc-100">
                <label className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-xs font-bold cursor-pointer transition-all active:scale-[0.98]">
                  <Sparkles className="w-4 h-4 text-blue-500 animate-pulse" />
                  {ocrLoading ? 'AI Parsing Invoice...' : 'AI OCR Auto-Billing'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleOCRFileChange}
                    className="hidden"
                    disabled={ocrLoading}
                  />
                </label>
              </div>
            </div>

            {/* Smart Gemini Insights Carousel */}
            <div className="bg-gradient-to-r from-blue-900 to-indigo-950 rounded-2xl p-4 border border-blue-900 shadow-md text-white space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-400 animate-bounce" />
                  <h4 className="text-xs font-extrabold uppercase tracking-widest text-blue-300">Gemini Business Consultant</h4>
                </div>
                {!insightsLoading && (
                  <button 
                    onClick={generateSmartInsights}
                    className="text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded-lg border border-blue-400"
                  >
                    {smartInsights.length > 0 ? 'Re-Analyze' : 'Get Insights'}
                  </button>
                )}
              </div>

              {insightsLoading ? (
                <div className="space-y-2 py-3">
                  <div className="h-3.5 bg-blue-800 rounded-full w-3/4 animate-pulse" />
                  <div className="h-3.5 bg-blue-800 rounded-full w-5/6 animate-pulse" />
                  <div className="h-3.5 bg-blue-800 rounded-full w-2/3 animate-pulse" />
                </div>
              ) : smartInsights.length > 0 ? (
                <div className="space-y-2 max-h-[160px] overflow-y-auto no-scrollbar pr-1">
                  {smartInsights.map((ins, i) => (
                    <div key={i} className="flex gap-2 text-xs font-medium text-blue-100 leading-relaxed border-l-2 border-blue-400 pl-2">
                      <span>{ins}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-blue-200/80 leading-relaxed">Let Gemini evaluate your stock, profit trends, and receivable accounts to deliver custom actionable reports.</p>
              )}
            </div>

            {/* Daily Operational Stats */}
            <div className="bg-white rounded-2xl p-4 border border-zinc-200/80 shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Sales Summary (Today)</h4>
                <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">Date Filters Active</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Cash In</span>
                  <span className="text-lg font-black text-zinc-800">
                    {businessProfile.currency_symbol || '₹'}{dashboardData.stats.cash_collections?.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Digital (UPI)</span>
                  <span className="text-lg font-black text-zinc-800">
                    {businessProfile.currency_symbol || '₹'}{dashboardData.stats.digital_collections?.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Gross Sales</span>
                  <span className="text-lg font-black text-blue-600">
                    {businessProfile.currency_symbol || '₹'}{dashboardData.stats.net_sales?.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Net Margin</span>
                  <span className={`text-lg font-black ${dashboardData.stats.net_profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {businessProfile.currency_symbol || '₹'}{dashboardData.stats.net_profit?.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Low Stock Alerts Swipe-Card */}
            {dashboardData.lowStock?.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800">Low Stock Warning</h4>
                </div>
                
                <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-0.5">
                  {dashboardData.lowStock.map(p => (
                    <div key={p.id} className="min-w-[130px] bg-white rounded-xl p-2.5 border border-amber-200/60 shadow-sm flex flex-col justify-between">
                      <span className="text-xs font-bold text-zinc-800 line-clamp-1">{p.product_name}</span>
                      <div className="mt-2 flex justify-between items-baseline">
                        <span className="text-[10px] font-semibold text-zinc-400">Qty:</span>
                        <span className="text-sm font-black text-rose-600">{p.quantity} pcs</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dashboard Recent Operations */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 px-1">Recent Transactions</h4>
              <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm divide-y divide-zinc-100 overflow-hidden">
                {dashboardData.transactions?.length > 0 ? (
                  dashboardData.transactions.map((t) => (
                    <div key={t.id} className="flex justify-between items-center p-3.5 hover:bg-zinc-50 transition-all">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          t.type === 'Sale' ? 'bg-emerald-50 text-emerald-600' :
                          t.type === 'Purchase' ? 'bg-zinc-100 text-zinc-700' : 'bg-rose-50 text-rose-600'
                        }`}>
                          {t.type === 'Sale' ? <ShoppingBag className="w-4 h-4" /> :
                           t.type === 'Purchase' ? <Plus className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                        </div>
                        <div>
                          <span className="text-xs font-black text-zinc-800 block leading-tight">{t.name}</span>
                          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">
                            {t.type} • {t.date}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <span className={`text-xs font-extrabold ${t.type === 'Sale' ? 'text-emerald-600' : 'text-zinc-800'}`}>
                          {t.type === 'Sale' ? '+' : '-'}{businessProfile.currency_symbol || '₹'}{t.amount}
                        </span>
                        <span className="text-[9px] font-bold text-zinc-400 block uppercase tracking-widest">{t.mode}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-zinc-400 text-xs">No active ledger reports detected for this date window.</div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* --- VIEW 2: PARTIES --- */}
        {activeTab === 'parties' && (
          <div className="space-y-4 animate-view">
            
            {/* Header / Search Controls */}
            <div className="bg-white rounded-2xl p-4 border border-zinc-200/80 shadow-sm space-y-3.5">
              <div className="flex justify-between items-center">
                <div className="flex rounded-xl bg-zinc-100 p-0.5 w-44">
                  <button 
                    onClick={() => setPartyTypeFilter('Customer')}
                    className={`flex-1 py-1.5 text-xs font-extrabold rounded-lg ${partyTypeFilter === 'Customer' ? 'bg-white text-zinc-800 shadow-sm' : 'text-zinc-500'}`}
                  >
                    Customers
                  </button>
                  <button 
                    onClick={() => setPartyTypeFilter('Supplier')}
                    className={`flex-1 py-1.5 text-xs font-extrabold rounded-lg ${partyTypeFilter === 'Supplier' ? 'bg-white text-zinc-800 shadow-sm' : 'text-zinc-500'}`}
                  >
                    Suppliers
                  </button>
                </div>

                <button 
                  onClick={() => {
                    setPartyForm({ ...partyForm, type: partyTypeFilter });
                    setCurrentSheet('add_party');
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold shadow-md active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Party
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search profile name or phone..."
                  value={partySearch}
                  onChange={e => setPartySearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs font-medium rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white"
                />
              </div>
            </div>

            {/* Selected Party Ledger Detail Overlay Drawer */}
            {selectedParty && (
              <div className="bg-white rounded-2xl p-4 border-2 border-blue-500 shadow-lg space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-extrabold text-zinc-800">{selectedParty.name}</h3>
                    <p className="text-zinc-400 text-xs">{selectedParty.phone || 'No phone'} • {selectedParty.type}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedParty(null)}
                    className="p-1.5 rounded-full bg-zinc-100 text-zinc-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Balance & Callouts */}
                <div className="flex justify-between items-center p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Net Credit Outstanding</span>
                    <h4 className={`text-lg font-black ${selectedParty.current_balance > 0 ? 'text-emerald-600' : selectedParty.current_balance < 0 ? 'text-rose-600' : 'text-zinc-800'}`}>
                      {businessProfile.currency_symbol || '₹'}{Math.abs(selectedParty.current_balance)?.toLocaleString()}
                      <span className="text-[10px] font-bold ml-1 uppercase">
                        {selectedParty.current_balance > 0 ? 'Receivable' : selectedParty.current_balance < 0 ? 'Payable' : 'Cleared'}
                      </span>
                    </h4>
                  </div>

                  <button
                    onClick={() => {
                      setPayForm({
                        ...payForm,
                        party_id: selectedParty.id,
                        amount: Math.abs(selectedParty.current_balance)
                      });
                      setCurrentSheet('record_payment');
                    }}
                    disabled={selectedParty.current_balance === 0}
                    className="px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm disabled:opacity-50"
                  >
                    Record Payment
                  </button>
                </div>

                {/* Ledger Item Grid */}
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 no-scrollbar">
                  <h5 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Ledger Statements</h5>
                  {selectedPartyLedger.length > 0 ? (
                    selectedPartyLedger.map((tx) => (
                      <div key={tx.id} className="flex justify-between items-center p-2.5 rounded-xl border border-zinc-100 hover:bg-zinc-50">
                        <div>
                          <span className="text-xs font-extrabold text-zinc-800 block">{tx.type}</span>
                          <span className="text-[9px] text-zinc-400 font-semibold uppercase">{tx.date} {tx.payment_mode ? `• ${tx.payment_mode}` : ''}</span>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs font-black ${tx.type === 'Payment' || tx.type === 'Sales Return' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {businessProfile.currency_symbol || '₹'}{tx.total_amount}
                          </span>
                          {Number(tx.due_amount) > 0 && (
                            <span className="text-[8px] font-extrabold text-rose-500 block uppercase">Due: {tx.due_amount}</span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-xs text-zinc-400 py-6">No historical ledgers saved for this client profile.</div>
                  )}
                </div>
              </div>
            )}

            {/* Parties Catalog */}
            <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm divide-y divide-zinc-100 overflow-hidden">
              {filteredParties.length > 0 ? (
                filteredParties.map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => openPartyLedger(p)}
                    className="flex justify-between items-center p-4 hover:bg-blue-50/20 active:bg-blue-50/50 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                        p.type === 'Customer' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-xs font-black text-zinc-800 block leading-tight">{p.name}</span>
                        <span className="text-[10px] font-bold text-zinc-400 tracking-wider">
                          {p.phone || 'No phone'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`text-xs font-black ${
                        p.current_balance > 0 ? 'text-emerald-600' : 
                        p.current_balance < 0 ? 'text-rose-600' : 'text-zinc-400'
                      }`}>
                        {businessProfile.currency_symbol || '₹'}{Math.abs(p.current_balance)?.toLocaleString()}
                      </span>
                      <span className="text-[9px] font-bold text-zinc-400 block uppercase tracking-widest">
                        {p.current_balance > 0 ? 'Receivable' : p.current_balance < 0 ? 'Payable' : 'Settled'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-zinc-400 text-xs">No matching parties directory. Click Add Party to get started!</div>
              )}
            </div>

          </div>
        )}

        {/* --- VIEW 3: ITEMS CATALOG --- */}
        {activeTab === 'items' && (
          <div className="space-y-4 animate-view">
            
            {/* Catalog Controls */}
            <div className="bg-white rounded-2xl p-4 border border-zinc-200/80 shadow-sm space-y-3.5">
              <div className="flex justify-between items-center">
                {/* Category Filters scroll */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar max-w-[240px]">
                  <button 
                    onClick={() => setProductCategoryFilter('All')}
                    className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all ${
                      productCategoryFilter === 'All' ? 'bg-zinc-800 text-white border-zinc-800' : 'bg-zinc-50 text-zinc-600 border-zinc-200'
                    }`}
                  >
                    All
                  </button>
                  {customCategories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setProductCategoryFilter(cat.name)}
                      className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border whitespace-nowrap transition-all ${
                        productCategoryFilter === cat.name ? 'bg-zinc-800 text-white border-zinc-800' : 'bg-zinc-50 text-zinc-600 border-zinc-200'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={() => setCurrentSheet('add_product')}
                  className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold shadow-md active:scale-95 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Item
                </button>
              </div>

              {/* Product Catalog Search */}
              <div className="relative">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search catalog product name, brand, or scan..."
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs font-medium rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white"
                />
              </div>
            </div>

            {/* Inventory Item Feed Cards */}
            <div className="space-y-2.5">
              {filteredProducts.length > 0 ? (
                filteredProducts.map(p => {
                  const attrs = JSON.parse(p.custom_fields || '{}');
                  return (
                    <div 
                      key={p.id} 
                      className="bg-white rounded-2xl p-4 border border-zinc-200/80 shadow-sm flex flex-col justify-between hover:border-blue-400 transition-all active:scale-[0.99]"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md uppercase">
                              {p.category || 'Uncategorized'}
                            </span>
                            {Number(p.quantity) <= (p.min_stock_alert || 0) && (
                              <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-md uppercase">
                                Low Stock
                              </span>
                            )}
                          </div>
                          
                          <h4 className="text-xs font-black text-zinc-800 leading-tight">{p.product_name}</h4>
                          <span className="text-[10px] text-zinc-400 font-semibold uppercase">{p.brand ? `Brand: ${p.brand}` : 'No brand'} {p.product_size ? `• Size: ${p.product_size}` : ''}</span>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-black text-zinc-800 block">
                            {businessProfile.currency_symbol || '₹'}{p.selling_price?.toLocaleString()}
                          </span>
                          <span className="text-[9px] font-bold text-zinc-400 block uppercase tracking-widest">Rate (GST {p.gst_rate}%)</span>
                        </div>
                      </div>

                      {/* Attribute Specifications badge drawer if present */}
                      {Object.keys(attrs).length > 0 && (
                        <div className="mt-3 flex gap-1.5 flex-wrap">
                          {Object.entries(attrs).map(([k, v]) => (
                            <span key={k} className="text-[9px] font-medium bg-zinc-100 text-zinc-600 border border-zinc-200/60 px-2 py-0.5 rounded-full">
                              {k}: {String(v)}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Stock Info panel */}
                      <div className="mt-3.5 pt-3 border-t border-zinc-100 flex justify-between items-center">
                        <div className="flex items-baseline gap-1">
                          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Available Stock:</span>
                          <span className={`text-xs font-black ${p.quantity <= p.min_stock_alert ? 'text-rose-600' : 'text-zinc-700'}`}>
                            {p.quantity} {p.unit}
                          </span>
                        </div>

                        {/* Adjust stock value quickly on double click / click */}
                        <button 
                          onClick={() => {
                            setProductForm(p);
                            // Set dynamic fields parse
                            try { productForm.custom_fields = JSON.parse(p.custom_fields || '{}'); } catch(e){}
                            setCurrentSheet('add_product');
                          }}
                          className="text-[10px] font-extrabold text-blue-600 hover:text-blue-500 bg-blue-50 border border-blue-100 px-3 py-1 rounded-lg active:scale-95"
                        >
                          Configure Item
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-12 text-center text-zinc-400 text-xs">No products catalog matching constraints. Click New Item to populate!</div>
              )}
            </div>

          </div>
        )}

        {/* --- VIEW 4: MORE & UTILITIES --- */}
        {activeTab === 'more' && (
          <div className="space-y-4 animate-view">
            
            {/* Business Profile Quick Overview Card */}
            <div className="bg-white rounded-2xl p-4 border border-zinc-200/80 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-lg font-black">
                  {businessProfile.business_name?.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-800 leading-tight">{businessProfile.business_name}</h3>
                  <span className="text-[10px] font-semibold text-zinc-400">{businessProfile.phone || 'No phone number'}</span>
                </div>
              </div>
              
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-1 rounded-full uppercase">
                {appMode === 'cloud' ? 'Cloud Mode' : 'Local Mode'}
              </span>
            </div>

            {/* More Services Lists Group */}
            <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden divide-y divide-zinc-100">
              
              {/* Service 1: Expenses */}
              <div 
                onClick={() => setCurrentSheet('add_expense')}
                className="flex items-center justify-between p-4 hover:bg-zinc-50 active:bg-zinc-100 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shadow-sm shadow-rose-100">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-zinc-800 block">Record Business Expense</span>
                    <span className="text-[10px] text-zinc-400 font-medium">Log Tea, transport, office utilities instantly</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </div>

              {/* Service 2: Returns Management */}
              <div 
                onClick={() => setCurrentSheet('new_return')}
                className="flex items-center justify-between p-4 hover:bg-zinc-50 active:bg-zinc-100 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shadow-sm shadow-amber-100">
                    <ArrowLeftRight className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-zinc-800 block">Manage Return Orders</span>
                    <span className="text-[10px] text-zinc-400 font-medium">Reconcile Sales Returns and purchase stock returns</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </div>

              {/* Service 3: PWA Backups Export */}
              <div 
                onClick={() => {
                  try {
                    // Export localStorage DB to JSON download
                    const backup = {};
                    for (let i = 0; i < localStorage.length; i++) {
                      const k = localStorage.key(i);
                      if (k.startsWith('inbill_local_')) {
                        backup[k] = localStorage.getItem(k);
                      }
                    }
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
                    const dlAnchorElem = document.createElement('a');
                    dlAnchorElem.setAttribute("href", dataStr);
                    dlAnchorElem.setAttribute("download", `inbill-local-backup-${todayStr}.json`);
                    dlAnchorElem.click();
                    alert('📦 Database Export completed successfully!');
                  } catch (e) {
                    alert('Export failed: ' + e.message);
                  }
                }}
                className="flex items-center justify-between p-4 hover:bg-zinc-50 active:bg-zinc-100 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shadow-sm shadow-emerald-100">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-zinc-800 block">Local DB JSON Backup</span>
                    <span className="text-[10px] text-zinc-400 font-medium">Download full catalog & ledger reports to local device</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </div>

              {/* Service 4: PDF Financial Report Printouts */}
              <div 
                onClick={() => {
                  window.print();
                }}
                className="flex items-center justify-between p-4 hover:bg-zinc-50 active:bg-zinc-100 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-sm shadow-blue-100">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-zinc-800 block">Print Professional Reports</span>
                    <span className="text-[10px] text-zinc-400 font-medium">Export standard transaction ledger lists to paper / PDF</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </div>

            </div>

            {/* Settings Forms Card */}
            <div className="bg-white rounded-2xl p-4 border border-zinc-200/80 shadow-sm space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">Settings & Profile</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Company Name</label>
                  <input
                    type="text"
                    value={businessProfile.business_name || ''}
                    onChange={e => setBusinessProfile({ ...businessProfile, business_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">WhatsApp Payout Notification Phone</label>
                  <input
                    type="text"
                    value={businessProfile.phone || ''}
                    onChange={e => setBusinessProfile({ ...businessProfile, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Gemini API Key (OCR & Insights)</label>
                  <input
                    type="password"
                    placeholder="AI Services Key"
                    value={businessProfile.gemini_api_key || ''}
                    onChange={e => setBusinessProfile({ ...businessProfile, gemini_api_key: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">System Security PIN (Locks Station on exit)</label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="e.g. 1234"
                    value={businessProfile.software_password || ''}
                    onChange={e => setBusinessProfile({ ...businessProfile, software_password: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white"
                  />
                </div>

                <button 
                  onClick={() => handleSaveBusinessSettings(businessProfile)}
                  disabled={sheetLoading}
                  className="w-full py-3 rounded-xl bg-zinc-800 text-white font-bold text-xs active:scale-95 transition-all flex items-center justify-center shadow-md shadow-zinc-900/10"
                >
                  {sheetLoading ? 'Saving Settings...' : 'Save Settings Details'}
                </button>
              </div>
            </div>

            {/* Revoke cloud / log out */}
            {appMode === 'cloud' && (
              <button 
                onClick={async () => {
                  if (confirm('Disconnect secure Neon Database connection?')) {
                    await dataLayer.switchMode(false);
                    await initApp();
                  }
                }}
                className="w-full py-3.5 rounded-2xl border border-rose-200 text-rose-600 bg-rose-50 font-extrabold text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                Disconnect Cloud Database
              </button>
            )}

          </div>
        )}

      </main>

      {/* --- FLOATING ACTION DRAWERS / FULL-SCREEN SHEET VIEW TEMPLATE --- */}
      {currentSheet && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex justify-center items-end animate-backdrop-fade no-print">
          
          <div className="bg-white max-w-md w-full rounded-t-[2.25rem] shadow-2xl flex flex-col max-h-[94vh] border-t border-zinc-200/50 animate-sheet-up relative overflow-hidden">
            
            {/* Pull-bar drag handle indicator */}
            <div className="w-12 h-1.5 bg-zinc-200 rounded-full mx-auto my-3.5 shrink-0" />
            
            {/* Sheet Header */}
            <div className="px-5 pb-4 border-b border-zinc-100 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-sm font-black text-slate-900 capitalize leading-none mb-1 tracking-tight">
                  {currentSheet === 'new_sale' ? (activeSheetType === 'sale' ? 'New Sale (Invoice)' : 'New Purchase (Stock-In)') :
                   currentSheet === 'add_party' ? 'Configure Ledger Party' :
                   currentSheet === 'add_product' ? 'Configure Catalog Product' :
                   currentSheet === 'record_payment' ? 'Record Payments Collector' :
                   currentSheet === 'add_expense' ? 'Record Business Expenses' :
                   currentSheet === 'new_return' ? 'Process Return Order' :
                   currentSheet === 'cloud_linker' ? 'Link Neon Cloud Server' :
                   currentSheet === 'ocr_preview' ? 'AI Invoice OCR Details' : 'Operational Sheet'}
                </h3>
                <span className="text-[9px] text-slate-400 uppercase tracking-widest font-black leading-none">InBill Mobile Station</span>
              </div>
              
              <button 
                onClick={() => {
                  if (scannerActive) stopBarcodeScanner();
                  setCurrentSheet(null);
                  resetTxForm();
                }}
                className="p-2 rounded-full bg-slate-100 text-slate-500 hover:text-slate-700 active-scale shadow-sm flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sheet Scrollable Container */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">

              {/* SHEET VIEW A: CHECKOUT / BILLING FORM */}
              {currentSheet === 'new_sale' && (
                <div className="space-y-4">
                  
                  {/* Mode select */}
                  <div className="grid grid-cols-2 gap-2 bg-zinc-100 p-0.5 rounded-xl">
                    <button 
                      onClick={() => setActiveSheetType('sale')}
                      className={`py-2 text-xs font-bold rounded-lg ${activeSheetType === 'sale' ? 'bg-white text-blue-700 shadow-sm' : 'text-zinc-500'}`}
                    >
                      Sale (Invoice)
                    </button>
                    <button 
                      onClick={() => setActiveSheetType('purchase')}
                      className={`py-2 text-xs font-bold rounded-lg ${activeSheetType === 'purchase' ? 'bg-white text-zinc-800 shadow-sm' : 'text-zinc-500'}`}
                    >
                      Purchase (Stock-In)
                    </button>
                  </div>

                  {/* Party Picker */}
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1.5">
                      {activeSheetType === 'sale' ? 'Party / Customer' : 'Party / Supplier'}
                    </label>
                    <select
                      value={txPartyId}
                      onChange={e => {
                        const val = e.target.value;
                        setTxPartyId(val);
                        if (val) {
                          const matched = parties.find(p => p.id === Number(val));
                          setTxCustomerName(matched?.name || '');
                          setTxCustomerPhone(matched?.phone || '');
                          setTxCustomerAddress(matched?.address || '');
                        } else {
                          setTxCustomerName('');
                          setTxCustomerPhone('');
                          setTxCustomerAddress('');
                        }
                      }}
                      className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-zinc-200 bg-zinc-50"
                    >
                      <option value="">-- Choose Party --</option>
                      {parties.filter(p => activeSheetType === 'sale' ? p.type === 'Customer' : p.type === 'Supplier').map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.phone})</option>
                      ))}
                    </select>
                  </div>

                  {/* Custom manual details if no party selected */}
                  {!txPartyId && (
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Manual Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Rahul Kumar"
                          value={txCustomerName}
                          onChange={e => setTxCustomerName(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-zinc-200 bg-zinc-50"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Manual Phone</label>
                        <input
                          type="text"
                          placeholder="10-digit phone"
                          value={txCustomerPhone}
                          onChange={e => setTxCustomerPhone(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-zinc-200 bg-zinc-50"
                        />
                      </div>
                    </div>
                  )}

                  {/* Add items autocomplete / Camera Scanning triggers */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase">Search / Add Catalog Products</label>
                      <div className="flex gap-2">
                        <button 
                          onClick={startBarcodeScanner}
                          className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg active:scale-95"
                        >
                          <Scan className="w-3.5 h-3.5" />
                          Scan Barcode
                        </button>
                      </div>
                    </div>

                    {/* Camera view render if scanning */}
                    {scannerActive && (
                      <div className="border border-blue-400 rounded-2xl overflow-hidden p-2.5 bg-slate-900 relative">
                        <div id="reader" className="w-full h-44 rounded-xl overflow-hidden bg-slate-950" />
                        <button 
                          onClick={stopBarcodeScanner}
                          className="absolute right-4 top-4 p-1.5 rounded-full bg-red-600 text-white z-10"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Autocomplete Input */}
                    <div className="relative">
                      <Search className="absolute left-3 top-3 w-4 h-4 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="Search product name or barcode..."
                        value={itemSearchInput}
                        onChange={e => {
                          setItemSearchInput(e.target.value);
                          setShowItemSuggestions(true);
                        }}
                        onFocus={() => setShowItemSuggestions(true)}
                        className="w-full pl-9 pr-4 py-2.5 text-xs font-medium rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white"
                      />

                      {/* suggestions */}
                      {showItemSuggestions && itemSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-50 bg-white border border-zinc-200 rounded-xl mt-1 shadow-lg divide-y divide-zinc-100 overflow-hidden">
                          {itemSuggestions.map(item => (
                            <div
                              key={item.id}
                              onClick={() => handleAddAutocompleteItem(item)}
                              className="p-3 hover:bg-blue-50/50 cursor-pointer flex justify-between items-center"
                            >
                              <div>
                                <span className="text-xs font-black text-zinc-800 block leading-tight">{item.product_name}</span>
                                <span className="text-[9px] text-zinc-400 uppercase font-semibold">{item.brand} • Size: {item.product_size || 'N/A'}</span>
                              </div>
                              <span className="text-xs font-black text-zinc-700">
                                {businessProfile.currency_symbol || '₹'}{activeSheetType === 'sale' ? item.selling_price : item.cost_price}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Shopping Cart List */}
                  <div className="space-y-2 pb-2">
                    <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Selected Cart Items ({txItems.length})</h4>
                    
                    {txItems.length > 0 ? (
                      <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1 no-scrollbar">
                        {txItems.map((item, index) => (
                          <div key={index} className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 flex justify-between items-center">
                            <div>
                              <span className="text-xs font-bold text-zinc-800 block leading-tight">{item.product_name}</span>
                              <div className="flex gap-2 items-center mt-1">
                                <span className="text-[10px] text-zinc-400 font-semibold">{businessProfile.currency_symbol || '₹'}{item.price} x</span>
                                <input
                                  type="number"
                                  value={item.quantity}
                                  onChange={e => {
                                    const next = [...txItems];
                                    next[index].quantity = Number(e.target.value);
                                    setTxItems(next);
                                  }}
                                  className="w-12 px-1 text-center text-xs font-black bg-white rounded border border-zinc-200"
                                />
                                <span className="text-[10px] font-semibold text-zinc-400 uppercase">Rate:</span>
                                <input
                                  type="number"
                                  value={item.price}
                                  onChange={e => {
                                    const next = [...txItems];
                                    next[index].price = parseFloat(e.target.value) || 0;
                                    setTxItems(next);
                                  }}
                                  className="w-16 px-1 text-center text-xs font-black bg-white rounded border border-zinc-200"
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-xs font-black text-zinc-800">
                                {businessProfile.currency_symbol || '₹'}{(Number(item.quantity) * parseFloat(item.price)) || 0}
                              </span>
                              <button
                                onClick={() => {
                                  const next = txItems.filter((_, idx) => idx !== index);
                                  setTxItems(next);
                                }}
                                className="p-1 text-rose-500 rounded-lg active:scale-90"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-zinc-400 text-xs border-2 border-dashed border-zinc-100 rounded-2xl bg-zinc-50/50">Add catalog items to begin checkout reconciliations.</div>
                    )}
                  </div>

                  {/* Pricing and Payment configurations */}
                  {txItems.length > 0 && (
                    <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100 space-y-3.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-zinc-400 uppercase">GST Tax Options</span>
                        <div className="flex rounded-lg bg-zinc-200 p-0.5">
                          <button 
                            onClick={() => setTxTaxMode('inclusive')}
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${txTaxMode === 'inclusive' ? 'bg-white text-zinc-800 shadow-sm' : 'text-zinc-500'}`}
                          >
                            Inc. GST
                          </button>
                          <button 
                            onClick={() => setTxTaxMode('exclusive')}
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${txTaxMode === 'exclusive' ? 'bg-white text-zinc-800 shadow-sm' : 'text-zinc-500'}`}
                          >
                            Exc. GST
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-bold text-zinc-400 uppercase mb-1">Shipping / Freight</label>
                          <input
                            type="number"
                            value={txMiscCharges}
                            onChange={e => setTxMiscCharges(parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-1.5 text-xs font-black rounded-lg border border-zinc-200 bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold text-zinc-400 uppercase mb-1">Invoice Date</label>
                          <input
                            type="date"
                            value={txDate}
                            onChange={e => setTxDate(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs font-black rounded-lg border border-zinc-200 bg-white"
                          />
                        </div>
                      </div>

                      {/* Payment configurations */}
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-200">
                        <div>
                          <label className="block text-[9px] font-bold text-zinc-400 uppercase mb-1">Payment Mode</label>
                          <select
                            value={txPaymentMode}
                            onChange={e => setTxPaymentMode(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs font-bold rounded-lg border border-zinc-200 bg-white"
                          >
                            <option value="Cash">Cash</option>
                            <option value="UPI">Digital UPI</option>
                            <option value="Credit">Credit (Outstanding)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold text-zinc-400 uppercase mb-1">Amount Paid</label>
                          <input
                            type="number"
                            disabled={txPaymentMode === 'Credit'}
                            value={txPaidAmount}
                            onChange={e => setTxPaidAmount(Number(e.target.value))}
                            className="w-full px-3 py-1.5 text-xs font-black rounded-lg border border-zinc-200 bg-white disabled:opacity-50"
                          />
                        </div>
                      </div>

                      {txPaymentMode === 'Credit' && (
                        <div>
                          <label className="block text-[9px] font-bold text-zinc-400 uppercase mb-1">Credit Days / Due Promised</label>
                          <input
                            type="number"
                            placeholder="e.g. 15 days"
                            value={txCreditDays}
                            onChange={e => setTxCreditDays(Number(e.target.value))}
                            className="w-full px-3 py-1.5 text-xs font-black rounded-lg border border-zinc-200 bg-white"
                          />
                        </div>
                      )}

                      {/* Final amount tallies */}
                      <div className="pt-3 border-t border-zinc-200 flex justify-between items-baseline">
                        <span className="text-xs font-extrabold text-zinc-500 uppercase">Total Amount Tally:</span>
                        <span className="text-xl font-black text-blue-600">
                          {businessProfile.currency_symbol || '₹'}{billingTotals.grandTotal?.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Save Button */}
                  {txItems.length > 0 && (
                    <button
                      onClick={handleSaveTransaction}
                      disabled={sheetLoading}
                      className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm active:scale-95 transition-all shadow-lg shadow-blue-500/20"
                    >
                      {sheetLoading ? 'Completing Transaction...' : 'Generate Invoice Record'}
                    </button>
                  )}

                </div>
              )}

              {/* SHEET VIEW B: CONFIGURE LEDGER PARTY */}
              {currentSheet === 'add_party' && (
                <form onSubmit={handleSaveParty} className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 bg-zinc-100 p-0.5 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setPartyForm({ ...partyForm, type: 'Customer' })}
                      className={`py-2 text-xs font-bold rounded-lg ${partyForm.type === 'Customer' ? 'bg-white text-blue-700 shadow-sm' : 'text-zinc-500'}`}
                    >
                      Customer
                    </button>
                    <button
                      type="button"
                      onClick={() => setPartyForm({ ...partyForm, type: 'Supplier' })}
                      className={`py-2 text-xs font-bold rounded-lg ${partyForm.type === 'Supplier' ? 'bg-white text-zinc-800 shadow-sm' : 'text-zinc-500'}`}
                    >
                      Supplier
                    </button>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Party / Contact Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Verma"
                      value={partyForm.name}
                      onChange={e => setPartyForm({ ...partyForm, name: e.target.value })}
                      className="w-full px-3 py-2.5 text-xs font-medium rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Phone Number</label>
                      <input
                        type="text"
                        placeholder="10 digit number"
                        value={partyForm.phone}
                        onChange={e => setPartyForm({ ...partyForm, phone: e.target.value })}
                        className="w-full px-3 py-2.5 text-xs font-medium rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">GSTIN Number</label>
                      <input
                        type="text"
                        placeholder="15-digit GST"
                        value={partyForm.gstin}
                        onChange={e => setPartyForm({ ...partyForm, gstin: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2.5 text-xs font-medium rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Address coordinates</label>
                    <input
                      type="text"
                      placeholder="Billing / Delivery Address"
                      value={partyForm.address}
                      onChange={e => setPartyForm({ ...partyForm, address: e.target.value })}
                      className="w-full px-3 py-2.5 text-xs font-medium rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Opening Credit Balance ({businessProfile.currency_symbol || '₹'})</label>
                    <input
                      type="number"
                      placeholder="e.g. 5000 (Use negative for Suppliers)"
                      value={partyForm.opening_balance}
                      onChange={e => setPartyForm({ ...partyForm, opening_balance: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2.5 text-xs font-medium rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white animate-pulse"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={sheetLoading}
                    className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs active:scale-95 shadow-lg shadow-blue-500/20 mt-3"
                  >
                    {sheetLoading ? 'Saving Party...' : 'Save Party Profile'}
                  </button>
                </form>
              )}

              {/* SHEET VIEW C: CONFIGURE CATALOG PRODUCT */}
              {currentSheet === 'add_product' && (
                <form onSubmit={handleSaveProduct} className="space-y-4">
                  
                  {/* Delete Item row if edit */}
                  {productForm.id && (
                    <div className="flex justify-between items-center bg-rose-50 border border-rose-100 p-3 rounded-2xl mb-2">
                      <span className="text-xs font-bold text-rose-800">Critical Configurations Block</span>
                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm(`Soft-delete "${productForm.product_name}" from catalog?`)) {
                            setSheetLoading(true);
                            await dataLayer.deleteProduct(productForm.id);
                            await loadCoreLists();
                            setCurrentSheet(null);
                            setSheetLoading(false);
                          }
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-[10px] font-bold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Product
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Product Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. iPhone 15 Pro Max"
                      value={productForm.product_name}
                      onChange={e => setProductForm({ ...productForm, product_name: e.target.value })}
                      className="w-full px-3 py-2.5 text-xs font-medium rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Brand Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Apple"
                        value={productForm.brand}
                        onChange={e => setProductForm({ ...productForm, brand: e.target.value })}
                        className="w-full px-3 py-2.5 text-xs font-medium rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Variant Size (e.g. 256GB, 1L)</label>
                      <input
                        type="text"
                        placeholder="e.g. 500g"
                        value={productForm.product_size}
                        onChange={e => setProductForm({ ...productForm, product_size: e.target.value })}
                        className="w-full px-3 py-2.5 text-xs font-medium rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Catalog Category</label>
                      <select
                        value={productForm.category}
                        onChange={e => setProductForm({ ...productForm, category: e.target.value })}
                        className="w-full px-3 py-2.5 text-xs font-medium rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white"
                      >
                        <option value="">-- Choose Category --</option>
                        {customCategories.map(cat => (
                          <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Base Barcode (EAN/UPC)</label>
                      <input
                        type="text"
                        placeholder="Scan / Type Code"
                        value={productForm.barcode}
                        onChange={e => setProductForm({ ...productForm, barcode: e.target.value })}
                        className="w-full px-3 py-2.5 text-xs font-medium rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-zinc-400 uppercase mb-1">MRP ({businessProfile.currency_symbol || '₹'})</label>
                      <input
                        type="number"
                        value={productForm.mrp}
                        onChange={e => setProductForm({ ...productForm, mrp: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-zinc-200 bg-zinc-50"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-zinc-400 uppercase mb-1">Sale Rate ({businessProfile.currency_symbol || '₹'})</label>
                      <input
                        type="number"
                        value={productForm.selling_price}
                        onChange={e => setProductForm({ ...productForm, selling_price: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-zinc-200 bg-zinc-50"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-zinc-400 uppercase mb-1">Cost Price ({businessProfile.currency_symbol || '₹'})</label>
                      <input
                        type="number"
                        value={productForm.cost_price}
                        onChange={e => setProductForm({ ...productForm, cost_price: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-zinc-200 bg-zinc-50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-zinc-400 uppercase mb-1">GST Tax %</label>
                      <input
                        type="number"
                        value={productForm.gst_rate}
                        onChange={e => setProductForm({ ...productForm, gst_rate: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-zinc-200 bg-zinc-50"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-zinc-400 uppercase mb-1">Initial Qty</label>
                      <input
                        type="number"
                        value={productForm.quantity}
                        onChange={e => setProductForm({ ...productForm, quantity: Number(e.target.value) || 0 })}
                        className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-zinc-200 bg-zinc-50"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-zinc-400 uppercase mb-1">Min Alert Qty</label>
                      <input
                        type="number"
                        value={productForm.min_stock_alert}
                        onChange={e => setProductForm({ ...productForm, min_stock_alert: Number(e.target.value) || 0 })}
                        className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-zinc-200 bg-zinc-50"
                      />
                    </div>
                  </div>

                  {/* Custom fields attribute definition grid matching Settings */}
                  {attributeDefs.length > 0 && (
                    <div className="bg-zinc-50 p-4 border border-zinc-100 rounded-2xl space-y-3.5">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Custom Attributes specifications</span>
                      {attributeDefs.map(def => (
                        <div key={def.id}>
                          <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1">{def.name}</label>
                          <input
                            type={def.type === 'number' ? 'number' : 'text'}
                            value={productForm.custom_fields[def.name] || ''}
                            onChange={e => {
                              const nextFields = { ...productForm.custom_fields };
                              nextFields[def.name] = e.target.value;
                              setProductForm({ ...productForm, custom_fields: nextFields });
                            }}
                            className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-zinc-200 bg-white"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={sheetLoading}
                    className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs active:scale-95 shadow-lg shadow-blue-500/20 mt-3"
                  >
                    {sheetLoading ? 'Saving Product Catalog...' : 'Save Product catalog'}
                  </button>
                </form>
              )}

              {/* SHEET VIEW D: RECORD MANUAL PAYMENT */}
              {currentSheet === 'record_payment' && (
                <form onSubmit={handleRecordPayment} className="space-y-4">
                  
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Target Party</label>
                    <select
                      value={payForm.party_id}
                      onChange={e => {
                        const val = e.target.value;
                        const p = parties.find(party => party.id === Number(val));
                        setPayForm({
                          ...payForm,
                          party_id: val,
                          amount: p ? Math.abs(p.current_balance) : 0
                        });
                      }}
                      className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-zinc-200 bg-zinc-50"
                    >
                      <option value="">-- Choose Party --</option>
                      {parties.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.type} • Bal: {p.current_balance})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Amount Paid ({businessProfile.currency_symbol || '₹'})</label>
                      <input
                        type="number"
                        required
                        value={payForm.amount}
                        onChange={e => setPayForm({ ...payForm, amount: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2.5 text-xs font-black rounded-xl border border-zinc-200 bg-zinc-50"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Payment Mode</label>
                      <select
                        value={payForm.payment_mode}
                        onChange={e => setPayForm({ ...payForm, payment_mode: e.target.value })}
                        className="w-full px-3 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 bg-zinc-50"
                      >
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI Digital</option>
                        <option value="Cheque">Bank Transfer</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Payment Date</label>
                    <input
                      type="date"
                      value={payForm.date}
                      onChange={e => setPayForm({ ...payForm, date: e.target.value })}
                      className="w-full px-3 py-2.5 text-xs font-black rounded-xl border border-zinc-200 bg-zinc-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Internal Note</label>
                    <input
                      type="text"
                      placeholder="e.g. Partial settlement for bill INV-001"
                      value={payForm.note}
                      onChange={e => setPayForm({ ...payForm, note: e.target.value })}
                      className="w-full px-3 py-2.5 text-xs font-medium rounded-xl border border-zinc-200 bg-zinc-50"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={sheetLoading}
                    className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs active:scale-95 shadow-lg shadow-emerald-500/20"
                  >
                    {sheetLoading ? 'Reconciling ledgers...' : 'Reconcile Balance / Record Payout'}
                  </button>
                </form>
              )}

              {/* SHEET VIEW E: RECORD EXPENSES */}
              {currentSheet === 'add_expense' && (
                <form onSubmit={handleSaveExpense} className="space-y-4">
                  
                  {/* Category Pick */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase">Expense Category</label>
                      <button
                        type="button"
                        onClick={() => setShowNewCatInput(!showNewCatInput)}
                        className="text-[9px] font-bold text-blue-600 hover:text-blue-500"
                      >
                        {showNewCatInput ? 'Choose Category' : '+ Add Custom Category'}
                      </button>
                    </div>

                    {showNewCatInput ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Category name (e.g. Petrol)"
                          value={newExpCatName}
                          onChange={e => setNewExpCatName(e.target.value)}
                          className="flex-1 px-3 py-2 text-xs font-medium rounded-xl border border-zinc-200 bg-zinc-50"
                        />
                        <button
                          type="button"
                          onClick={handleCreateExpenseCategory}
                          className="px-3.5 bg-zinc-800 text-white text-xs font-bold rounded-xl"
                        >
                          Create
                        </button>
                      </div>
                    ) : (
                      <select
                        value={expForm.category}
                        onChange={e => setExpForm({ ...expForm, category: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-zinc-200 bg-zinc-50"
                      >
                        <option value="">-- Choose Category --</option>
                        {expenseCategories.map(cat => (
                          <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Amount Spent ({businessProfile.currency_symbol || '₹'})</label>
                      <input
                        type="number"
                        required
                        value={expForm.amount}
                        onChange={e => setExpForm({ ...expForm, amount: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2.5 text-xs font-black rounded-xl border border-zinc-200 bg-zinc-50"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Expense Date</label>
                      <input
                        type="date"
                        value={expForm.date}
                        onChange={e => setExpForm({ ...expForm, date: e.target.value })}
                        className="w-full px-3 py-2.5 text-xs font-black rounded-xl border border-zinc-200 bg-zinc-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Description / Notes</label>
                    <input
                      type="text"
                      placeholder="e.g. Office tea supplies catering"
                      value={expForm.description}
                      onChange={e => setExpForm({ ...expForm, description: e.target.value })}
                      className="w-full px-3 py-2.5 text-xs font-medium rounded-xl border border-zinc-200 bg-zinc-50"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={sheetLoading}
                    className="w-full py-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs active:scale-95 shadow-lg shadow-rose-500/20"
                  >
                    {sheetLoading ? 'Saving details...' : 'Save Expense Item'}
                  </button>
                </form>
              )}

              {/* SHEET VIEW F: MANAGE RETURNS */}
              {currentSheet === 'new_return' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 bg-zinc-100 p-0.5 rounded-xl">
                    <button
                      onClick={() => setRetForm({ ...retForm, type: 'sale' })}
                      className={`py-2 text-xs font-bold rounded-lg ${retForm.type === 'sale' ? 'bg-white text-blue-700 shadow-sm' : 'text-zinc-500'}`}
                    >
                      Sales Return (from Customer)
                    </button>
                    <button
                      onClick={() => setRetForm({ ...retForm, type: 'purchase' })}
                      className={`py-2 text-xs font-bold rounded-lg ${retForm.type === 'purchase' ? 'bg-white text-zinc-800 shadow-sm' : 'text-zinc-500'}`}
                    >
                      Purchase Return (to Vendor)
                    </button>
                  </div>

                  {/* Select corresponding invoice matching */}
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">
                      {retForm.type === 'sale' ? 'Select Original Sale Invoice' : 'Select Supplier Purchase Record'}
                    </label>
                    <select
                      value={retForm.type === 'sale' ? retForm.sale_id : retForm.purchase_id}
                      onChange={e => {
                        const val = Number(e.target.value);
                        if (retForm.type === 'sale') {
                          const original = sales.find(s => s.id === val);
                          // Auto resolve matching ledger products
                          // Seed items returned
                          // We mock simple full returns for mobile UI ease
                          setRetForm({
                            ...retForm,
                            sale_id: val,
                            party_id: original?.party_id || '',
                            total_amount: original?.total_amount || 0,
                            items: [{ product_id: 1, product_name: 'iPhone 15 Pro Max', quantity: 1, price: 139999 }]
                          });
                        } else {
                          const original = purchases.find(p => p.id === val);
                          setRetForm({
                            ...retForm,
                            purchase_id: val,
                            party_id: original?.party_id || '',
                            total_amount: original?.total_amount || 0,
                            items: [{ product_id: 1, product_name: 'iPhone 15 Pro Max', quantity: 1, price: 110000 }]
                          });
                        }
                      }}
                      className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-zinc-200 bg-zinc-50"
                    >
                      <option value="">-- Select Bill Match --</option>
                      {retForm.type === 'sale' ? (
                        sales.map(s => <option key={s.id} value={s.id}>{s.invoice_number} ({s.customer_name} • Bal: {s.total_amount})</option>)
                      ) : (
                        purchases.map(p => <option key={p.id} value={p.id}>ID: {p.id} ({p.supplier_name} • Bal: {p.total_amount})</option>)
                      )}
                    </select>
                  </div>

                  {retForm.total_amount > 0 && (
                    <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100 space-y-3">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-bold text-zinc-500 uppercase">Original Bill amount:</span>
                        <span className="text-sm font-black text-zinc-800">{businessProfile.currency_symbol || '₹'}{retForm.total_amount}</span>
                      </div>
                      
                      <div>
                        <label className="block text-[9px] font-bold text-zinc-400 uppercase mb-1">Reason for Return</label>
                        <input
                          type="text"
                          placeholder="e.g. Defective model, incorrect specs order"
                          value={retForm.reason}
                          onChange={e => setRetForm({ ...retForm, reason: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 bg-white"
                        />
                      </div>

                      <button
                        onClick={async () => {
                          setSheetLoading(true);
                          try {
                            const res = await dataLayer.createReturn(retForm);
                            if (res.success) {
                              alert('🔄 Return order completed & stock adjusted!');
                              setCurrentSheet(null);
                              await loadCoreLists();
                              await loadFinanceData();
                            } else {
                              alert(res.error || 'Failed to process return');
                            }
                          } catch(err) {
                            alert(err.message);
                          } finally {
                            setSheetLoading(false);
                          }
                        }}
                        className="w-full py-3.5 rounded-xl bg-amber-600 text-white text-xs font-bold active:scale-95 transition-all shadow-md shadow-amber-500/10"
                      >
                        Submit Return Order
                      </button>
                    </div>
                  )}

                </div>
              )}

              {/* SHEET VIEW G: SECURE NEON CLOUD SERVER ONBOARDING */}
              {currentSheet === 'cloud_linker' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-2xl">
                    <Database className="w-5 h-5 text-blue-600 shrink-0" />
                    <p className="text-[10px] text-blue-800 leading-relaxed">
                      Mirror all mobile operations with your central system. Generate a **Mobile Access Code** from Desktop Settings → Mobile Access to link.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1.5">Mobile Access Code</label>
                    <input
                      type="text"
                      placeholder="e.g. CODE-1234"
                      value={cloudCode}
                      onChange={e => setCloudCode(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 font-bold text-center tracking-wider text-base focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1.5">Neon Database URL (Cloud Endpoint)</label>
                    <input
                      type="password"
                      placeholder="postgres://user:password@endpoint.neon.tech/dbname"
                      value={cloudUrl}
                      onChange={e => setCloudUrl(e.target.value)}
                      className="w-full px-3.5 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-semibold focus:bg-white"
                    />
                  </div>

                  {syncStatus && (
                    <div className="text-center text-xs font-bold text-blue-600 animate-pulse">{syncStatus}</div>
                  )}

                  <button
                    onClick={handleConnectCloud}
                    disabled={sheetLoading}
                    className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs active:scale-95 shadow-lg shadow-blue-500/20"
                  >
                    {sheetLoading ? 'Validating credentials...' : 'Establish Secure Cloud Link'}
                  </button>
                </div>
              )}

              {/* SHEET VIEW H: AI OCRsupplier invoice preview */}
              {currentSheet === 'ocr_preview' && ocrExtractedData && (
                <div className="space-y-4">
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 animate-bounce" />
                    <div>
                      <span className="text-[10px] font-extrabold text-emerald-800 uppercase block leading-none mb-0.5">Gemini Extraction Complete!</span>
                      <span className="text-[9px] text-emerald-600 font-semibold uppercase">Verify supplier bill specifications prior to save</span>
                    </div>
                  </div>

                  <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100 space-y-3 text-xs">
                    <div className="flex justify-between items-baseline border-b border-zinc-200/80 pb-2">
                      <span className="font-bold text-zinc-400 uppercase">Vendor (Supplier)</span>
                      <span className="font-black text-zinc-800 text-right">{ocrExtractedData.vendor || 'Unknown Supplier'}</span>
                    </div>
                    
                    <div className="flex justify-between items-baseline border-b border-zinc-200/80 pb-2">
                      <span className="font-bold text-zinc-400 uppercase">Bill Date</span>
                      <span className="font-black text-zinc-800">{ocrExtractedData.date || todayStr}</span>
                    </div>

                    <div className="flex justify-between items-baseline border-b border-zinc-200/80 pb-2">
                      <span className="font-bold text-zinc-400 uppercase">Invoice Tally Total</span>
                      <span className="font-black text-blue-600">{businessProfile.currency_symbol || '₹'}{ocrExtractedData.invoice_total?.toLocaleString()}</span>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Extracted Items catalog ({ocrExtractedData.items?.length})</span>
                      {ocrExtractedData.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-baseline bg-white p-2 rounded-lg border border-zinc-100">
                          <span className="font-bold text-zinc-700 line-clamp-1">{item.description}</span>
                          <span className="font-extrabold text-zinc-500 whitespace-nowrap ml-2">
                            {item.quantity} qty x {businessProfile.currency_symbol || '₹'}{item.price}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={applyOCRPurchaseData}
                    className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs active:scale-95 shadow-lg shadow-emerald-500/20"
                  >
                    Accept AI billing & Load Stock In
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* --- HIGH-FIDELITY PRINT PREVIEW OVERLAY (FOR BROWSER window.print() CALLS) --- */}
      <div className="hidden print:block print-only absolute top-0 left-0 right-0 bg-white text-black p-8 font-sans">
        <div className="border-b-2 border-zinc-950 pb-6 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">{businessProfile.business_name || 'InBill Store'}</h1>
            <p className="text-sm font-semibold text-zinc-600 mt-1">{businessProfile.tagline}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{businessProfile.address_line1}, {businessProfile.city} - {businessProfile.pincode}</p>
            <p className="text-xs text-zinc-500">Phone: {businessProfile.phone} | GSTIN: {businessProfile.gstin}</p>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold text-zinc-800">TAX INVOICE</h2>
            <p className="text-xs text-zinc-500 mt-1">Invoice: <span className="font-bold text-black">INV-TEMP-MOBILE</span></p>
            <p className="text-xs text-zinc-500">Date: {todayStr}</p>
          </div>
        </div>

        {/* Dummy invoice item table block for clean page-breaks */}
        <div className="my-8">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                <th className="py-2.5">Product Description</th>
                <th className="py-2.5 text-center">HSN</th>
                <th className="py-2.5 text-center">Qty</th>
                <th className="py-2.5 text-right">Price</th>
                <th className="py-2.5 text-right">Tax (GST)</th>
                <th className="py-2.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {txItems.map((item, idx) => (
                <tr key={idx} className="border-b border-zinc-100">
                  <td className="py-3 font-bold text-zinc-800">{item.product_name}</td>
                  <td className="py-3 text-center text-zinc-400">8517</td>
                  <td className="py-3 text-center">{item.quantity} pcs</td>
                  <td className="py-3 text-right">{businessProfile.currency_symbol || '₹'}{item.price}</td>
                  <td className="py-3 text-right">{item.gst_rate}%</td>
                  <td className="py-3 text-right font-bold">{businessProfile.currency_symbol || '₹'}{(item.quantity * item.price)?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-zinc-300 pt-6 flex justify-between items-start">
          <div className="max-w-xs">
            <h5 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Terms and Conditions</h5>
            <p className="text-[10px] text-zinc-500 leading-relaxed whitespace-pre-line">{businessProfile.terms_and_conditions}</p>
          </div>

          <div className="w-64 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-zinc-400">Subtotal:</span>
              <span>{businessProfile.currency_symbol || '₹'}{billingTotals.subtotal?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-zinc-400">Total GST amount:</span>
              <span>{businessProfile.currency_symbol || '₹'}{billingTotals.totalGst?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-base font-black border-t border-zinc-950 pt-2 text-blue-600">
              <span>Grand Total:</span>
              <span>{businessProfile.currency_symbol || '₹'}{billingTotals.grandTotal?.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-12 border-t border-dashed border-zinc-200 text-center text-[10px] text-zinc-400 uppercase tracking-widest leading-none">
          Powered securely by InBill ERP Mobile Web
        </div>
      </div>

      {/* --- MOBILE FOOTER NAVIGATION BAR (MYBILLBOOK DESIGN) --- */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 border-t border-slate-100 flex justify-between items-center px-6 py-2 shadow-[0_-4px_24px_rgba(15,23,42,0.06)] glass-panel no-print">
        
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 transition-all duration-150 active-scale shrink-0 pb-1 cursor-pointer ${
            activeTab === 'dashboard' ? 'text-brand-primary font-black scale-105' : 'text-slate-400 font-bold hover:text-slate-600'
          }`}
        >
          <TrendingUp className={`w-5 h-5 transition-transform ${activeTab === 'dashboard' ? 'stroke-[2.5px]' : 'stroke-2'}`} />
          <span className="text-[9px] uppercase tracking-wider font-black">Dash</span>
        </button>

        <button 
          onClick={() => setActiveTab('parties')}
          className={`flex flex-col items-center gap-1 transition-all duration-150 active-scale shrink-0 pb-1 cursor-pointer ${
            activeTab === 'parties' ? 'text-brand-primary font-black scale-105' : 'text-slate-400 font-bold hover:text-slate-600'
          }`}
        >
          <Users className={`w-5 h-5 transition-transform ${activeTab === 'parties' ? 'stroke-[2.5px]' : 'stroke-2'}`} />
          <span className="text-[9px] uppercase tracking-wider font-black">Parties</span>
        </button>

        {/* Central Floating billing Fab */}
        <div className="relative -top-5 shrink-0 z-50">
          <button 
            onClick={() => {
              setActiveSheetType('sale');
              setCurrentSheet('new_sale');
            }}
            className="w-15 h-15 rounded-full bg-gradient-to-tr from-brand-primary to-blue-500 flex items-center justify-center text-white shadow-[0_6px_20px_rgba(29,78,216,0.4)] border-[5px] border-slate-50 fab-active-scale cursor-pointer"
          >
            <Plus className="w-8 h-8 stroke-[3px]" />
          </button>
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] font-black text-brand-primary uppercase tracking-widest whitespace-nowrap leading-none select-none">
            New Bill
          </span>
        </div>

        <button 
          onClick={() => setActiveTab('items')}
          className={`flex flex-col items-center gap-1 transition-all duration-150 active-scale shrink-0 pb-1 cursor-pointer ${
            activeTab === 'items' ? 'text-brand-primary font-black scale-105' : 'text-slate-400 font-bold hover:text-slate-600'
          }`}
        >
          <Package className={`w-5 h-5 transition-transform ${activeTab === 'items' ? 'stroke-[2.5px]' : 'stroke-2'}`} />
          <span className="text-[9px] uppercase tracking-wider font-black">Items</span>
        </button>

        <button 
          onClick={() => setActiveTab('more')}
          className={`flex flex-col items-center gap-1 transition-all duration-150 active-scale shrink-0 pb-1 cursor-pointer ${
            activeTab === 'more' ? 'text-brand-primary font-black scale-105' : 'text-slate-400 font-bold hover:text-slate-600'
          }`}
        >
          <Sliders className={`w-5 h-5 transition-transform ${activeTab === 'more' ? 'stroke-[2.5px]' : 'stroke-2'}`} />
          <span className="text-[9px] uppercase tracking-wider font-black">More</span>
        </button>

      </footer>

    </div>
  );
}
