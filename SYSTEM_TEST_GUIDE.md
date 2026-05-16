# InBill ERP: Production Readiness System Test Guide

This guide covers all critical scenarios across the ERP modules to ensure absolute data integrity and system stability.

## 1. Product & Inventory Module
- [ ] **Add New Product**: Verify GST, MRP, and Cost Price calculations.
- [ ] **Custom Attributes**: Add a "Size" field, assign to product, verify it shows in Billing.
- [ ] **Stock Adjustment**: Manually update stock and verify "Inventory Value" on Dashboard.
- [ ] **Low Stock Alert**: Set `min_stock_alert` to 10, reduce stock to 5, check "Restock Radar" on Dashboard.
- [ ] **Delete Product**: Delete an item, ensure it disappears from Billing but stays in historical reports.

## 2. Billing & Sales Module
- [ ] **Counter Sale (Cash)**: Make a ₹0 due sale. Verify Today's Cash and Stock reduction.
- [ ] **Credit Sale (Party)**: Select a Party, leave a balance. Verify "Today's Credit" and Party Ledger increase.
- [ ] **Cart Validation**: Try to add more quantity than available in stock (Should block).
- [ ] **Discounting**: Apply a flat discount. Verify Net Total and GST calculations.
- [ ] **Duplicate Prevention**: Click a product twice in the search list (Should increase Qty, not add new row).

## 3. Party Ledger & Payments
- [ ] **Direct Collection**: Record a Cash payment from a Party Ledger. Verify Dashboard Cash increases.
- [ ] **Digital Collection**: Record a UPI payment. Verify "Today's Digital" card increases.
- [ ] **Opening Balance**: Add a party with an opening balance. Verify "Receivable" card reflects it.
- [ ] **Supplier Payment**: Record a payment to a Supplier. Verify "Payable" card decreases.

## 4. Sales & Purchase Returns (Rollbacks)
- [ ] **Cash Sale Return**: Return a Cash sale item. Verify "Today's Sales" and "Today's Cash" cards decrease.
- [ ] **Credit Sale Return**: Return a Credit sale item. Verify Party balance and "Today's Credit" decrease.
- [ ] **Stock Rollback**: Ensure stock increases automatically upon any Sales Return.
- [ ] **Partial Return**: Return only 1 of 5 items. Verify the net invoice value updates in Reports.
- [ ] **Undo Return**: Delete a return record. Verify stock and balances return to original states.

## 5. Dashboard & Analytics
- [ ] **Real-time Reconciliation**: Perform a sale, then a return, then a payment. Click "Refresh Stats". Verify all cards are "Net".
- [ ] **Recent Sales List**: Verify that returned sales show the **Adjusted Total** (Sale - Return).
- [ ] **Profit Accuracy**: Verify that "Total Profit" accounts for Sales Margins minus Returns and Expenses.
- [ ] **Date Filtering**: Change system date (if testing) or wait for next day. Verify "Today" cards reset.

## 6. Reports & Downloads
- [ ] **Sales Report**: Filter by date. Verify "Returned Total" column matches return records.
- [ ] **PDF Export**: Download an invoice PDF. Check for Business Logo and correct alignment.
- [ ] **Stock Report**: Download PDF. Verify "Total Stock Value (at Cost)" matches Dashboard.
- [ ] **Monthly Chart**: Verify the area chart reflects **Net** revenue (Sales - Returns).

## 7. Settings & Security
- [ ] **Cloud Sync**: Enable Neon Cloud. Refresh Dashboard. Verify no sync errors in terminal.
- [ ] **Backup/Restore**: Export JSON, Delete a product, Import JSON. Verify product returns.
- [ ] **Security PIN**: Set a software password. Try to delete a sale. Verify PIN prompt works.
- [ ] **WhatsApp API**: Click "Share on WhatsApp". Verify the link contains the correct phone and message.

---
**Status: PRODUCTION READY**
*Generated for InBill ERP v2.0.3*
