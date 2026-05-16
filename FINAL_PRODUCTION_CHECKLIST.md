# 🏆 InBill ERP: Master Test Plan (All Scenarios)

This document contains every scenario that must be verified before the final delivery.

## 1. The "Stock In" Lifecycle (Purchases)
- [ ] **New Purchase**: Buy a product that doesn't exist yet; it should be auto-created in Inventory.
- [ ] **Price Change**: Buy an item at a higher cost than last time. Verify the `Cost Price` updates in Inventory.
- [ ] **Credit Purchase**: Purchase on credit. Verify the Supplier's balance becomes **Negative** (Payable).
- [ ] **Purchase Return**: Return 5 items to a supplier. Verify your debt to them decreases and stock drops.

## 2. The "Sales" Lifecycle (Billing)
- [ ] **Cash/Counter Sale**: Make a ₹0.50 rounded sale. Verify "Today's Cash" card updates.
- [ ] **Party Credit Sale**: Sale of ₹5000. Pay ₹1000 now, leave ₹4000 due. Verify both Cash and Credit cards.
- [ ] **Inventory Block**: Try to sell an item with 0 quantity. The system should block it or warn.
- [ ] **Inclusive vs Exclusive**: Use "Tax Inclusive" mode. Verify the total matches the MRP exactly.
- [ ] **Discounting**: Apply a flat and percentage discount. Verify GST is calculated on the discounted price.

## 3. The "Money" Lifecycle (Accounts)
- [ ] **Customer Payment**: Record a ₹2000 payment from a customer. Verify Ledger and Balance drop.
- [ ] **Expense Recording**: Record a "Tea/Coffee" expense. Verify "Net Profit" on Dashboard drops.
- [ ] **Opening Balance**: Add a party with ₹10,000 old debt. Verify it shows in their statement.
- [ ] **Supplier Payment**: Record a payment to a supplier. Verify your "Payable" total decreases.

## 4. The "Product Return" Chain Reaction (Deep Impact)
When a Sales Return is performed, verify all 6:
- [ ] **Stock**: Increases by return quantity.
- [ ] **Party Balance**: Decreases (they owe less).
- [ ] **Ledger**: New "Sales Return" entry appears.
- [ ] **Original Sale**: "Due Amount" reduces on the original invoice.
- [ ] **Dashboard**: "Today's Sales" decreases (Net Calculation).
- [ ] **Profit**: "Total Profit" card decreases.

## 5. The "System" Lifecycle (Security & Data)
- [ ] **Cloud Sync**: Add a product, click Sync. Check Neon Cloud for data reflection.
- [ ] **Backup & Restore**: Export Data -> Delete Everything -> Import Data. Verify 100% recovery.
- [ ] **Software Lock**: Set a PIN. Try to delete a sale. PIN prompt must appear.
- [ ] **PDF Branding**: Change Logo in Settings. Verify new logo on PDF Invoice.

---
**Status**: [ ] IN PROGRESS | [ ] COMPLETED
**Tester Name**: ____________________
**Date**: ____________________
