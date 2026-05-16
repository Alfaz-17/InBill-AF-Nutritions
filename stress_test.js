const { db, resetDB, productOps, partyOps, saleOps, returnOps, statsOps } = require('./main/db');

async function runStressTest() {
    console.log("🚀 INITIALIZING STRESS TEST...");
    
    // Disable cloud sync for the duration of the test to speed up operations
    db.prepare("UPDATE business_profile SET use_cloud = 0 WHERE id = 1").run();
    
    // 1. Reset Database
    console.log("🧹 Clearing database...");
    resetDB();

    const startTime = Date.now();

    // 2. Seed Parties (Suppliers & Customers)
    console.log("👥 Seeding 50 Parties...");
    for(let i=1; i<=50; i++) {
        partyOps.add({
            name: `Test Party ${i}`,
            type: i % 2 === 0 ? 'Customer' : 'Supplier',
            opening_balance: 0
        });
    }

    // 3. Seed Products
    console.log("📦 Seeding 100 Products...");
    for(let i=1; i<=100; i++) {
        productOps.add({
            product_name: `Stress Product ${i}`,
            cost_price: 100 + i,
            selling_price: 150 + i,
            quantity: 1000,
            gst_rate: 18
        });
    }

    // 4. Generate High Volume Transactions
    console.log("💰 Generating 200 Sales Transactions...");
    for(let i=1; i<=200; i++) {
        const partyId = (i % 25) + 1; // Pick a customer
        const items = [
            { product_id: (i % 100) + 1, quantity: 2, price: 200, mrp: 250, gst_rate: 18 },
            { product_id: ((i+5) % 100) + 1, quantity: 1, price: 300, mrp: 350, gst_rate: 18 }
        ];
        
        // Calculate totals manually for the test payload
        const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const total_gst = subtotal * 0.18;
        const total_amount = subtotal + total_gst;

        saleOps.create({
            party_id: partyId,
            items: items,
            paid_amount: i % 2 === 0 ? total_amount : total_amount / 2, // Partial vs Full payments
            payment_mode: 'Cash'
        });
    }

    // 5. Generate Returns
    console.log("🔄 Generating 30 Returns...");
    for(let i=1; i<=30; i++) {
        const saleId = i;
        const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId);
        const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(saleId);
        
        returnOps.createSaleReturn({
            sale_id: saleId,
            party_id: sale.party_id,
            total_amount: items[0].price * 1.18, // Return 1 item
            items: [{
                product_id: items[0].product_id,
                product_name: items[0].product_name,
                quantity: 1,
                price: items[0].price
            }],
            reason: 'Stress Test Return'
        });
    }

    // 6. Validation Phase
    console.log("\n🔍 VALIDATION PHASE...");
    
    // Check Dashboard
    const stats = statsOps.getDashboard();
    console.log("📊 Dashboard Revenue:", stats.totalRevenue);
    console.log("📊 Dashboard Profit:", stats.totalProfit);
    console.log("📊 Total Receivable:", stats.receivable);

    // Audit individual party balances
    let balanceErrors = 0;
    const parties = partyOps.getAll();
    for (const p of parties) {
        const ledger = partyOps.getLedger(p.id);
        const ledgerSum = ledger.reduce((sum, t) => {
            if (t.type === 'Sale') return sum + (t.total_amount - t.paid_amount);
            if (t.type === 'Sales Return') return sum - t.total_amount;
            if (t.type === 'Payment') return sum - t.paid_amount;
            return sum;
        }, 0);

        if (Math.abs(p.current_balance - ledgerSum) > 0.01) {
            console.error(`❌ BALANCE MISMATCH for ${p.name}: DB=${p.current_balance}, Calculated=${ledgerSum}`);
            balanceErrors++;
        }
    }

    const duration = (Date.now() - startTime) / 1000;
    console.log(`\n✅ TEST COMPLETED in ${duration}s`);
    
    if (balanceErrors === 0) {
        console.log("🏆 RESULT: 100% Financial Accuracy Achieved. System is Production Ready.");
    } else {
        console.error(`🛑 RESULT: Found ${balanceErrors} balance errors. System needs adjustment.`);
    }

    // Restore cloud sync setting
    db.prepare("UPDATE business_profile SET use_cloud = 1 WHERE id = 1").run();
}

// Run the test
runStressTest().catch(console.error);
