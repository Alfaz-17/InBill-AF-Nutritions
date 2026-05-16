const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'inbill', 'database.db');
console.log('Opening database at:', dbPath);

try {
    const db = new Database(dbPath, { readonly: true });
    
    const stats = db.prepare('SELECT COUNT(*) as count, SUM(quantity) as totalQty, SUM(quantity * cost_price) as totalVal FROM products WHERE is_deleted = 0').get();
    console.log('Product Stats:', stats);

    const samples = db.prepare('SELECT product_name, quantity, cost_price FROM products WHERE is_deleted = 0 LIMIT 10').all();
    console.log('Sample Products:', samples);
    
    db.close();
} catch (e) {
    console.error('Error reading database:', e.message);
}
