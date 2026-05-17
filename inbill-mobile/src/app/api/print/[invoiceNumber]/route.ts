import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';

const safeJson = (value: any, fallback = {}) => {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const escapeHtml = (value: any) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const formatMoney = (value: any) => Math.round(Number(value || 0)).toLocaleString('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

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
    padding: 20px;
  }
  .page {
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
    background: #fff;
    position: relative;
    display: flex;
    flex-direction: column;
    padding: 15px;
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
    margin-top: 15px;
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
    font-size: 44px;
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
    font-weight: 900;
    color: #000;
    letter-spacing: -0.02em;
    line-height: 1.1;
    margin-bottom: 6px;
  }
  
  .customer-details {
    font-size: 10px;
    color: #4b5563;
    line-height: 1.5;
    font-weight: 500;
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0 30px;
  }
  
  th {
    font-size: 9px;
    font-weight: 800;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    border-bottom: 2px solid #000;
    padding: 10px 4px;
    text-align: left;
  }
  
  td {
    padding: 12px 4px;
    border-bottom: 1px solid #f3f4f6;
    font-size: 11px;
    color: #374151;
    vertical-align: middle;
  }
  
  .item-name {
    font-weight: 800;
    color: #000;
    font-size: 11px;
  }
  
  .item-desc {
    font-size: 9px;
    color: #888;
    margin-top: 2px;
    font-weight: 600;
  }
  
  .summary-box {
    background: #fafbfc;
    border-radius: 16px;
    padding: 20px;
    border: 1px solid #f1f5f9;
  }
  
  .summary-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    font-size: 10px;
    font-weight: 600;
    color: #4b5563;
  }
  
  .summary-row.total {
    border-top: 1px solid #e2e8f0;
    margin-top: 10px;
    padding-top: 12px;
    font-size: 13px;
    font-weight: 900;
    color: #000;
  }
  
  .footer-bottom {
    margin-top: auto;
    padding-top: 40px;
  }
  
  .footer-divider {
    height: 1px;
    background: #eee;
    margin-bottom: 20px;
  }
  
  .social-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 14px 7px 8px;
    border-radius: 100px;
    text-decoration: none;
    border: 1px solid #e2e8f0;
    background: #fff;
  }
  
  .social-badge .social-icon {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  
  .social-badge .social-icon.wa-icon {
    background: #25D366;
  }
  
  .social-badge .social-icon.ig-icon {
    background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888);
  }
  
  .social-badge .social-icon svg {
    width: 12px;
    height: 12px;
  }
  
  .social-badge .social-label {
    font-size: 10px;
    font-weight: 700;
    color: #1e293b;
    line-height: 1.2;
  }
  
  .social-badge .social-label small {
    display: block;
    font-size: 8px;
    font-weight: 500;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .powered-by {
    font-size: 7px;
    color: #94a3b8;
    margin-top: 24px;
    text-align: center;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    font-weight: 600;
  }
  
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .btn-print {
    margin-bottom: 20px;
    background: #4f46e5;
    color: white;
    border: none;
    padding: 10px 20px;
    font-weight: bold;
    border-radius: 8px;
    cursor: pointer;
    font-family: inherit;
    box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);
  }
  @media print {
    .btn-print { display: none; }
    body { padding: 0; }
  }
