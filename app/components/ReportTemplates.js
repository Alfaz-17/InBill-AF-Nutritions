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

export const getSalesReportHTML = (data, profile, fromDate, toDate) => {
  const currency = profile.currency_symbol || '₹';
  const sales = data.sales || [];
  const summary = data.summary || {};
  
  const rowsHtml = sales.map(s => `
    <tr>
      <td>${new Date(s.date).toLocaleDateString('en-IN')}</td>
      <td>${escapeHtml(s.invoice_number)}</td>
      <td>${escapeHtml(s.customer_name || 'Counter Sale')}</td>
      <td class="text-right">${currency}${formatMoney(s.total_amount)}</td>
      <td class="text-center">${s.payment_mode}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          @page { size: A4; margin: 20mm; }
          body { font-family: 'Segoe UI', sans-serif; font-size: 11px; color: #1f2937; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #111827; padding-bottom: 20px; }
          .company-info h1 { margin: 0; font-size: 24px; font-weight: 900; }
          .report-title { text-align: right; }
          .report-title h2 { margin: 0; font-size: 20px; color: #4b5563; }
          
          .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
          .metric-box { padding: 15px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; }
          .metric-label { font-size: 9px; font-weight: 800; color: #6b7280; text-transform: uppercase; margin-bottom: 5px; }
          .metric-value { font-size: 16px; font-weight: 900; color: #111827; }
          .metric-value.profit { color: #059669; }

          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { background: #111827; color: #fff; text-align: left; padding: 10px; font-size: 9px; text-transform: uppercase; }
          td { padding: 10px; border-bottom: 1px solid #f3f4f6; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          
          .footer { margin-top: 50px; text-align: center; color: #9ca3af; font-size: 9px; border-top: 1px solid #f3f4f6; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-info">
            <h1>${escapeHtml(profile.business_name || 'INBILL ERP')}</h1>
            <p>${escapeHtml(profile.phone || '')} | ${escapeHtml(profile.email || '')}</p>
          </div>
          <div class="report-title">
            <h2>SALES REPORT</h2>
            <p>Period: ${fromDate} to ${toDate}</p>
          </div>
        </div>

        <div class="metrics">
          <div class="metric-box">
            <div class="metric-label">Total Revenue</div>
            <div class="metric-value">${currency}${formatMoney(summary.total)}</div>
          </div>
          <div class="metric-box">
            <div class="metric-label">Transactions</div>
            <div class="metric-value">${summary.count}</div>
          </div>
          <div class="metric-box">
            <div class="metric-label">Cash Received</div>
            <div class="metric-value">${currency}${formatMoney(summary.cash_received)}</div>
          </div>
          <div class="metric-box">
            <div class="metric-label">Net Profit</div>
            <div class="metric-value profit">${currency}${formatMoney(summary.profit)}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Invoice #</th>
              <th>Customer</th>
              <th class="text-right">Amount</th>
              <th class="text-center">Method</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div style="margin-left: auto; width: 300px; padding: 20px; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb; margin-bottom: 30px;">
          <h3 style="margin: 0 0 15px; font-size: 12px; font-weight: 900; color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; text-transform: uppercase;">Profit Calculation Breakdown</h3>
          <div style="display: flex; justify-content: space-between; padding: 5px 0; font-weight: 700;">
            <span>Gross Sales Margin</span>
            <span>${currency}${formatMoney(summary.gross_margin)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 5px 0; color: #991b1b; font-weight: 700;">
            <span>Operating Expenses</span>
            <span>- ${currency}${formatMoney(summary.expenses)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 15px 0 5px; margin-top: 10px; border-top: 2px solid #111827; font-size: 16px; font-weight: 900; color: #059669;">
            <span>Calculated Net Profit</span>
            <span>${currency}${formatMoney(summary.profit)}</span>
          </div>
        </div>

        <div class="footer">
          Generated on ${new Date().toLocaleString('en-IN')} | Powered by InBill ERP
        </div>
      </body>
    </html>
  `;
};

export const getStockReportHTML = (data, profile) => {
  const currency = profile.currency_symbol || '₹';
  const totalCost = data.reduce((sum, p) => sum + (p.quantity * (p.cost_price || 0)), 0);
  const totalValue = data.reduce((sum, p) => sum + (p.quantity * (p.selling_price || 0)), 0);

  const rowsHtml = data.map(p => `
    <tr>
      <td>
        <div style="font-weight: 700;">${escapeHtml(p.product_name)}</div>
        <div style="font-size: 8px; color: #6b7280;">${escapeHtml(p.brand)}</div>
      </td>
      <td>${escapeHtml(p.category || 'General')}</td>
      <td class="text-center" style="font-weight: 800;">${p.quantity}</td>
      <td class="text-right">${currency}${formatMoney(p.cost_price)}</td>
      <td class="text-right">${currency}${formatMoney(p.selling_price)}</td>
      <td class="text-right" style="font-weight: 700;">${currency}${formatMoney(p.quantity * p.selling_price)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          @page { size: A4; margin: 20mm; }
          body { font-family: 'Segoe UI', sans-serif; font-size: 11px; color: #1f2937; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #111827; padding-bottom: 20px; }
          .company-info h1 { margin: 0; font-size: 24px; font-weight: 900; }
          .report-title { text-align: right; }
          .report-title h2 { margin: 0; font-size: 20px; color: #4b5563; }
          
          .metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
          .metric-box { padding: 15px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; }
          .metric-label { font-size: 9px; font-weight: 800; color: #6b7280; text-transform: uppercase; margin-bottom: 5px; }
          .metric-value { font-size: 18px; font-weight: 900; color: #111827; }

          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { background: #111827; color: #fff; text-align: left; padding: 10px; font-size: 9px; text-transform: uppercase; }
          td { padding: 10px; border-bottom: 1px solid #f3f4f6; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          
          .footer { margin-top: 50px; text-align: center; color: #9ca3af; font-size: 9px; border-top: 1px solid #f3f4f6; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-info">
            <h1>${escapeHtml(profile.business_name || 'INBILL ERP')}</h1>
          </div>
          <div class="report-title">
            <h2>INVENTORY VALUATION</h2>
            <p>Date: ${new Date().toLocaleDateString('en-IN')}</p>
          </div>
        </div>

        <div class="metrics">
          <div class="metric-box">
            <div class="metric-label">Total Stock Value (Cost)</div>
            <div class="metric-value">${currency}${formatMoney(totalCost)}</div>
          </div>
          <div class="metric-box">
            <div class="metric-label">Potential Revenue (Sale)</div>
            <div class="metric-value">${currency}${formatMoney(totalValue)}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th class="text-center">Qty</th>
              <th class="text-right">Cost</th>
              <th class="text-right">Sale Price</th>
              <th class="text-right">Valuation</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          Generated on ${new Date().toLocaleString('en-IN')} | Powered by InBill ERP
        </div>
      </body>
    </html>
  `;
};

export const getPurchaseReportHTML = (data, profile, fromDate, toDate) => {
  const currency = profile.currency_symbol || '₹';
  const purchases = data.purchases || [];
  const summary = data.summary || {};
  
  const rowsHtml = purchases.map(p => `
    <tr>
      <td>${new Date(p.date).toLocaleDateString('en-IN')}</td>
      <td>${escapeHtml(p.supplier_name || 'Generic Vendor')}</td>
      <td class="text-right" style="color: #991b1b; font-weight: 700;">${currency}${formatMoney(p.total_amount)}</td>
      <td class="text-right">${currency}${formatMoney(p.paid_amount)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          @page { size: A4; margin: 20mm; }
          body { font-family: 'Segoe UI', sans-serif; font-size: 11px; color: #1f2937; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #111827; padding-bottom: 20px; }
          .company-info h1 { margin: 0; font-size: 24px; font-weight: 900; }
          .report-title { text-align: right; }
          .report-title h2 { margin: 0; font-size: 20px; color: #4b5563; }
          
          .metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
          .metric-box { padding: 15px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; }
          .metric-label { font-size: 9px; font-weight: 800; color: #6b7280; text-transform: uppercase; margin-bottom: 5px; }
          .metric-value { font-size: 18px; font-weight: 900; color: #111827; }

          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { background: #111827; color: #fff; text-align: left; padding: 10px; font-size: 9px; text-transform: uppercase; }
          td { padding: 10px; border-bottom: 1px solid #f3f4f6; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          
          .footer { margin-top: 50px; text-align: center; color: #9ca3af; font-size: 9px; border-top: 1px solid #f3f4f6; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-info">
            <h1>${escapeHtml(profile.business_name || 'INBILL ERP')}</h1>
          </div>
          <div class="report-title">
            <h2>PURCHASE REPORT</h2>
            <p>Period: ${fromDate} to ${toDate}</p>
          </div>
        </div>

        <div class="metrics">
          <div class="metric-box">
            <div class="metric-label">Total Investment</div>
            <div class="metric-value">${currency}${formatMoney(summary.total)}</div>
          </div>
          <div class="metric-box">
            <div class="metric-label">Total Purchases</div>
            <div class="metric-value">${summary.count} Records</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Supplier</th>
              <th class="text-right">Total Amount</th>
              <th class="text-right">Paid Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          Generated on ${new Date().toLocaleString('en-IN')} | Powered by InBill ERP
        </div>
      </body>
    </html>
  `;
};
