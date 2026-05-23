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
  <title>Downloading Invoice #${escapeHtml(sale.invoice_number)}</title>
  <style>
    body { background: #f8fafc; min-height: 100vh; }
    .page { margin: 0 auto; }
    #download-status {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 14px;
      padding: 24px;
      text-align: center;
      background: #f8fafc;
      color: #0f172a;
      font-family: 'Inter', sans-serif;
    }
    #download-status h1 {
      margin: 0;
      font-size: 22px;
      font-weight: 900;
      letter-spacing: -0.02em;
    }
    #download-status p {
      margin: 0;
      max-width: 360px;
      color: #64748b;
      font-size: 13px;
      font-weight: 700;
      line-height: 1.5;
    }
    #download-status button {
      min-height: 44px;
      padding: 0 18px;
      border: 0;
      border-radius: 12px;
      background: #0f766e;
      color: #ffffff;
      font-weight: 900;
      cursor: pointer;
    }
    .spinner {
      width: 42px;
      height: 42px;
      border-radius: 999px;
      border: 4px solid #ccfbf1;
      border-top-color: #0f766e;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media print {
      #download-status { display: none !important; }
    }
  </style>
</head>`
    );

    invoiceHTML = invoiceHTML.replace(
      '<body>',
      `<body>
  <div id="download-status">
    <div class="spinner" aria-hidden="true"></div>
    <h1>Downloading invoice PDF</h1>
    <p>Invoice #${escapeHtml(sale.invoice_number)} will download automatically. You can close this tab after the download starts.</p>
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

    function setStatus(title, message, retry) {
      var status = document.getElementById('download-status');
      if (!status) return;
      status.innerHTML =
        (retry ? '' : '<div class="spinner" aria-hidden="true"></div>') +
        '<h1>' + title + '</h1>' +
        '<p>' + message + '</p>' +
        (retry ? '<button type="button" onclick="downloadPDF()">Try download again</button>' : '');
    }

    async function downloadPDF() {
      var el = document.querySelector('.page');
      if (!el) {
        setStatus('Invoice not ready', 'Please refresh this link and try again.', true);
        return;
      }

      try {
        setStatus('Preparing invoice PDF', 'Please wait while your download starts automatically.', false);
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
        setStatus('PDF download started', 'Check your downloads folder for ' + invoicePdfFileName + '.', true);
      } catch (error) {
        console.error('Invoice PDF download failed:', error);
        setStatus('PDF download needs a retry', 'The browser could not start the download automatically. Tap below to try again.', true);
      }
    }

    window.addEventListener('load', function() {
      setTimeout(downloadPDF, 700);
    });
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
