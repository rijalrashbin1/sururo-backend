// SURURO NEPAL CRAFTS - Backend API
// Node.js + Express + PostgreSQL

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Uploads folder
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
app.use('/uploads', express.static(uploadsDir));

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `product-${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Images only!'));
  }
});

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'sururo_db'
});

// Helper functions
const generateOrderNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${timestamp}-${random}`;
};

// ==================== CATEGORIES ====================
app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// ==================== PRODUCTS ====================
app.get('/api/products', async (req, res) => {
  try {
    const { category_id, subcategory, search, sort = 'created_at' } = req.query;
    let query = 'SELECT * FROM products WHERE is_active = true';
    const params = [];

    if (category_id) {
      query += ' AND category_id = $' + (params.length + 1);
      params.push(category_id);
    }

    if (subcategory) {
      query += ' AND subcategory = $' + (params.length + 1);
      params.push(subcategory);
    }

    if (search) {
      query += ' AND (name ILIKE $' + (params.length + 1) + ' OR description ILIKE $' + (params.length + 2) + ')';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY ${sort} DESC LIMIT 100`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const productResult = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const reviewsResult = await pool.query(
      'SELECT * FROM reviews WHERE product_id = $1 ORDER BY created_at DESC',
      [id]
    );

    const product = productResult.rows[0];
    product.reviews = reviewsResult.rows;

    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// ==================== REVIEWS ====================
app.post('/api/reviews', async (req, res) => {
  try {
    const { product_id, customer_name, customer_email, rating, title, comment } = req.body;

    const result = await pool.query(
      'INSERT INTO reviews (product_id, customer_name, customer_email, rating, title, comment) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [product_id, customer_name, customer_email, rating, title, comment]
    );

    // Update product rating
    await pool.query(
      `UPDATE products SET rating = (SELECT AVG(rating) FROM reviews WHERE product_id = $1),
       rating_count = (SELECT COUNT(*) FROM reviews WHERE product_id = $1) WHERE id = $1`,
      [product_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// ==================== CART ====================
app.get('/api/cart/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await pool.query('SELECT * FROM carts WHERE session_id = $1', [sessionId]);
    
    if (result.rows.length === 0) {
      return res.json({ items: [] });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

app.post('/api/cart/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { items } = req.body;

    const existingCart = await pool.query('SELECT * FROM carts WHERE session_id = $1', [sessionId]);

    let result;
    if (existingCart.rows.length === 0) {
      result = await pool.query(
        'INSERT INTO carts (session_id, items) VALUES ($1, $2) RETURNING *',
        [sessionId, JSON.stringify(items)]
      );
    } else {
      result = await pool.query(
        'UPDATE carts SET items = $1, updated_at = CURRENT_TIMESTAMP WHERE session_id = $2 RETURNING *',
        [JSON.stringify(items), sessionId]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update cart' });
  }
});

// ==================== ORDERS ====================
app.post('/api/orders', async (req, res) => {
  try {
    const {
      customer_email,
      customer_name,
      items,
      shipping_address,
      total_amount,
      currency = 'USD',
      payment_method = 'credit_card'
    } = req.body;

    const orderNumber = generateOrderNumber();
    const customer_id = null; // Guest checkout for now

    const orderResult = await pool.query(
      `INSERT INTO orders (order_number, customer_id, customer_email, customer_name, total_amount, currency, payment_method, shipping_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [orderNumber, customer_id, customer_email, customer_name, total_amount, currency, payment_method, JSON.stringify(shipping_address)]
    );

    const orderId = orderResult.rows[0].id;

    // Insert order items
    for (const item of items) {
      await pool.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
        [orderId, item.product_id, item.quantity, item.price]
      );

      // Update product stock
      await pool.query(
        'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }

    res.status(201).json(orderResult.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

app.get('/api/orders/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const orderResult = await pool.query('SELECT * FROM orders WHERE order_number = $1', [orderNumber]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const itemsResult = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [orderResult.rows[0].id]);

    const order = orderResult.rows[0];
    order.items = itemsResult.rows;

    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// ==================== IMAGE UPLOAD ====================

// ==================== ADMIN - PRODUCTS ====================
const adminAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.admin = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

app.post("/api/admin/upload", adminAuth, upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const imageUrl = `http://localhost:${process.env.PORT || 5000}/uploads/${req.file.filename}`;
  res.json({ image_url: imageUrl });
});

app.post('/api/admin/products', adminAuth, async (req, res) => {
  try {
    const { name, description, category_id, price, stock_quantity, image_url, material, size, artisan_name, subcategory } = req.body;

    const result = await pool.query(
      `INSERT INTO products (name, description, category_id, price, stock_quantity, image_url, material, size, artisan_name, subcategory)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [name, description, category_id, price, stock_quantity, image_url, material, size, artisan_name, subcategory || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

app.put('/api/admin/products/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, stock_quantity, image_url, material, size, subcategory } = req.body;

    const result = await pool.query(
      `UPDATE products SET name = $1, description = $2, price = $3, stock_quantity = $4, image_url = $5, material = $6, size = $7, subcategory = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 RETURNING *`,
      [name, description, price, stock_quantity, image_url, material, size, subcategory || null, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

app.delete('/api/admin/products/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM products WHERE id = $1', [id]);
    res.json({ message: 'Product deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// ==================== ADMIN - LOGIN ====================
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query('SELECT * FROM admin_users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: admin.id, email: admin.email }, process.env.JWT_SECRET || 'your-secret-key');
    res.json({ token, admin: { id: admin.id, email: admin.email, full_name: admin.full_name } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ==================== HEALTH CHECK ====================
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Sururo Nepal Crafts API is running' });
});

module.exports = app;

// ==================== CONTACT MESSAGES ====================
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'All fields required' });
    }

    const result = await pool.query(
      `INSERT INTO contact_messages (name, email, subject, message)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, email, subject || 'No Subject', message]
    );

    res.status(201).json({ message: 'Message received', data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get all messages (admin only)
app.get('/api/admin/messages', adminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 100'
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Mark as read
app.put('/api/admin/messages/:id/read', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE contact_messages SET is_read = true WHERE id = $1 RETURNING *',
      [id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

// Delete message
app.delete('/api/admin/messages/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM contact_messages WHERE id = $1', [id]);
    res.json({ message: 'Message deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// ==================== ORDERS ====================
app.post('/api/admin/orders', async (req, res) => {
  try {
    const { customer_name, customer_email, phone, items, total_amount, shipping_data } = req.body;

    const result = await pool.query(
      `INSERT INTO orders (customer_name, customer_email, phone, items, total_amount, shipping_data, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING *`,
      [customer_name, customer_email, phone, JSON.stringify(items), total_amount, JSON.stringify(shipping_data)]
    );

    res.status(201).json({ message: 'Order placed', data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to place order' });
  }
});

app.get('/api/admin/orders', adminAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 100');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.get('/api/admin/orders/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

app.put('/api/admin/orders/:id/complete', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "UPDATE orders SET status = 'completed' WHERE id = $1 RETURNING *",
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

app.delete('/api/admin/orders/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM orders WHERE id = $1', [id]);
    res.json({ message: 'Order deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});
// Get orders by email (for My Orders page)
app.get('/api/orders/by-email', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const result = await pool.query(
      'SELECT * FROM orders WHERE customer_email = $1 ORDER BY created_at DESC',
      [email]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Sururo backend running on port ${PORT}`);
});
