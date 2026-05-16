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
    originalSubtotal: Number(data.originalSubtotal || subtotal + Number(data.totalDiscount || data.total_discount || 0))
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
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    margin: 0;
    background: #fff;
    color: #1f2937;
    font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 11px;
    line-height: 1.5;
  }
  .page {
    width: 210mm;
    min-height: 297mm;
    padding: 0;
    margin: 0 auto;
    background: #fff;
    position: relative;
  }
  .top-accent {
    height: 6px;
    background: #111827;
    width: 100%;
  }
  .content {
    padding: 50px;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 50px;
  }
  .logo-container {
    display: flex;
    align-items: center;
    gap: 20px;
  }
  .company-info h1 { 
    margin: 0; 
    font-size: 24px; 
    font-weight: 900; 
    color: #111827; 
    letter-spacing: -0.5px;
    text-transform: uppercase;
  }
  .company-info p { margin: 2px 0; color: #4b5563; font-size: 10px; }
  
  .invoice-meta {
    text-align: right;
  }
  .invoice-meta h2 { 
    margin: 0; 
    font-size: 32px; 
    font-weight: 900; 
    color: #111827; 
    line-height: 1;
    margin-bottom: 8px;
  }
  .meta-badge {
    display: inline-block;
    padding: 4px 12px;
    background: #f3f4f6;
    border-radius: 6px;
    font-weight: 800;
    color: #111827;
    font-size: 12px;
  }

  .billing-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 40px;
    margin-bottom: 40px;
    padding: 24px;
    background: #f9fafb;
    border-radius: 12px;
    border: 1px solid #f3f4f6;
  }
  .bill-box h3 { 
    margin: 0 0 10px; 
    font-size: 10px; 
    font-weight: 800; 
    color: #6b7280; 
    text-transform: uppercase; 
    letter-spacing: 0.5px;
  }
  .bill-box p { margin: 3px 0; font-size: 12px; font-weight: 600; }
  .bill-box .name { font-size: 15px; font-weight: 900; color: #111827; }

  table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
  thead th { 
    background: #111827; 
    color: #fff; 
    text-align: left; 
    padding: 14px 12px; 
    font-size: 10px; 
    text-transform: uppercase; 
    letter-spacing: 0.5px;
  }
  thead th:first-child { border-radius: 8px 0 0 8px; }
  thead th:last-child { border-radius: 0 8px 8px 0; }
  
  tbody td { 
    padding: 14px 12px; 
    border-bottom: 1px solid #f3f4f6; 
    vertical-align: top;
  }
  .item-name { font-weight: 700; color: #111827; font-size: 12px; }
  .item-sub { font-size: 9px; color: #6b7280; margin-top: 2px; }

  .summary-container {
    display: flex;
    justify-content: flex-end;
  }
  .summary-table { width: 280px; }
  .summary-row { 
    display: flex; 
    justify-content: space-between; 
    padding: 8px 0; 
    font-size: 12px;
    color: #4b5563;
  }
  .summary-row.total {
    margin-top: 12px;
    padding-top: 15px;
    border-top: 2px solid #111827;
    font-size: 20px;
    font-weight: 900;
    color: #111827;
  }

  .footer {
    position: absolute;
    bottom: 50px;
    left: 50px;
    right: 50px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    padding-top: 30px;
    border-top: 1px solid #f3f4f6;
  }
  .footer-info { max-width: 60%; }
  .footer-info p { margin: 2px 0; color: #6b7280; font-size: 9px; }
  .bank-details { margin-top: 10px; font-weight: 600; color: #374151; }
  
  .signature-box { text-align: center; }
  .sig-line { width: 160px; border-top: 2px solid #111827; margin-bottom: 8px; }
  .sig-text { font-size: 10px; font-weight: 900; color: #111827; text-transform: uppercase; }
`;
export const getInvoiceHTML = (data, profile = {}) => {
  const model = getInvoiceModel(data, profile);
  
  const rowsHtml = model.items.map((item) => {
    const qty = Number(item.quantity || 0);
    const price = getUnitPrice(item);
    const total = qty * price;
    
    return `
      <tr>
        <td>
          <div class="item-name">${escapeHtml(item.product_name || item.name)}</div>
          ${item.brand ? `<div class="item-sub">${escapeHtml(item.brand)}</div>` : ''}
          ${item.hsn_code ? `<div class="item-sub">HSN: ${escapeHtml(item.hsn_code)}</div>` : ''}
        </td>
        <td class="text-center" style="font-weight: 700;">${qty}</td>
        <td class="text-right">
          ${item.mrp > price ? `<div style="text-decoration: line-through; color: #9ca3af; font-size: 9px;">${model.currency}${formatMoney(item.mrp)}</div>` : ''}
          <div style="font-weight: 700;">${model.currency}${formatMoney(price)}</div>
        </td>
        <td class="text-right" style="font-weight: 800; color: #111827;">
          ${model.currency}${formatMoney(total)}
        </td>
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
          <div class="top-accent"></div>
          <div class="content">
            <div class="header">
              <div class="logo-container">
                ${profile.logo_path ? `
                  <img src="local-file://asset/?path=${encodeURIComponent(profile.logo_path)}" style="height: 70px; width: auto; object-fit: contain;" />
                ` : ''}
                <div class="company-info">
                  <h1>${escapeHtml(profile.business_name || 'INBILL ERP')}</h1>
                  <p>${companyAddress(profile)}</p>
                  <p>Phone: ${escapeHtml(profile.phone || '')} | Email: ${escapeHtml(profile.email || '')}</p>
                  ${model.gstEnabled && profile.gstin ? `<p style="font-weight: 800;">GSTIN: ${escapeHtml(profile.gstin)}</p>` : ''}
                </div>
              </div>
              <div class="invoice-meta">
                <h2>INVOICE</h2>
                <div class="meta-badge"># ${escapeHtml(model.invoiceNumber)}</div>
                <p style="margin-top: 10px; font-weight: 800; font-size: 11px;">Date: ${escapeHtml(model.date)}</p>
              </div>
            </div>
            
            <div class="billing-grid">
              <div class="bill-box">
                <h3>Billed To</h3>
                <p class="name">${escapeHtml(model.customerName)}</p>
                <p>${escapeHtml(model.customerPhone)}</p>
                <p style="color: #6b7280; font-size: 11px;">${escapeHtml(model.customerAddress)}</p>
              </div>
              <div class="bill-box" style="text-align: right;">
                <h3>Payment Status</h3>
                <p style="color: #111827; font-size: 14px; font-weight: 800;">${escapeHtml(model.paymentMode)}</p>
                
                ${(model.grandTotal - model.paidAmount) > 0.01 ? `
                  <p style="color: #991b1b; font-weight: 800; font-size: 12px; margin-top: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
                    Balance Due: ${model.currency}${formatMoney(model.grandTotal - model.paidAmount)}
                  </p>
                ` : ''}
              </div>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th style="width: 50%;">Item Description</th>
                  <th class="text-center" style="width: 10%;">Qty</th>
                  <th class="text-right" style="width: 20%;">Price</th>
                  <th class="text-right" style="width: 20%;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
            
            <div class="summary-container">
              <div class="summary-table">
                <div class="summary-row">
                  <span>Subtotal</span>
                  <span>${model.currency}${formatMoney(model.originalSubtotal || model.subtotal)}</span>
                </div>
                ${model.gstEnabled && model.totalGst > 0 ? `
                  <div class="summary-row">
                    <span>Tax (${profile.master_data?.tax_label || 'GST'})</span>
                    <span>${model.currency}${formatMoney(model.totalGst)}</span>
                  </div>
                ` : ''}
                ${model.totalDiscount > 0 ? `
                  <div class="summary-row" style="color: #059669; font-weight: bold;">
                    <span>Discount applied</span>
                    <span>-${model.currency}${formatMoney(model.totalDiscount)}</span>
                  </div>
                ` : ''}
                ${model.miscCharges > 0 ? `
                  <div class="summary-row">
                    <span>Other Charges</span>
                    <span>${model.currency}${formatMoney(model.miscCharges)}</span>
                  </div>
                ` : ''}
                <div class="summary-row total">
                  <span>Total</span>
                  <span>${model.currency}${formatMoney(model.grandTotal)}</span>
                </div>
              </div>
            </div>
            
            <div class="footer">
              <div class="footer-info">
                ${profile.bank_details ? `
                  <p style="font-weight: 800; color: #111827; font-size: 10px; margin-bottom: 5px;">BANK DETAILS</p>
                  <div class="bank-details">${escapeHtml(profile.bank_details)}</div>
                ` : ''}
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
};