`;

export async function GET(req: NextRequest, { params }: { params: Promise<{ invoiceNumber: string }> }) {
  try {
    const { invoiceNumber } = await params;
    const urlParams = req.nextUrl.searchParams;
    
    // Attempt authentication from cookies or direct URL parameter (for read-only sharing if provided)
    const cookieToken = req.cookies.get('inbill_cloud')?.value;
    const dbUrl = cookieToken || urlParams.get('db');

    if (!dbUrl) {
      return new NextResponse(
        `<html><body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h2>Access Denied</h2>
          <p>You must be authenticated on InBill Mobile to view or print invoices.</p>
        </body></html>`,
        { status: 401, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    const sql = neon(dbUrl);

    // 1. Fetch sale
    const saleRows = await sql`
      SELECT * FROM sales WHERE invoice_number = ${invoiceNumber}
    `;
    if (saleRows.length === 0) {
      return new NextResponse(
        `<html><body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h2>Invoice Not Found</h2>
          <p>No invoice matching <strong>${escapeHtml(invoiceNumber)}</strong> was found in Neon.</p>
        </body></html>`,
        { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    const sale = saleRows[0];

    // 2. Fetch sale items
    const itemsRows = await sql`
      SELECT si.*, p.brand, p.category, p.unit, p.barcode, p.product_size 
      FROM sale_items si 
      LEFT JOIN products p ON p.id = si.product_id 
      WHERE si.sale_id = ${sale.id}
    `;

    // 3. Fetch active business profile
    const profileRows = await sql`
      SELECT * FROM business_profile WHERE id = 1
    `;
    const profile = profileRows[0] || {};

    // 4. Populate model variables
    const masterData = safeJson(profile.master_data);
    const gstEnabled = masterData.gst_enabled !== false;
    const currency = profile.currency_symbol || '₹';
    const subtotal = Number(sale.subtotal || 0);
    const totalGst = gstEnabled ? Number(sale.total_gst || 0) : 0;
    const miscCharges = Number(sale.misc_charges || 0);
    const totalDiscount = Number(sale.total_discount || 0);
    const grandTotal = Number(sale.total_amount || 0);

    const parts = [
      profile.address_line1,
      profile.address_line2,
      profile.city,
      profile.state,
      profile.pincode
    ].filter(Boolean);
    const companyAddress = parts.map(escapeHtml).join(', ');

    // 5. Generate items HTML rows
    const rowsHtml = itemsRows.map((item, index) => {
      const qty = Number(item.quantity || 0);
      const price = Number(item.price || 0);
      const total = qty * price;
      
      return `
        <tr>
          <td style="width: 40px; color: #94a3b8; font-weight: 800;">${String(index + 1).padStart(2, '0')}</td>
          <td>
            <div class="item-name">${escapeHtml(item.product_name)}</div>
            <div class="item-desc">
              ${item.brand ? `<span>${escapeHtml(item.brand)}</span>` : ''}
              ${item.product_size ? `<span> | ${escapeHtml(item.product_size)}</span>` : ''}
              ${item.hsn_code ? `<span> | HSN: ${escapeHtml(item.hsn_code)}</span>` : ''}
            </div>
          </td>
          <td class="text-center" style="font-weight: 700;">${qty} ${escapeHtml(item.unit || 'pcs')}</td>
          <td class="text-right" style="font-weight: 700;">${currency}${formatMoney(price)}</td>
          <td class="text-right" style="font-weight: 800; color: #000;">${currency}${formatMoney(total)}</td>
        </tr>
      `;
    }).join('');

    const logoHtml = (profile.logo_path && (profile.logo_path.startsWith('http') || profile.logo_path.startsWith('data:')))
      ? `<img src="${profile.logo_path}" style="height: 80px; width: auto; margin-bottom: 5px; border-radius: 8px;" />`
      : `<div style="height: 54px; width: 54px; background: #000; color: #fff; font-size: 20px; font-weight: 900; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 5px; font-family: 'Outfit', sans-serif;">${(profile.business_short || 'IB').toUpperCase()}</div>`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Invoice - ${escapeHtml(invoiceNumber)}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>${baseStyles}</style>
        </head>
        <body>
          <div class="page">
            <div style="display: flex; justify-content: flex-end;">
              <button class="btn-print" onclick="window.print()">Print / Download PDF</button>
            </div>
            
            <header class="header">
              <div class="logo-section">
                ${logoHtml}
                <div>
                  <div class="brand-title">${escapeHtml(profile.business_name || 'INBILL ERP')}</div>
                  <div class="brand-tagline">${escapeHtml(profile.tagline || 'Excellence in Commerce')}</div>
                  <div class="company-header-info">
                    <div>${companyAddress}</div>
                    <div>
                      ${profile.whatsapp_number ? `WhatsApp: +${escapeHtml(profile.whatsapp_number)}` : (profile.phone ? `Ph: ${escapeHtml(profile.phone)}` : '')}
                      ${profile.email ? ` | ${escapeHtml(profile.email)}` : ''}
                    </div>
                    <div style="display: flex; gap: 10px; margin-top: 4px;">
                      ${gstEnabled && profile.gstin ? `<div style="font-weight: 800; color: #000;">GSTIN: ${escapeHtml(profile.gstin)}</div>` : ''}
                      ${profile.pan_number ? `<div style="font-weight: 800; color: #000;">PAN: ${escapeHtml(profile.pan_number)}</div>` : ''}
                    </div>
                  </div>
                </div>
              </div>
              <div class="invoice-label">
                <h1>INVOICE</h1>
                <div class="inv-num">#${escapeHtml(invoiceNumber)}</div>
                <div style="font-size: 10px; color: #64748b; font-weight: 800; margin-top: 10px; text-transform: uppercase; letter-spacing: 0.1em;">
                  Date: ${escapeHtml(sale.date || '')}
                </div>
              </div>
            </header>

            <div class="billing-section">
              <div class="bill-to">
                <h3>Billed To</h3>
                <div class="customer-name">${escapeHtml(sale.customer_name || 'Counter Sale')}</div>
                <div class="customer-details">
                  ${sale.customer_phone ? `<div>Ph: ${escapeHtml(sale.customer_phone)}</div>` : ''}
                  ${sale.customer_address ? `<div>${escapeHtml(sale.customer_address)}</div>` : ''}
                  <div>Mode: <strong>${escapeHtml(sale.payment_mode || 'Cash')}</strong></div>
                  ${sale.due_date ? `<div>Due Date: <strong style="color: #dc2626;">${escapeHtml(sale.due_date)}</strong></div>` : ''}
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

            <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
              <div class="summary-box" style="width: 280px;">
                <div class="summary-row">
                  <span>Subtotal</span>
                  <span>${currency}${formatMoney(subtotal)}</span>
                </div>
                ${gstEnabled ? `
                  <div class="summary-row">
                    <span>Tax (GST)</span>
                    <span>${currency}${formatMoney(totalGst)}</span>
                  </div>
                ` : ''}
                ${totalDiscount > 0 ? `
                  <div class="summary-row">
                    <span>Discount</span>
                    <span style="color: #10b981;">-${currency}${formatMoney(totalDiscount)}</span>
                  </div>
                ` : ''}
                ${miscCharges > 0 ? `
                  <div class="summary-row">
                    <span>Other Charges</span>
                    <span>${currency}${formatMoney(miscCharges)}</span>
                  </div>
                ` : ''}
                <div class="summary-row total">
                  <span>Total Amount</span>
                  <span>${currency}${formatMoney(grandTotal)}</span>
                </div>
              </div>
            </div>

            <div class="footer-bottom">
              <div class="footer-divider"></div>

              ${profile.terms_and_conditions ? `
                <div style="margin-bottom: 18px; padding: 12px 14px; background: #fafbfc; border-left: 3px solid #000; border-radius: 0 6px 6px 0;">
                  <div style="font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; color: #111827; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#111827" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                    Terms & Conditions
                  </div>
                  <div style="font-size: 8.5px; line-height: 1.7; color: #4b5563; white-space: pre-wrap;">${escapeHtml(profile.terms_and_conditions)}</div>
                </div>
              ` : ''}

              <div class="footer-grid" style="display: flex; justify-content: center; width: 100%;">
                <div class="social-links" style="display: flex; gap: 15px; justify-content: center; width: 100%;">
                  ${profile.whatsapp_number ? `
                    <div class="social-badge">
                      <div class="social-icon wa-icon">
                        <svg viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      </div>
                      <div class="social-label">
                        <small>WhatsApp</small>
                        +${escapeHtml(profile.whatsapp_number)}
                      </div>
                    </div>
                  ` : ''}
                  ${profile.instagram_id ? `
                    <div class="social-badge">
                      <div class="social-icon ig-icon">
                        <svg viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                      </div>
                      <div class="social-label">
                        <small>Instagram</small>
                        @${escapeHtml(profile.instagram_id)}
                      </div>
                    </div>
                  ` : ''}
                </div>
              </div>

              <div class="powered-by">${escapeHtml(profile.invoice_footer || 'Thank you for shopping with us!')}</div>
            </div>
          </div>
        </body>
      </html>
    `;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0'
      }
    });

  } catch (e: any) {
    console.error('Error generating print view:', e);
    return new NextResponse(
      `<html><body style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h2>Internal Server Error</h2>
        <p>${escapeHtml(e?.message || String(e))}</p>
      </body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}
