const safeJson = (value, fallback = {}) => {
  if (!value) return fallback;

  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const formatMoney = (value) => {
  const num = Number(value || 0);
  return isNaN(num) ? '0.00' : num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const getCurrency = (profile) => {
  const value = profile.currency_symbol;

  return value && !String(value).includes('Ã')
    ? value
    : '₹';
};

const getInvoiceNumber = (data) =>
  data.invoiceNumber || data.invoice_number || '';

const getInvoiceDate = (data) =>
  data.date || new Date().toLocaleDateString('en-IN');

const getUnitPrice = (item) =>
  Number(item.selling_price ?? item.price ?? item.rate ?? 0);

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

const numberToWords = (num) => {
  if (isNaN(num) || !isFinite(num) || num <= 0) {
    return 'Zero';
  }

  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five',
    'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen',
    'Fifteen', 'Sixteen', 'Seventeen',
    'Eighteen', 'Nineteen'
  ];

  const b = [
    '', '', 'Twenty', 'Thirty', 'Forty',
    'Fifty', 'Sixty', 'Seventy',
    'Eighty', 'Ninety'
  ];

  const inWords = (n) => {
    if (isNaN(n) || !isFinite(n) || n <= 0) return '';
    if (n < 20) return a[n];

    if (n < 100) {
      return (
        b[Math.floor(n / 10)] +
        (n % 10 ? ' ' + a[n % 10] : '')
      );
    }

    if (n < 1000) {
      return (
        a[Math.floor(n / 100)] +
        ' Hundred ' +
        (n % 100 ? inWords(n % 100) : '')
      );
    }

    if (n < 100000) {
      return (
        inWords(Math.floor(n / 1000)) +
        ' Thousand ' +
        (n % 1000 ? inWords(n % 1000) : '')
      );
    }

    if (n < 10000000) {
      return (
        inWords(Math.floor(n / 100000)) +
        ' Lakh ' +
        (n % 100000 ? inWords(n % 100000) : '')
      );
    }

    return (
      inWords(Math.floor(n / 10000000)) +
      ' Crore ' +
      (n % 10000000
        ? inWords(n % 10000000)
        : '')
    );
  };

  return inWords(Math.round(num));
};

const getInvoiceModel = (
  data,
  profile = {}
) => {
  const masterData = safeJson(
    profile.master_data
  );

  const gstEnabled =
    masterData.gst_enabled !== false;

  const items = Array.isArray(data.cart)
    ? data.cart
    : [];

  const subtotal = (Number(
    data.subtotal ??
      items.reduce(
        (sum, item) =>
          sum +
          Number(item.quantity || 0) *
            getUnitPrice(item),
        0
      )
  ) || 0);

  const totalGst = gstEnabled
    ? (Number(
        data.totalGst ??
          data.total_gst ??
          0
      ) || 0)
    : 0;

  const miscCharges = (Number(
    data.misc_charges || 0
  ) || 0);

  const grandTotal = (Number(
    data.grandTotal ??
      data.total_amount ??
      (subtotal + totalGst + miscCharges)
  ) || 0);

  return {
    currency: getCurrency(profile),
    items,
    subtotal,
    totalGst,
    grandTotal,
    gstEnabled,
    miscCharges,

    invoiceNumber:
      getInvoiceNumber(data),

    date: getInvoiceDate(data),

    customerName:
      data.customer_name ||
      'Cash Customer',

    customerPhone:
      data.customer_phone || '',

    customerAddress:
      data.customer_address || '',

    paymentMode:
      data.paymentMode ||
      data.payment_mode ||
      'Cash',

    totalDiscount: Number(
      data.totalDiscount ||
        data.total_discount ||
        0
    ),

    termsAndConditions:
      profile.terms_and_conditions ||
      '',

    whatsappNumber:
      profile.whatsapp_number || '',

    instagramId:
      profile.instagram_id || '',

    panNumber:
      profile.pan_number || ''
  };
};

const baseStyles = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

@page {
  size: A4;
  margin: 0;
}

* {
  box-sizing: border-box;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

body {
  margin: 0;
  background: #ffffff;
  font-family: 'Inter', sans-serif;
  color: #1e293b;
}

.page {
  width: 210mm;
  min-height: 297mm;
  margin: auto;
  background: #ffffff;
  padding: 15mm;
}

table {
  border-collapse: collapse;
}

@media print {
  body {
    background: #ffffff !important;
  }
  .page {
    margin: 0 !important;
    padding: 10mm !important;
    box-shadow: none !important;
  }
}
`;

export const getInvoiceHTML = (data, profile = {}) => {
  const model = getInvoiceModel(data, profile);
  const taxMode = data.tax_mode || data.taxMode || 'inclusive'; // default to 'inclusive' for standard sales

  let untaxedSubtotal = 0;
  let totalGstAmount = 0;

  const rowsHtml = model.items
    .map((item, index) => {
      const qty = Number(item.quantity || 0);
      const rate = getUnitPrice(item);
      const gstPercent = Number(item.gst_percent || item.gst_rate || 0);
      const originalPrice = Number(item.original_price ?? item.mrp ?? rate);

      const hasDiscount = originalPrice > rate;
      const discountPercent = hasDiscount ? Math.round(((originalPrice - rate) / originalPrice) * 100) : 0;
      const totalRowDiscount = hasDiscount ? (originalPrice - rate) * qty : 0;

      let rowUntaxedTotal = 0;
      let rowTaxAmount = 0;

      if (taxMode === 'inclusive') {
        const rowTotalPaid = qty * rate;
        rowUntaxedTotal = rowTotalPaid / (1 + gstPercent / 100);
        rowTaxAmount = rowTotalPaid - rowUntaxedTotal;
      } else {
        rowUntaxedTotal = qty * rate;
        rowTaxAmount = rowUntaxedTotal * (gstPercent / 100);
      }

      untaxedSubtotal += rowUntaxedTotal;
      totalGstAmount += rowTaxAmount;

      return `
        <tr>
          <td style="border: 1px solid #000000; padding: 10px 4px; text-align: center; font-size: 11px; font-weight: 500;">
            ${index + 1}
          </td>
          <td style="border: 1px solid #000000; padding: 10px 8px; text-align: left; font-size: 11px; font-weight: 500; line-height: 1.4; color: #1e293b;">
            ${escapeHtml(item.product_name || item.name)}
          </td>
          ${
            model.gstEnabled
              ? `
              <td style="border: 1px solid #000000; padding: 10px 4px; text-align: center; font-size: 11px; font-weight: 500;">
                ${escapeHtml(item.hsn_code || '-')}
              </td>
            `
              : ''
          }
          <td style="border: 1px solid #000000; padding: 10px 4px; text-align: center; font-size: 11px; font-weight: 500; white-space: nowrap;">
            ${qty.toFixed(2)} ${escapeHtml(item.unit || 'Units')}
          </td>
          <td style="border: 1px solid #000000; padding: 10px 6px; text-align: center; font-size: 11px; font-weight: 500;">
            ${formatMoney(originalPrice)}
          </td>
          <td style="border: 1px solid #000000; padding: 10px 4px; text-align: center; font-size: 11px; font-weight: 500; line-height: 1.25;">
            ${discountPercent > 0
              ? `${discountPercent.toFixed(1)}%<br><span style="font-size: 9px; color: #475569; font-weight: 500;">(${model.currency}${formatMoney(totalRowDiscount)})</span>`
              : '0%'
            }
          </td>
          ${
            model.gstEnabled
              ? `
              <td style="border: 1px solid #000000; padding: 10px 4px; text-align: center; font-size: 11px; font-weight: 500;">
                ${gstPercent.toFixed(1)}
              </td>
            `
              : ''
          }
          <td style="border: 1px solid #000000; padding: 10px 8px; text-align: right; font-size: 11px; font-weight: 600; color: #1e293b;">
            ${model.currency} ${formatMoney(rowUntaxedTotal)}
          </td>
        </tr>
      `;
    })
    .join('');

  let allRowsHtml = rowsHtml;
  const minRows = 8;
  if (model.items.length < minRows) {
    const emptyRowsCount = minRows - model.items.length;
    for (let i = 0; i < emptyRowsCount; i++) {
      allRowsHtml += `
        <tr style="height: 38px;">
          <td style="border: 1px solid #000000; padding: 10px 4px; text-align: center; font-size: 11px;"></td>
          <td style="border: 1px solid #000000; padding: 10px 8px; text-align: left; font-size: 11px;"></td>
          ${
            model.gstEnabled
              ? `
              <td style="border: 1px solid #000000; padding: 10px 4px; text-align: center; font-size: 11px;"></td>
            `
              : ''
          }
          <td style="border: 1px solid #000000; padding: 10px 4px; text-align: center; font-size: 11px;"></td>
          <td style="border: 1px solid #000000; padding: 10px 6px; text-align: center; font-size: 11px;"></td>
          <td style="border: 1px solid #000000; padding: 10px 4px; text-align: center; font-size: 11px;"></td>
          ${
            model.gstEnabled
              ? `
              <td style="border: 1px solid #000000; padding: 10px 4px; text-align: center; font-size: 11px;"></td>
            `
              : ''
          }
          <td style="border: 1px solid #000000; padding: 10px 8px; text-align: right; font-size: 11px;"></td>
        </tr>
      `;
    }
  }

  // Fallback division for CGST & SGST split
  const halfGst = totalGstAmount / 2;
  const displayUntaxed = model.gstEnabled ? untaxedSubtotal : model.subtotal;

  const computedDiscount = (model.items.reduce((sum, item) => {
    const qty = Number(item.quantity || 0) || 0;
    const rate = Number(getUnitPrice(item)) || 0;
    const originalPrice = Number(item.original_price ?? item.mrp ?? rate) || 0;
    return sum + (originalPrice > rate ? (originalPrice - rate) * qty : 0);
  }, 0) || 0);
  const totalDiscountAmount = (Number(model.totalDiscount) || computedDiscount || 0);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>${baseStyles}</style>
</head>
<body>

<div class="page">

  <!-- HEADER -->
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
    <tr>
      <td style="width: 40%; vertical-align: top; border: none !important; padding: 0;">
        ${
          profile.logo_path
            ? `
            <img
              style="max-height: 80px; object-fit: contain;"
              src="local-file://asset/?path=${encodeURIComponent(
                profile.logo_path
              )}"
            />
          `
            : ''
        }
      </td>
      <td style="width: 60%; text-align: right; vertical-align: top; border: none !important; padding: 0; line-height: 1.45;">
        <div style="color: #000000; font-size: 22px; font-weight: 700; margin-bottom: 3px;">
          ${escapeHtml(profile.business_name || 'P M Nutrition')}
        </div>
        <div style="font-size: 10.5px; color: #334155; font-weight: 500;">
          ${companyAddress(profile)}
        </div>
        ${
          profile.phone
            ? `
            <div style="font-size: 10.5px; color: #334155; font-weight: 700; margin-top: 2px;">
              MO: ${escapeHtml(profile.phone)}
            </div>
          `
            : ''
        }
        ${
          profile.email
            ? `
            <div style="font-size: 10.5px; color: #334155; font-weight: 700; margin-top: 2px;">
              Email: ${escapeHtml(profile.email)}
            </div>
          `
            : ''
        }
        ${
          profile.pan_number
            ? `
            <div style="font-size: 10.5px; color: #334155; font-weight: 700; margin-top: 2px;">
              PAN: ${escapeHtml(profile.pan_number)}
            </div>
          `
            : ''
        }
        ${
          model.gstEnabled && profile.gstin
            ? `
            <div style="font-size: 10.5px; color: #334155; font-weight: 700; margin-top: 2px;">
              GSTIN: ${escapeHtml(profile.gstin)}
            </div>
          `
            : ''
        }
      </td>
    </tr>
  </table>

  <!-- CUSTOMER & INVOICE METADATA BOX (Strict Bordered Box) -->
  <table style="width: 100%; border: 1.5px solid #000000; border-collapse: collapse; margin-bottom: 20px;">
    <tr>
      <!-- Customer Column (No "Bill To" header, exact font-weight and layout) -->
      <td style="width: 58%; border: 1.5px solid #000000 !important; padding: 10px 12px; vertical-align: top; font-size: 11px; line-height: 1.5; color: #1e293b;">
        <div style="font-weight: 700; font-size: 12.5px; margin-bottom: 2px; color: #000000; text-transform: lowercase;">
          ${escapeHtml(model.customerName)}
        </div>
        ${
          model.customerPhone
            ? `
            <div style="font-weight: 700; color: #000000; margin-bottom: 2px;">
              ${escapeHtml(model.customerPhone)}
            </div>
          `
            : ''
        }
        ${
          model.customerAddress
            ? `
            <div style="font-weight: 400; color: #334155; margin-bottom: 2px; white-space: pre-line;">
              ${escapeHtml(model.customerAddress)}
            </div>
          `
            : ''
        }
        ${
          model.customerPhone
            ? `
            <div style="font-weight: 400; color: #334155;">
              Mobile: +91 ${escapeHtml(
                model.customerPhone.replace(/^\+?91\s*/, '')
              )}
            </div>
          `
            : ''
        }
      </td>
      <!-- Invoice Meta Column (Right side of divided box) -->
      <td style="width: 42%; border: 1.5px solid #000000 !important; padding: 10px 12px; vertical-align: top; font-size: 11.5px; line-height: 1.6; color: #1e293b;">
        <div>
          <strong>Invoice No:</strong>
          ${escapeHtml(model.invoiceNumber)}
        </div>
        <div>
          <strong>Date:</strong>
          ${escapeHtml(model.date)}
        </div>
        <div>
          <strong>Payment:</strong>
          ${escapeHtml(model.paymentMode)}
        </div>
      </td>
    </tr>
  </table>

  <!-- ITEMS TABLE -->
  <table style="width: 100%; border: 1.5px solid #000000; border-collapse: collapse; margin-bottom: 18px;">
    <thead>
      <tr style="background-color: #ffffff;">
        <th style="border: 1.5px solid #000000 !important; padding: 8px 4px; font-size: 10px; font-weight: 700; text-align: center; width: 4%; color: #334155;">#</th>
        <th style="border: 1.5px solid #000000 !important; padding: 8px 8px; font-size: 10px; font-weight: 700; text-align: left; width: 44%; color: #334155;">DESCRIPTION</th>
        ${
          model.gstEnabled
            ? `
            <th style="border: 1.5px solid #000000 !important; padding: 8px 4px; font-size: 10px; font-weight: 700; text-align: center; width: 10%; color: #334155;">HSN/SAC</th>
          `
            : ''
        }
        <th style="border: 1.5px solid #000000 !important; padding: 8px 4px; font-size: 10px; font-weight: 700; text-align: center; width: 10%; color: #334155;">QUANTITY</th>
        <th style="border: 1.5px solid #000000 !important; padding: 8px 4px; font-size: 10px; font-weight: 700; text-align: right; width: 9%; color: #334155;">PRICE</th>
        <th style="border: 1.5px solid #000000 !important; padding: 8px 4px; font-size: 10px; font-weight: 700; text-align: center; width: 8%; color: #334155;">DISC.%</th>
        ${
          model.gstEnabled
            ? `
            <th style="border: 1.5px solid #000000 !important; padding: 8px 4px; font-size: 10px; font-weight: 700; text-align: center; width: 5%; color: #334155;">GST</th>
          `
            : ''
        }
        <th style="border: 1.5px solid #000000 !important; padding: 8px 6px; font-size: 10px; font-weight: 700; text-align: right; width: 10%; color: #334155; line-height: 1.2;">TOTAL<br>PRICE</th>
      </tr>
    </thead>
    <tbody>
      ${allRowsHtml}
    </tbody>
  </table>

  <!-- TOTAL & SUMMARY SECTION -->
  <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
    <tr>
      <!-- Amount in Words (Left) -->
      <td style="width: 55%; vertical-align: top; padding-right: 20px; border: none !important;">
        <div style="font-size: 11.5px; font-weight: 700; line-height: 1.6; color: #000000;">
          Total (In Words): ${escapeHtml(numberToWords(model.grandTotal))} Only
        </div>
      </td>
      <!-- Summary Table (Right) -->
      <td style="width: 45%; vertical-align: top; padding: 0; border: none !important;">
        <table style="width: 100%; border: 1.5px solid #000000; border-collapse: collapse;">
          <tr>
            <td style="border: 1px solid #000000; padding: 6px 10px; font-size: 11px; font-weight: 500; color: #475569;">Sub Total</td>
            <td style="border: 1px solid #000000; padding: 6px 10px; font-size: 11px; text-align: right; font-weight: 700; color: #000000;">
              ${model.currency} ${formatMoney(displayUntaxed)}
            </td>
          </tr>
          ${
            totalDiscountAmount > 0
              ? `
              <tr>
                <td style="border: 1px solid #000000; padding: 6px 10px; font-size: 11px; font-weight: 500; color: #475569;">Total Discount</td>
                <td style="border: 1px solid #000000; padding: 6px 10px; font-size: 11px; text-align: right; font-weight: 700; color: #000000;">
                  - ${model.currency} ${formatMoney(totalDiscountAmount)}
                </td>
              </tr>
            `
              : ''
          }
          ${
            model.gstEnabled
              ? `
              <tr>
                <td style="border: 1px solid #000000; padding: 6px 10px; font-size: 11px; font-weight: 500; color: #475569;">SGST</td>
                <td style="border: 1px solid #000000; padding: 6px 10px; font-size: 11px; text-align: right; font-weight: 700; color: #000000;">
                  ${model.currency} ${formatMoney(halfGst)}
                </td>
              </tr>
              <tr>
                <td style="border: 1px solid #000000; padding: 6px 10px; font-size: 11px; font-weight: 500; color: #475569;">CGST</td>
                <td style="border: 1px solid #000000; padding: 6px 10px; font-size: 11px; text-align: right; font-weight: 700; color: #000000;">
                  ${model.currency} ${formatMoney(halfGst)}
                </td>
              </tr>
            `
              : ''
          }
          <tr style="font-weight: 800; font-size: 12.5px; color: #000000;">
            <td style="border: 1.5px solid #000000 !important; padding: 8px 10px; font-weight: 800;">Total</td>
            <td style="border: 1.5px solid #000000 !important; padding: 8px 10px; text-align: right; font-weight: 800; color: #000000;">
              ${model.currency} ${formatMoney(model.grandTotal)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- TERMS AND SIGNATURE FOOTER -->
  <table style="width: 100%; border-collapse: collapse; margin-top: 40px;">
    <tr>
      <!-- Terms & Social Handles -->
      <td style="width: 100%; vertical-align: top; border: none !important; font-size: 11px; color: #4b5563; line-height: 1.6; padding: 0;">
        ${
          model.termsAndConditions
            ? `
            <div style="margin-bottom: 12px;">
              <strong style="color: #111827;">Terms & Conditions:</strong><br>
              <span style="font-size: 9.5px; color: #4b5563;">${escapeHtml(
                model.termsAndConditions
              )}</span>
            </div>
          `
            : ''
        }
        <div style="display: flex; gap: 15px; margin-top: 5px;">
          ${
            model.whatsappNumber
              ? `
              <div style="display: flex; align-items: center; gap: 4px; color: #000000; font-weight: 600; font-size: 10.5px;">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" style="color: #25D366;"><path d="M12.004 2C6.51 2 2.014 6.5 2.014 12c0 2.13.67 4.19 1.9 5.92L2.03 22l4.22-1.1c1.66.9 3.52 1.37 5.75 1.37 5.49 0 9.99-4.5 9.99-10S17.5 2 12.004 2zm0 18.3c-1.92 0-3.66-.5-5.17-1.46l-.37-.22-2.52.66.68-2.46-.24-.38c-1.05-1.68-1.6-3.66-1.6-5.71 0-4.65 3.79-8.44 8.44-8.44 4.65 0 8.44 3.79 8.44 8.44s-3.79 8.44-8.44 8.44zM16.5 13.5c-.24-.12-1.44-.71-1.66-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.02-.37-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.79-.2-.48-.38-.41-.54-.42H8.76c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.33.98 2.49c.12.16 1.69 2.58 4.1 3.62.58.25 1.02.4 1.37.51.58.18 1.1.16 1.52.1.47-.07 1.44-.59 1.64-1.15.2-.56.2-1.03.14-1.13-.06-.1-.22-.16-.46-.28z"/></svg>
                <span>+${escapeHtml(model.whatsappNumber)}</span>
              </div>
            `
              : ''
          }
          ${
            model.instagramId
              ? `
              <div style="display: flex; align-items: center; gap: 4px; color: #000000; font-weight: 600; font-size: 10.5px;">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" style="color: #E1306C;"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                <span>@${escapeHtml(model.instagramId)}</span>
              </div>
            `
              : ''
          }
        </div>
      </td>
    </tr>
  </table>

</div>

</body>
</html>
`;
};

