'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/sonner";
import ToastProvider from './components/ToastProvider';

// Browser-compatible window.electronAPI Polyfill
if (typeof window !== 'undefined' && !window.electronAPI) {
  // Client-Side Crypto Helper using Web Crypto API (AES-GCM)
  const CRYPTO_PASS = 'inbill-local-web-aes-key-71089201';
  
  const getCryptoKey = async () => {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      enc.encode(CRYPTO_PASS),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"]
    );
    return window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: enc.encode("inbill-salt-9810"),
        iterations: 1000,
        hash: "SHA-256"
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  };

  const encryptVal = async (text) => {
    if (!text) return "";
    try {
      const key = await getCryptoKey();
      const enc = new TextEncoder();
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        enc.encode(text)
      );
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);
      return btoa(String.fromCharCode(...combined));
    } catch (e) {
      console.error("Local encryption failed:", e);
      return text;
    }
  };

  const decryptVal = async (cipherText) => {
    if (!cipherText) return "";
    try {
      const key = await getCryptoKey();
      const binaryString = atob(cipherText);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const iv = bytes.slice(0, 12);
      const data = bytes.slice(12);
      const decrypted = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        data
      );
      return new TextDecoder().decode(decrypted);
    } catch (e) {
      console.error("Local decryption failed:", e);
      return "";
    }
  };

  const invoke = async (channel, ...args) => {
    const headers = {
      'Content-Type': 'application/json',
    };

    try {
      const encNeon = localStorage.getItem('inbill_enc_neon_url');
      if (encNeon) {
        const decNeon = await decryptVal(encNeon);
        if (decNeon && (decNeon.startsWith('postgresql://') || decNeon.startsWith('postgres://'))) {
          headers['x-neon-url'] = decNeon;
        } else if (decNeon) {
          console.warn("⚠️ Malformed/invalid connection URL detected. Clearing from localStorage to self-heal:", decNeon);
          localStorage.removeItem('inbill_enc_neon_url');
        }
      }
    } catch (e) {}

    try {
      const encGemini = localStorage.getItem('inbill_enc_gemini_key');
      if (encGemini) {
        const decGemini = await decryptVal(encGemini);
        if (decGemini) headers['x-gemini-key'] = decGemini;
      }
    } catch (e) {}

    const res = await fetch('/api/db', {
      method: 'POST',
      headers,
      body: JSON.stringify({ channel, args }),
    });
    let responseText = '';
    try {
      responseText = await res.text();
    } catch (e) {
      throw new Error('Failed to read response text');
    }

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      throw new Error(responseText || `Server returned error status ${res.status}`);
    }

    if (!res.ok) {
      throw new Error(responseData?.error || responseData?.message || 'Database operation failed');
    }
    return responseData.result;
  };

  window.electronAPI = {
    products: {
      getAll: () => invoke('products:getAll'),
      getById: (id) => invoke('products:getById', id),
      search: (term) => invoke('products:search', term),
      add: (product) => invoke('products:add', product),
      update: (id, product) => invoke('products:update', id, product),
      delete: (id) => invoke('products:delete', id),
      lowStock: (threshold) => invoke('products:lowStock', threshold),
      expiring: (days) => invoke('products:expiring', days),
      getLastPrice: (name) => invoke('products:getLastPrice', name),
    },
    sales: {
      create: (data) => invoke('sales:create', data),
      getAll: () => invoke('sales:getAll'),
      getById: (id) => invoke('sales:getById', id),
      getByInvoice: (inv) => invoke('sales:getByInvoice', inv),
      getByDateRange: (from, to) => invoke('sales:getByDateRange', from, to),
      getToday: () => invoke('sales:getToday'),
    },
    purchases: {
      create: (data) => invoke('purchases:create', data),
      getAll: () => invoke('purchases:getAll'),
      getById: (id) => invoke('purchases:getById', id),
      delete: (id) => invoke('purchases:delete', id),
    },
    expenses: {
      getAll: () => invoke('expenses:getAll'),
      add: (data) => invoke('expenses:add', data),
      delete: (id) => invoke('expenses:delete', id),
    },
    stats: {
      dashboard: () => invoke('stats:dashboard'),
      getMonthly: () => invoke('stats:getMonthly'),
      getAiSnapshot: () => invoke('stats:getAiSnapshot'),
    },
    reports: {
      sales: (from, to) => invoke('reports:sales', from, to),
      purchases: (from, to) => invoke('reports:purchases', from, to),
      stock: () => invoke('reports:stock'),
    },
    returns: {
      createSaleReturn: (data) => invoke('returns:createSaleReturn', data),
      getAllSaleReturns: () => invoke('returns:getAllSaleReturns'),
      deleteSaleReturn: (id) => invoke('returns:deleteSaleReturn', id),
      createPurchaseReturn: (data) => invoke('returns:createPurchaseReturn', data),
      getAllPurchaseReturns: () => invoke('returns:getAllPurchaseReturns'),
      deletePurchaseReturn: (id) => invoke('returns:deletePurchaseReturn', id),
    },
    parties: {
      getAll: (type) => invoke('parties:getAll', type),
      getById: (id) => invoke('parties:getById', id),
      add: (data) => invoke('parties:add', data),
      update: (id, data) => invoke('parties:update', id, data),
      delete: (id) => invoke('parties:delete', id),
      updateBalance: (id, amount) => invoke('parties:updateBalance', id, amount),
      getLedger: (id) => invoke('parties:getLedger', id),
      recordPayment: (data) => invoke('parties:recordPayment', data),
    },
    ai: {
      selectFile: async () => {
        return new Promise((resolve) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*,application/pdf';
          input.onchange = async (e) => {
            const file = e.target.files?.[0];
            if (!file) {
              resolve(null);
              return;
            }
            const reader = new FileReader();
            reader.onload = () => {
              const base64 = reader.result.split(',')[1];
              resolve({
                base64,
                mimeType: file.type,
                fileName: file.name
              });
            };
            reader.readAsDataURL(file);
          };
          input.click();
        });
      },
      parseInvoice: (data) => invoke('ai:parseInvoice', data),
      printInvoice: async (html) => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 1000);
        return { success: true };
      },
      getInsights: (snapshot) => invoke('ai:getInsights', snapshot),
    },
    settings: {
      getGeminiKey: async () => {
        try {
          const encGemini = localStorage.getItem('inbill_enc_gemini_key');
          if (encGemini) {
            const decGemini = await decryptVal(encGemini);
            if (decGemini) {
              const masked = decGemini.substring(0, 6) + '•'.repeat(Math.max(0, decGemini.length - 10)) + decGemini.substring(decGemini.length - 4);
              return { configured: true, maskedKey: masked };
            }
          }
        } catch (e) {}
        return invoke('settings:getGeminiKey');
      },
      setGeminiKey: async (key) => {
        if (key && key.trim()) {
          const enc = await encryptVal(key.trim());
          localStorage.setItem('inbill_enc_gemini_key', enc);
        } else {
          localStorage.removeItem('inbill_enc_gemini_key');
        }
        return invoke('settings:setGeminiKey', key);
      },
      resetData: () => invoke('settings:resetData'),
      getNeonConfig: async () => {
        try {
          const encNeon = localStorage.getItem('inbill_enc_neon_url');
          if (encNeon) {
            const decNeon = await decryptVal(encNeon);
            if (decNeon) {
              return { url: decNeon, useCloud: true };
            }
          }
        } catch (e) {}
        return invoke('settings:getNeonConfig');
      },
      setNeonConfig: async (config) => {
        if (config && config.url && config.url.trim()) {
          const enc = await encryptVal(config.url.trim());
          localStorage.setItem('inbill_enc_neon_url', enc);
        } else {
          localStorage.removeItem('inbill_enc_neon_url');
        }
        return invoke('settings:setNeonConfig', config);
      },
      syncToCloud: () => invoke('settings:syncToCloud'),
    },
    mobile: {
      getConfig: () => invoke('mobile:getConfig'),
      generate: () => invoke('mobile:generate'),
      revoke: () => invoke('mobile:revoke'),
    },
    business: {
      getProfile: () => invoke('business:getProfile'),
      updateProfile: (data) => invoke('business:updateProfile', data),
      pickLogo: async () => {
        return new Promise((resolve) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/jpg,image/jpeg,image/png,image/webp';
          input.onchange = async (e) => {
            const file = e.target.files?.[0];
            if (!file) {
              resolve(null);
              return;
            }
            if (file.size > 5 * 1024 * 1024) {
              alert('Please select a logo smaller than 5MB.');
              resolve(null);
              return;
            }
            const reader = new FileReader();
            reader.onload = async () => {
              const base64 = reader.result.split(',')[1];
              const ext = file.name.substring(file.name.lastIndexOf('.'));
              const res = await fetch('/api/upload-logo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ base64, ext }),
              });
              const data = await res.json();
              resolve(data.filePath);
            };
            reader.readAsDataURL(file);
          };
          input.click();
        });
      },
    },
    categories: {
      getAll: () => invoke('categories:getAll'),
      add: (name) => invoke('categories:add', name),
      delete: (id) => invoke('categories:delete', id),
    },
    expenseCategories: {
      getAll: () => invoke('expenseCategories:getAll'),
      add: (name) => invoke('expenseCategories:add', name),
      delete: (id) => invoke('expenseCategories:delete', id),
    },
    attributes: {
      getAll: () => invoke('attributes:getAll'),
      add: (attr) => invoke('attributes:add', attr),
      delete: (id) => invoke('attributes:delete', id),
    },
    pdf: {
      generate: async (html) => {
        const base64HTML = btoa(unescape(encodeURIComponent(html)));
        return { success: true, buffer: base64HTML };
      },
      saveAs: async (base64HTML, name) => {
        const html = decodeURIComponent(escape(atob(base64HTML)));
        const loadHtml2Pdf = () => {
          return new Promise((resolve, reject) => {
            if (window.html2pdf) {
              resolve(window.html2pdf);
              return;
            }
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
            script.crossOrigin = 'anonymous';
            script.onload = () => {
              if (window.html2pdf) {
                resolve(window.html2pdf);
              } else {
                reject(new Error('html2pdf failed to load'));
              }
            };
            script.onerror = (err) => {
              reject(err);
            };
            document.head.appendChild(script);
          });
        };

        try {
          const html2pdf = await loadHtml2Pdf();

          // Preload the Google Font used in templates before capture
          const fontLink = document.createElement('link');
          fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
          fontLink.rel = 'stylesheet';
          document.head.appendChild(fontLink);
          await new Promise(r => setTimeout(r, 600));

          const opt = {
            margin:       0, // Template HTML already has 15mm padding built-in
            filename:     name || 'document.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { 
              scale: 2.2, 
              useCORS: true, 
              logging: false,
              width: 794,        // 210mm in pixels — exact A4 width
              windowWidth: 794   // Lock rendering viewport to match template
            },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
          };
          await html2pdf().from(html.trim()).set(opt).save();
          return { success: true };
        } catch (err) {
          console.error('Failed to generate PDF via html2pdf:', err);
          // Fallback to print window if CDN load fails
          const printWindow = window.open('', '_blank');
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
          }, 1000);
          return { success: true };
        }
      },
      saveDirect: async (base64HTML, name) => {
        // Direct save on mobile/web behaves the same as saveAs (triggers download dialog)
        return window.electronAPI.pdf.saveAs(base64HTML, name);
      },
      share: async (base64HTML) => {
        const html = decodeURIComponent(escape(atob(base64HTML)));
        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 1000);
        return { success: true };
      },
    },
    storage: {
      exportData: () => invoke('storage:export'),
      importData: () => invoke('storage:import'),
    },
    system: {
      checkUpdate: () => ({ success: false }),
    },
    auth: {
      check: () => invoke('auth:check'),
      verify: (password) => invoke('auth:verify', password),
      setPassword: (password) => invoke('auth:setPassword', password),
    },
    whatsapp: {
      sendMessage: (data) => invoke('whatsapp:sendMessage', data),
      sendInvoice: (data) => invoke('whatsapp:sendInvoice', data),
    },
  };
}

export default function Providers({ children }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  }));

  useEffect(() => {
    const handleWheel = (e) => {
      // If the currently focused element is a number input, blur it on scroll
      if (
        document.activeElement && 
        (document.activeElement.type === 'number' || 
         document.activeElement.tagName === 'INPUT' && document.activeElement.getAttribute('type') === 'number')
      ) {
        document.activeElement.blur();
      }
    };

    // Add listener to window with passive: true for scroll performance
    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </ToastProvider>
    </QueryClientProvider>
  );
}

