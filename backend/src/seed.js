const db = require('./db');

const products = [
  { id: 'p1', name: 'The Signature Box', nameAr: 'صندوق التوقيع', desc: '16 قطعة مصنوعة يدويًا، متعة خالصة', price: 400, category: 'gifts', stock: 24, icon: '📦', image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=600&q=85&fit=crop', bestseller: 1, isNew: 0, featured: 1 },
  { id: 'p2', name: 'Velvet Truffles', nameAr: 'كرات الشوكولاتة المخملية', desc: 'كراميل مملح و ganache داكن', price: 200, category: 'truffles', stock: 40, icon: '🍫', image: 'https://images.unsplash.com/photo-1548741487-18d363dc4469?w=600&q=85&fit=crop', bestseller: 0, isNew: 0, featured: 0 },
  { id: 'p3', name: 'Noir Intense Bar', nameAr: 'لوح الداكنة المكثفة', desc: '72% كاكاو من الإكوادور', price: 540, category: 'dark', stock: 8, icon: '🍫', image: 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=600&q=85&fit=crop', bestseller: 0, isNew: 1, featured: 0 },
  { id: 'p4', name: 'Grand Gift Set', nameAr: 'طقم الهدايا الفاخر', desc: 'تجربة الشوكولاتة المطلقة', price: 600, category: 'gifts', stock: 15, icon: '🎁', image: 'https://images.unsplash.com/photo-1481391319762-47dff72954d9?w=600&q=85&fit=crop', bestseller: 0, isNew: 0, featured: 1 },
  { id: 'p5', name: 'Milk Praline Bar', nameAr: 'لوح شوكولاتة الحليب بالبرالين', desc: 'حليب مخملي مع قطع البندق المحمص', price: 280, category: 'milk', stock: 32, icon: '🍫', image: 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=600&q=85&fit=crop', bestseller: 0, isNew: 0, featured: 0 },
  { id: 'p6', name: 'White Rose Bites', nameAr: 'قطع الشوكولاتة البيضاء بالورد', desc: 'شوكولاتة بيضاء كريمية بلمسة ماء الورد', price: 260, category: 'white', stock: 5, icon: '🤍', image: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=600&q=85&fit=crop', bestseller: 0, isNew: 1, featured: 0 },
  { id: 'p7', name: 'Salted Caramel Bites', nameAr: 'قطع الكراميل المملح المغطاة بالشوكولاتة', desc: 'كراميل ذائب بلمسة ملح البحر', price: 230, category: 'caramel', stock: 18, icon: '🍬', image: 'https://images.unsplash.com/photo-1575377222312-dd1a63a51638?w=600&q=85&fit=crop', bestseller: 0, isNew: 0, featured: 0 },
];

const insert = db.prepare(`
  INSERT OR IGNORE INTO products (id, name, nameAr, desc, price, category, stock, icon, image, bestseller, isNew, featured)
  VALUES (@id, @name, @nameAr, @desc, @price, @category, @stock, @icon, @image, @bestseller, @isNew, @featured)
`);

const insertMany = db.transaction((rows) => {
  for (const row of rows) insert.run(row);
});

insertMany(products);

console.log(`Seeded ${products.length} products (existing rows left untouched).`);
