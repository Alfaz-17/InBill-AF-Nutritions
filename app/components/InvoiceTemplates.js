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
    color: #111827;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 12px;
    line-height: 1.4;
  }
  .page {
    width: 210mm;
    min-height: 297mm;
    padding: 40px;
    margin: 0 auto;
    background: #fff;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 40px;
    padding-bottom: 20px;
    border-bottom: 2px solid #f3f4f6;
  }
  .company-info h1 { margin: 0; font-size: 28px; font-weight: 800; color: #111; }
  .company-info p { margin: 4px 0; color: #4b5563; }
  .invoice-details { text-align: right; }
  .invoice-details h2 { margin: 0; font-size: 24px; font-weight: 800; color: #111; }
  .invoice-details p { margin: 4px 0; font-weight: 600; }
  
  .billing-info {
    display: flex;
    justify-content: space-between;
    margin-bottom: 40px;
  }
  .bill-to h3 { margin: 0 0 8px; font-size: 12px; font-weight: 800; color: #9ca3af; text-transform: uppercase; }
  .bill-to p { margin: 2px 0; font-weight: 700; }
  
  table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
  th { background: #111827; color: #fff; text-align: left; padding: 12px; font-size: 11px; text-transform: uppercase; }
  td { padding: 12px; border-bottom: 1px solid #f3f4f6; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  
  .totals {
    margin-left: auto;
    width: 300px;
  }
  .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
  .total-row.grand-total {
    margin-top: 10px;
    padding-top: 15px;
    border-top: 2px solid #111;
    font-size: 18px;
    font-weight: 900;
  }
  
  .footer {
    margin-top: 60px;
    padding-top: 20px;
    border-top: 1px solid #f3f4f6;
    display: flex;
    justify-content: space-between;
  }
  .footer-note { max-width: 400px; font-size: 11px; color: #6b7280; }
  .signature { text-align: center; border-top: 1px solid #111; width: 150px; padding-top: 8px; font-weight: 800; }
`;

export const getInvoiceHTML = (data, profile = {}) => {
  const model = getInvoiceModel(data, profile);
  
  const rowsHtml = model.items.map((item) => {
    const qty = Number(item.quantity || 0);
    const price = getUnitPrice(item);
    const total = qty * price;
    
    return `
      <tr>
        <td style="font-weight: 800; color: #111;">
          ${escapeHtml(item.product_name || item.name)}
          ${item.brand ? `<div style="font-size: 10px; color: #6b7280; font-weight: normal;">${escapeHtml(item.brand)}</div>` : ''}
        </td>
        <td class="text-center font-bold">${qty}</td>
        <td class="text-right">
          ${item.mrp > price ? `<div style="text-decoration: line-through; color: #9ca3af; font-size: 10px;">${model.currency}${formatMoney(item.mrp)}</div>` : ''}
          ${model.currency}${formatMoney(price)}
        </td>
        <td class="text-right" style="font-weight: 800;">
          ${item.mrp > price ? `<div style="text-decoration: line-through; color: #9ca3af; font-size: 10px;">${model.currency}${formatMoney(item.mrp * qty)}</div>` : ''}
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
          <div class="header">
            <div style="display: flex; align-items: center; gap: 20px;">
              ${profile.logo_path ? `
                <img src="file://${profile.logo_path}" style="height: 60px; width: auto; object-fit: contain; border-radius: 8px;" />
              ` : ''}
              <div class="company-info">
                <h1 style="font-size: ${profile.logo_path ? '22px' : '28px'}">${escapeHtml(profile.business_name || 'INBILL ERP')}</h1>
                <p>${companyAddress(profile)}</p>
                <p>Phone: ${escapeHtml(profile.phone || '')}</p>
                ${model.gstEnabled && profile.gstin ? `<p>GSTIN: ${escapeHtml(profile.gstin)}</p>` : ''}
              </div>
            </div>
            <div class="invoice-details">
              <h2>INVOICE</h2>
              <p># ${escapeHtml(model.invoiceNumber)}</p>
              <p>Date: ${escapeHtml(model.date)}</p>
            </div>
          </div>
          
          <div class="billing-info">
            <div class="bill-to">
              <h3>Billed To</h3>
              <p>${escapeHtml(model.customerName)}</p>
              <p>${escapeHtml(model.customerPhone)}</p>
              <p>${escapeHtml(model.customerAddress)}</p>
            </div>
            <div class="invoice-details">
              <h3>Payment Mode</h3>
              <p>${escapeHtml(model.paymentMode)}</p>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th style="width: 50%;">Product Name</th>
                <th class="text-center" style="width: 15%;">Qty</th>
                <th class="text-right" style="width: 15%;">Price</th>
                <th class="text-right" style="width: 20%;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          
          <div class="totals">
            <div class="total-row">
              <span>Gross Total</span>
              <span>${model.currency}${formatMoney(model.originalSubtotal || model.subtotal)}</span>
            </div>
            ${model.gstEnabled && model.totalGst > 0 ? `
              <div class="total-row">
                <span>Tax</span>
                <span>${model.currency}${formatMoney(model.totalGst)}</span>
              </div>
            ` : ''}
            ${model.totalDiscount > 0 ? `
              <div class="total-row" style="color: #059669; font-weight: bold;">
                <span>Total Discount</span>
                <span>-${model.currency}${formatMoney(model.totalDiscount)}</span>
              </div>
            ` : ''}

            <div class="total-row grand-total">
              <span>Total</span>
              <span>${model.currency}${formatMoney(model.grandTotal)}</span>
            </div>
          </div>
          
          <div class="footer">
            <div class="footer-note">
              <p>${escapeHtml(profile.invoice_footer || 'Thank you for your business!')}</p>
              ${profile.bank_details ? `<p style="white-space:pre-line;">${escapeHtml(profile.bank_details)}</p>` : ''}
            </div>
            <div class="signature-area" style="margin-top: 40px;">
              <div class="signature"></div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
};
