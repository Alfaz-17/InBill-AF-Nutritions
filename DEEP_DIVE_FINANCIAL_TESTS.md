# 📊 Financial Accuracy & Math Reconciliation Tests

Focus on the mathematical logic of the Dashboard and Reports.

| Test ID | Scenario | Proper System Behavior |
| :--- | :--- | :--- |
| **FIN-01** | **Net Revenue** | Sale (1000) - Return (200) = **₹800** on Dashboard. |
| **FIN-02** | **Cash Flow** | Sale Cash + Ledger Payment = **Today's Cash**. |
| **FIN-03** | **Credit Change** | New Debt - Payments - Returns = **Today's Credit**. |
| **FIN-04** | **Profit Rollback** | Return an item -> Profit MUST decrease by the margin. |
| **FIN-05** | **Inventory Value** | Dashboard `Inventory Value` must equal `SUM(Qty * Cost Price)`. |
| **FIN-06** | **Net Profit** | `Gross Margin - Expenses = Net Profit`. |
| **FIN-07** | **Tax Report** | Sum of GST on all invoices must match the `Total GST` in Reports. |

## Stress Test: The "Accounting Nightmare"
1. Make a Sale of 10 items.
2. Return 3 items.
3. Pay 50% of the remaining balance.
4. Delete the Return.
5. **Verify**: Does the Party Balance and Stock return to the EXACT correct state? If there is a ₹1 difference, the system fails.
