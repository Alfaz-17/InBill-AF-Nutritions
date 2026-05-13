# InBill ERP — Modules, Products & Printing

## 1. Modular ERP Architecture
The system is divided into self-contained modules that communicate via IPC:
- **Inventory Module**: Stock movements, batch tracking, reorder alerts.
- **Billing Module**: GST invoices, quotations, credit/debit notes.
- **CRM Module**: Party ledgers, credit limits, payment history.
- **Accounting Module**: Expenses, P&L, balance sheets.

## 2. Universal Product Engine
The product system is designed to be niche-agnostic:
- **Dynamic Categories**: Users can create their own category tree.
- **Custom Fields**: A JSON field stores industry-specific data (e.g., "Flavor" for Supplements, "Thread Size" for Hardware).
- **Business Type Presets**: Automatically seeds categories based on whether the business is a Marine shop, Hardware store, etc.

## 3. Printing System
- **Template Engine**: Renders HTML/CSS to PDF or Thermal format.
- **Thermal Printing**: Direct support for 80mm and 58mm printers.
- **GST Compliance**: Automated CGST/SGST/IGST calculation based on the place of supply.

### Example Thermal Template
```html
<center>
  <b>${profile.name}</b><br/>
  ${profile.addressLine1}<br/>
  GSTIN: ${profile.gstin}<br/>
  <hr/>
  Invoice #${sale.invoiceNumber}<br/>
</center>
${sale.items.map(item => `
  ${item.productName} x ${item.quantity} = ${item.totalAmount}<br/>
`).join('')}
<hr/>
<b>TOTAL: ${sale.totalAmount}</b>
```
