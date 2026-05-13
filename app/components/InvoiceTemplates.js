const safeJson = (value, fallback = {}) => {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const formatMoney = (value) => Number(value || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const compactText = (parts) => parts.filter(Boolean).map(escapeHtml).join(', ');

export const getInvoiceHTML = (data, profile = {}) => {
  const settings = safeJson(profile.invoice_settings);
  const hasPrintedTemplate = settings.letterheadMode === true;
  const topMargin = hasPrintedTemplate ? `${parseInt(settings.topMargin, 10) || 150}px` : '0px';
  const accent = settings.accentColor || '#1e293b';
  const currency = profile.currency_symbol && profile.currency_symbol !== 'â‚¹' ? profile.currency_symbol : 'Rs. ';
  const taxLabel = safeJson(profile.master_data).tax_label || 'GST';

  const items = Array.isArray(data.cart) ? data.cart : [];
  const itemCount = items.length;
  const manualDensity = settings.density || 'standard';
  const density = itemCount > 12 ? 'micro' : itemCount > 8 && manualDensity !== 'relaxed' ? 'compact' : manualDensity;
  const showSNo = settings.showSNo !== false;
  const showHsn = settings.showHsn !== false;
  const showUnit = settings.showUnit !== false;
  const showBrand = settings.showBrand !== false;
  const showSku = settings.showSku === true;
  const showGstDetail = settings.showGstDetail !== false;
  const showSignature = settings.showSignature !== false && !hasPrintedTemplate;
  const visibleAttrs = Array.isArray(settings.visibleAttributes) ? settings.visibleAttributes : [];

  const getUnitPrice = (item) => Number(item.selling_price ?? item.price ?? item.rate ?? 0);
  const subtotal = Number(data.subtotal ?? items.reduce((sum, item) => sum + Number(item.quantity || 0) * getUnitPrice(item), 0));
  const totalGst = Number(data.totalGst ?? 0);
  const grandTotal = Number(data.grandTotal ?? subtotal + totalGst);
  const paidAmount = Number(data.paidAmount ?? data.paid_amount ?? grandTotal);
  const dueAmount = Math.max(0, Number(data.dueAmount ?? data.due_amount ?? grandTotal - paidAmount));

  const rowPadding = density === 'micro' ? '5px 7px' : density === 'compact' ? '7px 8px' : '9px 10px';
  const rowFont = density === 'micro' ? '9px' : density === 'compact' ? '10px' : '11px';
  const specColumns = density === 'micro' ? 4 : 3;

  const renderAddress = () => {
    const line = compactText([
      profile.address_line1,
      profile.address_line2,
      profile.city,
      profile.state,
      profile.pincode
    ]);

    return `
      ${line ? `<div>${line}</div>` : ''}
      ${profile.phone ? `<div>Phone: ${escapeHtml(profile.phone)}</div>` : ''}
      ${profile.email ? `<div>Email: ${escapeHtml(profile.email)}</div>` : ''}
      ${profile.gstin ? `<div class="strong">GSTIN: ${escapeHtml(profile.gstin)}</div>` : ''}
    `;
  };

  const renderItemDetails = (item) => {
    const attrs = safeJson(item.custom_fields);
    const attrEntries = visibleAttrs.length > 0
      ? visibleAttrs.map((key) => [key, attrs[key]]).filter(([, value]) => value !== undefined && value !== null && value !== '')
      : Object.entries(attrs).filter(([, value]) => value !== undefined && value !== null && value !== '');

    const secondary = [
      showBrand && item.brand ? `Brand: ${item.brand}` : '',
      item.product_size ? `Size: ${item.product_size}` : '',
      showSku && item.barcode ? `SKU: ${item.barcode}` : '',
      item.batch_number ? `Batch: ${item.batch_number}` : '',
      item.expiry_date ? `Exp: ${item.expiry_date}` : ''
    ].filter(Boolean);

    return `
      <div class="product-name">${escapeHtml(item.product_name || item.name || 'Product')}</div>
      ${secondary.length ? `<div class="product-meta">${secondary.map(escapeHtml).join(' | ')}</div>` : ''}
      ${attrEntries.length ? `
        <div class="spec-grid">
          ${attrEntries.map(([key, value]) => `
            <div class="spec-item">
              <span>${escapeHtml(key)}:</span> ${escapeHtml(value)}
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;
  };

  const renderTable = () => `
    <table class="product-table">
      <thead>
        <tr>
          ${showSNo ? '<th class="center col-sno">#</th>' : ''}
          <th class="left">Product Information</th>
          ${showHsn ? '<th class="center col-hsn">HSN/SAC</th>' : ''}
          ${showUnit ? '<th class="center col-unit">Unit</th>' : ''}
          <th class="center col-qty">Qty</th>
          <th class="right col-rate">Rate</th>
          ${showGstDetail ? `<th class="right col-tax">${escapeHtml(taxLabel)}</th>` : ''}
          <th class="right col-amount">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item, index) => {
          const quantity = Number(item.quantity || 0);
          const rate = getUnitPrice(item);
          const gstAmount = Number(item.gst_amount ?? ((rate * quantity * Number(item.gst_rate || 0)) / 100));
          const amount = Number(item.total_price ?? (quantity * rate + gstAmount));

          return `
            <tr>
              ${showSNo ? `<td class="center muted">${index + 1}</td>` : ''}
              <td>${renderItemDetails(item)}</td>
              ${showHsn ? `<td class="center muted">${escapeHtml(item.hsn_code || item.hsn || '-')}</td>` : ''}
              ${showUnit ? `<td class="center muted">${escapeHtml(item.unit || 'pcs')}</td>` : ''}
              <td class="center strong">${formatMoney(quantity).replace('.00', '')}</td>
              <td class="right">${formatMoney(rate)}</td>
              ${showGstDetail ? `<td class="right muted">${formatMoney(gstAmount)}</td>` : ''}
              <td class="right strong">${formatMoney(amount)}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;

  const renderTotals = () => {
    const splitTax = settings.gstStyle === 'split';
    return `
      <div class="totals-card">
        <div class="total-row"><span>Subtotal</span><strong>${escapeHtml(currency)}${formatMoney(subtotal)}</strong></div>
        ${showGstDetail && totalGst > 0 ? (
          splitTax ? `
            <div class="total-row"><span>CGST</span><strong>${escapeHtml(currency)}${formatMoney(totalGst / 2)}</strong></div>
            <div class="total-row"><span>SGST</span><strong>${escapeHtml(currency)}${formatMoney(totalGst / 2)}</strong></div>
          ` : `<div class="total-row"><span>${escapeHtml(taxLabel)}</span><strong>${escapeHtml(currency)}${formatMoney(totalGst)}</strong></div>`
        ) : ''}
        <div class="total-row grand"><span>Grand Total</span><strong>${escapeHtml(currency)}${formatMoney(grandTotal)}</strong></div>
        ${dueAmount > 0 ? `<div class="total-row due"><span>Balance Due</span><strong>${escapeHtml(currency)}${formatMoney(dueAmount)}</strong></div>` : ''}
      </div>
    `;
  };

  const styles = `
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
      margin: 0;
      background: #eef2f7;
      color: #111827;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      line-height: 1.35;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      max-height: 297mm;
      margin: 12px auto;
      background: #fff;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 16px 40px rgba(15, 23, 42, 0.12);
    }
    .template-spacer { height: ${topMargin}; flex: 0 0 auto; }
    .full-header {
      padding: 28px 34px 18px;
      border-bottom: 2px solid ${accent};
      display: grid;
      grid-template-columns: 1fr 190px;
      gap: 24px;
      align-items: start;
    }
    .brand-row { display: flex; gap: 14px; align-items: flex-start; }
    .logo { max-width: 58px; max-height: 58px; object-fit: contain; }
    .business-name {
      margin: 0 0 5px;
      color: ${accent};
      font-size: 24px;
      font-weight: 800;
      line-height: 1.1;
    }
    .business-meta, .customer-meta, .note { color: #475569; font-size: 10px; }
    .strong { font-weight: 700; color: #111827; }
    .invoice-title { text-align: right; }
    .invoice-title h1 {
      margin: 0;
      color: #cbd5e1;
      font-size: 34px;
      font-weight: 900;
      letter-spacing: 0;
    }
    .invoice-title p { margin: 4px 0 0; color: ${accent}; font-size: 13px; font-weight: 800; }
    .content {
      flex: 1 1 auto;
      min-height: 0;
      padding: ${hasPrintedTemplate ? '0 32px 18px' : '18px 34px'};
      display: flex;
      flex-direction: column;
    }
    .template-strip {
      border-bottom: 1px solid #e2e8f0;
      padding: 0 0 10px;
      margin-bottom: 10px;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 16px;
      align-items: end;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1.25fr 0.75fr;
      gap: 18px;
      margin-bottom: 14px;
    }
    .meta-box {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 12px;
      min-height: 70px;
    }
    .label {
      margin: 0 0 5px;
      color: #64748b;
      font-size: 8px;
      font-weight: 800;
      text-transform: uppercase;
    }
    .customer-name { margin: 0; font-size: 15px; font-weight: 800; }
    .product-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      border: 1px solid #dbe3ef;
    }
    .product-table th {
      background: ${accent};
      color: #fff;
      padding: 7px 7px;
      font-size: 8px;
      font-weight: 800;
      text-transform: uppercase;
      border: 1px solid ${accent};
      letter-spacing: 0;
    }
    .product-table td {
      padding: ${rowPadding};
      border: 1px solid #e5eaf2;
      vertical-align: top;
      font-size: ${rowFont};
      overflow-wrap: anywhere;
    }
    .left { text-align: left; }
    .center { text-align: center; }
    .right { text-align: right; }
    .muted { color: #64748b; }
    .product-name { font-weight: 800; color: #111827; line-height: 1.2; }
    .product-meta { margin-top: 2px; color: #64748b; font-size: 8.5px; font-weight: 700; }
    .spec-grid {
      display: grid;
      grid-template-columns: repeat(${specColumns}, minmax(0, 1fr));
      gap: 2px 6px;
      margin-top: 4px;
      padding: 4px 6px;
      background: #f8fafc;
      border: 1px solid #edf2f7;
      border-radius: 4px;
    }
    .spec-item { font-size: 8px; color: #334155; line-height: 1.2; }
    .spec-item span { color: #64748b; font-weight: 800; text-transform: uppercase; }
    .col-sno { width: 30px; }
    .col-hsn { width: 58px; }
    .col-unit { width: 45px; }
    .col-qty { width: 44px; }
    .col-rate { width: 72px; }
    .col-tax { width: 66px; }
    .col-amount { width: 82px; }
    .footer-area {
      margin-top: auto;
      padding-top: 14px;
      display: grid;
      grid-template-columns: 1fr 250px;
      gap: 22px;
      align-items: start;
    }
    .terms {
      color: #475569;
      font-size: 9.5px;
      line-height: 1.45;
    }
    .terms p { margin: 0 0 8px; }
    .totals-card {
      border: 1px solid #dbe3ef;
      border-radius: 6px;
      overflow: hidden;
      background: #fff;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      gap: 14px;
      padding: 7px 10px;
      border-bottom: 1px solid #edf2f7;
      color: #475569;
      font-size: 10px;
    }
    .total-row.grand {
      background: ${accent};
      color: #fff;
      font-size: 14px;
      font-weight: 900;
      border-bottom: 0;
    }
    .total-row.due { color: #b91c1c; }
    .signature {
      padding: 16px 34px 24px;
      display: flex;
      justify-content: space-between;
      align-items: end;
      gap: 20px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
    }
    .sig-line {
      width: 180px;
      padding-top: 38px;
      border-top: 1px solid #111827;
      text-align: center;
      font-size: 9px;
      font-weight: 800;
    }
    @media print {
      body { background: #fff; }
      .page { margin: 0; width: 210mm; height: 297mm; min-height: 297mm; max-height: 297mm; box-shadow: none; }
    }
  `;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>${styles}</style>
      </head>
      <body>
        <main class="page">
          ${hasPrintedTemplate ? `<div class="template-spacer"></div>` : `
            <header class="full-header">
              <div class="brand-row">
                ${settings.showLogo !== false && profile.logo_path ? `<img class="logo" src="file://${escapeHtml(profile.logo_path)}" />` : ''}
                <div>
                  <h2 class="business-name">${escapeHtml(profile.business_name || 'Business Name')}</h2>
                  <div class="business-meta">${renderAddress()}</div>
                </div>
              </div>
              <div class="invoice-title">
                <h1>INVOICE</h1>
                <p>#${escapeHtml(data.invoiceNumber || data.invoice_number || '')}</p>
                <div class="business-meta">Date: ${escapeHtml(data.date || new Date().toLocaleDateString('en-IN'))}</div>
              </div>
            </header>
          `}

          <section class="content">
            ${hasPrintedTemplate ? `
              <div class="template-strip">
                <div>
                  <p class="label">Bill To</p>
                  <p class="customer-name">${escapeHtml(data.customer_name || 'Cash Customer')}</p>
                  <div class="customer-meta">
                    ${data.customer_phone ? `<div>${escapeHtml(data.customer_phone)}</div>` : ''}
                    ${data.customer_address ? `<div>${escapeHtml(data.customer_address)}</div>` : ''}
                  </div>
                </div>
                <div class="right">
                  <p class="label">Invoice Details</p>
                  <div class="strong">#${escapeHtml(data.invoiceNumber || data.invoice_number || '')}</div>
                  <div class="customer-meta">${escapeHtml(data.date || new Date().toLocaleDateString('en-IN'))}</div>
                </div>
              </div>
            ` : `
              <div class="meta-grid">
                <div class="meta-box">
                  <p class="label">Billed To</p>
                  <p class="customer-name">${escapeHtml(data.customer_name || 'Cash Customer')}</p>
                  <div class="customer-meta">
                    ${data.customer_phone ? `<div>${escapeHtml(data.customer_phone)}</div>` : ''}
                    ${data.customer_address ? `<div>${escapeHtml(data.customer_address)}</div>` : ''}
                  </div>
                </div>
                <div class="meta-box">
                  <p class="label">Payment</p>
                  <div><span class="muted">Mode:</span> <span class="strong">${escapeHtml(data.paymentMode || data.payment_mode || 'Cash')}</span></div>
                  <div><span class="muted">Status:</span> <span class="strong">${dueAmount > 0 ? 'Part Paid' : 'Paid'}</span></div>
                </div>
              </div>
            `}

            ${renderTable()}

            <div class="footer-area">
              <div class="terms">
                ${!hasPrintedTemplate ? `
                  <p class="label">Terms & Notes</p>
                  <p>${escapeHtml(profile.invoice_footer || 'Thank you for your business!')}</p>
                  ${profile.bank_details ? `
                    <p class="label">Bank Details</p>
                    <p style="white-space: pre-line;">${escapeHtml(profile.bank_details)}</p>
                  ` : ''}
                ` : `<p class="note">Items, quantities, rates, taxes and totals printed for your existing invoice template.</p>`}
              </div>
              ${renderTotals()}
            </div>
          </section>

          ${showSignature ? `
            <footer class="signature">
              <div class="note">This is a computer generated invoice.</div>
              <div class="sig-line">Authorized Signatory<br />${escapeHtml(profile.business_name || '')}</div>
            </footer>
          ` : ''}
        </main>
      </body>
    </html>
  `;
};
