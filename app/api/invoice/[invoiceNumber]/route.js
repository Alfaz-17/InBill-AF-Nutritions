export const dynamic = 'force-dynamic';

let dbInstance = null;

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

function getDB() {
  if (!dbInstance) {
    const path = require('path');
    process.env.INBILL_DB_PATH = process.env.INBILL_DB_PATH || path.join(process.cwd(), 'store.db');
    dbInstance = require('../../../../main/db.js');
    try {
      dbInstance.initDB();
    } catch (e) {
      console.error('DB init error in invoice route:', e);
    }
  }
  return dbInstance;
}

export async function GET(req, { params }) {
  try {
    const { invoiceNumber } = await params;
    const { saleOps, businessProfileOps } = getDB();

    const sale = await saleOps.getByInvoice(invoiceNumber);
    if (!sale) {
      return new Response(
        `<html><body style="font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#f8fafc;">
          <div style="text-align:center;">
            <h1 style="font-size:48px;font-weight:900;color:#e11d48;">404</h1>
            <p style="font-size:16px;color:#64748b;font-weight:700;">Invoice #${escapeHtml(invoiceNumber)} not found</p>
          </div>
        </body></html>`,
        { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    const profile = await businessProfileOps.get() || {};
    const { getInvoiceHTML } = require('../../../components/InvoiceTemplates.js');
    const invoiceFileName = `Invoice_${sale.invoice_number}.pdf`;

    const invoiceData = {
      invoiceNumber: sale.invoice_number,
      customer_name: sale.customer_name,
      customer_phone: sale.customer_phone,
      customer_address: sale.customer_address,
      date: new Date(sale.date).toLocaleDateString('en-IN'),
      cart: sale.items || [],
      subtotal: sale.subtotal || (sale.total_amount - (sale.total_gst || 0)),
      totalGst: sale.total_gst || 0,
      grandTotal: sale.total_amount,
      paidAmount: sale.paid_amount,
      dueAmount: sale.due_amount,
      paymentMode: sale.payment_mode,
      tax_mode: sale.tax_mode || 'inclusive',
    };

    let invoiceHTML = getInvoiceHTML(invoiceData, profile);

    invoiceHTML = invoiceHTML.replace(
      '</head>',
      `
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice #${escapeHtml(sale.invoice_number)} - ${escapeHtml(profile.business_name || 'InBill')}</title>
  <style>
    body { background: #e2e8f0; padding-bottom: 40px; }
    .page { box-shadow: 0 10px 40px rgba(0,0,0,0.1); margin-top: 20px; border-radius: 8px; overflow: hidden; }
    #no-print-toolbar {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(12px);
      padding: 12px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: white;
      font-family: 'Inter', sans-serif;
    }
    .toolbar-brand { display: flex; align-items: center; gap: 8px; }
    .toolbar-brand span { font-weight: 800; font-size: 14px; }
    .toolbar-actions { display: flex; gap: 8px; }
    .btn {
      padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 12px;
      cursor: pointer; border: none; transition: all 0.2s;
    }
    .btn-download { background: #4f46e5; color: white; }
    .btn-download:hover { background: #4338ca; }
    .btn-print { background: rgba(255,255,255,0.1); color: white; }
    .btn-print:hover { background: rgba(255,255,255,0.2); }
    @media (max-width: 640px) {
      body { padding-bottom: 20px; }
      .page { margin-top: 0; border-radius: 0; box-shadow: none; }
      #no-print-toolbar { align-items: flex-start; gap: 10px; padding: 10px; flex-direction: column; }
      .toolbar-actions { width: 100%; display: grid; grid-template-columns: 1fr 1fr; }
      .btn { width: 100%; padding: 10px 12px; }
    }
    @media print {
      #no-print-toolbar { display: none !important; }
      body { background: white; padding-bottom: 0; }
      .page { box-shadow: none; margin-top: 0; border-radius: 0; }
    }
  </style>
</head>`
    );

    invoiceHTML = invoiceHTML.replace(
      '<body>',
      `<body>
  <div id="no-print-toolbar">
    <div class="toolbar-brand">
      <span>${escapeHtml(profile.business_name || 'InBill')}</span>
      <span style="font-weight: 400; color: #94a3b8; font-size: 12px;">Invoice #${escapeHtml(sale.invoice_number)}</span>
    </div>
    <div class="toolbar-actions">
      <button class="btn btn-print" onclick="window.print()">Print</button>
      <button class="btn btn-download" id="downloadBtn" onclick="downloadPDF()">Download PDF</button>
    </div>
  </div>`
    );

    invoiceHTML = invoiceHTML.replace(
      '</body>',
      `
  <script>
    const invoicePdfFileName = ${JSON.stringify(invoiceFileName)};

    function loadHtml2Pdf() {
      return new Promise(function(resolve, reject) {
        if (window.html2pdf) {
          resolve(window.html2pdf);
          return;
        }

        var existing = document.querySelector('script[data-html2pdf-loader]');
        if (existing) {
          existing.addEventListener('load', function() {
            window.html2pdf ? resolve(window.html2pdf) : reject(new Error('PDF library unavailable'));
          }, { once: true });
          existing.addEventListener('error', function() {
            reject(new Error('PDF library failed to load'));
          }, { once: true });
          return;
        }

        var script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        script.crossOrigin = 'anonymous';
        script.dataset.html2pdfLoader = 'true';
        script.onload = function() {
          window.html2pdf ? resolve(window.html2pdf) : reject(new Error('PDF library unavailable'));
        };
        script.onerror = function() {
          reject(new Error('PDF library failed to load'));
        };
        document.head.appendChild(script);
      });
    }

    async function downloadPDF() {
      var btn = document.getElementById('downloadBtn');
      if (!btn || btn.disabled) return;
      btn.textContent = 'Generating...';
      btn.disabled = true;

      var el = document.querySelector('.page');
      if (!el) {
        btn.textContent = 'Download PDF';
        btn.disabled = false;
        window.print();
        return;
      }

      try {
        var html2pdf = await loadHtml2Pdf();
        await new Promise(function(resolve) { setTimeout(resolve, 500); });
        var opt = {
          margin: 0,
          filename: invoicePdfFileName,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 2.2,
            useCORS: true,
            logging: false,
            width: 794,
            windowWidth: 794
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        await html2pdf().from(el).set(opt).save();
      } catch (error) {
        console.error('Invoice PDF download failed:', error);
        window.print();
      } finally {
        btn.textContent = 'Download PDF';
        btn.disabled = false;
      }
    }
  </script>
</body>`
    );

    return new Response(invoiceHTML, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  } catch (error) {
    console.error('Invoice viewer error:', error);
    return new Response(
      `<html><body style="font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;">
        <div style="text-align:center;">
          <h1 style="color:#e11d48;">Error</h1>
          <p style="color:#64748b;">${escapeHtml(error.message)}</p>
        </div>
      </body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}
