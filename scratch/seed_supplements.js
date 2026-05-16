const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'store.db');
const db = new Database(dbPath);

const supplements = [
  {
    product_name: 'Premium Whey Protein (2kg)',
    brand: 'MuscleTech',
    category: 'Protein',
    unit: 'kg',
    mrp: 6500,
    selling_price: 5800,
    cost_price: 4500,
    quantity: 12,
    product_size: '2kg',
    description: 'High-quality whey protein isolate for muscle recovery.'
  },
  {
    product_name: 'Micronized Creatine',
    brand: 'Optimum Nutrition',
    category: 'Performance',
    unit: 'pcs',
    mrp: 1800,
    selling_price: 1550,
    cost_price: 1100,
    quantity: 25,
    product_size: '250g',
    description: 'Pure creatine monohydrate for strength and power.'
  },
  {
    product_name: 'Daily Multivitamin (60 Tabs)',
    brand: 'MuscleBlaze',
    category: 'Health',
    unit: 'pcs',
    mrp: 900,
    selling_price: 750,
    cost_price: 500,
    quantity: 40,
    product_size: '60 Tabs',
    description: 'Essential vitamins and minerals for daily wellness.'
  },
  {
    product_name: 'C4 Pre-Workout (30 Serv)',
    brand: 'Cellucor',
    category: 'Performance',
    unit: 'pcs',
    mrp: 3200,
    selling_price: 2850,
    cost_price: 2100,
    quantity: 15,
    product_size: '30 Servings',
    description: 'Explosive energy and focus for intense workouts.'
  },
  {
    product_name: 'BCAA Energy (Fruit Punch)',
    brand: 'Scivation',
    category: 'Recovery',
    unit: 'pcs',
    mrp: 2400,
    selling_price: 2100,
    cost_price: 1600,
    quantity: 18,
    product_size: '30 Servings',
    description: 'Branched-chain amino acids with added electrolytes.'
  },
  {
    product_name: 'Fish Oil Gold (90 Softgels)',
    brand: 'MyProtein',
    category: 'Health',
    unit: 'pcs',
    mrp: 1500,
    selling_price: 1350,
    cost_price: 900,
    quantity: 22,
    product_size: '90 Caps',
    description: 'High-strength Omega-3 for heart and brain health.'
  }
];

const insert = db.prepare(`
  INSERT INTO products (product_name, brand, category, unit, mrp, selling_price, cost_price, quantity, product_size)
  VALUES (@product_name, @brand, @category, @unit, @mrp, @selling_price, @cost_price, @quantity, @product_size)
`);

db.transaction(() => {
  for (const item of supplements) {
    insert.run(item);
  }
})();

console.log('Supplement store data seeded successfully!');
db.close();
