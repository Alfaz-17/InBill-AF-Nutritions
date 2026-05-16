# InBill ERP Production Readiness Coverage

This file maps `SYSTEM_TEST_GUIDE.md` to executable checks in this repo.

## Automated Commands

```bash
npm run qa-regression
npm run qa-frontend
npm run qa-e2e
```

If `npm` is not available in the shell, run:

```bash
node tests/frontend-contract.mjs
node tests/run-e2e-core.cjs
```

## Covered By `tests/frontend-contract.mjs`

- Every `window.electronAPI` channel exposed in preload has a matching `ipcMain.handle`.
- Navigation exposes Dashboard, New Sale, Inventory, Stock-In, Parties, Expenses, Reports, and Settings.
- Product UI is wired for add/update/delete, custom attributes, GST/pricing, low stock threshold, and PIN-protected destructive actions.
- Billing UI is wired for duplicate-cart quantity behavior, stock warnings, discount line edits, payment modes, PDF, and WhatsApp API sharing.
- Party UI is wired for ledger, payment mode, customer collection, supplier payment, and PIN-protected deletes.
- Reports UI is wired for sales returns, purchase returns, undo return, returned totals, PDF, inventory, monthly stats, and net report values.
- Dashboard UI is wired for refresh, Restock Radar, inventory value, today's cash/digital/credit, recent adjusted sales, and profit.
- Settings UI is wired for backup/restore, Neon cloud sync, delete PIN, and software password.

## Covered By `tests/e2e-core-flows.mjs`

- Product creation persists GST, MRP, cost, custom Size field, barcode, and `min_stock_alert`.
- Dashboard inventory value and Restock Radar update after manual stock adjustment.
- Backend sale creation blocks overselling, preventing stock leakage even outside the UI.
- Cash sale reduces stock and affects today's cash.
- Credit sale updates party receivable and ledger.
- Customer payment is capped and UPI collection affects today's digital amount.
- Sales return rolls back stock, party balance, invoice returned total, reports, and profit; undo return reverses it.
- Purchase auto-creates inventory, updates supplier payable, purchase return reduces stock/payable, and undo return restores them.
- Supplier payment is capped and reduces payable.
- Reports reconcile net sales, purchase totals, stock state, and return state.
- Deleted products disappear from active inventory while historical invoice items remain.
- Backup/restore includes products, sales, sale items, parties, ledgers, and return tables.
- Security password/PIN verification is checked at backend level.

## Manual Device Checks Still Recommended

- Full PDF visual alignment after choosing a real printer/PDF save location.
- Real WhatsApp delivery through a configured API token/phone ID.
- Real Neon sync against the production Neon connection string.
- Multi-device conflict testing while background sync is enabled.
