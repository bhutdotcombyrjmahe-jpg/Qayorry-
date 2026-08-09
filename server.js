const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data', 'db.json');
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');

// ---------- Fixed admin / order-panel credentials ----------
const ADMIN_PHONE = '01732543193';
const ADMIN_PASSWORD = '01703381430+01738348423+01732543193';

// ---------- Simple in-memory session tokens ----------
const validTokens = new Set();

// ---------- DB helpers ----------
function readDB() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}
function writeDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

// ---------- Middleware ----------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

function requireAuth(req, res, next) {
  const token = req.headers['authorization']?.replace('Bearer ', '') || req.query.token;
  if (token && validTokens.has(token)) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

// ---------- Multer (image upload) ----------
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// ======================= AUTH =======================
app.post('/api/login', (req, res) => {
  const { phone, password } = req.body;
  if (phone === ADMIN_PHONE && password === ADMIN_PASSWORD) {
    const token = uuidv4();
    validTokens.add(token);
    return res.json({ success: true, token });
  }
  return res.status(401).json({ success: false, error: 'ফোন নাম্বার অথবা পাসওয়ার্ড সঠিক নয়' });
});

// ======================= PRODUCTS =======================
app.get('/api/products', (req, res) => {
  const db = readDB();
  res.json(db.products);
});

app.get('/api/products/:id', (req, res) => {
  const db = readDB();
  const p = db.products.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json(p);
});

app.post('/api/products', requireAuth, upload.single('image'), (req, res) => {
  const db = readDB();
  const { title, description, price, rating } = req.body;
  const image = req.file ? '/uploads/' + req.file.filename : '';
  const product = {
    id: uuidv4(),
    title,
    description,
    price: Number(price) || 0,
    rating: Number(rating) || 4.5,
    image,
  };
  db.products.push(product);
  writeDB(db);
  res.json({ success: true, product });
});

app.delete('/api/products/:id', requireAuth, (req, res) => {
  const db = readDB();
  db.products = db.products.filter((p) => p.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

// ======================= ORDERS =======================
app.post('/api/orders', (req, res) => {
  const db = readDB();
  const { items, name, phone, address, area } = req.body;
  if (!items || !items.length || !name || !phone || !address) {
    return res.status(400).json({ error: 'তথ্য অসম্পূর্ণ' });
  }
  const deliveryCharge = area === 'dhaka' ? 100 : 150;
  const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
  const order = {
    id: uuidv4().slice(0, 8).toUpperCase(),
    items,
    subtotal,
    deliveryCharge,
    total: subtotal + deliveryCharge,
    name,
    phone,
    address,
    area,
    status: 'pending',
    date: new Date().toISOString(),
  };
  db.orders.push(order);
  const key = todayKey();
  db.stats.purchases[key] = (db.stats.purchases[key] || 0) + 1;
  writeDB(db);
  res.json({ success: true, order });
});

app.get('/api/orders', requireAuth, (req, res) => {
  const db = readDB();
  res.json(db.orders.filter((o) => o.status === 'pending'));
});

app.delete('/api/orders/:id', requireAuth, (req, res) => {
  const db = readDB();
  db.orders = db.orders.filter((o) => o.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

app.post('/api/orders/:id/deliver', requireAuth, (req, res) => {
  const db = readDB();
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });
  order.status = 'delivered';
  db.clients.push({
    id: order.id,
    name: order.name,
    phone: order.phone,
    address: order.address,
    total: order.total,
    date: order.date,
    deliveredDate: new Date().toISOString(),
  });
  db.orders = db.orders.filter((o) => o.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

// ======================= CLIENTS HISTORY =======================
app.get('/api/clients', requireAuth, (req, res) => {
  const db = readDB();
  res.json(db.clients);
});

// ======================= TRACKING / DASHBOARD =======================
app.post('/api/track/visit', (req, res) => {
  const db = readDB();
  const key = todayKey();
  if (!req.cookies.qv_visited || req.cookies.qv_visited !== key) {
    db.stats.visits[key] = (db.stats.visits[key] || 0) + 1;
    writeDB(db);
    res.cookie('qv_visited', key, { maxAge: 24 * 60 * 60 * 1000 });
  }
  res.json({ success: true });
});

app.post('/api/track/abandon', (req, res) => {
  const db = readDB();
  const key = todayKey();
  db.stats.abandoned[key] = (db.stats.abandoned[key] || 0) + 1;
  writeDB(db);
  res.json({ success: true });
});

app.get('/api/stats', requireAuth, (req, res) => {
  const db = readDB();
  const key = todayKey();
  res.json({
    productCount: db.products.length,
    pendingOrders: db.orders.length,
    deliveredCount: db.clients.length,
    visitsToday: db.stats.visits[key] || 0,
    purchasesToday: db.stats.purchases[key] || 0,
    abandonedToday: db.stats.abandoned[key] || 0,
    visitsAllTime: Object.values(db.stats.visits).reduce((a, b) => a + b, 0),
    purchasesAllTime: Object.values(db.stats.purchases).reduce((a, b) => a + b, 0),
  });
});

app.listen(PORT, () => {
  console.log(`Qayorra Fragrance server running on http://localhost:${PORT}`);
});
