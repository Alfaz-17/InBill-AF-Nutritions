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

const formatMoney = (value) => Math.round(Number(value || 0)).toLocaleString('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

const getCurrency = (profile) => {
  const value = profile.currency_symbol;
  return value && !String(value).includes('Ã') ? value : 'Rs. ';
};

const getInvoiceNumber = (data) => data.invoiceNumber || data.invoice_number || '';
const getInvoiceDate = (data) => data.date || new Date().toLocaleDateString('en-IN');
const getUnitPrice = (item) => Number(item.selling_price ?? item.price ?? item.rate ?? 0);

const getInvoiceModel = (data, profile = {}) => {
  const masterData = safeJson(profile.master_data);
  const gstEnabled = masterData.gst_enabled !== false;
  const items = Array.isArray(data.cart) ? data.cart : [];
  const subtotal = Number(data.subtotal ?? items.reduce((sum, item) => sum + Number(item.quantity || 0) * getUnitPrice(item), 0));
  const totalGst = gstEnabled ? Number(data.totalGst ?? data.total_gst ?? 0) : 0;
  const miscCharges = Number(data.misc_charges || 0);
  const grandTotal = Number(data.grandTotal ?? data.total_amount ?? subtotal + totalGst + miscCharges);
  
  return {
    currency: getCurrency(profile),
    items,
    subtotal,
    totalGst,
    grandTotal,
    gstEnabled,
    miscCharges,
    invoiceNumber: getInvoiceNumber(data),
    date: getInvoiceDate(data),
    customerName: data.customer_name || 'Cash Customer',
    customerPhone: data.customer_phone || '',
    customerAddress: data.customer_address || '',
    paymentMode: data.paymentMode || data.payment_mode || 'Cash',
    paidAmount: Number(data.paidAmount || data.paid_amount || grandTotal),
    totalDiscount: Number(data.totalDiscount || data.total_discount || 0),
    originalSubtotal: Number(data.originalSubtotal || subtotal + Number(data.totalDiscount || data.total_discount || 0)),
    termsAndConditions: profile.terms_and_conditions || '',
    whatsappNumber: profile.whatsapp_number || '',
    instagramId: profile.instagram_id || '',
    panNumber: profile.pan_number || ''
  };
};

const companyAddress = (profile) => {
  const parts = [
    profile.address_line1,
    profile.address_line2,
    profile.city,
    profile.state,
    profile.pincode
  ].filter(Boolean);
  return parts.map(escapeHtml).join(', ');
};

const baseStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Outfit:wght@400;600;700;800;900&display=swap');
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    margin: 0;
    background: #fff;
    color: #000;
    font-family: 'Inter', sans-serif;
    font-size: 11px;
    line-height: 1.4;
  }
  .page {
    width: 210mm;
    min-height: 297mm;
    padding: 15mm;
    margin: 0 auto;
    background: #fff;
    position: relative;
    display: flex;
    flex-direction: column;
  }
  
  /* Decorative Accents */
  .page::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 8px;
    background: #000;
  }
  
  /* Modern Typography Helpers */
  .font-outfit { font-family: 'Outfit', sans-serif; }
  .uppercase { text-transform: uppercase; }
  .tracking-tight { letter-spacing: -0.02em; }
  .tracking-wide { letter-spacing: 0.05em; }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 30px;
    margin-bottom: 30px;
    border-bottom: 1px solid #eee;
  }
  
  .logo-section {
    display: flex;
    align-items: center;
    gap: 15px;
  }
  
  .brand-title {
    font-family: 'Outfit', sans-serif;
    font-size: 32px;
    font-weight: 900;
    line-height: 1;
    color: #000;
    letter-spacing: -0.03em;
  }
  
  .brand-tagline {
    font-size: 10px;
    font-weight: 500;
    color: #666;
    margin-top: 4px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  
  .invoice-label {
    text-align: right;
  }
  
  .invoice-label h1 {
    font-family: 'Outfit', sans-serif;
    font-size: 48px;
    font-weight: 900;
    margin: 0;
    line-height: 0.8;
    letter-spacing: -0.04em;
    color: #f3f4f6;
    position: relative;
    z-index: 0;
  }
  
  .invoice-label .inv-num {
    position: relative;
    z-index: 1;
    margin-top: -15px;
    font-weight: 900;
    font-size: 18px;
    color: #000;
  }
  
  .company-header-info {
    font-size: 10px;
    color: #444;
    margin-top: 8px;
    line-height: 1.5;
    font-weight: 500;
    max-width: 400px;
  }
  
  .billing-section {
    display: grid;
    grid-template-columns: 1fr;
    gap: 40px;
    margin-bottom: 30px;
  }
  
  .bill-to h3 {
    font-size: 9px;
    font-weight: 800;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 8px;
  }
  
  .customer-name {
    font-size: 18px;
    font-weight: 800;
    margin-bottom: 4px;
    color: #000;
    font-family: 'Outfit', sans-serif;
  }
  
  .customer-details {
    font-size: 11px;
    color: #444;
    line-height: 1.5;
  }

  /* Professional Table Layout */
  table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
  thead th {
    font-family: 'Outfit', sans-serif;
    background: #f8fafc;
    color: #475569;
    text-align: left;
    padding: 12px 15px;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    border-bottom: 2px solid #000;
  }
  
  tbody td {
    padding: 15px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
  }
  
  .item-name { font-weight: 800; font-size: 12px; color: #000; }
  .item-desc { font-size: 9px; color: #64748b; margin-top: 2px; font-weight: 500; }
  
  .summary-wrapper {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 40px;
    margin-top: 20px;
  }
  .extra-info {
    flex: 1;
  }

  .invoice-footer {
    display: grid;
    grid-template-columns: 1.5fr 1fr;
    gap: 40px;
    margin-top: 40px;
    padding-top: 20px;
    border-top: 2px solid #f1f5f9;
  }
  
  .terms-box {
    padding-right: 20px;
  }
  
  .terms-box h4 {
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
    color: #111827;
    margin-bottom: 8px;
    letter-spacing: 0.05em;
  }
  
  .terms-text {
    font-size: 9px;
    line-height: 1.6;
    color: #4b5563;
    white-space: pre-wrap;
  }
  
  .summary-box {
    background: #f8fafc;
    border-radius: 12px;
    padding: 16px;
  }
  
  .summary-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    font-size: 11px;
    color: #64748b;
  }
  
  .summary-row.total {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid #e2e8f0;
    font-size: 16px;
    font-weight: 900;
    color: #111827;
  }
  
  .footer-bottom {
    margin-top: 50px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-top: 1px solid #f1f5f9;
    padding-top: 20px;
  }

  .social-links {
    display: flex;
    gap: 15px;
  }

  .social-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #f1f5f9;
    padding: 6px 12px;
    border-radius: 100px;
    text-decoration: none;
  }

  .social-badge span:first-child {
    width: 20px;
    height: 20px;
    background: #111827;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 8px;
    font-weight: 900;
  }

  .social-badge span:last-child {
    font-size: 10px;
    font-weight: 700;
    color: #334155;
  }
  
  .text-right { text-align: right; }
  .text-center { text-align: center; }
`;

export const getInvoiceHTML = (data, profile = {}) => {
  const model = getInvoiceModel(data, profile);
  
  const rowsHtml = model.items.map((item, index) => {
    const qty = Number(item.quantity || 0);
    const price = getUnitPrice(item);
    const total = qty * price;
    
    return `
      <tr>
        <td style="width: 40px; color: #94a3b8; font-weight: 800;">${String(index + 1).padStart(2, '0')}</td>
        <td>
          <div class="item-name">${escapeHtml(item.product_name || item.name)}</div>
          <div class="item-desc">
            ${item.brand ? `<span>${escapeHtml(item.brand)}</span>` : ''}
            ${item.product_size ? `<span> | ${escapeHtml(item.product_size)}</span>` : ''}
            ${item.hsn_code ? `<span> | HSN: ${escapeHtml(item.hsn_code)}</span>` : ''}
          </div>
        </td>
        <td class="text-center" style="font-weight: 700;">${qty} ${escapeHtml(item.unit || 'pcs')}</td>
        <td class="text-right" style="font-weight: 700;">${model.currency}${formatMoney(price)}</td>
        <td class="text-right" style="font-weight: 800; color: #000;">${model.currency}${formatMoney(total)}</td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>${baseStyles}</style>
      </head>
      <body>
        <div class="page">
          <header class="header">
            <div class="logo-section">
              ${profile.logo_path ? `
                <img src="local-file://asset/?path=${encodeURIComponent(profile.logo_path)}" style="height: 80px; width: auto; margin-bottom: 5px; border-radius: 8px;" />
              ` : ''}
              <div>
                <div class="brand-title">${escapeHtml(profile.business_name || 'INBILL ERP')}</div>
                <div class="brand-tagline">${escapeHtml(profile.tagline || 'Excellence in Commerce')}</div>
                <div class="company-header-info">
                  <div>${companyAddress(profile)}</div>
                  <div>
                    ${model.whatsappNumber ? `WhatsApp: +${escapeHtml(model.whatsappNumber)}` : (profile.phone ? `Ph: ${escapeHtml(profile.phone)}` : '')}
                    ${profile.email ? ` | ${escapeHtml(profile.email)}` : ''}
                  </div>
                  <div style="display: flex; gap: 10px; margin-top: 4px;">
                    ${model.gstEnabled && profile.gstin ? `<div style="font-weight: 800; color: #000;">GSTIN: ${escapeHtml(profile.gstin)}</div>` : ''}
                    ${model.panNumber ? `<div style="font-weight: 800; color: #000;">PAN: ${escapeHtml(model.panNumber)}</div>` : ''}
                  </div>
                </div>
              </div>
            </div>
            <div class="invoice-label">
              <h1>INVOICE</h1>
              <div class="inv-num">#${escapeHtml(model.invoiceNumber)}</div>
              <div style="font-size: 10px; color: #64748b; font-weight: 800; margin-top: 10px; text-transform: uppercase; letter-spacing: 0.1em;">
                Date: ${escapeHtml(model.date)}
              </div>
            </div>
          </header>

          <div class="billing-section">
            <div class="bill-to">
              <h3>Billed To</h3>
              <div class="customer-name">${escapeHtml(model.customerName)}</div>
              <div class="customer-details">
                ${model.customerPhone ? `<div>Ph: ${escapeHtml(model.customerPhone)}</div>` : ''}
                ${model.customerAddress ? `<div>${escapeHtml(model.customerAddress)}</div>` : ''}
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40px;">#</th>
                <th style="width: 50%;">Description</th>
                <th class="text-center">Qty</th>
                <th class="text-right">Price</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="invoice-footer">
            <div class="terms-box">
              ${model.termsAndConditions ? `
                <h4>Terms & Conditions</h4>
                <div class="terms-text">${escapeHtml(model.termsAndConditions)}</div>
              ` : ''}
            </div>
            
            <div class="summary-box">
              <div class="summary-row">
                <span>Subtotal</span>
                <span>${model.currency}${model.subtotal.toLocaleString()}</span>
              </div>
              ${model.gstEnabled ? `
                <div class="summary-row">
                  <span>Tax (${model.taxLabel})</span>
                  <span>${model.currency}${model.totalGst.toLocaleString()}</span>
                </div>
              ` : ''}
              <div class="summary-row">
                <span>Discount</span>
                <span style="color: #10b981;">-${model.currency}${model.totalDiscount.toLocaleString()}</span>
              </div>
              <div class="summary-row total">
                <span>Total Amount</span>
                <span>${model.currency}${model.grandTotal.toLocaleString()}</span>
              </div>
              <div style="font-size: 9px; color: #94a3b8; text-align: right; margin-top: 10px; font-weight: 700;">
                All prices are in ${model.currency}
              </div>
            </div>
          </div>

          <div class="footer-bottom">
            <div class="social-links">
              ${model.whatsappNumber ? `
                <div class="social-badge">
                  <span>WA</span>
                  <span>+${escapeHtml(model.whatsappNumber)}</span>
                </div>
              ` : ''}
              ${model.instagramId ? `
                <div class="social-badge">
                  <span>IG</span>
                  <span>@${escapeHtml(model.instagramId)}</span>
                </div>
              ` : ''}
            </div>
            <div style="text-align: right;">
              <div style="font-size: 10px; font-weight: 900; color: #111827;">Thank You!</div>
              <div style="font-size: 8px; color: #64748b;">Visit us again soon</div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
};
